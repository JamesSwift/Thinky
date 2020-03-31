<?php
require_once($root."/models/thinky.php");

function testViewPattern($url, $pattern){

		//Remove leading slashes
		if (substr($url, 0, 1) === "/"){
			$url = substr($url, 1);
		}
		if (substr($pattern, 0, 1) === "/"){
			$pattern = substr($pattern, 1);
		}

		//Remove trailing slashes
		if ($url !== "" && substr($url, -1) === "/"){
			$url = substr($url, 0, -1);
		}

		if ($url===false){
		    $url="";
		}
		if ($pattern===false){
		    $pattern="";
		}

		if ($url=="" && $pattern==""){
		    return [];
		}


		$url_parts = explode("/", $url);
		$pattern_parts = explode("/", $pattern);
		$variables = [];

		//Match		/users/jamie/profile
		//----------------------------------
		//Against	/users/:id/*
		//Against	/users/:id/ (fails)

		//Cycle throuh the url parts and test against the pattern
		$len=sizeof($url_parts);
		$i=0;

		for($i=0; $i<$len; $i++){

			//We've ran out of pattern to test
			if (!isset($pattern_parts[$i])){
				//Did the patten end in *?, then it matches
				if ($i>0 && $pattern_parts[$i-1]==="*"){
					return $variables;
				}
				//If it didn't then this obviously isn't the right view
				return false;

			//Does the pattern match all here?
			} else if ($pattern_parts[$i]==="*"){
				continue;

			//Does the pattern match a varible here?
			} else if (substr($pattern_parts[$i], 0, 1)===":"){
				$variables[substr($pattern_parts[$i], 1)]=rawurldecode($url_parts[$i]);
				continue;

			//Was the pattern an exact match (but not * or :*)
			} else if ($url_parts[$i]===$pattern_parts[$i] && $url_parts[$i]!==""){
				continue;
			}

			//No? Then stop checking, this is the wrong view
			return false;
		}


		//Is there anything left of the pattern to match, this might still be the wrong view
		if (isset($pattern_parts[$i])
			&& $pattern_parts[$i] !== ""
		){
			return false;
		}

		//If we got here, then it matches, send the variables back
		return $variables;
	}



function matchView($url, $context){

    global $root;

	$views = listViews($context);

	//Attempt to match the view
	foreach($views as $id=>$view){
		if (($variables = testViewPattern($url, $view['match'])) !== false){
			$view['variables'] = $variables;
			return $view;
		}
	}
	
	//Match against home
	if (($url==="" || $url==="/") && isset($views['home'])){
		return $views['home'];
	}

	//If no match, return 404
    if (isset($views['home'])){
		return $views['404'];
	}

	return false;
}

function checkCache($url, $view){

	global $root;

	if ($view['context']!=="www"){
		return $view;
	}

	$views = json_decode(file_get_contents($root."/cache/cachedViews.json"), true);

	$hash = hash("sha256", $url);

	if (isset($views[$hash]) && isset($views[$hash]['file']) && is_file($root."/".$views[$hash]['file']) && filemtime($root."/".$views[$hash]['file']) > filemtime($root."/views/".$view['context']."/".$view["id"].".php") ){

		$cached = json_decode(file_get_contents($root."/".$views[$hash]['file']), true);
		if (is_array($cached) && isset($cached['title']) && isset($cached['html'])){
			$view['title'] = $cached['title'];
			$view['html'] = $cached['html'];
		}
	} else if ($view['cache']===true){
		$views[$hash]=["url"=>$url];
		file_put_contents($root."/cache/cachedViews.json", json_encode($views));
	}

	return $view;
}

function getTitle($view){
	global $CONFIG;
	return $view['title'].(isset($CONFIG['appendTitle']) ? $CONFIG['appendTitle'] : "");
}


function linkResources($type, $files){

	global $root, $context;

	$server = $_SERVER['SERVER_NAME']; 

	if ($type!=="css" && $type!="js"){
		throw new \Exception("Invalid resource type");
	}

	if (!is_array($files) && is_string($files)){
		$files=[$files];
	} else if (!is_array($files)){
		throw new \Exception("Invalid file/file-list.");
	}

	foreach ($files as $file){
		$mtime='';
		if (is_file($root."/".$context."/".$file)){
			$mtime = '?'.filemtime($root."/".$context."/".$file);
		} else if (in_array($file, ["js/all-views/", "css/all-views/"]) && is_file($root."/".$context."/".$file.'.last-modified')){
			$time = file_get_contents($root."/".$context."/".$file.'.last-modified');
			if (ctype_digit($time)){
				$mtime = '?'.$time;
			}
		}
		if ($type==="css"){
			print '<link rel="stylesheet" href="'.htmlspecialchars('https://'.$server.'/'.$file.$mtime).'">'."\n";
		} else if ($type==="js"){
			print '<script src="'.htmlspecialchars('https://'.$server.'/'.$file.$mtime).'" async></script>'."\n";
		}
	}

}

function embedResources($type, $files){

	global $root;

	if ($type!=="css" && $type!="js"){
		throw new \Exception("Invalid resource type");
	}

	if (!is_array($files) && is_string($files)){
		$files=[$files];
	} else if (!is_array($files)){
		throw new \Exception("Invalid file/file-list.");
	}

	foreach ($files as $file){
		$mtime='';
		if (!is_file($file)){
			die("Error loading: " . $file);
			continue;
		}
		if ($type==="css"){
			print '<style>';
			readfile($file);
			//print str_replace(["\n", "\t"],"", file_get_contents($root."/".$file));
			print "</style>\n";
		} else {
			print '<script>';
			readfile($file);
			//print preg_replace('/(?:(?:\/\*(?:[^*]|(?:\*+[^*\/]))*\*+\/)|(?:(?<!\:|\\\|\')\/\/.*))/', '', file_get_contents($root."/".$file));
			print "</script>\n";
		}
	}

}

function getAppPayload(){
	global $CONFIG, $context;

	$payload = $CONFIG;
	$payload['appID'] = $context;
}

//Set global $CONFIG variable
$CONFIG = json_decode(file_get_contents($root."/config/general.json"), true);


$requestedView = explode('?', $_SERVER["REQUEST_URI"]);

$currentView = matchView( $requestedView[0], $context);

if ($currentView['id']==="404"){
	http_response_code(404);
}
