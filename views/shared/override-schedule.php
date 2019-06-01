<?php $rand = rand(999,9999); ?>
<div class="override">
    <h2>Close Early</h2>
    <p class="question">How long will you be closed?</p>
    <form>
    	<input type='radio' class='schedule' id='schedule<?php print $rand; ?>' name='overrideUntil' value='scheduled' checked /> 
    		<label for='schedule<?php print $rand; ?>'>
    		    Until the next scheduled opening:<br/>
    		    <span class='nextTime' style='margin-left:35px;'></span>
    		    </label>
    	<br/><br/>
    	<input type='radio'class='date' id='date<?php print $rand; ?>' name='overrideUntil' value='date' /> 
    		<label for='date<?php print $rand; ?>'>
    		    Until a specific date and time:<br/>
    		    <input style='margin-left:35px;' type='date' name='date' value="<?php print date("Y-m-d"); ?>" /> <input type='time' step='60' name='time'/> 
        </label>
    	<br/><br/>
    	<input type='submit' value='Close Early' />
    	
    </form>
    <p class='note display-none'>
    	Note: Once the date and time you enter has passed, the business will resume it's scheduled opening hours. 
    	If at the time you have entered the business is not scheduled to be open, then the business will appear closed untill the next scheduled opening.
    <p>
</div>
<div class="resume display-none">
    <h2>Resume Business Schedule</h2>
    <p>
        Are you sure you wish to resume your normal schedule?
    </p>
    <input type="button" class="yes" value="Yes" /> 
    <input type="button" class="no" value="No" />
</div>

<p class="errorBox"></p>