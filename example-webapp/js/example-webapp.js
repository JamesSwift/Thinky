/* global inputValidator,u,Controller */

"use strict";

var controller, app = (new function(){
    
    var self = this,
    	businesses = null,
    	authorizedBusinesses = null,
    	activeBusiness = null;
    
    
    //Setup controller for the website
    function startController(){
    	if (typeof controller !== "undefined") return true;
	    u.waitForObjects(["Controller"], function(){
	    	
			appPayload.apiEndpoint = (function(){
				var host = window.location.hostname
				host = host.replace("example-webbapp.", "www.");
				return "https://"+host+"/api/";				
			}());
			appPayload.dataValidator = inputValidator;
			appPayload.multiUserMode = true;
			appPayload.requireUserIsEmployee = true;
	    	
	        controller = Controller(appPayload);
	        
	        //Get active business
	        activeBusiness = parseInt(controller.getStoredValue("activeBusiness")) || null;
	        
	        //Update the lock indicator
	        if (document.querySelector(".menu .lockButton")){
				var lockExpiry = false;
				setInterval(function(){
					var button = document.querySelector(".lockButton");
					var expiry = controller.getSecondsTillLock();

					if (lockExpiry !== expiry){
						if (expiry !==null && expiry > 0){
							button.innerHTML = "🔓&#xFE0E; " + expiry;
							button.classList.remove("locked");
						} else {
							button.innerHTML = "🔒&#xFE0E;";
							button.classList.add("locked");
						}
					}
					lockExpiry = expiry;
				}, 200);
				
				document.querySelector(".menu .lockButton").onclick = function(){
					if (controller.isAuthenitcated()){
						controller.lock();
					} else {
						controller.unLock();
					}
				}
			}
	        
	    });
    }
    
	/////////////////
    //Link menu icons
    
    //Public Status
    document.querySelector(".statusButton").onclick = function(){
    	if (activeBusiness !== null){
    		controller.openViewAsModal("public-status", {businessID: activeBusiness});
    	} else if (authorizedBusinesses!== null && authorizedBusinesses.length>0){
    		controller.openViewAsModal("select-business");
    	} else {
    		controller.navigateTo("/authorize-client");
    	}
    };
    
    //Main Menu
    document.querySelector(".menuButton").onclick = function(){
    	
    	var businessID = parseInt(activeBusiness) || null;
    	
    	var modal = controller.createModal(
    		"<nav>"+
    		(businessID !== null ?
    		"<a href='/'>Overview</a>"+
    		"<a href='/business-management/"+businessID+"/' class='business'>Business Management</a>"
    		: 
    		"<a href='/authorize-client' class='business'>Authorize This Device</a>"
    		) +
    		"<a href='/accounts/0'>My Account</a>"+
    		"<a href='/settings' class='settings'>Device Settings</a>"+
    		"<a href='javascript:;' class='closeMenu'>Close Menu</a>"+
    		"</nav>",
    		"mainMenu",
    		true
    	);
    	
    	modal.querySelector(".closeMenu").onclick = modal.close;
		
		modal.render();
	};
	
	//Set a timer to auto reload once a day to ensure we on the latest api
	var lastReload = Date.now();
	setInterval(function(){
		var hour = new Date.getHours();
		if (Date.now() - lastReload > 1000*60*60*22 && hour >= 3 && hour <= 5){
			window.location.reload(true);
		}
	}, 1000*60*60);
	
	function checkActiveBusiness(callback, check){
    	
    	
        //Check what businesses this client is authorized on
        function clientError(data){
        	//Sometimes the client hasn't registered yet
        	if (typeof data === "object" && data !== null && "AppError" in data && data.AppError.code === 403240){
        		return setTimeout(function(){
        			checkActiveBusiness(callback, check);
        		}, 500);
        	}
    		return controller.createModal(
				"<h2>Client Authorization Error</h2><p>" +
				"An unexpected error occured while registering this device. Please try again." +
				"</p>"
			).render();
    	}
        try {
        	
        	controller.api.request(
        		"businesses/fetchAuthorizedBusinesses",
        		null,
        		function(response){
        			if (typeof response !== "object" || response === null || !("authorizedBusinesses" in response)) {
        				return clientError(response);
        			}
        			
        			authorizedBusinesses = response.authorizedBusinesses;
        			
        			if (typeof callback === "function"){
        				callback(authorizedBusinesses);
        			}
        			
        			if (check===false) return;
        			
        			//If this client is no longer authorized, display message and remove as default
        			if (activeBusiness !== null && (authorizedBusinesses === null || authorizedBusinesses.indexOf(activeBusiness) === -1) ){
        				activeBusiness = null;
						controller.setStoredValue("activeBusiness", null);
						monitorOpening();
						
        				controller.createModal(
        					"<h2>Client Not Authorized</h2>" +
        					"<p>"+
        					"This device is not authorized to receive orders for the previously selected business. You must connect it again." +
        					"</p>" 
        				).render();
        				
        				
        			//Prompt to select active business
        			} else if (activeBusiness === null && authorizedBusinesses !== null && authorizedBusinesses.length>0) {
        				controller.openViewAsModal("select-business");
        			
        			//Prompt to register client
        			} else if (activeBusiness === null && authorizedBusinesses === null){
        				//controller.navigateTo("/authorize-client");
        			}
        		},
        		clientError
        	);
        } catch (e){
        	clientError();
        }
        
	}
	
    //Listen for business status changes	
    var openingInterval, openingInfo,
    	status = document.querySelector(".statusButton>span");
	
	function monitorOpening(){
	    
    	clearTimeout(openingInterval);
    	openingInterval = setTimeout(monitorOpening, 5000);
    	
    	if (activeBusiness === null || !(activeBusiness in businesses)){
    		status.innerHTML = "CONNECT";
    		return;
    	}
    	
		var business = businesses[activeBusiness];
		
		openingInfo = u.findNextAvailableTime(business);

		if (business.public === 0){	
			status.innerHTML = "HIDDEN";
			status.classList.remove("open", "closed");
			status.classList.add("hidden");
			return;
		}
		
		if (openingInfo === false || openingInfo.seconds>1){
			status.innerHTML = "CLOSED";
			status.classList.remove("hidden", "open");
			status.classList.add("closed");
		} else if (openingInfo.seconds<1) {
			status.innerHTML = "OPEN";
			status.classList.remove("hidden", "closed");
			status.classList.add("open");
		}
			
    	
    }
    
    u.waitForObjects(["controller.api"], function(){
    	
    	//Make sure we are properly connected
    	checkActiveBusiness();
	    	
		controller.dataStore.addListener(
			"businesses",
			null, 
		    function(info){	
		    	
		        businesses = info;
		        
		        //Display opening info
		        monitorOpening();
			}
		);
		
    });    
    

    this.getDefaultPermissions = function(){
    	return {"employee":"ALL"};
    }
    
    this.getDefaultExpiry = function(){
    	return Math.floor(Date.now()/1000) + (60*60*24);
    };
    
    this.getDefaultTimeout = function(){
    	return 60*60*6;
    };

	this.getActiveBusiness = function(){
		return activeBusiness;
	}
	
	this.getConnectedBusinesses = function(callback){
		checkActiveBusiness(callback, false);
	}
	
	this.setActiveBusiness = function(id){
		activeBusiness = id;
		controller.setStoredValue("activeBusiness", id);
		
		checkActiveBusiness();
		monitorOpening();
		
	}
	
	//Ok, let's do this
    startController();
    
}());