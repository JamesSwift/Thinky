/* global u,app,controller */

var self = this,
	logOut = self.container.querySelector(".logOut"),
	name = self.container.querySelector(".name"),
	h2 = self.container.querySelector("h2"),
	p = self.container.querySelector("p"),
	chanegPin = self.container.querySelector(".changePin");

if (self.variables.userID === "0"){
	return controller.navigateTo("/accounts/"+self.getActiveUser()+"/contact-details");
}


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
			return controller.navigateTo("/accounts/"+data.userID);
		}
		
		name.innerText = data.firstName;

		//If we are viewing someone else's account, change formatting
		if (data.userID*1 !== self.getActiveUser()*1){
			h2.innerText = data.fullName+"'s Account";
			p.classList.add("display-none");
			self.container.querySelectorAll("ul")[1].classList.add("display-none");
			self.container.querySelectorAll("ul")[2].classList.add("display-none");


			As = self.container.querySelectorAll("a");
			for (var a in As){
				if (!As.hasOwnProperty(a)) continue;
				As[a].innerText = As[a].innerText.replace("your ", "");
			}
		}
		
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
