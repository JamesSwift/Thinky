<h2>My Contact Details</h2>
<form class="display-none">
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
			<td><input type="tel" name="primaryPhoneNumber" data-required="true" /></td>
		</tr>
		<tr>
			<td>Alternate Phone No.</td>
			<td><input type="tel" name="secondaryPhoneNumber" /></td>
		</tr>        
		<tr>
			<td>Email Address</td>
			<td><input type="email" name="email" data-required="true" /> 
			</td>
		</tr>
		
    </table>
    <input type="submit" value="Save Changes" />

</form>
<p class="detailsError"></p>
