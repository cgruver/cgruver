---
sitemap: true
published: true
permalink: /home-lab/workstation/
title: Configure Your Workstation
description: Preparing Your Workstation for an OpenShift Home Lab
tags:
  - openshift home lab
  - kubernetes home lab
---
This tutorial assumes that you are running a Unix like operating system on your workstation.  i.e. Mac OS, Fedora, or other Linux distribution.  If you are running Windows, you might try the Windows Subsystem For Linux.

1. Select a domain to use for your lab.  This can be a fake domain, it is just for your internal lab network.

   For example: `my.awesome.lab`

1. Select a network for your edge router.  We'll determine everything else from that address, and we'll be using a `/24` network, i.e. `255.255.255.0`.

   For example: `10.11.12.0`

   __Note:__ Do not use the network of your home router, generally 192.168.0.0 or something similar.  The important thing is to choose a different network.  Use a network from the internal IP ranges of: `192.168.*.0` or `10.*.*.0`.

1. Set a few seed variables for your lab:

   ```bash
   export LAB_DOMAIN="my.awesome.lab"
   export EDGE_NETWORK="10.11.12.0"
   export OKD_LAB_PATH=${HOME}/okd-lab
   ```

1. Create your lab configuration YAML file:

   __I'm being intentionally prescriptive here to help ensure success the first time you try this.__

   ```bash
   mkdir -p ${OKD_LAB_PATH}/lab-config
   
   IFS="." read -r i1 i2 i3 i4 <<< "${EDGE_NETWORK}"

   BASTION_HOST=${i1}.${i2}.${i3}.10
   EDGE_ROUTER=${i1}.${i2}.${i3}.1
   DEV_EDGE_IP=$(echo "${i1}.${i2}.${i3}.2")
   DEV_ROUTER=${i1}.${i2}.$(( ${i3} + 1 )).1
   DEV_INGRESS=${i1}.${i2}.$(( ${i3} + 1 )).2
   DEV_NETWORK=${i1}.${i2}.$(( ${i3} + 1 )).0

   cat << EOF > ${OKD_LAB_PATH}/lab-config/lab.yaml
   domain: ${LAB_DOMAIN}
   network: ${EDGE_NETWORK}
   router: ${EDGE_ROUTER}
   bastion-ip: ${BASTION_HOST}
   netmask: 255.255.255.0
   centos-mirror: rsync://mirror.facebook.net/centos-stream
   gitea-version: 1.16.7
   openwrt-version: 21.02.1
   git-url: https://gitea.${LAB_DOMAIN}:3000
   sub-domain-configs:
   - name: dev
     router-edge-ip: ${DEV_EDGE_IP}
     router-ip: ${DEV_ROUTER}
     network: ${DEV_NETWORK}
     netmask: 255.255.255.0
     cluster-config-file: ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
   EOF
   ```

   Your lab configuration YAML file should look something like this:

   ```yaml
   domain: my.awesome.lab
   network: 10.11.12.0
   router-ip: 10.11.12.1
   bastion-ip: 10.11.12.10
   netmask: 255.255.255.0
   sub-domain-configs:
   - name: dev
     router-edge-ip: 10.11.12.2
     router-ip: 10.11.13.1
     network: 10.11.13.0
     netmask: 255.255.255.0
     cluster-config-file: /home/username/okd-lab/lab-config/dev-cluster.yaml
   ```

1. Now create the header for your cluster configuration file:

   ```bash
   cat << EOF  > ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
   cluster:
     name: dev
     cluster-cidr: 10.100.0.0/14
     service-cidr: 172.30.0.0/16
     secret-file: ${OKD_LAB_PATH}/lab-config/pull_secret.json
     local-registry: nexus.${LAB_DOMAIN}:5001
     proxy-registry: nexus.${LAB_DOMAIN}:5000
     remote-registry: quay.io/openshift/okd
     butane-version: v0.14.0
     butane-spec-version: 1.4.0
     ingress-ip-addr: ${DEV_INGRESS}
     release: 4.10.0-0.okd-2022-05-07-021833
   EOF
   ```

   We'll fill in the rest of this file later, based on your lab setup, KVM vs. Bare Metal.

1. Create a folder for the scripts that we'll be using:

   ```bash
   mkdir ${OKD_LAB_PATH}/bin
   ```

1. Install `yq` we will need it for YAML file manipulation: [https://mikefarah.gitbook.io/yq/](https://mikefarah.gitbook.io/yq/)

   * MacOS:

     ```bash
     brew install yq
     ```

   * Linux:

     ```bash
     mkdir ${OKD_LAB_PATH}/yq-tmp
     YQ_VER=$(curl https://github.com/mikefarah/yq/releases/latest | cut -d"/" -f8 | cut -d\" -f1)
     wget -O ${OKD_LAB_PATH}/yq-tmp/yq.tar.gz https://github.com/mikefarah/yq/releases/download/${YQ_VER}/yq_linux_amd64.tar.gz
     tar -xzf ${OKD_LAB_PATH}/yq-tmp/yq.tar.gz -C ${OKD_LAB_PATH}/yq-tmp
     cp ${OKD_LAB_PATH}/yq-tmp/yq_linux_amd64 ${OKD_LAB_PATH}/bin/yq
     chmod 700 ${OKD_LAB_PATH}/bin/yq
     ```

### Install the `labcli` utilities for the Lab

I have created a companion project for this blog.  It contains all of the shell functions that I use to ease the task of building and tearing down infrastructure in my lab.

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

   You need to add the following line to the appropriate shell file in your home directory: `.bashrc`, or `.zshrc`, etc...

   __Bash:__

   ```bash
   echo ". ${OKD_LAB_PATH}/bin/labEnv.sh" >> ~/.bashrc
   ```

   __Zsh:__

   ```bash
   echo ". ${OKD_LAB_PATH}/bin/labEnv.sh" >> ~/.zshrc
   ```

1. __Log off and back on to set the variables.__

1. If you don't have an SSH key pair configured on your workstation, then create one now:

   ```bash
   ssh-keygen -t rsa -b 4096 -N "" -f ${HOME}/.ssh/id_rsa
   ```

1. Copy the SSH public key to the Lab configuration folder:

   ```bash
   cp ~/.ssh/id_rsa.pub ${OKD_LAB_PATH}/ssh_key.pub
   ```

1. Now, you are ready to set up your lab network:

   __[Set Up Lab Network](/home-lab/network-setup/)__
