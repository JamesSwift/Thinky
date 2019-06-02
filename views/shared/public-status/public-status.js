/* global u,app,controller */
u.waitForObjects(["controller", "controller.api"], function(){

    controller.registerView("public-status", "/business-management/:businessID/public-status", function(viewVariables){

        var self = this,
        
            openingInfo = null,
            openingInterval = null,
            opening = this.container.querySelector(".opening"),
            openEarly = this.container.querySelector(".openEarly"),
            closeEarly = this.container.querySelector(".closeEarly"),
            resumeSchedule = this.container.querySelector(".resumeSchedule"),
            overrideSchedule = this.container.querySelector(".overrideSchedule"),
            resetSchedule = this.container.querySelector(".resetSchedule"),
            
            thisBiz;
     
        if (self.variables === null || self.variables === undefined){
	    	self.errorSwitchView("/404");
	    	return false;        	
        }

	    //Redirect away if we are not allowed to edit
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
        }
        
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
    	        
    	        self.container.querySelector("img").src = thisBiz.logo;
    	        
    	        //Display opening info
    	        startOpeningInterval();
    	        
    	        //Show the view
    	        self.render();
			}
		);

        
		function startOpeningInterval(){
        	
        	clearTimeout(openingInterval);
    	
    		opening.innerHTML = "";
    		
    		openingInfo = u.findNextAvailableTime(thisBiz);
    		
    		if (thisBiz.public === 0){	
    			opening.innerHTML += "BUSINESS IS HIDDEN FROM PUBLIC";
    			openEarly.disabled = true;
    			closeEarly.disabled = true;
    			
    			overrideSchedule.classList.add("display-none");
    			resetSchedule.classList.add("display-none");
    			return;
    		}
    		
    		if (	(thisBiz.openUntil !== null && new Date(thisBiz.openUntil+ " UTC").getTime() > Date.now() ) ||
    				(thisBiz.closedUntil !== null && new Date(thisBiz.closedUntil+ " UTC").getTime() > Date.now() )
    		){
    			overrideSchedule.classList.add("display-none");
    			resetSchedule.classList.remove("display-none");
    		} else {
    			overrideSchedule.classList.remove("display-none");
    			resetSchedule.classList.add("display-none");
    		}
    		
    		
    		if (openingInfo === false || openingInfo.seconds>1){
    			opening.innerHTML += "<span>CLOSED</span>";
    			openEarly.disabled = false;
    			closeEarly.disabled = true;
    		}
    		if (openingInfo.seconds>1) {
    			opening.innerHTML += " Opening in " + openingInfo.openingIn;
    			opening.innerHTML += " ("+ openingInfo.start.substring(0,2) + ":"
    			opening.innerHTML += openingInfo.start.substring(2,4) + ")";
    		}
    		if (openingInfo.seconds<1) {
    			opening.innerHTML += "<b>OPEN</b> Closing in " + openingInfo.closingIn;
    			
    			opening.innerHTML += " ("+ openingInfo.finish.substring(0,2) + ":"
    			opening.innerHTML += openingInfo.finish.substring(2,4) + ")";
    			
    			
    			openEarly.disabled = true;
    			closeEarly.disabled = false;
    		}
    		
        	openingInterval = setTimeout(startOpeningInterval, 10000);	
        	
        }
        
        closeEarly.onclick = function(){
        	controller.openViewAsModal("override-schedule", {
        		businessID: self.variables.businessID,
        		action: "close"
        	});
        }
        
        openEarly.onclick = function(){
        	controller.openViewAsModal("override-schedule", {
        		businessID: self.variables.businessID,
        		action: "open"
        	});
        }
        
        resumeSchedule.onclick = function(){
        	controller.openViewAsModal("override-schedule", {
        		businessID: self.variables.businessID,
        		action: "resume"
        	});
        }
        
        //Define things to do before closing
    	this.beforeClose = function(){
    		controller.dataStore.removeListener("businesses", listener);
    		clearTimeout(openingInterval);
    	}
    }, {
        requireAuthorizedUser: true
    });
});