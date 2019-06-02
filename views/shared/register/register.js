/* global u,controller,app,grecaptcha */

//Dependancies
u.loadExternal("https://www.google.com/recaptcha/api.js?render=explicit");    

var self = this,
	recaptchaDiv = self.container.querySelector(".recaptcha-area"),
	form = self.container.querySelector("form"),
	recaptchaID;
	
//Setup ReCaptcha
u.waitForObjects(["grecaptcha.render"], function(){
	recaptchaID = grecaptcha.render(
		recaptchaDiv,
		{sitekey:"___"}
	);
	self.container.querySelector("input[type=submit]").disabled = false;
});
	
//Setup form to submit via api
form.onsubmit = function(e){
	e.preventDefault();
	
	var errorBox = self.container.querySelector(".registerError"),
		response = grecaptcha.getResponse(recaptchaID);

	//Check validity of form
	if (!u.form.validate(form)){
		return false;
	}
	
	//Check reCaptcha
	if (recaptchaID === undefined || response==""){
		alert("Please complete the reCAPTCHA box.");
		return false;
	}
	
	errorBox.innerHTML = "";
	
	u.loading.push();
		
	//collect the data
	var data = u.form.getValues(form);
	
	data.recaptchaResponse = response;
	
	u.waitForObjects(["controller.api"], function(){
		try {
			controller.api.request(
				"accounts/register", data, 
				function(response){
					u.loading.pop();
					
					//Reset the form
					form.reset();
					
					//Hide the form
					if (self.close){
						self.close();
					} else {
						controller.navigateTo("/");
						//Open modal
						controller.createModal("<h2>Account Created</h2><p>Your account has been created and you are now logged in.</p><p>Please check your inbox for the verification email we sent. You must verify your email address within seven days.</p>").render();
					}
					
					
					//Login in behind the scenes
					controller.api.login(data.email, data.newPassword, app.getDefaultPermissions());
				}, 
				u.standardFailureHandler(errorBox, form, function(){
					grecaptcha.reset(recaptchaID);
				})
			);
		} catch (e){
			u.loading.pop();
			errorBox.innerHTML = e;
		}
	});
}

//Link form inputs to validateData
u.form.linkInputsToValidator(form);

//Listen for logins, stop the form submitting, and redirect away
var redirectTimeout, 
loginListener = function(token){
	token = token || controller.isAuthenitcated();

	//Remove any previous redirect timers
	clearTimeout(redirectTimeout);
	
	//Dis/En-able the form
	if (token==null || token == false){
		self.container.querySelector("input[type=submit]").disabled = false;
	} else {
		self.container.querySelector("input[type=submit]").disabled = true;
		
		//Redirect using timeout in case login redirects to another page (this.beforeClose clears this timer)
		redirectTimeout = setTimeout(function(){
			controller.navigateTo("/account", 1000);
		});
	}
};
u.waitForObjects(["controller.api"], function(){
	controller.api.addListener("defaultToken", loginListener);
});
loginListener();

//Link the privacy to a modal
self.container.querySelector(".privacy").onclick = function(){
	console.log(controller.openViewAsModal("privacy"));
}

self.container.querySelector(".help-primaryPhoneNumber").onclick = function(){
	controller.createModal(
		"<h2>Privacy: Phone Number</h2>" +
		"<p>" + 
		"Although email is our primary way to contact you, we need your phone number so we can contact you quickly with questions about your repairs. We do not share this information with anyone else." + 
		"</p>"
	).render();
}

self.container.querySelector(".help-email").onclick = function(){
	controller.createModal(
		"<h2>Privacy: Email Address</h2>" +
		"<p>" + 
		"Your email address acts as your 'User Name' to log in with. We need your email address so we can send you updates about your repairs and account. Your email address won’t be shared with anyone else. We won't send you marketing messages." + 
		"</p>"
	).render();
}

//Render
this.render();

//Things to do before closing the view
this.beforeClose = function(){
	
	//Remove the recaptcha container
	recaptchaDiv.innerHTML = "";
	if (typeof grecaptcha !== "undefined"){
		grecaptcha.reset(recaptchaID);
	}
	
	//Reset form (to remove sensitive data)
	form.reset();
	
	//Remove listener
	controller.api.removeListener("defaultToken", loginListener);
	
	//Stop the redirect (if set)
	clearTimeout(redirectTimeout);
}