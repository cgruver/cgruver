---
title: "Quarkus for Architects who Sometimes Write Code - Being Persistent - Part 01"
date:   2022-10-08 00:00:00 -0400
description: "Blog Series on writing Cloud Native Applications for OpenShift / Kubernetes with Quarkus - Cassandra and JSON"
tags:
  - OpenShift
  - Kubernetes
  - Quarkus Cassandra Stargate Example
  - K8ssandra Operator
  - Quarkus Mapstruct
  - Quarkus Lombok
  - Cassandra on Apple Silicon
categories:
  - Blog Post
  - Quarkus Series
---
__Note:__ This is part one of a two part post.  In this post we're going to set up a Cassandra persistence engine on OpenShift.  We'll be using Stargate as the API interface to Cassandra.

We're going to use the K8ssandra Operator to manage our cassandra cluster.

Check out the project here:

* [https://k8ssandra.io](https://k8ssandra.io){:target="_blank"}
* [https://github.com/k8ssandra](https://github.com/k8ssandra){:target="_blank"}

In the next post we'll get an introduction to the Stargate API, then we'll create a Quarkus micro-service to store and retrieve data with Cassandra and Stargate.

I have created this tutorial so that you can do everything in OpenShift Local, formerly known as Code Ready Containers.

## Install & Configure OpenShift Local

The first step, is to install OpenShift Local if you don't already have it.

1. Go To: [https://developers.redhat.com/products/openshift/overview](https://developers.redhat.com/products/openshift/overview){:target="_blank"}

   ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/install-openshift-local-entry.png)

1. Select `Install Red Hat OpenShift on your laptop`

   This will take you to a login page.  If you don't have a Red Hat developer account you will register for one here.  It's free and you'll get access to a lot of ebooks, guides, and tools.

1. From the landing page after you log in, you will need to download two things:

   1. Download the OpenShift Local installation package for your OS and architecture

   1. Download your pull secret.  This will give you access to all of the Operators in the Red Hat operator catalog.

   ![Download OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/download-openshift-local.png)

1. Install OpenShift Local with the installation package that you downloaded.

1. Open a terminal and prepare your workstation to run the cluster:

   ```bash
   crc setup
   ```

   __Note:__ This will take a while.  OpenShift Local will first download the latest cluster bundle, decompress it, and set up your system to run the cluster.

1. Configure your OpenShift Local cluster: __Note:__ You need at least 16GB of RAM on your workstation.  We're going to configure the OpenShift machine with 12GB.  

   ```bash
   crc config set memory 12288
   crc config set disk-size=100
   ```

1. Start the cluster:

   ```bash
   crc start
   ```

   __Note:__ You will be prompted for your Pull Secret here.  Copy and paste it into the terminal when prompted.

   ```bash
   INFO Checking if running as non-root              
   INFO Checking if crc-admin-helper executable is cached 
   INFO Checking for obsolete admin-helper executable 
   INFO Checking if running on a supported CPU architecture 
   INFO Checking minimum RAM requirements            
   INFO Checking if crc executable symlink exists    
   INFO Checking if running emulated on a M1 CPU     
   INFO Checking if vfkit is installed               
   INFO Checking if old launchd config for tray and/or daemon exists 
   INFO Checking if crc daemon plist file is present and loaded 
   INFO Loading bundle: crc_vfkit_4.11.3_arm64...    
   CRC requires a pull secret to download content from Red Hat.
   You can copy it from the Pull Secret section of https://console.redhat.com/openshift/create/local.
   ? Please enter the pull secret 
   ```

1. Paste your pull secret in the terminal and hit `return` / `Enter`

   __Note:__ You only have to enter the pull secret once.  Unless you run `crc cleanup`, it will be persisted with your install.

1. Wait for the cluster to start.  This will take a while the first time.

   ```bash
   INFO All operators are available. Ensuring stability... 
   INFO Operators are stable (2/3)...                
   INFO Operators are stable (3/3)...                
   INFO Adding crc-admin and crc-developer contexts to kubeconfig... 
   Started the OpenShift cluster.

   The server is accessible via web console at:
     https://console-openshift-console.apps-crc.testing

   Log in as administrator:
     Username: kubeadmin
     Password: JY2pF-sELmn-oc9R3-YYb6K

   Log in as user:
     Username: developer
     Password: developer

   Use the 'oc' command line interface:
     $ eval $(crc oc-env)
     $ oc login -u developer https://api.crc.testing:6443
   ```

1. Set your environment to interact with the running cluster:

   ```bash
   eval $(crc oc-env)
   ```

   __Note:__ If you ever need to retrieve the credentials to log in, run the following:

   ```bash
   crc console --credentials
   ```

   The output will show you how to login with the two pre-configured users:

   ```bash
   To login as a regular user, run 'oc login -u developer -p developer https://api.crc.testing:6443'.
   To login as an admin, run 'oc login -u kubeadmin -p FkIy7-LFYXG-PvYFZ-Ppp2G https://api.crc.testing:6443'
   ```

1. Log into the cluster:

   ```bash
   oc login -u kubeadmin -p <The Password For kubeadmin> https://api.crc.testing:6443
   ```

1. Launch the web console:

   ```bash
   crc console
   ```

   This will open your default browser at the OpenShift web console login page:

   ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/openshift-local-login.png)

1. Login as the `kubeadmin` user with the same password as above:

   ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/openshift-local-kubeadmin-login.png)

1. You should now see the OpenShift console landing page:

   ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/openshift-local-console.png)

We'll be using the CLI from the terminal to perform all of the next steps, but we'll use the web console to verify that everything is running.

## Note For Apple Silicon Users

If you are using `crc` version `2.9.0` there was a build error that resulted in a missing ARM64 image for the `routes-controller`.

__Note:__ This is fixed in version `2.10.1` and greater.

You can fix the error with the following:

1. Verify that `routes-controller` is in a `CrashLoopBackOff` state:

   ```bash
   oc get pod routes-controller -n openshift-ingress
   ```

   ```bash
   NAME                READY   STATUS             RESTARTS         AGE
   routes-controller   0/1     CrashLoopBackOff   86 (4m16s ago)   6h59m
   ```

1. Delete the `routes-controller` pod:

   ```bash
   oc delete pod routes-controller -n openshift-ingress
   ```

1. Delete the container image from the crc VM:

   ```bash
   export SSH_KEY=${HOME}/.crc/machines/crc/id_ecdsa   
   ssh -i ${SSH_KEY} -p 2222 core@127.0.0.1 "sudo podman image rm quay.io/crcont/routes-controller:latest"
   ```

1. Recreate the pod:

   ```bash
   cat << EOF | oc apply -n openshift-ingress -f -
   {"kind":"Pod","apiVersion":"v1","metadata":{"name":"routes-controller","namespace":"openshift-ingress","creationTimestamp":null},"spec":{"containers":[{"name":"routes-controller","image":"quay.io/crcont/routes-controller:latest","resources":{},"imagePullPolicy":"IfNotPresent"}],"serviceAccountName":"router"},"status":{}}
   EOF
   ```

## Install Cassandra and Stargate

Now we are going to install the `k8ssandra` operator.  I have prepared all of the images that you will need and placed them in my Quay.io account: [https://quay.io/user/cgruver0](https://quay.io/user/cgruver0){:target="_blank"}

__Note:__ I'm using my personal Quay.io account for two reasons:

1. Some of the images needed by `k8ssandra` are in Docker.io.  If things don't run smoothly during the install, you will encounter the Docker pull rate limitations.  Unless you have a paid Docker account, this will slow you down.

2. Some of you may be running on Apple silicon like I am.  I prepared this whole tutorial on my M2 MacBook air.

   Well...   The `k8ssandra` operator does not officially support ARM64 cpu architecture.  So, I built ARM64 images for all of the containers that we'll be using.

   The build instructions for creating the multi-arch container images and associated manifests can be found here:

   [https://github.com/cgruver/k8ssandra-blog-resources/blob/main/README.md](https://github.com/cgruver/k8ssandra-blog-resources/blob/main/README.md){:target="_blank"}

### Setup your workstation for the K8ssandra Install

1. You need to install `kustomize` if you don't already have it:

   [https://kubectl.docs.kubernetes.io/installation/kustomize/](https://kubectl.docs.kubernetes.io/installation/kustomize/){:target="_blank"}

1. Set an environment variable: (__Note:__ I am following the same conventions as in the previous posts)

   ```bash
   export K8SSANDRA_WORKDIR=${HOME}/okd-lab/quarkus-projects/k8ssandra-work-dir
   ```

1. Clone the helper repo that I created for you:

   ```bash
   mkdir -p ${K8SSANDRA_WORKDIR}
   git clone https://github.com/cgruver/k8ssandra-blog-resources.git ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources
   ```

1. Set the environment for the install

   ```bash
   . ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/versions.sh
   export PULL_REGISTRY="quay.io/cgruver0"
   ```

### Install Cert Manager

K8ssandra uses `cert-manager` to manager TLS certificates for the cassandra ecosystem.

Check out the project here:

* [https://cert-manager.io/](https://cert-manager.io/){:target="_blank"}
* [https://github.com/cert-manager](https://github.com/cert-manager){:target="_blank"}

1. Create a directory for temporary resources:

   ```bash
   mkdir -p ${K8SSANDRA_WORKDIR}/tmp
   ```

1. Download the manifest for installing cert-manager:

   ```bash
   wget -O ${K8SSANDRA_WORKDIR}/tmp/cert-manager.yaml https://github.com/jetstack/cert-manager/releases/download/${CERT_MGR_VER}/cert-manager.yaml
   ```

1. Prepare the `kustomize` manifest that I created for you:

   ```bash
   envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/kustomize/cert-manager-kustomization.yaml > ${K8SSANDRA_WORKDIR}/tmp/kustomization.yaml
   ```

1. Install Cert Manager:

   ```bash
   kustomize build ${K8SSANDRA_WORKDIR}/tmp | oc create -f -
   ```

1. Verify the cert manager pods:

   1. Go to the web console and select `workloads` -> `pods` from the left had navigation menu:

      ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/workloads-pods.png)

   1. Filter on the `cert-manager` project:

      ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/workloads-pods-cert-manager.png)

   1. Note the running state of the three cert-manager pods:

      ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/cert-manager-pods.png)

### Install K8ssandra Operator

1. Prepare the `kustomize` manifest that I created for you:

   ```bash
   envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/kustomize/k8ssandra-kustomization.yaml > ${K8SSANDRA_WORKDIR}/tmp/kustomization.yaml
   ```

1. Install the K8ssandra Operator

   ```bash
   kustomize build ${K8SSANDRA_WORKDIR}/tmp | oc create -f -
   ```

1. Patch the `k8ssandra-operator` RBAC role to work in OpenShift:

   ```bash
   oc -n k8ssandra-operator patch role k8ssandra-operator --type=json -p='[{"op": "add", "path": "/rules/-", "value": {"apiGroups": [""],"resources": ["endpoints/restricted"],"verbs": ["create"]} }]'
   ```

1. Grant `anyuid` to the `default` service account in the `k8ssandra-operator` namespace:

   The Cassandra pods run with the `default` service account.  They will need to run as a specific UID, and need increased privileges:

   ```bash
   oc -n k8ssandra-operator adm policy add-scc-to-user anyuid -z default 
   ```

### Configure the K8ssandra Operator

1. Stop the two k8ssandra pods:

   ```bash
   oc -n k8ssandra-operator scale deployment cass-operator-controller-manager --replicas=0
   oc -n k8ssandra-operator scale deployment k8ssandra-operator --replicas=0
   ```

1. Patch the Cass Operator configuration:

   ```bash
   oc -n k8ssandra-operator patch configmap cass-operator-manager-config --patch="$(envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/manifests/cass-config-patch.yaml)"
   ```

1. Start the k8ssandra operator pods back up:

   ```bash
   oc -n k8ssandra-operator scale deployment cass-operator-controller-manager --replicas=1
   oc -n k8ssandra-operator scale deployment k8ssandra-operator --replicas=1
   ```

1. Verify that the operator pods are running:

   1. Go back to the web console and select `Workloads` -> `Pods` and filter on the `k8ssandra-operator` project:

      ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/workloads-pods-k8ssandra.png)

   1. Note the running state of the two operator pods:

      ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/k8ssandra-operator-pods.png)

### Prepare Storage for Cassandra

OpenShift Local does not include a dynamic storage provisioner.  We are going to use a host volume to provide a persistent volume to Cassandra.

In a later post, I'll show you how to deploy a 3 node cassandra cluster with dynamically allocated volumes using Ceph storage with the Rook operator.

1. Create a storage class:

   ```bash
   oc apply -f ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/manifests/k8ssandra-sc.yaml
   ```

1. Prepare a host volume for Cassandra:

   __Note:__ Out of the box, Cassandra is going to run as uid 999.  So, we'll set that ownership on the host volume.  This is a bad practice...  but it's a compromise that we'll have to make for running on a local workstation.  __DON'T DO THIS IN PRODUCTION__

   ```bash
   export SSH_KEY=${HOME}/.crc/machines/crc/id_ecdsa
   ssh -i ${SSH_KEY} -p 2222 core@127.0.0.1 "sudo mkdir /mnt/pv-data/k8ssandrapv && sudo chown 999:999 /mnt/pv-data/k8ssandrapv"
   ```

1. Create a persistent volume to use the host volume we created:

   ```bash
   oc apply -f ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/manifests/k8ssandra-pv.yaml
   ```

## Deploy Cluster

Now, deploy a single-node Cassandra cluster:

```bash
envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/manifests/k8ssandra-cluster.yaml | oc -n k8ssandra-operator apply -f -
```

This will take a while to start up.

1. The cass operator will deploy a `StatefulSet` for the new cluster:

   ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/k8ssandra-cluster-pods-starting.png)

1. It will take a while for the cluster to provision:

   ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/k8ssandra-cluster-pods-sts-running.png)

1. After the Cassandra instance is running, the operator will deploy Stargate:

   ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/k8ssandra-cluster-startgate-pod-starting.png)

1. All of the pods should be in a running and ready state when complete:

   ![Install OpenShift Local](/_pages/tutorials/quarkus-for-architects/images/k8ssandra-cluster-pods-running.png)

## Expose Stargate Services

The final step is to expose the Stargate services as external Routes so that we can access the cassandra cluster with `curl` or `Postman`:

```bash
oc -n k8ssandra-operator create route edge sg-graphql --service=k8ssandra-cluster-dc1-stargate-service --port=8080
oc -n k8ssandra-operator create route edge sg-auth --service=k8ssandra-cluster-dc1-stargate-service --port=8081
oc -n k8ssandra-operator create route edge sg-rest --service=k8ssandra-cluster-dc1-stargate-service --port=8082
```

That's it for this post.  In the next post we'll get an introduction to the Stargate API, then we'll use this Cassandra cluster as the persistent backend for a Quarkus micro-service.

If you want to read ahead and start playing with this Cassandra cluster, check out the documentation here:

[https://docs.datastax.com/en/astra-serverless/docs/quickstart/qs-document.html](https://docs.datastax.com/en/astra-serverless/docs/quickstart/qs-document.html){:target="_blank"}

[https://docs.datastax.com/en/astra-serverless/docs/develop/tooling.html#postman-resources](https://docs.datastax.com/en/astra-serverless/docs/develop/tooling.html#postman-resources){:target="_blank"}

When you are done with your cluster, you can stop it gracefully from a terminal window:

```bash
crc stop
```

When you are ready to use it again, simply restart it:

```bash
crc start
```

Note that it will take a while for the Cassandra cluster to restart and verify itself.

Cheers!
