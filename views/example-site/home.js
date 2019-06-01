/* global u,app,controller */
u.waitForObjects(["controller", "controller.api"], function(){

    controller.registerView("home", "/", function(viewVariables){
    
        var self = this;
    
        
        self.render();

    	this.beforeClose = function(){
    		//nothing to do
    	}

    });
});