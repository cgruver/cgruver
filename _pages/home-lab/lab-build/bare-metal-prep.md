---
permalink: /home-lab/prepare-bare-metal-okd-install/
title: Preparing To Install OpenShift on Bare Metal
description: Preparing for a Bare Metal UPI OpenShift Install on Intel NUC with OKD
tags:
  - bare metal openshift install
  - bare metal okd install
  - bare metal kubernetes install
---
## Prepare Your Workstation For Bootstrap

Before you proceed, you need to setup your workstation for running the Bootstrap node.  Or, if you have a NUC available, then you can set it up as a KVM host and run the bootstrap there.  These instructions assume that you are using your workstation.

[Set Up a MacBook for Qemu with Bridged Network](/home-lab/bare-metal-bootstrap/){:target="_blank"}

## Set Up Bare Metal Cluster Configuration

__As before, I'm being intentionally prescriptive here to help ensure success the first time you try this.__

1. copy the cluster config file from ${HOME}/okd-lab/kamarotos/examples/domain-configs/bare-metal-basic.yaml:

   ```bash
   cd ${HOME}/okd-lab/kamarotos
   git pull
   cp ${HOME}/okd-lab/kamarotos/examples/domain-configs/bare-metal-basic.yaml ${HOME}/okd-lab/lab-config/domain-configs/dev.yaml
   ```

1. Read the `MAC` address off of the bottom of each NUC and add it to the cluster config file:

   Edit `${HOME}/okd-lab/lab-config/domain-configs/dev.yaml` and replace `YOUR_HOST_MAC_HERE` with the MAC address of each NUC.

   __Note:__ Use lower case letters in the MAC.

1. You need to know whether you have NVME or SATA SSDs in the NUC.

   1. If you have an NVME drive installed in the NUC, you do not need to modify anything.

   1. If you have SATA M.2 drive instead of NVME then edit: `${OKD_LAB_PATH}/lab-config/domain-configs/dev.yaml`, and replace `nvme0n1` with `sda`.

   1. If you have more than one drive installed, then edit: `${OKD_LAB_PATH}/lab-config/domain-configs/dev.yaml`, and replace `disk2: NA` with `disk2: nvme0n2` or `disk2: sdb` as appropriate

1. Set the OpenShift version for the lab to the latest available:

   ```bash
   labcli --latest -d=dev
   ```

1. Replace the value of `BOOTSTRAP_BRIDGE`:

   Edit `${HOME}/okd-lab/lab-config/domain-configs/dev.yaml` and replace `BOOTSTRAP_BRIDGE` with the `${BOOTSTRAP_BRIDGE}` that you set in the step: [Prepare Your Workstation For Bootstrap](/home-lab/bare-metal-bootstrap/){:target="_blank"}

1. Your OpenShift cluster configuration YAML file should look similar to this:

   ```yaml
   cluster:
     name: okd4
     cluster-cidr: 10.100.0.0/14
     service-cidr: 172.30.0.0/16
     local-registry: nexus.my.awesome.lab:5001
     proxy-registry: nexus.my.awesome.lab:5000
     remote-registry: quay.io/openshift/okd
     butane-version: v0.14.0
     butane-spec-version: 1.4.0
     ingress-ip-addr: 10.11.13.2
   bootstrap:
     metal: true
     mac-addr: "52:54:00:a1:b2:c3"
     boot-dev: sda
     ip-addr: 10.11.13.49
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
       ip-addr: 10.11.13.60
     - mac-addr: "1c:69:ab:cd:12:34"
       boot-dev: /dev/sda
       ip-addr: 10.11.13.61
     - mac-addr: "1c:69:fe:dc:ba:21"
       boot-dev: /dev/sda
       ip-addr: 10.11.13.62
   ```

## Now We are Ready To Prepare a Disconnected Install of OpenShift

__[Preparing to Install OpenShift - Mirror OKD Images](/home-lab/mirror-okd-images/)__
