---
permalink: /home-lab/workstation/
title: Configuring Your Workstation
sidebar:
  nav: lab-setup
---
This tutorial assumes that you are running a Unix like operating system on your workstation.  i.e. Mac OS, Fedora, or other Linux disto.  If you are running Windows, you might try the Windows Subsystem For Linux.

1. Install `yq` we will need it for YAML file manipulation: [https://mikefarah.gitbook.io/yq/](https://mikefarah.gitbook.io/yq/)

1. Select a domain to use for your lab.  This can be a fake domain, it is just for your internal lab network.

   For example: `my.awesome.lab`

1. Select a network for your edge router.  We'll determine everything else from that address, and we'll be using a `/24` network, i.e. `255.255.255.0`.

   For example: `10.11.12.0`

   __Note:__ Do not use the network of your home router, generally 192.168.0.0 or something similar.  The important thing is to choose a different network.  `192.168.*.0` or `10.*.*.0` should work fine.

1. Export the seed values for your lab:

   ```bash
   export LAB_DOMAIN="my.awesome.lab"
   export EDGE_NETWORK="10.11.12.0"
   ```

1. Create lab configuration YAML file:

   ```bash
   OKD_LAB_PATH=${HOME}/okd-lab
   mkdir -p ${OKD_LAB_PATH}/lab-config
   
   IFS=. read -r i1 i2 i3 i4 << EOI
   ${EDGE_NETWORK}
   EOI

   BASTION_HOST=${i1}.${i2}.${i3}.10
   EDGE_ROUTER=${i1}.${i2}.${i3}.1
   DEV_EDGE_IP=$(echo "${i1}.${i2}.${i3}.2")
   DEV_ROUTER=${i1}.${i2}.$(( ${i3} + 1 )).1
   DEV_NETWORK=${i1}.${i2}.$(( ${i3} + 1 )).0

   cat << EOF > ${OKD_LAB_PATH}/lab-config/lab.yaml
   domain: ${LAB_DOMAIN}
   network: ${EDGE_NETWORK}
   router: ${EDGE_ROUTER}
   bastion-ip: ${BASTION_HOST}
   netmask: 255.255.255.0
   sub-domain-configs:
   - name: dev
     router-edge-ip: ${DEV_EDGE_IP}
     router-ip: ${DEV_ROUTER}
     network: ${DEV_NETWORK}
     netmask: 255.255.255.0
     cluster-config-file: ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
   EOF
   ```

   I'm being intentionally prescriptive here to help ensure success the first time you try this.

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

1. Create a YAML file to define the network and hosts for the OpenShift cluster that we're going to install:

   ```bash
   cat << EOF  > ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
   cluster-name: okd4
   secret-file: ${OKD_LAB_PATH}/pull_secret.json
   local-registry: nexus.${LAB_DOMAIN}:5001
   remote-registry: quay.io/openshift/okd
   bootstrap:
     kvm-host: kvm-host01
     memory: 12288
     cpu: 4
     root_vol: 50
   control-plane:
     memory: 20480
     cpu: 6
     root_vol: 100
     kvm-hosts:
     - kvm-host01
     - kvm-host01
     - kvm-host01
   EOF
   ```

   Your OpenShift cluster configuration YAML file should look something like this:

   ```yaml
   cluster-name: okd4
   secret-file: ${OKD_LAB_PATH}/pull_secret.json
   local-registry: nexus.${LAB_DOMAIN}:5001
   remote-registry: quay.io/openshift/okd
   bootstrap:
     kvm-host: kvm-host01
     memory: 12288
     cpu: 4
     root_vol: 50
   control-plane:
     memory: 20480
     cpu: 6
     root_vol: 100
     kvm-hosts:
     - kvm-host01
     - kvm-host01
     - kvm-host01
   ```

   __The full explanation for these configuration files can be found here:__ [Configuration Files & Deployment Automation for Your Lab](/home-lab/configuration/)

1. Clone the git repository that I have created with helper scripts:

   ```bash
   cd ${OKD_LAB_PATH}
   git clone https://github.com/cgruver/okd-home-lab.git
   ```

1. Copy the scripts to your lab `bin` directory:

   ```bash
   cp okd-home-lab/bin/* ${OKD_LAB_PATH}/bin
   chmod 700 ${OKD_LAB_PATH}/bin/*
   ```

1. Add the following to your shell environment:

   ```bash
   export OKD_LAB_PATH=${HOME}/okd-lab
   export PATH=$PATH:${OKD_LAB_PATH}/bin
   export LAB_DOMAIN="my.awesome.lab"
   ```

1. Log off and back on to set the variables.

1. Download OpenShift CLI tools from [https://github.com/openshift/okd/releases/latest](https://github.com/openshift/okd/releases/latest)

   Download the `openshift-client` & `openshift-install` appropriate for your workstation OS

   ```bash
   OKD_VERSION=$(curl https://github.com/openshift/okd/releases/latest | cut -d"/" -f8 | cut -d\" -f1)
   ```

   __Mac OS:__

   ```bash
   OS_VER=mac
   ```

   __Linux:__

   ```bash
   OS_VER=linux
   ```

   ```bash
   wget -O ${OKD_LAB_PATH}/oc.tar.gz https://github.com/openshift/okd/releases/download/${OKD_VERSION}/openshift-client-${OS_VER}-${OKD_VERSION}.tar.gz
   wget -O ${OKD_LAB_PATH}/oc-install.tar.gz https://github.com/openshift/okd/releases/download/${OKD_VERSION}/openshift-install-${OS_VER}-${OKD_VERSION}.tar.gz
   tar -xzf ${OKD_LAB_PATH}/oc.tar.gz -C ${OKD_LAB_PATH}/bin
   tar -xzf ${OKD_LAB_PATH}/oc-install.tar.gz -C ${OKD_LAB_PATH}/bin
   chmod 700 ${OKD_LAB_PATH}/bin/oc
   chmod 700 ${OKD_LAB_PATH}/bin/kubectl
   chmod 700 ${OKD_LAB_PATH}/bin/openshift-install
   rm -f ${OKD_LAB_PATH}/oc.tar.gz
   rm -f ${OKD_LAB_PATH}/oc-install.tar.gz
   ```

1. Download `butane` for configuring Fedora CoreOS ignition files:

   __Mac OS:__

   ```bash
   wget -O ${OKD_LAB_PATH}/bin/butane https://github.com/coreos/butane/releases/download/v0.7.0/fcct-x86_64-apple-darwin
   chmod 700 ${OKD_LAB_PATH}/bin/butane
   ```

   __Linux:__

   ```bash
   wget -O ${OKD_LAB_PATH}/bin/butane https://github.com/coreos/butane/releases/download/v0.7.0/fcct-x86_64-unknown-linux-gnu
   chmod 700 ${OKD_LAB_PATH}/bin/butane
   ```

1. Now, you are ready to configure your edge router.

   [Edge Router](/home-lab/edge-router/)
