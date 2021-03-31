<?php
$root = dirname(__DIR__, 3);
$context = basename(dirname(__DIR__, 2));

require($root."/models/thinky.php");

header('Content-Type: application/javascript');
header("Cache-Control: max-age=3600");

$lastMtime = 0;

$lastMtime = generateViewJS("shared", $lastMtime);
$lastMtimeContext = generateViewJS($context, $lastMtime);

if ($lastMtimeContext > $lastMtime){
    $lastMtime = $lastMtimeContext;
}

if ($lastMtime > 0 ){
    file_put_contents("./.last-modified", $lastMtime);
}