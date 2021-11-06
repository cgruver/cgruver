---
title: "Let's Code!  ...and build, and deploy!"
date:   2021-11-06 00:00:00 -0400
description: "Set up Tekton pipelines with Gitea Webhooks"
tags:
  - Tekton
  - Quarkus
  - Gitea webhook
categories:
  - Dev Tooling
---

This is what it's all about my friends!  Deploying running code.

There are four parts to this section.  Execute them in order:

1. Set up our cluster with the last few pieces to make Tekton usable:

   [Cluster Setup](/home-lab/pipelines-cluster-setup/)

1. Set up a Gitea organization for our code, and enable Nexus to be a Maven Mirror:

   [Gitea & Nexus Setup](/home-lab/pipelines-gitea-nexus-setup/)

1. Create and configure an OpenShift project to run our application

   [OpenShift Project Setup](/home-lab/pipelines-project-setup/)

1. Finally, let's deploy some running code!!!

   [Quarkus Build & Deploy](/home-lab/quarkus-gitea-webhook-demo/)

Cheers!
