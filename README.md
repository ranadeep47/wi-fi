wi-fi
=====

Note : Before you test in a debian system run
`sudo service network-manager stop`

To Test the functionality `node test/try.js`, after running dont forget to `pkill hostapd & ifconfig wlan0 up`

A simple node interface to linux(debian) wireless commands

```
var Wifi = require('wi-fi'),
	wifi = new Wifi(options) // options is optional, eg : {interface : 'wlan0', driver : 'wext'}

wifi.scan(function(err,list){}) // {'ssid1' : {..}, 'ssid2' : {..}}

wifi.connect(ssid,function(err,details){}); //
wifi.connect(ssid,passphrase,function(err,details){});

//interface is optional for all the functions

wifi.disconnect(function(err,disconnected){}) //disconnected is a boolean

wifi.enable([interface],function(err,enabled){}) // enabled is a boolean
wifi.disable([interface],function(err,disabled){}) // disabled is a boolean

wifi.status([interface],function(err,details){}) //

```
