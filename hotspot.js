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
	if(!interface) iface = 'wlan0'
	var HOSTAPD_CONF_CONTENTS =  "# WiFi Hotspot \
			interface= "+iface+"\
			driver=nl80211 \
			#Access Point \
			ssid="+ssid+" \
			hw_mode=g \
			# WiFi Channel: \
			channel=1 \
			macaddr_acl=0 \
			auth_algs=1 \
			ignore_broadcast_ssid=0 \
			wpa=2 \
			wpa_passphrase="+passphrase+" \
			wpa_key_mgmt=WPA-PSK \
			wpa_pairwise=TKIP \
			rsn_pairwise=CCMP";

	//Write to the HOSTAPD_CONF file and 
	fs.appendFileSync(HOSTAPD_CONF,HOSTAPD_CONF_CONTENTS);

	var DNSMASQ_CONF_CONTENTS = "# Bind to only one interface \
			bind-interfaces \
			# Choose interface for binding \
			interface="+iface+" \
			# Specify range of IP addresses for DHCP leasses \
			dhcp-range=192.168.150.2,192.168.150.10,12h \
			#INTERFACE_NET="+iface;

	fs.appendFileSync(DNSMASQ_CONF,DNSMASQ_CONF_CONTENTS);


}

var start = exports.start = function(ssid,passphrase,iface){
	if(!iface) iface = 'wlan0'
	//Check root
	if(isRoot()){
		//Stop previous services if running
		stop(true);

		config(ssid,passphrase,iface);
		//Dnsmasq restart
		var start_dnsmasq = 'service dnsmasq restart'
		exec();

		//Enable sysctl ipv4 forward 
		//Iptable rule
		var IPV4Forward = 'sysctl net.ipv4.ip_forward=1 2>&1',
			iptableRule = 'iptables -t nat -A POSTROUTING -o '+iface+' -j MASQUERADE 2>&1'
		exec(IPV4Forward + ' && ' + iptableRule);

		//Run hostapd -B config
		var run_hostapd = 'nohup hostapd -B '+HOSTAPD_CONF // add log file TODO
		exec(run_hostapd);

	}
}

var stop = exports.stop = function(firsttime,iface){
	if(!iface) iface = 'wlan0'
	//Remove the config files for hostapd and dnsmasq
	rmf(HOSTAPD_CONF);
	rmf(DNSMASQ_CONF);
	//Kill hostapd
	var kill_hostpad = 'pkill -9 hostapd';
	exec(kill_hostpad)

	//kill dnsmasq
	var stop_dnsmasq = 'service dnsmasq stop'
	exec(stop_dnsmasq)

	// iptables rule remove
	var iptableRuleRemove = 'iptables -D POSTROUTING -t nat -o '+iface+' -j MASQUERADE 2>&1',
		removeIPV4Forward = 'sysctl net.ipv4.ip_forward=0 2>&1';

	exec(iptableRuleRemove + ' && ' + removeIPV4Forward);

	if(!firsttime){
		//ifconfig interface down and up
		var up = 'ifconfig '+iface+' up',
			down = 'ifconfig '+iface + ' down';
		exec(down,function(err){
			if(!err) exec(up)
		});
	}

}

exports.restart = function(){
	stop();
	start();
}