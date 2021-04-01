<?php
global $root;

use \JamesSwift\SWDAPI\Response;

function register($input, $authInfo){
     
    global $API;
    
    //Validate the user input
    $validation = validateUserInput($input, [
        "title", "firstName", "lastName", "primaryPhoneNumber", "email", "newPassword", "recaptchaResponse",
        ["id"=>"agreeToTerms","message"=>"Agreeing to the terms of use and privacy policy is required to create an account.","value"=>true]
    ]);
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];
    
    //Check if this email is already registered
    try {
        $chk = $API->DB->prepare("SELECT id FROM users WHERE email = ?");
        $chk->execute([$input['email']]);
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500101,
            "message"   => "An error occurred while validating your email address. Please try again."
        ]]);
    }
    if ($chk->rowCount()>0){
        return new Response( 400, ["AppError"=>[
            "code"      => 400100,
            "message"   => "The email address you specified is already registered. Please log in using your existing account, or use the forgotten password system if you have lost access."
        ]]);
    }
    
    //Create data to store
    $sql = "INSERT INTO users SET title = :title, firstName = :firstName, lastName = :lastName, email = :email, primaryPhoneNumber = :primaryPhoneNumber, password = :password";
    
    $store = [
		"title"                 => encrypt($data['title']),
        "firstName"             => encrypt($data['firstName']),
        "lastName"              => encrypt($data['lastName']),
        "email"                 => $data['email'],
        "primaryPhoneNumber"    => encrypt($data['primaryPhoneNumber']),
        "password"              => password_hash($data['newPassword'], PASSWORD_DEFAULT, ["cost"=>12])
    ];
    
    foreach(["middleNames","secondaryPhoneNumber"] as $field){
		if (!isset($data[$field])) continue;
		$store[$field] = encrypt($data[$field]);
		$sql.=", $field = :$field";
    }
    
    //Write user account to database
    try {
        $statement = $API->DB->prepare($sql);
        $statement->execute($store);
        
        $userID = $API->DB->lastInsertId();
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500102,
            "message"   => "An error occurred while trying to create your user account. Please try again."
        ]]);
    }
  
    //Send verification email
    $API->request(
        "accounts/sendEmailVerification", 
        null, 
        ["authorizedUser" => new \JamesSwift\SWDAPI\Credential($userID)]
    );
    
    //Return id
    return new Response(
        200, 
        $userID
    );   
}


function fetchContactDetails($data, $authInfo){
     
    global $API;
    
    $user = intval($authInfo["authorizedUser"]->id);

    //Check if allowed to specify a different user id
    if (isset($data["userID"]) && is_int($data["userID"]) && $data['userID'] !== $user ){

        //Check if the user/token is allowed to do this
        if (!checkEmployeePermission($authInfo["authorizedUser"], "any", "viewUserInfo")){
            return new Response( 403, ["AppError"=>[
                "code"      => 403104,
                "message"   => "You do not have permissions to view this user's contact details."
            ]]);
        }

        $user = $data["userID"];
    }
    
    try {
        
        $chk = $API->DB->prepare("SELECT id AS userID, title, firstName, middleNames, lastName, primaryPhoneNumber, secondaryPhoneNumber, email, defaultAddressPID, verifiedEmail FROM users WHERE id = ?");
        $chk->execute([$user]);
        
        if ($chk->rowCount()===0){
            return new Response( 404, ["AppError"=>[
                "code"      => 404100,
                "message"   => "The account you requested could not be found."
            ]]);
        }

        $details = $chk->fetch();
        
        foreach(["title", "firstName", "middleNames", "lastName", "primaryPhoneNumber", "secondaryPhoneNumber"] as $field){
			if ($details[$field]==null) continue;
			$details[$field] = decrypt($details[$field]);
        }
        
        //Computed value
        $details['fullName'] = ($details['title'] == null ? "" : $details['title']." ") . $details['firstName']." ".($details['middleNames']==""?"":$details['middleNames']." ").$details['lastName'];
         
        
        return new Response( 200, $details);

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500103,
            "message"   => "An error occurred while trying to fetch the account information."
        ]]);
    }

}


function updateContactDetails($input, $authInfo){
     
    global $API;
     
    $user = intval($authInfo["authorizedUser"]->id);

    $admin = false;

    //Check if allowed to specify a different user id
    if (isset($input["userID"]) && is_int($input["userID"]) && $input['userID'] !== $user ){

        //Check if the user/token is allowed to do this
        if (!checkEmployeePermission($authInfo["authorizedUser"], "any", "editUserInfo")){
            return new Response( 403, ["AppError"=>[
                "code"      => 403107,
                "message"   => "You do not have permissions to edit this user's contact details."
            ]]);
        }

        $user = $input["userID"];
        $admin = true;
        
        //Validate the user input
        $validation = validateUserInput($input);
        
    } else {

        //Validate the user input
        $validation = validateUserInput($input, ["currentPassword"]);

    }
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];
    
    //Check if this email is already registered (except by the owner)
    if (isset($data['email'])){
		try {
			$chk = $API->DB->prepare("SELECT id FROM users WHERE email = :email AND id != :user");
			$chk->execute(["email" => $input['email'], "user" => $user]);
		} catch (\Exception $e){
			return new Response( 500, ["AppError"=>[
				"code"      => 500104,
				"message"   => "An error occurred while validating your new email address. Your changes haven't been saved."
			]]);
		}
		if ($chk->rowCount()>0){
			return new Response( 400, ["AppError"=>[
				"code"      => 400101,
				"message"   => "The email address you specified is already registered by another user."
			]]);
		}
	}
    
    //Attempt to get user from DB
    try {
        $r = $API->DB->prepare("SELECT * FROM users WHERE id = ?") ;
        $r->execute([$user]);
        $userDetails = $r->fetch();
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500105,
            "message"   => "An error occurred while fetching your user information. Your changes haven't been saved."
        ]]);
    }
    
    //Check user exists
    if (!is_array($userDetails)){
        return new Response( 500, ["AppError"=>[
            "code"      => 500106,
            "message"   => "An error occurred while fetching your user information. Your changes haven't been saved."
        ]]);
    }
    
    //Test password (unless admin)
    if (!$admin && !password_verify($input['currentPassword'], $userDetails['password'])){
        return new Response( 400, ["AppError"=>[
            "code"      => 400102,
            "message"   => "The account password you supplied is incorrect. Please try again."
        ]]);
    }
    
    $sql = "UPDATE users SET lastModified = :date";
    
    $sqlData = ["id" => $user, "date"=>date("Y-m-d H:i:s")];
    
    //Save email?
    if (isset($data['email'])){
		$sql.=", email = :email";
		$sqlData['email'] = $data['email'];
        
        
        //Reset verified email if email changes
        if ($data['email']!=$userDetails['email']){
            $sql.=", verifiedEmail = null";
        }
    }
    
    foreach(["title", "firstName", "middleNames", "lastName", "primaryPhoneNumber", "secondaryPhoneNumber"] as $field){
		if (!isset($data[$field])) continue;
		$sqlData[$field] = encrypt($data[$field]);
		$sql.=", $field = :$field";
	}
    
    //Write to database
    try {
        $statement = $API->DB->prepare($sql." WHERE id = :id");    
        $statement->execute($sqlData);
        
        //If email changed, send out verification
        if (isset($data['email']) && $data['email']!==$userDetails['email']){
            $req = $API->request("accounts/sendEmailVerification", ["userID"=>$user], $authInfo);
        }
        
        return new Response(
            200, 
            true
        );
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500107,
            "message"   => "An error occurred while trying to save your contact details. Please try again."
        ]]);
    }
    
}


function fetchSecurityQuestions($data, $authInfo){
     
    global $API;
    
    $user = intval($authInfo["authorizedUser"]->id);

    try {
        
        $chk = $API->DB->prepare("SELECT securityQuestion1, securityQuestion2, securityQuestion3 FROM users WHERE id = ?");
        $chk->execute([$user]);
        
        $qs = $chk->fetch();
        
        $response = false;
        
        if (is_array($qs) && $qs["securityQuestion1"] != "" && $qs["securityQuestion2"] != "" && $qs["securityQuestion3"] != ""){
            $map = getSecurityQuestions();
            $response = [
                $map[$qs["securityQuestion1"]],
                $map[$qs["securityQuestion2"]],
                $map[$qs["securityQuestion3"]]
            ];
        }
        
        return new Response( 200, $response);

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500108,
            "message"   => "An error occurred while trying to fetch your account information."
        ]]);
    }

}


function updateSecurityQuestions($input, $authInfo){
     
    global $API;
    
    //TODO - add validation rules and make sure the same question isn't being used twice
    // don't forget currentPassword
     
    $user = intval($authInfo["authorizedUser"]->id);
    
    //Validate the user input
    $validation = validateUserInput($input, [
        "securityQuestion1", "securityQuestion2", "securityQuestion3",
        "securityAnswer1", "securityAnswer2", "securityAnswer3",
        "currentPassword"
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
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500109,
            "message"   => "An error occurred while fetching your user information. Your changes haven't been saved."
        ]]);
    }
    
    //Check user exists
    if (!is_array($userDetails)){
        return new Response( 500, ["AppError"=>[
            "code"      => 500110,
            "message"   => "An error occurred while fetching your user information. Your changes haven't been saved."
        ]]);
    }
    
    //Test password
    if (!password_verify($input['currentPassword'], $userDetails['password'])){
        return new Response( 500, ["AppError"=>[
            "code"      => 400103,
            "message"   => "The account password you supplied is incorrect. Please try again."
        ]]);
    }
    
    $sqlData = [
        "securityQuestion1"     => $data['securityQuestion1'],
        "securityQuestion2"     => $data['securityQuestion2'],
        "securityQuestion3"     => $data['securityQuestion3'],
        "securityAnswer1"       => password_hash($data['securityAnswer1'], PASSWORD_DEFAULT, ["cost"=>12]),
        "securityAnswer2"       => password_hash($data['securityAnswer2'], PASSWORD_DEFAULT, ["cost"=>12]),
        "securityAnswer3"       => password_hash($data['securityAnswer3'], PASSWORD_DEFAULT, ["cost"=>12]),
        "id"                    => $user
    ];
    
    //Write to database
    try {
        $statement = $API->DB->prepare("UPDATE users SET securityQuestion1 = :securityQuestion1, securityQuestion2 = :securityQuestion2, securityQuestion3 = :securityQuestion3, securityAnswer1 = :securityAnswer1, securityAnswer2 = :securityAnswer2, securityAnswer3 = :securityAnswer3 WHERE id = :id");
        $statement->execute($sqlData);
        
        return new Response(
            200, 
            true
        );
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500107,
            "message"   => "An error occurred while trying to save your contact details. Please try again."
        ]]);
    }
    
}


function sendRecoveryEmail($input, $authInfo){
     
    global $API, $CONFIG;
    
    //Validate the user input
    $validation = validateUserInput($input, ["email", "recaptchaResponse"]);
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];


    //Check if this email is already registered and verified
    try {
        $chk = $API->DB->prepare("SELECT id,verifiedEmail,firstName,lastName FROM users WHERE verifiedEmail = ?");
        $chk->execute([$input['email']]);
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500108,
            "message"   => "An error occurred while validating your email address. Please try again."
        ]]);
    }
    if ($chk->rowCount()<1){
        //Sleep for a random amount of time so as to obscure database calls and email processing
        usleep(rand(1000, 1500000));
    
        //Return true even if email doesn't exist - we don't want to verify if an account exists or not
        return new Response(200, true);
    }    
    
    $user = $chk->fetch();
    
    $user['firstName'] = decrypt($user['firstName']);
    $user['lastName'] = decrypt($user['lastName']);
    
    $code = hash("sha256", openssl_random_pseudo_bytes(512));
    
    //Create authCode data to store
    $store = [
        "uid"  => $user['id'],
        "code" => $code,
        "type" => "account-recovery",
        "exipres" => date("Y-m-d H:i:s", time()+(60*60))
    ];
    
    //Write to database
    try {
        $statement = $API->DB->prepare("INSERT INTO authCodes SET uid = :uid, code = :code, type = :type, expires = :exipres");
        $statement->execute($store);
        
        $codeID = $API->DB->lastInsertId();
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500109,
            "message"   => "An error occurred while trying to confirm your email address. "
        ]]);
    }
    
    //Send email
    try {
        
        $body = "<html><head><title>".htmlspecialchars($CONFIG['platformName'])." - Account Recovery</title></head><body>";
        $body .= "<p>">htmlspecialchars("Dear ".$user['firstName']." ".$user['lastName']).",</p>";
        $body .= "<p>";
        $body .= "We received a request to reset your ".htmlspecialchars($CONFIG['platformURL'])." account password. If you made this request and wish to continue, please visit the following link:\n";
        $body .= "</p><p>";
        $body .= "<a href='".htmlspecialchars("https://".$_SERVER['HTTP_HOST']."/account/recovery/".rawurlencode($codeID)."/".rawurlencode($code)."/")."'>";
        $body .= htmlspecialchars("https://".$_SERVER['HTTP_HOST']."/account/recovery/".rawurlencode($codeID)."/".rawurlencode($code)."/")."</a>";
        $body .= "</p><p>";
        $body .= "Please note: The link expires 60 minutes after creation. If it expires, you will need to start your account recovery again. \n";
        $body .= "</p><p>";
        $body .= "If you didn't request an account recovery email, please ignore this message.\n";
        $body .= "</p><p>";
        $body .= htmlspecialchars($CONFIG['platformName'])." Support Bot";
        $body .= "</p>";
        $body .= "</body></html>";
        
        $email = \JamesSwift\SWDF\email($user['verifiedEmail'], htmlspecialchars($CONFIG['platformName'])." - Account Recovery", $body, null, true, null, null, 
            "MIME-Version: 1.0" . "\r\n".
            "Content-type:text/html;charset=UTF-8" . "\r\n"
        );
        
        $headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
        
        if ($email === false){
            return new Response( 500, ["AppError"=>[
                "code"      => 500110,
                "message"   => "An error occurred while trying to send your recovery email. Please try again."
            ]]);
        }
        
        //Sleep for a random amount of time so as to obscure database calls and email processing
        usleep(rand(1000, 1000000));
    
        //Return true even if email doesn't exist - we don't want to verify if an account exists or not
        return new Response(200, true);
        
        
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500111,
            "message"   => "An error occurred while trying to confirm your email address.".$e->getMessage()
        ]]);
    }
    
}


function validateRecoveryCode($input, $authInfo){
     
    global $API;
    
    //Validate the user input
    $validation = validateUserInput($input, ["id", "code"]);
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];    
    
    //Check if code is valid
    try {
        $chk = $API->DB->prepare("SELECT uid FROM authCodes WHERE `id` = :id AND `code` = :code AND `expires` > NOW() AND `used` IS NULL AND `type` = 'account-recovery' ");
        $chk->execute($data);
        $row = $chk->fetch();
        if (!is_array($row)){
            throw new \Exception("No record");
        }
        $uid = reset($row);
    } catch (\Exception $e){
        usleep(rand(500000, 1500000));
        return new Response( 403, ["AppError"=>[
            "code"      => 403100,
            "message"   => "The recovery code you supplied was invalid or has expired."
        ]]);
    }
    
    try {
        
        $chk = $API->DB->prepare("SELECT securityQuestion1, securityQuestion2, securityQuestion3 FROM users WHERE id = ?");
        $chk->execute([$uid]);
        
        $qs = $chk->fetch();
        
        $response = true;
        
        if (is_array($qs) && $qs["securityQuestion1"] != "" && $qs["securityQuestion2"] != "" && $qs["securityQuestion3"] != ""){
            $map = getSecurityQuestions();
            $response = [
                "securityQuestion1" => $map[$qs["securityQuestion1"]],
                "securityQuestion2" => $map[$qs["securityQuestion2"]],
                "securityQuestion3" => $map[$qs["securityQuestion3"]]
            ];
        }
        
        return new Response( 200, $response);

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500112,
            "message"   => "An error occurred while trying to fetch your account information."
        ]]);
    }

}


function recoveryResetPassword($input, $authInfo){
     
    global $API;
    
    //Validate the user input
    $validation = validateUserInput($input, ["id", "code", "newPassword", "newPasswordConfirm"]);
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];    
    
    //Check if code is valid
    try {
        $chk = $API->DB->prepare("SELECT uid FROM authCodes WHERE `id` = :id AND `code` = :code AND `expires` > NOW() AND `used` IS NULL AND `type` = 'account-recovery' ");
        $chk->execute(["id"=>$data['id'], "code"=>$data['code']]);
        $row = $chk->fetch();
        if (!is_array($row)){
            throw new \Exception("No record");
        }
        $uid = reset($row);
    } catch (\Exception $e){
        usleep(rand(500000, 1500000));
        return new Response( 403, ["AppError"=>[
            "code"      => 403102,
            "message"   => "The recovery code you supplied was invalid or has expired."
        ]]);
    }
    
    try {
        
        $q = $API->DB->prepare("SELECT securityAnswer1, securityAnswer2, securityAnswer3 FROM users WHERE id = ?");
        $q->execute([$uid]);
        
        $user = $q->fetch();
        
        if ($user===false){
            throw new \Exception("Invalid user.");
        }
        
        $response = true;
        
        //Handle security questions if they were set up in the account
        if (is_array($user) && $user["securityAnswer1"] != "" && $user["securityAnswer2"] != "" && $user["securityAnswer3"] != ""){
            
            //Validate the user input
            $validation = validateUserInput($data, ["securityAnswer1", "securityAnswer2", "securityAnswer3"]);
            
            //Check for validation errors
            if (sizeof($validation["errors"])>0){
                return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
            }
            
            $data = $validation['data'];
            
            //Test answers
            if (!password_verify($data['securityAnswer1'], $user['securityAnswer1'])){
                return new Response( 403, 
                    ["ValidationErrors"=>["securityAnswer1"=>["invalid"=>"Your answer is incorrect."]]]
                );
            }
            if (!password_verify($data['securityAnswer2'], $user['securityAnswer2'])){
                return new Response( 403, 
                    ["ValidationErrors"=>["securityAnswer2"=>["invalid"=>"Your answer is incorrect."]]]
                );
            }
            if (!password_verify($data['securityAnswer3'], $user['securityAnswer3'])){
                return new Response( 403, 
                    ["ValidationErrors"=>["securityAnswer3"=>["invalid"=>"Your answer is incorrect."]]]
                );
            }            

        }
        
        //Change the password
        $q = $API->DB->prepare("UPDATE users SET password = :newPassword WHERE id = :uid");
        $q->execute(["uid"=>$uid, "newPassword"=> password_hash($data['newPassword'], PASSWORD_DEFAULT, ["cost"=>12])]);
        
        //Revoke the authCode
        $q = $API->DB->prepare("UPDATE authCodes SET used = 1 WHERE id = :id");
        $q->execute(["id"=>$data['id']]);
        
        return new Response( 200, $response);

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500113,
            "message"   => "An error occurred while trying to fetch your account information."
        ]]);
    }

}

function checkEmailVerification($data, $authInfo){
     
    global $API;
    
    $user = intval($authInfo["authorizedUser"]->id);

    //Check if allowed to specify a different user id
    if (isset($data["userID"]) && is_int($data["userID"]) && $data['userID'] !== $user ){

        //Check if the user/token is allowed to do this
        if (!checkEmployeePermission($authInfo["authorizedUser"], "any", "viewUserInfo")){
            return new Response( 403, ["AppError"=>[
                "code"      => 403109,
                "message"   => "You do not have permissions to view this user's email verification status."
            ]]);
        }

        $user = $data["userID"];
    }
    
    try {
        
        $chk = $API->DB->prepare("SELECT id FROM users WHERE verifiedEmail = email AND id = ?");
        $chk->execute([$user]);

        return new Response( 200, ($chk->rowCount()>0) );

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500114,
            "message"   => "An error occurred while trying to fetch the account information."
        ]]);
    }

}

function sendEmailVerification($data, $authInfo){
     
    global $API, $CONFIG;
    
    $user = intval($authInfo["authorizedUser"]->id);

    //Check if allowed to specify a different user id
    if (isset($data["userID"]) && is_int($data["userID"]) && $data['userID'] !== $user ){

        //Check if the user/token is allowed to do this
        if (!checkEmployeePermission($authInfo["authorizedUser"], "any", "editUserInfo")){
            return new Response( 403, ["AppError"=>[
                "code"      => 403108,
                "message"   => "You do not have permissions to send an email verification for this user."
            ]]);
        }

        $user = $data["userID"];
    }
    
    //Fetch contact details
    $req = $API->request("accounts/fetchContactDetails", $data, $authInfo);
    if ($req->status !== 200){
        return $req;
    }
    $contact = $req->data;
    
    //Are we already verified?
    if ($contact['email']===$contact['verifiedEmail']){
        return new Response( 200, false );
    }
    
    //Create Auth Code and send email
    try {

        $code = hash("sha256", openssl_random_pseudo_bytes(512));
        
        $store = [
            "uid"  => $user,
            "code" => $code,
            "type" => "verify-email",
            "expires" => date("Y-m-d H:i:s", time()+(60*60*24*7)),
            "data" => encrypt($contact['email'])
        ];
        
        $statement = $API->DB->prepare("INSERT INTO authCodes SET uid = :uid, code = :code, type = :type, expires = :expires, data = :data");
        $statement->execute($store);

        $codeID = $API->DB->lastInsertId();
        
        $email = \JamesSwift\SWDF\email($contact['email'], htmlspecialchars($CONFIG['platformName'])."- Account Activation",
            "<html><head><title>".htmlspecialchars($CONFIG['platformName'])." - Account Activation</title></head><body><p>".
            htmlspecialchars("Dear ".$contact['firstName']." ".$contact['lastName'].",").
            "</p><p>".
            "This email address has been associated with an account on ".htmlspecialchars($CONFIG['platformURL']).". Please confirm this is correct by clicking the following link: \n\n".
            "</p><p>".
            "<a href='".htmlspecialchars("https://".$_SERVER['HTTP_HOST']."/account/verify-email/".rawurlencode($codeID)."/".rawurlencode($code)."/")."'>".
            htmlspecialchars("https://".$_SERVER['HTTP_HOST']."/account/verify-email/".rawurlencode($codeID)."/".rawurlencode($code)."/").
            "</a>".
            "</p><p>".
            "This link expires in 7 days. If you don't confirm this email address by then, the associated ".htmlspecialchars($CONFIG['platformURL'])." account will be locked.\n\n".
            "</p><p>".
            "If you didn't request this email you can simply ignore it. Or if you are concerned, reply to this email to speak to a real human.\n\n".
            "</p><p>".
            htmlspecialchars($CONFIG['platformName'])." Support Bot".
            "</p></body></html>",
            null, null, null, null,
            "MIME-Version: 1.0" . "\r\n".
            "Content-type:text/html;charset=UTF-8" . "\r\n"
        );
        
        return new Response( 200, true );

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500114,
            "message"   => "An error occurred while trying to send the verification email."
        ]]);
    }
    
}



function completeEmailVerification($input, $authInfo){
     
    global $API;
    
    //Validate the user input
    $validation = validateUserInput($input, ["id", "code"]);
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];    
    
    //Check if code is valid
    try {
        $chk = $API->DB->prepare("SELECT uid, data FROM authCodes WHERE `id` = :id AND `code` = :code AND `expires` > NOW() AND `used` IS NULL AND `type` = 'verify-email' AND data is not null ");
        $chk->execute([
            "id"=>$data['id'],
            "code"=>$data['code']
        ]);
        $row = $chk->fetch();
        if (!is_array($row)){
            throw new \Exception("No record");
        }
    } catch (\Exception $e){
        usleep(rand(500000, 1500000));
        return new Response( 403, ["AppError"=>[
            "code"      => 403101,
            "message"   => "The authentication code you supplied was invalid or has expired."
        ]]);
    }
    
    //Fetch contact details
    try {
        $chk = $API->DB->prepare("SELECT email FROM users WHERE id = :id");
        $chk->execute([
            "id"=>$row['uid']
        ]);
        $userDetails = $chk->fetch();
        if (!is_array($userDetails)){
            throw new \Exception("No record");
        }        
    } catch (\Exception $e){
        usleep(rand(500000, 1500000));
        return new Response( 500, ["AppError"=>[
            "code"      => 500118,
            "message"   => "Error while trying to fetch your account details."
        ]]);
    }
    
    //Check the email to verify matches the email in the account
    if (decrypt($row['data'])!==$userDetails['email']){
        return new Response( 403, ["AppError"=>[
            "code"      => 403103,
            "message"   => "The account email has changed since this authentication code was generated. This URL is now invalid."
        ]]);
    }
    
    //Set verified email
    try {
        
        $chk = $API->DB->prepare("UPDATE users SET verifiedEmail = :email WHERE id = :id");
        $chk->execute([
            "id"=>$row['uid'],
            "email"=>decrypt($row['data'])
        ]);
        
        //Mark the authcode as used
        $chk = $API->DB->prepare("UPDATE authCodes SET used = 1 WHERE id = :id");
        $chk->execute([
            "id"=>$data['id']
        ]);
        
        return new Response( 200, true);

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500115,
            "message"   => "An error occurred while trying to update your account information."
        ]]);
    }

}



function changePassword($input, $authInfo){
     
    global $API;
    
    //Validate the user input
    $validation = validateUserInput($input, ["currentPassword", "newPassword", "newPasswordConfirm"]);
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];  
    
    $user = intval($authInfo["authorizedUser"]->id);
    
    //Check the current password
    try {
         
        $q = $API->DB->prepare("SELECT * FROM users WHERE id = :id");
        $q->execute(["id" => $user]);
        $userDetails = $q->fetch();
        
        if (!is_array($userDetails)){
            throw new \Exception("no user");
        }
        
        //Test password
        if (!password_verify($input['currentPassword'], $userDetails['password'])){
            return new Response( 403, ["ValidationErrors"=>
                ["currentPassword"=>["invalid"=>"The current password you entered is incorrect. Please try again."]]
            ]);
        }        

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500116,
            "message"   => "An error occurred while trying to fetch your account information."
        ]]);
    }
    
    try {
         
        //Change the password
        $q = $API->DB->prepare("UPDATE users SET password = :newPassword WHERE id = :id");
        $q->execute(["id"=>$user, "newPassword"=> password_hash($data['newPassword'], PASSWORD_DEFAULT, ["cost"=>12])]);
        
        //Invalidate all other auth tokens (except the given ID)
        if (isset($data['tokenID'])){
            $req = $API->request("swdapi/invalidateAllAuthTokens", ["id"=>$data['tokenID']], $authInfo);
        } else {
            $req = $API->request("swdapi/invalidateAllAuthTokens", ["id"=>$data['tokenID']], $authInfo);
        }
        if ($req->status !== 200){
            return $req;
        }
        
        return new Response( 200, true);

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500117,
            "message"   => "An error occurred while trying to update your account information."
        ]]);
    }

}


function changePin($input, $authInfo){
     
    global $API;
    
    //Validate the user input
    $validation = validateUserInput($input, ["newPin","currentPassword"]);
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];  
    
    $user = intval($authInfo["authorizedUser"]->id);
    
    //Check the current password
    try {
         
        $q = $API->DB->prepare("SELECT * FROM users WHERE id = :id");
        $q->execute(["id" => $user]);
        $userDetails = $q->fetch();
        
        if (!is_array($userDetails)){
            throw new \Exception("no user");
        }
        
        //Test password
        if (!password_verify($input['currentPassword'], $userDetails['password'])){
            return new Response( 403, ["ValidationErrors"=>
                ["currentPassword"=>["invalid"=>"The current password you entered is incorrect. Please try again."]]
            ]);
        }        

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500150,
            "message"   => "An error occurred while trying to fetch your account information."
        ]]);
    }
    
    try {
        
        //Hash the pin
        $pinHash = hash("sha256", $data['newPin']);
        $salt = hash_hmac("sha256", strtolower($userDetails['email']), $data['currentPassword']);
        $hash = hash_hmac("sha256", $pinHash, $salt);
         
        //Change the pin
        $q = $API->DB->prepare("UPDATE users SET pin = :pin WHERE id = :id");
        $q->execute(["id"=>$user, "pin"=> $hash]);

        //Invalidate all other auth tokens (except the given ID)
        if (isset($data['tokenID'])){
            $req = $API->request("swdapi/invalidateAllAuthTokens", ["id"=>$data['tokenID']], $authInfo);
        } else {
            $req = $API->request("swdapi/invalidateAllAuthTokens", ["id"=>$data['tokenID']], $authInfo);
        }
        if ($req->status !== 200){
            return $req;
        }
        
        return new Response( 200, ["hash"=>$hash]);

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500151,
            "message"   => "An error occurred while trying to update your account information."
        ]]);
    }

}


function fetchEmployeePermissions($data, $authInfo){
     
    global $API;
    
    $user = intval($authInfo["authorizedUser"]->id);

    //Check if allowed to specify a different user id
    if (isset($data["userID"]) && is_int($data["userID"]) && 1==2){
        //TODO implement permission management
        $user = $data["userID"];
    }

    //Find businesses this user is associated with
    $chk = $API->DB->prepare("SELECT id FROM businesses WHERE archived = 0");
    $chk->execute();
    
    if ($chk->rowCount()>0){
        
        $businesses = [];
        
        foreach ($chk->fetchAll() as $biz){
            $perms = getEmployeePermissions($user, $biz['id']);
            if ($perms!==false){
                $businesses[$biz['id']] = $perms;
            }
        }
        if (sizeof($businesses)>0){
            return new Response( 200, $businesses);
        }
    }
    
    return new Response( 200, false);

}



function fetchAddressBook($input, $authInfo){
    
    global $API;
    
    //Validate the user input
    $validation = validateUserInput($input);
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];    
    
    $user = intval($authInfo["authorizedUser"]->id);

    //Check if allowed to specify a different user id
    if (isset($data["userID"]) && is_int($data["userID"]) && $data['userID'] !== $user ){

        //Check if the user/token is allowed to do this
        if (!checkEmployeePermission($authInfo["authorizedUser"], "any", "viewUserInfo")){
            return new Response( 403, ["AppError"=>[
                "code"      => 403105,
                "message"   => "You do not have permissions to view this user's address book."
            ]]);
        }

        $user = $data["userID"];
    }
    
    //Get the user's full name/Fetch contact details
    $req = $API->request("accounts/fetchContactDetails", $data, $authInfo);
    if ($req->status !== 200){
        return $req;
    }
    $contact = $req->data;
    
    try {
        
        $chk = $API->DB->prepare("SELECT pid AS addressPID, id as addressID, addressName, addressTo, streetAddress, town, county, state, postcode, country FROM addresses WHERE userID = ? AND archived = 0 ORDER BY postcode asc");
        $chk->execute([$user]);
        
        $addresses = $chk->fetchAll();
        
        foreach ($addresses as $id=>$ad){
        
			//Decrypt data
			foreach (["addressTo", "streetAddress", "town", "county", "state", "country", "postcode"] as $col){
				if ($ad[$col] === null) continue;
				$ad[$col] = $addresses[$id][$col] = decrypt($ad[$col]);
			}
        
			$addresses[$id]["addressTo_computed"] = ($ad["addressTo"]=="" ? $contact['fullName'] : $ad["addressTo"]);
			$addresses[$id]["default"] = ($ad['addressPID'] == $contact['defaultAddressPID']);
        }
        
        return new Response( 200, $addresses);

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500119,
            "message"   => "An error occurred while trying to fetch your address book."
        ]]);
    }

}



function changeDefaultAddress($input, $authInfo){
     
    global $API;
    
    //Validate the user input
    $validation = validateUserInput($input, ["addressPID"]);
    
    //Check for validation errors
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Use the sanitized data
    $data = $validation['data'];  
    
    $user = intval($authInfo["authorizedUser"]->id);

    //Check if allowed to specify a different user id
    if (isset($data["userID"]) && is_int($data["userID"]) && $data['userID'] !== $user ){

        //Check if the user/token is allowed to do this
        if (!checkEmployeePermission($authInfo["authorizedUser"], "any", "viewUserInfo")){
            return new Response( 403, ["AppError"=>[
                "code"      => 403106,
                "message"   => "You do not have permissions to view this user's contact details."
            ]]);
        }

        $user = $data["userID"];
    }
    
    //Check that we own this address and it is not archived
    try {
         
        $q = $API->DB->prepare("SELECT * FROM addresses WHERE userID = :id AND pid = :addressPID AND archived = 0");
        $q->execute(["id" => $user, "addressPID" => $data['addressPID']]);

        if ($q->rowCount()<1){
			return new Response( 403, ["AppError"=>[
				"code"      => 403160,
				"message"   => "The address you specified doesn't exist, or belongs to another account."
			]]);
        }        

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500160,
            "message"   => "An error occurred while trying to change your default address."
        ]]);
    }
    
    try {
        //Change the default address
        $q = $API->DB->prepare("UPDATE users SET defaultAddressPID = :pid WHERE id = :id");
        $q->execute(["id"=>$user, "pid"=> $data['addressPID'] ]);
        
        return new Response( 200, $data['addressPID']);

    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500161,
            "message"   => "An error occurred while trying to update your account."
        ]]);
    }

}
