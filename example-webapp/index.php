<?php
	$context = basename(__DIR__);
	$root = dirname(__DIR__, 1);

	require($root."/controllers/web-server.php");

?>

<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
	<?php

		print "<title>".htmlspecialchars(getTitle($currentView))."</title>";

		print "<script>var firstView = ".json_encode($currentView)."</script>";

		print "<script>var appPayload = ".json_encode(getAppPayload()).";</script>";

		//CSS
		embedResources("css", [
			$root."/models/thinky.css",
			$root."/".$context."/css/".$context.".css"
		]);

		if (is_file($currentView["src"]['css'])){
			embedResources("css", [
				$currentView["src"]['css']
			]);
		}

	?>

</head>
<body>
	<header>
		<a class="logo" href="/">
			<img src="/images/logo-plain.png" class="logoBig" alt="Platform Logo" />
			<img src="/images/logo-icon.png" class="logoSmall" alt="Platform Logo Small" />
		</a>

		<div class="menu">
			<a href="javascript:;" class="statusButton"><span>&nbsp;</span></a>
			<a href="javascript:;" class="lockButton locked">🔒&#xFE0E;</a>
			<a href="javascript:;" class="menuButton">☰</a>
		</div>
	</header>

	<div id="page">
		<div id="content">
			<?php

			//Include currentView's html
			print '<div class="view-'.$currentView["id"].(isset($currentView['requireAuthorizedUser']) && $currentView['requireAuthorizedUser']===true ? " display-none" : "").'">';
				if (isset($currentView['html'])){
					print $currentView['html'];
				} else {
					require($currentView['src']['html']);
				}
			print '</div>';
			?>
		</div>
	</div>


	<div id="mask" class="display-none"></div>
	<div id="modals"></div>
	<div id="loading" class="display-none"><div class="loader"></div></div>

	<?php

		//JavaScript
		embedResources("js", [
			$root."/models/utils.js",
			$root."/.submodules/SWDAPI/swdapi-client.min.js",
			$root."/.submodules/SWDAPI/submodules/jsSHA/src/sha256.js",
			$root."/models/inputValidator.js",
			$root."/controllers/client-side.js",
			$root."/".$context."/js/".$context.".js"
		]);

		printViewJS($currentView['src']['js']);
			
		linkResources("js", [
			"js/all-views/"
		]);
	?>
</body>
</html>