/* global u,controller,app */

var self = this,
	form = this.container.querySelector("form"),
	verifyCompleted = self.container.querySelector(".verifyCompleted"),
	verifyForm = self.container.querySelector(".verifyForm"),
	verifySent = self.container.querySelector(".verifySent"),
	updateError = self.container.querySelector(".updateError");
	

//Check if already verified
u.loading.push();
self.authenticatedApiRequest(
	"accounts/checkEmailVerification", null, 
	function(response){
		u.loading.pop();
		if (response === true){
			verifyCompleted.style.display = "block";
		} else if (response === false){
			verifyForm.style.display = "block";
		} else {
			updateError.innerHTML = "Error communicating with server. Please check if you device is online.";
		}
	}, 
	u.standardFailureHandler(updateError, form)
);


//Setup form to submit via api
form.onsubmit = function(e){
	e.preventDefault();

	updateError.innerHTML = "";

	u.loading.push();
	self.authenticatedApiRequest(
		"accounts/sendEmailVerification", null, 
		function(response){
			u.loading.pop();
			verifyForm.style.display="none";
			if (response===true){
				verifySent.style.display="block";
			} else {
				verifyCompleted.style.display="block";
			}
			updateError.innerHTML = "";
		}, 
		u.standardFailureHandler(updateError, form)
	);

};

self.render();
