<?php

require_once $root . "/.submodules/defuse/defuse-crypto.phar";

function getEncryptionKey(){
    global $root;

    //Create new encryption key on first run
    if (!file_exists($root."/config/ek.txt")){
        $key = Defuse\Crypto\Key::createNewRandomKey();
        file_put_contents($root."/config/ek.txt", $key->saveToAsciiSafeString());
    }

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
