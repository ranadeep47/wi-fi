var Wifi = require('../index'),
	wifi = new Wifi();
wifi.scan(function(err,list){
	console.log('Available list of hotspots', Object.keys(list));
	wifi.connect('PIRATES','BlackPearl',function(err,connected){
		if(err) return console.log(err);
		console.log('Connect : ', connected);

		wifi.disconnect(function(err,done){
			if(err) return console.log(err);
			console.log('Disconnected from : Leaf-Hard',done);

			wifi.hotspot('HUB','leafwifi','wlan0',function(err,done){
				if(err) return console.log(err);
				console.log('Hotspot created', done)



wifi.scan(function(err,list){
	console.log('Available list of hotspots', Object.keys(list));
	wifi.connect('Leaf - A','$leafair$',function(err,connected){
		if(err) return console.log(err);
		console.log('Connect : ', connected);

		wifi.disconnect(function(err,done){
			if(err) return console.log(err);
			console.log('Disconnected from : Leaf-Hard',done);

			wifi.hotspot('HUB','leafwifi','wlan0',function(err,done){
				if(err) return console.log(err);
				console.log('Hotspot created', done)
			})
		})
	})
})






			})
		})
	})
})
