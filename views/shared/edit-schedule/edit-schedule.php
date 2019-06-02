<form>
    <?php
        $dates = "";
        for($hours=0; $hours<24; $hours++){
            for($mins=0; $mins<60; $mins+=15){
                $dates .= '<option value="'.str_pad($hours,2,'0',STR_PAD_LEFT).str_pad($mins,2,'0',STR_PAD_LEFT).'">';
                $dates .= str_pad($hours,2,'0',STR_PAD_LEFT).':'.str_pad($mins,2,'0',STR_PAD_LEFT);
                $dates .= '</option>';
            }
        }
        $datesStart = $dates.'<option value="2400">24:00</option>';
        $datesFinish = $dates.'<option value="2400" selected>24:00</option>';
        
        function timeTemplate($datesStart, $datesFinish){
            
            print '<div>';
                print '<select name="start">';
                    print $datesStart;
                print '</select>';
                print ' - ';
                print '<select name="finish">';
                    print $datesFinish;
                print '</select>';
                print '<input type="button" class="delete display-none" value="&#10005;" />';
            print '</div>';  
        }
    
        foreach (["monday","tuesday","wednesday","thursday","friday","saturday","sunday"] as $day){
            $id = rand(0,99999);
            print '<div class="day '.$day.'"><input type="checkbox" name="'.$day.'Available" id="day'.$id.'"/>';
            print '<label for="day'.$id.'" class="disabled">'.ucfirst($day).'</label>';
            
            print '<fieldset disabled>';
                print '<input type="button" class="add" value="&#65291;" />';
                timeTemplate($datesStart, $datesFinish);
            print '</fieldset></div>';
        }
    ?>
    <input type="submit" value="Done" />
</form>
<div class="display-none template">
    <?php
        timeTemplate($datesStart, $datesFinish)
    ?>
</div>


<p class="detailsError"></p>
