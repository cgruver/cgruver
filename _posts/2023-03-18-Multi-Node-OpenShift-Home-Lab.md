---
title: "From Single Node to Multi-Node - Building a Resilient OpenShift Home Lab"
date:   2023-03-18 00:00:00
description: "Building a 3 Node OpenShift Home Lab"
tags:
  - OpenShift Home Lab
  - Kubernetes Home Lab
  - OpenShift on Intel NUC
categories:
  - Blog Post
---
In this post, we are going to tear down the single node cluster that we built last time and replace it with a three node cluster.  The single node cluster is great for maximizing your compute capabilities on edge type hardware such as the Intel NUC.  However, you give up a lot of the resiliency that Kubernetes was designed for.  Building a three node cluster will allow you to explore the resilient capabilities of Kubernetes and OpenShift.

So, if you've always wanted to explore the wonderful world of pod affinity, anti-affinity, node selectors, taints, tolerations, zero downtime updates, and so much more...  Then continue on.  You'll have fun, I promise.

__Note:__ This post assumes that you have completed the previous post: [Back To Where It All Started - Let’s Build an OpenShift Home Lab](/blog%20post/2023/03/06/Back-To-Where-It-All-Started.html)

If you have not, then you should complete all of the steps up through this point: [Set Up KVM Host](/blog%20post/2023/03/06/Back-To-Where-It-All-Started.html#set-up-kvm-host)

Once you have installed CentOS Stream on your KVM host, then return here.

## Tear Down The Single Node Cluster

If you have deployed a single node cluster, the first thing that we need to do is tear it down.  My lab cli can perform that service for you.

```bash
labcli --destroy -c -d=dev
```

Update the `labcli` scripts.  I may have fixed a couple of bugs between now and the last post.

```bash
WORK_DIR=$(mktemp -d)
git clone https://github.com/cgruver/kamarotos.git ${WORK_DIR}
cp ${WORK_DIR}/bin/* ${HOME}/okd-lab/bin
chmod 700 ${HOME}/okd-lab/bin/*
cp -r ${WORK_DIR}/examples ${HOME}/okd-lab/lab-config
rm -rf ${WORK_DIR}
```

Once the previous cluster is cleaned up, we can prepare the environment for building a new cluster.

I have prepared an example for you to use.  So, the next step is to setup the environment.

```bash
cp ${HOME}/okd-lab/lab-config/examples/basic-lab-3-node.yaml ${HOME}/okd-lab/lab-config
cp ${HOME}/okd-lab/lab-config/examples/cluster-configs/3-node-no-pi.yaml ${HOME}/okd-lab/lab-config/cluster-configs
```

```bash
ln -sf ${HOME}/okd-lab/lab-config/basic-lab-3-node.yaml ${HOME}/okd-lab/lab-config/lab.yaml
```

This command effectively replaced the lab configuration file for single node OpenShift with a configuration for 3 nodes.

### Review the new configuration

1. Your lab domain will be:

   `my.awesome.lab`

1. Your lab network will be:

   `10.11.12.0/24`

1. These settings are in: `${HOME}/okd-lab/lab-config/lab.yaml`

   ```yaml
   domain: my.awesome.lab
   network: 10.11.12.0
   router-ip: 10.11.12.1
   netmask: 255.255.255.0
   centos-mirror: rsync://mirror.facebook.net/centos-stream/
   sub-domain-configs: []
   cluster-configs:
     - name: dev
       cluster-config-file: 3-node-no-pi.yaml
       domain: edge
   ```

1. The configuration file for your OpenShift cluster is in: `${HOME}/okd-lab/lab-config/cluster-configs/3-node-no-pi.yaml

   ```yaml
   cluster:
     name: okd4
     cluster-cidr: 10.88.0.0/14
     service-cidr: 172.20.0.0/16
     remote-registry: quay.io/openshift/okd
     butane-version: v0.16.0
     butane-spec-version: 1.4.0
     butane-variant: fcos
     ingress-ip-addr: 10.11.12.2
   bootstrap:
     metal: false
     node-spec:
       memory: 12288
       cpu: 4
       root-vol: 50
     kvm-host: kvm-host01
     ip-addr: 10.11.12.49
   control-plane:
     metal: false
     node-spec:
       memory: 20480
       cpu: 8
       root-vol: 100
     ceph:
       ceph-dev: sdb
       ceph-vol: 200
       type: disk
     okd-hosts:
       - kvm-host: kvm-host01
         ip-addr: 10.11.12.60
       - kvm-host: kvm-host01
         ip-addr: 10.11.12.61
       - kvm-host: kvm-host01
         ip-addr: 10.11.12.62
   kvm-hosts:
     - host-name: kvm-host01
       mac-addr: "YOUR_HOST_MAC_HERE"
       ip-addr: 10.11.12.200
       disks:
         disk1: nvme0n1
         disk2: NA
   ```

   __Note:__ You will need to replace `YOUR_HOST_MAC_HERE` with the MAC address of your server.

## We are now ready to deploy our Three Node OpenShift cluster

__Note:__ These instructions are pretty much identical to the single node cluster that we installed in the last post.  The configuration files have taken care of the three node set up for you.

1. Set the lab environment variables:

   ```bash
   labctx dev
   ```

1. Pull the latest release binaries for OKD:

   ```bash
   labcli --latest
   ```

1. Deploy the configuration in preparation for the install:

   ```bash
   labcli --deploy -c
   ```

   This command does a lot of work for you.

   * Creates the OpenShift install manifests
   * Uses the `butane` cli to inject custom configurations into the ignition configs for the three cluster nodes
   * Creates the appropriate DNS entries and network configuration
   * Prepares the iPXE boot configuration for each cluster node
   * Configures Nginx on the router as the ingress load balancer for your cluster

1. Start the bootstrap node:

   ```bash
   labcli --start -b
   ```

1. Start the control-plane nodes:

   ```bash
   labcli --start -m
   ```

1. Monitor the bootstrap process:

   ```bash
   labcli --monitor -b
   ```

   __Note:__ This command does not affect the install process.  You can stop and restart it safely.  It is just for monitoring the bootstrap.

   __Also Note:__ It will take a while for this command to stop throwing connection errors.  You are effectively waiting for the bootstrap node to install its OS and start the bootstrap process.  Be patient, and don't worry.

   If you want to watch logs for issues:

   ```bash
   labcli --monitor -j
   ```

   This command tails the journal log on the bootstrap node.

1. You will see the following, when the bootstrap is complete:

   ```bash
   DEBUG Still waiting for the Kubernetes API: Get "https://api.okd4.my.awesome.lab:6443/version": read tcp 10.11.12.227:49643->10.11.12.2:6443: read: connection reset by peer - error from a previous attempt: read tcp 10.11.12.227:49642->10.11.12.2:6443: read: connection reset by peer 
   INFO API v1.25.0-2786+eab9cc98fe4c00-dirty up     
   DEBUG Loading Install Config...                    
   DEBUG   Loading SSH Key...                         
   DEBUG   Loading Base Domain...                     
   DEBUG     Loading Platform...                      
   DEBUG   Loading Cluster Name...                    
   DEBUG     Loading Base Domain...                   
   DEBUG     Loading Platform...                      
   DEBUG   Loading Networking...                      
   DEBUG     Loading Platform...                      
   DEBUG   Loading Pull Secret...                     
   DEBUG   Loading Platform...                        
   DEBUG Using Install Config loaded from state file  
   INFO Waiting up to 30m0s (until 10:06AM) for bootstrapping to complete... 
   DEBUG Bootstrap status: complete                   
   INFO It is now safe to remove the bootstrap resources 
   DEBUG Time elapsed per stage:                      
   DEBUG Bootstrap Complete: 17m10s                   
   DEBUG                API: 4m9s                     
   INFO Time elapsed: 17m10s                         
   ```

1. When the bootstrap process is complete, remove the bootstrap node:

   ```bash
   labcli --destroy -b
   ```

   This script shuts down and then deletes the Bootstrap VM.  Then it removes the bootstrap entries from the DNS and network configuration.

1. Monitor the installation process:

   ```bash
   labcli --monitor -i
   ```

   __Note:__ This command does not affect to install process.  You can stop and restart it safely.  It is just for monitoring.

1. Installation Complete:

   ```bash
   DEBUG Cluster is initialized                       
   INFO Waiting up to 10m0s for the openshift-console route to be created... 
   DEBUG Route found in openshift-console namespace: console 
   DEBUG OpenShift console route is admitted          
   INFO Install complete!                            
   INFO To access the cluster as the system:admin user when using 'oc', run 'export KUBECONFIG=/Users/yourhome/okd-lab/okd-install-dir/auth/kubeconfig' 
   INFO Access the OpenShift web-console here: https://console-openshift-console.apps.okd4.my.awesome.lab 
   INFO Login to the console with user: "kubeadmin", and password: "AhnsQ-CGRqg-gHu2h-rYZw3" 
   DEBUG Time elapsed per stage:                      
   DEBUG Cluster Operators: 13m49s                    
   INFO Time elapsed: 13m49s
   ```

## Post Install

1. Post Install Cleanup:

   ```bash
   labcli --post
   ```

1. Trust the cluster certificates:

   ```bash
   labcli --trust -c
   ```

1. Add Users:

   __Note:__ Make sure that the htpasswd command is installed on your system.  It should be included by default on Mac OS.  For Fedora, RHEL, or CentOS: `dnf install httpd-tools`

   Add a cluster-admin user:

   ```bash
   labcli --user -i -a -u=admin
   ```

   __Note:__ You can ignore the warning: `Warning: User 'admin' not found`

   Add a non-privileged user:

   ```bash
   labcli --user -u=devuser
   ```

   __Note:__ It will take a couple of minutes for the `authentication` services to restart after you create these user accounts.

   __Note:__ This deletes the temporary `kubeadmin` account.  Your `admin` user will now have cluster admin rights.

## Install The Rook/Ceph Operator as a storage Provisioner

In the single node cluster build, we used the host path provisioner for storage.  This works fine on a single node because we don't have to worry about where pods get scheduled relative to their storage.  In a multi node cluster, however we need a storage provisioner that is able to serve pods regardless of which node they get scheduled on.

I have prepared an opinionated install of the Rook operator and a Ceph storage cluster.  Your OpenShift nodes were created with an additional block device attached to the virtual machines.  We'll use those devices as the underpinnings of a Ceph storage cluster.

Execute the following to install the Ceph cluster and create a storage class.  You will also create a PVC for the internal image registry.

1. Install the Rook Operator:

   ```bash
   labcli --ceph -i
   ```

1. Create a Ceph cluster:

   ```bash
   labcli --ceph -c
   ```

1. Wait for the Ceph cluster to complete its install:

   __Note:__ This will take a good while to complete.

   You can watch for the cluster to be complete by looking for the completion of the OSD preparation jobs.

   ```bash
   watch oc get jobs -n rook-ceph
   ```

   When you see all three jobs completed, then the install is done:

   ```bash
   NAME                                                 COMPLETIONS   DURATION   AGE
   rook-ceph-osd-prepare-okd4-master-0.my.awesome.lab   1/1           17s        4m9s
   rook-ceph-osd-prepare-okd4-master-1.my.awesome.lab   1/1           17s        4m8s
   rook-ceph-osd-prepare-okd4-master-2.my.awesome.lab   1/1           18s        4m8s
   ```

1. Create a PVC for the internal image registry:

   ```bash
   labcli --ceph -r
   ```

Verify that the internal image registry has a bound PVC:

1. Log into your cluster:

   ```bash
   oc login -u admin https://api.okd4.my.awesome.lab:6443
   ```

   __Note:__ Use the `admin` password for the user that you created above.

1. Check the PV that was created:

   ```bash
   oc get pv
   ```

   ```bash
   NAME                                       CAPACITY   ACCESS MODES   RECLAIM POLICY   STATUS   CLAIM                                   STORAGECLASS      REASON   AGE
   pvc-e6063131-f362-4c42-8adf-798d8cb9267b   100Gi      RWO            Delete           Bound    openshift-image-registry/registry-pvc   rook-ceph-block            97s
   ```

That's it!

Have fun with OpenShift
