---
permalink: /home-lab/internal-router/
title: Internal Network Router
description: Configure OpenWRT as a router with HA Proxy and a Bind DNS Server
tags:
  - bind dns server
  - openwrt router
  - haproxy load balancer
  - openshift dns
  - openwrt ipxe boot
  - openwrt dhcp configuration
---
__Note:__ These instructions are superseded with my CLI that I wrote to ease the configuration.  I am retaining these instructions so that the curious among you can see the details behind what the Lab CLI abstracts.

### Prepare for Internal Network Router Configuration:

1. Select the Lab subdomain that you want to work with:

   ```bash
   labctx
   ```

1. Create an environment script to help configure the internal router:

   ```bash
   createEnvScript.sh -d=${SUB_DOMAIN}
   ```

1. Add env vars to the edge router for additional configuration:

   ```bash
   cat ${OKD_LAB_PATH}/work-dir/edge-router-sub | ssh root@router.${LAB_DOMAIN} "cat >> /root/.profile"
   ```

1. Add a forwarding zone to the edge router DNS:

   ```bash
   cat ${OKD_LAB_PATH}/work-dir/edge-zone | ssh root@router.${LAB_DOMAIN} "cat >> /etc/bind/named.conf"
   ssh root@router.${LAB_DOMAIN} "/etc/init.d/named stop && /etc/init.d/named start"
   ```

1. Create a static route in the edge router:

   ```bash
   # Create the route:
   ssh root@router.${LAB_DOMAIN} "unset ROUTE ; ROUTE=\$(uci add network route) ; \
      uci set network.\${ROUTE}.interface=lan ; \
      uci set network.\${ROUTE}.target=${DOMAIN_NETWORK} ; \
      uci set network.\${ROUTE}.netmask=${DOMAIN_NETMASK} ; \
      uci set network.\${ROUTE}.gateway=${DOMAIN_ROUTER_EDGE} ; \
      uci commit network"
   
   # Restart the network and DNS services:
   ssh root@router.${LAB_DOMAIN} "/etc/init.d/network restart"
   ssh root@router.${LAB_DOMAIN} "/etc/init.d/named stop && /etc/init.d/named start"
   ```

### Configure Internal Network Router:

1. Connect to your internal network router.  We'll set this up for our Dev OpenShift cluster:

    Connect from your workstation with a network cable.

1. Copy your SSH public key to the router for login:

   ```bash
   cat ~/.ssh/id_rsa.pub | ssh root@192.168.8.1 "cat >> /etc/dropbear/authorized_keys"
   ```

1. Add env vars to the edge router for additional configuration:

   ```bash
   cat ${OKD_LAB_PATH}/work-dir/internal-router | ssh root@192.168.8.1 "cat >> /root/.profile"
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

1. Configure the IP address and hostname:

   ```bash
   uci set network.wan.proto='static'
   uci set network.wan.ipaddr=${EDGE_IP}
   uci set network.wan.netmask=${NETMASK}
   uci set network.wan.gateway=${EDGE_ROUTER}
   uci set network.wan.hostname=router.${DOMAIN}
   uci set network.wan.dns=${EDGE_ROUTER}
   uci set network.lan.ipaddr=${ROUTER}
   uci set network.lan.netmask=${NETMASK}
   uci set network.lan.hostname=router.${DOMAIN}
   uci delete network.guest
   uci delete network.wan6
   uci commit network

   uci set system.@system[0].hostname=router.${DOMAIN}
   uci commit system
   ```

1. Configure the `wan` firewall zone to accept traffic and disable NAT:

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
     uci set firewall.@zone[${i}].input='ACCEPT'
     uci set firewall.@zone[${i}].output='ACCEPT'
     uci set firewall.@zone[${i}].forward='ACCEPT'
     uci set firewall.@zone[${i}].masq='0'
     uci commit firewall
   else
     echo "FIREWALL ZONE NOT FOUND, CCONFIGURE MANUALLY WITH LUCI"
   fi

   unset ENTRY
   ENTRY=$(uci add firewall forwarding)
   uci set firewall.${ENTRY}.src=wan
   uci set firewall.${ENTRY}.dest=lan
   uci commit firewall
   /etc/init.d/firewall restart
   ```

   __Note:__ You can safely ignore the errors:

   `! Skipping due to path error: No such file or directory`

   `RTNETLINK answers: Network unreachable`

1. Now power off the router, connect to the uplink port on the router to one of the LAN ports on your edge router:

   ```bash
   poweroff
   ```

### Finish Configuration:

1. Now, we should be able to log into our new internal network router:

   ```bash
   ssh root@${DOMAIN_ROUTER}
   ```

1. Install some additional packages on your router:

   ```bash
   opkg update && opkg install ip-full procps-ng-ps bind-server bind-tools wget haproxy bash shadow uhttpd
   ```

## Configure TFTP and PXE Booting

1. Configure DHCP and enable TFTP for PXE boot:

   ```bash
   uci add_list dhcp.lan.dhcp_option="6,${ROUTER}"
   uci set dhcp.lan.leasetime="5m"
   uci set dhcp.@dnsmasq[0].enable_tftp=1
   uci set dhcp.@dnsmasq[0].tftp_root=/data/tftpboot
   uci set dhcp.efi64_boot_1=match
   uci set dhcp.efi64_boot_1.networkid='set:efi64'
   uci set dhcp.efi64_boot_1.match='60,PXEClient:Arch:00007'
   uci set dhcp.efi64_boot_2=match
   uci set dhcp.efi64_boot_2.networkid='set:efi64'
   uci set dhcp.efi64_boot_2.match='60,PXEClient:Arch:00009'
   uci set dhcp.ipxe_boot=userclass
   uci set dhcp.ipxe_boot.networkid='set:ipxe'
   uci set dhcp.ipxe_boot.userclass='iPXE'
   uci set dhcp.uefi=boot
   uci set dhcp.uefi.filename='tag:efi64,tag:!ipxe,ipxe.efi'
   uci set dhcp.uefi.serveraddress="${ROUTER}"
   uci set dhcp.uefi.servername='pxe'
   uci set dhcp.uefi.force='1'
   uci set dhcp.ipxe=boot
   uci set dhcp.ipxe.filename='tag:ipxe,boot.ipxe'
   uci set dhcp.ipxe.serveraddress="${ROUTER}"
   uci set dhcp.ipxe.servername='pxe'
   uci set dhcp.ipxe.force='1'
   uci commit dhcp
   ```

1. Download the UEFI iPXE boot image:

   ```bash
   mkdir -p /data/tftpboot/ipxe
   mkdir /data/tftpboot/networkboot
   wget http://boot.ipxe.org/ipxe.efi -O /data/tftpboot/ipxe.efi
   ```

1. Create the initial boot file:

   ```bash
   cat << EOF > /data/tftpboot/boot.ipxe
   #!ipxe
   
   echo ========================================================
   echo UUID: \${uuid}
   echo Manufacturer: \${manufacturer}
   echo Product name: \${product}
   echo Hostname: \${hostname}
   echo
   echo MAC address: \${net0/mac}
   echo IP address: \${net0/ip}
   echo IPv6 address: \${net0.ndp.0/ip6:ipv6}
   echo Netmask: \${net0/netmask}
   echo
   echo Gateway: \${gateway}
   echo DNS: \${dns}
   echo IPv6 DNS: \${dns6}
   echo Domain: \${domain}
   echo ========================================================
   
   chain --replace --autofree ipxe/\${mac:hexhyp}.ipxe
   EOF
   ```

1. Now download the CentOS Stream kernel and ramdisk files to the router:

   ```bash
   wget http://mirror.centos.org/centos/8-stream/BaseOS/x86_64/os/isolinux/vmlinuz -O /data/tftpboot/networkboot/vmlinuz
   wget http://mirror.centos.org/centos/8-stream/BaseOS/x86_64/os/isolinux/initrd.img -O /data/tftpboot/networkboot/initrd.img
   ```

## Configure DNS

1. Backup the default bind configuration file.

   ```bash
   mv /etc/bind/named.conf /etc/bind/named.conf.orig
   ```

1. Set some variables for the new Bind configuration:

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
    ${EDGE_NETWORK}/${CIDR};
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

    forwarders { ${EDGE_ROUTER}; };

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

   zone "." IN {
    type hint;
    file "/etc/bind/db.root";
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

1. Create the forward lookup zone for our OpenShift lab:

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
   EOF
   ```

1. Create the reverse lookup zone:

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
   1    IN      PTR     router.${DOMAIN}.
   EOF
   ```

1. Create the necessary files, and set permissions for the bind user.

   ```bash
   mkdir -p /data/var/named/dynamic
   mkdir /data/var/named/data
   chown -R bind:bind /data/var/named
   chown -R bind:bind /etc/bind
   ```

1. Test the Bind configuration with the following command:

   ```bash
   named-checkconf
   ```

   If the output is clean, then you are ready to fire it up!

1. Now, tell `dnsmasq` not to hanlde DNS:

   ```bash
   uci set dhcp.@dnsmasq[0].domain=${DOMAIN}
   uci set dhcp.@dnsmasq[0].localuse=0
   uci set dhcp.@dnsmasq[0].cachelocal=0
   uci set dhcp.@dnsmasq[0].port=0
   uci commit dhcp
   /etc/init.d/dnsmasq restart
   ```

1. Finally, enable Bind:

   ```bash
   /etc/init.d/named enable
   /etc/init.d/named start
   ```

1. You can now test DNS resolution.  Try some `pings` or `dig` commands.

## Set up HA Proxy for our OpenShift cluster

1. First, save a copy of the original config file:

   ```bash
   mv /etc/haproxy.cfg /etc/haproxy.cfg.orig
   ```

1. Disable `lighttpd`.  We are going to use `uhttpd`.  Note: this will disable the GL-iNet GUI.  You can still use LUCI.

   ```bash
   /etc/init.d/lighttpd disable
   /etc/init.d/lighttpd stop
   ```

1. Configure `uhttpd` to only listen on specific interfaces.  We want HA Proxy to use `80` and `443` as well:

   ```bash
   uci del_list uhttpd.main.listen_http="[::]:80"
   uci del_list uhttpd.main.listen_http="0.0.0.0:80"
   uci del_list uhttpd.main.listen_https="[::]:443"
   uci del_list uhttpd.main.listen_https="0.0.0.0:443"
   uci add_list uhttpd.main.listen_http="${ROUTER}:80"
   uci add_list uhttpd.main.listen_https="${ROUTER}:443"
   uci add_list uhttpd.main.listen_http="127.0.0.1:80"
   uci add_list uhttpd.main.listen_https="127.0.0.1:443"
   uci commit uhttpd
   /etc/init.d/uhttpd enable
   /etc/init.d/uhttpd stop
   /etc/init.d/uhttpd start
   ```

1. Create a network interface for HA Proxy:

   ```bash
   uci set network.lan_lb01=interface
   uci set network.lan_lb01.ifname="@lan"
   uci set network.lan_lb01.proto="static"
   uci set network.lan_lb01.hostname="okd4-lb01.${DOMAIN}"
   uci set network.lan_lb01.ipaddr="${LB_IP}/${NETMASK}"
   uci commit network
   /etc/init.d/network reload
   ```

1. Create a user for HA Proxy:

   ```bash
   groupadd haproxy
   useradd -d /data/haproxy -g haproxy haproxy
   mkdir -p /data/haproxy
   chown -R haproxy:haproxy /data/haproxy
   ```

1. Create the HA Proxy configuration:

   ```bash
   cat << EOF > /etc/haproxy.cfg
   global

       log         127.0.0.1 local2

       chroot      /data/haproxy
       pidfile     /var/run/haproxy.pid
       maxconn     50000
       user        haproxy
       group       haproxy
       daemon

       stats socket /data/haproxy/stats

   defaults
       mode                    http
       log                     global
       option                  dontlognull
       option                  redispatch
       retries                 3
       timeout http-request    10s
       timeout queue           1m
       timeout connect         10s
       timeout client          10m
       timeout server          10m
       timeout http-keep-alive 10s
       timeout check           10s
       maxconn                 50000

   listen okd4-api 
       bind ${LB_IP}:6443
       balance roundrobin
       option                  tcplog
       mode tcp
       option tcpka
       option tcp-check
       server okd4-bootstrap ${NET_PREFIX}.49:6443 check weight 1
       server okd4-master-0 ${NET_PREFIX}.60:6443 check weight 1
       server okd4-master-1 ${NET_PREFIX}.61:6443 check weight 1
       server okd4-master-2 ${NET_PREFIX}.62:6443 check weight 1

   listen okd4-mc 
       bind ${LB_IP}:22623
       balance roundrobin
       option                  tcplog
       mode tcp
       option tcpka
       server okd4-bootstrap ${NET_PREFIX}.49:22623 check weight 1
       server okd4-master-0 ${NET_PREFIX}.60:22623 check weight 1
       server okd4-master-1 ${NET_PREFIX}.61:22623 check weight 1
       server okd4-master-2 ${NET_PREFIX}.62:22623 check weight 1

   listen okd4-apps 
       bind ${LB_IP}:80
       balance source
       option                  tcplog
       mode tcp
       option tcpka
       server okd4-master-0 ${NET_PREFIX}.60:80 check weight 1
       server okd4-master-1 ${NET_PREFIX}.61:80 check weight 1
       server okd4-master-2 ${NET_PREFIX}.62:80 check weight 1

   listen okd4-apps-ssl 
       bind ${LB_IP}:443
       balance source
       option                  tcplog
       mode tcp
       option tcpka
       option tcp-check
       server okd4-master-0 ${NET_PREFIX}.60:443 check weight 1
       server okd4-master-1 ${NET_PREFIX}.61:443 check weight 1
       server okd4-master-2 ${NET_PREFIX}.62:443 check weight 1
   EOF
   ```

1. Create a copy of the config minus the bootstrap node:

   ```bash
   cp /etc/haproxy.cfg /etc/haproxy.bootstrap && cat /etc/haproxy.cfg | grep -v bootstrap > /etc/haproxy.no-bootstrap
   ```

1. Enable HA Proxy:

   ```bash
   /etc/init.d/haproxy enable
   reboot
   ```
