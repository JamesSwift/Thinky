/* global u,controller,app */

var self = this,
	form = this.container.querySelector("form"),
	verifyVerified = self.container.querySelector(".verifyVerified"),
	verifyFailed = self.container.querySelector(".verifyFailed"),
	updateError = self.container.querySelector(".updateError");
	
	
	
//Check if already verified
try {
	controller.api.request(
		"accounts/completeEmailVerification", self.variables, 
		function(response){
			if (response === true){
				verifyVerified.style.display = "block";
			} else {
				verifyFailed.style.display = "block";
			}
			self.render();
		}, 
		function(){
			verifyFailed.style.display = "block";
			self.render();
		}
	);
} catch (e){
	verifyFailed.style.display = "block";
	updateError.innerHTML = "Error";
	console.log("Error", e);
	self.render();
}
