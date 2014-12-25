var Wifi = require('./index');

var wifi = new Wifi();

/*wifi.hotspot('leafwifi','leafwifi','wlan0',function(err,created){
	if(err) console.log(err)
	else console.log(created)
});*/
console.time('connect')
wifi.connect('Leaf-Hard','hardwear',function(err,c){
	console.timeEnd('connect')
	if(err) console.log(err.message)
	else console.log(c)
})