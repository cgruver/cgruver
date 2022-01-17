---
sitemap: true
published: true
permalink: /home-lab/bare-metal-sno-workstation/
title: Installing Single Node OpenShift on Bare Metal with Intel NUC
description: Installing Single Node OpenShift on a Bare Metal Intel NUC with OKD
tags:
  - openshift bare metal install
  - okd single node cluster install
  - kubernetes bare metal install
---
We're going to install an OpenShift OKD SNO cluster on a bare metal server.  The bootstrap node will run on your workstation.  This particular tutorial is biased towards a MacBook workstation.  However, you can easily modify this to run the bootstrap node on Fedora or other Linux flavor.

1. Install some tools on your workstation:

   ```bash
   brew install yq qemu autoconf automake wolfssl
   ```

1. Select a domain to use for your lab.  This can be a fake domain, it is just for your internal lab network.

   For example: `my.awesome.lab`

1. Select a network for your edge router.  We'll determine everything else from that address, and we'll be using a `/24` network, i.e. `255.255.255.0`.

   For example: `10.11.12.0`

   __Note:__ Do not use the network of your home router, generally 192.168.0.0 or something similar.  The important thing is to choose a different network.  `192.168.*.0` or `10.*.*.0` should work fine.

1. Export the seed values for your lab:

   ```bash
   export LAB_DOMAIN="my.awesome.lab"
   export EDGE_NETWORK="10.11.12.0"
   export OKD_LAB_PATH=${HOME}/okd-lab
   ```

1. Set the OKD Version that we'll install.  We're going to grab the latest OKD release:

   ```bash
   export OKD_VERSION=$(curl https://github.com/openshift/okd/releases/latest | cut -d"/" -f8 | cut -d\" -f1)
   ```

1. Create lab configuration YAML files:

   There are two YAML configuration files that are used by the helper scripts for deploying the infrastructure for you home lab:

   * The first configuration file defines the networks for your lab, as well as any KVM Hosts that are deployed on the edge LAN network.
   * The second YAML file defines the infrastructure and release version for provisioning an OpenShift Cluster:

   __I'm being intentionally prescriptive here to help ensure success the first time you try this.__

   ```bash
   mkdir -p ${OKD_LAB_PATH}/lab-config/domain-configs
   
   IFS=. read -r i1 i2 i3 i4 << EOI
   ${EDGE_NETWORK}
   EOI

   BASTION_HOST=${i1}.${i2}.${i3}.10
   EDGE_ROUTER=${i1}.${i2}.${i3}.1
   SNO_EDGE_IP=$(echo "${i1}.${i2}.${i3}.2")
   SNO_ROUTER=${i1}.${i2}.$(( ${i3} + 1 )).1
   SNO_NETWORK=${i1}.${i2}.$(( ${i3} + 1 )).0

   cat << EOF > ${OKD_LAB_PATH}/lab-config/lab.yaml
   domain: ${LAB_DOMAIN}
   network: ${EDGE_NETWORK}
   router: ${EDGE_ROUTER}
   bastion-ip: ${BASTION_HOST}
   netmask: 255.255.255.0
   openwrt-version: 21.02.1
   gitea-version: 1.15.9
   sub-domain-configs:
   - name: sno
     router-edge-ip: ${SNO_EDGE_IP}
     router-ip: ${SNO_ROUTER}
     network: ${SNO_NETWORK}
     netmask: 255.255.255.0
     cluster-config-file: ${OKD_LAB_PATH}/lab-config/domain-configs/sno-cluster.yaml
   EOF
   ```

   Your lab configuration YAML file should look something like this:

   ```yaml
   domain: my.awesome.lab
   network: 10.11.12.0
   router-ip: 10.11.12.1
   bastion-ip: 10.11.12.10
   netmask: 255.255.255.0
   openwrt-version: 21.02.1
   gitea-version: 1.15.9
   sub-domain-configs:
   - name: sno
     router-edge-ip: 10.11.12.2
     router-ip: 10.11.13.1
     network: 10.11.13.0
     netmask: 255.255.255.0
     cluster-config-file: /home/username/okd-lab/lab-config/domain-configs/sno-cluster.yaml
   ```

1. Create a YAML file to define the network and hosts for the OpenShift cluster that we're going to install:

1. You need to know two things at this point:

   1. The MAC address of your NUC

   1. The type of SSD installed, SATA or NVMe

1. Set some variables with this info:

   If you have an NVMe drive:

   ```bash
   SSD=nvme0n1
   ```

   If you have a SATA Drive:

   ```bash
   SSD=sda
   ```

   Now set variables with the MAC addresses from your NUCs:

   ```bash
   NUC1="1c:69:11:22:aa:bb"
   ```

1. Create a YAML file to define the network and host for the OpenShift cluster that we're going to install:

   ```bash
   IFS=. read -r i1 i2 i3 i4 << EOI
   ${SNO_NETWORK}
   EOI

   SNO_NODE_IP=${i1}.${i2}.${i3}.200
   BOOTSTRAP_IP=${i1}.${i2}.${i3}.49

   cat << EOF  > ${OKD_LAB_PATH}/lab-config/domain-configs/sno-cluster.yaml
   cluster:
     name: okd4-snc
     cluster-cidr: 10.88.0.0/14
     service-cidr: 172.20.0.0/16
     secret-file: ${OKD_LAB_PATH}/lab-config/pull_secret.json
     local-registry: nexus.${LAB_DOMAIN}:5001
     proxy-registry: nexus.${LAB_DOMAIN}:5000
     remote-registry: quay.io/openshift/okd
     butane-version: v0.13.1
     butane-spec-version: 1.3.0
     release: ${OKD_VERSION}
   bootstrap:
     metal: true
     mac-addr: "52:54:00:a1:b2:c3"
     ip-addr: ${BOOTSTRAP_IP}
     boot-dev: sda
     node-spec:
       memory: 12288
       cpu: 2
       root_vol: 50
   control-plane:
     metal: true
     okd-hosts:
     - mac-addr: "${NUC1}"
       boot-dev: ${SSD}
       sno-install-dev: sda
       name: okd4-snc-node
       ip-addr: ${SNO_NODE_IP}.200
   EOF
   ```

   Your OpenShift cluster configuration YAML file should look something like this:

   ```yaml
   cluster:
     name: okd4-snc
     cluster-cidr: 10.88.0.0/14
     service-cidr: 172.20.0.0/16
     secret-file: /Users/userId/lab-config/pull_secret.json
     local-registry: nexus.my.awesome.lab:5001
     proxy-registry: nexus.my.awesome.lab:5000
     remote-registry: quay.io/openshift/okd
     butane-version: v0.13.1
     butane-spec-version: 1.3.0
     release: 4.9.0-0.okd-2021-12-12-025847
   bootstrap:
     metal: true
     mac-addr: "52:54:00:a1:b2:c3"
     ip-addr: 10.11.12.49
     boot-dev: sda
     node-spec:
       memory: 12288
       cpu: 2
       root_vol: 50
   control-plane:
     metal: true
     okd-hosts:
     - mac-addr: "1c:69:11:22:33:44"
       boot-dev: sda
       sno-install-dev: sda
       name: okd4-snc-node
       ip-addr: 10.11.12.200
   ```

### Install the CLI Utilities for the Lab

I have created a companion project for this blog.  It contains all of the shell scripts that I have created to ease the task of building and tearing down infrastructure in my lab.

In the spirit of Kubernetes naming, I wanted to give it a nautical name.  Since these scripts take on the drudgery of repeated tasks, I chose to name them after the guy that cleans the toilets on a ship...  Thus, the project is named: __καμαρότος__.  That is, kamarótos; Greek for Ship's steward or cabin boy...

1. Clone the git repository that I have created with helper scripts:

   ```bash
   git clone https://github.com/cgruver/kamarotos.git ${OKD_LAB_PATH}/kamarotos
   ```

1. Copy the helper scripts to your `${OKD_LAB_PATH}` directory:

   ```bash
   cp ${OKD_LAB_PATH}/kamarotos/bin/* ${OKD_LAB_PATH}/bin
   chmod 700 ${OKD_LAB_PATH}/bin/*
   ```

1. Add the following to your shell environment:

   Your default shell will be something like `bash` or `zsh`.  Although you might have changed it.

   You need to add the following lines to the appropriate shell file in your home directory: `.bashrc`, or `.zshrc`, etc...

   ```bash
   export OKD_LAB_PATH=${HOME}/okd-lab
   export PATH=$PATH:${OKD_LAB_PATH}/bin
   export LAB_CONFIG_FILE=${OKD_LAB_PATH}/lab-config/lab.yaml
   . ${OKD_LAB_PATH}/bin/labctx.env
   ```

1. Log off and back on to set the variables.

1. Download OpenShift CLI tools from [https://github.com/openshift/okd/releases/latest](https://github.com/openshift/okd/releases/latest)

   Download the `openshift-client` & `openshift-install`

   ```bash
   getOkdCmds.sh -d=sno
   ```

### Set up Workstation for Bootstrap

1. Now, we need to set up our MacBook to run the bootstrap node:

1. Plug in your USB-C network adapter and identify the device:

   1. Run this to list all of your devices:

      ```bash
      networksetup -listallhardwareports
      ```

   1. Look for the USB entry:

      Mine looked like this:

      ```bash
      Hardware Port: USB 10/100/1G/2.5G LAN
      Device: en6
      Ethernet Address: 00:e0:4c:84:ca:aa
      ```

   1. Note the `Device` name, and set a variable:

      ```bash
      BOOTSTRAP_BRIDGE=en6
      ```

   1. Add this device to your lab configuration:

      ```bash
      yq e ".bootstrap.bridge-dev = \"${BOOTSTRAP_BRIDGE}\"" -i ${OKD_LAB_PATH}/lab-config/sno-cluster.yaml
      ```

      You should see an entry in `${OKD_LAB_PATH}/lab-config/sno-cluster.yaml` for the bridge-dev now:

      ```yaml
      ...
        butane-spec-version: 1.3.0
        release: ${OKD_VERSION}
      bootstrap:
        metal: true
        mac-addr: "52:54:00:a1:b2:c3"
        boot-dev: sda
        ...
        bridge-dev: en6
        ...
      ```

1. Set your WiFi to be the primary internet link:

   1. Click on the wifi icon in the top right of your screen.

      ![Network Preferences](/_pages/home-lab/bare-metal/images/network-preferences.png)

   1. In the bottom left of the pop up, select the menu dropdown and click on `Set Service Order`

      ![Set Service Order](/_pages/home-lab/bare-metal/images/set-service-order.png)

   1. Drag `WiFi` to the top.

      ![Set Service Order](/_pages/home-lab/bare-metal/images/service-order.png)

      ![Set Service Order](/_pages/home-lab/bare-metal/images/wifi-first.png)

   1. Click `OK` then click `Apply`

1. Now, install VDE for bridged networking:

   ```bash
   mkdir -p ${OKD_LAB_PATH}/work-dir
   cd ${OKD_LAB_PATH}/work-dir
   git clone https://github.com/virtualsquare/vde-2.git
   cd vde-2
   autoreconf -fis
   ./configure --prefix=/opt/vde
   make
   sudo make install
   ```

1. Finally, set up the network bridge device:

   ```bash
   cd ${OKD_LAB_PATH}/work-dir
   git clone https://github.com/lima-vm/vde_vmnet
   cd vde_vmnet
   make PREFIX=/opt/vde
   sudo make PREFIX=/opt/vde install
   sudo make install BRIDGED=${BOOTSTRAP_BRIDGE}
   ```

Now that we've got the configurations in place, let's set up our network.

[Set Up Lab Network](/home-lab/network-setup/)
