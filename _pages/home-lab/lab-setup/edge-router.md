---
permalink: /home-lab/edge-router/
title: "Edge Network Router - GL-MV1000W"
description: "Set up OpenWRT with Bind DNS"
sidebar:
  nav: lab-setup
tags:
  - openwrt
  - bind
  - dns
  - glinet
  - mv1000
  - brume
---

The operating system running your router is OpenWRT.  Find out more here: [OpenWRT](https://openwrt.org)

1. If you don't have an SSH key pair configured on your workstation, then create one now:

    ```bash
    ssh-keygen -t rsa -b 4096 -N "" -f /root/.ssh/id_rsa
    ```

1. Connect to your edge router:

    For the `GL-MV1000W` you can connect to the WiFi.  The initial SSID and passphrase are on the back of the router.

    Otherwise, connect from your workstation with a network cable.

1. Copy your SSH public key to the router for login:

    ```bash
    cat ~/.ssh/id_rsa.pub | ssh root@192.168.8.1 "cat >> /etc/dropbear/authorized_keys"
    ```

1. Create an environment script to help configure the router:

   ```bash
   createEnvScript.sh -e -c=${OKD_LAB_PATH}/lab-config/lab.yaml
   cat ${OKD_LAB_PATH}/work-dir/edge-router | ssh root@192.168.8.1 "cat >> /root/.profile"
   rm -rf ${OKD_LAB_PATH}/work-dir
   ```

1. Log into the router:

    ```bash
    ssh root@192.168.8.1
    ```

1. Set a root password:

    ```bash
    passwd
    ```

1. Create an SSH key pair:

   ```bash
   mkdir -p /root/.ssh
   dropbearkey -t rsa -s 4096 -f /root/.ssh/id_dropbear
   ```

1. Disable password login:

   ```bash
   uci set dropbear.@dropbear[0].PasswordAuth='off'
   uci set dropbear.@dropbear[0].RootPasswordAuth='off'
   uci commit dropbear
   ```

1. Configure the IP address:

   ```bash
   uci set network.lan.ipaddr="${ROUTER}"
   uci set network.lan.netmask=${NETMASK}
   uci set network.lan.hostname=router.${DOMAIN}
   uci delete network.guest
   uci delete network.wan6
   uci commit network
   ```

1. Configure DHCP:

   ```bash
   uci set dhcp.lan.leasetime='5m'
   uci set dhcp.lan.start='11'
   uci set dhcp.lan.limit='19'
   uci add_list dhcp.lan.dhcp_option="6,${ROUTER}"
   uci delete dhcp.guest

   uci commit dhcp
   ```

1. Configure a Wireless repeater to your home Wifi:

   ```bash
   uci delete wireless.guest2g
   uci delete wireless.sta2

   uci set wireless.radio2.disabled='0'
   uci set wireless.radio2.repeater='1'
   uci set wireless.radio2.legacy_rates='0'
   uci set wireless.radio2.htmode='HT20'
   uci set wireless.sta=wifi-iface
   uci set wireless.sta.device='radio2'
   uci set wireless.sta.ifname='wlan2'
   uci set wireless.sta.mode='sta'
   uci set wireless.sta.disabled='0'
   uci set wireless.sta.network='wwan'
   uci set wireless.sta.wds='0'
   uci set wireless.sta.ssid='Your-WiFi-SSID'  # Replace with your WiFi SSID
   uci set wireless.sta.encryption='psk2'      # Replace with your encryption type
   uci set wireless.sta.key='Your-WiFi-Key'    # Replace with your WiFi Key
   uci commit wireless
   ```

1. Create a Network Interface for the repeater:

   ```bash
   uci set network.wwan=interface
   uci set network.wwan.proto='dhcp'
   uci set network.wwan.metric='20'
   uci commit network
   ```

1. Add the `wwan` network to the `wan` firewall zone:

   ```bash
   unset zone
   let i=0
   let j=1
   while [[ ${j} -eq 1 ]]
   do
     zone=$(uci get firewall.@zone[${i}].name)
     let rc=${?}
     if [[ ${rc} -ne 0 ]]
     then
       let j=2
      elif [[ ${zone} == "wan" ]]
      then
        let j=0
      else
        let i=${i}+1
      fi
   done
   if [[ ${j} -eq 0 ]]
   then
     uci add_list firewall.@zone[${i}].network='wwan'
     uci commit firewall
    else
      echo "FIREWALL ZONE NOT FOUND, CCONFIGURE MANUALLY WITH LUCI"
    fi
   ```

1. Configure a Wireless Network for Your Lab:

   ```bash
   uci set wireless.default_radio0=wifi-iface
   uci set wireless.default_radio0.device='radio0'
   uci set wireless.default_radio0.ifname='wlan0'
   uci set wireless.default_radio0.network='lan'
   uci set wireless.default_radio0.mode='ap'
   uci set wireless.default_radio0.disabled='0'
   uci set wireless.default_radio0.ssid='OKD-LAB'
   uci set wireless.default_radio0.key='WelcomeToMyLab'
   uci set wireless.default_radio0.encryption='psk2'
   uci set wireless.default_radio0.multi_ap='1'
   uci set wireless.radio0.legacy_rates='0'
   uci set wireless.radio0.htmode='HT20'
   uci commit wireless
   ```

1. Now restart the router:

   ```bash
   reboot
   ```

## DNS Configuration

Now, we will set up Bind to serve DNS.  We will also disable the DNS functions of dnsmasq to let Bind do all the work.

1. Connect your workstation to your new lab WiFi network, and log into the router:

   ```bash
   EDGE_ROUTER=$(yq e ".router" ${OKD_LAB_PATH}/lab-config/lab.yaml)
   ssh root@${EDGE_ROUTER}
   ```

1. Install some additional packages on your router

   ```bash
   opkg update && opkg install ip-full procps-ng-ps bind-server bind-tools
   ```

1. Backup the default bind config.

   ```bash
   mv /etc/bind/named.conf /etc/bind/named.conf.orig
   ```

1. Set some variables:

   ```bash
   CIDR=$(ip -br addr show dev br-lan label br-lan | cut -d" " -f1 | cut -d"/" -f2)
   IFS=. read -r i1 i2 i3 i4 << EOF
   ${ROUTER}
   EOF
   net_addr=$(( ((1<<32)-1) & (((1<<32)-1) << (32 - ${CIDR})) ))
   o1=$(( ${i1} & (${net_addr}>>24) ))
   o2=$(( ${i2} & (${net_addr}>>16) ))
   o3=$(( ${i3} & (${net_addr}>>8) ))
   o4=$(( ${i4} & ${net_addr} ))
   NET_PREFIX=${o1}.${o2}.${o3}
   NET_PREFIX_ARPA=${o3}.${o2}.${o1}
   ```

1. Create the Bind config file:

   ```bash
   cat << EOF > /etc/bind/named.conf
   acl "trusted" {
    ${NETWORK}/${CIDR};
    127.0.0.1;
   };

   options {
   listen-on port 53 { 127.0.0.1; ${ROUTER}; };
   
   directory  "/data/var/named";
   dump-file  "/data/var/named/data/cache_dump.db";
   statistics-file "/data/var/named/data/named_stats.txt";
   memstatistics-file "/data/var/named/data/named_mem_stats.txt";
   allow-query     { trusted; };

   recursion yes;

   dnssec-enable yes;
   dnssec-validation yes;

   /* Path to ISC DLV key */
   bindkeys-file "/etc/bind/bind.keys";

   managed-keys-directory "/data/var/named/dynamic";

   pid-file "/var/run/named/named.pid";
   session-keyfile "/var/run/named/session.key";

   };

   logging {
         channel default_debug {
                  file "data/named.run";
                  severity dynamic;
         };
   };

   zone "${DOMAIN}" {
      type master;
      file "/etc/bind/db.${DOMAIN}"; # zone file path
   };

   zone "${NET_PREFIX_ARPA}.in-addr.arpa" {
      type master;
      file "/etc/bind/db.${NET_PREFIX_ARPA}";
   };

   zone "localhost" {
      type master;
      file "/etc/bind/db.local";
   };

   zone "127.in-addr.arpa" {
      type master;
      file "/etc/bind/db.127";
   };

   zone "0.in-addr.arpa" {
      type master;
      file "/etc/bind/db.0";
   };

   zone "255.in-addr.arpa" {
      type master;
      file "/etc/bind/db.255";
   };

   EOF
   ```

1. Create the forward lookup zone:

   ```bash
   cat << EOF > /etc/bind/db.${DOMAIN}
   @       IN      SOA     router.${DOMAIN}. admin.${DOMAIN}. (
               3          ; Serial
               604800     ; Refresh
               86400     ; Retry
               2419200     ; Expire
               604800 )   ; Negative Cache TTL
   ;
   ; name servers - NS records
      IN      NS     router.${DOMAIN}.

   ; name servers - A records
   router.${DOMAIN}.         IN      A      ${ROUTER}

   ; ${NETWORK}/${CIDR} - A records
   bastion.${DOMAIN}.         IN      A      ${BASTION_HOST}
   nexus.${DOMAIN}.           IN      A      ${BASTION_HOST}
   EOF
   ```

   Create the reverse lookup zone:

   ```bash
   cat << EOF > /etc/bind/db.${NET_PREFIX_ARPA}
   @       IN      SOA     router.${DOMAIN}. admin.${DOMAIN}. (
                                 3         ; Serial
                           604800         ; Refresh
                           86400         ; Retry
                           2419200         ; Expire
                           604800 )       ; Negative Cache TTL

   ; name servers - NS records
         IN      NS      router.${DOMAIN}.

   ; PTR Records
   1.${NET_PREFIX_ARPA}    IN      PTR     router.${DOMAIN}.
   10.${NET_PREFIX_ARPA}    IN      PTR     bastion.${DOMAIN}.
   EOF
   ```

1. Create the necessary files, and set permissions for the bind user.

   ```bash
   mkdir -p /data/var/named/dynamic
   mkdir /data/var/named/data
   chown -R bind:bind /data/var/named
   chown -R bind:bind /etc/bind
   ```

1. When you have completed all of your configuration changes, you can test the configuration with the following command:

   ```bash
   named-checkconf
   ```

   If the output is clean, then you are ready to fire it up!

1. First, tell `dnsmasq` not to hanlde DNS:

   ```bash
   uci set dhcp.@dnsmasq[0].domain=${DOMAIN}
   uci set dhcp.@dnsmasq[0].localuse=0
   uci set dhcp.@dnsmasq[0].cachelocal=0
   uci set dhcp.@dnsmasq[0].port=0
   uci commit dhcp
   /etc/init.d/dnsmasq restart
   ```

1. Then, tell the router to use itself for DNS.

   ```bash
   uci set network.wan.dns=${ROUTER}
   uci commit network
   ```

1. Finally, enable Bind and reboot the router:

   ```bash
   /etc/init.d/named enable
   /etc/init.d/named start
   ```

1. Now it's time to set up your Bastion host:

   __[Bastion Host](/home-lab/bastion-pi/)__
