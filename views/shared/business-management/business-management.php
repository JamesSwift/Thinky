
<img class="logo"/>
<form>
    <table>
        <tr>
            <td>Business Name</td>
            <td><input type="text" name="businessName" data-required="true" /></td>
        </tr>
        <tr>
            <td>Description</td>
            <td><textarea name="description" data-required="true" /></textarea></td>
        </tr>
        <tr>
            <td>Opening Hours</td>
            <td><a class="schedule" href="javascript:undefined;">Edit Schedule</a></td>
        </tr>
        <tr>
            <td>VAT Registered</td>
            <td><input type="checkbox" name="vatRegistered" /></td>
        </tr>
        <tr>
            <td>Home Delivery</td>
            <td><input type="checkbox" name="deliveryOffered" /></td>
        </tr>  
        <tr>
            <td>Publicly Visible</td>
            <td><input type="checkbox" name="public" /></td>
        </tr> 
         
        <tr>
            <td>Stripe Account</td>
            <td>
                <a class="stripe-connect display-none" href=""><img src="/images/stripe-connect.png" alt="Connect to Stripe" /></a>
                <span class="stripe-connected display-none">Connected</span>
            </td>
        </tr> 
    </table>

    <input type="submit" value="Save Changes" disabled />
</form>
<p class="detailsError"></p>