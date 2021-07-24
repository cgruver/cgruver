---
layout: page
permalink: /home-lab/internal-router/
title: Internal Network Router
---

1. Copy your SSH public key to the router for login:

    ```bash
    cat ~/.ssh/id_rsa.pub | ssh root@192.168.8.1 "cat >> /etc/dropbear/authorized_keys"
    ```

1. Create an environment script to help configure the router:

   ```bash
   ${OKD4_LAB_PATH}/bin/createEnvScript.sh -c=1
   cat ${OKD4_LAB_PATH}/work-dir/internal-router | ssh root@192.168.8.1 "cat >> /root/.profile"
   ```

1. Add env vars to the edge router for additional configuration:

   ```bash
   cat ${OKD4_LAB_PATH}/work-dir/edge-router | ssh root@${EDGE_ROUTER} "cat >> /root/.profile"
   ```

1. Add a forwarding zone to the edge router DNS:

   ```bash
   cat ${OKD4_LAB_PATH}/work-dir/edge-zone | ssh root@${EDGE_ROUTER} "cat >> /etc/bind/named.conf"
   ssh root@${EDGE_ROUTER} "/etc/init.d/named restart"
   rm -rf ${OKD4_LAB_PATH}/work-dir
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
   uci set network.wan.proto='static'
   uci set network.wan.ipaddr=${EDGE_IP}
   uci set network.wan.netmask=${NETMASK}
   uci set network.wan.gateway=${EDGE_ROUTER}
   uci set network.lan.ipaddr=${ROUTER}
   uci set network.lan.netmask=${NETMASK}
   uci delete network.guest
   uci delete network.wan6
   uci commit network
   ```

1. Configure DHCP and enable TFTP for PXE boot:

   ```bash
   uci add_list dhcp.lan.dhcp_option="6,${ROUTER},8.8.8.8,8.8.4.4"
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
   uci set dhcp.uefi.serveraddress='${ROUTER}'
   uci set dhcp.uefi.servername='pxe'
   uci set dhcp.uefi.force='1'
   uci set dhcp.ipxe=boot
   uci set dhcp.ipxe.filename='tag:ipxe,boot.ipxe'
   uci set dhcp.ipxe.serveraddress='${ROUTER}'
   uci set dhcp.ipxe.servername='pxe'
   uci set dhcp.ipxe.force='1'
   uci commit dhcp
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
   ```

1. Now power off the router, connect to the uplink port on the router to one of the LAN ports on your edge router:

   ```bash
   poweroff
   ```

1. Before we can log into the internal network router, we need to create a static route in the edge router:

   ```bash
   ssh ${EDGE_ROUTER}
   unset ROUTE
   ROUTE=$(uci add network route)
   uci set network.${ROUTE}.interface=lan
   uci set network.${ROUTE}.target=${DC1_NETWORK}
   uci set network.${ROUTE}.netmask=${NETMASK}
   uci set network.${ROUTE}.gateway=${DC1_ROUTER}
   uci commit network
   /etc/init.d/network restart
   exit
   ```

1. Now, we should be able to log into our new internal network router:

   ```bash
   DC1_ROUTER=$(ssh ${EDGE_ROUTER} "echo ${DC1_ROUTER}")
   ssh root@${DC1_ROUTER}
   ```

1. Install some additional packages on your router:

   ```bash
   opkg update && opkg install ip-full procps-ng-ps bind-server bind-tools wget haproxy bash
   ```

## Configure TFTP and PXE Booting

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
   kvm-host01.${DOMAIN}.      IN      A      ${NET_PREFIX}.200
   kvm-host02.${DOMAIN}.      IN      A      ${NET_PREFIX}.201
   kvm-host03.${DOMAIN}.      IN      A      ${NET_PREFIX}.202
   okd4-bootstrap.${DOMAIN}.  IN      A      ${NET_PREFIX}.49
   okd4-lb01.${DOMAIN}.       IN      A      ${LB_IP}
   *.apps.okd4.${DOMAIN}.     IN      A      ${LB_IP}
   api.okd4.${DOMAIN}.        IN      A      ${LB_IP}
   api-int.okd4.${DOMAIN}.    IN      A      ${LB_IP}
   okd4-master-0.${DOMAIN}.   IN      A      ${NET_PREFIX}.60
   etcd-0.${DOMAIN}.          IN      A      ${NET_PREFIX}.60
   okd4-master-1.${DOMAIN}.   IN      A      ${NET_PREFIX}.61
   etcd-1.${DOMAIN}.          IN      A      ${NET_PREFIX}.61
   okd4-master-2.${DOMAIN}.   IN      A      ${NET_PREFIX}.62
   etcd-2.${DOMAIN}.          IN      A      ${NET_PREFIX}.62
   okd4-worker-0.${DOMAIN}.   IN      A      ${NET_PREFIX}.70
   okd4-worker-1.${DOMAIN}.   IN      A      ${NET_PREFIX}.71
   okd4-worker-2.${DOMAIN}.   IN      A      ${NET_PREFIX}.72

   _etcd-server-ssl._tcp.okd4.${DOMAIN}    86400     IN    SRV     0    10    2380    etcd-0.okd4.${DOMAIN}.
   _etcd-server-ssl._tcp.okd4.${DOMAIN}    86400     IN    SRV     0    10    2380    etcd-1.okd4.${DOMAIN}.
   _etcd-server-ssl._tcp.okd4.${DOMAIN}    86400     IN    SRV     0    10    2380    etcd-2.okd4.${DOMAIN}.
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
   1.${NET_PREFIX_ARPA}    IN      PTR     router.${DOMAIN}.
   200.${NET_PREFIX_ARPA}   IN      PTR     kvm-host01.${DOMAIN}. 
   201.${NET_PREFIX_ARPA}   IN      PTR     kvm-host02.${DOMAIN}. 
   202.${NET_PREFIX_ARPA}   IN      PTR     kvm-host03.${DOMAIN}. 
   49.${NET_PREFIX_ARPA}    IN      PTR     okd4-bootstrap.${DOMAIN}.  
   60.${NET_PREFIX_ARPA}    IN      PTR     okd4-master-0.${DOMAIN}. 
   61.${NET_PREFIX_ARPA}    IN      PTR     okd4-master-1.${DOMAIN}. 
   62.${NET_PREFIX_ARPA}    IN      PTR     okd4-master-2.${DOMAIN}. 
   70.${NET_PREFIX_ARPA}    IN      PTR     okd4-worker-0.${DOMAIN}. 
   71.${NET_PREFIX_ARPA}    IN      PTR     okd4-worker-1.${DOMAIN}. 
   72.${NET_PREFIX_ARPA}    IN      PTR     okd4-worker-2.${DOMAIN}. 
   EOF
   ```

1. Create the necessary files, and set permissions for the bind user.

   ```bash
   mkdir -p /data/var/named/dynamic
   mkdir /data/var/named/data
   chown -R bind:bind /data/var/named
   chown -R bind:bind /etc/bind
   ```

## Let's talk about what we just set up:

The DNS configuration, starting with the A records, (forward lookup zone).

In the example file, there are some entries to take note of:

1. The KVM hosts are named `kvm-host01`, `kvm-host02`, etc...  Modify this to reflect the number of KVM hosts that your lab setup with have.  The example allows for three hosts.
  
1. The Bastion Host is `bastion`.
  
1. The Sonatype Nexus server gets it's own alias A record, `nexus.your.domain.org`.  This is not strictly necessary, but I find it useful.  For your lab, make sure that this A record reflects the IP address of the server where you have installed Nexus.  In this example, it is installed on the bastion host.
  
1. These example files contain references for a full OpenShift cluster with an haproxy load balancer.  The OKD cluster has three each of master, and worker (compute) nodes.  In this tutorial, you will build a minimal cluster with three master nodes which are also schedulable as workers.

     __Remove or add entries to these files as needed for your setup.__
  
1. There is one wildcard record that OKD needs: __`okd4` is the name of the cluster.__
  
   ```bash
   *.apps.okd4.your.domain.org`
   ```

   The "apps" record will be for all of the applications that you deploy into your OKD cluster.

   This wildcard A record needs to point to the entry point for your OKD cluster.  If you build a cluster with three master nodes like we are doing here, you will need a load balancer in front of the cluster.  In this case, your wildcard A records will point to the IP address of your load balancer.  Never fear, I will show you how to deploy an HA-Proxy load balancer.  

1. There are two A records for the Kubernetes API, internal & external.  In this case, the same load balancer is handling both.  So, they both point to the IP address of the load balancer.  __Again, `okd4` is the name of the cluster.__

   ```bash
   api.okd4.your.domain.org.        IN      A      10.10.11.50
   api-int.okd4.your.domain.org.    IN      A      10.10.11.50
   ```

1. There are three SRV records for the etcd hosts.

   ```bash
   _etcd-server-ssl._tcp.okd4.your.domain.org    86400     IN    SRV     0    10    2380    etcd-0.okd4.your.domain.org.
   _etcd-server-ssl._tcp.okd4.your.domain.org    86400     IN    SRV     0    10    2380    etcd-1.okd4.your.domain.org.
   _etcd-server-ssl._tcp.okd4.your.domain.org    86400     IN    SRV     0    10    2380    etcd-2.okd4.your.domain.org.
   ```

When you have completed all of your configuration changes, you can test the configuration with the following command:

   ```bash
   named-checkconf
   ```

If the output is clean, then you are ready to fire it up!

### Starting DNS

Now that we are done with the configuration let's enable DNS and start it up.

```bash
uci set dhcp.@dnsmasq[0].domain='${DOMAIN}'
uci set dhcp.@dnsmasq[0].localuse=0
uci set dhcp.@dnsmasq[0].cachelocal=0
uci set dhcp.@dnsmasq[0].port=0
uci commit dhcp
/etc/init.d/dnsmasq restart
/etc/init.d/named enable
/etc/init.d/named start
```

You can now test DNS resolution.  Try some `pings` or `dig` commands.

### __Hugely Helpful Tip:__

__If you are using a MacBook for your workstation, you can enable DNS resolution to your lab by creating a file in the `/etc/resolver` directory on your Mac.__

```bash
sudo bash
<enter your password>
vi /etc/resolver/your.domain.com
```

Name the file `your.domain.com` after the domain that you created for your lab.  Enter something like this example, modified for your DNS server's IP:

```bash
nameserver 10.11.11.1
```

Save the file.

Your MacBook should now query your new DNS server for entries in your new domain.  __Note:__ If your MacBook is on a different network and is routed to your Lab network, then the `acl` entry in your DNS configuration must allow your external network to query.  Otherwise, you will bang your head wondering why it does not work...  __The ACL is very powerful.  Use it.  Just like you are using firewalld.  Right?  I know you did not disable it on your linux hosts...  surely not...  if you did...  TURN IT BACK ON NOW!!!  NOW, NOW, NOW, NOW..., NOW!__

## Set up HA Proxy

1. Now we will set up HA-Proxy for our OpenShift cluster:

  ```bash
   mv /etc/haproxy.cfg /etc/haproxy.cfg.orig

   uci del_list uhttpd.main.listen_http="[::]:80"
   uci del_list uhttpd.main.listen_http="0.0.0.0:80"
   uci del_list uhttpd.main.listen_https="[::]:443"
   uci del_list uhttpd.main.listen_https="0.0.0.0:443"
   uci add_list uhttpd.main.listen_http="${ROUTER}:80"
   uci add_list uhttpd.main.listen_https="${ROUTER}:443"
   uci add_list uhttpd.main.listen_http="127.0.0.1:80"
   uci add_list uhttpd.main.listen_https="127.0.0.1:443"
   uci commit uhttpd
   /etc/init.d/uhttpd restart

   uci set network.lan_lb01=interface
   uci set network.lan_lb01.ifname='@lan'
   uci set network.lan_lb01.proto='static'
   uci set network.lan_lb01.hostname='okd4-lb01'
   uci set network.lan_lb01.ipaddr='10.11.12.2/255.255.255.0'
   uci commit network
   /etc/init.d/network reload


   cat << EOF > /etc/haproxy.cfg
   global

       log         127.0.0.1 local2

       chroot      /var/lib/haproxy
       pidfile     /var/run/haproxy.pid
       maxconn     50000
       user        haproxy
       group       haproxy
       daemon

       stats socket /var/lib/haproxy/stats

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
       bind 0.0.0.0:6443
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
       bind 0.0.0.0:22623
       balance roundrobin
       option                  tcplog
       mode tcp
       option tcpka
       server okd4-bootstrap ${NET_PREFIX}.49:22623 check weight 1
       server okd4-master-0 ${NET_PREFIX}.60:22623 check weight 1
       server okd4-master-1 ${NET_PREFIX}.61:22623 check weight 1
       server okd4-master-2 ${NET_PREFIX}.62:22623 check weight 1

   listen okd4-apps 
       bind 0.0.0.0:80
       balance source
       option                  tcplog
       mode tcp
       option tcpka
       server okd4-master-0 ${NET_PREFIX}.60:80 check weight 1
       server okd4-master-1 ${NET_PREFIX}.61:80 check weight 1
       server okd4-master-2 ${NET_PREFIX}.62:80 check weight 1

   listen okd4-apps-ssl 
       bind 0.0.0.0:443
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

## Firewall

```bash
uci add firewall rule
uci set firewall.@rule[-1].src='wan'

rule_name=$(uci add firewall rule) 
uci batch << EOI
set firewall.$rule_name.enabled='1'
set firewall.$rule_name.target='ACCEPT'
set firewall.$rule_name.src='wan'
set firewall.$rule_name.proto='tcp udp'
set firewall.$rule_name.dest_port='111'
set firewall.$rule_name.name='NFS_share'
EOI
uci commit

uci add firewall rule
uci set firewall.@rule[-1].src='wan'
uci set firewall.@rule[-1].target='ACCEPT'
uci set firewall.@rule[-1].proto='tcp'
uci set firewall.@rule[-1].dest_port='22'
uci commit firewall
/etc/init.d/firewall restart

/etc/init.d/firewall reload

```

1. [KVM Host Setup](/home-lab/kvm-host-setup)
