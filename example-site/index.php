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
		<div>
			<div class="menuIcon">&#9776;</div>

			<h1>
				<a id="title" href="/">
					<?php print $CONFIG['platformName']; ?>
				</a>
			</h1>

			<div id="menuMask">
				<span class="close">&#10005;</span>
			</div>
			<div id="menu">
				<nav>
					<a href="/about">About</a>
					<a href="/broken-link">Broken Link</a>
				</nav>
				<nav id="userMenu-out" class="right">
					<a href="javascript:void(0)" onclick="app.login()">Log In</a>
					<a href="/register">Register</a>
				</nav>
				<nav id="userMenu-in" class="right display-none">
					<a href="/accounts/:id" id="accountsLink">Account</a>
					<a href="javascript:void(0)" onclick="app.logout()">Log Out</a>
				</nav>
			</div>
		</div>
	</header>

	<div id="page">

		<div id="content">
			<?php

			//Include currentView's html
			print '<div class="view-'.$currentView["id"].'">';
				if (isset($currentView['html'])){
					print $currentView['html'];
				} else {
					require($root."/views/".$currentView['context']."/".$currentView["id"].".php");
				}
			print '</div>';
			?>
		</div>
	</div>

	<footer>
		<p>
			<a href="/privacy">Privacy Policy</a>
		</p>
		<p>
			<a href="javascript:app.showCookieOptions();">Cookie Settings</a>
		</p>
	</footer>

	<div id="mask" class="display-none"></div>

	<div id="gdprConsent" class="display-none modal">
		<h2>Cookies &amp; Personal Data</h2>
		<p>
			We need your consent to collect any personal information that you share with us, and to store cookies on your device:
		</p>

		<div>
			<a href="javascript:undefined;" class="more">&#9660; Essential Cookies</a>
			<ul>
				<li>We create a random number, assign it to this device, and use it to secure your connection</li>
				<li>If you log in, we store a token which is used to authenticate your communication with our server</li>
				<li>We store the name of your operating system (for example: Windows Computer)</li>
				<li>We store your site preferences, such as automatic login etc.</li>
			</ul>
		</div>
		<div>
			<a href="javascript:undefined;" class="more">&#9660; Other Cookies</a>
			<ul>
				<li>
					A third party called Google Analytics stores a number of cookies to help gather statistics about your visit or future visits. The information gathered is anonymised and presented in an aggregate format to us via their website.
				</li>
			</ul>

		</div>
		<p class="small">
			You can read more about cookies, the information we collect, and how long we store your data in our <a href="/privacy">Privacy Policy</a>.
		</p>

		<input type="button" class="all" value="I Consent">

		<a href="javascript:undefined;" class="other-options more">Other Options ...</a>

		<div class="other-buttons">
			<p>
				If you wish, you can choose which cookies are stored on your device. However we still require your consent to collect the information you share with us.
			</p>
			<p>
				<input type="button" class="essential" value="I Consent, Essential Cookies Only">
				<input type="button" class="none" value="I Consent, No Cookies">
			</p>
		</div>

	</div>

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