---
permalink: /home-lab/bare-metal-install-sno/
title: Installing Single Node OpenShift on Bare Metal
description: Installing Single Node OpenShift on Intel NUC with OKD
tags:
  - bare metal openshift SNO
  - bare metal okd install
  - bare metal kubernetes single node cluster
---

__Note:__ This is part of a series.  Make sure you started here: [Building a Portable Kubernetes Home Lab with OpenShift - OKD4](/home-lab/lab-intro/)

We're going to install an OpenShift OKD SNO cluster on a bare metal server.  The bootstrap node will run on your workstation.  This particular tutorial is biased towards a MacBook workstation.  However, you can easily modify this to run the bootstrap node on Fedora or other Linux flavor.

There is also a feature for installing SNO with "bootstrap-in-place" which does not require a bootstrap node.  It is not quite ready for our purposes yet, so we're still going to use a bootstrap node to initiate the install.

Look for a future post with Bootstrap In Place.

1. Install some tools on your workstation:

   ```bash
   brew install qemu autoconf automake wolfssl
   ```

__[Set Up a MacBook for Qemu with Bridged Network](/home-lab/bare-metal-bootstrap/){:target="_blank"}__

### Set Up Your Workstation for Bootstrap

1. Now, we need to set up our MacBook to run the bootstrap node:

1. Plug in your USB-C network adapter and identify the device:

   1. Run this to list all of your devices:

      ```bash
      networksetup -listallhardwareports
      ```

   1. Look for the USB entry:

      Mine looked like this:

      ```bash
      Hardware Port: USB 10/100/1G/2.5G LAN
      Device: en6
      Ethernet Address: 00:e0:4c:84:ca:aa
      ```

   1. Note the `Device` name, and set a variable:

      ```bash
      BOOTSTRAP_BRIDGE=en6
      ```

   1. Add this device to your lab configuration:

      ```bash
      yq e ".bootstrap.bridge-dev = \"${BOOTSTRAP_BRIDGE}\"" -i ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
      ```

      You should see an entry in `${OKD_LAB_PATH}/lab-config/dev-cluster.yaml` for the bridge-dev now:

      ```yaml
      ...
        butane-spec-version: 1.3.0
        release: ${OKD_VERSION}
      bootstrap:
        metal: true
        mac-addr: "52:54:00:a1:b2:c3"
        boot-dev: sda
        ...
        bridge-dev: en6
        ...
      ```

1. Set your WiFi to be the primary internet link:

   1. Click on the wifi icon in the top right of your screen.

      ![Network Preferences](/_pages/home-lab/lab-build/images/network-preferences.png)

   1. In the bottom left of the pop up, select the menu dropdown and click on `Set Service Order`

      ![Set Service Order](/_pages/home-lab/lab-build/images/set-service-order.png)

   1. Drag `WiFi` to the top.

      ![Set Service Order](/_pages/home-lab/lab-build/images/service-order.png)

      ![Set Service Order](/_pages/home-lab/lab-build/images/wifi-first.png)

   1. Click `OK` then click `Apply`

1. Now, install VDE for bridged networking:

   ```bash
   mkdir -p ${OKD_LAB_PATH}/work-dir
   cd ${OKD_LAB_PATH}/work-dir
   git clone https://github.com/virtualsquare/vde-2.git
   cd vde-2
   autoreconf -fis
   ./configure --prefix=/opt/vde
   make
   sudo make install
   ```

1. Finally, set up the network bridge device:

   ```bash
   cd ${OKD_LAB_PATH}/work-dir
   git clone https://github.com/lima-vm/vde_vmnet
   cd vde_vmnet
   make PREFIX=/opt/vde
   sudo make PREFIX=/opt/vde install
   sudo make install BRIDGED=${BOOTSTRAP_BRIDGE}
   ```

### Preparing for the Installation

Since we are simulating a secure data center environment, let's deny internet access to our internal network:

1. Select the Lab subdomain that you want to work with:

   There is a function that we added to our shell when we set up the workstation.  It allows you to switch between different lab domain contexts so that you can run multiple clusters with potentially different releases of OpenShift.

   ```bash
   labctx dev
   ```

1. Add a firewall rule to block internet bound traffic from the internal router:

   ```bash
   labcli --disconnect
   ```

### Create the OpenShift install manifests, Fedora CoreOS ignition files, and the iPXE boot files

1. Create the manifests and Node installation files:

   ```bash
   labcli --deploy -c
   ```

    This script does a whole lot of work for us.  Crack it open and take a look.

    1. Creates the OpenShift install-config.yaml
    1. Invokes the openshift-install command against our install-config to produce ignition files
    1. Uses `butane` to modify the ignition files to configure each node's network settings
    1. Copies the ignition files into place for Fedora CoreOS
    1. Creates iPXE boot files for each node and copies them to the iPXE server, (your router)

### We are now ready to fire up our OpenShift cluster

1. Start the bootstrap node on your workstation:

   In a separate terminal window, run the following:

   ```bash
   labcli --start -b
   ```

   * Do not close this terminal.  It is the console of the bootstrap node.
   * Do not power on your control plane nodes until the bootstrap Kubernetes API is available.

1. Monitor the bootstrap process:

   In a terminal window, run the following:

   ```bash
   openshift-install --dir=${INSTALL_DIR} wait-for bootstrap-complete --log-level debug
   ```

   __Note:__ This command does not affect to install process.  You can stop and restart it safely.  It is just for monitoring the bootstrap.

1. When the API is available, power on your control plane NUC:

   You will see the following output from the above command:

   __NOTE:__ If you are on a 13" MacBook Pro like me, this will take a while.  Be patient.

   ```bash
   INFO API v1.20.0-1085+01c9f3f43ffcf0-dirty up     
   INFO Waiting up to 30m0s for bootstrapping to complete... 
   ```

   __Now, power on your NUC to start the cluster installation.__

   If you want to watch bootstrap logs:

   In yet another terminal...

   ```bash
   ssh core@okd4-bootstrap.${SUB_DOMAIN}.${LAB_DOMAIN} "journalctl -b -f -u release-image.service -u bootkube.service"
   ```

   Or, to monitor the logs from the node:

   ```bash
   ssh core@okd4-snc-node.${SUB_DOMAIN}.${LAB_DOMAIN} "journalctl -b -f -u release-image.service -u bootkube.service"
   ```

1. Enable Hyper-Threading on the OpenShift node:

   By default, Fedora CoreOS will disable SMT on processors which are vulnerable to side channel attacks.  Since we are on a private cloud, we are less concerned about that, and could really use those extra CPUs.

   So, let's enable SMT.

   1. Make sure that all of the OpenShift node is up and installing:

      ```bash
      ssh core@okd4-snc-node.${SUB_DOMAIN}.${LAB_DOMAIN} "echo Running"
      ```

   1. Modify the kernel arguments to enable SMT on the next boot:

      ```bash
      ssh core@okd4-snc-node.${SUB_DOMAIN}.${LAB_DOMAIN} "sudo rpm-ostree kargs --replace=\"mitigations=auto,nosmt=auto\""
      ```

1. Now, wait patiently for the bootstrap process to complete:

   You will see the following, when the bootstrap is complete:

   ```bash
   INFO Waiting up to 20m0s for the Kubernetes API at https://api.okd4-snc.dev.my.awesome.lab:6443... 
   DEBUG Still waiting for the Kubernetes API: an error on the server ("") has prevented the request from succeeding 
   INFO API v1.20.0-1085+01c9f3f43ffcf0-dirty up     
   INFO Waiting up to 30m0s for bootstrapping to complete... 
   DEBUG Bootstrap status: complete                   
   INFO It is now safe to remove the bootstrap resources 
   DEBUG Time elapsed per stage:                      
   DEBUG Bootstrap Complete: 11m16s                   
   DEBUG                API: 3m5s                     
   INFO Time elapsed: 11m16s
   ```

1. When the bootstrap process is complete, remove the bootstrap node:

   ```bash
   labcli --destroy -b
   ```

   This script shuts down and then deletes the Bootstrap VM.  Then it removes the bootstrap entries from the HA Proxy configuration.

1. Monitor the installation process:

   ```bash
   openshift-install --dir=${INSTALL_DIR} wait-for install-complete --log-level debug
   ```

1. Fix for a stuck MCO

   In some recent versions of OKD, the Machine Config Operator cannot complete the installation because it is looking for a non-existent machine config.

   See: [https://github.com/openshift/okd/issues/963](https://github.com/openshift/okd/issues/963)

   ```bash
   export KUBECONFIG=${KUBE_INIT_CONFIG}
   oc delete mc 99-master-okd-extensions 99-okd-master-disable-mitigations
   ```

   This will force a recreation of the control plane machine configs, and will allow the install to complete.

1. Installation Complete:

   ```bash
   DEBUG Cluster is initialized                       
   INFO Waiting up to 10m0s for the openshift-console route to be created... 
   DEBUG Route found in openshift-console namespace: console 
   DEBUG OpenShift console route is admitted          
   INFO Install complete!                            
   INFO To access the cluster as the system:admin user when using 'oc', run 'export KUBECONFIG=/Users/yourhome/okd-lab/okd-install-dir/auth/kubeconfig' 
   INFO Access the OpenShift web-console here: https://console-openshift-console.apps.okd4-snc.dev.my.awesome.lab 
   INFO Login to the console with user: "kubeadmin", and password: "AhnsQ-CGRqg-gHu2h-rYZw3" 
   DEBUG Time elapsed per stage:                      
   DEBUG Cluster Operators: 13m49s                    
   INFO Time elapsed: 13m49s
   ```

## Our install is nearly complete.  We just have a few more tasks.

1. Create an empty volume for the internal registry:

   ```bash
   export KUBECONFIG=${KUBE_INIT_CONFIG}
   oc patch configs.imageregistry.operator.openshift.io cluster --type merge --patch '{"spec":{"managementState":"Managed","storage":{"emptyDir":{}}}}'
   ```

1. Create an Image Pruner:

   ```bash
   oc patch imagepruners.imageregistry.operator.openshift.io/cluster --type merge -p '{"spec":{"schedule":"0 0 * * *","suspend":false,"keepTagRevisions":3,"keepYoungerThan":60,"resources":{},"affinity":{},"nodeSelector":{},"tolerations":[],"startingDeadlineSeconds":60,"successfulJobsHistoryLimit":3,"failedJobsHistoryLimit":3}}'
   ```

1. Delete all of the Completed pods:

   ```bash
   oc delete pod --field-selector=status.phase==Succeeded --all-namespaces
   ```

1. Because our install is disconnected from the internet, we need to remove the cluster update channel, Samples Operator, and OperatorHub:

   ```bash
   oc patch ClusterVersion version --type merge -p '{"spec":{"channel":""}}'
   oc patch configs.samples.operator.openshift.io cluster --type merge --patch '{"spec":{"managementState":"Removed"}}'
   oc patch OperatorHub cluster --type json -p '[{"op": "add", "path": "/spec/sources/0/disabled", "value": true}]'
   ```

1. __Note:__

   __If you ever forget the password for your cluster admin account, you can access your cluster with the `kubeadmin` token that we saved in the file:__ `${OKD_LAB_PATH}/lab-config/okd4-snc.${SUB_DOMAIN}.${LAB_DOMAIN}/kubeconfig`

   ```bash
   labctx dev
   export KUBECONFIG=${KUBE_INIT_CONFIG}
   ```

### Log into your new cluster console

1. Add the OKD Cluster cert to the trust store on your workstation:

   ```bash
   labcli --trust
   ```

### Create user accounts:

Let's add some users to the cluster that we created.  The temporary `kubeadmin` account is not a useful long term strategy for access to your cluster.  So, we're going to add a couple of user accounts.

OpenShift supports multiple authentication methods, from enterprise SSO to very basic auth.  We're going to start with something a little basic, using `htpasswd`.

1. If you don't already have it available, install `htpasswd` on your workstation.

1. Create an `htpasswd` file for a couple of users:

   ```bash
   labcli --user -i -a -u=admin
   labcli --user -u=devuser
   ```

1. Wait a couple of minutes for the Authentication pods to restart and stabalize.

1. Now you can verify that the new user account works:

   ```bash
   labcli --login
   ```

1. After you verify that the new admin account works.  you can delete the temporary kubeadmin account:

   ```bash
   oc delete secrets kubeadmin -n kube-system
   ```

1. Now you can point your browser to the url listed at the completion of install: i.e. `https://console-openshift-console.apps.okd4-snc.dev.my.awesome.lab`

   ```bash
   labcli --console
   ```

   Log in as `admin` with the password from the output at the completion of the install.

That's it!  You now have a single node OpenShift cluster.
