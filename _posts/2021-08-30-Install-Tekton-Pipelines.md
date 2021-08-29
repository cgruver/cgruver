---
layout: post
title: We're Almost Ready to Write Some Code...  But First - Tekton!
date:   2021-08-30 00:00:00 -0400
description: "How To Build CodeReady Containers with OKD"
tags:
  - codeready
  - okd
  - openshift
categories:
  - Home Lab
  - Developer Tools
---

Today, I am going to show you how to install the OpenShift Pipelines operator in your disconnected cluster.

The project that OpenShift Pipelines is built from is here: [https://github.com/tektoncd/operator](https://github.com/tektoncd/operator).  It is part of the Tekton project.

We're going to build the operator from source, after patching the manifests to pull images from your local Nexus running on the bastion host.

Follow the tutorial here: [How To Install OpenShift Pipelines On A Disconnected Network](/home-lab/tekton-install/)

Next week, we'll deploy a Quarkus application with Tekton!
