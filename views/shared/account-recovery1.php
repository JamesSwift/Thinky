<h2>Account Recovery</h2>

<div class="emailForm">
    <p>If you have forgotten your account password, you can use this form to regain access to your account. To begin, please enter your email address below:</p>
    <form>
        
        <p>
            <input type="email" name="email" data-required="true" placeholder="Email Address" />
        </p>
        
        
        <div class="recaptcha-area"></div>
        
        <br/>
        
        <input type="submit" value="Send Recovery Email" disabled />
    </form>
</div>
<div class="emailSent" style="display:none;">
    <p>
        If that email address is registered on our system then we will have sent a recovery email. Please check your inbox and follow the instructions in the email soon, as it expires in 60 minutes. 
    </p>
    <p>
        If you haven't received the email, please check for it in your spam/junk folder. 
        If you still can't find it, it could be that the email address you entered isn't actually registered on our system or that the email address was never verified (in which case no email will have been sent).
    </p>
</div>
<p class="updateError"></p>
