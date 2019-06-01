<?php

//Set global $CONFIG variable
$CONFIG = json_decode(file_get_contents($root."/config/general.json"), true);

//Include files that are always needed
require $root."/.submodules/SWDAPI/swdapi-server.php";
require_once $root."/models/encryption.php";
require_once $root."/models/permissions.php";
require_once $root."/models/validation.php";

//Instantiate the API and load the configuration
$API = new \JamesSwift\SWDAPI\Server(
    ["settings"=>[
        "methodSrcRoot" => $root."/api/",
        "tokens"=>[
            "defaultExpiry" => 62208000,
            "maxExpiry" => 62208000,
            "defaultTimeout" => 5184000,
            "maxTimeout" => 15552000,
        ]
    ]]
);


//Load the DB settings
$API->loadConfig($root."/config/db.json");

//Load the methods
$API->loadConfig($root."/config/api.json");

//Connect the DB
$API->connectDB();

//Login manager
$API->registerCredentialVerifier("credentialVerifier");

//Setup the email handler
require $root."/models/email.php";
\JamesSwift\SWDF\emailSettings(["PDO"=>$API->DB, "defaultFrom"=>$CONFIG['platformEmail']]);
