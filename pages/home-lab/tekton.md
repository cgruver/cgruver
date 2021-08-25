---
layout: page
sitemap: false
published: false
---

```bash
mkdir ${OKD_LAB_PATH}/tekton
cd ${OKD_LAB_PATH}/tekton
git clone https://github.com/tektoncd/operator.git
cd operator
git checkout release-v0.23

podman login -u openshift-mirror ${LOCAL_REGISTRY}

export KO_DOCKER_REPO=${LOCAL_REGISTRY}/tekton

make TARGET=openshift apply

make TARGET=openshift clean

```
