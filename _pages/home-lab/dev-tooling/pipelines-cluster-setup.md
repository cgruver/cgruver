---
title: "Tekton Pipelines - Cluster Setup"
sitemap: true
published: true
permalink: /home-lab/pipelines-cluster-setup/
tags:
  - openshift pipelines
  - tekton
  - tekton triggers
  - Quarkus
  - Gitea Webhooks
---

In this session, we are going to get our cluster ready for CI/CD.  

__Note:__  *If you have not installed OpenShift Pipelines, you need to do that first*: [Install Tekton](/home-lab/tekton-install/)

Now, on to the setup!

1. Select the Lab subdomain that you want to work with:

   ```bash
   labctx
   ```

1. If you are on a Mac like me, then start podman: (You don't need to do this on Linux)

   ```bash
   podman machine init
   podman machine start
   ```

1. Refresh the okd-home-lab helper project that I created. (You should be tracking the `main` branch)

   ```bash
   cd ${OKD_LAB_PATH}/okd-home-lab
   git fetch
   git pull
   ```

1. Pull and tag some images for the pipelines:

   Set a couple of vars:

   ```bash
   IMAGE_REGISTRY=$(yq e ".local-registry" ${OKD_LAB_PATH}/lab-config/${SUB_DOMAIN}-cluster.yaml)
   OKD_MAJ=$(oc version --client=true | cut -d" " -f3 | cut -d"." -f-2).0
   ```

   Pull the `origin-cli` image from quay.io:

   This image contains the OpenShift command line tools that we will use for manipulating namespace scoped objects within Tekton tasks.

   ```bash
   podman pull quay.io/openshift/origin-cli:${OKD_MAJ}
   podman tag quay.io/openshift/origin-cli:${OKD_MAJ} ${IMAGE_REGISTRY}/openshift/origin-cli:${OKD_MAJ}
   ```

   Pull the `ubi-minimal` image from Red Hat:

   This image is a very compact RHEL based image that we will use as the basis for other images built by Tekton tasks.  We'll also use it to run Quarkus native applications later on.

   ```bash
   podman pull registry.access.redhat.com/ubi8/ubi-minimal:8.4
   ```

   Pull the `buildah` image from quay.io:

   This is an image containing the `buildah` image manipulation tooling.  See [https://buildah.io](https://buildah.io)

   ```bash
   podman pull quay.io/buildah/stable:latest
   podman tag quay.io/buildah/stable:latest ${IMAGE_REGISTRY}/openshift/buildah:latest
   ```

1. Next, you need to build the two container images that I created for this project:

   The first one is an image for running Java 11 based fat jar applications like Quarkus, Spring Boot, or JBoss Bootable jars...  yeah, that's a thing for you JEE folks out there.  [https://docs.wildfly.org/bootablejar/](https://docs.wildfly.org/bootablejar/)

   ```bash
   podman build -t ${IMAGE_REGISTRY}/openshift/java-11-app-runner:1.3.8 -f ${OKD_LAB_PATH}/okd-home-lab/pipelines/images/java-11-app-runner.Dockerfile ${OKD_LAB_PATH}/okd-home-lab/pipelines/images
   ```

   The second image contains tooling for building Maven based Java 11 fat jar, and Quarkus Native applications.

   ```bash
   podman build -t ${IMAGE_REGISTRY}/openshift/java-11-builder:latest -f ${OKD_LAB_PATH}/okd-home-lab/pipelines/images/java-11-builder.Dockerfile ${OKD_LAB_PATH}/okd-home-lab/pipelines/images
   ```

1. Create a base image from the UBI minimal image:

   ```bash
   CONTAINER=$(podman create registry.access.redhat.com/ubi8/ubi-minimal:8.4)
   podman commit ${CONTAINER} ${IMAGE_REGISTRY}/openshift/ubi-minimal:8.4
   podman container rm ${CONTAINER}
   ```

1. Now, push the images to Nexus on the bastion Pi server:

   ```bash
   podman login -u openshift-mirror ${IMAGE_REGISTRY}

   podman push ${IMAGE_REGISTRY}/openshift/origin-cli:${OKD_MAJ} --tls-verify=false
   podman push ${IMAGE_REGISTRY}/openshift/ubi-minimal:8.4 --tls-verify=false
   podman push ${IMAGE_REGISTRY}/openshift/java-11-app-runner:1.3.8 --tls-verify=false
   podman push ${IMAGE_REGISTRY}/openshift/java-11-builder:latest --tls-verify=false
   podman push ${IMAGE_REGISTRY}/openshift/buildah:latest --tls-verify=false

   podman image rm -a
   ```

### Create Image Streams

Next, we need to create image streams that will instruct our OpenShift cluster to import these images from the Nexus server, but first we need to tell the OpenShift Image Registry Operator to trust the self-signed certificate that our Nexus server is using:

We do this by creating a ConfigMap with the image registry certificates that we want to trust, and then patching the OpenShift image registry operator's configuration with the name of the ConfigMap.

1. Grab the Nexus certificate, and put it in an environment variable:

   ```bash
   NEXUS_CERT=$(openssl s_client -showcerts -connect ${IMAGE_REGISTRY} </dev/null 2>/dev/null|openssl x509 -outform PEM)
   ```

1. Log into your OpenShift cluster:

   ```bash
   oc login -u admin https://api.okd4.${SUB_DOMAIN}.${LAB_DOMAIN}:6443
   ```

1. Create a ConfigMap from the contents of the environment variable:

   Note: We are using `key=value` where the `key` is the name of the certificate in the format of `HOST..PORT`
   This mimics the Linux convention of namimg a cert file with `HOST:PORT`.  The `..` is replaced with `:` when the operator consumes the ConfigMap and creates a file for the certificate.  We're using some shell magic to make the substitution for us.

   ```bash
   oc create configmap nexus-registry -n openshift-config --from-literal=${IMAGE_REGISTRY//:/..}=${NEXUS_CERT}
   ```

1. Patch the configuration for the Image Registry Operator:

   ```bash
   oc patch image.config.openshift.io/cluster --type=merge --patch '{"spec":{"additionalTrustedCA":{"name":"nexus-registry"}}}' 
   ```

1. Now you need to wait a bit for the operator to apply the configuration.  

   If you see x509 errors in the next step, you did not wait long enough.

   __*Go fix a cup of coffee or other beverage of your choice.*__

1. Now we can create ImageStreams to import the images from Nexus to the OpenShift cluster:

   ```bash
   oc import-image origin-cli:latest --from=${IMAGE_REGISTRY}/openshift/origin-cli:${OKD_MAJ} --confirm -n openshift
   oc import-image ubi-minimal:latest --from=${IMAGE_REGISTRY}/openshift/ubi-minimal:8.4 --confirm -n openshift
   oc import-image java-11-app-runner:latest --from=${IMAGE_REGISTRY}/openshift/java-11-app-runner:1.3.8 --confirm -n openshift
   oc import-image java-11-builder:latest --from=${IMAGE_REGISTRY}/openshift/java-11-builder:latest --confirm -n openshift
   oc import-image buildah:latest --from=${IMAGE_REGISTRY}/openshift/buildah:latest --confirm -n openshift
   ```

### Add Certificates to OpenShift Cluster

The next thing that we are going to do is add a couple of certificates to our OpenShift cluster:

Our Gitea server and our Nexus server are both using self-signed certificates.  It's a bad practice to disable TLS verification in all of our pipelines.  So, I am going to show you how to add additional trusted certs to your OpenShift cluster.

We do this by creating a ConfigMap that we will add to the openshift-config namespace, and then patching the default cluster proxy object.

1. First, we need the Gitea and Nexus certificates in PEM format.

   We're going to grab the certs with `openssl` and then buffer them with spaces so that we can inject them into a yaml file in the next step.

   ```bash
   GITEA_CERT=$(openssl s_client -showcerts -connect gitea.${LAB_DOMAIN}:3000 </dev/null 2>/dev/null|openssl x509 -outform PEM | while read line; do echo "    $line"; done)
   ```

   ```bash
   NEXUS_CERT=$(openssl s_client -showcerts -connect nexus.${LAB_DOMAIN}:8443 </dev/null 2>/dev/null|openssl x509 -outform PEM | while read line; do echo "    $line"; done)
   ```

1. Create the ConfigMap:

   ```bash
   cat << EOF | oc apply -n openshift-config -f -
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: lab-ca
   data:
     ca-bundle.crt: |
       # Gitea Cert
   ${GITEA_CERT}
       
       # Nexus Cert
   ${NEXUS_CERT}

   EOF
   ```

1. Patch the default cluster proxy to use the configmap:

   ```bash
   oc patch proxy cluster --type=merge --patch '{"spec":{"trustedCA":{"name":"lab-ca"}}}'
   ```

   This will cause a rolling restart of your cluster nodes.  So, go make another cup of coffee.

### Install a Gitea webhook interceptor

I have written a Tekton Triggers interceptor for Gitea.  It will validate the signature on a webhook to ensure that it came from an authenticated source.

Let's install in along side OpenShift Pipelines.

1. Clone the code:

   ```bash
   mkdir ${OKD_LAB_PATH}/work-dir
   cd ${OKD_LAB_PATH}/work-dir
   git clone https://github.com/cgruver/gitea-interceptor.git
   cd gitea-interceptor
   ```

1. Build and install the interceptor:

   ```bash
   export KO_DOCKER_REPO=${IMAGE_REGISTRY}/tekton
   ko resolve --platform=linux/amd64 --preserve-import-paths -t latest -f ./config | oc apply -f -
   ```

Now, it's time to set up Gitea and Nexus for the Quarkus application that we're going to build.

Go to the next step here: [Tekton Pipelines - Gitea Setup](/home-lab/pipelines-gitea-setup/)
