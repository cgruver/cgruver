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
## WIP - WIP - WIP

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
