---
title: Recreate Your Cluster
permalink: /home-lab/recreate-cluster/
description: Tear down openshift cluster for reinstall
---

There will be times when you want to wipe your whole environment and rebuild it fresh.  I have provided an easy way to accomplish that.

There is a single script that will completely wipe the cluster and reset HA Proxy on the router for a new cluster.

1. Tear down the cluster and delete it's resources:

   Remember, we already destroyed the Bootstrap node.

   ```bash
   destroyNodes.sh -r -d=${SUB_DOMAIN}
   ```

In a matter of moments, the cluster will be completely gone.

Now, to recreate the cluster, first make any changes that you want to your cluster configuration YAML file.

1. For example, if you are building a 3 node cluster and want to add storage for Rook/Ceph, then your cluster configuration might look like:

   ```yaml
   cluster-name: okd4
   secret-file: ${OKD_LAB_PATH}/pull_secret.json
   local-registry: nexus.${LAB_DOMAIN}:5001
   remote-registry: quay.io/openshift/okd
   # KVM Hosts provisioned in the region
   kvm-hosts:
     - host-name: kvm-host01
       mac-addr: 1c:69:7a:6f:ef:56
       ip-octet: 200
       disks:
         disk1: nvme0n1
         disk2: NA
   # Bootstrap Node configuration
   bootstrap:
       kvm-host: kvm-host01
       memory: 12288
       cpu: 4
       root_vol: 50
   # Master Node configuraion
   control-plane:
       memory: 20480
       cpu: 6
       root_vol: 100
       ceph_vol: 200
       kvm-hosts:
       - kvm-host01
       - kvm-host01
       - kvm-host01
   ```

1. Now, create the OpenShift manifests and create the Virtual Machines:

   ```bash
   deployOkdNodes.sh -i -d=${SUB_DOMAIN}
   ```

1. Finally, follow the directions here: [Installing OpenShift](/home-lab/install-okd/).
