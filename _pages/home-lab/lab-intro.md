---
permalink: /home-lab/lab-intro/
title: Building a Portable Kubernetes Home Lab with OKD4
description: "OpenShift and OKD Home Lab with Raspberry Pi, Intel NUC, CentOS Stream, and OpenWRT"
tags:
  - openshift
  - okd
  - kubernetes
  - intel nuc
  - openwrt
  - centos stream
  - raspberry pi
  - nexus
---
There are a lot of really good Kubernetes and OpenShift tutorials out there.  This one strives to be a little bit different in that it is going to simulate the network configuration found in a real data center environment.  This tutorial is targeted toward architects and engineers who are interested in both infrastructure and application development.  This is not Code Ready Containers, or MiniKube.  Both of those are excellent developer tools and can be used to learn Kubernetes basics.  No, what you will build from the following tutorial will be a production like OpenShift cluster.  Your new lab will be very expandable as well.  Add more KVM hosts, and you can build more sophisticated OpenShift environments.

I have broken this tutorial up into multiple pages to help reduce the TL;DR that can result from really long pages.  Each section will guide you through the setup of a lab capability.  After the OpenShift cluster is up and running, future blog posts will show you how to add some capabilities to it, and get it setup to support application delivery.

We will start by setting up a layered network architecture that will enable us to isolate our OpenShift cluster from the internet.  We'll use firewall rules to allow the access that we want to grant.  With this setup, you will also be able to add additional, isolated clusters to your lab as you expand your capabilities.  The additional clusters can be used to simulate Dev -> QA -> Prod CI/CD, or multi-datacenter configurations.

We'll start small, and grow from there:

Of course...  small is relative.  So, at this point you can make a choice; virtualized infrastructure or bare-metal.

Take a look at both, choose one, and carry on.

1. [KVM base lab](/home-lab/kvm-lab-intro/)

1. [Bare Metal lab](/home-lab/bare-metal-intro/)
