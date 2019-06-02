/* global u,app,controller */

var self = this,
	thisBiz,
	search,
	form = this.container.querySelector("form"),
	errorBox = self.container.querySelector(".errorBox"),
	nextTime = self.container.querySelector(".nextTime"),
	override = self.container.querySelector(".override"),
	note = self.container.querySelector(".note"),
	sch = self.container.querySelector(".schedule"),
	dt = self.container.querySelector(".date");        	

if (self.variables === null || self.variables === undefined || typeof self.variables !== "object" || !("businessID" in self.variables) ){
	self.errorSwitchView("/404");
	return false;        	
}

if (!("action" in self.variables) || ["close","open","resume"].indexOf(self.variables.action) === -1){
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

//Switch the page text to match action
override.classList.add("action-" + self.variables.action);
if (self.variables.action === "open"){
	self.container.querySelector(".override>h2").innerHTML = "Open Early";
	self.container.querySelector(".override input[type=submit]").value = "Open Early";
	self.container.querySelector(".question").innerHTML = "How long will you be open?";
	
} else if (self.variables.action === "resume"){
	override.classList.add("display-none");
	self.container.querySelector(".resume").classList.remove("display-none");
	
}

//Show the hint	
dt.onchange = sch.onchange = function(){
	if (dt.checked){
		note.classList.remove("display-none");
	} else {
		note.classList.add("display-none");
	}
};

//Change if date entered
self.container.querySelector("input[type=date]").onclick = self.container.querySelector("input[type=time]").onclick = 
self.container.querySelector("input[type=date]").onchange = self.container.querySelector("input[type=time]").onchange = function(){
	sch.checked = false;
	dt.checked = true;
	dt.onchange();
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
			return self.errorSwitchView("/404");
		}
		
		search = u.findNextAvailableTime(thisBiz, undefined, true);
		if (search === false || search.seconds<120){
			dt.checked = true;
			sch.disabled = true;
			dt.onchange();
		} else {
			nextTime.innerHTML = 
				search.day[0].toUpperCase()+search.day.substr(1) + " " + 
				search.start.substring(0,2) + ":" +
				search.start.substring(2,4) +
				" (" + search.openingIn + ")";
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
	data.overrideAction = self.variables.action;

	if (data.overrideUntil === "scheduled"){
		data.date = search.date;
		data.time = search.start.substring(0,2) + ":" +	search.start.substring(2,4);
	} 
	
	//Check date format
	if (!(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2]\d|3[0-1])$/.test(data.date)) || isNaN((new Date(data.date)).getTime())){
		
		errorBox.innerHTML = "Please enter a valid date: YYYY-MM-DD";
		return;
	}
	//Check date format
	if (!(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/.test(data.time)) || isNaN((new Date(data.date + "T"+data.time)).getTime())){
		errorBox.innerHTML = "Please enter a valid time: HH:MM";
		return;
	}
	
	//Send the request	
	u.loading.push();
	self.authenticatedApiRequest(
		"businesses/overrideSchedule", data, 
		function(response){
			
			var saveData = {};
			saveData[response.id] = response;
			controller.dataStore.pushData("businesses", saveData);
			
			u.loading.pop();
			errorBox.innerHTML = "Your changes have been saved.";
			if (self.url===null){
				self.close();
			}
		}, 
		u.standardFailureHandler(errorBox, form)
	);
};	



self.container.querySelector(".yes").onclick = function(){
	//Send the request	
	u.loading.push();
	self.authenticatedApiRequest(
		"businesses/overrideSchedule", {
			businessID: self.variables.businessID,
			overrideAction: "resume"
		}, 
		function(response){
			
			var saveData = {};
			saveData[response.id] = response;
			controller.dataStore.pushData("businesses", saveData);
			
			u.loading.pop();
			errorBox.innerHTML = "Your changes have been saved.";
			if (self.url===null){
				self.close();
			}
		}, 
		u.standardFailureHandler(errorBox, form)
	);
}

self.container.querySelector(".no").onclick = function(){
	if (self.url===null){
		self.close();
	}
}

//Define things to do before closing
this.beforeClose = function(){
	form.reset();
	controller.dataStore.removeListener("businesses", listener);
}
