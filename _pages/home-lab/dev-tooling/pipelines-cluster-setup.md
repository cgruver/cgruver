---
title: Cluster Setup - Tekton Pipelines for Java apps
sitemap: false
published: false
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

   1. Set a couple of vars:

      ```bash
      IMAGE_REGISTRY=$(yq e ".local-registry" ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml)
      OKD_MAJ=$(oc version --client=true | cut -d" " -f3 | cut -d"." -f-2).0
      ```
   
   1. Grab the `origin-cli` image from `quay.io`:

      This image contains the OpenShift command line tools that we will use for manipulating namespace scoped objects within Tekton tasks.

      ```bash
      podman pull quay.io/openshift/origin-cli:${OKD_MAJ}
      podman tag quay.io/openshift/origin-cli:${OKD_MAJ} ${IMAGE_REGISTRY}/openshift/origin-cli:${OKD_MAJ}
      ```

   1. Grab the `ubi-minimal` image from Red Hat:

      This image is a very compact RHEL based image that we will use as the basis for other images built by Tekton tasks.  We'll also use it to run Quarkus native applications later on.

   ```bash
   podman pull registry.access.redhat.com/ubi8/ubi-minimal:8.4
   podman tag registry.access.redhat.com/ubi8/ubi-minimal:8.4 ${IMAGE_REGISTRY}/openshift/ubi-minimal:8.4

   podman pull quay.io/buildah/stable:latest
   podman tag quay.io/buildah/stable:latest ${IMAGE_REGISTRY}/openshift/buildah:latest
   ```

   | `origin-cli` | Contains the OpenShift command line tools for manipulating namespace scoped objects within Tekton tasks |
   | `ubi-minimal` | A very compact RHEL based image that we will use as the basis for other images built by Tekton tasks |
   | `buildah` | An image containing the `buildah` image manipulation tooling |

1. Build the two container images that I created for this project:

   | `java-11-app-runner` | Image for running Java 11 based fat jar applications |
   | `java-11-builder` | Image containing the tooling for building Maven based Java 11 fat jar, and Quarkus Native applications |

   ```bash
   cd ${OKD_LAB_PATH}/okd-home-lab/pipelines/images

   podman build -t ${IMAGE_REGISTRY}/openshift/java-11-app-runner:1.3.8 -f java-11-app-runner.Dockerfile .
   podman build -t ${IMAGE_REGISTRY}/openshift/java-11-builder:latest -f java-11-builder.Dockerfile .
   ```

1. Push the images to Nexus on the bastion Pi server:

   ```bash
   podman login -u openshift-mirror ${IMAGE_REGISTRY}

   podman push ${IMAGE_REGISTRY}/openshift/origin-cli:${OKD_MAJ} --tls-verify=false
   podman push ${IMAGE_REGISTRY}/openshift/ubi-minimal:8.4 --tls-verify=false
   podman push ${IMAGE_REGISTRY}/openshift/java-11-app-runner:1.3.8 --tls-verify=false
   podman push ${IMAGE_REGISTRY}/openshift/java-11-builder:latest --tls-verify=false
   podman push ${IMAGE_REGISTRY}/openshift/buildah:latest --tls-verify=false
   ```

1. Next, we want to create image streams that will instruct our OpenShift cluster to import these images from the Nexus server, but first we need to tell the OpenShift Image Registry Operator to trust the self-signed certificate that our Nexus server is using:

   We do this by creating a ConfigMap with the image registry certificates that we want to trust, and then patching the OpenShift image registry operator's configuration with the name of the ConfigMap.

   1. Grab the Nexus certificate, and put it in an environment variable:

      ```bash
      REG_HOST=$(echo ${IMAGE_REGISTRY} | cut -d":" -f1)
      REG_PORT=$(echo ${IMAGE_REGISTRY} | cut -d":" -f2)
      NEXUS_CERT=$(openssl s_client -showcerts -connect ${IMAGE_REGISTRY} </dev/null 2>/dev/null|openssl x509 -outform PEM)
      ```

   1. Log into your OpenShift cluster:

      ```bash
      oc login -u admin https://api.okd4.dev.${LAB_DOMAIN}:6443
      ```

   1. Create a ConfigMap from the contents of the environment variable:

      Note: We are using `key=value` where the `key` is the name of the certificate in the format of `HOST..PORT`
      This mimics the Linux convention of namimg a cert file with `HOST:PORT`.  The `..` is replaced with `:` when the operator consumes the ConfigMap and creates a file for the certificate.

      ```bash
      oc create configmap nexus-registry -n openshift-config --from-literal=${REG_HOST}..${REG_PORT}=${NEXUS_CERT}
      ```

   1. Patch the configuration for the Image Registry Operator:

      ```bash
      oc patch image.config.openshift.io/cluster --type=merge --patch '{"spec":{"additionalTrustedCA":{"name":"nexus-registry"}}}' 
      ```

   1. Now you need to wait a bit for the operator to apply the configuration.  

      If you see x509 errors in the next step, you did not wait long enough.

      Go fix a cup of coffee or other beverage of your choice.

1. Now we can create ImageStreams to import the images from Nexus to the OpenShift cluster:

   ```bash
   oc import-image origin-cli:latest --from=${IMAGE_REGISTRY}/openshift/origin-cli:${OKD_MAJ} --confirm -n openshift
   oc import-image ubi-minimal:8.4 --from=${IMAGE_REGISTRY}/openshift/ubi-minimal:8.4 --confirm -n openshift
   oc import-image java-11-app-runner:latest --from=${IMAGE_REGISTRY}/openshift/java-11-app-runner:1.3.8 --confirm -n openshift
   oc import-image java-11-builder:latest --from=${IMAGE_REGISTRY}/openshift/java-11-builder:latest --confirm -n openshift
   oc import-image buildah:latest --from=${IMAGE_REGISTRY}/openshift/buildah:latest --confirm -n openshift
   ```

1. The next thing that we are going to do, is add a couple of certificates to our OpenShift cluster:

   Our Gitea server and our Nexus server are both using self-signed certificates.  It's a bad practice to disable TLS verification in all of our pipelines.  So, I am going to show you how to add additional trusted certs to your OpenShift cluster.

   We do this by creating a ConfigMap that we will add to the openshift-config namespace, and then patching the default cluster proxy object.

   1. First, we need the Gitea and Nexus certificates in PEM format.

      ```bash
      GITEA_CERT=$(openssl s_client -showcerts -connect gitea.${LAB_DOMAIN}:3000 </dev/null 2>/dev/null|openssl x509 -outform PEM | while read line; do echo "    $line"; done)
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
