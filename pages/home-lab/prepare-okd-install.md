---
layout: page
permalink: /home-lab/prepare-okd-install/
title: Preparing to Install OpenShift
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

### Set up Nexus for image mirroring:

Now point your browser to `https://nexus.your.domain.com:8443`.  Login, and create a password for your admin user.

If prompted to allow anonymous access, select to allow.

The `?` in the top right hand corner of the Nexus screen will take you to their documentation.

We need to create a hosted Docker registry to hold the mirror of the OKD images that we will use to install our cluster.

1. Login as your new admin user
1. Select the gear icon from the top bar, in between a cube icon and the search dialog.
1. Select `Repositories` from the left menu bar.

    ![Nexus Admin](images/NexusAdmin.png)

1. Select `+ Create repository`
1. Select `docker (hosted)`
1. Name your repository `origin`
1. Check `HTTPS` and put `5001` in the port dialog entry
1. Check `Allow anonymous docker pull`
1. Check `Enable Docker V1 API`, you may need this for some older docker clients.

    ![Nexus OKD Repo](images/CreateOriginRepo.png)

1. Click `Create repository` at the bottom of the page.
1. Now expand the `Security` menu on the left and select `Realms`
1. Add `Docker Bearer Token Realm` to the list of active `Realms`

    ![Realms](images/NexusRealms.png)

1. Click `Save`
1. Now, select `Roles` from the expanded `Security` menu on the left.
1. Click `+ Create role` and select `Nexus role`
1. Create the role as shown:

    ![Nexus Role](images/NexusRole.png)

1. Add the appropriate privileges as shown:

    ![Role Privileges](images/RolePrivileges.png)

1. Click `Create role`
1. Now, select `Users` from the expanded `Security` menu on the left.

    ![Create User](images/CreateUser.png)

1. Click `Create local user`
1. Create the user as shown:

    ![Nexus User](images/NexusUser.png)

### Create OpenShift image mirror:

1. Add the Nexus cert to the trust store on your workstation:

   * Mac OS:

     ```bash
     openssl s_client -showcerts -connect nexus.${LAB_DOMAIN}:5001 </dev/null 2>/dev/null|openssl x509 -outform PEM > /tmp/nexus.${LAB_DOMAIN}.crt
     sudo security add-trusted-cert -d -r trustRoot -k "/Library/Keychains/System.keychain" /tmp/nexus.${LAB_DOMAIN}.crt
     ```

     Open Keychain and mark the cert as trusted.

   * Linux:

     ```bash
     openssl s_client -showcerts -connect nexus.${LAB_DOMAIN}:5001 </dev/null 2>/dev/null|openssl x509 -outform PEM > /etc/pki/ca-trust/source/anchors/nexus.${LAB_DOMAIN}.crt
     update-ca-trust
     ```

1. Next, we need a couple of pull secrets:

   1. Create the pull secret for Nexus.  Use the username and password that we created with admin authority on the `origin` repository that we created.

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
   mirrorOkdRelease.sh
   ```

   The final output should look something like:

   ```bash
   Success
   Update image:  nexus.my.awesome.lab:5001/origin:4.7.0-0.okd-2021-07-03-190901
   Mirror prefix: nexus.my.awesome.lab:5001/origin
   Mirror prefix: nexus.my.awesome.lab:5001/origin:4.7.0-0.okd-2021-07-03-190901

   To use the new mirrored repository to install, add the following section to the install-config.yaml:

   imageContentSources:
   - mirrors:
     - nexus.my.awesome.lab:5001/origin
     source: quay.io/openshift/okd
   - mirrors:
     - nexus.my.awesome.lab:5001/origin
     source: quay.io/openshift/okd-content


   To use the new mirrored repository for upgrades, use the following to create an ImageContentSourcePolicy:

   apiVersion: operator.openshift.io/v1alpha1
   kind: ImageContentSourcePolicy
   metadata:
     name: example
   spec:
     repositoryDigestMirrors:
     - mirrors:
       - nexus.my.awesome.lab:5001/origin
       source: quay.io/openshift/okd
     - mirrors:
       - nexus.my.awesome.lab:5001/origin
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

   [OpenShift Install](/home-lab/install-okd)
