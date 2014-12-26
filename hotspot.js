var fs 	 = require('fs'),
	exec = require('child_process').exec,
	spawn = require('child_process').spawn; 

var LOGFILE = '/tmp/hostapd.log',
	PIDFILE = '/tmp/hotspot.pid',
	HOSTAPD_CONF = '/etc/hostapd-node.conf',
	DNSMASQ_CONF = '/etc/dnsmasq.d/dnsmasq-node.rules';

function isRoot(){
	//this script should be run as root
		return process.env['USER'] === 'root'
}

function rmf(path){
	try{
		fs.unlinkSync(path);
	} catch(e){
		//File doesnt exist/ ok meh
	}
}

function config(ssid,passphrase,iface){
	if(!iface) iface = 'wlan0'
	var HOSTAPD_CONF_CONTENTS =  "# WiFi Hotspot" + "\n" +
			"interface="+iface+ "\n" +
			"driver=nl80211"+ "\n" +
			"#Access Point"+ "\n" +
			"ssid="+ssid+"\n" +
			"hw_mode=g"+ "\n" +
			"# WiFi Channel:"+ "\n" +
			"channel=1 "+ "\n" +
			"macaddr_acl=0 "+ "\n" +
			"auth_algs=1 "+ "\n" +
			"ignore_broadcast_ssid=0"+ "\n" +
			"wpa=2"+ "\n" +
			"wpa_passphrase="+passphrase+ "\n" +
			"wpa_key_mgmt=WPA-PSK"+ "\n" +
			"wpa_pairwise=TKIP"+ "\n" +
			"rsn_pairwise=CCMP";

	//Write to the HOSTAPD_CONF file and 
	fs.appendFileSync(HOSTAPD_CONF,HOSTAPD_CONF_CONTENTS);

	var DNSMASQ_CONF_CONTENTS = "# Bind to only one interface"+ "\n" +
			"bind-interfaces"+ "\n" +
			"# Choose interface for binding "+ "\n" +
			"interface="+iface+"\n" +
			"# Specify range of IP addresses for DHCP leasses"+ "\n" +
			"dhcp-range=192.168.150.2,192.168.150.10,12h"+ "\n" +
			"#INTERFACE_NET="+iface;

	fs.appendFileSync(DNSMASQ_CONF,DNSMASQ_CONF_CONTENTS);
	fs.chmodSync(DNSMASQ_CONF,0755)


}

var start = exports.start = function(ssid,passphrase,iface,cb){
	if(!iface) iface = 'wlan0'
	//Check root
	if(isRoot()){
		//Stop previous services if running
		stop(iface,function(err,sout,serr){
			if(serr) {
				console.log('Errr',serr)
			}
			else {
				config(ssid,passphrase,iface);
				//Dnsmasq restart
				var start_dnsmasq = 'service dnsmasq restart'

				//Enable sysctl ipv4 forward 
				//Iptable rule
				var IPV4Forward = 'sysctl net.ipv4.ip_forward=1',
					iptableRule = 'iptables -t nat -A POSTROUTING -o '+iface+' -j MASQUERADE '

				//Run hostapd -B config
				var run_hostapd = 'hostapd -B '+HOSTAPD_CONF // add log file TODO

				exec('ifconfig '+iface+' 192.168.150.1',function(){
					exec(start_dnsmasq,function(){
						exec(IPV4Forward + ' && ' + iptableRule+ ' && ' +run_hostapd,function(err,sout,serr){
							if(serr) cb(serr,false)
							else cb(null,true)
						})
					});
				});
			}
		});
	}
}

var stop = exports.stop = function(iface,cb){
	if(!iface) iface = 'wlan0'
	//Remove the config files for hostapd and dnsmasq
	rmf(HOSTAPD_CONF);
	rmf(DNSMASQ_CONF);
	//Kill hostapd
	var stop_hostapd = 'service hostapd stop'
	var kill_hostpad = 'pkill -9 hostapd';

	//kill dnsmasq
	var stop_dnsmasq = 'service dnsmasq stop';
	var kill_wpasupplicat = 'pkill -9 wpa_supplicant';
	// iptables rule remove
	var iptableRuleRemove = 'iptables -D POSTROUTING -t nat -o '+iface+' -j MASQUERADE 2>&1',
		removeIPV4Forward = 'sysctl net.ipv4.ip_forward=0 2>&1';

	exec(
	kill_hostpad + " && " + kill_wpasupplicat+ " && " + stop_dnsmasq + " && " + iptableRuleRemove + " && " + removeIPV4Forward
	,cb);

/*	//ifconfig interface down and up
	var up = 'ifconfig '+iface+' up',
		down = 'ifconfig '+iface + ' down';
	exec(down,function(err){
		if(!err) exec(up)
	});*/

}