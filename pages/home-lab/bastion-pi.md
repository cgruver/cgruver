---
layout: page
permalink: /home-lab/bastion-pi/
title: OpenWRT With a Slice of Pi
---
## Setting up a Raspberry Pi as your lab bastion host

For your bastion host, you will need a Raspberry Pi 4b with 8GB of RAM.  I am using a [Vilros kit from Amazon](https://www.amazon.com/gp/product/B089ZZ8DTV/ref=ppx_yo_dt_b_asin_title_o00_s00?ie=UTF8&psc=1).  You will also need an SD Card of at least 64GB capacity.  Get one with fast read/write speeds as it will be used to serve up RPMs for host installations and images from your Nexus registry.

We are going to use the edge router that we set up in the previous step to configure the OS for the Raspberry Pi.

1. Insert the SD Card into the edge router.
1. SSH into the router

   ```bash
   ssh root@${EDGE_ROUTER}
   ```

1. Install some additional packages

   ```bash
   opkg update && opkg install wget sfdisk rsync resize2fs
   ```

1. Retrieve the OpenWRT image for the Pi 4b

   ```bash
   wget https://downloads.openwrt.org/snapshots/targets/bcm27xx/bcm2711/openwrt-bcm27xx-bcm2711-rpi-4-ext4-factory.img.gz
   gunzip openwrt-bcm27xx-bcm2711-rpi-4-ext4-factory.img.gz
   ```

1. Unmount the SD Card and flash it with the OS image

   ```bash
   umount /dev/mmcblk1p1
   dd if=openwrt-bcm27xx-bcm2711-rpi-4-ext4-factory.img of=/dev/mmcblk1 bs=4M conv=fsync
   rm openwrt-bcm27xx-bcm2711-rpi-4-ext4-factory.img 
   ```

1. Resize the root volume to use the whole SD Card

   ```bash
   partinfo=$(sfdisk -l /dev/mmcblk1 | grep mmcblk1p2)
   sfdisk --delete /dev/mmcblk1 2
   sfdisk -d /dev/mmcblk1 > /tmp/part.info
   echo "/dev/mmcblk1p2 : start= $(echo ${partinfo} | cut -d" " -f2), type=83" >> /tmp/part.info
   umount /dev/mmcblk1p1
   sfdisk /dev/mmcblk1 < /tmp/part.info

   e2fsck -f /dev/mmcblk1p2
   resize2fs /dev/mmcblk1p2
   ```

1. Mount the new root filesystem to a temporary mount point

   ```bash
   mkdir /tmp/pi
   mount -t ext4 /dev/mmcblk1p2 /tmp/pi/
   ```

1. Configure the bastion network settings

   ```bash
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
   \toption netmask '${NETMASK}'\n
   \toption gateway '${ROUTER}'\n
   \toption dns '${ROUTER}'\n
   EOF

   echo -e ${FILE} > /tmp/pi/etc/config/network
   ```

1. Disable password login so that only SSH key access is allowed

   ```bash
   read -r -d '' FILE << EOF
   config dropbear\n
   \toption PasswordAuth 'off'\n
   \toption RootPasswordAuth 'off'\n
   \toption Port '22'\n
   EOF

   echo -e ${FILE} > /tmp/pi/etc/config/dropbear
   ```

1. Set the hostname

   ```bash
   read -r -d '' FILE << EOF
   config system\n
   \toption timezone 'UTC'\n
   \toption ttylogin '0'\n
   \toption log_size '64'\n
   \toption urandom_seed '0'\n
   \toption hostname 'bastion.${DOMAIN}'\n
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
   ```

1. Add SSH keys to the bastion host

   ```bash
   cat /etc/dropbear/authorized_keys >> /tmp/pi/etc/dropbear/authorized_keys
   dropbearkey -y -f /root/.ssh/id_dropbear | grep "^ssh-" >> /tmp/pi/etc/dropbear/authorized_keys
   ```

1. Disable dnsmasq

   ```bash
   rm -f /tmp/pi/etc/rc.d/*dnsmasq*
   ```

1. Unmount the SD Card

   ```bash
   umount /dev/mmcblk1p1
   umount /dev/mmcblk1p2
   ```

__Remove card from router, put it in the Pi, and boot it up.__

Finish configuring the bastion host:

1. From your workstation, SSH into the bastion host

   ```bash
   . ~/okd-lab/bin/setLabEnv.sh
   ~/okd-lab/bin/createEnvScript.sh -e | ssh root@${BASTION_HOST} "cat >> /root/.profile"
   ssh root@${BASTION_HOST}
   ```

1. Set a complex root password.  Keep it safe, but remember that we are using SSH keys to log in.  So you shouldn't need this password.

   ```bash
   passwd
   ```

1. Install the necessary packages

   ```bash
   opkg update && opkg install ip-full uhttpd shadow bash wget git-http ca-bundle procps-ng-ps rsync curl libstdcpp6 libjpeg libnss lftp

   opkg list | grep "^coreutils-" | while read i
   do
       opkg install $(echo ${i} | cut -d" " -f1)
   done
   ```

1. Create an SSH Key Pair

   ```bash
   mkdir -p /root/.ssh
   dropbearkey -t rsa -s 4096 -f /root/.ssh/id_dropbear
   ```

1. Setup uhttpd for hosting a CentOS Stream repo mirror and host installation files

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

1. Create CentOS Stream repository mirror:

   ```bash
   for i in BaseOS AppStream PowerTools extras
   do 
     mkdir -p /www/install/repos/${i}
     rsync  -avSHP --delete rsync://mirror.vcu.edu/centos/8-stream/${i}/x86_64/os/ /www/install/repos/${i}
   done
   ```

1. Install Java runtime

   OpenWrt does not include a packaged Java runtime.  So, we are going to borrow one from Alpine Linux.

   ```bash
   mkdir -p /usr/local

   mkdir /tmp/work-dir
   cd /tmp/work-dir

   PKG="openjdk8-8 openjdk8-jre-8 openjdk8-jre-lib-8 openjdk8-jre-base-8 java-cacerts liblcms-"

   for package in ${PKG}; do
       FILE=$(lftp -e "cls -1 alpine/edge/community/aarch64/${package}*; quit" http://dl-cdn.alpinelinux.org)
       curl -LO http://dl-cdn.alpinelinux.org/${FILE}
   done

   for i in $(ls)
   do
       tar xzf ${i}
   done

   export PATH=${PATH}:/root/bin:/usr/local/java-1.8-openjdk/bin
   mv ./usr/lib/liblcms* /usr/lib/
   mv ./usr/lib/jvm/java-1.8-openjdk /usr/local/java-1.8-openjdk
   rm -f /usr/local/java-1.8-openjdk/jre/lib/security/cacerts
   keytool -importcert -file /etc/ssl/certs/ca-certificates.crt -keystore /usr/local/java-1.8-openjdk/jre/lib/security/cacerts -keypass changeit -storepass changeit
   cd 

   rm -rf /tmp/work-dir

   echo "export PATH=\$PATH:/root/bin:/usr/local/java-1.8-openjdk/bin" >> /root/.profile
   ```

1. Install Sonatype Nexus OSS

   ```bash
   mkdir -p /usr/local/nexus/home
   cd /usr/local/nexus
   wget https://download.sonatype.com/nexus/3/latest-unix.tar.gz -O latest-unix.tar.gz
   tar -xzvf latest-unix.tar.gz
   NEXUS=$(ls -d nexus-*)
   ln -s ${NEXUS} nexus-3
   rm -f latest-unix.tar.gz
   ```

1. Add a user for Nexus:

   ```bash
   groupadd nexus
   useradd -g nexus -d /usr/local/nexus/home nexus
   chown -R nexus:nexus /usr/local/nexus
   ```

1. Enable firewall access:

   ```bash
   # firewall-cmd --add-port=8081/tcp --permanent
   # firewall-cmd --add-port=8443/tcp --permanent
   # firewall-cmd --add-port=5000/tcp --permanent 
   # firewall-cmd --add-port=5001/tcp --permanent
   # firewall-cmd --reload
   ````

1. Create a service script for Nexus so the OS can start and stop it:

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

1. Configure Nexus to use the JRE that we installed

   ```bash
   sed -i "s|# INSTALL4J_JAVA_HOME_OVERRIDE=|INSTALL4J_JAVA_HOME_OVERRIDE=/usr/local/java-1.8-openjdk|g" /usr/local/nexus/nexus-3/bin/nexus
   ```

1. Before we start Nexus, let's go ahead a set up TLS so that our connections are secure from prying eyes.

   ```bash
   keytool -genkeypair -keystore /usr/local/nexus/nexus-3/etc/ssl/keystore.jks -deststoretype pkcs12 -storepass password -keypass password -alias jetty -keyalg RSA -keysize 4096 -validity 5000 -dname "CN=nexus.${DOMAIN}, OU=okd4-lab, O=okd4-lab, L=Roanoke, ST=Virginia, C=US" -ext "SAN=DNS:nexus.${DOMAIN},IP:${BASTION_HOST}" -ext "BC=ca:true"
   keytool -importkeystore -srckeystore /usr/local/nexus/nexus-3/etc/ssl/keystore.jks -destkeystore /usr/local/nexus/nexus-3/etc/ssl/keystore.jks -deststoretype pkcs12 -srcstorepass password
   rm -f /usr/local/nexus/nexus-3/etc/ssl/keystore.jks.old

   chown nexus:nexus /usr/local/nexus/nexus-3/etc/ssl/keystore.jks
   ```

1. Modify the Nexus configuration for HTTPS:

   ```bash
   mkdir /usr/local/nexus/sonatype-work/nexus3/etc
   cat <<EOF >> /usr/local/nexus/sonatype-work/nexus3/etc/nexus.properties
   nexus-args=\${jetty.etc}/jetty.xml,\${jetty.etc}/jetty-https.xml,\${jetty.etc}/jetty-requestlog.xml
   application-port-ssl=8443
   EOF
   chown -R nexus:nexus /usr/local/nexus/sonatype-work/nexus3/etc
   ```

1. Now we should be able to start Nexus:

   ```bash
   /etc/init.d/nexus enable
   /etc/init.d/nexus start
   ```

[Internal Router](/home-lab/internal-router)
