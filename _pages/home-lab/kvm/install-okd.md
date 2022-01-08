---
permalink: /home-lab/install-okd/
title: Installing OpenShift
description: Installing UPI OpenShift on Intel NUC with OKD
tags:
  - openshift install
  - okd install
  - kubernetes install
  - kvm
---

## We are now ready to fire up our OpenShift cluster

1. Select the Lab subdomain that you want to work with:

   ```bash
   labctx
   ```

1. Start the nodes:

   ```bash
   startNodes.sh -b -d=${SUB_DOMAIN}
   startNodes.sh -m -d=${SUB_DOMAIN}
   ```

1. Monitor the bootstrap process:

   ```bash
   openshift-install --dir=${OKD_LAB_PATH}/okd-install-dir wait-for bootstrap-complete --log-level debug
   ```

   __Note:__ This command does not affect to install process.  You can stop and restart it safely.  It is just for monitoring the bootstrap.

   If you want to watch logs for issues:

   ```bash
   ssh core@okd4-bootstrap.${SUB_DOMAIN}.${LAB_DOMAIN} "journalctl -b -f -u release-image.service -u bootkube.service"
   ```

1. You will see the following, when the bootstrap is complete:

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
   destroyNodes.sh -b -d=${SUB_DOMAIN}
   ```

   This script shuts down and then deletes the Bootstrap VM.  Then it removes the bootstrap entries from the HA Proxy configuration.

1. Monitor the installation process:

   ```bash
   openshift-install --dir=${OKD_LAB_PATH}/okd-install-dir wait-for install-complete --log-level debug
   ```

1. Fix for a stuck MCO

   In some recent versions of OKD, the Machine Config Operator cannot complete the installation because it is looking for a non-existent machine config.

   See: [https://github.com/openshift/okd/issues/963](https://github.com/openshift/okd/issues/963)

   ```bash
   export KUBECONFIG="${OKD_LAB_PATH}/okd-install-dir/auth/kubeconfig"
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
   INFO Access the OpenShift web-console here: https://console-openshift-console.apps.okd4.dev.my.awesome.lab 
   INFO Login to the console with user: "kubeadmin", and password: "AhnsQ-CGRqg-gHu2h-rYZw3" 
   DEBUG Time elapsed per stage:                      
   DEBUG Cluster Operators: 13m49s                    
   INFO Time elapsed: 13m49s
   ```

__[OpenShift Post Install Tasks](/home-lab/post-install-okd/)__
