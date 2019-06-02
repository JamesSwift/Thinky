/* global u,controller */

var self = this,
	form = this.container.querySelector("form"),
	scheduleDays = this.container.querySelectorAll("form>div"),
	template = this.container.querySelector(".template>div"),
	errorBox = self.container.querySelector(".detailsError"),
	
	ignore = false;
	
var day, days = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

//Redirect away if we are not allowed to edit
	if (self.url !== null || self.variables === null || self.variables === undefined || typeof self.variables !== "object" ||
		!("data" in self.variables) || typeof self.variables.data !== "object"){
	self.errorSwitchView("/404");
	return false;        	
}

//Make sure data is object
if (self.variables.data === null){
	self.variables.data = {};
}

//Setup css changes
for (var i in scheduleDays){
	if (!scheduleDays.hasOwnProperty(i)) continue;
	scheduleDays[i].querySelector("input[type=checkbox]").onchange = function(){
		this.parentNode.querySelector("fieldset").disabled = !this.checked;
		if (this.checked){
			this.parentNode.querySelector("label").classList.remove("disabled");
		} else {
			this.parentNode.querySelector("label").classList.add("disabled");
		}
	};
	scheduleDays[i].querySelector(".add").onclick = function(){
		addExtraTimes(this.parentNode);
	};
	scheduleDays[i].querySelector(".delete").onclick = deleteTimes;
}


function addExtraTimes(day){
	var elm;
		
	elm = document.createElement("div");
	elm.innerHTML = template.innerHTML;
	elm.querySelector(".delete").onclick = deleteTimes;
	day.appendChild(elm);
	
	showHideDelete(day);
	return elm;
}

function deleteTimes(){
	var fieldset = this.parentNode.parentNode;
	var time = this.parentNode;
	if (fieldset.querySelectorAll("div").length>1){
		fieldset.removeChild(time);
	}
	showHideDelete(fieldset);
}

function showHideDelete(day){
	var numTimes = day.querySelectorAll("div").length,
		deletes = day.querySelectorAll(".delete");
	for (var i in deletes){
		if (!deletes.hasOwnProperty(i)) continue;
		if (numTimes>1){
			deletes[i].classList.remove("display-none");
		} else {
			deletes[i].classList.add("display-none");
		}
	}
}

//Load data
for (i in days){
	if (!days.hasOwnProperty(i) || !self.variables.data.hasOwnProperty(days[i])) continue;
	day = self.variables.data[days[i]];
	scheduleDays[i].querySelector("input[type=checkbox]").checked = day.available;
	scheduleDays[i].querySelector("input[type=checkbox]").onchange();
	
	if (!("times" in day) || day.times === null || typeof day.times !== "object" ) continue;
	
	var time, sels,
		fieldset = scheduleDays[i].querySelector("fieldset");
	for (var t in day.times){
		if (!day.times.hasOwnProperty(t)) continue;
		if (t==0){
			time = fieldset.querySelector("div");
		} else {
			time = addExtraTimes(fieldset);
		}
		
		sels = time.querySelectorAll("select");
		sels[0].value = day.times[t].start;
		sels[1].value = day.times[t].finish;
	}
}

var getData = function(){
	
	var data = {};
	
	for (i in days){
		if (!days.hasOwnProperty(i)) continue;
		day = scheduleDays[i];
		
		data[days[i]] = {
			available: day.querySelector("input[type=checkbox]").checked,
			times: []
		};
		
		var x=0, times = day.querySelectorAll("select");
		for (var t in times){
			if (!times.hasOwnProperty(t)) continue;
			if (typeof data[days[i]].times[x] === "undefined"){
				data[days[i]].times[x]={};
			}
			data[days[i]].times[x][times[t].name]=times[t].value;
			if (times[t].name==="finish"){
				x++;
			}
		}
		
	}
	
	return data;
	
};


//Setup form to submit via api
form.onsubmit = function(e){
	
	e.preventDefault();
	
	//Clear error message
	errorBox.innerHTML = "";
	
	var data = getData();
	
	//Send data back to parent
	if ("sideChannel" in self){
		var response = self.sideChannel(data);
		if (response === true){
			ignore = true;
			self.close();
		} else {
			u.standardFailureHandler(errorBox, form, false)(response);
		}
	} else {
		errorBox.innerHTML = "No sidechannel defined.";
	}
};

this.beforeClose = function(){
	if (ignore!==true && JSON.stringify(self.variables.data) !== JSON.stringify(getData())){
		return {message:"You have altered the schedule. Are you sure you want to discard these changes?"};
	}
}

self.render();
