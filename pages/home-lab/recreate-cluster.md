---
title: Recreate Your Cluster
layout: page
permalink: /home-lab/recreate-cluster/
description: Tear down openshift cluster for reinstall
---

There will be times when you want to wipe your whole environment and rebuild it fresh.  I have provided an easy way to accomplish that.

There is a single script that will completely wipe the cluster and reset HA Proxy on the router for a new cluster.

1. You will need to have all of your nodes listed in a single inventory file.  For example, if you have followed this guide and built a cluster with 3 master and 3 worker nodes.  Then you have two node inventory files.  `node-inventory`, and `worker-inventory`.

   Let's consolidate them into a single file.

   ```bash
   cat ${OKD_LAB_PATH}/node-inventory | grep -v bootstrap > ${OKD_LAB_PATH}/cluster-inventory
   cat ${OKD_LAB_PATH}/worker-inventory >> ${OKD_LAB_PATH}/cluster-inventory
   ```

   Remember, we already destroyed the Bootstrap node.

1. Now, tear down the cluster and delete it's resources:

   ```bash
   destroyCluster.sh -i=${OKD_LAB_PATH}/cluster-inventory -c=1 
   ```

In a matter of moments, the cluster will be completely gone.

Now, to recreate the cluster, first make any changes that you want to your node-inventory file.

1. For example, if you are build a 3 node cluster and want to add storage for Rook/Ceph, then your inventory might look like:

   ```bash
   cat << EOF > ${OKD_LAB_PATH}/node-inventory
   kvm-host01,okd4-bootstrap,12288,4,50,0,bootstrap
   kvm-host01,okd4-master-0,20480,6,100,200,master
   kvm-host01,okd4-master-1,20480,6,100,200,master
   kvm-host01,okd4-master-2,20480,6,100,200,master
   EOF
   ```

1. Now, create the OpenShift manifests and create the Virtual Machines:

   ```bash
   ${OKD_LAB_PATH}/bin/initCluster.sh -i=${OKD_LAB_PATH}/node-inventory -c=1
   ```

1. Finally, follow the directions here: [Installing OpenShift](/home-lab/install-okd/).
