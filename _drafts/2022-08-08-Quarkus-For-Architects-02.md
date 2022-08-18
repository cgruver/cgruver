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
__Note:__ This is the third post in a series.  While the code in this post stands alone, I am using some tooling introduced in earlier posts:

1. [Quarkus for Architects who Sometimes Write Code - Introduction](/blog%20post/quarkus%20series/2022/07/27/Quarkus-For-Architects-Intro.html){:target="_blank"}

1. [Quarkus for Architects who Sometimes Write Code - API Server & Client](/blog%20post/quarkus%20series/2022/08/02/Quarkus-For-Architects-01.html){:target="_blank"}

## Today we're going to do something fairly complex, and completely useless 

Have I mentioned that I'm an enterprise architect?...

In this post, we're going to use reactive techniques to build a singleton application which will send heartbeats to clones of itself and monitor the responses.  Each instance of the app will talk to the other instances, as well as to itself.  The app will track the online/offline state of the other instances.

We're going to demonstrate several Quarkus capabilities:

* Reactive REST API with `io.smallrye.mutiny.Uni`
* Handling failure in asynchronous tasks
* Using `javax.ws.rs.core.Response` in APIs
* Scheduled execution of methods with `io.quarkus.scheduler.Scheduled`
* Intra-App Messaging with `io.vertx.mutiny.core.eventbus.EventBus`
* Application Lifecycle with `io.quarkus.runtime.StartupEvent`
* DTO to Entity mapping with `org.mapstruct.Mapper`
* ...and Lombok, for all of you 


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
