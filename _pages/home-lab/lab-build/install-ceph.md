---
title: Install Ceph Storage with Rook
permalink: /home-lab/install-rook-ceph/
description: How to install Rook Ceph on OpenShift with OKD
tags:
  - rook ceph
  - disconnected install
  - podman on openwrt
---
## Refactor To Use The Lab CLI - The Original Instructions are Below

1. Make sure that you have `podman` installed on your workstation.

   Mac OS:

   ```bash
   brew install podman
   podman machine init
   podman machine start
   ```

1. Mirror Ceph Images

   ```bash
   labcli --ceph -m
   ```

1. Install Rook Operator:

   ```bash
   labcli --ceph -i
   ```

1. Create the Ceph cluster:

   ```bash
   labcli --ceph -c
   ```

1. Configure the internal image registry for a Ceph PVC

   ```bash
   labcli --ceph -r
   ```

## Original Instructions

Ideally, you need a full cluster for this deployment; 3 master and 3 worker nodes.  Additionally, you need to give the worker nodes a second disk that will be used by Ceph.  If you followed the guide for adding working nodes here; [Add Worker Nodes](/home-lab/worker-nodes/), then you are good to proceed.  If not, you will need to recreate your cluster and add a second drive to the three dual role, master/worker nodes.

If you need to recreate your cluster to add disks for Ceph, follow these instructions: [Destroy and Recreate your Cluster](/home-lab/recreate-cluster/).

Follow these steps to deploy a Ceph cluster:

### Initial setup for Ceph install

The first thing that we are going to do is mirror the Rook Operator and Ceph Storage images into Nexus.  Remember, our cluster is isolated from the internet.  If this were a "real" data center, we would run security scans on the images before releasing them to be ingested by applications in our cluster.  In a future post, we will actually do that.  We'll set up a two stage process to validate that images are safe to run in our data center.  But, more on that later...

1. Make sure that you have `podman` installed on your workstation.

   Mac OS:

   ```bash
   brew install podman
   podman machine init
   podman machine start
   ```

1. Pull the Rook and Ceph images so that we can mirror them to Nexus:

   ```bash
   podman pull  quay.io/cephcsi/cephcsi:v3.5.1
   podman pull  k8s.gcr.io/sig-storage/csi-node-driver-registrar:v2.5.0
   podman pull  k8s.gcr.io/sig-storage/csi-resizer:v1.4.0
   podman pull  k8s.gcr.io/sig-storage/csi-provisioner:v3.1.0
   podman pull  k8s.gcr.io/sig-storage/csi-snapshotter:v5.0.1
   podman pull  k8s.gcr.io/sig-storage/csi-attacher:v3.4.0
   podman pull  docker.io/rook/ceph:v1.8.7
   podman pull  quay.io/ceph/ceph:v16.2.7
   ```

1. Select the Lab subdomain that you want to work with:

   ```bash
   labctx
   ```

1. Tag the images for Nexus:

   ```bash
   LOCAL_REGISTRY=$(yq e ".local-registry" ${OKD_LAB_PATH}/lab-config/${SUB_DOMAIN}-cluster.yaml)

   podman tag quay.io/cephcsi/cephcsi:v3.5.1 ${LOCAL_REGISTRY}/cephcsi/cephcsi:v3.5.1
   podman tag k8s.gcr.io/sig-storage/csi-node-driver-registrar:v2.5.0 ${LOCAL_REGISTRY}/sig-storage/csi-node-driver-registrar:v2.5.0
   podman tag k8s.gcr.io/sig-storage/csi-resizer:v1.4.0 ${LOCAL_REGISTRY}/sig-storage/csi-resizer:v1.4.0
   podman tag k8s.gcr.io/sig-storage/csi-provisioner:v3.1.0 ${LOCAL_REGISTRY}/sig-storage/csi-provisioner:v3.1.0
   podman tag k8s.gcr.io/sig-storage/csi-snapshotter:v5.0.1 ${LOCAL_REGISTRY}/sig-storage/csi-snapshotter:v5.0.1
   podman tag k8s.gcr.io/sig-storage/csi-attacher:v3.4.0 ${LOCAL_REGISTRY}/sig-storage/csi-attacher:v3.4.0
   podman tag docker.io/rook/ceph:v1.8.7 ${LOCAL_REGISTRY}/rook/ceph:v1.8.7
   podman tag quay.io/ceph/ceph:v16.2.7 ${LOCAL_REGISTRY}/ceph/ceph:v16.2.7
   ```

1. Log into Nexus:

   ```bash
   podman login -u openshift-mirror ${LOCAL_REGISTRY}
   ```

1. Push the images: (The `--tls-verify` is for Mac users.  It's not ideal, but it works.)

   ```bash
   podman push ${LOCAL_REGISTRY}/cephcsi/cephcsi:v3.5.1 --tls-verify=false
   podman push ${LOCAL_REGISTRY}/sig-storage/csi-node-driver-registrar:v2.5.0 --tls-verify=false
   podman push ${LOCAL_REGISTRY}/sig-storage/csi-resizer:v1.4.0 --tls-verify=false
   podman push ${LOCAL_REGISTRY}/sig-storage/csi-provisioner:v3.1.0 --tls-verify=false
   podman push ${LOCAL_REGISTRY}/sig-storage/csi-snapshotter:v5.0.1 --tls-verify=false
   podman push ${LOCAL_REGISTRY}/sig-storage/csi-attacher:v3.4.0 --tls-verify=false
   podman push ${LOCAL_REGISTRY}/rook/ceph:v1.8.7 --tls-verify=false
   podman push ${LOCAL_REGISTRY}/ceph/ceph:v16.2.7 --tls-verify=false
   ```

1. Clean up after yourself and log off the bastion host:

   Remove the images so that we don't fill up `tmpfs`

   ```bash
   podman image rm -a
   ```

1. If you are on a Mac like me, the stop the podman VM:

   ```bash
   podman machine stop
   ```

### Now we are ready to install Ceph

1. If you haven't pulled a recent copy of my companion project to this blog.  Do that now.  We need the Ceph manifests:

   The companion project is located at: [https://github.com/cgruver/okd-home-lab](https://github.com/cgruver/okd-home-lab).  You cloned it during the cluster setup, so it should still be located at: `${OKD_LAB_PATH}/okd-home-lab`

   ```bash
   cd ${OKD_LAB_PATH}/okd-home-lab
   git fetch
   git pull
   ```

   The Ceph installation files, located in `${OKD_LAB_PATH}/okd-home-lab/rook-ceph/install`, are modified from the project at [https://github.com/rook/rook](https://github.com/rook/rook).

1. Next, we need to label our nodes so that Ceph knows where to deploy.  If you look at the cluster.yml file, you will see the `nodeAffinity` configuration.

   If you created worker nodes by following this guide, [Add Worker Nodes](/home-lab/worker-nodes/), then set the following variable:

   ```bash
   export CEPH_NODE=worker
   ```

   If you are using a three node cluster as mentioned above, then set this:

   ```bash
   export CEPH_NODE=master
   ```

   Add a label to the nodes that are going to host Ceph:

   ```bash
   oc login -u admin https://api.okd4.${SUB_DOMAIN}.${LAB_DOMAIN}:6443
   
   for i in 0 1 2
   do
         oc label nodes okd4-${CEPH_NODE}-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} role=storage-node
   done
   ```

1. Create the Ceph Namspace, CRDs, and Roles:

   ```bash
   oc apply -f ${OKD_LAB_PATH}/okd-home-lab/rook-ceph/install/crds.yaml
   oc apply -f ${OKD_LAB_PATH}/okd-home-lab/rook-ceph/install/common.yaml
   oc apply -f ${OKD_LAB_PATH}/okd-home-lab/rook-ceph/install/rbac.yaml
   ```

1. Deploy the Ceph Operator:

   ```bash
   export REGION=${SUB_DOMAIN}
   export PROXY_REGISTRY=$(yq e ".proxy-registry" ${OKD_LAB_PATH}/lab-config/${SUB_DOMAIN}-cluster.yaml)
   envsubst < ${OKD_LAB_PATH}/okd-home-lab/rook-ceph/install/operator-openshift.yaml | oc apply -f -
   ```

   __Wait for the Operator pod to completely deploy before executing the next step.__

1. Deploy the Ceph cluster:

   ```bash
   envsubst < ${OKD_LAB_PATH}/okd-home-lab/rook-ceph/install/cluster.yaml | oc apply -f -
   ```

   __This will take a while to complete.__  

   It is finished when you see all of the `rook-ceph-osd-prepare-okd4-...` pods in a `Completed` state.

   ```bash
   oc get pods -n rook-ceph | grep rook-ceph-osd-prepare
   ```

1. __If you have worker nodes and designated the control plane as Infra nodes:__

   If you followed this guide here: [Add Worker Nodes](/home-lab/worker-nodes/)

   Then we also need to allow pods that run on the control plane nodes to access Ceph volumes.

   Add the following patch to your Ceph cluster:

   ```bash
   oc patch configmap rook-ceph-operator-config -n rook-ceph --type merge --patch '"data": {"CSI_PLUGIN_TOLERATIONS": "- key: \"node-role.kubernetes.io/master\"\n  operator: \"Exists\"\n  effect: \"NoSchedule\"\n"}'
   ```

### Now, let's create a PVC for the Image Registry.

1. First, we need a Storage Class:

   ```bash
   oc apply -f ${OKD_LAB_PATH}/okd-home-lab/rook-ceph/configure/ceph-storage-class.yml
   ```

1. Now create the PVC:

   ```bash
   oc apply -f ${OKD_LAB_PATH}/okd-home-lab/rook-ceph/configure/registry-pvc.yml
   ```

1. Now, patch the `imageregistry` operator to use the PVC that you just created:

   If you previously added `emptyDir` as a storage type to the Registry, you need to remove it first:

   ```bash
   oc patch configs.imageregistry.operator.openshift.io cluster --type json -p '[{ "op": "remove", "path": "/spec/storage/emptyDir" }]'
   ```

   Now patch it to use the new PVC:

   ```bash
   oc patch configs.imageregistry.operator.openshift.io cluster --type merge --patch '{"spec":{"rolloutStrategy":"Recreate","managementState":"Managed","storage":{"pvc":{"claim":"registry-pvc"}}}}'
   ```

1. Make sure that the PVC gets bound to a new PV:

   ```bash
   oc get pvc -n openshift-image-registry
   ```

   You should see output similar to:

   ```bash
   NAME           STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS      AGE
   registry-pvc   Bound    pvc-bcee4ccd-aa6e-4c8c-89b0-3f8da1c17df0   100Gi      RWO            rook-ceph-block   4d17h
   ```

1. If you want to designate your new storage class as the `default` storage class, the do the following:

   ```bash
   oc patch storageclass rook-ceph-block -p '{"metadata": {"annotations":{"storageclass.kubernetes.io/is-default-class":"true"}}}'
   ```

__You just created a Ceph cluster and bound your image registry to a Persistent Volume!__
