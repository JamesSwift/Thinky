<?php
global $root;

use \JamesSwift\SWDAPI\Response;

function lookupAddress($input, $authInfo){
	
	global $API,$root;
	
	$userID = intval($authInfo["authorizedUser"]->id);
	
	//Check if the user/token is allowed to do see all addresses
	$admin = checkEmployeePermission($authInfo["authorizedUser"], "any", "viewUserInfo");

	//Validate the user input
	$validation = validateUserInput($input, ["addressPID"]);
	
	//Check for validation errors
	if (sizeof($validation["errors"])>0){
		return new Response( 403, ["ValidationErrors"=>$validation["errors"]]);
	}
	
	//Use the sanitized data
	$data = $validation['data'];
		
	try {
		$vars = [];
		$sql = "SELECT pid AS addressPID,id AS addressID, addressName, addressTo, streetAddress,town,county,state,country,postcode FROM `addresses` WHERE ";

		if (!$admin){
			$vars[] = $userID;
			$sql.="(userID is null OR userID = ?) AND ";
		}

		$sql .= "pid = ? AND archived = 0 ORDER BY id desc";

		$vars[] = $data['addressPID'];

		$chk = $API->DB->prepare();
		$chk->execute($vars);
		
		
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