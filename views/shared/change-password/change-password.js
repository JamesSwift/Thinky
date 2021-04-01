/* global u,app,controller */

var self = this,
	form = this.container.querySelector("form"),
	errorBox = self.container.querySelector(".detailsError");

	
//Link form inputs to validateData
u.form.linkInputsToValidator(form);

//Setup form to submit via api
form.onsubmit = function(e){
	e.preventDefault();

	//Check validity of form
	if (!u.form.validate(form)){
		return false;
	}
	
	//Find our tokenID
	self.getAuthToken(function(token){

		errorBox.innerHTML = "";
		
		u.loading.push();
			
		//collect the data
		var data = u.form.getValues(form);

		//Don't invalidate our token please, just all the others
		data.tokenID = token.id;

		self.authenticatedApiRequest(
			"accounts/changePassword", 
			data, 
			function(response){
				u.loading.pop();
				errorBox.innerHTML = "Your new password has been saved, and all other sessions have been logged out.";
				form.reset();
				form.style.display="none";
			}, 
			u.standardFailureHandler(errorBox, form)
		);
	});
}        

self.render();

//Define things to do before closing
this.beforeClose = function(){
	form.reset();   
}