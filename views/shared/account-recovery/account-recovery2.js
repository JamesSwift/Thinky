/* global u,app,controller */

var self = this,
	form = this.container.querySelector("form"),
	updateError = self.container.querySelector(".updateError"),
	recoverySecurityQuestions = self.container.querySelector(".recoverySecurityQuestions"),
	successMessage = self.container.querySelector(".recoverySuccessMessage"),
	invalidCode = self.container.querySelector(".invalidCode");
	
//Confirm that the recovery code is valid
u.waitForObjects([[self,"api"]], function(){
	try {
		controller.api.request(
			"accounts/validateRecoveryCode", self.variables, 
			function(response){
				
				//Show main form
				form.style.display="block";
				
				//Setup additional security questions?
				if (typeof response === "object"){
					
					//Load the questions into the form
					for (var prop in response){
						if (!response.hasOwnProperty(prop)){
							continue;
						}
						
						recoverySecurityQuestions.querySelector("." + prop ).innerHTML = response[prop];
					}
					
				} else {
					
					//Delete the security Question section of the form
					recoverySecurityQuestions.parentNode.removeChild(recoverySecurityQuestions);
					
				}
				
				self.render();	
			},
			function (response){
				
				//Check if serious error occurred
				if (typeof response !== "object" || "SWDAPI-Error" in response){
					return controller.createModal("<h2>Error</h2><p>A problem occurred while trying to check your recovery URL. Please try clearing your browser data and refreshing the page.").render();
				} 
				
				invalidCode.style.display="block";
				
				self.render();
			}
		);
	} catch (e){
		self.render();
		controller.createModal("<h2>Error</h2><p>A problem occurred while trying to check your recovery URL. Please try clearing your browser data and refreshing the page.").render();
	}
	
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
	
	updateError.innerHTML = "";
	
	u.loading.push();
		
	//collect the data
	var data = u.form.getValues(form);
	data.id = self.variables.id;
	data.code = self.variables.code;

	try {
		controller.api.request(
			"accounts/recoveryResetPassword", data, 
			function(response){
				u.loading.pop();
				form.style.display="none";
				successMessage.style.display="block";
				app.login("Your password has been reset. Please log in with your new password.", function(){
					var user = controller.getUserPermissions();
					controller.navigateTo("/accounts/"+user.id);
					controller.createModal("<h3>Review Your Information</h3>If it has been a long time since you last logged in, you may wish to review your account information and ensure it is up to date.").render();
				});
				
			}, 
			function(response){
				u.loading.pop();
				if ("ValidationErrors" in response){
					u.form.handleServerResponse(form, response["ValidationErrors"]);
				} else if ("AppError" in response || "SWDAPI-Error" in response){
					updateError.innerHTML = u.escapeHTML((response["AppError"] || response["SWDAPI-Error"]).message);
				} else {
					updateError.innerHTML = u.escapeHTML(JSON.stringify(response));
				}
			}
		);
	} catch (e){
		u.loading.pop();
		updateError.innerHTML = u.escapeHTML(e);
	}
}

//Define things to do before closing
this.beforeClose = function(){
	form.reset();
}