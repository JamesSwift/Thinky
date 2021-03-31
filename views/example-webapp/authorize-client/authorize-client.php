<h2>Authorize This Device</h2>
<p>Before this device can be used, it must be linked to your business.</p>
<form>
<p class="businessChoice display-none">
	Choose which business you want to connect this device to:<br/>
	<select name="businessID"></select>
</p>	
<p>
	Enter your password to confirm:<br/>
	<input type="password" name="currentPassword" data-required="true" />
</p>
<div class="errorBox"></div>
<input type="submit" value="Save Changes" />
</form>