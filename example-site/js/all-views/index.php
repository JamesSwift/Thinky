<?php
$root = dirname(__DIR__, 3);
$context = basename(dirname(__DIR__, 2));

header('Content-Type: application/javascript');
header("Cache-Control: max-age=3600");

$lastMtime = 0;

function addFiles($context){
    
    global $root, $minifier, $lastMtime;

    $views = json_decode(file_get_contents($root."/config/views-".$context.".json"), true);
    
    foreach($views as $id=>$view){
        if (is_file($root."/views/".$context."/".$id.".js")){
            
    		readfile($root."/views/".$context."/".$id.".js");
            
            $mtime = filemtime($root."/views/".$context."/".$id.".js");
            if ($mtime > $lastMtime){
                $lastMtime = $mtime;
            }
        }
    }
}

addFiles("shared");
addFiles($context);


if ($lastMtime > 0 ){
    file_put_contents("./.last-modified", $lastMtime);
}