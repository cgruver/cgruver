---
title: Let's Code!  ...and build, and deploy!
date:   2021-11-05 00:00:00 -0400
description: "Set up Tekton pipelines with Gitea Webhooks"
tags:
  - Tekton
  - Quarkus
  - Gitea webhook
categories:
  - Dev Tooling
---

This is what it's all about my friends!  Deploying running code.

So, let's set up our cluster with the last few pieces to make Tekton usable:

[Cluster Set Up Tasks](/home-lab/pipelines-cluster-setup/)

Next, we'll create an OpenShift project to run our application, set up a Gitea organization for our code, and enable Nexus to be a Maven Mirror:

[Project Set Up Tasks](/home-lab/pipelines-namespace-setup/)

Finally, let's deploy some running code!!!

[Demo with Quarkus & Gitea Webhooks](/home-lab/quarkus-gitea-webhook-demo/)

Cheers!
