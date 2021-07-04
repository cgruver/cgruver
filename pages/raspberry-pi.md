

```bash

umount /dev/mmcblk1p1

wget https://downloads.openwrt.org/snapshots/targets/bcm27xx/bcm2711/openwrt-bcm27xx-bcm2711-rpi-4-ext4-factory.img.gz
gunzip openwrt-bcm27xx-bcm2711-rpi-4-ext4-factory.img.gz
dd if=openwrt-bcm27xx-bcm2711-rpi-4-ext4-factory.img of=/dev/mmcblk1 bs=4M conv=fsync
rm openwrt-bcm27xx-bcm2711-rpi-4-ext4-factory.img 

partinfo=$(sfdisk -l /dev/mmcblk1 | grep mmcblk1p2)
sfdisk --delete /dev/mmcblk1 2
sfdisk -d /dev/mmcblk1 > /tmp/part.info
echo "/dev/mmcblk1p2 : start= $(echo ${partinfo} | cut -d" " -f2), type=83" >> /tmp/part.info
sfdisk /dev/mmcblk1 < /tmp/part.info

e2fsck -f /dev/mmcblk1p2
resize2fs /dev/mmcblk1p2

mkdir /tmp/pi
mount -t ext4 /dev/mmcblk1p2 /tmp/pi/

read -r -d '' FILE << EOF
config interface 'loopback'\n
\toption device 'lo'\n
\toption proto 'static'\n
\toption ipaddr '127.0.0.1'\n
\toption netmask '255.0.0.0'\n
\n
config device\n
\toption name 'br-lan'\n
\toption type 'bridge'\n
\tlist ports 'eth0'\n
\n
config interface 'lan'\n
\toption device 'br-lan'\n
\toption proto 'static'\n
\toption ipaddr '${BASTION_HOST}'\n
\toption netmask '${LAB_NETMASK}'\n
\toption gateway '${LAB_ROUTER}'\n
\toption dns '${LAB_ROUTER}'\n
EOF

echo -e ${FILE} > /tmp/pi/etc/config/network

read -r -d '' FILE << EOF
config dropbear\n
\toption PasswordAuth 'off'\n
\toption RootPasswordAuth 'off'\n
\toption Port '22'\n
EOF

echo -e ${FILE} > /tmp/pi/etc/config/dropbear

read -r -d '' FILE << EOF
config system\n
\toption timezone 'UTC'\n
\toption ttylogin '0'\n
\toption log_size '64'\n
\toption urandom_seed '0'\n
\toption hostname 'bastion.${LAB_DOMAIN}'\n
\n
config timeserver 'ntp'\n
\toption enabled '1'\n
\toption enable_server '0'\n
\tlist server '0.openwrt.pool.ntp.org'\n
\tlist server '1.openwrt.pool.ntp.org'\n
\tlist server '2.openwrt.pool.ntp.org'\n
\tlist server '3.openwrt.pool.ntp.org'\n
EOF

echo -e ${FILE} > /tmp/pi/etc/config/system

dropbearkey -y -f /root/.ssh/id_dropbear | grep "^ssh-" >> /tmp/pi/etc/dropbear/authorized_keys

rm -f /tmp/pi/etc/rc.d/*dnsmasq*
umount /dev/mmcblk1p1
umount /dev/mmcblk1p2
```

Remove card from router, put it in the Pi, and boot it up.

```bash
ssh root@${BASTION_HOST}
opkg update && opkg install ip-full uhttpd shadow bash wget git-http ca-bundle procps-ng-ps rsync curl libstdcpp6 libjpeg libnss lftp

opkg list | grep "^coreutils-" | while read i
do
    opkg install $(echo ${i} | cut -d" " -f1)
done

LAB_NET=$(ip -br addr show dev br-lan label br-lan | cut -d" " -f1)
LAB_ROUTER=$(ip -br route show default | cut -d" " -f 3)
BASTION_HOST=$(echo ${LAB_NET} | cut -d"/" -f1)
LAB_CIDR=$(echo ${LAB_NET} | cut -d"/" -f2)
cidr2mask ()
{
   set -- $(( 5 - ($1 / 8) )) 255 255 255 255 $(( (255 << (8 - ($1 % 8))) & 255 )) 0 0 0
   [ $1 -gt 1 ] && shift $1 || shift
   echo ${1-0}.${2-0}.${3-0}.${4-0}
}
LAB_NETMASK=$(cidr2mask ${LAB_CIDR})
LAB_DOMAIN=$(uci get system.@system[0].hostname | cut -d"." -f2-)

mkdir -p /root/bin
cat << EOF > /root/bin/setLabEnv.sh
export PATH=\$PATH:/root/bin:/usr/local/java-1.8-openjdk/bin
export LAB_DOMAIN=${LAB_DOMAIN}
export PXE_HOST=${LAB_ROUTER}
export LAB_NAMESERVER=${LAB_ROUTER}
export LAB_ROUTER=${LAB_ROUTER}
export BASTION_HOST=${BASTION_HOST}
export INSTALL_HOST=${BASTION_HOST}
export LAB_NETMASK=${LAB_NETMASK}
export HTML_ROOT=/www
export INSTALL_ROOT=${HTML_ROOT}/install
export INSTALL_URL=http://${INSTALL_HOST}/install
EOF
chmod 750 /root/bin/setLabEnv.sh
echo ". /root/bin/setLabEnv.sh" >> /root/.profile
```

__Log out, then back in.  Check that the env settings are as expected.__

```bash
env
```

## Create an SSH Key Pair

```bash
mkdir -p /root/.ssh
dropbearkey -t rsa -s 4096 -f /root/.ssh/id_dropbear
```

Setup uhttpd

```bash
uci del_list uhttpd.main.listen_http="[::]:80"
uci del_list uhttpd.main.listen_http="0.0.0.0:80"
uci del_list uhttpd.main.listen_https="[::]:443"
uci del_list uhttpd.main.listen_https="0.0.0.0:443"
uci del uhttpd.defaults
uci del uhttpd.main.cert
uci del uhttpd.main.key
uci del uhttpd.main.cgi_prefix
uci del uhttpd.main.lua_prefix
uci add_list uhttpd.main.listen_http="${BASTION_HOST}:80"
uci add_list uhttpd.main.listen_http="127.0.0.1:80"
uci commit uhttpd
/etc/init.d/uhttpd restart
```

## Create CentOS Stream Repo Mirror:

```bash
for i in BaseOS AppStream PowerTools extras
do 
  mkdir -p ${INSTALL_ROOT}/repos/${i}
  rsync  -avSHP --delete rsync://mirror.vcu.edu/centos/8-stream/${i}/x86_64/os/ ${INSTALL_ROOT}/repos/${i}
done

```

## Install Java

```bash
mkdir -p /usr/local

mkdir /tmp/work-dir
cd /tmp/work-dir

wget http://dl-cdn.alpinelinux.org/alpine/edge/community/aarch64/liblcms-1.19-r8.apk

PACKAGES="openjdk8-8 openjdk8-jre-8 openjdk8-jre-lib-8 openjdk8-jre-base-8 java-cacerts"

for package in $PACKAGES; do
    FILE=$(lftp -e "cls -1 alpine/edge/community/aarch64/${package}*; quit" http://dl-cdn.alpinelinux.org)
    curl -LO "http://dl-cdn.alpinelinux.org/${FILE}"
done

for i in $(ls)
do
    tar xzf ${i}
done

mv ./usr/lib/liblcms* /usr/lib/
mv ./usr/lib/jvm/java-1.8-openjdk /usr/local/java-1.8-openjdk
rm -f /usr/local/java-1.8-openjdk/jre/lib/security/cacerts
keytool -importcert -file /etc/ssl/certs/ca-certificates.crt -keystore /usr/local/java-1.8-openjdk/jre/lib/security/cacerts -keypass changeit -storepass changeit
cd 

rm -rf /tmp/work-dir
```

## Install Nexus

Now, we'll install Nexus:

```bash
mkdir -p /usr/local/nexus/home
cd /usr/local/nexus
wget https://download.sonatype.com/nexus/3/latest-unix.tar.gz -O latest-unix.tar.gz
tar -xzvf latest-unix.tar.gz
NEXUS=$(ls -d nexus-*)
ln -s ${NEXUS} nexus-3
rm -f latest-unix.tar.gz
```

Add a user for Nexus:

```bash
groupadd nexus
useradd -g nexus -d /usr/local/nexus/home nexus
chown -R nexus:nexus /usr/local/nexus
```

Enable firewall access:

```bash
    firewall-cmd --add-port=8081/tcp --permanent
    firewall-cmd --add-port=8443/tcp --permanent
    firewall-cmd --add-port=5000/tcp --permanent
    firewall-cmd --add-port=5001/tcp --permanent
    firewall-cmd --reload
````

Create a service reference for Nexus so the OS can start and stop it:

```bash
sed -i "s|#run_as_user=\"\"|run_as_user=\"nexus\"|g" /usr/local/nexus/nexus-3/bin/nexus.rc

cat <<EOF > /etc/init.d/nexus
#!/bin/sh /etc/rc.common

START=99
STOP=80
SERVICE_USE_PID=0

start() {
    service_start /usr/local/nexus/nexus-3/bin/nexus start
}

stop() {
    service_stop /usr/local/nexus/nexus-3/bin/nexus stop
}
EOF

chmod 755 /etc/init.d/nexus
```

Configure Nexus to use JRE 8

```bash
sed -i "s|# INSTALL4J_JAVA_HOME_OVERRIDE=|INSTALL4J_JAVA_HOME_OVERRIDE=/usr/local/java-1.8-openjdk|g" /usr/local/nexus/nexus-3/bin/nexus
```

### Enabling TLS

Before we start Nexus, let's go ahead a set up TLS so that our connections are secure from prying eyes.

```bash
keytool -genkeypair -keystore /usr/local/nexus/nexus-3/etc/ssl/keystore.jks -deststoretype pkcs12 -storepass password -keypass password -alias jetty -keyalg RSA -keysize 4096 -validity 5000 -dname "CN=nexus.${LAB_DOMAIN}, OU=okd4-lab, O=okd4-lab, L=Roanoke, ST=Virginia, C=US" -ext "SAN=DNS:nexus.${LAB_DOMAIN},IP:${INSTALL_HOST}" -ext "BC=ca:true"
keytool -importkeystore -srckeystore /usr/local/nexus/nexus-3/etc/ssl/keystore.jks -destkeystore /usr/local/nexus/nexus-3/etc/ssl/keystore.jks -deststoretype pkcs12 -srcstorepass password
rm -f /usr/local/nexus/nexus-3/etc/ssl/keystore.jks.old

chown nexus:nexus /usr/local/nexus/nexus-3/etc/ssl/keystore.jks
```

Modify the Nexus configuration for HTTPS:

```bash
mkdir /usr/local/nexus/sonatype-work/nexus3/etc
cat <<EOF >> /usr/local/nexus/sonatype-work/nexus3/etc/nexus.properties
nexus-args=\${jetty.etc}/jetty.xml,\${jetty.etc}/jetty-https.xml,\${jetty.etc}/jetty-requestlog.xml
application-port-ssl=8443
EOF
chown -R nexus:nexus /usr/local/nexus/sonatype-work/nexus3/etc
```

Now we should be able to start Nexus:

```bash
/etc/init.d/nexus enable
/etc/init.d/nexus start
```