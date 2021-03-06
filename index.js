/*
Before using this lib for testing in Deb/Ubuntu, do : sudo service network-manager stop

1. Enable/Disable WIFI
2. List out all the wifi networks available
3. Connect with any of the networks with appropriate creds
4. Make a WIFI hotspot to share the internet connection

http://substack.net/wireless_from_the_command_line_in_linux
https://packages.debian.org/wheezy/net/iw
http://wireless.kernel.org/en/users/Documentation/iw

http://w1.fi/hostapd/
http://wireless.kernel.org/en/users/Documentation/hostapd

http://linuxcommando.blogspot.in/2013/10/how-to-connect-to-wpawpa2-wifi-network.html
http://superuser.com/questions/615664/creating-wifi-access-point-on-a-single-interface-in-linux

TODO : Node 0.12 has synchronous child processes and list its advantages and stuff
*/

var cp 		= require('child_process'),
	exec 	= cp.exec,
	spawn 	= cp.spawn,
	fs 		= require('fs'),
	extend  = require('util')._extend;


module.exports = Wifi;

//Utils
var utils = require('./utils'),
	update_dhclient 		= utils.update_dhclient,
	update_wpa_supplicant	= utils.update_wpa_supplicant,
	parse_ssid_list 		= utils.parse_ssid_list,
	parse_link_status		= utils.parse_link_status,
	MAC_REGEX 				= utils.MAC_REGEX,
	IP_REGEX 				= utils.IP_REGEX,
	WPA_SUPPLICANT 			= utils.WPA_SUPPLICANT;

var hotspot = require('./hotspot');

function Wifi(options){
	var options = extend({}, options);
	this.interface = options.interface || 'wlan0';
	this.driver    = options.driver || 'nl80211';
	this.current   = null;

	this.status(function(err,conn){
		if(!err && conn.connected) {
			this.current = conn['SSID'];
		}
	})
}

Wifi.prototype.iface = function(interface,cb){
	var ctx = this;
	//Check if interface is present
	exec('iwconfig',function(err,sout,serr){

		if(err) cb(err,serr);
		else {
			if(sout.search(interface) > -1) {
				//TODO: search matches substring and name maybe incomplete
				//Interface found, set the interface
				ctx.interface = interface;
				cb(null,true);
			}
			else cb(new Error('Interface with that name is not found'),null);
		}
	});
}

Wifi.prototype.enable = function(interface,cb){
	var cmd;
	if(!cb) cb = interface;
	else if (this.interface != interface) this.iface(interface);

	cmd = 'ifconfig '+this.interface+' down && ifconfig '+this.interface + ' up';
	setTimeout(function(){
		exec(cmd,function(err,sout,serr){
			if(err) {
				cb(err,null);
				return;
			}
			cb(null,true)
		})
	},200)
}

Wifi.prototype.disalbe = function(interface,cb){
	var cmd;
	if(!cb) cb = interface;
	else if (this.interface != interface) this.iface(interface);

	cmd = 'ifconfig '+this.interface+' down';
	exec(cmd,function(err,sout,serr){
		if(err) {
			cb(err,null);
			return;
		}
		cb(null,true)
	})
}

Wifi.prototype.config = function(){
	//To change mac,ip,subnet etc of an interface
}

Wifi.prototype.scan = function(cb){
	if(!cb) throw new Error('Callback needed');
	var accessPoints,
		result;
		exec('iw dev wlan0 scan',function(err,sout,serr){
			if(err) cb(err,null)
			else {
				accessPoints 	= sout.split(/\nBSS/);
				cb(null,parse_ssid_list(accessPoints));
			}
		})
}

Wifi.prototype.connect = function(ssid,passphrase,cb){
	if(!ssid) throw new Error('connect needs an ssid and a callback, min 2 args reqd');
	var isSecured = false,interface = this.interface,ctx = this;
	if(!cb) cb = passphrase;
	else isSecured = true;
	//TODO : Check if the ssid is actually present and find its auth type
	if(isSecured) {
		//Kill previous instances of wpa_supplicant if any
		this.disconnect(function(err,disconnected){
			//Create wpa_supplicant.conf if it doesnt exist
			if(!err & disconnected) {
				update_wpa_supplicant(ssid,passphrase,function(err,updated){
					if(!err && updated) {
						try{
							fs.truncateSync('./out.log','');
						} catch(e){

						}
						ctx.current = wpa_connect(ctx);
						setTimeout(function(){
							var stdoutlog = fs.readFileSync('./out.log','utf8');
							if(!hasWrongPasscode(stdoutlog)) {
								//Extract mac , run dhclient
								update_dhclient(interface,function(err,updated){
									if(!err && updated) {
										ctx.status(interface,cb);
									}
									else cb(err,null)
								})
							}
							else {
								//TODO : Remove from wpa_supplicant
								cb(new Error('Wrong passcode'))
							}
						},10000)
						ctx.current.unref();


					}
					else cb(err,null);
				});
			}
			else cb(err,null)
		})
	}

	else {
		exec('iw dev '+interface+' connect -w '+ssid,function(err,sout,serr){
			if(err) {
				if(serr.search('Network is down') > -1) {
					//If networks is down, enable it and continue
					ctx.enable(interface,function(err,enabled){
						if(!err && enabled) ctx.connect(ssid,cb);
						else cb(err,null);
					})
				}
				else if (serr.search('Operation already in progress') > -1) {
					ctx.disconnect(function(err,disconnected){
						if(!err && disconnected) ctx.connect(ssid,cb);
						else cb(err,null)
					})
				}
				else cb(new Error(serr),null);
				return;
			}

			if(sout.search('connected to') > -1) {
				//Connected
				var mac = MAC_REGEX.exec(sout)[0];
				update_dhclient(interface,function(err,updated){
					if(!err && updated) {
						ctx.status(interface,cb);
					}	
					else cb(err,null);
				})

			}
			else cb(new Error(sout),null); // TODO, should err be null and {connected : false } ?
		})
	}
}

Wifi.prototype.disconnect = function(cb){
	var ctx = this;
	exec('pkill -9 hostapd',function(){
		ctx.enable(function(){
			exec('killall wpa_supplicant',function(err,sout,serr){
				if(err) {
					if(err.message.search('no process found') > -1) {
						exec('iw dev '+ctx.interface+ ' disconnect',function(err,sout,serr){
							if(err) {
								//TODO
							}
							cb(null,true);
						})
					}
					else cb(serr,null);
				}
				else {
					ctx.enable(cb);
					ctx.current = null;
				}
			})
		})
	})
}

Wifi.prototype.status = function(interface,cb){
	var cmd;
	if(!cb) cb = interface
	else if (interface && this.interface != interface) this.iface(interface);
	cmd = 'iw dev '+this.interface+' link';
	exec(cmd,function(err,sout,serr){
		if(err){
			cb(err,null);
			return;
		}

		if(/Connected to/.test(sout)){
			//Connected to a ap
			var result = parse_link_status(sout);
			result['connected'] = true;
			cb(null,result);
		}
		else if(/Not connected./.test(sout)){
			//Not connected to any ap
			cb(null,{connected : false});
		}
		else {
			//Command execution problem
			cb(new Error('Problem executing command "iw dev %interface% link"'),null);
		}
	})
}

Wifi.prototype.ip = function(iface,cb){
	if(!cb) {
		cb = iface;
		iface = 'wlan0'
	}

	var cmd = 'ip -f inet addr | grep '+iface+' | grep inet'
	exec(cmd,function(err,sout,serr){
		if(err) cb(serr);
		else {
			var ip = sout.trim().split(' ')[1];
			ip = IP_REGEX.exec(ip)[0]
			cb(null,ip)
		}
	})
}


Wifi.prototype.hotspot = function(ssid,passphrase,iface,cb){
		//Invote the ap-hotspot functionality

		if(!cb) {
			cb = iface;
			iface = 'wlan0';
		}
		hotspot.start(ssid,passphrase,iface,cb);
}

function hasWrongPasscode(str){
	if( str.search('4-Way Handshake failed - pre-shared key may be incorrect') > -1) return true;
	else return false;
}

function wpa_connect(ctx){
	var args = ["-D"+ctx.driver, "-i"+ctx.interface,"-c"+WPA_SUPPLICANT,'-fout.log','-B']
	var child = spawn('wpa_supplicant'
				,args
				,{}
				);
	return child;
}
