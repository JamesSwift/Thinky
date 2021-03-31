/* global localStorage,u,swdapi */

"use strict";

var Controller = (new function(w, d){
	
	var pub = {
			dataValidator: null
		},
		priv = {
			config: {
				appID: null,
				platformName: null,
			},
			storageAvailable: undefined,
			currentView: null,
			userToken: undefined,
			users: {},
			activeTokenUID: null,
			activeTokenLastUsed: null,
			activeTokenExpires: null,
			views: {
				"404": {
					controller: function(){
						this.render();
					},
					path: "/404"
				},
				"403": {
					controller: function(){
						this.render();
					},
					path: "/403"
				}
			},
			modals: [],
			htmlData: {},
			dataStore: {}
		};

	function constructor(options){
		
		if (!("appID" in options) || typeof options.appID !== "string"){
			throw "Controller must be configured with an appID :string";
		}
		
		if (!("apiEndpoint" in options) || typeof options.apiEndpoint !== "string"){
			throw "Controller must be configured with an apiEndpoint :string";
		}
		
		if (!("dataValidator" in options) || typeof options.dataValidator !== "function"){
			throw "Controller must be configured with an dataValidator :function";
		}
		
		priv.config = options;
		
		pub.dataValidator = options.dataValidator;
		
		//Load defered javascript
		if (!("autoLoadCSS" in options) || options.autoLoadCSS !== false){
			var cb = function() {
				var l = d.createElement('link');
				l.rel = 'stylesheet';
				l.href = (function(){
					var host = window.location.hostname;
					return "https://"+host+"/css/all-views/";
				}());
				var h = d.getElementsByTagName('head')[0];
				h.parentNode.insertBefore(l, h);
			};
			
			var raf = w.requestAnimationFrame;
			if (raf){
				raf(cb);
			} else {
				w.addEventListener('load', cb);
			}
		}
		
		
		//Check available storage types
		function testStorage(type) {
			try {
				var storage = w[type], x = '__storage_test__';
				storage.setItem(x, x);
				storage.removeItem(x);
				return true;
			} catch (e) { return false; }
			
		}
		priv.localStorageAvailable = testStorage("localStorage");
		priv.sessionStorageAvailable = testStorage("sessionStorage");
		
		
		//If browser supports history state manipulation then
		//massively speed up the site and prevent full page reloads
		if (typeof w.onpopstate !== "undefined" && typeof w.history.pushState === "function" ){
			
			
			//Listen for back/forward navigation
			w.onpopstate = function(e){
				
				//Capture back button to close the menu
				if (document.querySelector("header #menu") && document.querySelector("header #menu").classList.contains("slideIn")){
					w.history.scrollRestoration = 'manual';
					document.querySelector("header #menuMask").classList.remove("slideIn");
					document.querySelector("header #menu").classList.remove("slideIn");
					w.history.pushState(null, "", priv.currentView.url);
					return true;
				}
				
				//Capture the back button to close modals
				if (priv.modals.length>0){
					w.history.scrollRestoration = 'manual';
					pub.closeTopModal();
					w.history.pushState(null, "", priv.currentView.url);
					e.preventDefault();
					return false;
				}
			
				//Capture the back button to navigate history
				if (!switchView(w.location.pathname)){
					//If the view doesn't want to be closed, just recreate the state
					w.history.pushState(null, "", priv.currentView.url);
					return true;
				}
			};
			
			//Rewrite all clicks to use JS view router
			d.body.onclick = function(e){
				e = e || event;
				
				//Was this triggeed by an anchor tag?
				var link = findParent('a', e.target || e.srcElement);
				if (link && link.href.substr(0,4)!=="java"){
					//Is it a link to an internal view
					var view = findView(link.pathname);
					if ((w.location.hostname === link.hostname || link.hostname === "") && view.id !=="404"){
						e.preventDefault();
						switchView(link.pathname, true);
					}
				}
			};
			
		
		}
		
		//Prevent leaving page if view is unhappy
		w.onbeforeunload = function(e){
			if (pub.closeAllModals()===false){
				return  e.returnValue = "If you leave this page, you will lose any unsaved changes.";
			}			
			if (priv.currentView !== null && "beforeClose" in priv.currentView && typeof priv.currentView.beforeClose === "function"){
				var happy = priv.currentView.beforeClose();
				if (happy === false || typeof happy === "object"){
					return e.returnValue = (happy.nessage || "If you leave this page, you will lose any unsaved changes.");
				}
			}
		}
		
		//Load current view (if known)
		if (w.firstView !== undefined && w.firstView !== null){
			u.loading.push("firstView loading first view");
			u.waitForObjects([[priv, "views", w.firstView.id]], function(){
				
				priv.currentView = getViewObject(w.firstView.id, w.location.pathname, w.firstView.variables);
				priv.currentView.container = document.querySelector("#content .view-" + w.firstView.id);
				
				//Is this view restricted to logged in users?
				//If a token is stored, wait for it to init then attempt to load view
				if (priv.currentView.config 
					&& "requireAuthorizedUser" in priv.currentView.config
					&& priv.currentView.config.requireAuthorizedUser === true
					&& priv.userToken===undefined //|| priv.userToken===null)	
					&& !!pub.getStoredValue("userToken")
				){
						
					var intvl = setInterval(function(){
						
						if (priv.userToken===undefined) return;
					
						priv.currentView.load(function(){
							u.loading.pop("firstView finished (waited for userToken)");
						});
						clearInterval(intvl);
						
					}, 20);
					
				//Load the view, it will work out whether to render or errorSwitchView
				} else {
					priv.currentView.load(function(){
						u.loading.pop("firstView finished");
					});
				}
			});
		} else {
			switchView(w.location.pathname, false);
		}
	
		u.waitForObjects(["swdapi.client"], function(){
			
			//Setup SWDAPI
			pub.api = swdapi.client(
				
				//Set url of endpoint
				priv.config.apiEndpoint,
				
				{ 
					defaultClientName: (function getOS() {
						var userAgent = window.navigator.userAgent,
							platform = window.navigator.platform,
							macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
							windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
							iosPlatforms = ['iPhone', 'iPad', 'iPod'],
							os = platform;
						
						
						if (macosPlatforms.indexOf(platform) !== -1) {
							os = 'Mac Computer';
						} else if (iosPlatforms.indexOf(platform) !== -1) {
							os = platform;
						} else if (windowsPlatforms.indexOf(platform) !== -1) {
							os = 'Windows Computer';
						} else if (/Android/.test(userAgent)) {
							os = 'Android Device';
						} else if (/Linux/.test(platform)) {
							os = 'Linux Computer';
						}
						
						return os;
					})()
				
				}
			
			);
			
			//Update the UI when a user logs in or out
			pub.api.addListener("defaultToken", function(newToken){

				priv.userToken = newToken;
				
				//Save the token to localStorage if requested
				if (newToken === null){
					pub.removeStoredValue("userToken");
				} else {
					//If multi user mode, prevent logging in
					if ("multiUserMode" in priv.config && priv.config.multiUserMode === true){
						pub.api.logout();
					}
					if (pub.getStoredValue("rememberLogin")===true){
						pub.setStoredValue("userToken", newToken);
					} else {
						pub.setStoredValue("userToken", newToken, "session");
					}
				}
				
				if (priv.currentView === null){
					return false;
				}
				
				//Find if url doesn't match the current view
				if (priv.currentView.id==="403" && findView(window.location.pathname).id!=="403" && newToken!==null){
					switchView(window.location.pathname);
				}
				
				//Check if current view is allowed to be displayed
				if (priv.currentView.config && "requireAuthorizedUser" in priv.currentView.config && priv.currentView.config.requireAuthorizedUser===true && newToken===null){
					switchView("/403");
				}
			});
			
			//Check localStorage for user token, and load it if valid
			var token = pub.getStoredValue("userToken");
			if (token !== null && "id" in token){
				
				//Test the token with an api call to check it is still valid
				pub.api.validateAuthToken(token, function(response){
				
					if (response === true){
						
						pub.api.setDefaultToken(token);
						priv.userToken = token;

					} else {
					
						//Remove token from storage
						pub.removeStoredValue("userToken");
						priv.userToken = null;
						
					}
				});
			}
			
			//Only the current view's html has been sent, pre-fetch all other views HTML
			pub.api.request("views/fetchAllViewHTML", {appID: priv.config.appID}, function(data){
				var div, vid;
				priv.htmlData = data;
				pub.htmlDataPreloaded = true;
			});   
			
		});
		
		
		pub.dataStore.createSource("businesses", function(callback){
			pub.api.request(
				"businesses/fetchDetails", null,
				function(data){
					callback(data);
				}
			);
		},120);
		
		
		//Listen for escape presses to close modals
		document.onkeydown = function(evt) {
			evt = evt || window.event;
			if (evt.keyCode == 27) {
				pub.closeTopModal();
			}
		}
		
		return pub;
		
	};
	
	
	
	
	
	
	///////////////////////////////////////////
	// Private Methods
	
	//Authenticate a user
	//Once authenticated allow login with pin
	//Allow use of this token until after expiresIn seconds, then prompt for pin
	function getAuthToken(expiresIn, successCallback, failure, config){
		
		var failureAllowed = true;
		
		if (typeof expiresIn !== "number" || expiresIn < 0){
			throw new Error("Expiry  must be defined and be greater than 0.");
		}
		
		//Single user mode
		if (!("multiUserMode" in priv.config) || priv.config.multiUserMode !== true){
			if (priv.userToken === null){
				if (typeof failure === "function"){
					failure();
				}
			} else if ("requireUserIsEmployee" in priv.config && priv.config.requireUserIsEmployee === true && !pub.employee.isEmployee(priv.userToken)){
				if (typeof failure === "function"){
					return failure("Authentication failed. You are not an employee.");
				}
			} else if (typeof config === "object" && config !== null && config.getPasswordFor){
				if (priv.userToken.uid != config.getPasswordFor){
					if (typeof failure === "function"){
						return failure("Authentication failed. The current user's uid doesn't match.");
					}
					return false;
				} 
				pub.passwordPrompt(
					function(password){
						if (typeof successCallback === "function"){
							successCallback(priv.userToken, password);
						}
					},
					function(){
						if (typeof failure === "function"){
							failure("Authentication failed. Please try again.");
						}
					}
				);
			} else {
				if (typeof successCallback === "function"){
					successCallback(priv.userToken);
				}
			}
			return;
		}
			
			
		////////////////////////////////////////////////////////////////////	
		//Multi user mode
		
		function success(uid, password){
			
			//Check it hasn't expired
			if (priv.users[uid].token.expires < Date.now()/1000){
				delete priv.users[uid];
				switchTab("login");
				pinForm.reset();
				loginError.innerHTML = "Your session has expired. Please log in again.";
				u.fadeIn(loginError);
				return;
			}
			
			failureAllowed = false;
			priv.activeTokenUID = uid;
			priv.activeTokenLastUsed = Date.now();
			var expires = Date.now() + (expiresIn * 1000);
			if (expires > priv.activeTokenExpires){
				priv.activeTokenExpires = expires;
			}
			
			//Find if url doesn't match the current view, and reload
			if (priv.currentView.id==="403" && findView(window.location.pathname).id!=="403"){
				switchView(window.location.pathname);
			}
			
			if (typeof successCallback === "function"){
				successCallback(priv.users[uid].token, password);
			}
			if (modal){
				modal.close();
			}
		}
		
		//Are we requesting a password? See if already logged in. If so, authenticate with the password
		if (typeof config === "object" && config !== null && config.getPasswordFor && Object.keys(priv.users).length>0 && config.getPasswordFor in priv.users && priv.users[config.getPasswordFor] !== null){
			pub.passwordPrompt(
				function(password){
					success(config.getPasswordFor, password);
				},
				function(){
					if (typeof failure === "function"){
						failure("Authentication failed. Please try again.");
					}
				}
			);	
			return;
		}
		
		
		//Is there an active token still? Just use it
		if ( config === undefined && priv.activeTokenUID !== null 
			&& priv.activeTokenExpires > Date.now() ){
			return success(priv.activeTokenUID);
		}
		
		var settings = pub.getStoredValue("settings") || {};
		
		//Attempt to get new token
		var modal = pub.createModal(
			"<div class='spacer'></div>" +
			"<a href='javascript:;' class='tab loginTab active'>Log In</a>" +
			"<div class='spacer'></div>" +
			"<a href='javascript:;' class='tab pinTab'>Pin Code</a>" +
			"<div class='spacer wide'></div>" +

			"<div class='view pinView display-none'>" +
				"<div class='users'>"+
				"</div>"+
				'<form class="pinForm display-none">' +
					'<input type="password" placeholder="Enter PIN" inputmode="numeric" name="pin" class="pin" data-required="true" />' +
					'<input type="submit" value="Go"/> '+
					'</br>' +
					'<div class="pinError"></div>' +
					'<div class="osk display-none">' +
						'<input type="button" value="1" />' +
						'<input type="button" value="2" />' +
						'<input type="button" value="3" /><br/>' +
						'<input type="button" value="4" />' +
						'<input type="button" value="5" />' +
						'<input type="button" value="6" /><br/>' +
						'<input type="button" value="7" />' +
						'<input type="button" value="8" />' +
						'<input type="button" value="9" /><br/>' +
						'<input type="button" class="delete" value="◀&#xFE0E;" />' +
						'<input type="button" value="0" />' +
						'<input type="button" class="submit" value="✔&#xFE0E;" />' +
					'</div>'+
					'</br>' +
				'</form>' +
			"</div>" +
			
			"<div class='view loginView'>" +
				'<form class="loginForm">' +
					'<table>' +
					'<tr><td>Email:<td><input type="text" name="username" class="username" data-required="true" /><br/>' +
					'<tr><td>Password:<td><input type="password" name="currentPassword" class="currentPassword" data-required="true" /><br/>' +
					'</table>' +
					'<input type="submit" value="Login"/> '+
					'<a href="/account/recovery" class="forgot">Forgot your password?</a>' +
					'<div class="loginError"></div>' +
				'</form>' +
			"</div>",
			"multiUserLogin"
		);
		
		modal.beforeClose = function(){
			if (!failureAllowed) return;
			failureAllowed = false;
			if (typeof failure === "function"){
				failure();
			}
		};
		
		var pinTab = modal.querySelector(".pinTab"),
			pinView = modal.querySelector(".pinView"),
			pinForm = modal.querySelector(".pinForm"),
			pin = modal.querySelector(".pin"),
			usernameElm = modal.querySelector(".username"),
			passwordElm = modal.querySelector(".currentPassword"),
			loginTab = modal.querySelector(".loginTab"),
			loginView = modal.querySelector(".loginView"),
			loginForm = modal.querySelector(".loginForm"),
			loginError = modal.querySelector(".loginError");
			
			
		function switchTab(id){
			if (id==="login") {
				loginTab.classList.add("active");
				pinTab.classList.remove("active");
				loginView.classList.remove("display-none");
				pinView.classList.add("display-none");
				if (!("physicalKeyboard" in settings) || settings.physicalKeyboard === true){
					usernameElm.focus();
				}
			} else {
				loginTab.classList.remove("active");
				pinTab.classList.add("active");
				loginView.classList.add("display-none");
				pinView.classList.remove("display-none");
				if (!("physicalKeyboard" in settings) || settings.physicalKeyboard === true){
					pin.focus();
				}
			}	
		}
		
		loginTab.onclick = function(){
			switchTab("login");
		}
		
		pinTab.onclick = function(){
			switchTab("pin");
		}
		
		
		
		/////////////////////////////////////////
		
		u.form.linkInputsToValidator(loginForm);
		
		loginForm.onsubmit = function(e){
			e.preventDefault();
			if (!u.form.validate(loginForm)){
				return false;
			}
			
			u.fadeOut(loginError);
			u.loading.push("loginForm requestStart");
			
			var password = passwordElm.value;
			var email = usernameElm.value.toLowerCase();
			
			u.waitForObjects(["controller.api"], function(){
				try {
					pub.api.getAuthToken(
						email,
						password,
						function(token){
							u.loading.pop("loginForm requestComplete");
							if (typeof token === "object" && typeof token["SWDAPI-Error"] === "undefined"){
								
								//Clear form
								loginForm.reset();
								
								//Deauth old token
								if (token.uid in priv.users && priv.users[token.uid].token.id !== token.id){
									deAuthToken(priv.users[token.uid].token);
								}

								//Are we requiring users to be employees?
								if ("requireUserIsEmployee" in priv.config && priv.config.requireUserIsEmployee === true && !pub.employee.isEmployee(token)){
									loginError.innerHTML = "Sorry, you are not an employee on this system.";
									u.fadeIn(loginError);
									deAuthToken(token);
									return;
								}
								
								//Create salt for comparing pins later
								var sha = new jsSHA("SHA-256", "TEXT");
								sha.setHMACKey(password, "TEXT");
								sha.update(email);
								var hmac = sha.getHMAC("HEX");
								
								//Store new user
								priv.users[token.uid] = {
									token: token,
									salt: hmac
								};
								
								if (typeof config === "object" && config !== null && config.getPasswordFor){
									if (token.uid != config.getPasswordFor){
										loginError.innerHTML = "The user you authenticated with doesn't have permission to complete this action.";
										u.fadeIn(loginError);
										return;
									}
									success(token.uid, password);
								} else {
									success(token.uid);
								}
								
								//If no pin set yet, prompt to create one
								if (!("data" in token) || typeof token.data !== "object" || token.data === null || token.data.pin === null){
									pub.openViewAsModal("change-pin", {
										currentPassword: password,
										showWelcome: true
									}, function(response){
										if (token['uid'] in priv.users){
											priv.users[token['uid']].token.data.pin = response.hash;
										}
									});
								}
								
							} else {
								loginError.innerHTML = token["SWDAPI-Error"].message;
								u.fadeIn(loginError);
							}
						},
						app.getDefaultPermissions(),
						app.getDefaultExpiry(),
						app.getDefaultTimeout()
					);
				} catch (e){
					loginError.innerHTML = e;
					u.fadeIn(loginError, false);
					u.loading.pop("loginForm requestError");
				}
			});
			
		};
		
		pin.onfocus = passwordElm.onfocus = usernameElm.onfocus = function(){
			u.fadeOut(loginError, false);
			u.fadeOut(modal.querySelector(".pinError"), false);
		};
		
		
		//Validate pins
		
		var activePinUser = null;
		
		u.form.linkInputsToValidator(pinForm);
		
		pinForm.onsubmit=function(e){
			
			if (e) e.preventDefault();
			
			if (!u.form.validate(pinForm)){
				return false;
			}
			
			//Prevent "remember password" on this field
			pin.type = "text";

			try {
			
				if (activePinUser === null){
					throw Error("Please select a user");
				}
			
				//Hash the pin
				var sha = new jsSHA("SHA-256", "TEXT");
				sha.update(pin.value.replace(/\D/g, ""));
				var inPIN = sha.getHash("HEX");
				
			
				//Create user-specific hash		
				sha = new jsSHA("SHA-256", "TEXT");
				sha.setHMACKey(priv.users[activePinUser.userID].salt, "TEXT");
				sha.update(inPIN);
				var pinHMAC = sha.getHMAC("HEX");
				
				//Compare results
				if (priv.users[activePinUser.userID].token.data.pin === pinHMAC){
					success(activePinUser.userID);
					return true;
				}
				
				throw Error("The PIN you entered was incorrect.");
			
			} catch (e){
				pinForm.reset();
				if (!("physicalKeyboard" in settings) || settings.physicalKeyboard === true){
					pin.focus();
				}
				u.fadeIn(modal.querySelector(".pinError"), false);
				console.log(e);
				modal.querySelector(".pinError").innerHTML = e.message;
			}
			
		}
		
		var buttons = modal.querySelectorAll(".osk>input");
		for (i in buttons){
			if (!buttons.hasOwnProperty(i)) continue;
			buttons[i].onclick = function(){
				if (this.classList.contains("delete")){
					if (pin.value.length>0){
						pin.value = pin.value.slice(0,-1);
					}
				} else if (this.classList.contains("submit")){
					pinForm.onsubmit();
				} else {
					pin.value += this.value
				}
			}
		}
		
		modal.render();
		
		var numUsers = 0;

		//Show correct view
		if (Object.keys(priv.users).length>0 && !(typeof config === "object" && config !== null && (config.getPasswordFor || (config.forceLogIn && config.forceLogIn === true))) ){
			
			//Update the list of logged in users
			var users = modal.querySelector(".users");
			var user;
			for (var i in priv.users){
				if (!priv.users.hasOwnProperty(i) || !priv.users[i].token.data.pin) continue;
				var a = document.createElement("a");
				a.href="javascript:;";
				a.onclick = switchPinUser;
				a.classList.add("button");
				a.userID = i;
				a.appendChild(document.createTextNode(priv.users[i].token.data.firstName + " " + priv.users[i].token.data.lastName));
				users.appendChild(a);
				numUsers++;

				console.log(priv.users[i]);
				
				if (i === priv.activeTokenUID){
					switchPinUser(a);
				}
			}
		}

		if 	(numUsers > 0 ){
			switchTab("pin");

			//Show the onscreen keyboard?
			if ("physicalKeyboard" in settings && settings.physicalKeyboard === false){
				modal.querySelector(".osk").classList.remove("display-none");
			}
			
		} else {
			switchTab("login");
			
			//Hide the pin tab
			pinTab.onclick = function(){
				switchTab("login");
			}
		}
		
		
		function switchPinUser(a){
			
			if (activePinUser!==null){
				activePinUser.classList.remove("active");
			}
			
			pinForm.classList.remove("display-none");
			activePinUser = this || a;
			activePinUser.classList.add("active");
			if (!("physicalKeyboard" in settings) || settings.physicalKeyboard === true){
				pin.focus();
			}
			
		}
		
		function deAuthToken(token){
			pub.api.request(
				"swdapi/invalidateAuthToken",
				{
					"id": token.id
				}, 
				null,
				null,
				token
			);
		}
	}
	
	
	
	//Compare a single url and pattern and determine if they match
	//
	// Symbols-
	// :	  	Named variable. E.g. /users/:id would match /users/jamie and return {id:"jamie"}
	// *		Match all. When between slashes (e.g. /users/*/profile), it will only match one directory level (So that example WOULDN'T match /users/jamie/nested/profile). When at the end of a pattern, it will match any trailing levels as well, unless followed by a slash.
	function testViewPattern(url, pattern){
		
		//Enforce variable types
		if (typeof url !== 'string'){
			console.log("testViewPattern(var1, var2), var1 must be string");
			return false;
		}
		if (typeof pattern !== 'string'){
			console.log("testViewPattern(var1, var2), var2 must be string");
			return false;
		}
		
		//Remove leading slashes
		if (url.substring(0,1)==="/"){
			url = url.substring(1);
		}
		if (pattern.substring(0,1)==="/"){
			pattern = pattern.substring(1);
		}
		
		//Remove trailing slashes
		if (url.substr(-1)==="/"){
			url = url.substring(0,url.length-1);
		}
		if (pattern.substr(-1)==="/"){
			//pattern = pattern.substring(0,pattern.length-1);
		}
		
		
		var url_parts = url.split("/"),
			pattern_parts = pattern.split("/"),
			variables = {};
			
		//Match		/users/jamie/profile
		//Against	/users/:id/*
		
		//Cycle throuh the url parts and test against the pattern
		for(var i=0, len=url_parts.length; i<len; i++){
		
			//We've ran out of pattern to test
			if (pattern_parts[i] === undefined){
				//Did the patten end in *?, then it matches
				if (i>0 && pattern_parts[i-1]==="*"){
					return variables;
				}
				//If it didn't then this obviously isn't the right view
				return false;
				
			//Does the pattrn match all here?
			} else if (pattern_parts[i]==="*"){
				continue;
				
			//Does the pattern match a varible here?
			} else if (pattern_parts[i].substring(0,1)===":"){
				variables[pattern_parts[i].substring(1)]=decodeURIComponent(url_parts[i]);
				continue;
				
			//Was the pattern an exact match (but not * or :*)
			} else if (url_parts[i]===pattern_parts[i]){
				continue;
			}
			
			//No? Then stop checking, this is the wrong view
			return false;
		}
		
		//Is there anything left of the pattern to match, this might still be the wrong view
		if (pattern_parts[i] !== undefined 
			&& pattern_parts[i] !== ""
		){
			return false;
		}
		
		//If we got here, then it matches, send the variables back
		return variables;
	}
	
	function preRenderView(prevView){
		
		u.loading.push("prerender view");

		//Take action on old view
		if (prevView && typeof prevView === "object" && prevView !== null && prevView !== undefined){
			
			if (prevView.container!==null){
				prevView.container.classList.add("display-none");
			}
			
			//Remove it from the DOM after a short while
			setTimeout(function(){
				if (prevView.container!==null){
					prevView.container.parentNode.removeChild(prevView.container);
				}
			}, 1000);
		}
	}
	
	function renderView(view){
	
		u.loading.pop("render view");
		
		if (view === null){
			throw "Cannot render view with invalid object.";
		}

		//Check we can access new view
		if (view.container === null){
			console.log("Unable to access new view's container element.", view);
			return false;
		}
		
		view.container.classList.remove("display-none");
	}
	
	function findView(url){
		
		var selected, defered = {};
		
		//Cycle through views and test their paths
		function test(object){
			for (var prop in object) {
				if (!object.hasOwnProperty(prop)) continue;
	
				var view = object[prop];
				
				//Views that match other view's paths can choose to be defered
				if ("config" in view && object !== defered && typeof view.config === "object" && view.config.deferPathMatching === true){
					defered[prop] = view;
					continue;
				}
				
				var viewVariables = testViewPattern(url, view.path);
				
				if (typeof viewVariables !== "object"){
					continue;
				}
				
				//Create a new object and return it
				return getViewObject(prop, url, viewVariables);
	
			}
			
			return false;
		}
		
		selected = test(priv.views);
		if (selected) return selected;
		
		selected = test(defered);
		if (selected) return selected;
		
		console.log("404 - view not found: " + url)
		return getViewObject("404", url, {});

	}
	
	function getViewObject(id, url, variables) {
		
		if (!(id in priv.views)){
			return null;
		}
		
		var callback,
			view = priv.views[id],
			authTimeout = 30;
		
		var rendered = false,
			obj = {
				id: id,
				created: Date.now(),
				url: url,
				variables: variables,
				api: pub.api,
				title: null,
				beforeClose: null,
				container: null,
				switchedToView: null,
				ignoreSwitchView: false,
				getAuthToken: function(success, failure, config){
					
					return getAuthToken(authTimeout, success, failure, config);
				},
				getActiveUser: function(){
					if (!("multiUserMode" in priv.config) || priv.config.multiUserMode !== true){
						return priv.userToken.uid;
					}
					return priv.activeTokenUID;
				},
				authenticatedApiRequest: function(method, data, success, failure, config){
					failure = failure || console.error;
					u.loading.pop("authenticatedApiRequest (clearing loading)");
					this.getAuthToken(
						function(token, password){
							u.loading.push("authenticatedApiRequest (resetting loading)");
							if (typeof config === "object" && config !== null && config.getPasswordFor){
								data.currentPassword = password;
							}
							try {
								pub.api.request(method, data, success, function(message){
									//Check for expired/timed out tokens
									if (
										typeof message !== "string" && message['SWDAPI-Error'] !== undefined && message['SWDAPI-Error']['code'] !== undefined
										&& message['SWDAPI-Error']['code'] >= 403008 && message['SWDAPI-Error']['code'] <= 403012
									){
										//Force login
										delete priv.users[token.uid];
										config = config || {};
										config.forceLogIn = true;
										
										//Prompt for login
										alert("Your login session has expired or timed out. Please log in again.");
										obj.authenticatedApiRequest(method, data, success, failure, config);
									}
									
									failure.apply( this, arguments ); 
									
								}, token);
							} catch (e){
								failure(e);
							}
						}, 
						function(message){
							
							u.loading.push("authenticatedApiRequest (resetting loading)");
							failure(message || "Authentication failed. Please try again.");
						},
						config
					);   
				},
				
				errorSwitchView: function(url, navigate){
					
					console.warn("Error switch view: ",url);
					this.switchedToView = url;
					
					if (rendered === false && typeof this.render === "function"){
						this.render();
					}
					
					if (this.ignoreSwitchView){
						return true;
					}
					
					//Is this a modal?
					if (this.url === null || typeof this.close === "function"){
						var newView = findView(url);
						this.close();
						pub.openViewAsModal(newView.id, newView.variables);
					} else {
						
						if (navigate===true){
							pub.navigateTo(url);
						} else {
							switchView(url);
						}
					}
				},
				render: function(){
					if (rendered === false && typeof callback === "function"){
						callback();
						rendered = true;
						if (this.title !== null){
							this.setTitle(this.title);
						}
					}
				},
				applyLinkTemplate: function(vars){
					var i, id;
					
					var links = this.container.querySelectorAll("a");
					for (i in links){
						if (links.hasOwnProperty(i) && "href" in links[i]){
							
							for (id in vars){
								if (!vars.hasOwnProperty(id)) continue;
								links[i].href = links[i].href.replace(":"+id, vars[id]);
							}
						}
					}
				},
				setDesiredTokenExpiry: function(){
					//Reset timer to this view's setting
					if ( "multiUserMode" in priv.config && priv.config.multiUserMode === true){
						if (priv.activeTokenExpires > Date.now() ){
							priv.activeTokenExpires = Date.now() + (authTimeout * 1000);
						}
					}
				},
				load: function(newCallback){
	
					delete this.load;
					callback = newCallback;
					
					//Update default
					if (view.config && "multiUserAuthTimeout" in view.config && typeof view.config.multiUserAuthTimeout === "number"){
						authTimeout = view.config.multiUserAuthTimeout;
					}
					
					//Reset token expiry to this view's setting
					this.setDesiredTokenExpiry();
					
					//Does this view require auth?
					if (view.config && "requireAuthorizedUser" in view.config && view.config.requireAuthorizedUser === true){
						
						//Single user mode
						if (!("multiUserMode" in priv.config) || priv.config.multiUserMode !== true){
							if (pub.getStoredValue("userToken")===null){
								console.warn("Authorized User required.")
								this.errorSwitchView("/403");
								return;
							}	
							
						//Multi user mode
						} else {
							u.loading.pop("MultiUser requireAuthorizedUser (clearing loading 1)");
							u.loading.pop("MultiUser requireAuthorizedUser (clearing loading 2)");
							
							this.getAuthToken(
								function(){
									u.loading.push("MultiUser requireAuthorizedUser success (restoring loading 1)");
									u.loading.push("MultiUser requireAuthorizedUser success (restoring loading 2)");
									view.controller.apply(obj);
								}, 
								function(error){
									u.loading.push("MultiUser requireAuthorizedUser failure (restoring loading 1)");
									u.loading.push("MultiUser requireAuthorizedUser failure (restoring loading 2)");
									console.warn("Failed to authenticate.");
									obj.errorSwitchView("/403");
								}
							);
							return;
						}
					}
					
					//Run the view's controller with this
					view.controller.apply(this);
				},
				setTitle: function(newTitle){
					this.title = newTitle;
					if (rendered !== false && this.url !== null){
						document.title = this.title + " | " + priv.config.platformName;
					}
				},
				closeView: function(){
					//Extend token expiry if still valid
					if (priv.activeTokenExpires > Date.now() && Date.now() + (authTimeout *0.5 * 1000) > priv.activeTokenExpires){
						priv.activeTokenExpires = Date.now() + (authTimeout * 0.5 * 1000);
					}
				}
			};

		if ("config" in view){
			obj.config=view.config;
		}

		return obj;
	}
	
	
	
	function switchView(url, addHistory){

		//Enforce variable types
		if (typeof url !== 'string'){
			console.log("app.switchView(var), var must be string");
			return false;
		}
		
		//Tell the current view they are about to close
		if (priv.currentView !== null){
			
			if (closeHandler(closeView(priv.currentView))===false){
				return false;
			}
			
		}
		
		//Hide any open modals
		if (pub.closeAllModals()===false){
			return false;
		}
		
		//Always Transition (fade in) unless no view was previously displayed
		var transition = (priv.currentView!==null);
		
		//Start fade out of old view (unless told not to)
		if (transition){
			preRenderView(priv.currentView);
		}		
		
		//Test the url to find new matching view (may be 404)
		var matchedView = findView(url);
		
		//Check if we are allowed to see this view
		//if (matchedView.config && "requireAuthorizedUser" in matchedView.config && matchedView.config.requireAuthorizedUser === true){
		//	if (pub.getStoredValue("userToken")===null){
		//		matchedView = findView("/403");
		//	}	
		//}

		//Save the new state of the current view
		priv.currentView = matchedView;
		
		if (addHistory===true){
			w.history.pushState(null, "", url);
		}

		//Load html into a new div (or wait until html is fetched from server)
		u.waitForObjects([[priv, "htmlData", matchedView.id]], function(){
			
			//Fetch the new view
			var newView = priv.htmlData[matchedView.id];
			
			//Create a container for the view
			var newContainer = document.createElement("div");
			newContainer.classList.add("view-" + matchedView.id, "display-none");
			
			//Load in the view html
			newContainer.innerHTML = newView.html;
			
			//Add the container to the main page
			document.querySelector("#content").appendChild(newContainer);
			
			//Link the new container to the view object
			matchedView.container = newContainer;
			
			//Update the page title
			matchedView.title = newView.title
			document.title = newView.title + " | " + priv.config.platformName;
			
			//Load the view
			matchedView.load(function(){

				//If we are no longer the desired view, close immediately
				if (priv.currentView.id != matchedView.id || priv.currentView.created != matchedView.created){
					u.loading.pop("switchView view not required any more");
					closeView(matchedView);
					return;
				}
				
				window.scrollTo(0, 0);
				
				//Present the new view to the user
				if (transition){
					renderView(matchedView);
				}
	
			});
			
		});


		return true;
	}
	
	function closeHandler(happy){
		//Check the view is ready to close
		if (happy === false || typeof happy === "object"){
			if (confirm((happy.message || "You may have unsaved changes. Are you sure you want to leave?"))){
				if (typeof happy === "object" && "forcedClose" in happy && typeof happy.forcedClose === "function"){
					happy.forcedClose();
				}
			} else {
				return false;
			}
		}
		return true;
	}
	
	function closeView(view, removeContainerFromDOM){

		//Tell the view it is about to close
		if ("beforeClose" in view && typeof view.beforeClose === "function"){
			return view.beforeClose();
		}
		
		view.closeView();

		return true;		
	}
	
	//find first parent with tagName [tagname]
	function findParent(tagname,el){
		while (el){
			if ((el.nodeName || el.tagName).toLowerCase()===tagname){
				return el;
			}
			el = el.parentNode;
		}
		return null;
	}
	

	
	
	///////////////////////////////////////////
	// Public methods
	
	
	pub.getStripeKeys = function(){
		if (window.location.hostname.search("cakecannon")>0){
			return {
				apiKey: "___",
				clientID: "___",
				test: true
			};
		} else {
			return {
				apiKey: "___",
				clientID: "___",
				test: false
			}
		}
	}
	
	//Return seconds until session will lock
	pub.getSecondsTillLock = function(){
		
		if ("multiUserMode" in priv.config && priv.config.multiUserMode === true){
			if (priv.activeTokenUID !== null && priv.activeTokenExpires > Date.now()){
				return Math.ceil((priv.activeTokenExpires - Date.now())/1000);
			}
			return null;
			
		} else if (priv.userToken !== null && priv.userToken !== undefined){
			//Hard to be precise with single user timeout, but probably something like this
			var timeout = priv.userToken.timeout;
			var expiry = priv.userToken.expires - Math.ceil(Date.now()/1000);
			if (timeout < expiry){
				return timeout;
			}
			return expiry;
		}
		
		return null;
	}
	
	pub.lock = function(){
		if ("multiUserMode" in priv.config && priv.config.multiUserMode === true){
			priv.activeTokenExpires = Date.now()-1000;
		} else if ("logout" in app){
			app.logout();
		}
	}
	
	pub.unLock = function(){
		if ("multiUserMode" in priv.config && priv.config.multiUserMode === true){
			if (priv.activeTokenExpires > Date.now()) return true;
			getAuthToken(30);
		} else if (!pub.isAuthenitcated() && "login" in app){
			app.login();
		}
	}
	
	pub.isAuthenitcated = function(){
		
		if ("multiUserMode" in priv.config && priv.config.multiUserMode === true){
			return (priv.activeTokenExpires > Date.now());
			
		} else {
			return (priv.userToken !== null && priv.userToken !== undefined);
		}
	}
	
	pub.getUserPermissions = function(){
		
		if (!pub.isAuthenitcated()){
			return null;
		}
		
		if ("multiUserMode" in priv.config && priv.config.multiUserMode === true){
			return {
				id: priv.activeTokenUID,
				permissions: priv.users[priv.activeTokenUID].token.permissions
			};
		} else {
			return {
				id: priv.userToken.uid,
				permissions: priv.userToken.permissions
			};
		}
	};
	
	pub.getStoredValue = function(key){
		var data;
		if (priv.localStorageAvailable){
			data = localStorage.getItem(priv.config.appID + "." + key)
			if (data){
				return JSON.parse(data);
			}
		}
		if (priv.sessionStorageAvailable){
			data = sessionStorage.getItem(priv.config.appID + "." + key)
			if (data){
				return JSON.parse(data);
			}
		}
		return null;
	}
	
	pub.setStoredValue = function(key, value, type){
		if ((typeof type === "undefined" || type === "local") && priv.localStorageAvailable){
			return localStorage.setItem(priv.config.appID + "." + key, JSON.stringify(value));
		}
		if (type === "session" && priv.sessionStorageAvailable){
			return sessionStorage.setItem(priv.config.appID + "." + key, JSON.stringify(value));
		}
		return false;
	}
	
	pub.removeStoredValue = function(key){
		if (priv.localStorageAvailable){
			localStorage.removeItem(priv.config.appID + "." + key);
		}
		if (priv.sessionStorageAvailable){
			sessionStorage.removeItem(priv.config.appID + "." + key);
		}		
	}	
	
	pub.createModal = function(html, id, disableClose){

		var modal, rendered = false,
		closeFunc = function(delay){
			if (typeof modal.beforeClose === "function"){
				
				if (closeHandler(modal.beforeClose())===false){
					return false;
				}				
				
			}
			var idx = priv.modals.indexOf(modal);
			if (idx != -1){
				priv.modals.splice(idx, 1);
			}
			
			if (typeof delay !== "number"){
				delay = modal.delayClose || undefined;
			}
			
			if (delay){
				setTimeout(function(){
					modal.classList.add("display-none");
				}, delay);
			} else {
				modal.classList.add("display-none");
			}
			
			//If this is the last modal
			if (priv.modals.length < 1){
				//Hide the mask
				u.elm("mask").classList.add("display-none");
				
				//Restore the default token expiry of the main view
				if (priv.currentView){
					priv.currentView.setDesiredTokenExpiry();
				}
				
			}
			
			if (rendered === false){
				u.loading.pop("createModal modal render canceled");
			}
			
			w.setTimeout(function(){
				try {
					u.elm("modals").removeChild(modal);
				} catch (e){
					//ignore
				}
			}, 1000);
			
			return true;
		};
		
		modal = d.createElement("div");
		if (typeof id === "string"){
			modal.id = id;
			modal.classList.add("modal-"+id)
		}
		modal.innerHTML = html;
		modal.classList.add("display-none");

		if (disableClose!==true){
			
			var close = d.createElement("a");
			close.onclick = closeFunc;
			close.href = "javascript:void(0)";
			close.classList.add("close");
			
			var cross = document.createTextNode('\u2715'); 
			close.appendChild(cross);
			
			modal.appendChild(close);
		}
		
		
		u.elm("mask").classList.remove("display-none");
		
		u.elm("modals").appendChild(modal);
		
		modal.close = closeFunc;
		
		u.loading.push("createModal modal created");
		
		modal.render = function(){
			modal.classList.remove("display-none");
			u.loading.pop("createModal modal rendered");
			rendered = true;
		};
		
		
		priv.modals.push(modal);
		
		return modal;
		
	}
	
	pub.closeAllModals = function(){
		
		//Start from the end!
		for(var i = priv.modals.length-1; i >= 0 ; i--){

			var happy = priv.modals[i].close();
			
			if (happy===false){
				return false;
			}
		}
		
		u.elm("mask").classList.add("display-none");
		
		return true;
	}
	
	pub.closeTopModal = function(evt) {
		//Get all modals
		var modals = document.querySelectorAll("#modals > div");
		if (modals.length>0){
			
			//Close the topmost
			modals[modals.length-1].close();
		}
	};
	
	pub.passwordPrompt = function(successCallback, failureCallback){
		
		//Prompt for current password
		var modal = pub.createModal(
			"<h2>Confirm Your Identity</h2><p>Please enter your account password to authorize these changes:</p>"+
			"<p><form><input type='password' name='currentPassword' data-required='true'/> <input type='submit' value='Save Changes' /></form></p>"
		);
		modal.style.borderColor = "#bcdbea";
		
		var complete = false,
			form = modal.querySelector("form");
		
		modal.beforeClose = function(){
			form.reset();
			if (complete === false && typeof failureCallback === "function"){
				failureCallback();
			}
		};
		
		form.onsubmit = function(e){
			
			e.preventDefault();
			
			//Check validity of password form
			if (!u.form.validate(form)){
				return false;
			}
			
			//Call the success handler
			if (typeof successCallback === "function"){
				successCallback(modal.querySelector("input[type=password]").value);
			}
			
			//Close the modal
			complete = true;
			modal.close();			
		};
		
		modal.render();
		modal.querySelector("input").focus();
	};
	
	pub.multiUserLogout = function(uid, success, failure){
		
		uid = uid || priv.activeTokenUID;
		
		if (!(uid in priv.users) || priv.users[uid] === null) return false;
		
		pub.api.request(
			"swdapi/invalidateAuthToken",
			{
				"id": priv.users[uid].token.id
			}, 
			function(response){
				if (response === true){
					if (uid === priv.activeTokenUID){
						priv.activeTokenUID = null;
						priv.activeTokenExpires = Date.now()-1000;
					}
					delete priv.users[uid];
					if (typeof success === "function"){
						success(response);
					}
				} else {
					if (typeof failure === "function"){
						failure(response);
					}
				}
			},
			failure,
			priv.users[uid].token
		);
		
		return true;
	}
	
	pub.openViewAsModal = function (viewID, variables, sideChannel, returnUnrenderedModal){
		
		
		//Try to open a view by id
		var view = getViewObject(viewID, null, variables);

		if (view===null){
			return false;	
		}
		
		var loaded = false;
		u.loading.push("openViewAsModal waiting for html to load");

		u.waitForObjects([[priv, "htmlData", viewID]], function(){
	

			//Copy the html into the modal
			var modal = pub.createModal(priv.htmlData[viewID].html);
			
			//Add the proper class name
			modal.classList.add("view-" + viewID);
			
			//Link the close function
			view.close = modal.close;
			
			//Point the container to the modal
			view.container = modal;
			
			//Set the title
			view.title = priv.htmlData[viewID].title;
			
			//Setup a sidechannel
			if (sideChannel){
				view.sideChannel = sideChannel;
			}
			
			//Link closing functions
			modal.beforeClose = function(){
				if (loaded === false){
					u.loading.pop("openViewAsModal load canceled");
				}
				return closeView(view);
			}

			//Load the view (and link the modal.render to the view.render)
			view.load(function(){
				u.loading.pop("openViewAsModal rendered");
				loaded = true;
				if (typeof returnUnrenderedModal === "function"){
					returnUnrenderedModal(modal, view);
				} else {
					modal.render();
				}
			});
			
		});
		
		return true;
	}
	
	pub.getRenderedViewHTML = function (url, success, failure, delay){

		
		//Try to open a view by id
		var view = findView(url);
		
		var viewID = view.id;
		
		if (viewID == "404" || viewID == "403"){
			failure(url);
			return false;
		}
		
		u.waitForObjects([[priv, "htmlData", viewID]], function(){
	
			//Copy the html into the container
			var modal = document.createElement("div");
			modal.innerHTML = priv.htmlData[viewID].html;
			
			//Point the container
			view.container = modal;
			
			//Set the title
			view.title = priv.htmlData[viewID].title;
			
			//Prevent errorSwitchView from loading new views
			view.ignoreSwitchView = true;
			
			//Load the view
			view.load(function(){
				//Wait for view to fully render
				setTimeout(function(){
					//Check no errors were triggered
					if (view.switchedToView === null){
						success(url, view.title, modal.innerHTML);
					} else {
						failure(url);
					}
					closeView(view);
				}, delay || 1000);
			});
		});
		
		return true;
	}

	pub.registerView = function(config, callback){
		
		//Enforce variable types
		if (typeof config !== 'object' || config === undefined || config == null){
			console.log("Config must be an object containing view settings.");
			return false;
		}
		if (!("id" in config) || typeof config.id !== 'string'){
			console.log("view id must be a string");
			return false;
		}
		if (!("match" in config) || typeof config.match !== 'string'){
			console.log("view match must be a string");
			return false;
		}
		if (typeof callback !== 'function'){
			console.log("no callback specified");
			return false;
		}
		
		if (typeof priv.views[config.id] === "undefined"){
			
			priv.views[config.id] = {
				path: config.match,
				controller: callback,
				config: config
			};

		}
	};
	
	pub.navigateTo = function(url){
		if (typeof w.onpopstate !== "undefined" && typeof w.history.pushState === "function" ){
			switchView(url, true);
		} else {
			w.location = url;
		}
	};
	
	pub.employee = {

		//Is the user an employee, if businessID is specified are they an eployee of that business
		isEmployee: function(token, businessID){
			if (
				token!== undefined && token !== null && "permissions" in token && typeof token.permissions === "object" && token.permissions !==null
				&& "employee" in token.permissions
			){
				if ( typeof businessID === "undefined" || businessID === null){
					return Object.keys(token.permissions.employee).length > 0;
				} else if (businessID in token.permissions.employee){
					return true;
				}
			}
			return false;
		},

		getPermissions: function(token, businessID){
			if (
				token!== undefined && token !== null && "permissions" in token && typeof token.permissions === "object" && token.permissions !==null
				&& "employee" in token.permissions
			){
				if (businessID in token.permissions.employee){
					return token.permissions.employee[businessID];
				}
			}
			return false;
		},
		
		checkPermission: function(token, businessID, permission){
			
			var perms = this.getPermissions(token, businessID);
			
			if (perms===false){
				return false;
			}
			
			if ("ALL" in perms && perms['ALL'] === true){
				return true;
			}
			
			if (permission in perms && perms[permission] === 1){
				return true;
			}
			
			return false;
		},
	};
	
	pub.dataStore = {
		
		createSource: function(sourceName, fetcher, interval, storeLocalCopy){
			if ( sourceName in priv.dataStore ){
				throw "createSource: Data source already exists";
			}
			
			if (typeof fetcher !== "function"){
				throw "createSource: Fetcher isn't a function";
			}
			
			
			//Create source
			priv.dataStore[sourceName] = {
				fetcher: fetcher,
				listeners: [],
				interval: interval * 1000,
				lastFetch: 0,
				storeLocalCopy: true,
				data: null
			};
			
			//Setup localStorage
			if (storeLocalCopy === false){
				priv.dataStore[sourceName].storeLocalCopy = false;
			} else {
				//Load preexisting data?
				var oldData = pub.getStoredValue("dataStore__" + sourceName);
				if (typeof oldData === "object" && oldData !== null){
					priv.dataStore[sourceName].data = oldData;
					priv.dataStore[sourceName].lastFetch = Date.now();
				}
			}
			
			//Start it
			this.startFetcher(sourceName);
			
		},
		
		startFetcher: function(sourceName){
			
			if ( ! (sourceName in priv.dataStore) ){
				throw "startFetcher: Invalid data source";
			}
			
			if ( "intervalPointer" in priv.dataStore[sourceName] ){
				return true;
			}
			
			//Call it now
			this.manualFetch(sourceName);
			
			//Start the interval
			priv.dataStore[sourceName].intervalPointer = setInterval(function(){
				pub.dataStore.manualFetch(sourceName);
			}, priv.dataStore[sourceName].interval);		
		
		},
		
		manualFetch: function(sourceName, callback){
			
			if ( ! (sourceName in priv.dataStore) ){
				throw "manualFetch: Invalid data source";
			}			
			
			//Call the fetcher
			u.waitForObjects([[pub, "api"]], function(){
				priv.dataStore[sourceName].fetcher(function(data){
					
					//Store the returned data
					var oldData = priv.dataStore[sourceName].data;
					priv.dataStore[sourceName].data = data;
					priv.dataStore[sourceName].lastFetch = Date.now();
					
					if (typeof callback === "function"){
						pub.dataStore.query(sourceName, callback);
					}
					
					//If there are changes to the data, call the listeners
					if (JSON.stringify(oldData) !== JSON.stringify(data)){
						
						//Update localstorage
						if (priv.dataStore[sourceName].storeLocalCopy===true){
							pub.setStoredValue("dataStore__" + sourceName, data);
						}
						
						priv.dataStore[sourceName].listeners.forEach(function(listener){
							pub.dataStore.query(sourceName, listener);
						});
					}
				});
			});
		},
		
		stopFetcher: function(sourceName){
			
			if ( ! (sourceName in priv.dataStore) ){
				throw "startFetcher: Invalid data source";
			}
			
			if ( ! ("intervalPointer" in priv.dataStore[sourceName]) ){
				return true;
			}	
			
			clearInterval(priv.dataStore[sourceName].intervalPointer);
			delete priv.dataStore[sourceName].intervalPointer;
		},
		
		query: function(dataSource, listener){
			
			if ( ! (dataSource in priv.dataStore) ){
				throw "query: Invalid data source";
			}

			//Allow a function with attached config object, or a config object, or null
			if (typeof listener !== "function"){
				var newListener = function(data){
					return data;
				};
				
				if (typeof listener === "object"){
					newListener.config = listener;
				}
				
				listener = newListener;
			}
			
			var filteredData = {},
				data = priv.dataStore[dataSource].data,
				add = null;
				
			
			//No data to return?
			if ( data === null || typeof data !== "object" || Object.keys(data).length === 0 ) {
				
				return listener( null );
			
			//Return plain unmodified data?	
			} else if (!("config" in listener) || listener.config === undefined  || listener.config === null || typeof listener.config !== "object" ){
				
				return listener( JSON.parse(JSON.stringify( data )) );
				
			//Perform some actions on the data first
			} else {
				
				var indexBy = false,
					filters = false;
					
				if ( "index" in listener.config && typeof listener.config.index !== "object") {
					indexBy = listener.config.index;
				}
				if ( "filters" in listener.config && typeof listener.config.filters === "object" && listener.config.filters !== null) {
					filters = listener.config.filters;
				}
				
				//Foreach data row
				if (index!==false || filters!==false){
					for (var i in data){
						if (!data.hasOwnProperty(i)) continue;
						
						add = true;
						var index = i;
						
						//Custom index
						if ( indexBy!==false && typeof data[i] === "object" && indexBy in data[i]){
							index = data[i][indexBy];
						}
						
						//Foreach filter
						if (filters!==false){
							for (var f in filters){
								if (!filters.hasOwnProperty(f)) continue;
								
								if (!(f in data[i]) || data[i][f] != filters[f]){
									add = false;
									break;
								}
							}
						}
						
						if (add === true){
							filteredData[index] = data[i];
						}
						
					}
					
					data = filteredData;
				}
				
				//Sort the data
				if ( Object.keys(data).length > 0 && "sortBy" in listener.config && typeof listener.config.sortBy === "object" && listener.config.sortBy !== null  && listener.config.sortBy !== undefined){
					
					//convert to array
					var sortable = [];
					for (var i in data) {
						if (data.hasOwnProperty(i)){
							sortable.push(data[i]);
						}
					}

					sortable.sort(function(fields) {
						var dir = [], i, l = fields.length;
						fields = fields.map(function(o, i) {
							if (o[0] === "-") {
								dir[i] = -1;
								o = o.substring(1);
							} else {
								dir[i] = 1;
							}
							return o;
						});
					
						return function (a,b) {
							for (i = 0; i < l; i++) {
								var o = fields[i];
								if (a[o] > b[o]) return dir[i];
								if (a[o] < b[o]) return -(dir[i]);
							}
							return 0;
						};
					}(listener.config.sortBy));
					
					data = sortable;
				}				
				
				//No data left after filtering?
				if (Object.keys(data).length === 0){
					data = null;
					
				//Just return first result?	
				} else if ("singleResult" in listener.config && listener.config.singleResult === true){
					return listener( JSON.parse(JSON.stringify( data[Object.keys(data)[0]] )) )
				}
				
				//Return requested data
				return listener( JSON.parse(JSON.stringify( data )) );

			} 
			
		},
		
		pushData: function(dataSource, newData){
			
			if ( ! (dataSource in priv.dataStore) ){
				throw "pushData: Invalid data source";
			}
			
			if ( newData !== null && (typeof newData !== "object" || newData === undefined) ){
				throw "pushData: invalid new data";
			}
			
			//Store the returned data
			var oldData = priv.dataStore[dataSource].data;
			
			priv.dataStore[dataSource].data = (function(o1,o2){
				var o0 = {};
				for (var attrname in o1) { o0[attrname] = o1[attrname]; }
				for (var attrname in o2) { o0[attrname] = o2[attrname]; }
				return o0;
			}(oldData, newData));
			
			//If there are changes to the data, call the listeners
			if (JSON.stringify(oldData) !== JSON.stringify(priv.dataStore[dataSource].data)){
				
				//Update localstorage
				if (priv.dataStore[dataSource].storeLocalCopy===true){
					pub.setStoredValue("dataStore__" + dataSource, priv.dataStore[dataSource].data);
				}
						
				priv.dataStore[dataSource].listeners.forEach(function(listener){
					pub.dataStore.query(dataSource, listener);
				});
			}			
			
		},
		
		removeData: function(dataSource, ids){
			
			if ( ! (dataSource in priv.dataStore) ){
				throw "pushData: Invalid data source";
			}
			
			if ( ids === null || typeof ids !== "object" || ids === undefined ){
				throw "pushData: invalid new data";
			}
			
			//Store the returned data
			var oldData = JSON.stringify(priv.dataStore[dataSource].data);
			
			//Delete each item by id
			for (var i in ids){
				if (priv.dataStore[dataSource].data[ids[i]]){
					delete priv.dataStore[dataSource].data[ids[i]];
				}
			}
			
			//If there are changes to the data, call the listeners
			if (oldData !== JSON.stringify(priv.dataStore[dataSource].data)){
				
				//Update localstorage
				if (priv.dataStore[dataSource].storeLocalCopy===true){
					pub.setStoredValue("dataStore__" + dataSource, priv.dataStore[dataSource].data);
				}
				
				priv.dataStore[dataSource].listeners.forEach(function(listener){
					pub.dataStore.query(dataSource, listener);
				});
			}			
			
		},
		
		addListener: function(dataSource, config, handler, forceFreshFirstData){
			
			if ( ! (dataSource in priv.dataStore) ){
				throw "addListener: Invalid data source";
			}

			if (typeof handler !== "function"){
				throw "addListener: Handler isn't a function";
			}
			
			//Attach the config
			handler.config = config;
			
			//Has this handler already been added?
			if (priv.dataStore[dataSource].listeners.indexOf(handler)!==-1){
				return handler;
			}			
			
			//Add it to the list
			priv.dataStore[dataSource].listeners.push(handler);
			
			//If data exists, call it straight away
			if ("lastFetch" in priv.dataStore[dataSource] && priv.dataStore[dataSource].lastFetch>0){

				//Even if we have data, should we foracbly refresh it?
				if (typeof config !== "undefined" &&  config !== null && "forceFreshData" in config && config.forceFreshData===true){
					this.manualFetch(dataSource, handler);
					return handler;
				}
				
				//Send the latest data we have stored
				this.query(dataSource, handler);
				
				//Restart the queue timer to get latest data ASAP
				if (typeof config !== "undefined" &&  config !== null && "resetTimer" in config && config.resetTimer===true){
					this.stopFetcher(dataSource);
					this.startFetcher(dataSource);
				} 
				
				
			}
			
			return handler;
			
		},
		
		removeListener: function(dataSource, handler){
			
			if ( ! (dataSource in priv.dataStore) ){
				throw "removeListener: Invalid data source";
			}

			if (typeof handler !== "function"){
				console.log("removeListener: Warning handler isn't a function");
				return true;
			}
			
	
			//Does the callback exist?
			if (priv.dataStore[dataSource].listeners.indexOf(handler) ===-1){
				return false;
			}
			
			//Remove the listener
			priv.dataStore[dataSource].listeners.splice(
				priv.dataStore[dataSource].listeners.indexOf(handler),
				1
			);			
		}
	}
	
	
	return constructor;
	
}(window, document));