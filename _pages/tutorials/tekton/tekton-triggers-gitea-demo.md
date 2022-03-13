---
title: "OpenShift Pipelines (Tekton) - Triggers with a cup of Gitea - Demo"
description: "Tekton Triggers with Gitea and an Interceptor"
sitemap: true
published: true
permalink: /tutorials/tekton-triggers-gitea-demo/
tags:
  - openshift pipelines
  - tekton
  - gitea webhook
---
## Quarkus Application

1. Create a project for our Quarkus demo app:

   ```bash
   oc new-project app-demo
   ```

1. Set up the namespace scoped resources that we need:

   ```bash
   oc process openshift//namespace-java-tekton-resources -n app-demo
   ```

1. Create a basic Quarkus REST service:

   ```bash
   quarkus create app --maven --java=11 --no-wrapper --package-name=fun.is.quarkus.demo fun.is.quarkus:app-demo:0.1
   ```

1. Create a git repository for the demo app code:

   ```bash
   cd app-demo
   git init
   git branch -m main
   git add .
   git commit -m "init"
   ```

1. Push the demo code to our Gitea instance:

   ```bash
   git remote add origin https:$(oc get route gitea -o=jsonpath='{.spec.host}' -n gitea)/demo/app-demo
   git push --set-upstream origin main
   ```

```yaml
apiVersion: tekton.dev/v1beta1
kind: PipelineRun
metadata:
  generateName: app-demo-
  labels:
    app-name: app-demo
spec:
  serviceAccountName: pipeline
  pipelineRef: 
    name: build-and-deploy-java
  params:
  - name: app-name
    value: app-demo
  - name: build-type
    value: quarkus-fast-jar
  - name: deploy-type
    value: rolling-replace
  - name: git-repo-url
    value: https://gitea-gitea.apps-crc.testing/demo/app-demo
  - name: git-checkout
    value: main
  - name: clone-type
    value: "branch"
```
