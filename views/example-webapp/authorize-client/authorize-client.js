/* global u,app,controller */

var self = this,
    form = self.container.querySelector("form"),
    errorBox = self.container.querySelector(".errorBox"),
    businessChoice = self.container.querySelector(".businessChoice"),
    select = self.container.querySelector(".businessChoice select"),
    user = controller.getUserPermissions(),
    employeeBusinesses,
    businessesDB = controller.dataStore.query("businesses"),
    total = 0;


try {
    employeeBusinesses = user.permissions.employee;
    
    if (typeof employeeBusinesses !== "object" || employeeBusinesses == null || employeeBusinesses.length<1){
        throw Error("No businesses");
    }
    
    for (var i in employeeBusinesses){
        if (!employeeBusinesses.hasOwnProperty(i)) continue;
        var perms = employeeBusinesses[i];
        if ( ("ALL" in perms && perms['ALL'] === true) || ("authorizeClient" in perms && perms["authorizeClient"] === 1)){
            var option = document.createElement("option");
            option.value = i;
            option.appendChild(document.createTextNode(businessesDB[i].businessName));
            select.appendChild(option);
            total ++;
        }
    }
    
    if (total<1){
        throw Error("No businesses");
    }
    
} catch (e) {
    controller.lock();
    return self.errorSwitchView("403");
}

if (total>1){
    businessChoice.classList.remove("display-none");
}

    
self.render();

u.form.linkInputsToValidator(form);

form.onsubmit = function(e){
    e.preventDefault();
        
    if (!u.form.validate(form)) return false;
    
    errorBox.innerHTML = "";
    
    var data = u.form.getValues(form);
    
    u.loading.push();
    self.authenticatedApiRequest(
        "businesses/authorizeClient", 
        data, 
        function(response){
            
            u.loading.pop();
            
            app.setActiveBusiness(parseInt(data.businessID))
            
            controller.navigateTo("/");
        }, 
        u.standardFailureHandler(errorBox, form)
    );
    
}

