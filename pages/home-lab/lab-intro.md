---
layout: page
permalink: /home-lab/full-lab/
title: Building a Portable Kubernetes Home Lab with OKD4
---
There are a lot of really good Kubernetes and OpenShift tutorials out there.  This one strives to be a little bit different in that it is going to simulate the network configuration found in a real data center environment.  This tutorial is targeted toward architects and engineers who are interested in both infrastructure and application development.  The resulting OpenShift cluster will be sized to do some real compute work.  This is not a Hello World lab.

I have broken this tutorial up into multiple pages to help reduce the TL;DR that can result from really long pages.  Each section will guide you through the setup of a lab capability.  After the OpenShift cluster is up and running, we will add some capabilities to it, and get it setup to support application delivery.

We will start by setting up a layered network architecture that will enable us to isolate our OpenShift cluster from the internet.  We'll use firewall rules to white list the access that we want to grant.  With this setup, you will also be able to add additional, isolated clusters to your lab as you expand your capabilities.  The additional clusters can be used to simulate Dev -> QA -> Prod CI/CD, or multi-datacenter configurations.

This lab setup is also intended to be highly portable.  You will be able to fit the whole thing in a slim 15" laptop bag.

## Gear for your lab:

Below is the complete bill of materials for a full setup.  Don't freak out yet.  I will also list a minimal setup to get you started that you can build on.

* Network:
  * GL.iNet [GL-MV1000W](https://www.gl-inet.com/products/gl-mv1000/) (Edge Router with WiFi)
  * GL.iNet [GL-MV1000](https://www.gl-inet.com/products/gl-mv1000/) (Internal Router)
  * Raspberry Pi 4b 8GB (Bastion Host)
  * 5 port gigabit switch.
* Compute:
  * 3X Intel NUC10i7FNK configured with 64GB RAM & 1TB NVMe

By following this tutorial, you will set up the following capabilities for your OpenShift home lab:

* OpenWRT Router #1 (GL.iNet GL-MV1000W Travel Router)
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
  * Nexus Registry service
  * Git repository server

Follow each of the guides below to create your lab:

1. [Edge Router](/home-lab/edge-router)
1. [Bastion Host](/home-lab/bastion-pi)
1. [Cluster Router](/home-lab/cluster-router)
1. [KVM Host Setup](/home-lab/kvm-host-setup)
1. [Prepare for OpenShift Install](/home-lab/prepare-okd-install)
1. [OpenShift Install](/home-lab/install-okd)
