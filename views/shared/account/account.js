/* global u,app,controller */

var self = this,
	logOut = self.container.querySelector(".logOut"),
	name = self.container.querySelector(".name"),
	chanegPin = self.container.querySelector(".changePin");


logOut.onclick = function(){
	if ("logout" in app){
		app.logout();
	} else {
		controller.multiUserLogout();
		if ("close" in self){
			self.close();
		}
	}
}

var user = controller.getUserPermissions();
if (user !== null && user.permissions !== null && typeof user.permissions === "object" &&  "employee" in user.permissions){
	chanegPin.classList.remove("display-none");
}

//Start preloading data?
self.authenticatedApiRequest("accounts/fetchContactDetails",
	{
		userID: self.variables.userID*1
	},
	function(data){
		
		if (typeof data !== "object"){
			console.warn("Could not load account details.");
			return self.render();
		}
		
		if (data.userID*1 !== self.variables.userID*1){
			controller.navigateTo("/accounts/"+data.userID);
		}
		
		name.innerText = data.firstName;
		
		if (data.email === data.verifiedEmail){
			self.container.querySelector(".verify").classList.add("display-none");
		}
		
		self.applyLinkTemplate({
			userID: data.userID
		});
		self.render();
	},
	function(){
		self.errorSwitchView("/403");
	}
);    
