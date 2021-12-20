---
permalink: /home-lab/kvm-lab-intro/
title: Building a Portable Kubernetes Home Lab with OKD4 and KVM
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
Below is the complete bill of materials for your starter lab.  I've included Amazon.com links to the gear that I have.

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

Get started here:

__[Prepare your Workstation](/home-lab/workstation/)__

