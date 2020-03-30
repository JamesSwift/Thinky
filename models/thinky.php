<?php
function findFiles($path, $type="json"){
    $found = [];
    $files = scandir($path);
    
    foreach($files as $file){
        if ($file==="." || $file==="..") continue;
        if (is_dir($path."/".$file)){
            $found = array_merge($found, findFiles($path."/".$file, $type));
        } else if (substr(strtolower($file), -(strlen($type)) ) === $type){
            $found[substr($file, 0, -(strlen($type)-1)) ] = $path."/".$file;
        }
    }
    
    return $found;
}

function listViews($context){
    global $root;

    $JSONs = array_merge(findFiles($root."/views/".$context), findFiles($root."/views/shared"));
    $views = [];

    foreach($JSONs as $file){
        $json = json_decode(file_get_contents($file), true);
        if (is_array($json)){
            $views[$json['id']] = $json;
            $views[$json['id']]['src'] = [
                "html" => substr($file, 0, -4)."php",
                "js" => substr($file, 0, -4)."js",
                "css" => substr($file, 0, -4)."css"
            ];
            
        }
    }

    return $views;
}

function generateViewJS($context, $lastMtime=0){
    
	global $root;
	
    $files = findFiles($root."/views/".$context);
  
    foreach($files as $view){
        $sub = substr($view, 0, -5);        
        
        if ($json = json_decode(file_get_contents($view), true)){
            
            print 'u.waitForObjects(["controller"], function(){controller.registerView(';
            print json_encode($json);
            print ", function(){\n";
            if (is_file($sub.".js") ){
                readfile($sub.".js");
            } else {
                print "this.render();\n";
            }
            print "\n});});\n\n";

            $mtime = filemtime($sub.".js");
            if ($mtime > $lastMtime){
                $lastMtime = $mtime;
            }
        }
	}
	
	return $lastMtime;
}

function generateViewCSS($context, $lastMtime=0){
    
	global $root;
	
    $files = findFiles($root."/views/".$context, "css");
  
    foreach($files as $view){     
    
        print "/* ---- ".$view." ---- */\n";
        readfile($view);
        print "\n\n";
            

        $mtime = filemtime($view);
        if ($mtime > $lastMtime){
            $lastMtime = $mtime;
        }
        
	}
	
	return $lastMtime;
}

function printViewJS($file){
    $json = json_decode(file_get_contents(substr($file,0 ,-2)."json"), true);

    print "<script>";
    print 'u.waitForObjects(["controller"], function(){controller.registerView(';
    print json_encode($json);
    print ", function(){\n";
    if (file_exists($file)){
        readfile($file);
    } else {
        print "this.render();\n";
    }
    print "\n});});\n\n";
    print "</script>";
}