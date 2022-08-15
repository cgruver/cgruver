---
permalink: /home-lab/prepare-bare-metal-sno-okd-install/
title: Installing Single Node OpenShift on Bare Metal
description: Installing Single Node OpenShift on Intel NUC with OKD
tags:
  - bare metal openshift SNO
  - bare metal okd install
  - bare metal kubernetes single node cluster
---

__Note:__ This is part of a series.  Make sure you started here: [Building a Portable Kubernetes Home Lab with OpenShift - OKD4](/home-lab/lab-intro/)

We're going to install an OpenShift OKD SNO cluster on a bare metal server.  The bootstrap node will run on your workstation.  This particular tutorial is biased towards a MacBook workstation.  However, you can easily modify this to run the bootstrap node on Fedora or other Linux flavor.

## Prepare Your Workstation For Bootstrap

Before you proceed, you need to setup your workstation for running the Bootstrap node.  Or, if you have a NUC available, then you can set it up as a KVM host and run the bootstrap there.  These instructions assume that you are using your workstation.

[Set Up a MacBook for Qemu with Bridged Network](/home-lab/bare-metal-bootstrap/){:target="_blank"}

## Set Up SNO Configuration

1. You need to know two things at this point:

   1. The MAC address of your NUC

   1. The type of SSD installed, SATA or NVMe

1. copy the cluster config file from ${HOME}/okd-lab/kamarotos/examples/domain-configs/sno-bm.yaml:

   ```bash
   cd ${HOME}/okd-lab/kamarotos
   git pull
   cp ${HOME}/okd-lab/kamarotos/examples/domain-configs/sno-bm.yaml ${HOME}/okd-lab/lab-config/domain-configs/dev.yaml
   ```

1. Read the `MAC` address off of the bottom of the NUC and add it to the cluster config file:

   Edit `${HOME}/okd-lab/lab-config/domain-configs/dev.yaml` and replace `YOUR_HOST_MAC_HERE` with the MAC address of your NUC.

   __Note:__ Use lower case letters in the MAC.

1. You need to know whether you have NVME or SATA SSDs in the NUC.

   1. If you have an NVME drive installed in the NUC, you do not need to modify anything.

   1. If you have SATA M.2 drive instead of NVME then edit: `${OKD_LAB_PATH}/lab-config/domain-configs/dev.yaml`, and replace `nvme0n1` with `sda`.

   1. If you have more than one drive installed, then edit: `${OKD_LAB_PATH}/lab-config/domain-configs/dev.yaml`, and replace `disk2: NA` with `disk2: nvme0n2` or `disk2: sdb` as appropriate

1. Replace the value of `BOOTSTRAP_BRIDGE`:

   Edit `${HOME}/okd-lab/lab-config/domain-configs/dev.yaml` and replace `BOOTSTRAP_BRIDGE` with the `${BOOTSTRAP_BRIDGE}` that you set in the step: [Prepare Your Workstation For Bootstrap](/home-lab/bare-metal-bootstrap/){:target="_blank"}


1. Set the OpenShift version for the lab to the latest available:

   ```bash
   labcli --latest -d=dev
   ```

1. Your OpenShift cluster configuration YAML file should look similar, (but not necessarily exactly), to this:

   ```yaml
   cluster:
     name: okd4-snc
     cluster-cidr: 10.88.0.0/14
     service-cidr: 172.20.0.0/16
     local-registry: nexus.my.awesome.lab:5001
     proxy-registry: nexus.my.awesome.lab:5000
     remote-registry: quay.io/openshift/okd
     butane-spec-version: 1.4.0
     release: 4.10.0-0.okd-2022-05-07-021833
   bootstrap:
     metal: true
     mac-addr: "52:54:00:a1:b2:c3"
     ip-addr: 10.11.13.49
     boot-dev: /dev/sda
     bridge-dev: en6
     node-spec:
       memory: 12288
       cpu: 2
       root_vol: 50
   control-plane:
     metal: true
     okd-hosts:
     - mac-addr: "1c:69:11:22:33:44"
       boot-dev: /dev/sda
       sno-install-dev: /dev/sda
       name: okd4-snc-node
       ip-addr: 10.11.13.200
   ```

## Now We are Ready To Prepare a Disconnected Install of OpenShift

__[Preparing to Install OpenShift - Mirror OKD Images](/home-lab/mirror-okd-images/)__
