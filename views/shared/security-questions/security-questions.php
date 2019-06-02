<h2>Acount Security Questions</h2>
<p>
    Storing your answers to these questions improves the security of your account. 
    If a password reset is requested, these questions must be answered correctly as part of the process.
</p>
<br/>


<div class="securityQuestions-cq" style="display:none;">
    <h3>Current Security Questions</h3>
    <p>
        <b>Question 1:</b> 
        <span class="securityQuestions-cq1">loading...</span>
    </p>
    <p>
        <b>Question 2:</b> 
        <span class="securityQuestions-cq2">loading...</span>
    </p>
    <p>
        <b>Question 3:</b> 
        <span class="securityQuestions-cq3">loading...</span>
    </p>
    <br/>
</div>

<?php
    //Get list of security questions
    require_once($root."/models/validation.php");
    $qs = getSecurityQuestions();
    $options = '<option value="">Select...</option>';
    if (is_array($qs)){
        foreach ($qs as $id=>$q){
            $options .= '<option value="'.htmlspecialchars($id).'">'.htmlspecialchars($q).'</option>';
        }
    }
?>
<h3>Set New Security Questions</h3>
<div class="securityQuestions-New">
    <form>
        <p>Question 1: <select name="securityQuestion1" data-required="true">
            <?php print $options; ?>
        </select></p>
        <p>
            Answer 1: <input type="text" name="securityAnswer1" data-required="true" data-minlength="3" />
        </p>
        
        <br/>
        <p>Question 2: <select name="securityQuestion2" data-required="true">
            <?php print $options; ?>
        </select></p>
        <p>
            Answer 2: <input type="text" name="securityAnswer2" data-required="true" data-minlength="3" />
        </p>
        <br/>
        <p>Question 3: <select name="securityQuestion3" data-required="true">
            <?php print $options; ?>
        </select></p>
        <p>
            Answer 3: <input type="text" name="securityAnswer3" data-required="true" data-minlength="3" />
        </p>

        <input type="submit" value="Save Changes" />
        
        <p class="updateError"></p>
    </form>
</div>