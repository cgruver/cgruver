---
title: Recreate Your Cluster
permalink: /home-lab/recreate-cluster/
description: Tear down openshift cluster for reinstall
---

There will be times when you want to wipe your whole environment and rebuild it fresh.  I have provided an easy way to accomplish that.

There is a single script that will completely wipe the cluster and reset HA Proxy on the router for a new cluster.

1. Select the Lab subdomain that you want to work with:

   ```bash
   labctx
   ```

1. Tear down the cluster and delete it's resources:

   Remember, we already destroyed the Bootstrap node.

   ```bash
   labcli --destroy -c
   ```

In a matter of moments, the cluster will be completely gone.

Now, to recreate the cluster, first make any changes that you want to your cluster configuration YAML file.


1. Reinstall The Cluster:

   Follow the directions here: [Installing OpenShift](/home-lab/install-okd-lab/){:target="_blank"}

1. Redeploy any Worker Nodes:

   Original Instructions Here: [Add Worker Nodes](/home-lab/add-worker-nodes/){:target="_blank"}

   ```bash
   labcli --deploy -w
   ```

1. Start The Worker Nodes:

   * KVM:

     ```bash
     labcli --start -w
     ```

   * Bare Metal - Hit the power button

1. Approve the CSRs:

   ```bash
   watch labcli --csr
   ```

   __Note:__ There will be 3 CSRs for each Worker Node

1. Configure control-plane nodes as Infrastructure nodes:

   ```bash
   labcli --config-infra
   ```
