---
permalink: /home-lab/bare-metal-install-okd/
title: Installing OpenShift on Bare Metal
description: Installing Bare-Metal UPI OpenShift on Intel NUC with OKD
tags:
  - bare metal openshift install
  - bare metal okd install
  - bare metal kubernetes install
---

## We are now ready to fire up our OpenShift cluster

1. Start the bootstrap node:

   In a separate terminal window, run the following:

   ```bash
   export SUB_DOMAIN=dev
   
   startNodes.sh -b -d=${SUB_DOMAIN}
   ```

   * Do not close this terminal.  It is the console of the bootstrap node.
   * Do not power on your control plane nodes until the bootstrap Kubernetes API is available.

1. Monitor the bootstrap process:

   In a terminal window, run the following:

   ```bash
   openshift-install --dir=${OKD_LAB_PATH}/okd-install-dir wait-for bootstrap-complete --log-level debug
   ```

   __Note:__ This command does not affect to install process.  You can stop and restart it safely.  It is just for monitoring the bootstrap.

1. When the API is available, power on your control plane NUCs:

   You will see the following output from the above command:

   __NOTE:__ If you are on a 13" MacBook Pro like me, this will take a while.  Be patient.

   ```bash
   INFO API v1.20.0-1085+01c9f3f43ffcf0-dirty up     
   INFO Waiting up to 30m0s for bootstrapping to complete... 
   ```

   __Now, power on your NUCs to start the cluster installation.__

   If you want to watch bootstrap logs:

   In yet another terminal...

   ```bash
   export SUB_DOMAIN=dev
   ssh core@okd4-bootstrap.${SUB_DOMAIN}.${LAB_DOMAIN} "journalctl -b -f -u release-image.service -u bootkube.service"
   ```

   Or, to monitor the logs from one of the control plane nodes:

   ```bash
   export SUB_DOMAIN=dev
   ssh core@okd4-master-0.${SUB_DOMAIN}.${LAB_DOMAIN} "journalctl -b -f -u release-image.service -u bootkube.service"
   ```

1. Enable Hyper-Threading on the control plane nodes:

   By default, Fedora CoreOS will disable SMT on processors which are vulnerable to side channel attacks.  Since we are on a private cloud, we are less concerned about that, and could really use those extra cpus.

   So, let's enable SMT.

   1. Make sure that all of the control plane nodes are up and installing:

      ```bash
      export KUBECONFIG="${OKD_LAB_PATH}/okd-install-dir/auth/kubeconfig"
      oc get nodes
      ```

      You should see all three master nodes in a READY state.  If they are not there yet, wait a bit longer.

   1. Modify the kernel arguments to enable SMT on the next boot:

   ```bash
   export SUB_DOMAIN=dev

   for i in 0 1 2
   do
     ssh core@okd4-master-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} "sudo rpm-ostree kargs --replace=\"mitigations=auto,nosmt=auto\""
   done
   ```

   1. Stagger a reboot of the nodes:

   ```bash
   for i in 0 1 2
   do
     ssh core@okd4-master-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} "sudo systemctl reboot"
   sleep 5
   done
   ```

1. Now, wait patiently for the bootstrap process to complete:

   You will see the following, when the bootstrap is complete:

   ```bash
   INFO Waiting up to 20m0s for the Kubernetes API at https://api.okd4.dev.my.awesome.lab:6443... 
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
   export SUB_DOMAIN=dev
   destroyNodes.sh -b -d=${SUB_DOMAIN}
   ```

   This script shuts down and then deletes the Bootstrap VM.  Then it removes the bootstrap entries from the HA Proxy configuration.

1. Monitor the installation process:

   ```bash
   openshift-install --dir=${OKD_LAB_PATH}/okd-install-dir wait-for install-complete --log-level debug
   ```

1. Installation Complete:

   ```bash
   DEBUG Cluster is initialized                       
   INFO Waiting up to 10m0s for the openshift-console route to be created... 
   DEBUG Route found in openshift-console namespace: console 
   DEBUG OpenShift console route is admitted          
   INFO Install complete!                            
   INFO To access the cluster as the system:admin user when using 'oc', run 'export KUBECONFIG=/Users/yourhome/okd-lab/okd-install-dir/auth/kubeconfig' 
   INFO Access the OpenShift web-console here: https://console-openshift-console.apps.okd4.dev.my.awesome.lab 
   INFO Login to the console with user: "kubeadmin", and password: "AhnsQ-CGRqg-gHu2h-rYZw3" 
   DEBUG Time elapsed per stage:                      
   DEBUG Cluster Operators: 13m49s                    
   INFO Time elapsed: 13m49s
   ```

__[OpenShift Post Install Tasks](/home-lab/post-install-okd/)__
