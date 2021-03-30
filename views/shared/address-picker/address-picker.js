/* global u,app,controller */

var self = this,
	editData = null,
	saved = self.container.querySelector(".saved"),
	addresses = self.container.querySelector(".addresses"),
	create = self.container.querySelector(".create"),
	form = self.container.querySelector(".create form"),
	add = self.container.querySelector(".create .add"),
	manualLink = self.container.querySelector(".create .manualLink"),
	country = self.container.querySelector(".create select"),
	state = self.container.querySelector(".create .state"),
	search = self.container.querySelector(".create input.search"),
	output = self.container.querySelector(".results");
	
	
	
//Link form inputs to validateData
u.form.linkInputsToValidator(form);

//Handle the submit action
search.onclick = function(){
	if (!u.form.validate(form)) return false;

	lookupAddress(u.form.getValues(form, true));
};

manualLink.onclick = function(){
	create.classList.remove("search");
	create.classList.add("extra");
};

country.onchange = function(){
	if (country.value=="United Kingdom"){
		state.classList.add("display-none");
	} else {
		state.classList.remove("display-none");
	}
}

function lookupAddress(input){
	
	output.innerHTML = "";
	if ("userID" in self.variables && typeof self.variables.userID === "number"){
		input.userID = self.variables.userID;
	}
	u.loading.push();
	try {
		controller.api.request(
			"addresses/lookupAddress", 
			input, 
			function(data){
				
				u.loading.pop();
				
				if (data === null || data === undefined || typeof data !== "object"){
					output.innerHTML = "An error occurred while checking your address. Please try again.";
					return;
				}
				
				create.classList.remove("search");
				create.classList.add("extra");
				
				self.container.querySelector(".check").classList.remove("display-none");
				
				//Update the form
				u.form.loadValues(form, data);
				
			}, 
			u.standardFailureHandler(output, form),
			null
		);
	} catch (e){
		u.loading.pop();
		output.innerHTML = "An error occurred while checking your address. Please try again.";
		console.log("Error: failed to check address", e);	
	}
}


add.onclick = function(){
			
	var data = u.form.getValues(form, true),
		action = "addresses/saveAddressToAccount";
		
	if (self.variables.edit===true){
		data.addressPID = self.variables.addressPID;
	}

	if ("userID" in self.variables && typeof self.variables.userID === "number"){
		data.userID = self.variables.userID;
	}
	
	if (data.country=="United Kingdom"){
		delete data.state;
	}
	
	u.loading.push();
	self.authenticatedApiRequest(
		action,
		data, 
		function(data){
			u.loading.pop();
			
			if (data === null || data === undefined || typeof data !== "object"){
				output.innerHTML = "An error occurred while saving your address. Please try again.";
				return;
			}
			
			if (self.variables.newOnly || self.variables.edit===true){
				//Just use return 
				self.sideChannel(data);
				self.close();
				return;
			} 
			
			create.classList.add("search");
			create.classList.remove("extra");
			form.reset();
			renderAddress(data);
		}, 
		u.standardFailureHandler(output, form)
	);
};


function renderAddress(data){
	
	saved.classList.remove("display-none");
	
	var td, row = document.createElement("tr"), b = document.createElement("b");;

	td = document.createElement("td");
	if (data.addressName){
		b.appendChild(document.createTextNode(data.addressName+" "));
		td.appendChild(b);
	}
	
	if (data.addressTo){
		td.appendChild(document.createTextNode(data.addressTo+" / "));
	}
	td.appendChild(document.createTextNode(data.streetAddress.replace("\n", " / ")+" / "+data.town));
	row.appendChild(td);
	
	//Add "use this" button
	td = document.createElement("td");
	
	var button = document.createElement("input");
	button.type = "button";
	button.onclick = function(){
		if (self.sideChannel){
			self.sideChannel(data);					
			self.close();
		} else {
			console.log(data);
		}
	}
	button.value="Select";
	td.appendChild(button);

	row.appendChild(td);
	
	addresses.appendChild(row);
	
}

//If logged in, load address book
if (controller.isAuthenitcated() && self.variables.newOnly!==true){
	
	if ("userID" in self.variables && typeof self.variables.userID === "number"){
		data = { userID: self.variables.userID };
	} else {
		data = null;
	}
	
	self.authenticatedApiRequest(
		"accounts/fetchAddressBook",
		data,
		function(data){
			if (typeof data !== "object" || data === null){
				return self.render();
			}
			
			for (var i in data){
				if (!data.hasOwnProperty(i)) continue;
			
				if (self.variables.edit!==true){
					renderAddress(data[i]);
				} else if (data[i].addressPID === self.variables.addressPID){
					editData = data[i];
					u.form.loadValues(form, editData);
					break;
				}
			}
			
			if (self.variables.edit===true && editData === null){
				alert("Error loading address. Please try again.");
				return self.close();
			}
			
			self.render();
		}, 
		function(){
			if (self.variables.edit===true){
				alert("Error loading address. Please try again.");
				return self.close();
			}
			self.render();
		}
	);
} else {
	self.render();
}

if (self.variables.edit===true){
	create.classList.remove("search");
	create.classList.add("extra");
	add.value="Save Changes";
	self.container.querySelector("h3").innerText = "Edit Address";
}