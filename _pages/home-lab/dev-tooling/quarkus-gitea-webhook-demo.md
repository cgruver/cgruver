---
title: "Quarkus Build & Deploy - Pipelines Demo"
description: "Demo of Quarkus Build & Deploy with Tekton Triggers and Gitea Webhooks"
sitemap: false
published: false
permalink: /home-lab/quarkus-gitea-webhook-demo/
tags:
  - openshift pipelines
  - tekton
  - tekton triggers
  - Quarkus
  - Gitea Webhooks
---
### Create the demo application:

1. Initialize the demo application:

   ```bash
   cd ${OKD_LAB_PATH}
   mvn io.quarkus:quarkus-maven-plugin:2.2.2.Final:create -DprojectGroupId=fun.is.quarkus -DprojectArtifactId=app-demo -DclassName="fun.is.quarkus.AppDemo" -Dpath="/hello" -Dextensions="quarkus-resteasy-jackson"
   ```

1. Initialize git tracking for the application:

   ```bash
   cd ${OKD_LAB_PATH}/app-demo
   git init
   git branch -m trunk
   git add .
   git commit -m "init"
   ```

1. Create the `app-demo` git repository on the gitea server:

   ```bash
   git remote add origin https://gitea.${LAB_DOMAIN}:3000/demo/app-demo
   git push --mirror
   ```

### Now, let's create the pipelines!

```bash
oc process app-demo//create-rolling-replace-quarkus-fast-jar-app -p GIT_REPOSITORY=https://gitea.${LAB_DOMAIN}:3000/demo/app-demo -p GIT_BRANCH=trunk | oc apply -n app-demo -f -
```
