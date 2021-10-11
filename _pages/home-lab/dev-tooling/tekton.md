---
title: OpenShift Pipelines - Disconnected Install
description: How To Install OpenShift Pipelines On A Disconnected Network
permalink: /home-lab/tekton-install/
tags:
  - openshift pipelines
  - tekton
  - tekton triggers
---

1. First we need to install a couple of tools: (Assuming MacOS with HomeBrew here...)

   ```bash
   brew install go yq kustomize podman
   ```

   For Fedora or other linux distributions, check out the project sites for install instructions:
   * [YQ](https://github.com/mikefarah/yq)
   * [Kustomize](https://kustomize.io)
   * [Podman](https://podman.io/getting-started/installation)
   * [Go](https://golang.org)

1. Prepare a space for the OpenShift Pipelines Install:

   ```bash
   mkdir ${OKD_LAB_PATH}/work-dir
   cd ${OKD_LAB_PATH}/work-dir
   ```

1. Clone the operator code:

   ```bash
   git clone https://github.com/tektoncd/operator.git
   cd operator
   git checkout release-v0.23
   ```

1. __Mac OS:__ Start the Podman environment:

   ```bash
   podman machine init
   podman machine start
   ```

1. Log into the lab Nexus registry:

   ```bash
   LOCAL_REGISTRY=$(yq e ".local-registry" ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml)
   podman login -u openshift-mirror ${LOCAL_REGISTRY}
   ```

1. Log into the OpenShift cluster:

   ```bash
   oc login -u admin https://api.okd4.dev.${LAB_DOMAIN}:6443
   ```

1. Create a list of the images needed for Tekton Pipelines and Triggers:

   ```bash
   cat << EOF > ${OKD_LAB_PATH}/work-dir/images.list
   quay.io/openshift-pipeline/tektoncd-pipeline-controller:v0.22.0
   quay.io/openshift-pipeline/tektoncd-pipeline-kubeconfigwriter:v0.22.0
   quay.io/openshift-pipeline/tektoncd-pipeline-git-init:v0.22.0
   quay.io/openshift-pipeline/tektoncd-pipeline-entrypoint:v0.22.0
   quay.io/openshift-pipeline/tektoncd-pipeline-nop:v0.22.0
   quay.io/openshift-pipeline/tektoncd-pipeline-imagedigestexporter:v0.22.0
   quay.io/openshift-pipeline/tektoncd-pipeline-pullrequest-init:v0.22.0
   gcr.io/google.com/cloudsdktool/cloud-sdk@sha256:27b2c22bf259d9bc1a291e99c63791ba0c27a04d2db0a43241ba0f1f20f4067f
   registry.access.redhat.com/ubi8/ubi-minimal:latest
   quay.io/openshift-pipeline/tektoncd-pipeline-webhook:v0.22.0
   quay.io/openshift-pipeline/tektoncd-triggers-webhook:v0.12.1
   quay.io/openshift-pipeline/tektoncd-triggers-interceptors:v0.12.1
   quay.io/openshift-pipeline/tektoncd-triggers-controller:v0.12.1
   quay.io/openshift-pipeline/tektoncd-triggers-eventlistenersink:v0.12.1
   EOF
   ```

1. Mirror the pipeline images to the local Nexus registry:

   ```bash
   for i in $(cat ${OKD_LAB_PATH}/work-dir/images.list)
   do
   podman pull ${i}
   IMAGE=$(echo ${i} | cut -d"/" -f2-)
   podman tag ${i} ${LOCAL_REGISTRY}/tekton/${IMAGE}
   podman push ${LOCAL_REGISTRY}/tekton/${IMAGE} --tls-verify=false
   done
   ```

1. Use `yq` to fully hydrate the Tekton install manifests.  This removes YAML anchors which currently break `kustomize`:

   ```bash
   yq eval 'explode(.)' ./cmd/openshift/operator/kodata/tekton-pipeline/0.22.0/00_tektoncd-pipeline-v0.22.0.yaml > 00_tektoncd-pipeline-v0.22.0.yaml
   yq eval 'explode(.)' ./cmd/openshift/operator/kodata/tekton-trigger/0.12.1/tektoncd-triggers-v0.12.1.yaml > tektoncd-triggers-v0.12.1.yaml
   ```

1. Create a `Kustomization` file to patch the install manifests for our mirrored images:

   ```bash
   cat << EOF > kustomization.yaml
   resources:
   - ./00_tektoncd-pipeline-v0.22.0.yaml
   patches:
     - target:
         kind: Deployment
         name: tekton-pipelines-controller
       patch: |-
         - op: replace
           path: /spec/template/spec/containers/0/image
           value: ${LOCAL_REGISTRY}/tekton/openshift-pipeline/tektoncd-pipeline-controller:v0.22.0
         - op: replace
           path: /spec/template/spec/containers/0/args
           value: [
             "-version", "v0.22.0",
             "-kubeconfig-writer-image", "quay.io/openshift-pipeline/tektoncd-pipeline-kubeconfigwriter:v0.22.0",
             "-git-image", "quay.io/openshift-pipeline/tektoncd-pipeline-git-init:v0.22.0",
             "-entrypoint-image", "quay.io/openshift-pipeline/tektoncd-pipeline-entrypoint:v0.22.0",
             "-nop-image", "quay.io/openshift-pipeline/tektoncd-pipeline-nop:v0.22.0",
             "-imagedigest-exporter-image", "quay.io/openshift-pipeline/tektoncd-pipeline-imagedigestexporter:v0.22.0",
             "-pr-image", "quay.io/openshift-pipeline/tektoncd-pipeline-pullrequest-init:v0.22.0",
             "-gsutil-image", "gcr.io/google.com/cloudsdktool/cloud-sdk@sha256:27b2c22bf259d9bc1a291e99c63791ba0c27a04d2db0a43241ba0f1f20f4067f",
             "-shell-image", "registry.access.redhat.com/ubi8/ubi-minimal:latest"
           ]
     - target:
         kind: Deployment
         name: tekton-pipelines-webhook
       patch: |-
         - op: replace
           path: /spec/template/spec/containers/0/image
           value: ${LOCAL_REGISTRY}/tekton/openshift-pipeline/tektoncd-pipeline-webhook:v0.22.0
   EOF
   ```

1. Apply the `Kustomization` for the Pipelines install manifests:

   ```bash
   kustomize build . > ./cmd/openshift/operator/kodata/tekton-pipeline/0.22.0/00_tektoncd-pipeline-v0.22.0.yaml
   ```

1. Now do the same thing for the Tekton Triggers manifests:

   ```bash
   cat << EOF > kustomization.yaml
   resources:
   - ./tektoncd-triggers-v0.12.1.yaml
   patches:
     - target:
         kind: Deployment
         name: tekton-triggers-webhook
       patch: |-
         - op: replace
           path: /spec/template/spec/containers/0/image
           value: ${LOCAL_REGISTRY}/tekton/openshift-pipeline/tektoncd-triggers-webhook:v0.12.1
     - target:
         kind: Deployment
         name: tekton-triggers-core-interceptors
       patch: |-
         - op: replace
           path: /spec/template/spec/containers/0/image
           value: ${LOCAL_REGISTRY}/tekton/openshift-pipeline/tektoncd-triggers-interceptors:v0.12.1
     - target:
         kind: Deployment
         name: tekton-triggers-controller
       patch: |-
         - op: replace
           path: /spec/template/spec/containers/0/image
           value: ${LOCAL_REGISTRY}/tekton/openshift-pipeline/tektoncd-triggers-controller:v0.12.1
         - op: replace
           path: /spec/template/spec/containers/0/args
           value: [
             "-logtostderr",
             "-stderrthreshold", "INFO",
             "-el-image", "quay.io/openshift-pipeline/tektoncd-triggers-eventlistenersink:v0.12.1",
             "-el-port", "8080",
             "-el-readtimeout", "5",
             "-el-writetimeout", "40",
             "-el-idletimeout", "120",
             "-el-timeouthandler", "30",
             "-period-seconds", "10",
             "-failure-threshold", "1"
           ]
   EOF

   kustomize build . > ./cmd/openshift/operator/kodata/tekton-trigger/0.12.1/tektoncd-triggers-v0.12.1.yaml
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
    cd
    rm -rf ${OKD_LAB_PATH}/work-dir
    ```

1. If you choose to uninstall pipelines:

   ```bash
   mkdir ${OKD_LAB_PATH}/work-dir
   cd ${OKD_LAB_PATH}/work-dir
   git clone https://github.com/tektoncd/operator.git
   cd operator
   git checkout release-v0.23
   oc login -u admin https://api.okd4.dev.${LAB_DOMAIN}:6443
   make TARGET=openshift CR=config/default clean
   cd
   rm -rf ${OKD_LAB_PATH}/work-dir
   ```
