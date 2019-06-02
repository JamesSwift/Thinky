<h2>Account Recovery</h2>

<p class="invalidCode" style="display:none;">
    This URL is invalid or has expired. Please <a href="/account/recovery">request a new account recovery email</a>.
</p>
<form style="display:none;">
        <div class="recoverySecurityQuestions">
            <b>Please answer the following security questions to confirm your identity:</b>
            
            <p class="securityQuestion1"></p>
            <p>
                <input type="text" name="securityAnswer1" data-required="true" data-minlength="3" placeholder="Your answer..."/>
            </p>
            
            
            <p class="securityQuestion2"></p>
            <p>
                <input type="text" name="securityAnswer2" data-required="true" data-minlength="3" placeholder="Your answer..." />
            </p>
            
            
            <p class="securityQuestion3"></p>
            <p>
                <input type="text" name="securityAnswer3" data-required="true" data-minlength="3" placeholder="Your answer..." />
            </p>
            <br/>
        </div>
        <b>Choose the password you would like to use in the future:</b>
        <p>
            New Password:<br/>
            <input type="password" name="newPassword" autocomplete="new-password" data-required="true" />
        </p>
        
        <p>
            Please enter your new password again:<br/>
            <input type="password" name="newPasswordConfirm" autocomplete="new-password" data-required="true" />
        </p>
        
        <input type="submit" value="Save Changes" />

</form>
<p class="updateError"></p>
<p class="recoverySuccessMessage" style="display:none;">
    Your account password has been reset. You may now log in with your new password.
</p>
