<h2>Create an Account</h2>
<form>
	<table>
		<tr>
			<td>Title</td>
			<td><select name="title" />
				<option>Mr.</option>
				<option>Ms.</option>
				<option>Mrs.</option>
				<option>Miss.</option>
				<option>Dr.</option>
			</select></td>
		</tr>    
		<tr>
			<td>First Name</td>
			<td><input type="text" name="firstName" data-required="true" /></td>
		</tr>
		<tr>
			<td>Middle Name(s)</td>
			<td><input type="text" name="middleNames" /></td>
		</tr>        
		<tr>
			<td>Last Name</td>
			<td><input type="text" name="lastName" data-required="true" /></td>
		</tr>
		<tr>
			<td>Primary Phone No.</td>
			<td><input type="tel" name="primaryPhoneNumber" data-required="true" /> 
				<a href="javascript:void(0);" class="help-icon help-primaryPhoneNumber">i</a>
			</td>
		</tr>
		<tr>
			<td>Alternate Phone No.</td>
			<td><input type="tel" name="secondaryPhoneNumber" /></td>
		</tr>        
		<tr>
			<td>Email Address</td>
			<td><input type="email" name="email" data-required="true" /> 
				<a href="javascript:void(0);" class="help-icon help-email">i</a>
			</td>
		</tr>
		<tr>
			<td>Password</td>
			<td><input type="password" name="newPassword" data-required="true" /></td>
		</tr> 
		<tr>
			<td>Type Your Password Again</td>
			<td><input type="password" name="newPasswordConfirm" data-required="true" /></td>
		</tr>
	</table>
	<p>
		<input type="checkbox" id="agreeToTerms" name="agreeToTerms" data-required="true" /> 
		<label for="agreeToTerms">I consent to my information being collected in accord with the <a href="javascript:void(0);" class="privacy">privacy policy</a></label>
	<p>
	<div class="recaptcha-area"></div>
	<br/>
	<input type="submit" value="Create Account" disabled>
	<p class="registerError"></p>
</form>
