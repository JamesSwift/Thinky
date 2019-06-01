#!/usr/bin/php
<?php

error_reporting(E_ERROR);

$root = getcwd();
require($root."/config/api.php"); 


//////////////////////////////////////////////////////////////////////////

//Run the email queue
$run = \JamesSwift\SWDF\processEmailQueue();

//Check for errors
if (!is_array($run) || isset($run['error'])){
    var_dump($run);
}


//////////////////////////////////////////////////////////////////////////




//////////////////////////////////////////////////////////////////////////



//TODO check for unverified accounts and lock logins

//TODO delete old authCodes from DB as contain email address history

//TODO clear out old addresses from DB after 2 months

//TODO enforce privacy policy