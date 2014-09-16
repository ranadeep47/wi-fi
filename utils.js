var MAC_REGEX 		= exports.MAC_REGEX 		= /([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})/;
var WPA_SUPPLICANT 	= exports.WPA_SUPPLICANT 	= '/etc/wpa_supplicant/wpa_supplicant.conf';

var exec = require('child_process').exec,
	fs 	 = require('fs');

exports.update_dhclient = function(interface,cb){
	exec('dhclient '+interface,function(err,sout,serr){
		if(err) cb(new Error(serr),null);
		else {
			//Relase the lease file if this error occurs
			if(sout.search('File exists') > -1) {
				exec('dhclient -r '+interface+' && dhclient '+interface,function(err,sout,serr){
					if(err) {
						cb(new Error(serr));
						return;
					}
					cb(null,true)
				})
			}
			else cb(null,true)
		}
	})
}


exports.update_wpa_supplicant = function(ssid,passphrase,cb){
	var NETWORK_REGEX = /network=\{([^}])+\}/g,
		update_needed = false;

	fs.readFile(WPA_SUPPLICANT,'utf8',function(err,contents){
		//read file contents to memory
		if(!contents) {
			//create file and return
			generate_supplicant(ssid,passphrase,function(err,network){
				fs.appendFile(WPA_SUPPLICANT,network+'\n',function(err){
					if(err) cb(err,false);
					else cb(null,true)
				})
			})

			return;
		}
		var networks = contents.match(NETWORK_REGEX);
		for(var i=0,len=networks.length; i < len; i++) {
			var network = networks[i],
				pairs   = network.split('\n\t');

			if(pairs[1] === 'ssid="'+ssid+'"') {
				//Network of our interest 
				if(pairs[2].replace('#','') !== 'psk="'+passphrase+'"'){
					//Passphrase changed
					update_needed = true;

					(function(i){ //Create a closure for i since generate_supplicant is async and i changes
						generate_supplicant(ssid,passphrase,function(err,network){
							if(err) {
								cb(err,null);
								return;
							}
							networks.splice(i,1,network);
							fs.unlinkSync(WPA_SUPPLICANT);
							networks.forEach(function(network){fs.appendFileSync(WPA_SUPPLICANT,network+'\n')});
							cb(null,true);
						});
					})(i);
				}
			}
			
		}
		if(!update_needed) {
			generate_supplicant(ssid,passphrase,function(err,network){
				if(err){
					cb(err,null)
					return;
				}
				fs.appendFileSync(WPA_SUPPLICANT,network+'\n');
				cb(null,true)
			});
		}
	})
}


function generate_supplicant(ssid,passphrase,cb){
	ssid = ssid.trim();
	passphrase = passphrase.trim();
	exec('wpa_passphrase '+ssid+' '+passphrase,function(err,sout,serr){
		if(err) cb(serr,null);
		else cb(null,sout);
	});
}

exports.parse_link_status = function(stdout){
	var lines 		= stdout.split('\n'),
		result 		= {},
		pairs;

	result['mac']   = MAC_REGEX.exec(lines.shift())[0];
	pairs 			= parse_key_value(lines);
	for (var key in pairs) result[key] = pairs[key]

	return result;
}

exports.parse_ssid_list = function(accessPoints){
	var result = {};
	accessPoints.forEach(function(ap){
		var lines,mac,pairs = {};
		lines 		= ap.split(/\n/);
		mac 	 	= lines.shift().match(MAC_REGEX)[0]
		pairs = parse_key_value(lines);
		pairs['mac'] = mac;
		result[pairs['SSID']] = pairs
	})

	return result;
}

function parse_key_value(lines){
	var result = {};
	lines.forEach(function(line){
		//If there are still new lines, return
		if(line.length < 1) return;
		//shift and join because SSID and other key's values may have colons(:) TODO: Verify
		var pair 	= line.split(':'),
			key  	= pair.shift().replace(/\t/,'').trim(),
			value 	= pair.join(':').trim();

		result[key] = value;
	})

	return result;
}