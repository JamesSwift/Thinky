/* global u,app,controller */

var self = this,
	addresses = self.container.querySelector(".addresses"),
	errorBox = self.container.querySelector(".detailsError"),
	addAddress = self.container.querySelector(".addAddress"),
	userID = self.variables.userID*1 || self.getActiveUser();
	lastData;
	
if (data.userID === "0"){
	return controller.navigateTo("/accounts/"+self.getActiveUser()+"/address-book");
}

//Fetch address book and render it
var update = function(callback){
	errorBox.innerHTML = "";
	
	var loadingError = function(data){
		errorBox.innerHTML = "Error loading data from server."
		if (callback){
			callback(false, data);
		}
		self.render();
	};
	
	self.authenticatedApiRequest("accounts/fetchAddressBook",
	 	{
			userID: userID
		},
		function(data){
			
			if (typeof data !== "object" || data === null){
				return loadingError(data);
			}
			
			lastData = data;
			
			//Clear out old data
			if (Object.keys(data).length === 0){
				addresses.innerHTML = "<p>You don't have any saved addresses yet.</p>";
			} else {
				addresses.innerHTML = "";
			}
			
			for (var i in data){
				if (!data.hasOwnProperty(i)) continue;
				renderAddress(data[i]);
			}
			
			if (callback){
				callback(true, data);
			}
			self.render();
		},
		loadingError
	); 
};

var renderAddress = function (data){
				
	var b = document.createElement("b"),
		div = document.createElement("div"),
		br = function(elm){
			elm.appendChild(document.createElement("br"));
			return elm;
		},
		text = function(elm, text){
			elm.appendChild(document.createTextNode(text));
			return elm;
		}, button;
		
	div.classList.add("pid_"+data.addressPID);

	if (data.default){
		div.classList.add("default");
	}
	
	button = document.createElement("input");
	button.type = "button";
	button.value="☰";
	button.onclick = function(){
		var modal = controller.createModal(
			"<nav>"+
			"<a href='javascript:;' class='edit'>Edit Address</a>"+
			(data.default?"":"<a href='javascript:;' class='makeDefault'>Make Primary Address</a>")+
			"<a href='javascript:;' class='delete'>Delete Address</a>"+
			"<a href='javascript:;' class='closeMenu'>Close Menu</a>"+
			"</nav>",
			"addressMenu",
			true
		);
		
		modal.querySelector(".closeMenu").onclick = modal.close;
		modal.querySelector(".edit").onclick = function(){
			modal.close();
			var editWindow = controller.openViewAsModal("address-picker", {edit:true, addressPID:data.addressPID, userID: userID}, function(data){
					u.loading.push();
					update(function(){
						u.loading.pop();
					});
				}
			);
			
		};
		modal.querySelector(".delete").onclick = function(){
			if (confirm("Are you sure you want to delete this address?")){
				archiveAddress(data.addressPID);
			}
			modal.close();
		};
		if (!data.default){
			modal.querySelector(".makeDefault").onclick = function(){
				changeDefaultAddress(data.addressPID);
				modal.close();
			};
		}
		
		modal.render();
	};
	div.appendChild(button);
	
	if (data.addressName){
		text(b, data.addressName);
		div.appendChild(b);
		br(div);
	}
	
	if (data.addressTo_computed){
		text(div, data.addressTo_computed);
		br(div);
	}
	
	text(div, data.streetAddress+"\n"+data.town+"\n");
	
	if (data.county){
		text(div, data.county+"\n");
	}
	
	if (data.state){
		text(div, data.state+"\n");
	}
	
	text(div, data.postcode);
	
	if (data.country!=="United Kingdom"){
		text(div, "\n"+data.country);
	}
	
	if (data.default){
		div.appendChild(text(document.createElement("span"), "Primary Address"));
	}
	
	addresses.appendChild(div);
};

//Fetch addresses and render
update();

function archiveAddress(pid){
	u.loading.push();
	self.authenticatedApiRequest(
		"addresses/archiveAddress", 
		{
			addressPID:pid,		
			userID: userID
		}, 
		function(response){
			u.loading.pop();
			self.container.querySelector(".addresses .pid_"+pid).classList.add("display-none");
			update();
		}, 
		u.standardFailureHandler(errorBox)
	);
}

function changeDefaultAddress(pid){
	u.loading.push();
	self.authenticatedApiRequest(
		"accounts/changeDefaultAddress", 
		{
			addressPID:pid,
			userID: userID
		}, 
		function(response){
			update(function(){
				u.loading.pop();
			});
		}, 
		u.standardFailureHandler(errorBox)
	);
}

addAddress.onclick = function(){
	controller.openViewAsModal(
		"address-picker", 
		{
			newOnly:true,
			saveToAccount:true,
			userID: userID
		},
		function(data){
			update();
		}
	);
};
