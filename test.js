var Wifi = require('./'),
	wifi = new Wifi({});

wifi.connect('VOLSBB',function(err,res){
	if(err) console.log(err)
	else console.log(res);
})

/*wifi.connect('securedSSID','passphrase',function(err,res){
	if(err) console.log(err)
	else console.log(res);
})
*/
