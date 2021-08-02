---
layout: page
permalink: /home-lab/workstation/
title: Configuring Your Workstation
---

You need to choose two things to get started:

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

1. Create a script to setup your lab network environment variables

   ```bash
   mkdir -p ~/okd-lab/bin

   IFS=. read -r i1 i2 i3 i4 << EOI
   ${EDGE_NETWORK}
   EOI
   BASTION_HOST=${i1}.${i2}.${i3}.10
   EDGE_ROUTER=${i1}.${i2}.${i3}.1

   cat << EOF > ~/okd-lab/bin/setLabEnv.sh
   export PATH=\$PATH:${OKD_LAB_PATH}/bin
   export LAB_DOMAIN=${LAB_DOMAIN}
   export EDGE_NETWORK=${EDGE_NETWORK}
   export BASTION_HOST=${BASTION_HOST}
   export EDGE_ROUTER=${EDGE_ROUTER}
   export NETMASK=255.255.255.0
   export OKD_LAB_PATH=${HOME}/okd-lab
   export OKD_NIGHTLY_REGISTRY=registry.svc.ci.openshift.org/origin/release
   export OKD_STABLE_REGISTRY=quay.io/openshift/okd
   export LOCAL_REGISTRY=nexus.${LAB_DOMAIN}:5001
   export LOCAL_REPOSITORY=origin
   export LOCAL_SECRET_JSON=${OKD_LAB_PATH}/pull_secret.json
   EOF

   chmod 750 ~/okd-lab/bin/setLabEnv.sh
   ```

1. If you like, add `~/okd-lab/bin/setLabEnv.sh` to be included in your shell profile on login.

1. Clone the git repository that I have created with helper scripts:

   ```bash
   . ~/okd-lab/bin/setLabEnv.sh
   cd ${OKD_LAB_PATH}
   git clone https://github.com/cgruver/okd-home-lab.git
   ```

1. Copy the scripts to your lab `bin` directory:

   ```bash
   cp okd-home-lab/bin/* ${OKD_LAB_PATH}/bin
   chmod 700 ${OKD_LAB_PATH}/bin/*
   ```

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

   [Edge Router](/home-lab/edge-router)