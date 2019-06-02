/* global u,controller */

var self = this,
	current = "loading",
	vars = u.getURLVariables(),
	timer;
	

function switchTo(id){
	console.log(id);
	self.container.querySelector("."+current).classList.add("display-none");
	self.container.querySelector("."+id).classList.remove("display-none");
	current = id;
	self.render();
}			
	
if (vars === null || typeof vars !== "object" || "error" in vars || !("state" in vars) || !("code" in vars)){
	return switchTo("error");
}

function err(message){
	self.container.querySelector(".error").textContent = u.failureMessageExtract(message);
	switchTo("error");
}

//Check if already verified

setTimeout(function(){
	self.authenticatedApiRequest(
		"businesses/connectStripeAccount", {
			businessID: vars.state || null,
			stripeCode: vars.code
		}, 
		function(response){
			if (response === true){
				switchTo("connected");
				timer = setTimeout(function(){
					controller.navigateTo("/business-management/"+encodeURIComponent(vars.state));
				}, 2000);
			} else {
				err(response);
			}
		}, 
		err
	);
}, 1000);

self.beforeClose = function(){
	clearTimeout(timer);
}