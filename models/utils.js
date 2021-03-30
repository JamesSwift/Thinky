/* global controller */
var u = {
    
    //Pass an array of objects that must exist before callback is called
    //Examples: ["app"], ["app", "swdapi.client"], [[privateObject, "method"], "app"]
    waitForObjects: function(elms, callback){
    
    	function isDefined(parent, elements){
    		if (typeof elements === "string"){
    			if (elements.indexOf(".")===-1){
    				return (typeof parent[elements] !== "undefined");
    			}
    			elements = elements.split(".");
    		}
    		
    		if (typeof parent[elements[0]] === "undefined")	return false;
    		
    		var newElements = elements.slice(1);
    		if (newElements.length === 0) return true;
    		return isDefined(parent[elements[0]], newElements);
    	}
    
    	var waitInterval, findObjects = function(){
    		
    		for(var id in elms){
    			if (!elms.hasOwnProperty(id)){
    				continue;
    			}
    			var top = window;
    			var search = elms[id];
    			if (typeof search[0] === "object"){
    				top = search[0];
    				search = search.slice(1);
    			}
    			if (!isDefined(top, search)) return false;
    		}
    		clearInterval(waitInterval);
    		callback();
    		return true;
    	};
    	if (!findObjects()){
    		waitInterval = setInterval(findObjects, 20);
    	}
    },
    
    loadExternal: (function(){
    	var list = [];
    	return function (src){
    		if (list.indexOf(src)!==-1){
    			return;
    		}
    		list.push(src);
    	    var a = document.createElement('script');
    	    a.src = src;
    	    a.async = true;
    	    document.body.appendChild(a);
    	};
    })(),
    
    elm: function(id){
    	if (typeof id === "string"){
    		return document.getElementById(id);
    	}
    	return id;
    },
    
    fadeOut: function(id){
    	
    	var element = this.elm(id);
    		
    	if (element === null){
    		return;	
    	}
    	element.classList.remove("fadeIn");
    	if (!element.classList.contains("fadeOut")){
    		element.classList.add("fadeOut");
    	}
    
    },
    
    fadeIn: function(id){
    	
    	var element = this.elm(id);
    		
    	if (element === null){
    		return;	
    	}
    	element.classList.remove("fadeOut");
    	if (!element.classList.contains("fadeIn")){
    		element.classList.add("fadeIn");
    	}
    	
    },
    
    fadeOutHide: function(id){
		
		var element = u.elm(id);
			
		if (element === null){
			return;	
		}
		
		element.classList.add("fadeOut");		
		element.classList.remove("fadeIn", "display");

		setTimeout(function(){
			if (element.classList.contains("fadeOut")){
				element.classList.add("display-none");
				element.classList.remove("fadeOut");
			}
		}, 100); 
	
	},
	
	fadeInUnhide: function(id){
		
		var element = u.elm(id);
			
		if (element === null){
			return;	
		}

		
		element.classList.add("display");
		element.classList.remove("display-none", "fadeOut");
		
		setTimeout(function(){
			if (element.classList.contains("display")){
				element.classList.add("fadeIn");
				element.classList.remove("display");
			}
		}, 10);
		
		setTimeout(function(){
			element.classList.remove("fadeIn");
		}, 110); 		
		
	},
	
	getURLVariables: function() {
		var queryString = window.location.search;
	    var query = {};
	    var pairs = (queryString[0] === '?' ? queryString.substr(1) : queryString).split('&');
	    for (var i = 0; i < pairs.length; i++) {
	        var pair = pairs[i].split('=');
	        query[decodeURIComponent(pair[0])] = decodeURIComponent(pair[1] || '');
	    }
	    return query;
	},
    
    escapeHTML:  (function() {
		var MAP = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&#34;',
			"'": '&#39;'
		};
		return function(s) {
			return s.replace(/[&<>'"]/g, function(c) { return MAP[c]; });
		};
	})(),
    
    failureMessageExtract: function(response){
    	if (typeof response === "string" && response !== ""){
			return response;
			
		} else if (typeof response !=="object"){
			response = "Error communicating with server. Please check if your device is online.";
			
		} else if ("ValidationErrors" in response){
			var message = "";
	    	for (var ob in response.ValidationErrors){
	            if (!response.ValidationErrors.hasOwnProperty(ob)) continue;
	            
	            for (var elm in response.ValidationErrors[ob]){
	                if (!response.ValidationErrors[ob].hasOwnProperty(elm)) continue;
	                message += response.ValidationErrors[ob][elm]+" \n";
	            }
	    	}
        	return message
        	
        } else if ("AppError" in response || "SWDAPI-Error" in response){
            return (response["AppError"] || response["SWDAPI-Error"]).message;
            
        } else {
            return JSON.stringify(response);
            
        }
    },
    
    standardFailureHandler: function(errorBox, form, callback){
		
		return function(response){
			if (callback!==false){
				u.loading.pop("standardFailureHandler");
			}
			if (typeof response === "string"){
				errorBox.innerHTML = "";
				errorBox.appendChild(document.createTextNode(response));
			} else if (typeof response !=="object" || response === undefined || response === null){
				errorBox.innerHTML = "Error communicating with server. Please check if your device is online.";
			} else if (form && "ValidationErrors" in response){
	        	u.form.handleServerResponse(form, response["ValidationErrors"], errorBox);
            } else if ("AppError" in response || "SWDAPI-Error" in response){
                errorBox.innerHTML = u.escapeHTML((response["AppError"] || response["SWDAPI-Error"]).message);
            } else {
                errorBox.innerHTML = u.escapeHTML(JSON.stringify(response));
            }
            
            if (typeof callback === "function"){
            	callback(response, errorBox, form);
            }
        };
	},
	
	loading: (function(){
		var q = 0;
		
		return { 
		    push: function(note){
    			//console.log("push", note, q, q+1);
    			q+=1;
    			if (q > 0){
    				u.fadeInUnhide("loading");
    			}
    		},
    		
    		pop: function(note){
    			//console.log("pop", note, q, q-1);
    			q-=1;
    			if (q <= 0){
    				u.fadeOutHide("loading");
    			}			
    		}
		};
	})(),
	
	
	form: {
		
		getValues: function(element, ignoreEmptyInputs){
			var inputs = element.querySelectorAll("input, select"),
				textareas = element.querySelectorAll("textarea"),
			    data = {};
			
			for (var i = 0; i < inputs.length; i++){
			    var input = inputs[i];
			    if (input.name){
			        if (input.type === "checkbox"){
			            data[input.name] = !!input.checked;   
			        } else if (input.type === "radio"){
			        	if (input.checked){
			        		data[input.name] = input.value;
			        	}
			        	
			        } else {
						if (ignoreEmptyInputs && input.value == "") continue;
			            data[input.name] = input.value;   
			        }
			    }
			}
			
			for (var i = 0; i < textareas.length; i++){
			    var textarea = textareas[i];
				if (ignoreEmptyInputs && textarea.value == "") continue;
		    	data[textarea.name] = textarea.value;   
			}
			
			return data;
		},
		
		loadValues: function(form, data){
			
			var newData = {};
			
	        for (var prop in data){
	            if (!data.hasOwnProperty(prop) || !(prop in form.elements)){
	                continue;
	            }
	            newData[prop] = data[prop];
	            if (form.elements[prop].type === "checkbox"){
	            	form.elements[prop].checked = (data[prop]===true || data[prop]==="true" || data[prop]===1);
	            } else {
	            	form.elements[prop].value = data[prop];
	            }
	        }
	        
	        form.originalData = newData;
		},
		
		getValue: function(field){
			
            var pointer = "value",
            	value = field[pointer];	            	
            
            //Map the correct value
			if (field.type === "checkbox"){
            	pointer = "checked";
            	value = (field[pointer]===true || field[pointer]==="true" || field[pointer]===1 || field[pointer]==="on");
            }
            
            //Convert numbers
            if (!isNaN(value)){
            	value = parseFloat(value) || "";
        	}
            
            return value;
		},
		
		setValue: function(field, value){
			
            var pointer = "value";            	
            
            //Map the correct value
			if (field.type === "checkbox"){
            	pointer = "checked";
            	value = (value===true || value==="true" || value===1 || value==="on");
            }

            return field[pointer] = value;
		},		
		
		updateValues: function(form, data){

			//Add to the list of conflicts
			function addConflict(form, field, latestServerValue){
				
				if (! ("conflicts" in form) ){
					form.conflicts = {}
				}
				
				form.conflicts[field]={
					"latestServerValue":latestServerValue
				};
				
				if (! ("activeConflict" in form) ){
					resolveConflict(form, field);
				}
				
			}
			
			//Show the conflict resolution box
			function resolveConflict(form, field){
				
				var element = form.elements[field];
				
				form.activeConflict = field;
				
    			u.form.removeError(element);
    			
        		var error = u.form.addError(element, 
        			"<p>This value changed on the server while you were editing it. It was changed to: </p>"+
        			"<textarea></textarea>"+
        			"<p>Do you wish to keep your edit, or use the new value stored on the server?</p>"+
        			"<input type='button' value='Keep My Edit' /> <input type='button' value='Use Server Value' /> ",
        			false
        		);
        		
        		var interval = setInterval(function(){
        		    if ("conflicts" in form && field in form.conflicts && "latestServerValue" in form.conflicts[field]){
	            		error.querySelector("textarea").value = form.conflicts[field].latestServerValue;
        		    } else {
        		    	cleanup();
        		    }
        		}, 200);
        		
        		
        		error.querySelectorAll("input")[0].onclick = cleanup;
        		
        		error.querySelectorAll("input")[1].onclick = function(){
        			if ("conflicts" in form && field in form.conflicts && "latestServerValue" in form.conflicts[field]){
         				u.form.setValue(element, form.conflicts[field].latestServerValue);
        			}
         			cleanup();
        		}
        		
        		function cleanup(){
        			clearInterval(interval);
        			if ("conflicts" in form && field in form.conflicts && "latestServerValue" in form.conflicts[field]){
        				form.originalData[field] = form.conflicts[field].latestServerValue;
        				delete form.conflicts[field];
        				error.close();
        			}
        			
        			delete form.activeConflict;
        			
        			//Find the next error
        			for (var i in form.conflicts){
        				if (!form.conflicts.hasOwnProperty(i)) continue;
        				resolveConflict(form, i);
        				break;
        			}
        		}
    		}
    		
			var newData = {},
				hasData = false;    		
			
			//Check if this value has changed
	        if ("originalData" in form && typeof form.originalData === "object" && form.originalData !== undefined){
	        	hasData = true;
	        }
			
	        for (var prop in data){
	        	
	        	//Check the form contains this data field
	            if (!data.hasOwnProperty(prop) || !(prop in form.elements) || form.elements[prop] === undefined){
	                continue;
	            }

	            //Save this data as the new "original" data
	            newData[prop] = data[prop];	            
	            
	            var element = form.elements[prop],
	            	newValue = data[prop];            	
	            
            	//If the value is the same, no point updating
            	if ( u.form.getValue(element) == newValue){
            		continue;
            	}	      
            	
            	
	            if (hasData === true){
	            	
	            	//If the form field has changed from it's original value don't overwrite it, ask the user what to do
	            	if (prop in form.originalData && 
	            		form.originalData[prop] != newValue &&
	            		form.originalData[prop] != u.form.getValue(element) ){
	            		
	            		//Revert the original data until decided
	            		newData[prop] = form.originalData[prop];
	            		
	            		//Prompt the user to resolve the conflict
	            		addConflict(form, prop, newValue);
	            		
	            		//Don't update the data
	            		continue;
	            	}
	            	
	            	//If the data has changed from the original value don't overwrite it
	            	if (prop in form.originalData && 
	            		form.originalData[prop] != u.form.getValue(element)){
	            		continue;
	            	}	            	
	            }
	            
	            //Update the data
	            if ("conflicts" in form && prop in form.conflicts){
	            	delete form.conflicts[prop];
	            }
	            u.form.setValue(element, newValue);
	        }
	        
	        form.originalData = newData;
		},
		
		addError: function(element, message, autoRemove, showClose){
			
	        //Remove any errors already on this form 
			if (autoRemove!==false){
	        	this.removeErrors(element.form);
			}
	        
	        //Highlight the affected field
	        element.classList.add("formError");
	        
	        //Create the node
	        var div = document.createElement("div");
	        div.classList.add("formAlert");
	        
	        //Add the message
	        div.innerHTML = message;
	        element.focus();
	        
	        div.close = function(){
	        	u.form.removeError(element);
	        };
	        
	        //Add a close button
	        if (showClose === true){
	        	
				var close = document.createElement("a");
				close.onclick = div.close;
				close.href = "javascript:void(0)";
				close.classList.add("close");
				
				var cross = document.createTextNode('\u2715'); 
				close.appendChild(cross);
				
				div.appendChild(close);	        
	        }
	        
	        //Insert the error after the input element
	        element.parentNode.insertBefore(div, element.nextSibling);
	        
	        return div;	        
	    },
	    
	    handleServerResponse: function(form, errors, unknownErrorBox){
	    	this.removeErrors(form);
	    	for (var ob in errors){
	            if (!errors.hasOwnProperty(ob)){
	                continue;
	            }
	            
	            var message = "";
	            for (var elm in errors[ob]){
	                if (!errors[ob].hasOwnProperty(elm)){
	                    continue;
	                }
	                message+=errors[ob][elm]+" \n";
	            }
	            
	            if (ob in form.elements){
	            	this.addError(form.elements[ob], message, false);
	            } else if (typeof unknownErrorBox === "object"){
	            	unknownErrorBox.innerHTML += message + "<br/>";
	            } else {
	            	alert("Form Error: "+ob+"\n\n"+message);
	            }
	            
	        }
	    },
	    
	    removeError: function(element){
    		element.classList.remove("formError");
    		if (element.nextElementSibling && element.nextElementSibling !== null && element.nextElementSibling.classList.contains("formAlert")){
        		element.parentNode.removeChild(element.nextElementSibling);
    		}
	    },
	    
	    removeErrors: function(element){
	        element.classList.remove("formError");
	        var alerts = element.parentNode.querySelectorAll(".formAlert");
	        
	        for (var i = 0; i < alerts.length; i++){
	        	if (alerts.hasOwnProperty(i) && alerts[i].parentNode){
			    	alerts[i].parentNode.removeChild(alerts[i]);
	        	}
	    	}
	    	
			var errors = element.parentNode.querySelectorAll(".formError");
			for (var i = 0; i < alerts.length; i++){
				if (errors.hasOwnProperty(i) && errors[i] !== undefined && errors[i].classList){
			    	errors[i].classList.remove("formError");
				}
	    	}
	    	
	    },
	    
	    validate: function(form, customValidator){
	        var inputs = form.querySelectorAll("input, select, textarea");
			for (var i = 0; i < inputs.length; i++){
			    if (inputs[i].name && controller.dataValidator.apply(inputs[i])==false){
			        return false;
			    }
			    if (typeof customValidator === "function" && inputs[i].name && customValidator.apply(inputs[i])==false){
			        return false;
			    }
			}
			return true;
	    },
	    
		   
	    
	    linkInputsToValidator: function(form, customValidator){
	    	var inputs = form.querySelectorAll("textarea, input, select");
	    	
			for (var i = 0; i < inputs.length; i++){
				if (inputs[i].name){
				    inputs[i].addEventListener("change", function(){
				    	controller.dataValidator.apply(this);
				    	if (typeof customValidator === "function"){
				    		customValidator.apply(this);
				    	}
				    });
				}
			}
	    }
	},
	
	table : {
	
		addData : function(table, data, columnList, manualHandler){
			
			var body = table.querySelector("tbody");
			
			for (var r in data){
				if (!data.hasOwnProperty(r)) continue;
				
				var tr = document.createElement("tr");
				
				for (var c in columnList){
					if (!columnList.hasOwnProperty(c)) continue;
					
					var td = document.createElement("td");
					
					if (typeof manualHandler === "function") {
						try {
							td.appendChild(manualHandler(columnList[c], data[r]));
							tr.appendChild(td);
							continue;
						} catch (e){}
					} 
					
					if (typeof data[r] === "object" && columnList[c] in data[r]){
						try {
							td.appendChild(document.createTextNode(data[r][columnList[c]]));
							tr.appendChild(td);
							continue;
						} catch (e){}
					}
					
					td.appendChild(document.createTextNode(data[r]));
					tr.appendChild(td);
						
				}
				
				body.appendChild(tr);
				
			}
		},
		
		replaceData : function(table, data, autoRows, manualHandler){
			
			table.querySelector("tbody").innerHTML="";
			
			return this.addData(table, data, autoRows, manualHandler);
		}
	},
    
    findNextAvailableTime: function(business, setDate, ignoreCurrent){
        
        //Check object is correct
        if (typeof business !== "object" || business === null || !("schedule" in business) || typeof business.schedule !== "object" || business.schedule === null){
            return false
        }
        
        var days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'],
            date = setDate || new Date(), 
            i = -1, today, time, nowTime, nowHour, nowMinute, timestamp,
            dontAdjoinDay = null,
            dontAdjoinTime = null,
            closedUntil = null,
            openUntil = null;
            
        if ("api" in controller){
            date = controller.api.serverDate();
        }
            
        if ("closedUntil" in business && business.closedUntil !== null){
            closedUntil = new Date(business.closedUntil + " UTC");
            if (closedUntil.getTime()<Date.now()) closedUntil = null;
        }
        if ("openUntil" in business && business.openUntil !== null){
            openUntil = new Date(business.openUntil + " UTC");
            if (openUntil.getTime()<Date.now()) openUntil = null;
        }
            
        nowHour = pad(date.getHours());
        nowMinute = pad(date.getMinutes());
        nowTime = "" + nowHour + "" + nowMinute;
        
		console.log(nowTime);

        //Look up to 7 days ahead to find next opening time
        while (i<7){
            i++;
            
            //Find the day of the week for this iteration
            today = (date.getDay() + i ) % 7;

            //Check something is scheduled for today
            if (!isValidDay(today)) continue;
            
            //Loop through each scheduled time for today and see if it is the next opening time
            for (var t in business.schedule[days[today]].times){
                
                if (!business.schedule[days[today]].times.hasOwnProperty(t)) continue;
                
                //Pointer to the start,finish pair in question
                time = business.schedule[days[today]].times[t];
                
                //////////////////////////////////////////////////////////////////
                // If the schedule has been overriden, it may be that a non-existant "time" should be returned,
                // so we need to filter for these
                
                //Check if closedUntil is in range
                if (closedUntil !== null){
                    //Does the slot in question finish before the forced closing time? Obviously just skip it then
                    if (getRealDate(date, i, time['finish']).getTime() <= closedUntil.getTime()){
                        continue;
                        
                    //Does the slot in question finish after AND START BEFORE the forced closing time?
                    } else if (getRealDate(date, i, time['start']).getTime() <= closedUntil.getTime()+60000){
                        var newStart = pad(closedUntil.getHours()) +""+ pad(closedUntil.getMinutes());
                        return buildReturn(i, {start: newStart, finish: time['finish']});
                        
                    //The slot in question starts after the closing time, so it must be the next opening time
                    } else {
                        return buildReturn(i, time);
                    }
                    
                }
                
                //Check if openUntil is in range
                if (openUntil !== null){
                    
                    //Does the slot in question finish before the forced opening time? Obviously just skip it then
                    if (getRealDate(date, i, time['finish']).getTime() <= openUntil.getTime()){
                        continue;
                        
                    //Does the slot in question finish after AND START BEFORE the forced opening time?
                    } else if (getRealDate(date, i, time['start']).getTime() <= openUntil.getTime()+60000){
						
						var closingStamp = openUntil;						
						closingStamp.setHours(time['finish'].substring(0,2));
						closingStamp.setMinutes(time['finish'].substring(2,4));
						
                        return buildReturn(0, {start: "0000", finish: time['finish']}, closingStamp);
                        
                    //The slot in question starts after the opening time, so it must be the next opening time
                    } else {
                        var newFinish = pad(openUntil.getHours()) +""+ pad(openUntil.getMinutes());
						
                        return buildReturn(0, {start: "0000", finish: newFinish}, openUntil);
                    }
                    
                }
                //////////////////////////////////////////////////////////////////
                
                
                //If the slot starts before now then it might be the one we want
                if (today === date.getDay() && time['start'] <= nowTime){
                    
                    //If it starts before AND FINISHES AFTER now then it is the slot we are currently in
                    if (time['finish'] >= nowTime){
                        //Are we searching for the current opening or the next opening? We may need to skip this slot
                        if (ignoreCurrent === true){
                            //Keep track of scheduled times that join together i.e. 1300 finish and 1300 start
                            if (dontAdjoinDay === null){
                                dontAdjoinDay = today;
                                dontAdjoinTime = time['finish'];
                                //Skip the first item
                                continue;
                            } else {
                                //If this slot joins on perfectly to the previous time then skip it
                                if (dontAdjoinDay === today && dontAdjoinTime === time['start'] ){
                                    dontAdjoinDay = today;
                                    dontAdjoinTime = time['finish'];
                                    continue;
                                }
                            }
                        }
                        
                        //This is the slot we want
                        return buildReturn(i, time);
                    }
                    
                //We are either in another day or a time after now
                } else {
                    //Are we searching for the current opening or the next opening? We may need to skip this slot
                    if (ignoreCurrent === true && dontAdjoinTime === "2400" && time['start'] === "0000" && dontAdjoinDay === today -1){
                        dontAdjoinDay = today;
                        dontAdjoinTime = time['finish'];
                        continue;
                    }
                    
                    //This is the slot we want
                    return buildReturn(i, time);
                }
                
            }
            
        }
        
        //No slot was found, no opening time could be established
        //If forced override is in effect, invent a time slot
		if (openUntil !== null){
            var newFinish = pad(openUntil.getHours()) +""+ pad(openUntil.getMinutes());
            return buildReturn(0, {start: "0000", finish: newFinish}, openUntil);
        }
        
        //Return false to indicate that the next opening time is unknown
        return false;        
        
        //////////////////////////////////////////////////////////////////
        //Helper functions
        
        //Does the day specified exist in the schedule and have some times
        function isValidDay(testDay){
            
            if (
                !(days[testDay] in business.schedule) || 
                typeof business.schedule[days[testDay]] !== "object" || 
                business.schedule[days[testDay]] === null || 
                !("available" in business.schedule[days[testDay]]) ||
                business.schedule[days[testDay]].available !== true ||
                !("times" in business.schedule[days[testDay]]) ||
                typeof business.schedule[days[testDay]].times !== "object"
            ){
                return false;
            }
            
            return true;
        }
        
        function secondsUntil(daysFromNow, eventIn24){
            return Math.floor((
                (new Date(date.getTime()).setHours(0,0,0,0)) 
                + 
                (daysFromNow * 24*60*60*1000) 
                + 
                (eventIn24.substring(0,2) * 60*60*1000) 
                + 
                (eventIn24.substring(2,4) *60*1000)
                - 
                date.getTime()
            ) / 1000);
            //If in the past, it will return a negative value
        }
        
        //Convert seconds into a human readable time string
        function humanReadable(s){
            var n,w,r,extra = "";
            if (Math.floor(s) < 60){
                n = Math.floor(s);
                w = "second";
            } else if (Math.floor(s/60) < 60){
                n = Math.floor(s/60);
                w = "minute";
            } else if (Math.floor(s/60/60) < 24){
                n = Math.floor(s/60/60);
                w = "hour";
                r = s-(n*60*60);
                if (r>60){
                    extra = " and " + humanReadable(r);
                }
            } else {
                n = Math.floor(s/60/60/24);
                w = "day";
                r = s-(n*60*60*24);
                if (r>60*30){
                    extra = " and " + humanReadable(r);
                }
            }
            if (n!==1){
                w += "s";
            }
            return  n + " " + w + extra;
        }
        
        //Create the object that will be returned
        function buildReturn(day, time, realClosingTimestamp){
            
            var today = (date.getDay() + day ) % 7;
            var r = {
                "day": days[today],                             //What day the slot starts on
                "date": getShortTimestamp(addDays(date, day)),  //The date the slot starts one e.g. 2018-01-30
                "start": time['start'],                         //The time the slot starts e.g. 1210
                "finish": time['finish'],                       //The time the slot finished (may not be on same day) e.g. 0100
                "seconds": secondsUntil(day, time['start'])     //If positive then refers to seconds until opening
                                                                //If negative then refers to seconds since opening
            };
            
            var s = r.seconds;
            
            //If already open, work out when it will close (as it may span days)
            if (r.seconds < 0){
                
                //If a specific closing time in the future has been provided, get the seconds from that
                if (realClosingTimestamp){
                    s = (realClosingTimestamp - date ) / 1000;
                    
                //Check to see if the closing time should follow onto the next day
                } else {
                    
                    var closing = time['finish'],
                        closingDay = day;
                    
                    //If closing on last minute of day, see if actually continues into tomorrow
                    if (closing === "2400"){
                        var tomorrow = (date.getDay() + day + 1) % 7;
                        if (isValidDay(tomorrow)){
                            
                            //Check through times for one starting at 0000
                            var nextTime;
                            for (var t in business.schedule[days[tomorrow]].times){
                                nextTime = business.schedule[days[tomorrow]].times[t];
                                if (!business.schedule[days[tomorrow]].times.hasOwnProperty(t)) continue;
                                
                                if (nextTime.start == "0000"){
                                    closing = nextTime.finish;
                                    r.finish = nextTime.finish;
                                    closingDay ++;
                                }
                                
                            }
                        }
                    }
                    
                    //Find how many sucends until it closes
                    s = secondsUntil(closingDay, closing);
                }
                
                //Generate human readable closing time
                r.closingIn = humanReadable(s);
                
            //If currently closed
            } else {
                
                //Generate human readable opening time
                r.openingIn = humanReadable(s);
            }
            
            return r;
        }
        
        function addDays(date, days) {
          var result = new Date(date);
          result.setDate(result.getDate() + days);
          return result;
        }
        
        function getShortTimestamp(date){
            return date.getFullYear() +
                '-' + pad(date.getMonth() + 1) +
                '-' + pad(date.getDate());
        }
        
        function getRealDate(setDate, nDays, time){
            if (time === "2400"){
                time = "2359";
            }
            var date = new Date(setDate);
            date.setDate(date.getDate() + nDays);
            date.setHours(time.substring(0,2));
            date.setMinutes(time.substring(2,4));
            
            return date;
        }
        
        function getUTCTimestamp(date){
            
            return date.getUTCFullYear() +
                '-' + pad(date.getUTCMonth() + 1) +
                '-' + pad(date.getUTCDate())+
                'T' + pad(date.getUTCHours()) +
                ':' + pad(date.getUTCMinutes()) +
                ':' + pad(date.getUTCSeconds())
        }
        
        function pad(n){
            return (n<10 ? "0" + n : n);
        }
    },
    
    imageViewer : (function(){
	
		var	contentImages = [],
			currentImage = 0,
			viewerElm = null,
			imageElm = null,
			
		showViewer = function(){
			var viewerElm = document.getElementById("imageviewer");
			
			viewerElm.className="imageviewer-visible";
			viewerElm.style.opacity="1";	
			
		},
		
		hideViewer = function(){
			var viewerElm = document.getElementById("imageviewer");
			
			viewerElm.style.opacity="0";
			window.setTimeout(function(){
				viewerElm.className="imageviewer-hidden";
			}, 1000);
		},
		
		switchImage = function(switchTo, delay){
			
			var has_loaded=false,
				has_faded=false,
				newImage,
				imageElm = document.getElementById("imageviewer-image"),
				loadingImageElm = document.getElementById("imageviewer-loading-image"),
				loadingElm = document.getElementById("imageviewer-loading");
				
			//Check this image exists
			if (contentImages[switchTo]===undefined){
				console.log("No such id: " + switchTo);
				return null;
			}
			
			imageElm.style.opacity="0";
			
			//Start preloading the new image
			newImage = new Image();
			newImage.src = contentImages[switchTo].original;
			newImage.onload = function(){
				has_loaded=true;
				if (has_faded===true){
					loadingElm.style.opacity="0";
					imageElm.src = newImage.src;
					imageElm.style.opacity="1";
				}
			};
			
			
			if (delay==undefined){
				delay = 0;
			}
			
			window.setTimeout(function(){
				has_faded=true;					
	
				//Placehold the image already on the page
				if (has_loaded===false){
					loadingImageElm.src=contentImages[switchTo].src;
					loadingElm.style.opacity="1";
					
				//Clear out the placeholder and switch to fullsize
				} else {
					loadingElm.style.opacity="0";
					imageElm.style.opacity="1";
					imageElm.src=contentImages[switchTo].original;
				}
				imageElm.alt=contentImages[switchTo].alt;
				currentImage = switchTo;
			}, delay);
		},
		
		iV = {
			
			"updateImages" : function (){
			
				var	key,
					newImages = [],
					ims = document.getElementById("content").getElementsByTagName("img");
				
				for (key in ims) {
					
					if (ims.hasOwnProperty(key) && /^0$|^[1-9]\d*$/.test(key) && key <= 4294967294 && 
						ims[key].src.search("/img/")!=-1 && window.getComputedStyle(ims[key],null).getPropertyValue("display")!="none"){
	
						newImages.push({
							"srcFull"  : ims[key].src,
							"src"	   : ims[key].src.substring( ims[key].src.search("/img/") ),
							"srcSize"  : ims[key].src.substring( ims[key].src.search("/img/")+5 , ims[key].src.search("/img/")+5+ims[key].src.substring( ims[key].src.search("/img/")+5 ).search("/")  ),
							"original" : "/img/original" + ims[key].src.substring( ims[key].src.search("/img/")+5+ims[key].src.substring( ims[key].src.search("/img/")+5 ).search("/")  ),
							"alt"	   : ims[key].alt 
						});
												
					}
					
				}
				
				contentImages = newImages;
				
				return contentImages;
			},
			
			"show" : function(img, delay){
				
				var key, imgID;
				
				//Refresh image DB
				iV.updateImages();
				
				//Find id of requested image
				if (img!==undefined){
					for (key in contentImages) {
						if (contentImages.hasOwnProperty(key) && /^0$|^[1-9]\d*$/.test(key) && key <= 4294967294 && 
							contentImages[key].src==img){
							imgID = key;	
						}
					}
				} else {
					imgID = 0;
				}
				
				//Display the viewer
				showViewer();
				switchImage(imgID, delay);
				
				return imgID;
			},
			
			"showChildImg" : function(elm){
				
				var key, imgID, img;
				
				//Refresh image DB
				iV.updateImages();
				
				//Find src of child image
				img = elm.getElementsByTagName("img")[0];
				
				//Find id of requested image
				if (img!==undefined){
					for (key in contentImages) {
						if (contentImages.hasOwnProperty(key) && /^0$|^[1-9]\d*$/.test(key) && key <= 4294967294 && 
							contentImages[key].srcFull==img.src){
							imgID = key;	
						}
					}
				} else {
					return false;
				}
				
				//Display the viewer
				showViewer();
				switchImage(imgID);
				
				return imgID;
			},				
			
			"hide" : function(){
				hideViewer();
			},
			
			"prev" : function(){
				var showID = (currentImage*1)-1;
				if (showID<0){
					showID = contentImages.length-1;
				}
				switchImage(showID, 500);
			},
			
			"next" : function(){
				var showID = (currentImage*1)+1;
				if (showID>=contentImages.length){
					showID = 0;
				}
				switchImage(showID, 500);
			}
			
		}
		
		return iV;
			
	})()
    
};