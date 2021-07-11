---
layout: page
permalink: /home-lab/full-lab/
---
# Building a Kubernetes Home Lab with OKD 4

There are a lot of really good Kubernetes and OpenShift tutorials out there.  This one strives to be a little bit different in that it is going to simulate the network configuration found in a real data center environment.  This tutorial is targeted toward architects and engineers who are interested in both infrastructure and application development.  The resulting OpenShift cluster will be sized to do some serious compute work, and will be set up for CI/CD with Tekton Pipelines.

I have broken this tutorial up into multiple pages to help reduce the TL;DR that can result from really long pages.  Each section will guide you through the setup of a lab capability.  After the OpenShift cluster is up and running, we will add some capabilities to it, and get it setup to support application development.

We will start by setting up a layered network architecture that will enable us to isolate our OpenShift cluster from the internet.  We'll use firewall rules to white list the access that we want to grant.  With this setup, you will also be able to add additional, isolated clusters to your lab as you expand your capabilities.  The additional clusters can be used to simulate Dev -> QA -> Prod CI/CD, or multi-datacenter configurations.

This lab setup is also intended to be highly portable.  You will be able to fit the whole thing in a slim 15" laptop bag.

## Gear for your lab:

Below is the complete bill of materials for a full setup.  Don't freak out yet.  I will also list a minimal setup to get you started that you can build on.

* Network:
  * GL.iNet [GL-MV1000](https://www.gl-inet.com/products/gl-mv1000/) (Edge Router)
  * GL.iNet [GL-MV1000](https://www.gl-inet.com/products/gl-mv1000/) (Internal Router)
  * Raspberry Pi 4b 8GB (Bastion Host)
  * 5 port gigabit switch.
* Compute:
  * 3X Intel NUC10i7FNK configured with 64GB RAM & 1TB NVMe

You will need at least one physical server for your lab.  More is obviously better, but also more expensive.  I have built my lab around the small form-factor NUC systems that Intel builds.  My favorite is the [NUC10i7FNK](https://www.intel.com/content/www/us/en/products/boards-kits/nuc/kits/nuc10i7fnk.html).  This little machine sports a 6-core 10th Gen i7 processor at 25W TDP and supports 64GB of RAM.  Ideally you will have three of these enabling you to build a full, three master, three worker OpenShift cluster.

In the tutorial, we are going to set up the core services for our OpenShift home lab.

* OpenWRT Router #1 (GL.iNet Travel Router)
  * Edge internet access
  * Edge DNS services
  * External Firewall
* OpenWRT Router #2 (GL.iNet Travel Router)
  * PXE Boot
  * Internal Lab DNS Server
  * Internal Firewall
  * HA-Proxy Network Load Balancer
* OpenWRT Bastion Server (Raspberry Pi 4b 8GB)
  * CentOS Stream repository mirror
  * Nexus Registry service

## OpenWRT - With a slice of Pi

## __Setting up the Lab Router - GL.iNet GL-MV1000 or GL-MV1000W__

The router in this tutorial is based on the GL.iNet GL-MV1000 or GL-MV1000W "Brume" edge routers, but will also work with a GL-AR750S-Ext "Slate".

[GL-MV1000](https://www.gl-inet.com/products/gl-mv1000/)

The operating system is OpenWRT.  Find out more here: [OpenWRT](https://openwrt.org)

1. [Edge Router](/home-lab/edge-router)
1. [Bastion Host](/home-lab/bastion-pi)
1. [Cluster Router](/home-lab/cluster-router)