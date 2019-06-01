<?php
use \JamesSwift\SWDAPI\Response;

function fetchAllViewHTML($data, $authInfo){
    
    global $root;
    
    //Enclose ob in function closure to avoid contaimnation of variables
    function getContent($__id__id__, $__context__){
        global $root;
        ob_start();
        if (is_file($root."/views/".$__context__."/".$__id__id__.".php")){
            require($root."/views/".$__context__."/".$__id__id__.".php");
        }
        return ob_get_clean();  
    }
    
    
    //Check which context to load
    if (!isset($data['appID']) || !is_string($data['appID']) || !file_exists($root."/config/views-".$data['appID'].".json")){
        return new Response( 404, ["AppError"=>[
            "code"      => 404000,
            "message"   => "No appID was supplied, or it was invalid."
        ]]);
    }
    
    function getHTML($context){
        global $root;
        $return = [];
        $views = json_decode(file_get_contents($root."/config/views-".$context.".json"), true);
        foreach($views as $id=>$view){
            $return[$id]=["id"=>$id, "html"=>getContent($id, $context), "title"=>$view['title']];
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