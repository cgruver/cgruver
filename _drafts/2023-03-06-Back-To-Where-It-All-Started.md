---
title: "Back To Where It All Started"
date:   2023-03-06 00:00:00 -0400
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

From the limited usage data that I am able to get from Google about my Blog, it appears that the most popular section of this site is the post about building a single node OpenShift cluster.  So...  In this post, I am going to revisit the original purpose of this blog by showing you how to build a simplified version of my OpenShift home lab.  In this post you will build either a single node OpenShift cluster (SNO), or you will build a full three node cluster.  In either case, the nodes in this cluster will be dual purpose control-plane and compute nodes.

This lab is intended to be very flexible so that you can reconfigure it at will.  It will also grow as you are able to add additional hardware.

There are three motivations driving this re-write of the home lab project:

1. The GL.iNet edge routers that I originally built the network around have been discontinued.

   So, it's time for an upgrade.

1. A disconnected network setup with multiple routers and firewalls, adds complexity to the lab that might put it beyond the reach of someone just getting started.

   I am refactoring the lab documentation to allow you to start with the simplest possible setup.  One router, and one Intel server.

1. Startup cost for my original setup is higher with the need for two routers and a Raspberry Pi.

   By eliminating the disconnected install, you save around $250 in the initial startup cost.

So, here is a home lab that you can build with one Intel server and a travel router.

<img src="/_pages/home-lab/images/starter-lab.png" width="50%"/>

## Required Equipment

1. Router - These instructions are specifically crafted for the [GL-iNet GL-AXT1800](https://www.gl-inet.com/products/gl-axt1800/) travel router.  Although, if you hack the scripts you should be able to use any OpenWRT based router that has enough CPU and RAM.

1. SD Flash Drive - You will need at least 64GB on a microSDXC flash drive:

   I'm using this one, which is pretty affordable, but also fast: [128 GB SD Card](https://www.amazon.com/gp/product/B08RG6XJZD/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1){:target="_blank"}

1. An Intel or AMD x64-64 based server - I am using an Intel NUC10i7FNK.  I am really a fan of the NUC form factor computers because of their compact size.

   You can use any machine that you like, as long as it has the following characteristics:

   * At least 4 cores which support SMT (aka Hyper Thread) - You need at least 8 vCPUs

      The NUC10i7FNK has 6 cores, which is great for Kubernetes.  However, they are getting a little older now and are harder to find.

      I will eventually start looking at the NUC 12 line.  Check out the [NUC12WSKi5](https://www.intel.com/content/www/us/en/products/sku/121623/intel-nuc-12-pro-kit-nuc12wski5/specifications.html), you'll get 12 cores with 16 threads!

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

1. __Log off and back on to set the variables.__

### Review the configuration

I'm being intentionally prescriptive here to help ensure success the first time you try this.  I have created a lab configuration for you based on the assumption that you have the minimal equipment for your first lab.

1. Your lab domain will be:

   `my.awesome.lab`

1. Your lab network will be:

   `10.11.12.0/24`

1. These settings are in: `${HOME}/okd-lab/lab-config/lab.yaml`

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

1. The configuration file for your OpenShift cluster is in: `${HOME}/okd-lab/lab-config/domain-configs/sno-no-pi.yaml

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

__Note:__ If you want different network settings, or a different domain, change these two files accordingly.  However, I highly encourage you to deploy the lab at least once with the prescriptive configuration.  This will get you familiar with how I've set it up.  Trust me, it's really easy to tear it down and rebuild it.

### Install `yq`

We will need the `yq` utility for YAML file manipulation: [https://mikefarah.gitbook.io/yq/](https://mikefarah.gitbook.io/yq/)

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

### Create an SSH Key Pair

1. If you don't have an SSH key pair configured on your workstation, then create one now:

   ```bash
   ssh-keygen -t rsa -b 4096 -N "" -f ${HOME}/.ssh/id_rsa
   ```

1. Copy the SSH public key to the Lab configuration folder:

   ```bash
   cp ~/.ssh/id_rsa.pub ${OKD_LAB_PATH}/ssh_key.pub
   ```

1. Now, you are ready to set up your lab network:

## Configure the Lab Router

__Note:__ If at any time you need to reset the router, or any of the below commands fail and need to be rerun, do this:

   Hold the highlighted button for about 10 seconds.  When you first press the button, the left most LED will start to slowly blink.  After about 3-4 seconds it will blink a bit faster.  After about 9-10 seconds it will blink really fast.  At this point, let go of the button.  Your router will factory reset itself.  The router pictured here in a GL-iNet AR750S, however most GL-iNet routers have the same button configuration.

   <img src="/_pages/home-lab/lab-build/images/ResetRouter.png" width="50%"/>

1. Insert the SD Card into the slot on your router.

   Don't worry about the format of the card.  The lab scripts will format it.

   __Note:__ Do not use an SD Card with data on it that you want to keep.  The card will be formatted during initialization.

1. Connect to your lab router:

   * Power it on and connect to it from your workstation.
   * With the `GL-AXT1800` you can connect to the WiFi.  The initial SSID and passphrase are on the back of the router.
     Otherwise, connect from your workstation with a network cable.
   * Ensure that you can ping the router: `ping 192.168.8.1`

1. Enable password-less SSH to the router:

   ```bash
   cat ${OKD_LAB_PATH}/ssh_key.pub | ssh root@192.168.8.1 "cat >> /etc/dropbear/authorized_keys"
   ```

1. Set a root password on your router:

   Point your browser at [https://192.168.8.1](https://192.168.8.1).

   You should see the welcome page for the router.  Select you preferred language and set a password for the router.

1. Connect your router to the internet:

   The `GL-AXT1800` can be connected to your home network via cable, or wireless repeater.  You'll get the fastest speeds with a hard wire to your home router, but that also limits the placement of your lab.  Repeater mode on the `GL-AXT1800` is surprisingly fast.  That is how I am using it.

   1. Set up Repeater Mode:

      Return to [https://192.168.8.1](https://192.168.8.1).

   1. Select `Connect` from the Repeater configuration menu in the lower left of the main page.

   1. Choose the wireless network that you want to connect to, and enter the appropriate passphrase.

   1. Re-connect to your router's wireless network.

1. Set your shell environment for managing the lab:

   ```bash
   labctx dev
   ```

1. Initialize the router configuration:

   ```bash
   labcli --router -i -e
   ```

   When the configuration is complete, the router will reboot.

1. Wait for the router to reboot, and then reconnect to your new lab network.

1. Make sure that you have internet connectivity through the router:

   ```bash
   ping google.com
   ```

1. Finish configuring the router:

   ```bash
   labcli --router -s -e -f
   ```

   When the configuration is complete, the router will reboot again.

1. Wait for the router to reboot, and then reconnect to your new lab network.

   __Note:__ When you update the firmware on your router, you will need to run all of the above steps again.  However, to preserve the data on the SD Card, leave out the `-f` option.  By doing so, you will not lose your DNS configuration or the CentOS Stream repo synch.

1. Verify that DNS is working properly:

   ```bash
   ping google.com
   ```

### Prepare to Install CentOS Stream on Your KVM Host

1. Create a mirror of the CentOS Stream repo on your router:

   ```bash
   ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@10.11.12.1 "nohup /root/bin/MirrorSync.sh &"
   ```

   This process will run in the background and will take quite a while to complete. Depending on network speed, this could take an hour or more.

   You can check on the progress of the CentOS Stream synch by following the log at `/usr/local/MirrorSync.log`

1. Once the CentOS Stream repository has finished synching, go on to the next section to set up your KVM host.

## Set Up KVM Host

1. Create a default root password for your KVM hosts:

   ```bash
   labcli --kvm-pwd
   ```

1. Read the `MAC` address off of the bottom of the NUC and add it to the cluster config file:

   Edit `${HOME}/okd-lab/lab-config/domain-configs/sno-no-pi.yaml` and replace `YOUR_HOST_MAC_HERE` with the MAC address of your NUC.

   __Note:__ Use lower case letters in the MAC.

1. You need to know whether you have NVME or SATA SSDs in the NUC.

   1. If you have an NVME drive installed in the NUC, you do not need to modify anything.

   1. If you have SATA M.2 drive instead of NVME then edit: `${OKD_LAB_PATH}/lab-config/domain-configs/sno-no-pi.yaml`, and replace `nvme0n1` with `sda`.

   1. If you have more than one drive installed and you want to use all of them for storage, then edit: `${OKD_LAB_PATH}/lab-config/domain-configs/sno-no-pi.yaml`, and replace `disk2: NA` with `disk2: nvme0n2` or `disk2: sdb` as appropriate

Once you have completed the configuration file changes, Deploy the KVM hosts:

1. Prepare for the CentOS Stream install:

   ```bash
   labcli --deploy -k
   ```

   This command will configure the `iPXE` and `kickstart` files for you as well as create the appropriate `DNS` records.

1. We are now ready to plug in the NUC and boot it up.

   __Note:__  This is the point at which you might have to attach a keyboard and monitor to your NUC.  We need to ensure that the BIOS is set up to attempt a Network Boot with UEFI, not legacy.  You also need to ensure that `Secure Boot` is disabled in the BIOS since we are not explicitly trusting the boot images.

   Also, Take this opportunity to apply the latest BIOS to your NUC.__  You won't need the keyboard or mouse again, until it's time for another BIOS update...  Eventually we'll figure out how to push those from the OS too.

1. Make sure that the KVM host is connected to your network and power it on.

   At this point, it should PXE boot off of the router, and start an unattended install of CentOS Stream.

   Attach a monitor and keyboard if you want to watch.

   1. The host will power on and find no bootable OS
   1. The host will attempt a network boot by requesting a DHCP address and PXE boot info
      * The DHCP server will issue an IP address and direct the host to the PXE boot file on the TFTP boot server
   1. The host will retrieve the `boot.ipxe` file from the TFTP boot server
   1. The `boot.ipxe` script will then retrieve an iPXE script name from the MAC address of the host.
   1. The host will begin booting:
      1. The host will retrieve the `vmlinuz`, and `initrd` files from the HTTP install server
      1. The host will load the kernel and init-ram
      1. The host will retrieve the kickstart file or ignition config file depending on the install type.
   1. The host should now begin an unattended install.

## We are now ready to deploy our Single Node OpenShift cluster

1. Deploy the configuration in preparation for the install:

   ```bash
   labcli --deploy -c
   ```

1. Start the bootstrap node:

   ```bash
   labcli --start -b
   ```

1. Start the control-plane node:

   ```bash
   labcli --start -m
   ```

1. Monitor the bootstrap process:

   ```bash
   labcli --monitor -b
   ```

   __Note:__ This command does not affect to install process.  You can stop and restart it safely.  It is just for monitoring the bootstrap.

   If you want to watch logs for issues:

   ```bash
   labcli --monitor -j
   ```

1. You will see the following, when the bootstrap is complete:

   ```bash
   INFO Waiting up to 20m0s for the Kubernetes API at https://api.okd4.my.awesome.lab:6443... 
   DEBUG Still waiting for the Kubernetes API: an error on the server ("") has prevented the request from succeeding 
   INFO API v1.20.0-1085+01c9f3f43ffcf0-dirty up     
   INFO Waiting up to 30m0s for bootstrapping to complete... 
   DEBUG Bootstrap status: complete                   
   INFO It is now safe to remove the bootstrap resources 
   DEBUG Time elapsed per stage:                      
   DEBUG Bootstrap Complete: 11m16s                   
   DEBUG                API: 3m5s                     
   INFO Time elapsed: 11m16s
   ```

1. When the bootstrap process is complete, remove the bootstrap node:

   ```bash
   labcli --destroy -b
   ```

   This script shuts down and then deletes the Bootstrap VM.  Then it removes the bootstrap entries from the HA Proxy configuration.

1. Monitor the installation process:

   ```bash
   labcli --monitor -i
   ```

   __Note:__ This command does not affect to install process.  You can stop and restart it safely.  It is just for monitoring.

1. Installation Complete:

   ```bash
   DEBUG Cluster is initialized                       
   INFO Waiting up to 10m0s for the openshift-console route to be created... 
   DEBUG Route found in openshift-console namespace: console 
   DEBUG OpenShift console route is admitted          
   INFO Install complete!                            
   INFO To access the cluster as the system:admin user when using 'oc', run 'export KUBECONFIG=/Users/yourhome/okd-lab/okd-install-dir/auth/kubeconfig' 
   INFO Access the OpenShift web-console here: https://console-openshift-console.apps.okd4.my.awesome.lab 
   INFO Login to the console with user: "kubeadmin", and password: "AhnsQ-CGRqg-gHu2h-rYZw3" 
   DEBUG Time elapsed per stage:                      
   DEBUG Cluster Operators: 13m49s                    
   INFO Time elapsed: 13m49s
   ```

1. Post Install:

   ```bash
   labcli --post
   ```

1. Add Users:

   __Note:__ Make sure that the htpasswd command is installed on your system.  It should be included by default on Mac OS.  For Fedora, RHEL, or CentOS: `dnf install httpd-tools`

   Add a cluster-admin user:

   ```bash
   labcli --user -i -a -u=admin
   ```

   __Note:__ You can ignore the warning: `Warning: User 'admin' not found`

   Add a non-privileged user:

   ```bash
   labcli --user -u=devuser
   ```

## Install The Hostpath Provisioner Operator as a storage Provisioner

1. Install the Cert Manager Operator (Dependency)

   ```bash
   oc create -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.0/cert-manager.yaml
   ```

1. Wait for the operator to install:

   ```bash
   oc wait --for=condition=Available -n cert-manager --timeout=120s --all deployments
   ```

1. Install the Hostpath Provisioner:

   ```bash
   oc create -f https://raw.githubusercontent.com/kubevirt/hostpath-provisioner-operator/release-v0.15/deploy/namespace.yaml
   oc create -f https://raw.githubusercontent.com/kubevirt/hostpath-provisioner-operator/release-v0.15/deploy/webhook.yaml -n hostpath-provisioner
   oc create -f https://raw.githubusercontent.com/kubevirt/hostpath-provisioner-operator/release-v0.15/deploy/operator.yaml -n hostpath-provisioner
   ```

1. Create an instance of the Hostpath Provisioner:

   ```bash
   cat << EOF | oc apply -f -
   apiVersion: hostpathprovisioner.kubevirt.io/v1beta1
   kind: HostPathProvisioner
   metadata:
     name: hostpath-provisioner
   spec:
     imagePullPolicy: Always
     storagePools:
       - name: "local"
         path: "/var/hostpathvolumes"
     workload:
       nodeSelector:
         kubernetes.io/os: linux
   EOF
   ```

1. Create a StorageClass:

   ```bash
   cat << EOF | oc apply -f -
   apiVersion: storage.k8s.io/v1
   kind: StorageClass
   metadata:
     name: hostpath-csi
     annotations:
       storageclass.kubernetes.io/is-default-class: "true"
   provisioner: kubevirt.io.hostpath-provisioner
   reclaimPolicy: Delete
   volumeBindingMode: WaitForFirstConsumer
   parameters:
     storagePool: local
   EOF
   ```

### Create a Storage Volume for the Internal Image Registry

Verify that the Hostpath Provisioner is working by creating a PersistentVolumeClaim for the OpenShift internal image registry.

1. Create the PVC:

   ```bash
   cat << EOF | oc apply -f -
   apiVersion: v1
   kind: PersistentVolumeClaim
   metadata:
     name: registry-pvc
     namespace: openshift-image-registry
   spec:
     accessModes:
     - ReadWriteOnce
     resources:
       requests:
         storage: 100Gi
     storageClassName: hostpath-csi
   EOF
   ```

1. Patch the internal image registry to use the new PVC:

   ```bash
   oc patch configs.imageregistry.operator.openshift.io cluster --type merge --patch '{"spec":{"rolloutStrategy":"Recreate","managementState":"Managed","storage":{"pvc":{"claim":"registry-pvc"}}}}'
   ```

That's it!

Have fun with OpenShift
