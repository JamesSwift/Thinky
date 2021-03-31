/* global u,app,controller */

var self = this,
	form = self.container.querySelector("form");

var data = controller.getStoredValue("settings");

u.form.loadValues(form, data);

self.render();

form.onsubmit = function(e){
	e.preventDefault();
		
	if (!u.form.validate(form)) return false;
	
	controller.setStoredValue("settings", u.form.getValues(form));
}
