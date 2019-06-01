<?php

//Find the root
$root = dirname(__DIR__, 2);
$context = basename(dirname(__DIR__, 1));

require $root."/controllers/api.php";

//Respond to a request made over http
$request = $API->listen();
$request->sendHttpResponse();

