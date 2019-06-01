/* global u,app,controller */
u.waitForObjects(["controller", "controller.api"], function(){

	controller.registerView("account-details", "/accounts/:userID/contact-details", function(viewVariables){
    
        var self = this,
            form = this.container.querySelector("form"),
            errorBox = self.container.querySelector(".detailsError"),
            lastData;
            
        var loadingError = function(data){
	        form.className = "display-none";
	        errorBox.innerHTML = "Error loading data from server."
	        self.render();
    	};
        
        
    	//Start preloading data?
    	self.authenticatedApiRequest("accounts/fetchContactDetails", null,
    	    function(data){
    	        
    	        if (typeof data !== "object"){
    	            return loadingError(data);
    	        }
    	        
    	        lastData = data;
    	        
    	        u.form.loadValues(form, data);
    	        
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
			
				
			u.loading.push();
	
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
				{
					getPasswordFor: lastData.userID
				}
			);
        }
     
    }, {
        requireAuthorizedUser: true
    });
});