/* global u,app,controller */
u.waitForObjects(["controller", "controller.api"], function(){

    controller.registerView("about", "/about", function(viewVariables){
    
        var self = this;
    
        self.render();

    });
});