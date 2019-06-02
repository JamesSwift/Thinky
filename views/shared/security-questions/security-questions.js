/* global u,app,controller */

var self = this,
	form = this.container.querySelector("form"),
	updateError = self.container.querySelector(".updateError"),
	currentQuestions = self.container.querySelector(".securityQuestions-cq");

var updateData = function(callback){
	
	var runCallback = function(){
		if (typeof callback === "function"){
			callback();
		}
	}
	
	self.authenticatedApiRequest(
		"accounts/fetchSecurityQuestions", null,
		function(data){
			
			//Check if questions haven't been set yet
			if (data === false){
				currentQuestions.style.display = "none";
				
			//Load the current questions
			} else if (typeof data === "object"){
				currentQuestions.style.display = "block";
				var cQs = currentQuestions.querySelectorAll("p>span");
				for (var i in cQs){
					if (cQs.hasOwnProperty(i)){
						cQs[i].innerHTML = data[i];
					}
				}
			}
			
			//Fire callback
			runCallback();	        	    	
			
		},
		runCallback
	);
};

//Start preloading data
updateData(function(){self.render();});
var updateDataInterval = setInterval(updateData, 20000);

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
	
	//collect the data
	var data = u.form.getValues(form);

	u.loading.push();
	
	self.authenticatedApiRequest(
		"accounts/updateSecurityQuestions",
		data, 
		function(response){
			u.loading.pop();
			updateError.innerHTML = "Changes have been saved";
			setTimeout(function(){updateError.innerHTML ="" }, 30000);
			form.reset();
			u.loading.push();
			updateData( function(){
				u.loading.pop();
			});
		}, 
		u.standardFailureHandler(updateError, form),
		{
			getPasswordFor: self.getActiveUser()
		}
	);
}        

//Define things to do before closing
this.beforeClose = function(){
	clearInterval(updateDataInterval);
}
