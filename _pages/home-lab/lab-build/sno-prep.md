---
permalink: /home-lab/bare-metal-install-sno/
title: Installing Single Node OpenShift on Bare Metal
description: Installing Single Node OpenShift on Intel NUC with OKD
tags:
  - bare metal openshift SNO
  - bare metal okd install
  - bare metal kubernetes single node cluster
---
We're going to install an OpenShift OKD SNO cluster on a bare metal server.  The bootstrap node will run on your workstation.  This particular tutorial is biased towards a MacBook workstation.  However, you can easily modify this to run the bootstrap node on Fedora or other Linux flavor.

There is also a feature for installing SNO with "bootstrap-in-place" which does not require a bootstrap node.  It is not quite ready for our purposes yet, so we're still going to use a bootstrap node to initiate the install.

Look for a future post with Bootstrap In Place.

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

   labctx dev

   ```bash
   IFS="." read -r i1 i2 i3 i4 <<< "${DOMAIN_NETWORK}"

   SNO_NODE_IP=${i1}.${i2}.${i3}.200
   BOOTSTRAP_IP=${i1}.${i2}.${i3}.49

   cat << EOF  > ${OKD_LAB_PATH}/lab-config/domain-configs/dev-cluster.yaml
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
       ip-addr: ${SNO_NODE_IP}
   EOF
   ```

1. Set the OpenShift version for the lab to the latest available:

   ```bash
   labcli --latest -d=dev
   ```

1. Your OpenShift cluster configuration YAML file should look something like this:

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
