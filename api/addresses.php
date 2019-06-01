<?php
global $root;

use \JamesSwift\SWDAPI\Response;

function lookupAddress($input, $authInfo){
	
	global $API,$root;
	
	if (isset($authInfo["authorizedUser"])){
		$userID = intval($authInfo["authorizedUser"]->id);
	} else {
		$userID = 0;
	}

	//Validate the user input
	$required = [];
	if (isset($input['addressPID'])){
		$required = ["addressPID"];
	} else {
		$required = ["postcode", "streetAddress", "country"];
	} 
	$validation = validateUserInput($input, $required);
	
	//Check for validation errors
	if (sizeof($validation["errors"])>0){
		return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
	}
	
	//Use the sanitized data
	$data = $validation['data'];
	
	//If specific address requested, return it (if possible)
	if (isset($data['addressPID'])){
		
		try {
			$chk = $API->DB->prepare("SELECT pid AS addressPID,id AS addressID, addressName, addressTo, streetAddress,town,county,state,country,postcode FROM `addresses` WHERE (userID is null OR userID = ?) AND pid = ? AND archived = 0 ORDER BY id desc");
			$chk->execute([
				$userID,
				$data['addressPID'],
			]);
			
			
			if ($chk->rowCount()>0){
				$row =  $chk->fetch();
				
				//Decrypt if a user row
				if ($row['userID']!==null){
					foreach (["addressTo", "streetAddress", "town", "county", "state", "country", "postcode"] as $col){
						$row[$col] = decrypt($row[$col]);
					}
				}
				
				return new Response( 200,$row);
			} else {
				throw new \Exception("Not found");
			}
			
		} catch (\Exception $e){
			return new Response( 404, ["AppError"=>[
				"code"      => 404511,
				"message"   => "The specific address you requested could not be found."
			]]);
		}
	
	//Check database first (if postcode & address search)
	} else if (isset($data['postcode'])){
		try {
			$chk = $API->DB->prepare("SELECT pid AS addressPID,id AS addressID,streetAddress,town,county,country,postcode FROM `addresses` WHERE (userID is null OR userID = ?) AND country = ? AND postcode = ? AND streetAddress = ? AND archived = 0 ORDER BY id desc");
			$chk->execute([
				$userID,
				$data['country'],                
				$data['postcode'],
				$data['streetAddress']
			]);
			
			if ($chk->rowCount()>0){            
				return new Response( 200, $chk->fetch());
			}
			
		} catch (\Exception $e){
			//Do nothing, just keep going
		}
	}
	
	//Else, Lookup from google
	$search = "components=".rawurlencode("country:".$data['country']."|postal_code:".$data['postcode'])."&address=".rawurlencode($data['streetAddress']);
	
	
	$url = "https://maps.googleapis.com/maps/api/geocode/json?".$search."&key=".rawurlencode(file_get_contents($root."/config/googleAPIKey.txt"));

	$ch = curl_init($url);
	curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
	$request = curl_exec($ch);
	curl_close($ch);

	$request = json_decode($request, true);
	
	if (!is_array($request) || $request['status']!=="OK" || !is_array($request['results'])  || sizeof($request['results']) < 1){
		
		return new Response( 404, ["AppError"=>[
			"code"      => 404510,
			"message"   => "We couldn't find an exact match your address. Please try again, or enter your address manually."
		]]);
		
	}
	
	$response = [
		"streetAddress" => $data['streetAddress'],
		"town" => "",
		"county" => "",
		"state" => "",
		"country" => "",
		"postcode" => ""
	];
		
	//Find details
	foreach ($request['results'][0]["address_components"] as $comp){
		if (!isset($data['streetAddress'])){
			if (in_array("street_number", $comp['types'])){
				$response['streetAddress'] = $comp['long_name']." ".$response['streetAddress'];
			}
			if (in_array("route", $comp['types'])){
				$response['streetAddress'] .= $comp['long_name'];
			}
		}
		
		if (in_array("locality", $comp['types'])){
			$response['town'] = $comp['long_name'];
		}
		if (in_array("administrative_area_level_1", $comp['types'])){
			$response['state'] = $comp['long_name'];
		}
		if (in_array("administrative_area_level_2", $comp['types'])){
			$response['county'] = $comp['long_name'];
		}
		if (in_array("country", $comp['types'])){
			$response['country'] = $comp['long_name'];
		}
		if (in_array("postal_code", $comp['types'])){
			$response['postcode'] = $comp['long_name'];
		}
	}
	
	//cache or save this address
	try {
		
		$API->DB->beginTransaction();
		
		//Get a new PID
		if ($userID>0){
			$statement = $API->DB->prepare("INSERT INTO pids SET `table` = 'addresses', createdBy = ?");
			$statement->execute([$userID]);
		} else {
			$statement = $API->DB->prepare("INSERT INTO pids SET `table` = 'addresses'");
			$statement->execute();
		}
		$pid = $API->DB->lastInsertId();
		
		$saveMe = [
			$pid,
			$response['country'],
			$response['county'],
			$response['state'],
			$response['streetAddress'],
			$response['town'],
			$response['postcode']
		];
		
		$chk = $API->DB->prepare("INSERT INTO `addresses` SET pid = ?, country = ?, county = ?, state = ?, streetAddress = ?, town = ?, postcode = ?");
		$chk->execute($saveMe);
		
		$response['addressPID'] = $pid;
		$response['addressID'] = $API->DB->lastInsertId();
		
		$API->DB->commit();
		
	} catch (\Exception $e){
		
		$API->DB->rollBack();
		
		return new Response( 500, ["AppError"=>[
			"code"      => 500511,
			"message"   => "An error occurred while trying to store your address. Please try again."
		]]);
	}
		
	return new Response( 200, $response);
}



function saveAddressToAccount($input, $authInfo){
	
	global $API,$root;
	
	$userID = intval($authInfo["authorizedUser"]->id);
	
	//Validate the user input
	//TODO If added by an admin, allow partial addresses
	$validation = validateUserInput($input, ["streetAddress", "town", "postcode", "country"]);
	
	//Check for validation errors
	if (sizeof($validation["errors"])>0){
		return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
	}
	
	//Use the sanitized data
	$data = $validation['data'];
	
	$pid = null;
	
	//If we are editing an existing address, check the pid is owned by us
	if (isset($data['addressPID'])){
		$chk = $API->DB->prepare("SELECT pid FROM `addresses` WHERE userID = ? AND pid = ? AND archived = 0");
		$chk->execute([$userID, $data['addressPID'] ]);
				
		if ($chk->rowCount()<1){  
			return new Response( 403, ["ValidationErrors"=>['addressPID'=>["The address you are trying to edit doesn't exist, or belongs to another account"]]]);
		}
		
		$pid = $data['addressPID'];
	}
	
	//Check if duplicate reference exists
	if (isset($data['addressName'])){
		$chk = $API->DB->prepare("SELECT pid FROM `addresses` WHERE userID = ? AND LOWER(addressName) = ? AND pid != ? AND archived = 0");
		$chk->execute([$userID, strtolower($data['addressName']), $pid]);
				
		if ($chk->rowCount()>0){            
			return new Response( 403, ["ValidationErrors"=>['addressName'=>["You already have an address with this reference/name."]]]);
		}
	}
	
	try {
		
		$API->DB->beginTransaction();
		
		//Get a new PID
		if ($pid === null){
			if ($userID>0){
				$statement = $API->DB->prepare("INSERT INTO pids SET `table` = 'addresses', createdBy = ?");
				$statement->execute([$userID]);
			} else {
				$statement = $API->DB->prepare("INSERT INTO pids SET `table` = 'addresses'");
				$statement->execute();
			}
			$pid = $API->DB->lastInsertId();
		}
		
		//Archive previous versions of this address
		$statement = $API->DB->prepare("UPDATE addresses SET archived = 1 WHERE pid = ?");
		$statement->execute([$pid]);
		
		//Insert new address version
		$sql = "INSERT INTO `addresses` SET pid = :addressPID, userID = :userID";
		
		$return = $save = [
			"addressPID" => $pid,
			"userID" => $userID
		];
		
		//Add data (if available)
		foreach (["streetAddress", "town", "postcode", "country", "county", "state", "addressTo","addressName"] as $field){
			if (isset($data[$field])){
				$return[$field]=$data[$field];
				if ($field === "addressName"){
					$save[$field]=$data[$field];
				} else {
					$save[$field]=encrypt($data[$field]);
				}
				$sql.=", $field = :$field";
			}
		}
		
		$chk = $API->DB->prepare($sql);
		$chk->execute($save);
		
		$return['addressID'] = $save['addressID'] = $API->DB->lastInsertId();
		
		$API->DB->commit();
		
	} catch (\Exception $e){
		
		$API->DB->rollBack();
		
		return new Response( 500, ["AppError"=>[
			"code"      => 500521,
			"message"   => "An error occurred while trying to store your address. Please try again."
		]]);
	}
	
	//Fetch contact details
    $req = $API->request("accounts/fetchContactDetails", $data, $authInfo);
    if ($req->status !== 200){
        return $req;
    }
    $contact = $req->data;
    
    //If no default address, make this default
    if ($contact['defaultAddressPID'] === null || (isset($data['makeDefault']) && $data['makeDefault'] === 1)){
		$req = $API->request("accounts/changeDefaultAddress", ["addressPID"=>$pid, "userID"=>$userID], $authInfo);
		if ($req->status === 200){
			$return['default'] = true;
		}
    }
		
	return new Response( 200, $return);
}



function archiveAddress($input, $authInfo){
	
	global $API,$root;
	
	$userID = intval($authInfo["authorizedUser"]->id);
	
	//Validate the user input
	$validation = validateUserInput($input, ["addressPID"]);
	
	//Check for validation errors
	if (sizeof($validation["errors"])>0){
		return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
	}
	
	//Use the sanitized data
	$data = $validation['data'];
	
	//Check if user owns this address
	$chk = $API->DB->prepare("SELECT pid FROM `addresses` WHERE userID = ? AND pid = ?");
	$chk->execute([$userID, $data['addressPID']]);
			
	if ($chk->rowCount()==0){
		return new Response( 403, ["AppError"=>[
			"code"      => 403531,
			"message"   => "You don't have permission to archive this address."
		]]);
	}
	
	//Check if this is the default address
    $req = $API->request("accounts/fetchContactDetails", $data, $authInfo);
    if ($req->status !== 200){
        return $req;
    }
    $contact = $req->data;
    
    if ($contact['defaultAddressPID']===$data['addressPID']){
		return new Response( 403, ["AppError"=>[
			"code"      => 403532,
			"message"   => "You can't remove your primary address. Please mark another address as primary before trying to remove this one."
		]]);
	}
	
	try {
				
		$sql = "UPDATE `addresses` SET archived = 1 WHERE pid = :addressPID AND userID = :userID";
		
		$save = [
			"addressPID" => $data['addressPID'],
			"userID" => $userID
		];
		
		$chk = $API->DB->prepare($sql);
		$chk->execute($save);
		
		
	} catch (\Exception $e){
				
		return new Response( 500, ["AppError"=>[
			"code"      => 500531,
			"message"   => "An error occurred while trying to archive your address. Please try again."
		]]);
	}
		
	return new Response( 200, $data['addressPID']);
}