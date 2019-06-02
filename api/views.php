<?php

use \JamesSwift\SWDAPI\Response;


function fetchAllViewHTML($data, $authInfo){
    
    global $root;
    require_once($root."/models/thinky.php");
    
    //Enclose ob in function closure to avoid contaimnation of variables
    function getContent($__FILE__){
        global $root;
        ob_start();
        if (is_file($__FILE__)){
            require($__FILE__);
        }
        return ob_get_clean();  
    }
    
    
    //Check which context to load
    if (!isset($data['appID']) || !is_string($data['appID']) || !is_dir($root."/views/".$data['appID'])){
        return new Response( 404, ["AppError"=>[
            "code"      => 404000,
            "message"   => "No appID was supplied, or it was invalid."
        ]]);
    }
    
    function getHTML($context){
        global $root;
        $return = [];
        $views = findFiles($root."/views/".$context, "json");
        
        foreach($views as $id=>$view){
            $json = json_decode(file_get_contents($view),true);
            $return[$json['id']]=["id"=>$json['id'], "html"=>getContent(substr($view, 0, -4)."php"), "title"=>$json['title']];
        }
        return $return;
    }
    
    $return = getHTML("shared") + getHTML($data['appID']);
    
    
    //Return the buffer
    return new Response(
        200, 
        $return
    );
    
}