/* global u,controller,app,grecaptcha */

//Dependancies
u.loadExternal("https://www.google.com/recaptcha/api.js?render=explicit");    


var self = this,
	form = this.container.querySelector("form"),
	recaptchaDiv = self.container.querySelector(".recaptcha-area"),
	updateError = self.container.querySelector(".updateError"),
	emailSent = self.container.querySelector(".emailSent"),
	emailForm = self.container.querySelector(".emailForm"),
	recaptchaID;
	
//Setup ReCaptcha
u.waitForObjects(["grecaptcha.render"], function(){
	recaptchaID = grecaptcha.render(
		recaptchaDiv,
		{sitekey:"___"}
	);
	self.container.querySelector("input[type=submit]").disabled = false;
});

//Link form inputs to validateData
u.form.linkInputsToValidator(form);

//Setup form to submit via api
form.onsubmit = function(e){
	e.preventDefault();

	//Check validity of form
	if (!u.form.validate(form)){
		return false;
	}

	//Check reCaptcha			
	var response = grecaptcha.getResponse(recaptchaID);
	if (recaptchaID === undefined || response==""){
		alert("Please complete the reCAPTCHA box.");
		return false;
	}			
	
	updateError.innerHTML = "";
	emailSent.style.display="none";
	
	//collect the data
	var data = u.form.getValues(form);
	data.recaptchaResponse = response;

	try {
		u.loading.push();
		controller.api.request(
			"accounts/sendRecoveryEmail", data, 
			function(response){
				u.loading.pop();
				emailForm.style.display="none";
				emailSent.style.display="block";
				setTimeout(function(){updateError.innerHTML ="" }, 5000);
			}, 
			function(response){
				u.loading.pop();
				grecaptcha.reset(recaptchaDiv.recaptchaID);
				if ("ValidationErrors" in response){
						u.form.handleServerResponse(form, response["ValidationErrors"], updateError);
				} else if ("AppError" in response || "SWDAPI-Error" in response){
					updateError.innerHTML = u.escapeHTML((response["AppError"] || response["SWDAPI-Error"]).message);
				} else {
					updateError.innerHTML = u.escapeHTML(JSON.stringify(response));
				}
			},
			null
		);
	} catch (e){
		u.loading.pop();
		updateError.innerHTML = u.escapeHTML(e);
	}
};        

//Display the page
self.render();

//Define things to do before closing
this.beforeClose = function(){
	form.reset();
	//Remove the recaptcha container
	recaptchaDiv.innerHTML = "";
	grecaptcha.reset(recaptchaID);    	    
}
