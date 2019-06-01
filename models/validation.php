<?php

function validateUserInput($data, $required=[], $authInfo=null){
	 
	$errors = [];
	
	//Title
	if (isset($data['title'])){
		if (!in_array($data['title'], ["Mr.","Ms.","Mrs.","Miss.","Dr."], true)){
			$errors["title"]["invalid"] = "The Title you specified isn't valid.";
		}
	}
	
	//First Name
	if (isset($data['firstName'])){
		if (!is_string($data['firstName']) || strlen($data['firstName'])<1){
			$errors["firstName"]["short"] = "The First Name you supplied was too short.";
		}
		if (preg_match("/[\x{0000}-\x{001F}#$%&\*\+\x{003A}-\x{0040}\x{005B}-\x{0060}\x{007B}-\x{00BF}]/u", $data['firstName']) === 1){
			$errors["firstName"]["invaidContent"] = "The First Name you supplied contains invalid characters.";
		}
	}
	
	//Middle Names
	if (isset($data['middleNames'])){
		if (!is_string($data['middleNames']) || strlen($data['middleNames'])>50 || preg_match("/[\x{0000}-\x{001F} .#$%&\*\+\x{003A}-\x{0040}\x{005B}-\x{0060}\x{007B}-\x{00BF}]/u", $data['addressName']) === 1){
			$errors["middleNames"]["invalid"] = "The middle name you supplied contains invalid characters.";
		}
	}
	
	//Last Name
	if (isset($data['lastName'])){
		if (!is_string($data['lastName']) || strlen($data['lastName'])<1 ){
			$errors["lastName"]["short"] = "The Last Name you supplied was too short.";
		}
		if (preg_match("/[\x{0000}-\x{001F}#$%&\*\+\x{003A}-\x{0040}\x{005B}-\x{0060}\x{007B}-\x{00BF}]/u", $data['lastName']) === 1){
			$errors["lastName"]["invaidContent"] = "The Last Name you supplied contains invalid characters.";
		}
	}
	
	//Phone number
	if (isset($data['primaryPhoneNumber']) && $data['primaryPhoneNumber']!==""){
		if (preg_match("/^[\+0][0-9 ]+$/", $data['primaryPhoneNumber']) === 0 ){
			$errors["primaryPhoneNumber"]["invaidFormat"] = "The phone number you supplied was invalid. It should only contain numbers, spaces, and start with 0 or a country code (e.g. +44).";
		}
		if ( !is_string($data['primaryPhoneNumber']) || strlen(str_replace(" ", "", $data['primaryPhoneNumber']))<9 ){
			$errors["primaryPhoneNumber"]["short"] = "The Phone Number you supplied was too short.";
		}        
	}
	if (isset($data['secondaryPhoneNumber']) && $data['secondaryPhoneNumber']!==""){
		if (preg_match("/^[\+0][0-9 ]+$/", $data['secondaryPhoneNumber']) === 0 ){
			$errors["secondaryPhoneNumber"]["invaidFormat"] = "The phone number you supplied was invalid. It should only contain numbers, spaces, and start with 0 or a country code (e.g. +44).";
		}
		if ( !is_string($data['secondaryPhoneNumber']) || strlen(str_replace(" ", "", $data['secondaryPhoneNumber']))<9 ){
			$errors["secondaryPhoneNumber"]["short"] = "The Phone Number you supplied was too short.";
		}        
	}	
	
	//Email
	if (isset($data['email'])){ 
		$data['email'] = strtolower($data['email']);
		if (!is_string($data['email']) || strlen($data['email'])<4){
			$errors["email"]["short"] = "The Email Address you supplied was too short to be valid.";
		}
		if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)){
			$errors["email"]["invaidFormat"] = "The Email Address you supplied was not in a valid format.";
		}
	}
	
	
	//New Passwords
	if (isset($data['newPassword'])){ 
		if (!is_string($data['newPassword']) || strlen($data['newPassword'])<8){
			 $errors["newPassword"]["short"] = "The New Password you supplied was too short to be valid.";
		}
		if (!isset($data['newPasswordConfirm']) || !is_string($data['newPasswordConfirm']) || strlen($data['newPasswordConfirm'])<8){
			$errors["newPasswordConfirm"]["short"] = "You didn't enter your password again (or it was too short).";
		}
		if (isset($data['newPasswordConfirm']) && $data['newPassword'] !== $data['newPasswordConfirm']){
			$errors["newPassword"]["mismatch"] = "You passwords you supplied don't match. Please type them again.";
		}
		if (preg_match("/^(?=.*\d)(?=.*[A-Z])(?=.*[a-z]).{8,}$/", $data['newPassword']) === 0){
			$errors["newPassword"]["invaidFormat"] = "Your password is not strong enough. It must be at least 8 characters long, and include uppercase and lowercase letters and at least one digit.";
		}
	}
	
	//Current Password
	if (isset($data['currentPassword'])){ 
		if (!is_string($data['currentPassword']) || strlen($data['currentPassword'])<8){
			 $errors["currentPassword"]["short"] = "The Current Password you supplied was too short to be valid - passwords are 8 characters or more.";
		}
	}
	
	//New Pin
	if (isset($data['newPin'])){ 
		if (!is_string($data['newPin']) || !ctype_digit($data['newPin'])){
		   $errors["newPin"]["invalid"] = "The new PIN you provided was invalid. It must be a number, 4 or more digits in length.";
		} else if(strlen($data['newPin'])<4){
			$errors["newPin"]["short"] = "The new PIN you provided was too short. It must be 4 or more digits in length.";
		}
	}

	//Security Answers
	if (isset($data['securityAnswer1']) && isset($data['securityAnswer2']) && isset($data['securityAnswer3'])){
		
		if (!is_string($data['securityAnswer1']) || strlen($data['securityAnswer1'])<3){
			$errors["securityAnswer1"]["short"] = "The answer to Quetions 1 that you supplied was too short.";
		}
		if (!is_string($data['securityAnswer1']) || strlen($data['securityAnswer1'])>100){
			$errors["securityAnswer1"]["long"] = "The answer to Quetions 1 that you supplied was too long.";
		}    
		if (!is_string($data['securityAnswer2']) || strlen($data['securityAnswer2'])<3){
			$errors["securityAnswer2"]["short"] = "The answer to Quetions 2 that you supplied was too short.";
		}
		if (!is_string($data['securityAnswer2']) || strlen($data['securityAnswer2'])>100){
			$errors["securityAnswer2"]["long"] = "The answer to Quetions 2 that you supplied was too long.";
		}        
		if (!is_string($data['securityAnswer3']) || strlen($data['securityAnswer3'])<3){
			$errors["securityAnswer3"]["short"] = "The answer to Quetions 3 that you supplied was too short.";
		}
		if (!is_string($data['securityAnswer3']) || strlen($data['securityAnswer3'])>100){
			$errors["securityAnswer3"]["long"] = "The answer to Quetions 3 that you supplied was too long.";
		}
		
		//Convert answers to lowercase
		$data['securityAnswer1'] = strtolower($data['securityAnswer1']);
		$data['securityAnswer2'] = strtolower($data['securityAnswer2']);
		$data['securityAnswer3'] = strtolower($data['securityAnswer3']);
	}
	
	//Security questions
	if (isset($data['securityQuestion1']) && isset($data['securityQuestion2']) && isset($data['securityQuestion3'])){
		
		$qs = getSecurityQuestions();
		
		//Make sure these questions exist
		if (!isset($qs[intval($data['securityQuestion1'])])){
			$errors["securityQuestion1"]["invalid"] = "The security question you specified doesn't exist. Please try again.";
		}
		if (!isset($qs[intval($data['securityQuestion2'])])){
			$errors["securityQuestion2"]["invalid"] = "The security question you specified doesn't exist. Please try again.";
		}
		if (!isset($qs[intval($data['securityQuestion3'])])){
			$errors["securityQuestion3"]["invalid"] = "The security question you specified doesn't exist. Please try again.";
		}           

		//Make sure the question are unique
		if ($data['securityQuestion1'] === $data['securityQuestion2']){
			$errors["securityQuestion2"]["duplicate"] = "Security questions 1 and 2 are the same, you need to choose a different question.";
		}
		if ($data['securityQuestion2'] === $data['securityQuestion3']){
			$errors["securityQuestion3"]["duplicate"] = "Security questions 2 and 3 are the same, you need to choose a different question.";
		}
		if ($data['securityQuestion1'] === $data['securityQuestion3']){
			$errors["securityQuestion3"]["duplicate"] = "Security questions 1 and 3 are the same, you need to choose a different question.";
		}
		
	}
	
	//addressName
	if (isset($data['addressName'])){
		if (!is_string($data['addressName']) || strlen($data['addressName'])>50 || preg_match("/[\x{0000}-\x{0008}\x{000B}-\x{000C}\x{000E}-\x{001F}\x{007E}-\x{00BE}]/u", $data['addressName']) === 1){
			$errors["addressName"]["invalid"] = "The address name you supplied was invalid.";
		}
	}
	
	//addressTo
	if (isset($data['addressTo'])){
		if (!is_string($data['addressTo']) || strlen($data['addressTo'])>120 || preg_match("/[\x{0000}-\x{0008}\x{000B}-\x{000C}\x{000E}-\x{001F}\x{007E}-\x{00BE}]/u", $data['addressTo']) === 1){
			$errors["addressTo"]["invalid"] = "The recipient you supplied was invalid.";
		}
	}
	
	//Street Address
	if (isset($data['streetAddress'])){
		if (!is_string($data['streetAddress']) || strlen($data['streetAddress'])<3 || strlen($data['streetAddress'])>254 || preg_match("/[\x{0000}-\x{0008}\x{000B}-\x{000C}\x{000E}-\x{001F}\x{007E}-\x{00BE}]/u", $data['streetAddress']) === 1){
			$errors["streetAddress"]["invalid"] = "The street address you supplied was invalid.";
		}
	}
	
	//Town
	if (isset($data['town'])){
		if (!is_string($data['town']) || strlen($data['town'])<2 || strlen($data['town'])>128 || preg_match("/[\x{0000}-\x{0008}\x{000B}-\x{000C}\x{000E}-\x{001F}\x{007E}-\x{00BE}]/u", $data['town']) === 1){
			$errors["town"]["invalid"] = "The town you supplied was invalid.";
		}
	}

	//County
	if (isset($data['county'])){
		if (!is_string($data['county']) || strlen($data['county'])<2 || strlen($data['county'])>128 || preg_match("/[\x{0000}-\x{0008}\x{000B}-\x{000C}\x{000E}-\x{001F}\x{007E}-\x{00BE}]/u", $data['county']) === 1){
			$errors["county"]["invalid"] = "The County you supplied was invalid.";
		}
	}
	
	//state
	if (isset($data['state'])){
		if (!is_string($data['state']) || strlen($data['state'])<2 || strlen($data['state'])>128 || preg_match("/[\x{0000}-\x{0008}\x{000B}-\x{000C}\x{000E}-\x{001F}\x{007E}-\x{00BE}]/u", $data['state']) === 1){
			$errors["state"]["invalid"] = "The State you supplied was invalid.";
		}
	}	
	
	//Country
	if (isset($data['country'])){
		if (!is_string($data['country']) || strlen($data['country'])<4 || strlen($data['country'])>128 || preg_match("/[^0-9a-zA-Z\,\' ]/", $data['country']) === 1  ){
			$errors["country"]["invalid"] = "The country name you supplied was invalid.";
		}
	}
	//Postcode
	if (isset($data['postcode'])){
		if (!is_string($data['postcode']) || strlen($data['postcode'])>15 || preg_match("/[^0-9a-zA-Z ]/", $data['postcode']) === 1 ){
			$errors["postcode"]["invalid"] = "The postcode you supplied was invalid.";
		}
	}
	
	//Recovery Code
	if (isset($data['code'])){
		if (!is_string($data['code']) || strlen($data['code'])!=64 || preg_match("/[^0-9a-zA-Z]/", $data['code']) === 1 ){
			$errors["code"]["invalid"] = "The code you supplied was invalid. It must be a string of a-Z 0-9 exactly 64 characters long. ";
		}
	}
	
	//Check recaptcha
	if (isset($data['recaptchaResponse'])){
		$params = [
			'secret'    => "6LfVFzYUAAAAAIHyxDy9ggYp-XA_BnrhyfK4FpoZ",
			'response'  => $data['recaptchaResponse']
		];
		
		$ch = curl_init( "https://www.google.com/recaptcha/api/siteverify" );
		curl_setopt( $ch, CURLOPT_POST, 1);
		curl_setopt( $ch, CURLOPT_POSTFIELDS, http_build_query($params));
		curl_setopt( $ch, CURLOPT_FOLLOWLOCATION, 1);
		curl_setopt( $ch, CURLOPT_HEADER, 0);
		curl_setopt( $ch, CURLOPT_RETURNTRANSFER, 1);
		
		$response = json_decode(curl_exec($ch), true);
		
		if (!is_array($response) || !isset($response['success']) || $response['success']!==true){
			$errors["recaptchaResponse"]["invalid"]  = "You failed reCAPTCHA verification. Please try again.";
		}
	}
	
	//Business name
	if (isset($data['businessName'])){
		if (!is_string($data['businessName']) || strlen($data['businessName'])<3){
			$errors["businessName"]["short"] = "The Business Name you supplied was too short.";
		}
		if (strlen($data['businessName'])>25){
			$errors["businessName"]["long"] = "The Business Name you supplied was too long.";
		}        
		if (preg_match("/[\x{0000}-\x{001F}#$%\*\+\x{003A}-\x{0040}\x{005B}-\x{0060}\x{007B}-\x{00BE}]/u", $data['businessName']) === 1){
			$errors["businessName"]["invaidContent"] = "The Business Name you supplied contains invalid symbols.";
		}
	}
	
	//Description
	if (isset($data['description'])){
		if (!is_string($data['description']) || strlen($data['description'])<5){
			$errors["description"]["short"] = "The description you supplied was too short. It should be at least 5 characters long.";
		}
		if (!is_string($data['description']) || strlen($data['description'])>500){
			$errors["description"]["short"] = "The description you supplied was too long. It should be at most 500 characters.";
		}
		if (preg_match("/[\x{0000}-\x{0008}\x{000B}-\x{000C}\x{000E}-\x{001F}\x{007E}-\x{00BE}]/u", $data['description']) === 1){
			$errors["description"]["invaidContent"] = "The description you supplied contains invalid symbols.";
		}
	}
	
	//Availability
	if (isset($data['availability'])){
		if (!in_array($data['availability'], ["available","temporarilyAvailable","unavailable","scheduled","always"])){
			$errors["availability"]["invalid"] = "The availability type you specified is invalid.";
		}
	}
	
	//Payment Method
	if (isset($data['paymentMethod'])){
		if (!in_array($data['paymentMethod'], ["card","newCard","cash"])){
			$errors["availability"]["invalid"] = "The payment method type you specified is invalid.";
		}
		if ($data['paymentMethod'] === "card"){
			$required[] = "cardID";
		}
		if ($data['paymentMethod'] === "newCard"){
			$required[] = "newCardToken";
		}
	}
	
	//Schedule
	if (isset($data['schedule']) ){
		
		if (!is_array($data['schedule'])){
			$errors["schdule"]["invalid"] = "Schedule must be an array.";
			
			} else {
			
			$invalid = false;
			$new = [];
			
			foreach (["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as $day){
				
				//Is day defined?
				if (!isset($data['schedule'][$day]) || !is_array($data['schedule'][$day])){
					$invalid = true;
					$errors["schdule"]["unset"] = "No schedule.$day has been defined (array).";
					continue;
				}
				
				//Check available state
				if (!isset($data['schedule'][$day]['available']) || !is_bool($data['schedule'][$day]['available'])){
					$invalid = true;
					$errors["schdule"]["unset"] = "You must specify schedule.".$day.".available (bool).";
					continue;
				}
				
				//Check times exists
				if (!isset($data['schedule'][$day]['times']) || !is_array($data['schedule'][$day]['times'])){
					$invalid = true;
					$errors["schdule"]["unset"] = "You must specify schedule.".$day.".times (array).";
					continue;
				}
				
				//Copy to new array
				$new[$day] = [
					"available" => $data['schedule'][$day]['available'],
					"times" => []
				];
				
				
				//Check times are set and right way round
				foreach($data['schedule'][$day]['times'] as $id=>$time){
					//Check type
					if (!is_array($time) || !isset($time['start']) || !is_string($time['start']) || !isset($time['finish']) || !is_string($time['finish']) ){
						$invalid = true;
						$errors["schdule"]["invalid"] = "You must specify schedule.".$day.".times[$id] = [start,finish]";
						continue;
					}
					
					//Check format
					if (preg_match("/^(2400|([01]\d|2[0-3])([0-5]\d))$/", $time['start']) !== 1){
						$invalid = true;
						$errors["schdule"]["invalid"] = "schedule.".$day.".times[$id].start is an invalid format. It should be: HHmm";
						continue;
					}
					if (preg_match("/^(2400|([01]\d|2[0-3])([0-5]\d))$/", $time['finish']) !== 1){
						$invalid = true;
						$errors["schdule"]["invalid"] = "schedule.".$day.".times[$id].finish is an invalid format. It should be: HHmm";
						continue;
					}
					
					//Check right way round
					if ($time['start']>=$time['finish']){
						$invalid = true;
						$errors["schdule"]["invalid"] = "schedule.".$day.".times[$id] starts after it finishes. Please correct the order.";
						continue;
					}
					
					$new[$day]['times'][] = $time;
				}
				
				//Check at least one is set
				if ($data['schedule'][$day]['available'] === true && sizeof($data['schedule'][$day]['times'])<1){
					$invalid = true;
					$errors["schdule"]["invalid"] = "schedule.".$day.".times must contain at least one array[start,finish]";
					continue;
				}
				
				//Sort the times
				usort($new[$day]['times'], function($a, $b) {
					return $a['start'] <=> $b['start'];
				});
				
				
				//Check the times don't overlap
				$oldTime = null;
				foreach($new[$day]['times'] as $id=>$time){
					
					if ($id>0 && $time['start'] < $oldTime['finish']){
						$invalid = true;
						$errors["schdule"]["invalid"] = "Error: Some of the times on $day overlap.";
						break; 
					}
					
					$oldTime = $time;
				}
				
				
			}
			
			//If invalid at all, don't supply a partial schedule
			if ($invalid === true){
				$data['schedule'] = null;
			} else {
				$data['schedule'] = $new;
			}
			unset($new);
		}
		
	}
	
	//overrideAction
	if (isset($data['overrideAction'])){
		if (!in_array($data['overrideAction'], ["open","close","resume"])){
			$errors["overrideAction"]["invalid"] = "The overrideAction type you specified is invalid.";
		}
	}
	
	//Date
	if (isset($data['date'])){
		//Validate yyyy-mm-dd
		if ( !is_string($data['date']) || strlen($data['date'])!==10 || $data['date'] !== date('Y-m-d', strtotime($data['date'])) ) {
			$errors["date"]["invalid"] = "The date you specified is an invalid format.";
		}
	}
	
	//Time
	if (isset($data['time'])){
		//Validate hh:mm
		if ( !is_string($data['time']) || strlen($data['time'])!==5 || $data['time'] !== date('H:i', strtotime($data['time'])) ) {
			$errors["time"]["invalid"] = "The time you specified is an invalid format.";
		}
	}
	
	
	
	/////////////////////
	//Basket
	
	if (isset($data['basket'])){
		
		if (!is_array($data['basket'])){
			$errors["basket"]["required"] = "No basket data was received.";
		}
		
		$chk = checkBasket($data['basket'], $authInfo);
		
		$data['basket'] = $chk['basket'];
		
		if (sizeof($chk['errors']) > 0 ){
			$errors['basket'] = $chk['errors'];
		}
		
	}
	
	
	
	
	
	
	//Classes (such as *ID, boolean)
	if (is_array($data)){
		foreach($data as $id => $val){
			
			//String/Tokens
			if (in_array($id, ["stripeCode", "newCardToken"])){
				if (!is_string($val) || strlen($val)>128){
					$errors[$id]["invalid"] = "'".$id."' is invalid. It must be of type: string(128).";
				}
			}
			
			//Boolean
			if (in_array($id, ["public","hidden","saveToAccount","vatRegistered","deliveryOffered","makeDefault"])){
				if (!is_bool($val)){
					$errors[$id]["invalid"] = "'".$id."' is invalid. It must be a boolean (true/false)";
				}
				$data[$id] = intval($val);
			}
			
			//Float (or int)
			if (in_array($id, ["x","y"])){
				if (!is_float($val) && !is_int($val)){
					$errors[$id]["invalid"] = "'".$id."' is invalid. It must be a floating point number.";
				}
				$data[$id] = floatval($val);
			}
			
			//Integers and IDs
			if (in_array($id, ["id", "userID", "businessID", "addressPID", "cardID"])){
				if (is_string($val) && ctype_digit($val)){
					$val = $data[$id] = intval($val);
				}
				if (!is_int($val) || $val < 0){
					$errors[$id]["invalid"] = "The ".$id." you supplied was invalid. It must be a positive integer.";
				}               
			}
			
			//Lists of integars
			if (in_array($id, ["businesIDs"])){
				
				if (!is_array($val)){
					$errors[$id]["type"] = "The ".$id." list you supplied was in an invalid data format.";
				} else if (sizeof($val)>0){
					foreach ($val as $__id => $__cat){
						if (is_string($__cat) && ctype_digit($__cat)){
							$__cat = $data[$id][$__id] = intval($__cat);
						}
						if (!is_int($__cat) || $__cat < 0){
							$errors[$id]["invalid"] = "The ".$id." list you supplied was invalid. They must all be positive integars.";
						}                
					}
				}  
				
			}
			
			
		}
	}    
	
	//Check required items
	if (isset($required) && is_array($required)){
		foreach($required as $item) {
			if (is_array($item)){
				$id = &$item["id"];
				$message = (isset($item['message']) ? $item["message"] : $id." is required, but was not supplied.");
				if (isset($item["value"]) && (!isset($data[$id]) || $data[$id] !== $item["value"])){
					$errors[$id]["required"] = $message;
					continue;
				}
			} else {
				$id = &$item;
				$message = $item." is required, but was not supplied.";
			}
			if (!isset($data[$id]) || ($data[$id]=="" && $data[$id]!==false && $data[$id]!==0)){
				$errors[$id]["required"] = $message;
			}
		}
	}

	return ["errors" => $errors, "data" => $data];
}


function getSecurityQuestions(){
	return [
		"What was your favorite tv show when you were 10?",
		"What was your favorite place to go as a child?",
		"If you could have anything in the world, what would it be?",
		"Who is your favorite musician or actor?",
		"What was the name of your first pet?",
		"What was the make of your first car?",
		"What street did your parents live on when you were born?",
		"What is your favorite color?",
		"What was the name of your first school teacher?",
		"What is your favorite website to visit when you are bored?",
		"Where did you first go on holiday?",
		"What is the name of the person you most admire?",
		"What is the full name of your first boyfriend or girlfriend?",
		"What was your favourite subject at school?",
		"Which brand of clothing is your favourite?",
		"What is your dream job?"
	];
}


function checkIsOpen($biz){

	//Is the business manually closed?
	if ($biz['closedUntil'] !== null && strtotime($biz['closedUntil'])>time()){
		return false;
	}
	
	//Is the business manually open?
	if ($biz['openUntil'] !== null && strtotime($biz['openUntil'])>time()){
		return true;
	}
	
	//Check if scheduled to be open
	return isScheduledAvailable($biz);
}

function isScheduledAvailable($biz){
	
	//Check there is a schedule
	if (!isset($biz['schedule'])){
		return false;
	}
	
	//Decode schedule data
	$biz['schedule'] = json_decode($biz['schedule'], true);
	
	//Check schedule is valid
	if (!is_array($biz['schedule'])){
		return false;
	}
	
	$dt = new DateTime();
	$dt->setTimezone(new DateTimeZone('Europe/London'));
	$d = strtolower($dt->format("l"));
	$t = $dt->format('Hi');
	
	//Check this day is available
	if (   !isset($biz['schedule'][$d]) 
		|| !is_array($biz['schedule'][$d]) 
		|| !isset($biz['schedule'][$d]['available']) 
		|| $biz['schedule'][$d]["available"] !== true
		|| !isset($biz['schedule'][$d]['times'])
		|| !is_array($biz['schedule'][$d]['times'])         
	){
		return false;   
	}
	
	//Check times to see if one is in range
	foreach ($biz['schedule'][$d]['times'] as $time){
		if ($time['start'] <= $t && $time['finish'] >= $t){
			return true;
		}
	}
	
	return false;
	
}

function checkArrayOfINTs($array){
	if (!is_array($array)){
		return false;
	}
	
	foreach ($array as $test){
		if (!is_int($test)){
			return false;
		}
	}
	
	return true;
}