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
	
	errorBox.innerHTML = "";
	
	u.loading.push();
		
	//collect the data
	var data = u.form.getValues(form);

	self.authenticatedApiRequest(
		"accounts/changePassword", 
		data, 
		function(response){
			u.loading.pop();
			errorBox.innerHTML = "Your new password has been saved.";
			form.reset();
			form.style.display="none";
		}, 
		u.standardFailureHandler(errorBox, form)
	);
}        

self.render();

//Define things to do before closing
this.beforeClose = function(){
	form.reset();   
}