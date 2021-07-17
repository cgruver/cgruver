---
layout: page
permalink: /home-lab/edge-router/
title: Edge Network Router
---

The operating system is OpenWRT.  Find out more here: [OpenWRT](https://openwrt.org)

1. If you don't have an SSH key pair configured, then create one now:

    ```bash
    ssh-keygen -t rsa -b 4096 -N "" -f /root/.ssh/id_rsa
    ```

1. Connect to your new router:

    If you are using the `GL-MV1000`, then connect with a network cable.

    If you are using the `GL-MV1000W` then you can connect to the WiFi.  The initial SSID and passphrase are on the back of the router.

1. Copy your SSH public key to the router for login:

    ```bash
    cat ~/.ssh/id_rsa.pub | ssh root@192.168.8.1 "cat >> /etc/dropbear/authorized_keys"
    ```

1. Log into the router:

    ```bash
    ssh root@192.168.8.1
    ```

1. Set a root password:

    ```bash
    passwd
    ```

1. Configure the network:

   ```bash
   export EDGE_ROUTER=10.11.10.1

   uci set dropbear.@dropbear[0].PasswordAuth='off'
   uci set dropbear.@dropbear[0].RootPasswordAuth='off'
   uci commit dropbear

   uci set network.lan.ipaddr="${EDGE_ROUTER}"
   uci set network.lan.netmask='255.255.255.0'
   uci commit network

   uci set dhcp.lan.leasetime='5m'
   uci set dhcp.lan.start='11'
   uci set dhcp.lan.limit='19'
   uci add_list dhcp.lan.dhcp_option="6,${EDGE_ROUTER},8.8.8.8,8.8.4.4"
   uci commit dhcp
   ```

1. Configure Wireless repeater to your home Wifi:

   ```bash
   uci set wireless.radio2.disabled='0'
   uci set wireless.radio2.repeater='1'
   uci set wireless.sta.ssid='Your-WiFi-SSID'  # Replace with your WiFi SSID
   uci set wireless.sta.encryption='psk2'      # Replace with your encryption type
   uci set wireless.sta.key='Your-WiFi-Key'    # Replace with your WiFi Key
   ```

1. Configure a Wireless Network for Your Lab:

   ```bash
   uci set wireless.default_radio0.ssid='OKD-LAB'
   uci set wireless.default_radio0.key='WelcomeToMyLab'
   uci set wireless.default_radio0.encryption='psk2'
   ```

1. Now restart the router, connect to your new lab WiFi network, and log into the router:

```bash
reboot
ssh root@10.11.10.1
```

## Install some additional packages on your router

```bash
opkg update && opkg install ip-full procps-ng-ps bind-server bind-tools
```

## Create an SSH Key Pair

```bash
mkdir -p /root/.ssh
dropbearkey -t rsa -s 4096 -f /root/.ssh/id_dropbear

```

## Setup environment variables for your lab router

```bash
export LAB_DOMAIN=your.lab.domain # Replace with the domain that you want to use for this router.
```

```bash
export NET_INFO=$(ip -br addr show dev br-lan label br-lan | cut -d" " -f1)
export EDGE_ROUTER=$(echo ${NET_INFO} | cut -d"/" -f1)
export LAB_CIDR=$(echo ${NET_INFO} | cut -d"/" -f2)
cidr2mask ()
{
   set -- $(( 5 - ($1 / 8) )) 255 255 255 255 $(( (255 << (8 - ($1 % 8))) & 255 )) 0 0 0
   [ $1 -gt 1 ] && shift $1 || shift
   echo ${1-0}.${2-0}.${3-0}.${4-0}
}
export NETMASK=$(cidr2mask ${LAB_CIDR})
IFS=. read -r i1 i2 i3 i4 << EOF
${EDGE_ROUTER}
EOF
net_addr=$(( ((1<<32)-1) & (((1<<32)-1) << (32 - ${LAB_CIDR})) ))
o1=$(( ${i1} & (${net_addr}>>24) ))
o2=$(( ${i2} & (${net_addr}>>16) ))
o3=$(( ${i3} & (${net_addr}>>8) ))
o4=$(( ${i4} & ${net_addr} ))
export LAB_NETWORK=${o1}.${o2}.${o3}.${o4}
export NET_PREFIX=${o1}.${o2}.${o3}
export NET_PREFIX_ARPA=${o3}.${o2}.${o1}
export BASTION_HOST=${o1}.${o2}.${o3}.10
export LAB_ROUTER=${o1}.${o2}.$(( ${o3} + 1 )).1
```

__Log out, then back in.  Check that the env settings are as expected.__

```bash
env
```

## DNS Configuration

Now, we will set up Bind to serve DNS.  We will also disable the DNS functions of dnsmasq to let Bind do all the work.

Backup the default bind config.

```bash
mv /etc/bind/named.conf /etc/bind/named.conf.orig
```

Create the Bind config file:

```bash
cat << EOF > /etc/bind/named.conf
acl "trusted" {
 ${LAB_NETWORK}/${LAB_CIDR};
};

options {
 listen-on port 53 { 127.0.0.1; ${EDGE_ROUTER}; };
 
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

zone "dc1.${LAB_DOMAIN}" {
    type forward;
    forward only;
    forwarders { ${LAB_ROUTER}; };
};

zone "${LAB_DOMAIN}" {
    type master;
    file "/etc/bind/db.${LAB_DOMAIN}"; # zone file path
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

Create the forward lookup zone for our OpenShift lab:

```bash
cat << EOF > /etc/bind/db.${LAB_DOMAIN}
@       IN      SOA     router.${LAB_DOMAIN}. admin.${LAB_DOMAIN}. (
             3          ; Serial
             604800     ; Refresh
              86400     ; Retry
            2419200     ; Expire
             604800 )   ; Negative Cache TTL
;
; name servers - NS records
    IN      NS     router.${LAB_DOMAIN}.

; name servers - A records
router.${LAB_DOMAIN}.         IN      A      ${EDGE_ROUTER}

; ${LAB_NETWORK}/${LAB_CIDR} - A records
bastion.${LAB_DOMAIN}.         IN      A      ${BASTION_HOST}
nexus.${LAB_DOMAIN}.           IN      A      ${BASTION_HOST}
EOF
```

Create the reverse lookup zone:

```bash
cat << EOF > /etc/bind/db.${NET_PREFIX_ARPA}
@       IN      SOA     router.${LAB_DOMAIN}. admin.${LAB_DOMAIN}. (
                              3         ; Serial
                         604800         ; Refresh
                          86400         ; Retry
                        2419200         ; Expire
                         604800 )       ; Negative Cache TTL

; name servers - NS records
      IN      NS      router.${LAB_DOMAIN}.

; PTR Records
1.${NET_PREFIX_ARPA}    IN      PTR     router.${LAB_DOMAIN}.
10.${NET_PREFIX_ARPA}    IN      PTR     bastion.${LAB_DOMAIN}.
EOF
```

Create the necessary files, and set permissions for the bind user.

```bash
mkdir -p /data/var/named/dynamic
mkdir /data/var/named/data
chown -R bind:bind /data/var/named
chown -R bind:bind /etc/bind
```

```bash
/usr/sbin/named -u bind -g -c /etc/bind/named.conf
```

[Bastion Host](/home-lab/bastion-pi)
