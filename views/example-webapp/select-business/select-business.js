/* global u,app,controller */

var self = this,
    form = self.container.querySelector("form"),
    errorBox = self.container.querySelector(".errorBox"),
    select = self.container.querySelector("select"),
    businessesDB = controller.dataStore.query("businesses"),
    user = controller.getUserPermissions(),
    total = 0;


app.getConnectedBusinesses(function(allowed){
    
    if (allowed === null){
        self.render();
        return controller.navigateTo("/authorize-client");
    }
    
    try {
        var employeeBusinesses = user.permissions.employee;
        
        if (typeof employeeBusinesses !== "object" || employeeBusinesses == null || employeeBusinesses.length<1){
            throw Error("No businesses");
        }
        console.log(allowed);
        for (var i in employeeBusinesses){
            if (!employeeBusinesses.hasOwnProperty(i)) continue;
            
            if (allowed.indexOf(parseInt(i))===-1) continue;
            
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
        console.log(e);
        controller.lock();
        return self.errorSwitchView("403");
    }
    
    self.render();     
    
    if (total>=1){
        form.classList.remove("display-none");
    } else {
        return controller.navigateTo("/authorize-client");
    }
    
});


u.form.linkInputsToValidator(form);

form.onsubmit = function(e){
    e.preventDefault();
        
    if (!u.form.validate(form)) return false;
    
    app.setActiveBusiness(parseInt(select.value));
    controller.navigateTo("/");
}

