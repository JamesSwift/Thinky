<?php

namespace JamesSwift\SWDF;

function emailSettings($update=null){
	
    static $settings = [
      "defaultFrom"=>"",
      "maxEmailsPerHour"=>1000,
      "maxUnimportantEmailsPerHour" => 800,
      "PDO"=>null,
    ];
    
    if (is_array($update)){
        $settings = array_merge($settings, $update);
    }
    
    return $settings;
}

function email ($to, $subject, $message, $from=null, $send_now=false, $send_after=null, $ref=null, $headers=null ){
	
	$settings = emailSettings();
	
	if (!is_a($settings['PDO'], "PDO")){
	    throw new \Exception("No PDO connection has been established.");
	}
	
	//Allow blank from addresses by replacing them with the website default no-reply
	if ($from===null || $from===""){
		$from=$settings['defaultFrom'];
	}
	
	//Add to email queue
    $statement = $settings['PDO']->prepare("INSERT INTO emailQueue SET `to` = :to, `subject` = :subject, `message` = :message, `headers` = :headers, `from` = :from, `sendAfter` = :sendAfter, `sendNow` = :sendNow, `ref` = :ref");
    $statement->execute([
		"to"=>\encrypt($to),
		"subject"=>\encrypt($subject),
		"message"=>\encrypt($message),
		"headers"=>\encrypt($headers),
		"from"=>\encrypt($from),
		"sendAfter"=>$send_after,
		"sendNow"=>(int)$send_now,
		"ref"=>$ref
	]);
    
    $id = $settings['PDO']->lastInsertId();
    
    try {
        //Manually trigger processEmailQueue in case message can be sent straight away
        processEmailQueue();
    } catch (\Exception $e){
        //Ignore it
    }

    return $id;

}

function processEmailQueue(){
    
	$settings = emailSettings();
	
	if (!is_a($settings['PDO'], "PDO")){
	    throw new \Exception("No PDO connection has been established.");
	}

	$return=[];
	$total_sent=0;

	//Gather statistics
	try {
	    
        $q = $settings['PDO']->prepare("SELECT COUNT(*) FROM emailQueue WHERE sent>DATE_SUB(NOW(), INTERVAL 1 HOUR) AND sendNow=0");
        $q->execute();
        $total_normal_sent_last_hour =  reset($q->fetch());
        
        $q = $settings['PDO']->prepare("SELECT COUNT(*) FROM emailQueue WHERE sent>DATE_SUB(NOW(), INTERVAL 1 HOUR) AND sendNow=1");
        $q->execute();
        $total_important_sent_last_hour = reset($q->fetch());
        
    	$total_sent_last_hour=$total_normal_sent_last_hour+$total_important_sent_last_hour;
    	
	} catch (\Exception $e){
	    $return['error']['dbError'] = $e;
	    return $return;
	}
	
	//Check we haven't already reached our hourly limit
	if ($total_sent_last_hour>=$settings['maxEmailsPerHour']){
	    
		$return['error']['maxLimitReached']=true;
		
	} else {
	
		//Get list of emails to send
		$q = $settings['PDO']->prepare("SELECT * FROM emailQueue WHERE sent IS null AND (sendAfter < NOW() || sendAfter is null) ORDER BY sendNow DESC, sendAfter ASC, id ASC LIMIT :limit");
        $q->execute(["limit"=>$settings['maxEmailsPerHour']]);
		$emails_to_send = $q->fetchAll();

		if (is_array($emails_to_send) && sizeof($emails_to_send)>0){
			foreach($emails_to_send as $email){
			
				foreach(["to", "subject", "message", "headers", "from"] as $field){
					
					$email[$field] = \decrypt($email[$field]);
				}
				
				//Check we're still under our hourly limit
				if ( ($total_sent_last_hour+$total_sent) >= $settings['maxEmailsPerHour']){
				    break;   
				}
					
				//If this is an unimportant email, check we're under our "unimportant" limit
				if ( ($total_sent_last_hour+$total_sent) > $settings['maxUnimportantEmailsPerHour'] && $email['sendNow']!==1 ){
				    continue;
				}
				
				//If no from address specified, use site default
				if ($email['from']===""){
					$email['from']=$settings['defaultFrom'];
				}

				//Build message headers
				$headers =	"X-Mailer: PHP/" . phpversion()."\r\n".
							"From: ".$email['from']."\r\n".
							"Reply-To: ".$email['from']."\r\n";
							
				if ($email['headers']!==""){
					$headers.= $email['headers'];
				}

				//Send the email
				try {
    				if (mail($email['to'], $email['subject'], $email['message'], $headers )===true){
    				    
    					$return['success']['ids'][]=$email['id'];
    					
    					//Record the sent time in the DB
    					$q = $settings['PDO']->prepare("UPDATE emailQueue SET sent = NOW() WHERE id = :id");
    					$q->execute(["id"=>$email['id']]);
    				} else {
    					$return['error']['ids'][]=$email['id'];
    				}
				} catch (\Exception $e){
				    $return['error']['ids'][]=$email['id'];
				}
				
				$total_sent++;
				
			}
		} else {
			$return['success']=true;
		}
	}
	
	return $return;
}