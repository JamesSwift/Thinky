/* global u,app,controller */

var self = this,
	form = this.container.querySelector("form"),
	errorBox = self.container.querySelector(".detailsError"),
	userID = self.variables.userID*1 || self.getActiveUser()*1,
	lastData;
	
var loadingError = function(data){
	form.className = "display-none";
	errorBox.innerHTML = "Error loading data from server."
	self.render();
};

if (data.userID === "0"){
	return controller.navigateTo("/accounts/"+self.getActiveUser()+"/contact-details");
}

//Start preloading data?
self.authenticatedApiRequest("accounts/fetchContactDetails", {userID: userID},
	function(data){
		
		if (typeof data !== "object"){
			return loadingError(data);
		}
		
		lastData = data;
		
		u.form.loadValues(form, data);

		if (userID !== self.getActiveUser()*1){
			self.container.querySelector("h2").innerText = data.fullName+"'s Contact Details";
		}

		form.className = "";
		self.render();
	},
	loadingError
);    

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
	
	//collect the data
	var data = u.form.getValues(form);
	
	data.userID = userID;
		
	u.loading.push();

	config = {};

	if (userID === self.getActiveUser()*1){
		config.getPasswordFor = self.getActiveUser()*1;
	}

	self.authenticatedApiRequest(
		"accounts/updateContactDetails", data, 
		function(response){
			u.loading.pop();
			if (lastData.email!==data.email){
				errorBox.innerHTML = "Changes have been saved. Please check your inbox for a link to verify your new email address.";
			} else {
				errorBox.innerHTML = "Changes have been saved";
			}
			setTimeout(function(){errorBox.innerHTML ="" }, 15000);
			lastData = data;
		}, 
		u.standardFailureHandler(errorBox, form),
		config
	);
}