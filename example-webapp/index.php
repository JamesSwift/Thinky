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

			//CSS
			embedResources("css", [
				"models/thinky.css",
				$context."/css/".$context.".css"
			]);

			if (is_file($root."/views/".$currentView['context']."/".$currentView["id"].".css")){
				embedResources("css", [
					"views/".$context."/".$currentView["id"].".css"
				]);
			}
	?>

</head>
<body>
	<header>
		<a class="logo" href="/">
			<img src="/images/logo-plain.png" class="logoBig" alt="Example Web App" />
			<img src="/images/logo-icon.png" class="logoSmall" alt="Example Web App" />
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

			//Include currentView's html here
			print '<div class="view-'.$currentView["id"].'">';
				require($root."/views/".$currentView['context']."/".$currentView["id"].".php");
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
			"models/utils.js",
			".submodules/SWDAPI/swdapi-client.min.js",
			".submodules/SWDAPI/submodules/jsSHA/src/sha256.js",
			"models/inputValidator.js",
			"controllers/client-side.js",
			$context."/js/".$context.".js",
			"views/".$currentView['context']."/".$currentView["id"].".js"
	 ]);

		linkResources("js", [
			"js/all-views/"
		]);
	?>
</body>
</html>