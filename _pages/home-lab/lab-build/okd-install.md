---
permalink: /home-lab/install-okd-lab/
title: Installing OpenShift
description: Installing UPI OpenShift on Intel NUC with OKD
tags:
  - openshift install
  - okd install
  - kubernetes install
  - kvm
---
__Note:__ This is part of a series.  Make sure you started here: [Building a Portable Kubernetes Home Lab with OpenShift - OKD4](/home-lab/lab-intro/)

## We are now ready to fire up our OpenShift cluster

1. Deploy the configuration in preparation for the install:

   ```bash
   labcli --deploy -c -d=dev
   ```

1. Disconnect the lab domain from the internet:

   ```bash
   labcli --disconnect -d=dev
   ```

1. Start the bootstrap node:

   ```bash
   labcli --start -b -d=dev
   ```

1. __KVM Based Control-Plane:__

   Start the control-plane nodes:

   ```bash
   labcli --start -m -d=dev
   ```

1. __Bare Metal Cluster or SNO:__

   Hit the power button on the control-plane NUCs

1. Monitor the bootstrap process:

   ```bash
   labcli --monitor -b -d=dev
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
   labcli --destroy -b -d=dev
   ```

   This script shuts down and then deletes the Bootstrap VM.  Then it removes the bootstrap entries from the HA Proxy configuration.

1. Monitor the installation process:

   ```bash
   labcli --monitor -i -d=dev
   ```

1. Fix for a stuck MCO

   In some recent versions of OKD, the Machine Config Operator cannot complete the installation because it is looking for a non-existent machine config.

   See: [https://github.com/openshift/okd/issues/963](https://github.com/openshift/okd/issues/963)

   ```bash
   labenv -k
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

1. Post Install:

   ```bash
   labcli --post -d=dev
   ```

1. Add Users:

   Add a cluster-admin user:

   __Note:__ You can ignore the warning: `Warning: User 'admin' not found`

   ```bash
   labcli --user -i -a -u=admin -d=dev
   ```

   Add a non-privileged user:

   ```bash
   labcli --user -u=devuser -d=dev
   ```

## Grow Your Lab

### Add Worker Nodes

[Add worker nodes to OpenShift cluster with OKD](/home-lab/add-worker-nodes/)

### Add Ceph Storage Provisioner

[Install Ceph Storage with Rook](/home-lab/install-rook-ceph/)
