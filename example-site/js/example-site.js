/* global jsSHA,navigator,inputValidator,u,Controller */

"use strict";

var controller, app = (new function(){

    var userToken = null,
    	gdprCookieName = "cookiesAndDataConsentV1";

    //Setup controller for the website
    function startController(){
    	if (typeof controller !== "undefined") return true;
	    u.waitForObjects(["Controller"], function(){
	        controller = Controller({
				appID: "example-site",
				platformName: "Thinky Example",
	            apiEndpoint: "/api/",
	            dataValidator: inputValidator
	        });
	    });
    }

    //Setup main menu
    document.querySelector("header .menuIcon").onclick = function(){
    	document.querySelector("header #menuMask").classList.add("slideIn");
    	document.querySelector("header #menu").classList.add("slideIn");
    }
    document.querySelector("header #menuMask").onclick = document.querySelector("header #menu").onclick = function(){
    	document.querySelector("header #menuMask").classList.remove("slideIn");
    	document.querySelector("header #menu").classList.remove("slideIn");
    }

	//User Management
    u.waitForObjects(["controller.api"], function(){

    	//Update the UI when a user logs in or out
        controller.api.addListener("defaultToken", function(newToken){

        	//Keep a copy of the token in memory
        	userToken = newToken;
			
        	//Trigger change in UI
        	if (newToken === null){
        		u.elm("userMenu-out").classList.remove("display-none");
    			u.elm("userMenu-in").classList.add("display-none");
        	} else {
				u.elm("accountsLink").href="/accounts/"+userToken.uid;
        		u.elm("userMenu-out").classList.add("display-none");
    			u.elm("userMenu-in").classList.remove("display-none");
        	}
        });



    });


    this.getDefaultPermissions = function(){
    	return {"employee":"ALL"};
    }


    this.logout = function(callback){

		if (userToken===null){
			console.log("Can't logout, not logged in.");
			return false;
		}

		var handler = function(response){
			u.loading.pop();
			if (response !== true){
				controller.createModal(
					'<h2>Logout</h2>'+
					'<p>There was a problem while trying to log out. Please try again.</p>'
				).render();
			} else {
				controller.navigateTo("/");
			}
		};


		u.loading.push();
		u.waitForObjects(["controller.api"], function(){
			try {
				controller.api.logout(handler);
			} catch (e){
				handler(false);
			}
		});

		return true;
	};

	this.login = (function(){

		var modal;

		return function(message, callback){
			//Already logged in
			if (userToken!==null){
				var error = controller.createModal(
					'<h2>Login</h2>'+
					'<p>You are already logged in.</b></p>' +
					'<p><a id="loginLogoutLink" href="javascript:void(0)">Logout</a></p>'
				);

				error.render();

				u.elm("loginLogoutLink").onclick = function(){
					error.close();
					app.logout();
				};

				return false;

			}

			//If already open ignore the request
			if (modal && modal.classList.contains("fadeIn")){
				return null;
			}

			//Create a new modal
			modal = controller.createModal(
				'<h2>Login</h2><form id="loginForm"><table>' +
				( message ? '<p class="loginGreeting">' + u.escapeHTML(message) + '</p>' : "" ) +
				'<tr><td>Email:<td><input type="text" name="username" id="username" data-required="true" /><br/>' +
				'<tr><td>Password:<td><input type="password" name="currentPassword" id="currentPassword" data-required="true" /><br/>' +
				'</table>' +
				'<input type="submit" value="Login"/> '+
				'<span><label for="loginRemember">Remember me:</label> <input type="checkbox" id="loginRemember" /></span>' +
				'<p><a href="/account/recovery">Forgot your password?</a></p>' +
				'<div id="loginError" class=""></div>' +
				'</form>'
			, "login");

			u.form.linkInputsToValidator(modal);

			var responseHandler = function(response){
				u.loading.pop();
				if (typeof response["SWDAPI-Error"] === "undefined"){
					modal.close();
					if (typeof callback === "function"){
						callback();
					}
				} else {
					u.elm("loginError").innerHTML = response["SWDAPI-Error"].message;
					u.fadeIn("loginError");
				}

			};

			if (controller.getStoredValue("rememberLogin")===true){
			    u.elm("loginRemember").checked = true;
			}

			u.elm("loginForm").onsubmit=function(e){
				e.preventDefault();
				if (!u.form.validate(modal)){
					return false;
				}

				u.fadeOut("loginError");
				u.loading.push();

				controller.setStoredValue("rememberLogin", (u.elm("loginRemember").checked === true));


				u.waitForObjects(["controller.api"], function(){
					try {
						controller.api.login(u.elm("username").value, u.elm("currentPassword").value, responseHandler, app.getDefaultPermissions());
					} catch (e){
						u.elm("loginError").innerHTML = e;
						u.fadeIn("loginError", false);
						u.loading.pop();
					}
				});

			};

			u.elm("currentPassword").onfocus = u.elm("username").onfocus = function(){
				u.fadeOut("loginError", false);
			};

			modal.render();

			u.elm("username").focus();

			return true;
		};
	})();


	//Cookie Message, Displayed first time site is loaded
    this.showCookieOptions = function(reload){

    	document.getElementById("mask").classList.remove("display-none");
    	document.getElementById("gdprConsent").classList.remove("display-none");

    	if (typeof reload === "undefined"){
    		reload = true;
    	}

    	var mores = document.querySelectorAll(".more");
    	mores[0].onclick = mores[1].onclick = function(){
    		this.parentElement.querySelector("ul").classList.toggle("slideDown");
    	}
    	mores[2].onclick = function(){
    		this.parentElement.querySelector(".other-buttons").classList.toggle("slideDown");
    	}

    	var cookie = new Date;
			cookie.setFullYear(cookie.getFullYear() + 2);

    	document.querySelector("#gdprConsent .all").onclick = function(){
			document.cookie = gdprCookieName + '=all; path=/; expires=' + cookie.toGMTString( ) + ';';
			startController();
			hideCookieOptions(reload);
    	}

    	document.querySelector("#gdprConsent .essential").onclick = function(){
			document.cookie = gdprCookieName + '=essential; path=/; expires=' + cookie.toGMTString( ) + ';';
			//ToDo: when analytics added, make this remove those specific cookies
			startController();
    		hideCookieOptions(reload);
    	}

    	//Remove any cookies previously set
    	document.querySelector("#gdprConsent .none").onclick = function(){

			var d = new Date();
			d.setFullYear(2012);
			var expires = d.toGMTString();
		    var cookies = document.cookie.split(";");
		    for (var i = 0; i < cookies.length; i++){
		        var spcook =  cookies[i].split("=");
		        document.cookie = spcook[0] + '=; path=/; expires='+expires+';';
		    }
		    window.localStorage.clear();
		    window.sessionStorage.clear();
		    if (reload==false){
		    	alert(	"You may continue to use this website without cookies, but it will not function properly without essential cookies.\n\n"+
		    			"As you have asked us not to set any cookies, we are unable to store your preference in this regard, and so you will be prompted on every page to choose again.");
		    }
		    hideCookieOptions(reload);
    	}
    }

    function hideCookieOptions(reload){
    	document.getElementById("mask").classList.add("display-none");
    	document.getElementById("gdprConsent").classList.add("display-none");
    	if (reload === true){
    		window.location.reload();
    	}
    }

    function getCookie(name) {
		var value = "; " + document.cookie;
		var parts = value.split("; " + name + "=");
		if (parts.length == 2) return parts.pop().split(";").shift();
	}

    //Seek user consent before running the controller
    //as this will set some localStorage/cookies which could violate
    //a strict interpretation of GDPR
    if (document.cookie.indexOf(gdprCookieName) >= 0){
    	startController();
    	if (getCookie(gdprCookieName)==="all"){
    		//include analytics
    	}
    } else {
		this.showCookieOptions(false);
    }

}());
