---
permalink: /home-lab/lab-intro/
title: Building a Portable Kubernetes Home Lab with OpenShift - OKD4
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

By following this tutorial, you will set up the following capabilities for your OpenShift home lab:

* OpenWRT Router #1 (GL.iNet GL-MV1000W or GL-MV1000 Travel Router)
  * Edge internet access
  * Edge DNS services
  * Edge Firewall
  * Wireless access to your lab
* OpenWRT Router #2 (GL.iNet GL-MV1000 Travel Router)
  * PXE Boot for bare metal hosts and for OpenShift nodes
  * Internal Lab DNS Server
  * Internal Firewall
  * HA-Proxy Network Load Balancer for the OpenShift cluster
* OpenWRT Bastion Server (Raspberry Pi 4b 8GB)
  * CentOS Stream repository mirror
  * Sonatype Nexus for Container Image Registry, Maven & NPM Proxy/Mirror
  * Gitea SCM server

The network topology will look like this illustration:

![Network topology](/_pages/home-lab/images/NetworkTopology.png)

### Select your Lab Gear

Your Lab can start small, and grow as your needs dictate:

Of course...  small is relative.  So, at this point you need to make a choice; virtualized infrastructure or bare-metal, full cluster or single node.

Take a look at the link below, acquire the gear that you need, and carry on.

__Start Here: [OpenShift Home Lab Gear](/home-lab/lab-gear/){:target="_blank"}__

After you have selected the gear that you need, follow the guides to set everything up:

1. __[Configure Your Workstation](/home-lab/workstation/){:target="_blank"}__

1. If you are setting up a Single Node or Full Cluster on Bare Metal:

   __[Set Up a MacBook for Qemu with Bridged Network](/home-lab/bare-metal-bootstrap/){:target="_blank"}__

1. __[Set Up Lab Network](/home-lab/network-setup/){:target="_blank"}__

1. __Install OpenShift__

   * [Install KVM Based OpenShift](/home-lab/install-okd/)
   * [Install Single Node OpenShift](/home-lab/bare-metal-install-sno/)
   * [Install Bare Metal OpenShift](/home-lab/bare-metal-install-okd/)
