---
layout: page
permalink: /home-lab/install-okd/
title: Installing OpenShift
---

## We are now ready to fire up our OpenShift cluster

1. Start the nodes:

   ```bash
   StartCluster.sh -i=${OKD_LAB_PATH}/node-inventory -c=1
   ```

1. Monitor the bootstrap process:

   ```bash
   openshift-install --dir=${OKD_LAB_PATH}/okd-install-dir wait-for bootstrap-complete --log-level debug
   ```

   __Note:__ This command does not affect to install process.  You can stop and restart it safely.  It is just for monitoring the bootstrap.

1. You will see the following, when the bootstrap is complete:

   ```bash
   INFO Waiting up to 20m0s for the Kubernetes API at https://api.okd4.dc1.my.awesome.lab:6443... 
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
   export KUBECONFIG="${OKD_LAB_PATH}/okd-install-dir/auth/kubeconfig"
   DestroyBootstrap.sh -i=${OKD_LAB_PATH}/node-inventory -c=1
   ```

   This script shuts down and then deletes the Bootstrap VM.  Then it removes the bootstrap entries from the HA Proxy configuration.

1. Because our install is disconnected from the internet, we need to disable the Operator Marketplace:

   ```bash
   oc patch OperatorHub cluster --type json -p '[{"op": "add", "path": "/spec/sources/0/disabled", "value": true}]'
   ```

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
   INFO Access the OpenShift web-console here: https://console-openshift-console.apps.okd4.dc1.my.awesome.lab 
   INFO Login to the console with user: "kubeadmin", and password: "AhnsQ-CGRqg-gHu2h-rYZw3" 
   DEBUG Time elapsed per stage:                      
   DEBUG Cluster Operators: 13m49s                    
   INFO Time elapsed: 13m49s
   ```

1. Create an empty volume for the internal registry:

   ```bash
   oc patch configs.imageregistry.operator.openshift.io cluster --type merge --patch '{"spec":{"managementState":"Managed","storage":{"emptyDir":{}}}}'
   ```

1. Create an Image Pruner:

   ```bash
   oc patch imagepruners.imageregistry.operator.openshift.io/cluster --type merge -p '{"spec":{"schedule":"0 0 * * *","suspend":false,"keepTagRevisions":3,"keepYoungerThan":60,"resources":{},"affinity":{},"nodeSelector":{},"tolerations":[],"startingDeadlineSeconds":60,"successfulJobsHistoryLimit":3,"failedJobsHistoryLimit":3}}'
   ```

1. Delete all of the Completed pods:

   ```bash
   oc delete pod –field-selector=status.phase==Succeeded
   ```

1. Install is Complete!!!

### Log into your new cluster console

Point your browser to the url listed at the completion of install: `https://console-openshift-console.apps.okd4.dc1.my.awesome.lab`

You will have to accept the TLS certs for your new cluster.

Log in as `kubeadmin` with the password from the output at the completion of the install.

__If you forget the password for this initial account, you can find it in the file:__ `${OKD_LAB_PATH}/okd-install-dir/auth/kubeadmin-password`
