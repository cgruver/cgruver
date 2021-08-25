---
layout: page
permalink: /home-lab/prepare-okd-install/
title: Preparing to Install OpenShift
description: Mirror OpenShift images for disconnected install with OKD
tags:
  - sonatype nexus
---
## Prepare to Install OKD 4

### No Internet For You!

Since we are simulating a secure data center environment, let's deny internet access to our internal network:

1. Log into the edger router:

   ```bash
   ssh root@${EDGE_ROUTER}
   ```

1. Add a firewall rule to block internet bound traffic from the internal router:

   ```bash
   new_rule=$(uci add firewall rule) 
   uci batch << EOI
   set firewall.${new_rule}.enabled='1'
   set firewall.${new_rule}.target='REJECT'
   set firewall.${new_rule}.src='lan'
   set firewall.${new_rule}.src_ip='${DC1_NETWORK}/24'
   set firewall.${new_rule}.dest='wan'
   set firewall.${new_rule}.name='DC1_BLOCK'
   set firewall.${new_rule}.proto='all'
   set firewall.${new_rule}.family='ipv4'
   EOI
   uci commit firewall
   /etc/init.d/firewall restart
   ```

### Create OpenShift image mirror:

1. First, we need a couple of pull secrets:

   1. Create the pull secret for Nexus.  Use the username and password that we created with admin authority on the `okd` repository that we created.

      ```bash
      NEXUS_PWD=$(echo -n "openshift-mirror:your_password" | base64)
      ```

   1. We need to put the pull secret into a JSON file that we will use to mirror the OKD images into our Nexus registry.  We'll also need the pull secret for our cluster install.  Since we are installing OKD, we don't need an official quay.io pull secret.  So, we will use a fake one.

      ```bash
      cat << EOF > ${OKD_LAB_PATH}/pull_secret.json
      {"auths": {"fake": {"auth": "Zm9vOmJhcgo="},"nexus.${LAB_DOMAIN}:5001": {"auth": "${NEXUS_PWD}"}}}
      EOF
      ```

1. Now mirror the OKD images into the local Nexus: __This can take a while.  Be patient__

   ```bash
   ${OKD_LAB_PATH}/bin/mirrorOkdRelease.sh
   ```

   The final output should look something like:

   ```bash
   Success
   Update image:  nexus.my.awesome.lab:5001/4.7.0-0.okd-2021-07-03-190901:4.7.0-0.okd-2021-07-03-190901
   Mirror prefix: nexus.my.awesome.lab:5001/4.7.0-0.okd-2021-07-03-190901
   Mirror prefix: nexus.my.awesome.lab:5001/4.7.0-0.okd-2021-07-03-190901:4.7.0-0.okd-2021-07-03-190901

   To use the new mirrored repository to install, add the following section to the install-config.yaml:

   imageContentSources:
   - mirrors:
     - nexus.my.awesome.lab:5001/4.7.0-0.okd-2021-07-03-190901
     source: quay.io/openshift/okd
   - mirrors:
     - nexus.my.awesome.lab:5001/4.7.0-0.okd-2021-07-03-190901
     source: quay.io/openshift/okd-content


   To use the new mirrored repository for upgrades, use the following to create an ImageContentSourcePolicy:

   apiVersion: operator.openshift.io/v1alpha1
   kind: ImageContentSourcePolicy
   metadata:
     name: example
   spec:
     repositoryDigestMirrors:
     - mirrors:
       - nexus.my.awesome.lab:5001/4.7.0-0.okd-2021-07-03-190901
       source: quay.io/openshift/okd
     - mirrors:
       - nexus.my.awesome.lab:5001/4.7.0-0.okd-2021-07-03-190901
       source: quay.io/openshift/okd-content    
   ```

### Create the OpenShift install manifests, Fedora CoreOS ignition files, and the node VMs

1. First, let's prepare to deploy the VMs for our OKD cluster by preparing the Cluster VM inventory file:

   This is not an ansible inventory like you might have encountered with OKD 3.11.  This is something I made up for my lab that allows me to quickly create, manage, and destroy virtual machines.

   The file is structured in such a way that it can be parsed by the utility scripts provided in this project.  The columns in the comma delimited file are used for the following purposes:

   | Column | Name | Description |
   |-|-|-|
   | 1 | HOST_NODE  | The hypervisor host that this VM will be provisioned on |
   | 2 | GUEST_HOSTNAME | The hostname of this VM, must be in DNS with `A` and `PTR` records |
   | 3 | MEMORY | The amount of RAM in MB to allocate to this VM |
   | 4 | CPU | The number of vCPUs to allocate to this VM |
   | 5 | ROOT_VOL | The size in GB of the first HDD to provision |
   | 6 | DATA_VOL | The size in GB of the second HDD to provision; `0` for none |
   | 7 | ROLE | The OKD role that this VM will play: `bootstrap`, `master`, or `worker` |

   Create the inventory file:

   ```bash
   cat << EOF > ${OKD_LAB_PATH}/node-inventory
   kvm-host01,okd4-bootstrap,12288,4,50,0,bootstrap
   kvm-host01,okd4-master-0,20480,6,100,0,master
   kvm-host01,okd4-master-1,20480,6,100,0,master
   kvm-host01,okd4-master-2,20480,6,100,0,master
   EOF
   ```

1. Create the manifests and VMs:

   ```bash
   cp ~/.ssh/id_rsa.pub ${OKD_LAB_PATH}/id_rsa.pub
   ${OKD_LAB_PATH}/bin/initCluster.sh -i=${OKD_LAB_PATH}/node-inventory -c=1
   ```

    This script does a whole lot of work for us.  Crack it open and take a look.

    1. Creates the OpenShift install-config.yaml
    1. Invokes the openshift-install command against our install-config to produce ignition files
    1. Uses `butane` to modify the ignition files to configure each node's network settings
    1. Copies the ignition files into place for Fedora CoreOS
    1. Creates guest VMs based on the inventory file
    1. Creates iPXE boot files for each VM and copies them to the iPXE server, (your router)

1. Finaly, we are ready to install OpenShift!

   [OpenShift Install](/home-lab/install-okd/)
