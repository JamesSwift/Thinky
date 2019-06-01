/* global u,controller */

//Gets called by u.form to validate user input before sending to server
function inputValidator(){
	
	/*For Testing
    u.form.removeErrors(this);
	return true;
	//*/
	
	var fEl = this.form.elements;
	
    //Required fields
    if ( this.type !== "checkbox" && this.getAttribute("data-required") === "true" && this.value==""){
        u.form.addError(this, "This field is required.");
        return false;
    }
    if ( this.type === "checkbox" && this.getAttribute("data-required") === "true" && this.checked === false){
        u.form.addError(this, "You must check this box to continue.");
        return false;
    }
    
    //Max Integar
    if ( this.type !== "checkbox" && this.getAttribute("data-maxintegar") !== null && 
         ( /^\d+$/.test(this.value) == false || parseFloat(this.value) > parseInt(this.getAttribute("data-maxintegar")) )
    ){
        u.form.addError(this, "This quantity is invalid. It should be a whole number no higher than " + this.getAttribute("data-maxintegar") + ".");
        return false;
    }
    
    //Min Integar
    if ( this.type !== "checkbox" && this.getAttribute("data-minintegar") !== null && 
         ( /^\d+$/.test(this.value) == false || parseFloat(this.value) < parseInt(this.getAttribute("data-minintegar")) )
    ){
        u.form.addError(this, "This quantity is invalid. It should be a whole number greater than " + this.getAttribute("data-minintegar") + ".");
        return false;
    }    
    
    //Min length
    if ( this.type !== "checkbox" && this.getAttribute("data-minlength") !== null && this.value.length < parseInt(this.getAttribute("data-minlength")) ){
        u.form.addError(this, "This field is too short. It needs to be at least "+this.getAttribute("data-minlength")+" characters long.");
        return false;
    }
    
    //Name
    if ( (this.name==="firstName" || this.name === "lastName") && this.value.length>25){
        u.form.addError(this, "The name you entered is unusally long. Please check it.");
        return false;
    }
    
    //phone
    if (this.type === "tel" && this.value!="" && !(new RegExp("^[\+0][0-9 ]+$").test(this.value))){
        u.form.addError(this, "The phone number you supplied was invalid. It should only contain numbers, spaces, and start with 0 or a country code (e.g. +44)");
        return false;
    }        
    
    //Email
    if (this.type === "email" && !/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/.test(this.value)){
        u.form.addError(this, "The email you entered is invalid.");
        return false;
    }
    
    //Business/Category Name
    if (this.name==="businessName" && this.value.length<3){
        u.form.addError(this, "The name you entered is too short.");
        return false;
    }
    if (this.name==="businessName" && this.value.length>25){
        u.form.addError(this, "The name you entered is too long. It must be no more than 25 characters.");
        return false;
    }
    
    //Description
    if (this.name==="description" && this.value.length<5){
        u.form.addError(this, "The description you entered is too short.");
        return false;
    } 
    if (this.name==="description" && this.value.length>500){
        u.form.addError(this, "The description you entered is too long. It must be no more than 500 characters.");
        return false;
    }
    
    
    //Current password
	if (this.name==="currentPassword" && this.value.length < 8){
		u.form.addError(this, "The password you entered is too short. It must be 8 characters or more.");
		return false;
	}        
    
    //New Password input
    if (this.name === "newPassword" || this.name === "newPasswordConfirm"){
        if (this.name === "newPassword" && !new RegExp("^(?=.*\\d)(?=.*[A-Z])(?=.*[a-z]).{8,}$").test(this.value)){
            u.form.addError(this, "Your password isn't secure enough. It must have at least eight characters and include uppercase, lowercase and digits.");
            return false;
        }
        if (fEl.newPasswordConfirm.value!="" && fEl.newPassword.value!== fEl.newPasswordConfirm.value){
            u.form.addError(fEl.newPasswordConfirm, "The passwords you entered don't match.");
            return false;
        }
        if (fEl.newPasswordConfirm.value === fEl.newPassword.value && fEl.newPasswordConfirm.value!="" && new RegExp("^(?=.*\\d)(?=.*[A-Z])(?=.*[a-z]).{8,}$").test(fEl.newPassword.value)){
            u.form.removeErrors(fEl.newPasswordConfirm); 
            u.form.removeErrors(fEl.newPassword);
        }
    }
    
    //Security questions
    if (fEl.securityQuestion1 && fEl.securityQuestion2 && fEl.securityQuestion3){
    
    	//Questions
    	if (fEl.securityQuestion1.value !=="" && fEl.securityQuestion2.value !=="" && fEl.securityQuestion3.value !==""){
        	
        	//Check if they are the same questions
        	if (fEl.securityQuestion1.value === fEl.securityQuestion2.value){
        		u.form.addError(fEl.securityQuestion2, "Questions 1 and 2 are the same, you need to choose a different question.");
        		return false;
        	}
        	if (fEl.securityQuestion2.value === fEl.securityQuestion3.value){
        		u.form.addError(fEl.securityQuestion3, "Questions 2 and 3 are the same, you need to choose a different question.");
        		return false;
        	}
        	if (fEl.securityQuestion1.value === fEl.securityQuestion3.value){
        		u.form.addError(fEl.securityQuestion3, "Questions 1 and 3 are the same, you need to choose a different question.");
        		return false;
        	}
    	}
    	
    	//Answers
    	if (this.value && this.value.length > 100){
    		u.form.addError(this, "The answer your provided is too long.");
            return false;
    	}
    }
    
    
    u.form.removeErrors(this);
    return true;
    
} 