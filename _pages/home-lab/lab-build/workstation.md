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
__Note:__ This is part of a series.  Make sure you started here: [Building a Portable Kubernetes Home Lab with OpenShift - OKD4](/home-lab/lab-intro/)

__Note:__ This tutorial assumes that you are running a Unix like operating system on your workstation.  i.e. Mac OS, Fedora, or other Linux distribution.  If you are running Windows, you might try the Windows Subsystem For Linux.  All of my testing is done on Mac OS.

## Install `yq`

We will need it for YAML file manipulation: [https://mikefarah.gitbook.io/yq/](https://mikefarah.gitbook.io/yq/)

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

## Install `butane`

Butane, [https://github.com/coreos/butane](https://github.com/coreos/butane), is a utility for manipulating Red Hat CoreOS or Fedora CoreOS ignition files.

* MacOS: (Intel or Apple Silicon)

  ```bash
  brew install butane
  ```

* Linux:

   ```bash
   BUTANE_RELEASE=$(basename $(curl -Ls -o /dev/null -w %{url_effective} https://github.com/coreos/butane/releases/latest))
   wget -O ${OKD_LAB_PATH}/bin/butane https://github.com/coreos/butane/releases/download/${BUTANE_RELEASE}/butane-x86_64-unknown-linux-gnu
   chmod 700 ${OKD_LAB_PATH}/bin/butane
   ```

## Install the `labcli` utilities for the Lab

I have created a companion project for this blog.  It contains all of the shell functions that I use to ease the task of building and tearing down infrastructure in my lab.

In the spirit of Kubernetes naming, I wanted to give it a nautical name.  Since these scripts take on the drudgery of repeated tasks, I chose to name them after the guy that cleans the toilets on a ship...  Thus, the project is named: __καμαρότος__.  That is, kamarótos; Greek for Ship's steward or cabin boy...

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

1. Copy the prescriptive lab configuration files to ${HOME}/okd-lab/lab-config

   ```bash
   mkdir -p ${HOME}/okd-lab/lab-config/domain-configs
   cp ${HOME}/okd-lab/kamarotos/examples/lab.yaml ${HOME}/okd-lab/lab-config/lab.yaml
   cp ${HOME}/okd-lab/kamarotos/examples/domain-configs/kvm-cluster-basic.yaml ${HOME}/okd-lab/lab-config/domain-configs/dev.yaml
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

   There will be a test later...  :-)

1. __Log off and back on to set the variables.__

## Review the configuration

The documentation for `labcli` is here: [Command Line Interface for your Kubernetes (OpenShift) Home Lab](/home-lab/labcli/)

I'm being intentionally prescriptive here to help ensure success the first time you try this.  I have created a lab configuration for you based on the assumption that you have the minimal equipment for your first lab.  You will need the equipment for a Basic KVM Lab: [Gear For Your Home Lab](/home-lab/lab-gear/)

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
   - name: dev
     router-edge-ip: 10.11.12.15
     router-ip: 10.11.13.1
     network: 10.11.13.0
     netmask: 255.255.255.0
     cluster-config-file: dev.yaml
   ```

   __Note:__ If you want different network settings, or a different domain, change this file accordingly.

1. The configuration file for your OpenShift cluster is in: `${HOME}/okd-lab/lab-config/domain-configs/dev.yaml

   ```yaml
   cluster:
     name: okd4
     cluster-cidr: 10.88.0.0/14
     service-cidr: 172.20.0.0/16
     local-registry: nexus.my.awesome.lab:5001
     proxy-registry: nexus.my.awesome.lab:5000
     remote-registry: quay.io/openshift/okd
     butane-spec-version: 1.4.0
     ingress-ip-addr: 10.11.13.2
   kvm-hosts:
     - host-name: kvm-host01
       mac-addr: "YOUR_HOST_MAC_HERE"
       ip-addr: 10.11.13.200
       disks:
         disk1: sda
         disk2: sdb
   bootstrap:
     metal: false
     node-spec:
       memory: 12288
       cpu: 4
       root-vol: 50
     kvm-host: kvm-host01
     ip-addr: 10.11.13.49
   control-plane:
     metal: false
     node-spec:
       memory: 20480
       cpu: 6
       root-vol: 100
     okd-hosts:
       - kvm-host: kvm-host01
         ip-addr: 10.11.13.60
       - kvm-host: kvm-host01
         ip-addr: 10.11.13.61
       - kvm-host: kvm-host01
         ip-addr: 10.11.13.62
   ```

   __Note:__ You will need to replace `YOUR_HOST_MAC_HERE` with the MAC address of your NUC server.  We'll do that later when we get ready to install OpenShift.

   __Note:__ If you want different network settings, or a different domain, change this file accordingly.

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
