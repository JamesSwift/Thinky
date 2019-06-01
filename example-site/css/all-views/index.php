<?php
$root = dirname(__DIR__, 3);
$context = basename(dirname(__DIR__, 2));

header('Content-Type: text/css');
header("Cache-Control: max-age=3600");

$lastMtime = 0;

function addFiles($context){
    
    global $root, $lastMtime;

    $views = json_decode(file_get_contents($root."/config/views-".$context.".json"), true);
    
    foreach($views as $id=>$view){
        if (is_file($root."/views/".$context."/".$id.".css")){
            
    		readfile($root."/views/".$context."/".$id.".css");
            
            $mtime = filemtime($root."/views/".$context."/".$id.".css");
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
