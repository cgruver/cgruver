---
permalink: /home-lab/bare-metal-install-okd/
title: Installing OpenShift on Bare Metal
description: Installing Bare-Metal UPI OpenShift on Intel NUC with OKD
tags:
  - bare metal openshift install
  - bare metal okd install
  - bare metal kubernetes install
---

1. Create a YAML file to define the network and hosts for the OpenShift cluster that we're going to install:

1. You need to know two things at this point:

   1. The MAC address of each of your NUCs

   1. The type of SSD installed, SATA or NVMe

1. Set some variables with this info:

   If you have NVMe drives:

   ```bash
   SSD=nvme0n1
   ```

   If you have SATA Drives:

   ```bash
   SSD=sda
   ```

   Now set variables with the MAC addresses from your NUCs:

   ```bash
   NUC1="1c:69:11:22:aa:bb"
   NUC2="1c:69:11:22:aa:bb"
   NUC3="1c:69:11:22:aa:bb"
   ```

1. Create a YAML file to define the network and hosts for the OpenShift cluster that we're going to install:

   ```bash
   cat << EOF  > ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
   cluster-name: okd4
   secret-file: ${OKD_LAB_PATH}/lab-config/pull_secret.json
   local-registry: nexus.${LAB_DOMAIN}:5001
   proxy-registry: nexus.${LAB_DOMAIN}:5000
   remote-registry: quay.io/openshift/okd
   butane-version: v0.13.1
   butane-spec-version: 1.3.0
   okd-version: ${OKD_VERSION}
   bootstrap:
     metal: true
     mac-addr: "52:54:00:a1:b2:c3"
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
     - mac-addr: "${NUC2}"
       boot-dev: ${SSD}
     - mac-addr: "${NUC3}"
       boot-dev: ${SSD}
   EOF
   ```

1. Set the OpenShift version for the lab to the latest available:

   ```bash
   labcli --latest -d=dev
   ```

1. Your OpenShift cluster configuration YAML file should look something like this:

   ```yaml
   cluster-name: okd4
   secret-file: /Users/userId/lab-config/pull_secret.json
   local-registry: nexus.my.awesome.lab:5001
   proxy-registry: nexus.my.awesome.lab:5000
   remote-registry: quay.io/openshift/okd
   butane-version: v0.13.1
   butane-spec-version: 1.3.0
   okd-version: 4.9.0-0.okd-2021-12-12-025847
   bootstrap:
     metal: true
     mac-addr: "52:54:00:a1:b2:c3"
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
     - mac-addr: "1c:69:ab:cd:12:34"
       boot-dev: sda
     - mac-addr: "1c:69:fe:dc:ba:21"
       boot-dev: sda
   ```
