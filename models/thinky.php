<?php
function findJSON($path){
    $found = [];
    $files = scandir($path);
    foreach($files as $file){
        if ($file==="." || $file==="..") continue;
        if (is_dir($path."/".$file)){
            $found = array_merge($found, findJSON($path."/".$file));
        } else if (substr(strtolower($file), -4) === "json"){
            $found[] = $path."/".$file;
        }
    }
    return $found;
}

function generateViewJS($context, $lastMtime=0){
    
	global $root;
	
    $files = findJSON($root."/views/".$context);
  
    foreach($files as $view){
        $sub = substr($view, 0, -5);        
        
        if (is_file($sub.".js") && $json = json_decode(file_get_contents($view), true)){
            
            print 'u.waitForObjects(["controller"], function(){controller.registerView(';
            print json_encode($json);
            print ", function(){\n";
    		readfile($sub.".js");
            print "\n});});\n\n";

            $mtime = filemtime($sub.".js");
            if ($mtime > $lastMtime){
                $lastMtime = $mtime;
            }
        }
	}
	
	return $lastMtime;
}

function wrapViewJS(){

}