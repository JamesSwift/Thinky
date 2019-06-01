/* global u,app,controller */
u.waitForObjects(["controller", "controller.api"], function(){

    controller.registerView("business-management", "/business-management/:businessID", function(viewVariables){

        var self = this,
            form = this.container.querySelector("form"),
            errorBox = self.container.querySelector(".detailsError"),
            
            scheduleData,
            thisBiz;
                 
        if (self.variables === null || self.variables === undefined){
	    	self.errorSwitchView("/404");
	    	return false;        	
        }

	    self.getAuthToken(
	    	function(token){
		    	if (controller.employee.getPermissions(token, parseInt(self.variables.businessID))===false){
		    		self.errorSwitchView("/403");
		    	}
	    	},
	    	function(){
	    		self.errorSwitchView("/403");
	    	}
	    );

        //Show an error when loading data goes wrong
        var loadError = function(){
        	self.errorSwitchView("/404");
       		controller.createModal("<h2>Error</h2><p>An error occurred while trying to load the details for this business.</p>").render();

            return false;
        };
        
        //Add the schedule link
        self.container.querySelector(".schedule").onclick = function(){
	    	controller.openViewAsModal("edit-schedule", {data: scheduleData}, function(data){
	    		scheduleData = data;
	    		return true;
	    	});	
	    };
        
		var listener = controller.dataStore.addListener(
			"businesses",
			{	filters:{ id: self.variables.businessID},
				singleResult: true
			}, 
		    function(all){			    	
			    
			    thisBiz = all;
			    
			    //Check we got a valid response
				if (typeof thisBiz !== "object"){
					return loadError();
    	        }
    	        
    	    	//Fill in form details
    	        u.form.updateValues(form, thisBiz);
    	        self.container.querySelector("img").src = thisBiz.logo;
    	        self.container.querySelector("input[type=submit]").disabled = false;
    	        
    	        scheduleData = thisBiz.schedule;
    	        
    	        var connect = self.container.querySelector(".stripe-connect");
    	        var connected = self.container.querySelector(".stripe-connected");
    	        connect.href = "https://connect.stripe.com/oauth/authorize?response_type=code&client_id=" +
    	        				encodeURIComponent(controller.getStripeKeys().clientID)
    	        				+"&scope=read_write" +
    	        				"&state=" + encodeURIComponent(self.variables.businessID);
    	        
    	        if (thisBiz.stripeUserID === null){
    	        	connect.classList.remove("display-none");
    	        	connected.classList.add("display-none");
    	        } else {
    	        	connect.classList.add("display-none");
    	        	connected.classList.remove("display-none");
    	        }
    	        
    	        //Show the view
    	        self.render();
			}
		);
		
     	//Link form inputs to validateData
        u.form.linkInputsToValidator(form);

        //Setup form to submit via api
        form.onsubmit = function(e){
			e.preventDefault();

			//Check validity of main form
			if (!u.form.validate(form)){
			    return false;
			}
			
			errorBox.innerHTML = "";
				
			//collect the data
			var data = u.form.getValues(form);
			data.businessID = self.variables.businessID;
			
			data.schedule = scheduleData;
	
			//Send the request
			u.loading.push();
			
			self.authenticatedApiRequest(
			    "businesses/updateDetails", data, 
			    function(response){
			    	
			    	var saveData = {};
		    		saveData[response.id] = response;
		    		controller.dataStore.pushData("businesses", saveData);
		    		
				    u.loading.pop();
   			    	errorBox.innerHTML = "Your changes have been saved.";
				}, 
				u.standardFailureHandler(errorBox, form),
				{ getPasswordFor: self.getActiveUser() }
		    );
		
        };
        
        
        //Define things to do before closing
    	this.beforeClose = function(){
    		controller.dataStore.removeListener("businesses", listener);
    	};
    }, {
        requireAuthorizedUser: true
    });
});