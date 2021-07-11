---
layout: page
permalink: /home-lab/edge-router/
---
# Initial Router Setup

1. Login to your router with a browser: `https://192.168.8.1`
1. Expand the `MORE SETTINGS` menu on the left, and select `LAN IP`
1. Fill in the following:

    |||
    |---|---|
    |LAN IP|10.11.10.1|
    |Start IP Address|10.11.10.11|
    |End IP Address|10.11.10.29|

1. Click `Apply`
1. Now, select the `Advanced` option from the left menu bar.
1. Login to the Advanced Administration console
1. Expand the `System` menu at the top of the screen, and select `Administration`
1. Select the `SSH Access` tab.
   1. Ensure that the Dropbear Instance `Interface` is set to `unspecified` and that the `Port` is `22`
   1. Ensure that the following are __NOT__ checked:
      * `Password authentication`
      * `Allow root logins with password`
      * `Gateway ports`
   1. Click `Save`
1. Select the `SSH-Keys` tab
    1. Paste your __*public*__ SSH key into the `SSH-Keys` section at the bottom of the page and select `Add Key`

        Your public SSH key is likely in the file `$HOME/.ssh/id_rsa.pub`
    1. Repeat with additional keys.
    1. Click `Save & Apply`

Now that we have enabled SSH access to the router, we will login and complete our setup from the command-line.

```bash
ssh root@<router IP>
```

If you are using the `GL-AR750S-Ext` you will need to add an sd-card, note that I create a symbolic link from the SD card to /data so that the configuration matches the configuration of the `GL-MV1000`.  Since I have both, this keeps things consistent.

```bash
ln -s /mnt/sda1 /data        # This is not necessary for the GL-MV1000 or GL-MV1000W
```

## Install some additional packages on your router

```bash
opkg update && opkg install ip-full procps-ng-ps wget git-http ca-bundle haproxy bind-server bind-tools bash sfdisk rsync shadow resize2fs
```

## Create an SSH Key Pair

```bash
mkdir -p /root/.ssh
dropbearkey -t rsa -s 4096 -f /root/.ssh/id_dropbear

```

## Setup environment variables for your lab router

```bash
LAB_DOMAIN=your.lab.domain # Replace with the domain that you want to use for this router.
```

```bash
LAB_NET=$(ip -br addr show dev br-lan label br-lan | cut -d" " -f1)
LAB_ROUTER=$(echo ${LAB_NET} | cut -d"/" -f1)
LAB_CIDR=$(echo ${LAB_NET} | cut -d"/" -f2)
cidr2mask ()
{
   set -- $(( 5 - ($1 / 8) )) 255 255 255 255 $(( (255 << (8 - ($1 % 8))) & 255 )) 0 0 0
   [ $1 -gt 1 ] && shift $1 || shift
   echo ${1-0}.${2-0}.${3-0}.${4-0}
}
LAB_NETMASK=$(cidr2mask ${LAB_CIDR})

net_addr=$(( ((1<<32)-1) & (((1<<32)-1) << (32 - ${LAB_CIDR})) ))
o1=$(( ${i1} & (${net_addr}>>24) ))
o2=$(( ${i2} & (${net_addr}>>16) ))
o3=$(( ${i3} & (${net_addr}>>8) ))
BASTION_HOST=${o1}.${o2}.${o3}.10

mkdir -p /root/bin
cat << EOF > /root/bin/setEnv.sh
export LAB_DOMAIN=${LAB_DOMAIN}
export PXE_HOST=${LAB_ROUTER}
export LAB_NAMESERVER=${LAB_ROUTER}
export LAB_ROUTER=${LAB_ROUTER}
export BASTION_HOST=${BASTION_HOST}
export LAB_NETMASK=${LAB_NETMASK}
EOF
chmod 750 /root/bin/setEnv.sh
mkdir -p /etc/profile.d
echo ". /root/bin/setEnv.sh" > /etc/profile.d/lab.sh
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

Set some env variables that we'll use to create our bind config.

```bash
LAB_CIDR=$(ip -br addr show dev br-lan label br-lan | cut -d" " -f1 | cut -d"/" -f2)

IFS=. read -r i1 i2 i3 i4 << EOF
${LAB_ROUTER}
EOF
net_addr=$(( ((1<<32)-1) & (((1<<32)-1) << (32 - ${LAB_CIDR})) ))
o1=$(( ${i1} & (${net_addr}>>24) ))
o2=$(( ${i2} & (${net_addr}>>16) ))
o3=$(( ${i3} & (${net_addr}>>8) ))
o4=$(( ${i4} & ${net_addr} ))

LAB_NETWORK=${o1}.${o2}.${o3}.${o4}
NET_PREFIX=${o1}.${o2}.${o3}
NET_PREFIX_ARPA=${o3}.${o2}.${o1}
```

Create the Bind config file:

```bash
cat << EOF > /etc/bind/named.conf
acl "trusted" {
 ${LAB_NETWORK}/${LAB_CIDR};
};

options {
 listen-on port 53 { 127.0.0.1; ${LAB_NAMESERVER}; };
 
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
router.${LAB_DOMAIN}.         IN      A      ${LAB_ROUTER}

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
