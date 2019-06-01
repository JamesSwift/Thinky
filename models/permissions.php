<?php

function checkEmployeePermission( \JamesSwift\SWDAPI\Credential $credential, $businessID, $permission){
    
    $perms = getEmployeePermissions($credential->id, $businessID);
    
    if (!is_array($perms)){
        return false;
    }
    
    $accountHasPerm = false;
    $tokenHasPerm = false;
    
    //Check if account has permissions
    if (isset($perms['ALL']) && $perms['ALL']==true){
       $accountHasPerm = true;
    } else if (isset($perms[$permission]) && $perms[$permission]==true){
        $accountHasPerm = true;
    }
    
    //Check if current user token grants permission
    if (isset($credential->permissions['employee'][$businessID]['ALL']) && $credential->permissions['employee'][$businessID]['ALL']==true){
        $tokenHasPerm = true;
    } else if (isset($credential->permissions['employee'][$businessID][$permission]) && $credential->permissions['employee'][$businessID][$permission]==true) {
        $tokenHasPerm = true;
    }
    
    return ($accountHasPerm && $tokenHasPerm);
}

function getEmployeePermissions($userID, $businessID, $forceUpdate=false){
    
    global $API;
    
    static $localStore = [];
    
    if ( $forceUpdate===false && isset($localStore[$userID][$businessID])){
        return $localStore[$userID][$businessID];
    }
    
    try {
        
        unset($localStore[$userID][$businessID]);
        
        ///Check if owner
        $o = $API->DB->prepare("SELECT id FROM businesses WHERE owner = ? AND id = ?");
        $o->execute([$userID, $businessID]);

        //Check emplyee status
        $r = $API->DB->prepare("SELECT * FROM employeePermissions WHERE userID = ? AND businessID = ?");
        $r->execute([$userID, $businessID]);
        
        //Store permissions
        if ($r->rowCount()>0){
            $row = $r->fetch();
            unset($row['userID'], $row['businessID']);
            $localStore[$userID][$businessID] = $row;
        }
        
        //Set special value giving owner all permissions
        if ($o->rowCount()===1){
            $localStore[$userID][$businessID]["ALL"] = true;
        }
        
        if (!isset($localStore[$userID][$businessID])){
            return false;
        }
        
        return $localStore[$userID][$businessID];
        

    } catch (\Exception $e){
        return false;
    }
}

function buildTokenPermissions($userID, $requestedPermissions){

    global $API;
    
    $permissions = [];

    //Employee permissions
    if (isset($requestedPermissions["employee"])){
        
        $find = null;
        
        //Include all businesses permissions
        if (is_string($requestedPermissions["employee"]) && $requestedPermissions["employee"]==="ALL"){
            $find = "all";
            
        //Just certain businesses
        } else if (is_array($requestedPermissions["employee"]) && sizeof($requestedPermissions["employee"])>0){
            $find = $requestedPermissions["employee"];
        }
        
        //Fetch list of all businesses
        $chk = $API->DB->prepare("SELECT id FROM businesses WHERE archived = 0");
        $chk->execute();
        if ($chk->rowCount()>0 && $find !== null){
            
            $businesses = [];
            
            //Cycle through all businesses and add appropriate permissions to token
            foreach ($chk->fetchAll() as $biz){
                if ($find==="all" || isset($find[$biz['id']]) ){
                    
                    //Find what permissions the user has for this business
                    $perms = getEmployeePermissions($userID, $biz['id']);
                    
                    //Do we have any?
                    if ($perms!==false){
                        
                        //Add every permissions?
                        if ($find=="all" || $find[$biz['id']]==="ALL"){
                            $businesses[$biz['id']] = $perms;
                            
                        //Add just some
                        } else if ( is_array($find[$biz['id']]) ){
                            $businesses[$biz['id']] = [];
                            foreach ($perms as $perm=>$value){
                                if (in_array($perm, $find[$biz['id']])){
                                    $businesses[$biz['id']][$perm] = true;
                                }
                            }
                        }
                    }
                }
            }
            
            //Add gathered employee details to token permissions
            if (sizeof($businesses)>0){
                $permissions['employee'] = $businesses;
            }
        }
        
    }
    
    if (sizeof($permissions)<1){
        return null;
    }
    
    return $permissions;

}

function credentialVerifier($user, $pass, $requestedPermissions, $clientInfo){
    
    global $API;
    
    $user = strtolower($user);
    
    //Check user is valid email address
    if (!filter_var($user, FILTER_VALIDATE_EMAIL)){
        return false;
    }
    
    //Check password is longer than 8
    if (!is_string($pass) || strlen($pass)<8){
        return false;
    }
    
    //Attempt to get user from DB
    try {
        $r = $API->DB->prepare("SELECT * FROM users WHERE email = ?") ;
        $r->execute([$user]);
        $userRow = $r->fetch();
        
    } catch (\Exception $e){
        return false;
    }
    
    //Check user exists
    if (!is_array($userRow)){
        return false;
    }
    
    //Rate limiting bad logins
    //TODO
    
    //Lock accounts with too many failed logins
    //TODO
    
    //Test password
    if (!password_verify($pass, $userRow['password'])){
        return false;
    }
    
    //Does password need rehashing?
    if (password_needs_rehash($userRow['password'], PASSWORD_DEFAULT, ["cost"=>12])){
        $newHash = password_hash($pass, PASSWORD_DEFAULT, ["cost"=>12]);
        //Store it
        $r = $API->DB->prepare("UPDATE users SET password = :password WHERE id = :id") ;
        $r->execute(["id"=>$userRow['id'], "password"=>$newHash]);
    }
    
    //Check for locked accounts and send out activation/verification email
    //TODO 
    
    //Build permissions for this token
    $permissions = buildTokenPermissions($userRow['id'], $requestedPermissions);
    
    //Log this
    //TODO
    
    return new \JamesSwift\SWDAPI\Credential(
        $userRow['id'],
        $permissions, 
        [
            "firstName" => decrypt($userRow['firstName']),
            "lastName" => decrypt($userRow['lastName']),
            "pin" => $userRow['pin']
        ]
    );
}