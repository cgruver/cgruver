---
title: "OpenShift Pipelines (Tekton) - Triggers with a cup of Gitea"
description: "Tekton Triggers with Gitea and an Interceptor"
sitemap: true
published: true
permalink: /tutorials/tekton-triggers-gitea/
tags:
  - openshift pipelines
  - tekton
  - gitea webhook
---
### Install Gitea and the interceptor

1. Install a Gitea server to be our SCM for this demo

   In resources that you cloned I have provided a demo Deployment of Gitea for us to use.  Check out Gitea here: [https://gitea.io/en-us/](https://gitea.io/en-us/){:target="_blank"}

   Let's install that first.  __Note:__ This assumes that you are using Code Ready Containers.  If you are not, then you will need to modify the PersistentVolumeClaim in this YAML file.

   ```bash
   oc new-project gitea
   oc apply -f ~/tekton-tutorial/gitea-demo/gitea-server.yaml -n gitea
   ```

   Create a edge terminated TLS route for Gitea

   ```bash
   oc create route edge gitea --service=gitea-http -n gitea
   ```

1. Install the Gitea Tekton Interceptor:

   __Note:__ Log into your OpenShift cluster as a cluster admin for this part.

   If you are using CRC then do this:

   ```bash
   crc console --credentials
   ```

   Use the password in the output to log into the cluster:

   ```bash
   crc login -u kubeadmin https://api.crc.testing:6443
   ```

   Create the Interceptor:

   ```bash
   oc apply -f ~/tekton-tutorial/gitea-demo/gitea-interceptor.yaml -n openshift-pipelines
   ```

   ```bash
   oc create route edge gitea-interceptor --service=gitea-interceptor -n openshift-pipelines
   ```

### Configure Gitea

   Get the URL for the Gitea route:

   ```bash
   GITEA_URL=$(oc get route gitea -o=jsonpath='{.spec.host}' -n gitea)
   ```

### Quarkus Application

```bash
quarkus create app --maven --java=11 --no-wrapper --package-name=fun.is.quarkus.demo fun.is.quarkus:app-demo:0.1
```

```bash
cd app-demo
git init
git branch -m trunk
git add .
git commit -m "init"
```

```bash
git remote add origin https://gitea.${LAB_DOMAIN}:3000/demo/app-demo
git push --set-upstream origin trunk
```

```yaml

```
