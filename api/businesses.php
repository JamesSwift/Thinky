<?php
global $root;

use \JamesSwift\SWDAPI\Response;

function fetchDetails($input, $authInfo){
    
    global $API;
    
    //Helper function
    function fetchDeliveryPricing($businessID){
        global $API;
        
        //Validate the user input
        $validation = validateUserInput(["businessID"=>$businessID],["businessID"]);
        if (sizeof($validation["errors"])>0){
            return null;
        }
        try {
            
            $vars = [];
            $sql = "SELECT * from deliveryPricing WHERE businessID = ? AND archived = 0";
            
            $chk = $API->DB->prepare($sql);
            $chk->execute([$validation['data']['businessID']]);
            
            $results = $chk->fetchAll();
            foreach ($results as $id=>$res){
                $results[$id]['locations'] = json_decode($res['locations'], true);
                $results[$id]['schedule'] = json_decode($res['schedule'], true);
            }
            
            return $results;
        
        } catch (\Exception $e){
            return null;
        }
    }
    
    //Validate the user input
    $validation = validateUserInput($input);
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Sanitized data
    $data = $validation['data'];
    
    try {
        
        $vars = [];
        $sql = "SELECT id, name as businessName, urlSafeName, description, logo, public, schedule, openUntil, closedUntil, vatRegistered, deliveryOffered, stripeUserID FROM businesses WHERE archived = 0";
        
        //Filter by business
        if (isset($data['businessID'])){
            $sql .=" AND id = ?";
            $vars[] = $data['businessID'];
        }
        
        $chk = $API->DB->prepare($sql);
        $chk->execute($vars);
        
        if ($chk->rowCount()>0){
            //Just return one business
            if (isset($data['businessID'])){
                $biz = $chk->fetch();
                $biz['schedule'] = json_decode($biz['schedule'], true);
                $biz['deliveryPricing'] = fetchDeliveryPricing($data['businessID']);
                return new Response( 200, $biz);
                
            //Return an array of businesses
            } else {
                $all = [];
                foreach ($chk->fetchAll() as $biz){
                    $biz['schedule'] = json_decode($biz['schedule'], true);
                    $biz['deliveryPricing'] = fetchDeliveryPricing($biz['id']);
                    $all[$biz['id']] = $biz;
                }
                return new Response( 200, $all);
            }
        }
        
        return new Response( 200, null );

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500200,
            "message"   => "An error occurred while trying to fetch the business information."
        ]]);
    }
    
}


function updateDetails($input, $authInfo){
     
    global $API;
     
    $user = intval($authInfo["authorizedUser"]->id);

    //Validate the user input
    $validation = validateUserInput($input, [
        "businessName", "description", "public", "vatRegistered", "deliveryOffered", "businessID"
    ]);
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];
    
    //Attempt to get user from DB
    try {
        $r = $API->DB->prepare("SELECT * FROM users WHERE id = ?") ;
        $r->execute([$user]);
        $userDetails = $r->fetch();
        if (!is_array($userDetails)){
            throw new \Exception();
        }
        
        $r = $API->DB->prepare("SELECT * FROM businesses WHERE id = ?") ;
        $r->execute([$data['businessID']]);
        $business = $r->fetch();
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500201,
            "message"   => "An error occurred while checking your user information. Your changes haven't been saved."
        ]]);
    }
    
    
    //Test password
    if (!password_verify($input['currentPassword'], $userDetails['password'])){
        return new Response( 403, ["AppError"=>[
            "code"      => 403200,
            "message"   => "The account password you supplied is incorrect. Please try again."
        ]]);
    }
    
    //Check if we are allowed to edit this business
    if (!checkEmployeePermission($authInfo["authorizedUser"], $data['businessID'], "changeBusinessDetails")){
        return new Response( 403, ["AppError"=>[
            "code"      => 403201,
            "message"   => "You do not have permissions to edit this business. Your changes haven't been saved."
        ]]);
    }
    
    //Force having a connected stripe account
    //if ($data['public'] && (!is_array($business) || $business['stripeUserID'] === null)){
    //    return new Response( 403, ["ValidationErrors"=>['public'=>["You cannot make your business public until you have connected a stripe account."]]]);
    //}
    
    $sqlData = [
        "name"            => $data['businessName'],
        "description"     => $data['description'],
        "public"          => $data['public'],
        "schedule"        => json_encode($data['schedule']),
        "vatRegistered"   => $data['vatRegistered'],
        "deliveryOffered" => $data['deliveryOffered'],
        "id"              => $data['businessID'],
    ];
    
    //Write to database
    try {
        
        $statement = $API->DB->prepare(
            "UPDATE businesses SET ".
            "name = :name, description = :description, public = :public, schedule = :schedule, vatRegistered = :vatRegistered, deliveryOffered = :deliveryOffered ".
            "WHERE id = :id"
        );
        $statement->execute($sqlData);
        
        //Send back a copy of the data
        return $API->request("businesses/fetchDetails", [
            "businessID"=>$data['businessID']
        ], $authInfo);
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500202,
            "message"   => "An error occurred while trying to save your business details. Please try again."
        ]]);
    }
    
}





function overrideSchedule($input, $authInfo){
     
    global $API;
     
    $user = intval($authInfo["authorizedUser"]->id);

    //Validate the user input
    if (isset($input['overrideAction']) && $input['overrideAction'] === "resume"){
        $validation = validateUserInput($input, [
            "overrideAction", "businessID"
        ]);
    } else {
        $validation = validateUserInput($input, [
            "overrideAction", "date", "time", "businessID"
        ]);
    }
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];
    
    //Check if we are allowed to edit this business
    if (!checkEmployeePermission($authInfo["authorizedUser"], $data['businessID'], "overrideSchedule")){
        return new Response( 403, ["AppError"=>[
            "code"      => 403220,
            "message"   => "You do not have permissions to edit this business. Your changes haven't been saved."
        ]]);
    }
    
    //Reset override
    if ($data['overrideAction'] === "resume"){
        $sql = "UPDATE businesses SET openUntil = NULL, closedUntil = NULL WHERE id = :id";
        $sqlData = [
            "id"              => $data['businessID'],
        ];
        
    } else {
        //Creake UTc time from london time
        //Check date is in the future
        $date = strtotime($data['date']." ".$data['time']." Europe/London");
        if ($date <= time()){
            return new Response( 403, ["AppError"=>[
                "code"      => 403221,
                "message"   => "The date/time you specified is in the past."
            ]]);
        }
        
        //Open early
        if ($data['overrideAction'] === "open"){
            $sql = "UPDATE businesses SET openUntil = :date, closedUntil = NULL WHERE id = :id";
            
        //Close early
        } else {
            $sql = "UPDATE businesses SET openUntil = NULL, closedUntil = :date WHERE id = :id";
        }
        
        $sqlData = [
            "id"    => $data['businessID'],
            "date"  => date("Y-m-d H:i:s", $date)
        ];
    }
    
    
    
    //Write to database
    try {
        
        $statement = $API->DB->prepare($sql);
        $statement->execute($sqlData);
        
        //Send back a copy of the data
        return $API->request("businesses/fetchDetails", [
            "businessID"=>$data['businessID']
        ], $authInfo);
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500220,
            "message"   => "An error occurred while trying to update your business details. Please try again."
        ]]);
    }
    
}


function authorizeClient($input, $authInfo){
     
    global $API;

    $user = intval($authInfo["authorizedUser"]->id);

    //Validate the user input
    $validation = validateUserInput($input, [
        "currentPassword", "businessID"
    ]);
    
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Check for client id
    if (!isset($authInfo['client']) || !isset($authInfo['client']['id'])){
        return new Response( 403, ["AppError"=>[
            "code"      => 403232,
            "message"   => "This request was not signed by the client. Register the client first."
        ]]);
    }
    
    $client = $authInfo['client']['id'];
    
    //Use the sanitized data
    $data = $validation['data'];
    
    //Attempt to get user from DB
    try {
        $r = $API->DB->prepare("SELECT * FROM users WHERE id = ?") ;
        $r->execute([$user]);
        $userDetails = $r->fetch();
        if (!is_array($userDetails)){
            throw new \Exception();
        }
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500230,
            "message"   => "An error occurred while checking your user information. Your changes haven't been saved."
        ]]);
    }
    
    
    //Test password
    if (!password_verify($input['currentPassword'], $userDetails['password'])){
        return new Response( 403, ["AppError"=>[
            "code"      => 403230,
            "message"   => "The account password you supplied is incorrect. Please try again."
        ]]);
    }
    
    //Check if we are allowed to edit this business
    if (!checkEmployeePermission($authInfo["authorizedUser"], $data['businessID'], "authorizeClient")){
        return new Response( 403, ["AppError"=>[
            "code"      => 403231,
            "message"   => "Error: You do not have the needed permissions to authorize clients for this business."
        ]]);
    }
    
    $sqlData = [
        "businessID"            => $data['businessID'],
        "authorizedBy"     => $user,
        "clientID"          => $client,
    ];
    
    //Write to database
    try {
        
        $statement = $API->DB->prepare(
            "REPLACE INTO authorizedClients SET ".
            "clientID = :clientID, businessID = :businessID, authorizedBy = :authorizedBy "
        );
        $statement->execute($sqlData);
        
        return new Response( 200, $sqlData );
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500231,
            "message"   => "An error occurred while trying to save your business details. Please try again."
        ]]);
    }
    
}


function fetchAuthorizedBusinesses($input, $authInfo){
     
    global $API;


    //Check for client id
    if (!isset($authInfo['client']) || !isset($authInfo['client']['id'])){
        return new Response( 403, ["AppError"=>[
            "code"      => 403240,
            "message"   => "This request was not signed by the client. Register the client first."
        ]]);
    }
    
    $client = $authInfo['client']['id'];
    
    
    //Attempt to get user from DB
    try {
        $r = $API->DB->prepare("SELECT businessID FROM authorizedClients WHERE clientID = ?") ;
        $r->execute([$client]);
        $results = $r->fetchAll();
        
        if (!is_array($results) || sizeof($results)<1){
            return new Response( 200,  [
                "clientID"=>$client,
                "authorizedBusinesses"=>null
            ]);
        }
        
        $bizs = [];
        foreach ($results as $biz){
            $bizs[] = $biz['businessID'];
        }
        
        return new Response( 200, [
            "clientID"=>$client,
            "authorizedBusinesses"=>$bizs
        ]);
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500240,
            "message"   => "An error occurred while checking your client information. Please try again."
        ]]);
    }
    
    
}


function connectStripeAccount($input, $authInfo){
     
    global $API;
    
    //Validate the user input
    $validation = validateUserInput($input, [
        "stripeCode", "businessID"
    ]);
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];
    
    //Check if we are allowed to edit this business
    if (!checkEmployeePermission($authInfo["authorizedUser"], $data['businessID'], "connectStripeAccount")){
        return new Response( 403, ["AppError"=>[
            "code"      => 403203,
            "message"   => "Your user account do not have permissions to connect a stripe account to this business."
        ]]);
    }
    
    //Attempt to connect accounts
    try {
        $response = \Stripe\OAuth::token([
            'grant_type' => 'authorization_code',
            'code' => $data['stripeCode'],
        ]);
    } catch (\Stripe\Error\OAuth\OAuthBase $e) {
        return new Response( 500, ["AppError"=>[
            "code"      => 500204,
            "message"   => "An remote error occurred while trying to connect your account: ".$e->getMessage()
        ]]);
    }
    
    $sqlData = [
        "stripeUserID"    => $response->stripe_user_id,
        "stripeToken"     => json_encode($response),
        "id"              => $data['businessID'],
    ];
    
    //Write to database
    try {
        
        $statement = $API->DB->prepare(
            "UPDATE businesses SET ".
            "stripeUserID = :stripeUserID, stripeToken = :stripeToken ".
            "WHERE id = :id"
        );
        $statement->execute($sqlData);
        
        return new Response( 200, true);
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500203,
            "message"   => "An error occurred while trying to save your business details. Please try again."
        ]]);
    }
    
}