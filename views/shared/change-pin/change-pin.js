/* global u,app,controller */
u.waitForObjects(["controller", "controller.api"], function(){

    controller.registerView("change-pin", "/account/change-pin", function(viewVariables){
    
        var self = this,
        	returnData = null,
            form = this.container.querySelector("form"),
            currentPassword,
            password = this.container.querySelector("input[type=password]"),
            passwordContainer = this.container.querySelector(".passwordContainer"),
            newPin = this.container.querySelector(".newPin span"),
            newPinContainer = this.container.querySelector(".newPin"),
            errorBox = self.container.querySelector(".detailsError");
            
            
     	//Link form inputs to validateData
        u.form.linkInputsToValidator(form);
        
        //Setup form to submit via api
        form.onsubmit = submit; 
        
        function submit(e){
        	if (e){
				e.preventDefault();
        	}

			//Check validity of form
			if (!u.form.validate(form)){
			    return false;
			}
			
			errorBox.innerHTML = "";
			
				
			//collect the data
			var data = u.form.getValues(form);
			
			if (data.currentPassword == "" && currentPassword){
				data.currentPassword = currentPassword;
			}
			
			if (!("currentPassword" in data) || typeof data.currentPassword !== "string"){
				passwordContainer.classList.remove("display-none");
				errorBox.innerHTML = "Please enter a password to continue.";
				password.focus();
				return;
			}
		
			
			u.loading.push();
			
			self.authenticatedApiRequest(
			    "accounts/changePin", 
			    data, 
			    function(response){
				    u.loading.pop();
				    
				    returnData = response;
				    
				    if (typeof self.variables === "object" && self.variables !== null && "showWelcome" in self.variables && self.variables.showWelcome === true){
				    	self.close();	
				    }
				    form.reset();
				    
					errorBox.innerHTML = "Your account pin has been updated.";
				    
				}, 
				function(response){
					passwordContainer.classList.remove("display-none");
					u.standardFailureHandler(errorBox, form)(response);
				}
			);
        }        
        
        
        
        if (typeof self.variables === "object" && self.variables !== null && "currentPassword" in self.variables){
        	if ("showWelcome" in self.variables && self.variables.showWelcome === true){
        		self.container.querySelector(".welcomeMessage").classList.remove("display-none");
        		self.container.querySelector("h2").classList.add("display-none");
        	}
        	password.value = currentPassword = self.variables.currentPassword;	
        	passwordContainer.classList.add("display-none");
        }
        
		self.render();
		
        //Define things to do before closing
    	this.beforeClose = function(){
    		form.reset();
    		if ("sideChannel" in self && typeof self.sideChannel === "function" && returnData !== null){
		    	self.sideChannel(returnData);
		    }
    	};
    }, {
        requireAuthorizedUser: true
    });
});