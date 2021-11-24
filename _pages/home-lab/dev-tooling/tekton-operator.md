---
title: OpenShift Pipelines - Disconnected Install
description: How To Install OpenShift Pipelines On A Disconnected Network
permalink: /home-lab/tekton-install/
sitemap: true
published: true
tags:
  - openshift pipelines
  - tekton
  - tekton triggers
---

1. First we need to install a couple of tools: (Assuming MacOS with HomeBrew here...)

   ```bash
   brew install go podman ko
   ```

   For Fedora or other linux distributions, check out the project sites for install instructions:
   * [Podman](https://podman.io/getting-started/installation)
   * [Go](https://golang.org)
   * [ko](https://github.com/google/ko)

1. Prepare a space for the OpenShift Pipelines Install:

   ```bash
   mkdir ${OKD_LAB_PATH}/work-dir
   cd ${OKD_LAB_PATH}/work-dir
   ```

1. Clone the operator code:

   ```bash
   git clone https://github.com/tektoncd/operator.git
   cd operator
   git checkout v0.51.2
   ```

1. __Mac OS:__ Start the Podman environment:

   ```bash
   podman machine init
   podman machine start
   ```

1. Log into the lab Nexus registry:

   ```bash
   LOCAL_REGISTRY=$(yq e ".local-registry" ${OKD_LAB_PATH}/lab-config/${SUB_DOMAIN}-cluster.yaml)
   podman login -u openshift-mirror ${LOCAL_REGISTRY}
   ```

1. Create a `.docker/config.json` file.  KO does not use the podman auth.json file.

   ```bash
   cp ~/.config/containers/auth.json ~/.docker/config.json
   ```

1. Log into the OpenShift cluster:

   ```bash
   oc login -u admin https://api.okd4.${SUB_DOMAIN}.${LAB_DOMAIN}:6443
   ```

1. Create a proxy repository for

   ```bash
   cat <<EOF | oc apply -f -
   apiVersion: operator.openshift.io/v1alpha1
   kind: ImageContentSourcePolicy
   metadata:
     name: gcr-io
   spec:
     repositoryDigestMirrors:
     - mirrors:
       - nexus.clg.lab:5002
       source: gcr.io
   EOF
   ```

1. Build the OpenShift Pipelines operator and install it to your cluster:

   ```bash
   export KO_DOCKER_REPO=${LOCAL_REGISTRY}/tekton
   make TARGET=openshift CR=config/default apply 
   ```

1. After a couple of minutes, you should see the Tekton pods running in the `openshift-pipelines` namespace:

   ```bash
   oc get pods -n openshift-pipelines
   ```

1. Finally, clean up after yourself:

    ```bash
    podman image rm -a
    podman machine stop
    cd
    rm -rf ${OKD_LAB_PATH}/work-dir
    ```

1. If you choose to uninstall pipelines:

   ```bash
   mkdir ${OKD_LAB_PATH}/work-dir
   cd ${OKD_LAB_PATH}/work-dir
   git clone https://github.com/tektoncd/operator.git
   cd operator
   git checkout v0.51.2
   oc login -u admin https://api.okd4.${SUB_DOMAIN}.${LAB_DOMAIN}:6443
   make TARGET=openshift CR=config/default clean
   cd
   rm -rf ${OKD_LAB_PATH}/work-dir
   ```
