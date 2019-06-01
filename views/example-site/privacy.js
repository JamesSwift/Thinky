/* global u,controller */
u.waitForObjects(["controller"], function(){

    controller.registerView("privacy", "/privacy", function(viewVariables){
    
    	this.render();
  
    });
});