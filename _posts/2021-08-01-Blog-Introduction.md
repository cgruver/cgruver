---
title:  "Let's build an OpenShift Home Lab!"
date:   2021-08-01 12:00:00 -0400
description: "Build a Kubernetes Home Lab / OpenShift Home Lab with OKD, OpenWrt, and Raspberry Pi"
categories:
  - OpenShift
  - Home Lab
  - Kubernetes
tags:
  - openshift
  - okd
  - home lab
  - kubernetes
  - openwrt
---
## Greetings, and Welcome to my Kube world

It has taken me a year to get to this point.  ...and what a CRAZY year this has been.  Right?!?!?

Like many people, I changed careers in the middle of a global pandemic.  The massive reset switch that this thing has placed on our lives has upended everything for so many.  They have lost loved ones, they have lost economic security, they have lost direction.  But in the midst of all of this chaos, some new paradigms have emerged as well.  Time will tell how we look back on the last couple of years.  For me and my wife, it became a time to focus on the things that are most important to us and make some changes.  So, we simplified.

But enough of that.

__Without further ado...  Welcome to my new Blog:__

Technology is one of my many hobbies.  I write code and learn new things for fun and relaxation, which naturally led me to seek out ways to take my tech toys with me when travelling.

So...  For my inaugural blog post, I am going to show you how to build an OpenShift lab that you can pack in a small bag.  We'll be using [OKD](https://www.okd.io).  OKD is the Kubernetes distribution that [Red Hat OpenShift](https://cloud.redhat.com/learn/what-is-openshift) is built on.  The main difference is that OKD sits on top of [Fedora CoreOS](https://getfedora.org/en/coreos?stream=stable), the upstream of [Red Hat CoreOS](https://cloud.redhat.com/learn/coreos/).

There are a lot of really good Kubernetes and OpenShift tutorials out there.  This one strives to be a little bit different in that it is going to simulate the network configuration found in a real data center environment.  This tutorial is targeted toward architects and engineers who are interested in both infrastructure and application development.  This is not Code Ready Containers, or MiniKube.  Both of those are excellent developer tools and can be used to learn Kubernetes basics.  No, what you will build from the following tutorial will be a production like OpenShift cluster.  Your new lab will be very expandable as well.  Add more KVM hosts, and you can build more sophisticated OpenShift environments.

I have broken this tutorial up into multiple pages to help reduce the TL;DR that can result from really long pages.  Each section will guide you through the setup of a lab capability.  After the OpenShift cluster is up and running, future blog posts will show you how to add some capabilities to it, and get it setup to support application delivery.

We will start by setting up a layered network architecture that will enable us to isolate our OpenShift cluster from the internet.  We'll use firewall rules to allow the access that we want to grant.  With this setup, you will also be able to add additional, isolated clusters to your lab as you expand your capabilities.  The additional clusters can be used to simulate Dev -> QA -> Prod CI/CD, or multi-datacenter configurations.

We'll start small, and grow from there:

Below is the complete bill of materials for your started lab.  I've included Amazon.com links to the gear that I have.

* Network:
  * [GL.iNet GL-MV1000W](https://www.amazon.com/gp/product/B08DCFBV3H/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1) (Edge Router with WiFi)
    * __Note:__ You may also be able to use the less expensive [GL.iNet GL-AR750S-Ext](https://www.amazon.com/GL-iNet-GL-AR750S-Ext-pre-Installed-Cloudflare-Included/dp/B07GBXMBQF/ref=sr_1_3?dchild=1&keywords=gl.iNet&qid=1627902663&sr=8-3)  But, while it has dual-band WiFi, it is much more limited on internal storage, CPU, and RAM.
  * [GL.iNet GL-MV1000](https://www.amazon.com/gp/product/B07ZJD5BZY/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1) (Internal Router)
    * __Note:__ The GL-AR750S-Ext will not work for this function.
  * [Raspberry Pi 4b 8GB](https://www.amazon.com/gp/product/B089ZZ8DTV/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1) (Bastion Host)
  * [SD Card for the Pi](https://www.amazon.com/gp/product/B08RG6XJZD/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1)
  * [Anker 63W 4 Port PIQ 3.0 & GaN Fast Charger Adapter](https://www.amazon.com/gp/product/B088TFZ942/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1)
    * __Note:__ I use this Anker power supply to run the routers and Pi off of one brick.  It saves valuable bag space when travelling.
  * [USB C cables](https://www.amazon.com/gp/product/B08R68T84N/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1)
  * [USB A to USB C cables](https://www.amazon.com/gp/product/B08T5VXQN3/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1)
  * [Network Cables](https://www.amazon.com/gp/product/B07958727H/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1)
* Compute:
  * Intel NUC10i7FNK configured with 64GB RAM, (2 X 32GB) & 1TB NVMe

     Other NUC models will work as well.  The key is to have at least 4 cores.  The slim models are much more portable, so I tend to prefer those.  I love the NUC10i7FNK because it has 6 cores.  That's 12 vCPUs for your lab!!!
     Prices fluctuate so much on the NUCs, M2 NVMe, and RAM that I am not listing any links here.  But I get most of my compute gear from [B&H Photo Video](https://www.bhphotovideo.com), or Amazon.com.  __Note:__ I am not an affiliate with either outlet, so no kickbacks here.

__Here is a picture of the complete set up:__

![Home Lab Starter](/_pages/home-lab/images/HomeLab.png)

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

The network topology will look like this illustration:

![Network topology](/_pages/home-lab/images/NetworkTopology.png)

Go here to get started: [Building a Portable Kubernetes Home Lab with OpenShift - OKD4](/home-lab/lab-intro/)
