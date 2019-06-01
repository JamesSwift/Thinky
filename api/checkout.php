<?php
global $root;

use \JamesSwift\SWDAPI\Response;

function testOrder($input, $authInfo){
    
    global $API;
    
    //Validate the user input
    $validation = validateUserInput($input, ["basket"]);
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Sanitized data
    $data = $validation['data'];
    
    return new Response( 200, ["success"=>true, "basket"=>$data['basket']] );

}

function submitOrder($input, $authInfo){
    
    global $API;
    
    //Validate the user input
    $validation = validateUserInput($input, ["basket", "paymentMethod"]);
    
    if (sizeof($validation["errors"])>0){
        return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
    }
    
    //Sanitized data
    $data = $validation['data'];
    
    
    function createOrder($business, $paymentSource, $token=null){
        
        //throw if error
        
        return [
            "status" => "created",
            "businesID" => $business['id'],
            "total" => $business['total']
        ];
        
    }
    
    function cancelOrder($order){
        
        if (isset($order['id']) && $order['id'] !== null){
            $chk = $API->DB->prepare("DELETE FROM orders WHERE id = ?");
            $chk->execute([$order['id']]);
        }
        
        if (isset($order['chargeID']) && isset($order['total'])){
            $refund = \Stripe\Refund::create(
                [
                    'charge' => $order['chargeID'],
                    'amount' => $order['total'],
                ],
                ["stripe_account" => $businesses[$bizID]["stripeUserID"] ]
            );
        }
    }    
    
    
    
    //Fetch the user & business data
    try {
        
        $chk = $API->DB->prepare("SELECT * FROM users WHERE id = ?");
        $chk->execute([intval($authInfo["authorizedUser"]->id)]);
        $user = $chk->fetch();
        
        
        $chk = $API->DB->prepare("SELECT * FROM businesses");
        $chk->execute();
        $businesses = $chk->fetchAll(PDO::FETCH_ASSOC | PDO::FETCH_UNIQUE);
    
    } catch (\Exception $e){
        return new Response( 500, ["AppError"=>[
            "code"      => 500600,
            "message"   => "An error occurred while trying to fetch your account information."
        ]]);
    }
    
    
    $orders = [];
    
    //CASH
    if ($data['paymentMethod'] === "cash"){
    
        //Check if more than one order has been made
        
    } else {
        
        $sourceID = null;
    
        //CARD
        
        //Check card exists
        /*
        $req = $API->request("accounts/fetchPaymentSources", null, $authInfo);
        if ($req->status !== 200){
            return $req;
        }
        */    
        
        //Goto Attempt charge
        
        
        
        //NEW CARD
        try {
                
            //Retreive customer
            if ($user['stripeCustomerID'] !== null){
                //Get the customer
                $customer = \Stripe\Customer::retrieve($user['stripeCustomerID']);
                
                //Atach the new card
                $source = $customer->sources->create(["source" => $data['newCardToken'] ]);
                
                $sourceID = $source->id;
                
            //Create new customer
            } else {
                $customer = \Stripe\Customer::create(array(
                    "source" => $token,
                ));
                
                //Save the customer details
                $chk = $API->DB->prepare("UPDATE users SET stripeCustomerID = ? WHERE id = ?");
                $chk->execute([$customer->id, intval($authInfo["authorizedUser"]->id)]);
            }
        
        } catch (\Exception $e) {
            return new Response( 500, ["AppError"=>[
                "code"      => 500601,
                "message"   => "An error occurred while trying to store your payment method. Please try again."
            ]]); 
        }
        
        //Create token specific for each business
        try {
            $tokens = [];
            foreach ($data['basket']['businesses'] as $bizID => $business){
                $token = \Stripe\Token::create(
                    [
                      "customer" => $customer->id,
                      "card" => $sourceID
                    ],
                    ["stripe_account" => $businesses[$bizID]["stripeUserID"]]
                );
                $tokens[$bizID] = $token;
            }
        } catch (\Stripe\Error\Base $e) {
            return new Response( 500, ["AppError"=>[
                "code"      => 500602,
                "message"   => "An error occurred while trying to create your payment tokens. Please try again."
            ]]); 
        }
        
        //Attempt to charge each token
        try {
            foreach ($data['basket']['businesses'] as $bizID => $business){
       
                //Create and store the order
                
                $order = createOrder($business, $data['paymentMethod']);
                $orders[$order['id']] = $order;
                
                $charge = \Stripe\Charge::create(
                    [
                      "amount" => $business['total'],
                      "currency" => "gbp",
                      "source" => $tokens[$bizID],
                      "application_fee" => floor($business['total']*0.05)
                    ],
                    ["stripe_account" => $businesses[$bizID]["stripeUserID"] ]
                );
                
                $order['chargeID'] = $charge->id;
                
                $orders[$order['id']] = $order;
                
                $succedded ++;
             }
        } catch (\Exception $e) {
            
            //Refund and cancel all orders
            
            foreach ($orders as $order){
                cancelOrder($order);
            }
            
            return new Response( 500, ["AppError"=>[
                "code"      => 500603,
                "message"   => "An error occurred while trying to charge your card. Please try again."
            ]]); 
        }
        
    }
    
    return new Response( 200, ["success"=>true, "orders"=>$orders] );

}