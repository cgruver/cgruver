---
layout: post
title:  "Let's Add Some Storage to Our Cluster"
date:   2021-08-16 00:00:00 -0400
description: "Install Rook Ceph on OpenShift with a disconnected network"
tags:
  - openshift
  - okd
  - kubernetes
  - ceph
  - disconnected network
  - rook
categories:
  - Home Lab
---

In this week's post, I am going to show you how to add the Rook Operator for Ceph Storage to your cluster.

Rook and Ceph are the upstream projects that make up OpenShift Container Storage.  You can find them here:

* [Rook](https://github.com/rook/rook)
* [Ceph](https://github.com/ceph/ceph)

Since our cluster is disconnected from the internet, we are going to have to do some fun gymnastics to install the Rook Operator.  Otherwise, the installation and setup is pretty straight forward.

In this exercise we will:

* Install `podman` and `crun` on our OpenWRT bastion Pi server.
* Pull and tag images for Rook and Ceph
* Push those images into our Nexus registry running on the bastion Pi.
* Install the Operator
* Create a PVC and attach it to the OpenShift internal registry.

__Follow this link to get started:__ [Set Up Ceph Storage](/home-lab/rook-ceph/)

That's it for this week.  I haven't decided yet what we're going to do next week.  We may set up Tekton pipelines, or configure Gitea on the bastion host...  Maybe we'll do both.

See you next week!
