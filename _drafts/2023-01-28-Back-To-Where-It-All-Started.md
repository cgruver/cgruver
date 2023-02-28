---
title: "Back To Where It All Started"
date:   2023-01-16 00:00:00 -0400
description: "Building an OpenShift Home Lab"
tags:
  - OpenShift Home Lab
  - Single Node Openshift
  - Kubernetes Home Lab
  - OpenShift on Intel NUC
categories:
  - Blog Post
---

Happy 2023!  I hope that your year is starting out on a positive trajectory.  Yes, I realize that it's already March...  but, Happy New Year regardless.

I started this blog on [August 1, 2021](https://upstreamwithoutapaddle.com/openshift/home%20lab/kubernetes/2021/08/01/Blog-Introduction.html){:target="_blank"} with a post about building a Kubernetes home lab with the community supported distribution of OKD which shares its codebase with Red Hat OpenShift.

In this post, I am going to revisit the original purpose of this blog by showing you how to build a simplified version of my OpenShift home lab.

In this post you will build either a single node OpenShift cluster (SNO), or you will build a full three node cluster.  In either case, the nodes in this cluster will be dual purpose control-plane and compute nodes.

This lab is intended to be very flexible so that you can reconfigure it at will.  It will also grow as you are able to add additional hardware.

There are three motivations driving this re-write of the home lab project:

1. The GL.iNet edge routers that I originally built the network around have been discontinued.

   So, it's time for an upgrade.

2. A disconnected network setup with multiple routers and firewalls, adds complexity to the lab that might put it beyond the reach of someone just getting started.

   I am refactoring the lab documentation to allow you to start with the simplest possible setup.  One router, and one Intel server.

3. Startup cost is higher with the need for two routers and a Raspberry Pi.

   By eliminating the disconnected install, you save around $250 in the initial startup cost.

So, here is a home lab that you can build with one Intel server and a travel router.

![Starter Lab](/_pages/home-lab/images/starter-lab.png)

## Required Equipment

1. Router - These instructions are specifically crafted for the [GL-iNet GL-AXT1800](https://www.gl-inet.com/products/gl-axt1800/) travel router.  Although, if you hack the scripts you should be able to use any OpenWRT based router that has enough CPU and RAM.

2. SD Flash Drive - You will need at least 64GB on a microSDXC flash drive:

   I'm using this one, which is pretty affordable, but also fast: [128 GB SD Card](https://www.amazon.com/gp/product/B08RG6XJZD/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1){:target="_blank"}

3. An Intel or AMD x64-64 based server - I am using an Intel NUC10i7FNK.  I am really a fan of the NUC form factor computers because of their compact size.

   You can use any machine that you like, as long as it has the following characteristics:

   * At least 4 cores which support SMT (aka Hyper Thread) - You need at least 8 vCPUs

      The NUC10i7FNK has 6 cores, which is great for Kubernetes.  However, they are getting a little older now and are harder to find.

   * Minimum of 32GB of RAM for Single Node Openshift or 64GB of RAM for a full three node cluster

      I highly encourage you to go with 64GB of RAM.  The cost difference is not that much and the benefits of more RAM are huge.

   * 1TB of SSD - either SATA or NVMe.  Don't use spinning disks.  They are too slow.

## Install the `labcli` utilities for the Lab

I have created a companion project for this blog.  It contains all of the shell functions that I use to ease the task of building and tearing down infrastructure in my lab.

1. Create a directory for all of your lab manifests and utilities:

   ```bash
   mkdir -p ${HOME}/okd-lab/bin
   ```

1. Create a temporary working directory:

   ```bash
   WORK_DIR=$(mktemp -d)
   ```

1. Clone the git repository that I have created with helper scripts:

   ```bash
   git clone https://github.com/cgruver/kamarotos.git ${WORK_DIR}
   ```

1. Copy the helper scripts to `${HOME}/okd-lab`:

   ```bash
   cp ${WORK_DIR}/bin/* ${HOME}/okd-lab/bin
   chmod 700 ${HOME}/okd-lab/bin/*
   ```

1. Copy the prescriptive lab configuration files to ${HOME}/okd-lab/lab-config

   ```bash
   cp -r ${WORK_DIR}/examples ${HOME}/okd-lab/lab-config
   ```

1. Create a symbolic link to use the config file for a single node OpenShift cluster.

   ```bash
   ln -s ${HOME}/okd-lab/lab-config/basic-lab-sno.yaml ${HOME}/okd-lab/lab-config/lab.yaml
   ```

1. Remove the temporary directory

   ```bash
   rm -rf ${WORK_DIR}
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

   It's always a good practice to look at what a downloaded script is doing, since it is running with your logged in privileges...  I know that you NEVER run one of those; `curl some URL | bash`...  without looking at the file first...  right?

2. __Log off and back on to set the variables.__

## Review the configuration

The documentation for `labcli` is here: [Command Line Interface for your Kubernetes (OpenShift) Home Lab](/home-lab/labcli/)

I'm being intentionally prescriptive here to help ensure success the first time you try this.  I have created a lab configuration for you based on the assumption that you have the minimal equipment for your first lab.

1. Your lab domain will be:

   `my.awesome.lab`

2. Your lab network will be:

   `10.11.12.0/24`

3. These settings are in: `${HOME}/okd-lab/lab-config/lab.yaml`

   ```yaml
   domain: my.awesome.lab
   network: 10.11.12.0
   router-ip: 10.11.12.1
   netmask: 255.255.255.0
   centos-mirror: rsync://mirror.facebook.net/centos-stream/
   sub-domain-configs: []
   cluster-configs:
     - name: dev
       cluster-config-file: sno-no-pi.yaml
       domain: edge
   ```

   __Note:__ If you want different network settings, or a different domain, change this file accordingly.

4. The configuration file for your OpenShift cluster is in: `${HOME}/okd-lab/lab-config/domain-configs/sno-no-pi.yaml

   ```yaml
   cluster:
     name: okd4-sno
     cluster-cidr: 10.88.0.0/14
     service-cidr: 172.20.0.0/16
     remote-registry: quay.io/openshift/okd
     butane-version: v0.16.0
     butane-spec-version: 1.4.0
     butane-variant: fcos
     ingress-ip-addr: 10.11.12.2
   bootstrap:
     metal: false
     node-spec:
       memory: 12288
       cpu: 4
       root-vol: 50
     kvm-host: kvm-host01
     ip-addr: 10.11.12.49
   control-plane:
     metal: false
     node-spec:
       memory: 61440
       cpu: 12
       root-vol: 800
     okd-hosts:
       - kvm-host: kvm-host01
         ip-addr: 10.11.12.60
   kvm-hosts:
     - host-name: kvm-host01
       mac-addr: "YOUR_HOST_MAC_HERE"
       ip-addr: 10.11.12.200
       disks:
         disk1: nvme0n1
         disk2: NA
   ```

   __Note:__ You will need to replace `YOUR_HOST_MAC_HERE` with the MAC address of your server.  We'll do that later when we get ready to install OpenShift.

   __Note:__ If you want different network settings, or a different domain, change this file accordingly.  However, I highly encourage you to deploy the lab at least once with the prescriptive configuration.  This will get you familiar with how I've set it up.  Trust me, it's really easy to tear it down and rebuild it.

## Install `yq`

We will need it for YAML file manipulation: [https://mikefarah.gitbook.io/yq/](https://mikefarah.gitbook.io/yq/)

* MacOS:

  ```bash
  brew install yq
  ```

* Linux:

  ```bash
  mkdir ${OKD_LAB_PATH}/yq-tmp
  YQ_VER=$(basename $(curl -Ls -o /dev/null -w %{url_effective} https://github.com/mikefarah/yq/releases/latest))
  wget -O ${OKD_LAB_PATH}/yq-tmp/yq.tar.gz https://github.com/mikefarah/yq/releases/download/${YQ_VER}/yq_linux_amd64.tar.gz
  tar -xzf ${OKD_LAB_PATH}/yq-tmp/yq.tar.gz -C ${OKD_LAB_PATH}/yq-tmp
  cp ${OKD_LAB_PATH}/yq-tmp/yq_linux_amd64 ${OKD_LAB_PATH}/bin/yq
  chmod 700 ${OKD_LAB_PATH}/bin/yq
  ```

## Set up and SSH Key Pair

1. If you don't have an SSH key pair configured on your workstation, then create one now:

   ```bash
   ssh-keygen -t rsa -b 4096 -N "" -f ${HOME}/.ssh/id_rsa
   ```

1. Copy the SSH public key to the Lab configuration folder:

   ```bash
   cp ~/.ssh/id_rsa.pub ${OKD_LAB_PATH}/ssh_key.pub
   ```

1. Now, you are ready to set up your lab network:

__Note:__ If at any time you need to reset the router, or any of the below commands fail and need to be rerun, do this:

   Hold the highlighted button for about 10 seconds.  When you first press the button, the left most LED will start to slowly blink.  After about 3-4 seconds it will blink a bit faster.  After about 9-10 seconds it will blink really fast.  At this point, let go of the button.  Your router will factory reset itself.

   ![Reset Router](images/ResetRouter.png)

## Configure the Lab Router

1. Connect to your lab router:

   * Do not connect your router to any other network devices yet.
   * Power it on and connect to it from your workstation.
   * With the `GL-AR750S` you can connect to the WiFi.  The initial SSID and passphrase are on the back of the router.
     Otherwise, connect from your workstation with a network cable.  __Note:__ I generally use a network cable to apply the initial configuration to all of my GL.iNet routers, wireless or not.
   * Ensure that you can ping the router: `ping 192.168.8.1`

1. Set your shell environment for managing the lab:

   ```bash
   labctx edge-cluster
   ```

1. Initialize the router configuration:

   You can use the GL.iNet `GL-AR750S`  either as an access point, or as an access point plus repeater for wireless connection to your home network.

   __Note:__ I highly recommend using a cable to connect the router to your home network.  You will get much faster network speeds than you get in repeater mode.  But, the repeater mode is usable.  Especially when traveling.

   __To initialise the router to use a wired connection to your home network, do this:__

   ```bash
   labcli --router -i -e -wl
   ```

   You will prompted to enter an `ESSID` and a passphrase for your new lab network.

   __To initialise the router for use in repeater mode, do this instead:__

   ```bash
   labcli --router -i -e -wl -ww
   ```

   You will prompted to enter the `ESSID`, `Channel`, and `Passphrase` for the wireless network you are bridging to, and you will prompted to enter an `ESSID` and a `Passphrase` for your new lab network.

   __Note:__ The router will dump a list of the Wireless Networks that it sees.  You can get the channel from that list as well.

   When the configuration is complete, the router will power off.

1. Finish configuring the router:

   Now, connect the router to your home network with a cable, if you are not using the wireless-repeater mode.

   Power the router back on by unplugging the power and reconnecting it.

   When the router boots back up, you should be able to connect your workstation to your new lab WiFi network.

1. Make sure that you have internet connectivity through the router:

   ```bash
   ping google.com
   ```

1. Finish configuring the router:

   ```bash
   labcli --router -s -e
   ```

1. Wait for the router to reboot, and then reconnect to your new lab network.

1. Verify that DNS is working properly:

   ```bash
   ping google.com
   ```

## Prepare to Install CentOS Stream on Your KVM Host

1. Create a mirror of the CentOS Stream repo on your router:

   ```bash
   ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@10.11.12.1 "nohup /root/bin/MirrorSync.sh &"
   ```

   This process will run in the background and will take a while to complete.
