---
title: "Quarkus for Architects who Sometimes Write Code - It's OK To Be Reactive"
date:   2022-08-03 00:00:00 -0400
description: "Blog Series on writing Cloud Native Applications for OpenShift / Kubernetes with Quarkus - Reactive API Server"
tags:
  - OpenShift
  - Kubernetes
  - Homelab
  - Home Lab
  - Quarkus
categories:
  - Blog Post
  - Quarkus Series
---

Today we're going to do something fairly complex, and completely useless.  Have I mentioned that I'm an enterprise architect?...

This is the next step on my journey to build a multi-region leader elector.  In this post, we're going to use reactive techniques to build a singleton application which will send heartbeats to clones of itself and monitor the responses.  Each instance of the app will talk to the other instances, as well as to itself.

1. Create the project scaffolding:

   ```bash
   mkdir -p ${HOME}/okd-lab/quarkus-projects
   cd ${HOME}/okd-lab/quarkus-projects
   code --create -a=italktomyself -g=fun.is.quarkus -x=scheduler
   cd ${HOME}/okd-lab/quarkus-projects/italktomyself
   code --dependency -g=org.mapstruct -a=mapstruct -v=1.5.2.Final
   code --dependency -g=org.mapstruct -a=mapstruct-processor -v=1.5.2.Final
   code --dependency -g=org.projectlombok -a=lombok -v=1.18.24
   code --dependency -g=org.projectlombok -a=lombok-mapstruct-binding -v=0.2.0
   ```

```bash
SERVER_PORT=4070 quarkus dev --no-debug
```

```bash
SERVER_PORT=4080 quarkus dev --no-debug
```

```bash
SERVER_PORT=4090 quarkus dev --no-debug
```
