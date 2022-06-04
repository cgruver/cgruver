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

1. Set the shell environment from the lab configuration file that we created earlier:

   ```bash
   labctx dev
   ```

1. You need to know two things at this point:

   1. The MAC address of each of your NUCs

   1. The type of SSD installed, SATA or NVMe

1. Set some variables with this info:

   If you have NVMe drives:

   ```bash
   SSD=/dev/nvme0n1
   ```

   If you have SATA Drives:

   ```bash
   SSD=/dev/sda
   ```

   Now set variables with the MAC addresses from your NUCs:

   ```bash
   NUC1="1c:69:11:22:aa:bb"
   NUC2="1c:69:11:22:aa:bb"
   NUC3="1c:69:11:22:aa:bb"
   ```

1. Set a variable for the cluster network:

   ```bash
   IFS="." read -r i1 i2 i3 i4 <<< "${DOMAIN_NETWORK}"
   export NET_PREFIX=${$i1}.${$i2}.${$i3}
   ```

1. Create a YAML file to define the network and hosts for the OpenShift cluster that we're going to install:

   ```bash
   cat << EOF  > ${OKD_LAB_PATH}/lab-config/domain-configs/dev-cluster.yaml
   cluster:
     name: okd4
     cluster-cidr: 10.100.0.0/14
     service-cidr: 172.30.0.0/16
     local-registry: nexus.${LAB_DOMAIN}:5001
     proxy-registry: nexus.${LAB_DOMAIN}:5000
     remote-registry: quay.io/openshift/okd
     butane-version: v0.14.0
     butane-spec-version: 1.4.0
     ingress-ip-addr: ${NET_PREFIX}.2
   bootstrap:
     metal: true
     mac-addr: "52:54:00:a1:b2:c3"
     boot-dev: /dev/sda
     ip-addr: ${NET_PREFIX}.49
     node-spec:
       memory: 12288
       cpu: 2
       root-vol: 50
     bridge-dev: ${BOOTSTRAP_BRIDGE}
   control-plane:
     metal: true
     okd-hosts:
       - mac-addr: ${NUC1}
         boot-dev: ${SSD}
         ip-addr: ${NET_PREFIX}.60
       - mac-addr: ${NUC2}
         boot-dev: ${SSD}
         ip-addr: ${NET_PREFIX}.61
       - mac-addr: ${NUC3}
         boot-dev: ${SSD}
         ip-addr: ${NET_PREFIX}.62
   EOF
   ```

1. Set the OpenShift version for the lab to the latest available:

   ```bash
   labcli --latest -d=dev
   ```

1. Your OpenShift cluster configuration YAML file should look something like this:

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
     ingress-ip-addr: ${NET_PREFIX}.2
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
