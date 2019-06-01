/* global inputValidator,u,Controller */

"use strict";

var controller, app = (new function(){
    
    function startController(){
    	if (typeof controller !== "undefined") return true;
	    u.waitForObjects(["Controller"], function(){
	        controller = Controller({
	            appID: "www",
	            apiEndpoint: (function(){
	            	var host = window.location.hostname
	            	host = host.replace("app.", "");
	            	if (host.substr(0, 4) !== "www."){
	            		host = "www." + host;
	            	}
	            	host = "https://"+host+"/api/";
	            	console.log(host);
	            	return host;
	            }()),
	            dataValidator: inputValidator
	        });
	    });
    }
	
    this.getDefaultPermissions = function(){
    	return {"employee":"ALL"};
    }
    

    this.logout = this.login = function(callback){
		return true;
	};
	
	
	//Ok, let's do this
    startController();
    
    return {};
	
}());