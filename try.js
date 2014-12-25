var fs = require('fs');
var exec = require('child_process').exec;

var child = exec('wpa_supplicant -c/etc/wpa_supplicant/wpa_supplicant.conf -iwlan0 -Dnl80211',function(err,sout){
	if(err) return console.log(err);

	console.log(sout.toString('utf8'))
})

setTimeout(function(){}, 30*1000)