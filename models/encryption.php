<?php

//require_once $root . "/.submodules/defuse/defuse-crypto.phar";

function getEncryptionKey(){
    global $root;
    return Defuse\Crypto\Key::loadFromAsciiSafeString(file_get_contents($root."/config/ek.txt"));
}

function encrypt($input){
    return Defuse\Crypto\Crypto::encrypt($input, getEncryptionKey());
}

function decrypt($input){
    try {
        return Defuse\Crypto\Crypto::decrypt($input, getEncryptionKey());
    } catch (\Exception $e){
        return "";
    }
}