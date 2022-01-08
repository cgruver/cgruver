---
permalink: /home-lab/prepare-okd-install/
title: Preparing to Install OpenShift
description: Mirror OpenShift images for disconnected install with OKD
tags:
  - sonatype nexus
---
## Prepare to Install OKD 4

### No Internet For You!

Since we are simulating a secure data center environment, let's deny internet access to our internal network:

1. Select the Lab subdomain that you want to work with:

   ```bash
   labctx
   ```

1. Add a firewall rule to block internet bound traffic from the internal router:

   ```bash
   ssh root@router.${LAB_DOMAIN} "new_rule=\$(uci add firewall rule) ; \
   uci set firewall.\${new_rule}.enabled=1 ; \
   uci set firewall.\${new_rule}.target=REJECT ; \
   uci set firewall.\${new_rule}.src=lan ; \
   uci set firewall.\${new_rule}.src_ip=${DOMAIN_NETWORK}/24 ; \
   uci set firewall.\${new_rule}.dest=wan ; \
   uci set firewall.\${new_rule}.name=${SUB_DOMAIN}-internet-deny ; \
   uci set firewall.\${new_rule}.proto=all ; \
   uci set firewall.\${new_rule}.family=ipv4 ; \
   uci commit firewall && \
   /etc/init.d/firewall restart"
   ```

### Create OpenShift image mirror:

From your workstation, do the following:

1. First, we need a couple of pull secrets:

   1. Create the pull secret for Nexus.  Use the username and password that we created with admin authority on the `okd` repository that we created.

      If you followed the guide exactly, then the Nexus user is `openshift-mirror`

      ```bash
      read NEXUS_USER
      ```

      Type the username, i.e. `openshift-mirror` and hit `<return>`

      ```bash
      read NEXUS_PWD
      ```

      Type the password that you created for the Nexus user and hit `<return>`

      ```bash
      NEXUS_SECRET=$(echo -n "${NEXUS_USER}:${NEXUS_PWD}" | base64)
      ```

   1. We need to put the pull secret into a JSON file that we will use to mirror the OKD images into our Nexus registry.  We'll also need the pull secret for our cluster install.  Since we are installing OKD, we don't need an official quay.io pull secret.  So, we will use a fake one.

      ```bash
      cat << EOF > ${OKD_LAB_PATH}/pull_secret.json
      {"auths": {"fake": {"auth": "Zm9vOmJhcgo="},"nexus.${LAB_DOMAIN}:5001": {"auth": "${NEXUS_SECRET}"}}}
      EOF
      ```

1. Now mirror the OKD images into the local Nexus: __This can take a while.  Be patient__

   ```bash
   mirrorOkdRelease.sh -d=${SUB_DOMAIN} 
   ```

   The final output should look something like:

   ```bash
   Success
   Update image:  nexus.my.awesome.lab:5001/okd:4.9.0-0.okd-2021-12-12-025847
   Mirror prefix: nexus.my.awesome.lab:5001/okd
   Mirror prefix: nexus.my.awesome.lab:5001/okd:4.9.0-0.okd-2021-12-12-025847

   To use the new mirrored repository to install, add the following section to the install-config.yaml:

   imageContentSources:
   - mirrors:
     - nexus.my.awesome.lab:5001/okd
     source: quay.io/openshift/okd
   - mirrors:
     - nexus.my.awesome.lab:5001/okd
     source: quay.io/openshift/okd-content


   To use the new mirrored repository for upgrades, use the following to create an ImageContentSourcePolicy:

   apiVersion: operator.openshift.io/v1alpha1
   kind: ImageContentSourcePolicy
   metadata:
     name: example
   spec:
     repositoryDigestMirrors:
     - mirrors:
       - nexus.my.awesome.lab:5001/okd
       source: quay.io/openshift/okd
     - mirrors:
       - nexus.my.awesome.lab:5001/okd
       source: quay.io/openshift/okd-content    
   ```

### Create the OpenShift install manifests, Fedora CoreOS ignition files, and the node VMs

1. First, let's prepare to deploy the VMs for our OKD cluster by preparing the Cluster VM inventory file:

1. Create the manifests and VMs:

   ```bash
   cp ~/.ssh/id_rsa.pub ${OKD_LAB_PATH}/id_rsa.pub
   deployOkdNodes.sh -i -d=${SUB_DOMAIN}
   ```

    This script does a whole lot of work for us.  Crack it open and take a look.

    1. Creates the OpenShift install-config.yaml
    1. Invokes the openshift-install command against our install-config to produce ignition files
    1. Uses `butane` to modify the ignition files to configure each node's network settings
    1. Copies the ignition files into place for Fedora CoreOS
    1. Creates guest VMs based on the lab configuration file, for KVM based nodes
    1. Creates iPXE boot files for each node and copies them to the iPXE server, (your router)

1. Finaly, we are ready to install OpenShift!

   If you are building a cluster on KVM, go here:

   __[OpenShift Install - KVM](/home-lab/install-okd/)__

   If you are building a bare-metal cluster, go here:

   __[OpenShift Install - Bare Metal](/home-lab/bare-metal-install-okd/)__
