---
title: "Let's Set Up Some Tools for Developing Micro-Services - On A Raspberry Pi!"
date:   2022-06-25 00:00:00 -0400
description: "Installing Nexus, Gitea, Apicurio, & Keycloak on Raspberry Pi.  With a GL.iNet Travel Router"
tags:
  - OpenShift
  - Kubernetes
  - Homelab
  - Home Lab
  - Apicurio
  - Keycloak
  - Raspberry Pi
  - Gitea
  - Nexus
  - GL.iNet
  - OpenWRT
categories:
  - Blog Post
---
If you are going to be doing any micro-services development in your Kubernetes Home Lab, there are some useful tools that you are going to need.  In this post, I'm going to show you how to set up a travel router and Raspberry Pi to be a portable micro-services dev environment.

After following the instructions in this post you will have the following:

![Lab Dev Tools](/_pages/home-lab/dev-tooling/images/lab-dev-tools.png)

1. A GL.iNet travel router that is set up to be the edge router for a home lab.

   The router will provide LAN routing, WiFi, WAN firewall, and DNS for your home lab.

1. A Raspberry Pi with the following tools:

   * [Sonatype Nexus](https://www.sonatype.com/products/nexus-repository){:target="_blank"} to be your lab artifact registry
   * [Gitea](https://gitea.io/en-us/){:target="_blank"} for your local Source Code Management
   * [Keycloak](https://www.keycloak.org){:target="_blank"} for IAM, & SSO
   * [Apicurio Studio](https://www.apicur.io/studio/){:target="_blank"} for OpenAPI, and AsyncAPI schema development

Both of these network devices will be running OpenWRT.  [https://openwrt.org](https://openwrt.org){:target="_blank"}

## Get Your Lab Gear Together

__Note:__ This is the same gear that you can use to start setting up a [Kubernetes Home Lab based on OpenShift or OKD](/home-lab/lab-intro/){:target="_blank"}.

For this setup, you will need the following:

1. [GL.iNet AR-750S](https://www.amazon.com/GL-iNet-GL-AR750S-Ext-pre-Installed-Cloudflare-Included/dp/B07GBXMBQF/ref=sr_1_3?dchild=1&keywords=gl.iNet&qid=1627902663&sr=8-3){:target="_blank"} Travel Router
1. [Raspberry Pi 4B 8GB](https://www.amazon.com/gp/product/B089ZZ8DTV/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1){:target="_blank"}
1. 256GB MicroSD Card
1. USB Thumb Drive - at least 2GB
1. 1Gb Ethernet Dongle
1. 2 or 3 network patch cables, depending on your setup

I also use one of these to limit the number of wall warts that I have to carry: [Anker 65W 4 Port PIQ 3.0 & GaN Fast Charger Adapter](https://www.amazon.com/Anker-Charger-4-Port-MacBook-Laptops/dp/B098WQRGNQ/ref=dp_prsubs_1?pd_rd_i=B098WQRGNQ&psc=1){:target="_blank"}

## Set Up Your Workstation

The first step is to install some tools on your development workstation.

I primarily develop on a MacBook, so these instructions are biased that way.  However, this *should* work on a Linux based workstation as well.  If you are using Windows, try setting up the Windows Subsystem For Linux.  The important thing, is that you have access to the `bash` shell, and that you have a standard GNU like environment with common commands.

1. Create a directory structure for the home lab tools and configuration files:

   ```bash
   mkdir -p ${HOME}/okd-lab/lab-config/domain-configs
   mkdir ${HOME}/okd-lab/bin
   ```

1. Install `yq` we will need it for YAML file manipulation: [https://mikefarah.gitbook.io/yq/](https://mikefarah.gitbook.io/yq/){:target="_blank"}

   * MacOS:

     ```bash
     brew install yq
     ```

   * Linux:

     ```bash
     mkdir ${HOME}/okd-lab/yq-tmp
     YQ_VER=$(curl https://github.com/mikefarah/yq/releases/latest | cut -d"/" -f8 | cut -d\" -f1)
     wget -O ${HOME}/okd-lab/yq-tmp/yq.tar.gz https://github.com/mikefarah/yq/releases/download/${YQ_VER}/yq_linux_amd64.tar.gz
     tar -xzf ${HOME}/okd-lab/yq-tmp/yq.tar.gz -C ${HOME}/okd-lab/yq-tmp
     cp ${HOME}/okd-lab/yq-tmp/yq_linux_amd64 ${HOME}/okd-lab/bin/yq
     chmod 700 ${HOME}/okd-lab/bin/yq
     rm -rf ${HOME}/okd-lab/yq-tmp
     ```

1. If you don't have an SSH key pair configured on your workstation, then create one now:

   ```bash
   ssh-keygen -t rsa -b 4096 -N "" -f ${HOME}/.ssh/id_rsa
   ```

1. Copy the SSH public key to the Lab configuration folder:

   ```bash
   cp ~/.ssh/id_rsa.pub ${HOME}/okd-lab/ssh_key.pub
   ```

Next we'll install a CLI that will automate most of the setup tasks for your development lab.

### Install `καμαρότος`, or in English, kamarótos - aka, my Lab CLI

I have written a set of shell scripts and functions which implement a CLI that I use to perform a lot of the tedious setup and management functions in my OpenShift home lab.  I manage a number of OpenShift clusters, and tend to build and tear them down quite a bit.  These scripts automate most of the work.  [https://github.com/cgruver/kamarotos](https://github.com/cgruver/kamarotos){:target="_blank"}

1. Clone the git repository that I have created with helper scripts:

   ```bash
   mkdir -p ${HOME}/okd-lab/bin
   git clone https://github.com/cgruver/kamarotos.git ${HOME}/okd-lab/kamarotos
   ```

1. Copy the helper scripts to `${HOME}/okd-lab`:

   ```bash
   cp ${HOME}/okd-lab/kamarotos/bin/* ${HOME}/okd-lab/bin
   chmod 700 ${HOME}/okd-lab/bin/*
   ```

1. Copy the example lab configuration files to ${HOME}/okd-lab/lab-config

   ```bash
   mkdir -p ${HOME}/okd-lab/lab-config/domain-configs
   cp ${HOME}/okd-lab/kamarotos/examples/lab.empty.yaml ${HOME}/okd-lab/lab-config/lab.yaml
   ```

1. Add the following to your shell environment:

   Your default shell will be something like `bash` or `zsh`.  Although you might have changed it.

   You need to add the following line to the appropriate shell file in your home directory: `.bashrc`, or `.zshrc`, etc...

   __Bash:__

   ```bash
   echo ". ${HOME}/okd-lab/bin/labEnv.sh" >> ~/.bashrc
   ```

   __Zsh:__

   ```bash
   echo ". ${HOME}/okd-lab/bin/labEnv.sh" >> ~/.zshrc
   ```

   __Note:__ Take a look at the file `${HOME}/okd-lab/bin/labEnv.sh`.  It will set variables in your shell when you log in, so make sure you are comfortable with what it is setting.  If you don't want to add it to your shell automatically, the you will need to execute `. ${HOME}/okd-lab/bin/labEnv.sh` before running any lab commands.

   It's always a good practice to look at what a downloaded script is doing, since it is running with your user privileges...  I know that you NEVER run one of those; `curl some URL | bash`...  without looking at the file first...  right?

1. __Log off and back on to set the variables.__

### Review the configuration

The documentation for `καμαρότος` is here: [Command Line Interface for your Kubernetes (OpenShift) Home Lab](/home-lab/labcli/)

1. Your lab domain will be:

   `my.awesome.lab`

1. Your lab network will be:

   For example: `10.11.12.0/24`

1. These settings are in: `${HOME}/okd-lab/lab-config/lab.yaml`

   ```yaml
   domain: my.awesome.lab
   network: 10.11.12.0
   router-ip: 10.11.12.1
   bastion-ip: 10.11.12.10
   netmask: 255.255.255.0
   centos-mirror: rsync://mirror.facebook.net/centos-stream
   gitea-version: 1.16.8
   keycloak-version: 18.0.1
   apicurio-version: 0.2.54.Final
   openwrt-version: 21.02.3
   git-url: https://gitea.my.awesome.lab:3000
   sub-domain-configs:
   ```

   __Note:__ If you want different network settings, or a different domain, change this file accordingly.

## Set Up The Router

You can use the GL.iNet `GL-AR750S` either as an access point, or as an access point plus repeater for wireless connection to your home network.

I highly recommend using a cable to connect the router to your home network.  You will get much faster network speeds than you get in repeater mode.  But, the repeater mode is usable.  Especially when traveling.

__Note:__ If at any time you need to reset the router, or any of the below commands fail and need to be rerun, do this:

   Hold the highlighted button for about 10 seconds.  When you first press the button, the left most LED will start to slowly blink.  After about 3-4 seconds it will blink a bit faster.  After about 9-10 seconds it will blink really fast.  At this point, let go of the button.  Your router will factory reset itself.

   ![Reset Router](/_pages/home-lab/lab-build/images/ResetRouter.png)

1. Set the lab environment variables in your shell

   ```bash
   labctx
   ```

1. Use the ethernet dongle to connect your workstation to one of the LAN ports on the router.  The LAN ports are the two ports closest to the power input.

1. Initialize the router configuration:

   __To use the router with a wired connection to your home network, do this:__

   ```bash
   labcli --router -i -e -wl
   ```

   You will prompted to enter an `ESSID` and a passphrase for your new lab network.

   __To use the router in repeater mode, do this instead:__

   ```bash
   labcli --router -i -e -wl -ww
   ```

   You will prompted to enter the `ESSID`, `Channel`, and `Passphrase` for the wireless network you are bridging to, and you will prompted to enter an `ESSID` and a passphrase for your new lab network.

   __Note:__ The router will dump a list of the Wireless Networks that it sees.  You can get the channel from that list as well.

   When the configuration is complete, the router will reboot.

1. Unplug the ethernet dongle, and connect your workstation to your new lab WiFi network.

1. Connect the router to you home network router, unless you are using wireless repeater mode.

1. Verify that DNS is working properly:

   ```bash
   ping google.com
   ```

1. Finish configuring the router:

   ```bash
   labcli --router -s -e
   ```

   __Note:__   If you want to see the details of what labcli scripts are doing, I have a page with the manual instructions here: [Edge Network Router Configuration](/home-lab/edge-router/){:target="_blank"}

1. Wait for the router to reboot, and then reconnect to your new lab network.

1. Verify that DNS is working properly:

   ```bash
   ping google.com
   ```

## Set Up The Pi

We are going to use the travel router that we set up previously to configure the OS for the Raspberry Pi.

__Note:__ You will need a USB type A thumb drive with at least 2-GB capacity for this step.  The thumb drive will be reformatted during this process, so don't use one with important files on it.

1. Insert the SD Card into the router.

1. Insert the thumb drive into the USB slot on the router.

1. Install and configure OpenWRT on the SD Card:

   ```bash
   labcli --pi -i
   ```

   This will take a while to complete.

   __Note:__ You can safely ignore errors like: `umount: can't unmount /dev/sda3: Invalid argument`

1. Remove the SD Card from the router and insert it into the Pi.

1. Remove the thumb drive from the USB slot on the router.

1. Connect the network adapter from the Pi to a LAN port on the router.

1. Power on the Pi.

1. Ensure that the Pi is on line:

   ```bash
   ping bastion.my.awesome.lab
   ```

1. Complete the configuration of the Pi:

   ```bash
   labcli --pi -s
   ```

   __Note:__ You can ignore this note at the end of the install: 
   
   `After the Pi reboots, run ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@10.11.12.10 "nohup /root/bin/MirrorSync.sh &"`

   This is for creating a mirror of CentOS Stream for installing KVM hosts as part of a KVM based OpenShift Lab.  [Building a Portable Kubernetes Home Lab with OpenShift - OKD4](/home-lab/lab-intro/){:target="_blank"}

   When the configuration is complete, the Pi will reboot.

## Install The Dev Tools

### Sonatype Nexus

1. Ensure that the Pi is on line:

   ```bash
   ping bastion.my.awesome.lab
   ```

1. Install Sonatype Nexus

   ```bash
   labcli --dev-tools -n
   ```

   __Note:__  If you want to see the details of what labcli scripts are doing, I have pages with the manual instructions here:

   [Install Sonatype Nexus on Raspberry Pi 4B with OpenWRT](/home-lab/nexus-pi/){:target="_blank"}

1. Start Nexus

   ```bash
   ssh root@bastion.${LAB_DOMAIN} "/etc/init.d/nexus start"
   ```

1. Nexus will take a while to start for the first time.

   You can check for Nexus to be online with `curl`

   ```bash
   curl -k https://nexus.${LAB_DOMAIN}:8443
   ```

   Go make a nice cup of tea, coffee, or hot beverage of your choice.  Nexus will be up shortly.

   __Note:__ On a MacBook, you might have to give DNS a nudge...  It does not always pick up changes from the router... `labcli --dns`

1. After Nexus has started, trust the new Nexus cert on your workstation:

   ```bash
   labcli --trust -n
   ```

1. Log into Nexus:

   Get the initial admin password for Nexus:

   ```bash
   echo $(ssh root@bastion.${LAB_DOMAIN} "cat /usr/local/nexus/sonatype-work/nexus3/admin.password")
   ```

   Now point your browser to `https://nexus.${LAB_DOMAIN}:8443`.  Login, and create a password for your admin user.

   [https://nexus.my.awesome.lab:8443](https://nexus.my.awesome.lab:8443){:target="_blank"}

If prompted to allow anonymous access, select to allow.

The `?` in the top right hand corner of the Nexus screen will take you to their documentation.

### Gitea

1. Install Gitea

   ```bash
   labcli --dev-tools -g
   ```

   __Note:__  If you want to see the details of what labcli scripts are doing, I have pages with the manual instructions here:

   [Installing Gitea on a Raspberry Pi 4B with OpenWRT](/home-lab/gitea-with-pi/){:target="_blank"}

1. Start Gitea

   ```bash
   ssh root@bastion.${LAB_DOMAIN} "/etc/init.d/gitea start"
   ```

1. Make sure that Gitea is running:

   ```bash
   curl -k https://gitea.${LAB_DOMAIN}:3000
   ```

   __Note:__ On a MacBook, you might have to give DNS a nudge...  It does not always pick up changes from the router... `labcli --dns`

1. Trust the gitea certs on your workstation:

   ```bash
   labcli --trust -g
   ```

   The Gitea web console will be at: `https://gitea.${LAB_DOMAIN}:3000`

   [https://gitea.my.awesome.lab:3000](https://gitea.my.awesome.lab:3000){:target="_blank"}

   The script creates two users for Gitea:

   1. `gitea` - This is your Gitea admin user
   1. `devuser` - This is a non-privileged user for Gitea.

   Both passwords are initialized to `password`.  You will be prompted to change them when you log in.

### KeyCloak

Next we're going to install KeyCloak.  We'll initially set it up to be the IAM provider for Apicurio.  Later we can use it as the IAM for our micro-services.

1. Install The KeyCloak application components:

   ```bash
   labcli --dev-tools -k
   ```

1. Log into the Raspberry Pi and temporarily start KeyCloak so that you can finish the setup:

   ```bash
   ssh root@bastion.${LAB_DOMAIN}
   su - keycloak
   PATH=/usr/local/java-11-openjdk/bin:${PATH} KEYCLOAK_ADMIN=admin KEYCLOAK_ADMIN_PASSWORD=admin /usr/local/keycloak/keycloak-server/bin/kc.sh start
   ```

1. When Keycloak is running, you should see something similar at the tail of the log on your screen:

   ```bash
   2022-06-16 18:41:53,528 INFO  [org.keycloak.services] (main) KC-SERVICES0050: Initializing master realm
   2022-06-16 18:42:01,344 INFO  [org.keycloak.services] (main) KC-SERVICES0009: Added user 'admin' to realm 'master'
   2022-06-16 18:42:02,573 INFO  [io.quarkus] (main) Keycloak 18.0.1 on JVM (powered by Quarkus 2.7.5.Final) started in 45.353s. Listening on: https://0.0.0.0:7443
   2022-06-16 18:42:02,575 INFO  [io.quarkus] (main) Profile prod activated. 
   2022-06-16 18:42:02,575 INFO  [io.quarkus] (main) Installed features: [agroal, cdi, hibernate-orm, jdbc-h2, jdbc-mariadb, jdbc-mssql, jdbc-mysql, jdbc-oracle, jdbc-postgresql, keycloak, narayana-jta, reactive-routes, resteasy, resteasy-jackson, smallrye-context-propagation, smallrye-health, smallrye-metrics, vault, vertx]
   ```

   We started Keycloak like this just to initialize the `Admin` user, and create the master realm.  We'll stop Keycloak now, and start it as a Daemon process.

1. Now, stop Keycloak by hitting `<ctrl + C>` in the terminal window where you started Keycloak:

   ```bash
   ^C2022-06-16 19:02:29,927 INFO  [org.infinispan.CLUSTER] (Thread-16) ISPN000080: Disconnecting JGroups channel `ISPN` 
   2022-06-16 19:02:30,086 INFO  [io.quarkus] (main) Keycloak stopped in 0.307s
   keycloak@bastion:~$ 
   ```

1. Exit the Raspberry Pi terminal

1. Now start Keycloak

   ```bash
   ssh root@bastion.${LAB_DOMAIN} "/etc/init.d/keycloak start"
   ```

1. Wait a minute for Keycloak to start.

1. Make sure that Keycloak is running:

   ```bash
   curl -k https://keycloak.${LAB_DOMAIN}:7443
   ```

   __Note:__ On a MacBook, you might have to give DNS a nudge...  It does not always pick up changes from the router... `labcli --dns`

1. Trust the Keycloak cert:

   ```bash
   labcli --trust -k
   ```

### Change the initial Password for the `admin` user

Navigate to [https://keycloak.my.awesome.lab:7443](https://keycloak.my.awesome.lab:7443){:target="_blank"}

1. Click on `Adminisration Console`

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-welcome-page.png)

1. Log in with `admin`, `admin`

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-login.png)

1. In the upper right hand corner, select the user `Admin` dropdown, and select `Manage Account`

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-manage-account.png)

1. From the middle box, select `Signing in`

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-select-signing-in.png)

1. On the right hand side, select the `Update` button

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-select-update-password.png)

1. Create a new Password

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-update-password.png)

1. In the upper right of the screen, click on `Back to security admin console`

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-back-to-console.png)

### Configure the Apicurio Realm

1. Download the prepared realm file for Apicurio:

   ```bash
   wget -O ${OKD_LAB_PATH}/keycloak-realm.json https://raw.githubusercontent.com/Apicurio/apicurio-studio/master/distro/quarkus/openshift/auth/realm.json
   ```

1. Prepare the realm file for import into Keycloak:

   ```bash
   export APICURIO_URL=https://apicurio.${LAB_DOMAIN}:9443
   ```

   __Mac OS:__

   ```bash
   sed -i "" "s|APICURIO_UI_URL|${APICURIO_URL}|g" ${OKD_LAB_PATH}/keycloak-realm.json
   ```

   __Linux:__

   ```bash
   sed -i "s|APICURIO_UI_URL|${APICURIO_URL}|g" ${OKD_LAB_PATH}/keycloak-realm.json
   ```

1. Go back to the Keycloak console:

1. In the upper left of the screen, hover over `Master`, and select `Add realm`

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-select-add-realm.png)

1. Click the `Select file` button:

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-add-realm-select-file.png)

1. Select the file at `${OKD_LAB_PATH}/keycloak-realm.json`

1. Click `Create`

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-select-create.png)

1. Click on the `Themes` tab:

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-select-themes-tab.png)

1. Select `keycloak` for each Theme:

   ![Keycloak](/_pages/home-lab/dev-tooling/images/keycloak-select-themes.png)

1. Sign out of Keycloak

### Apicurio

Finally, let's install Apicurio

1. Install the Apicurio application components

   ```bash
   labcli --dev-tools -a
   ```

1. Start Apicurio

   ```bash
   ssh root@bastion.${LAB_DOMAIN} "/etc/init.d/apicurio start"
   ```

1. Make sure that Apicurio is running:

   ```bash
   curl -k https://apicurio.${LAB_DOMAIN}:9443
   ```

   __Note:__ On a MacBook, you might have to give DNS a nudge...  It does not always pick up changes from the router... `labcli --dns`

1. Trust the Apicurio cert:

   ```bash
   labcli --trust -a
   ```

1. Create a user:

   Point your browser to: [https://apicurio.my.awesome.lab:9443](https://apicurio.my.awesome.lab:9443){:target="_blank"}

   ![Apicurio](/_pages/home-lab/dev-tooling/images/apicurio-sign-in.png)

1. Click on `Register` at the bottom of the Sign in dialog to open the registration form

   ![Apicurio](/_pages/home-lab/dev-tooling/images/apicurio-register-form.png)

1. Fill in the form and click `Register`

   ![Apicurio](/_pages/home-lab/dev-tooling/images/apicurio-register-account.png)

1. Welcome to Apicurio

   ![Apicurio](/_pages/home-lab/dev-tooling/images/apicurio-dashboard.png)

That's it!  You now have a travel router that provides firewall, VPN, DNS, and a host of other services.  Plus, a Raspberry Pi with an HTTP server, Nexus, Gitea, KeyCloak, and Apicurio.

If you ever need to change the wireless network settings, you can access the GL.iNet web console at [http://router.my.awesome.lab](http://router.my.awesome.lab).  Becareful not to change the LAN settings, or DNS settings.  You will mess up your lab network.

You can access your dev tools at these URLs:

| Tool | URL |
| --- | --- |
| __`Nexus`__ | [https://nexus.my.awesome.lab:8443](https://nexus.my.awesome.lab:8443){:target="_blank"} |
| __`Gitea`__ | [https://gitea.my.awesome.lab:3000](https://gitea.my.awesome.lab:3000){:target="_blank"} |
| __`KeyCloak`__ | [https://keycloak.my.awesome.lab:7443](https://keycloak.my.awesome.lab:7443){:target="_blank"} |
| __`Apicurio`__ | [https://apicurio.my.awesome.lab:9443](https://apicurio.my.awesome.lab:9443){:target="_blank"} |

In a future post, we'll start using these tools to build an application with Quarkus, Kafka, and Cassandra.  ...running on OpenShift...  Naturally...

Cheers!
