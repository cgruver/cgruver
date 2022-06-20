---
title: "Let's Set Up Some Tools for Developing Micro-Services - On A Raspberry Pi!"
date:   2022-06-12 00:00:00 -0400
description: "Installing Nexus, Gitea, Apicurio, & Keycloak on Raspberry Pi"
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

1. A GL.iNet travel router that is set up to be the edge router for a home lab.

   The router will provide LAN routing, WiFi, WAN firewall, and DNS for your home lab.

1. A Raspberry Pi with the following tools:

   * [Sonatype Nexus](https://www.sonatype.com/products/nexus-repository){:target="_blank"} to be your lab artifact registry
   * [Gitea](https://gitea.io/en-us/){:target="_blank"} for your local Source Code Management
   * [Keycloak](https://www.keycloak.org){:target="_blank"} for IAM, & SSO
   * [Apicurio Studio](https://www.apicur.io/studio/){:target="_blank"} for OpenAPI, and AsyncAPI schema development

Both of the edge network devices will be running OpenWRT.

## Set Up Your Workstation

The first step is to install some tools on your development workstation.

I primarily develop on a MacBook, so these instructions are biased that way.  However, this *should* work on a Linux based workstation as well.  If you are using Windows, try setting up the Windows Subsystem For Linux.  The important thing, is that you have access to the `bash` shell, and that you have a standard GNU like environment with common commands.

1. Create a directory structure for the home lab tools and configuration files:

   ```bash
   mkdir -p ${HOME}/okd-lab/lab-config/domain-configs
   mkdir ${HOME}/okd-lab/bin
   ```

1. Install `yq` we will need it for YAML file manipulation: [https://mikefarah.gitbook.io/yq/](https://mikefarah.gitbook.io/yq/)

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

I have written a set of shell scripts and functions which implement a CLI that I use to perform a lot of the tedious setup and management functions in my OpenShift home lab.  I manage a number of OpenShift clusters, and tend to build and tear them down quite a bit.  These scripts automate most of the work.

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
   cp ${HOME}/okd-lab/kamarotos/examples/lab-empty.yaml ${HOME}/okd-lab/lab-config/lab.yaml
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
   gitea-version: 1.15.9
   openwrt-version: 21.02.1
   git-url: https://gitea.my.awesome.lab:3000
   sub-domain-configs:
   ```

   __Note:__ If you want different network settings, or a different domain, change this file accordingly.

## Set Up The Router

## Set Up The Pi

## Install The Dev Tools

1. Install The KeyCloak application components:

   ```bash
   labcli --dev-tools -k
   ```

1. Log into the Raspberry Pi and temporarily start KeyCloak so that you can finish the setup:

   ```bash
   ssh root@bastion.${LAB_DOMAIN}
   su - keycloak
   export PATH=/usr/local/java-11-openjdk/bin:${PATH}
   KEYCLOAK_ADMIN=admin KEYCLOAK_ADMIN_PASSWORD=admin /usr/local/keycloak/keycloak-server/bin/kc.sh start
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

1. Now start Keycloak with `init.d`

   ```bash
   ssh root@bastion.${LAB_DOMAIN} "/etc/init.d/keycloak start"
   ```

1. Wait a minute for Keycloak to start.

1. Trust the Keycloak cert:

   ```bash
   labcli --trust -k -d=dev
   ```

   This command adds the Keycloak cert to your trust store.

### Change the initial Password for the `admin` user

1. Open a Browser, and navigate to `https://keycloak.my.awesome.lab:7443`

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

### Configure the Apicurio Realm

1. Download the prepared realm file for Apicurio:

   ```bash
   wget -O ${OKD_LAB_PATH}/keycloak-realm.json https://raw.githubusercontent.com/Apicurio/apicurio-studio/master/distro/quarkus/openshift/auth/realm.json
   ```

1. Prepare the realm file for import into Keycloak:

   ```bash
   export APICURIO_URL=https://apicurio.${LAB_DOMAIN}:9443
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

```bash
labcli --dev-tools -a
```
