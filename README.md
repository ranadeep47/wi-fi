wi-fi
=====

A simple node interface to linux(debian) wireless commands

```
var Wifi = require('wi-fi'),
	wifi = new Wifi(options) // options is optional, eg : {interface : 'wlan0', driver : 'wext'}

wifi.scan(function(err,list){}) // {'ssid1' : {..}, 'ssid2' : {..}}

wifi.connect(ssid,function(err,details){}); //
wifi.connect(ssid,passphrase,function(err,details){});

//interface is optional for all the functions

wifi.disconnect(function(err,disabled){}) //disabled is a boolean

wifi.enable([interface],function(err,enabled){}) // enabled is a boolean
wifi.disable([interface],function(err,disabled){}) // enabled is a boolean

wifi.status([interface],function(err,details){}) //

```
