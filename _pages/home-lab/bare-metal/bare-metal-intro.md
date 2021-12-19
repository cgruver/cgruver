---
permalink: /home-lab/bare-metal-intro/
title: Building a Portable Kubernetes Home Lab with OKD4 on Bare Metal
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
Let's ditch the hypervisor and put our lab right on the metal!

This project is not for the feint of heart.  It will require some investment.  You are going to need at least 3 Intel NUC machines with a minimum of 2 cores and 32GB RAM each.

With the following list of parts, you will be able to power your cluster off of two power supplies, and pack the whole thing up in a slim 15" laptop bag.

Below is the complete bill of materials for your lab.  I've included Amazon.com and B&H Photo Video links to the gear that I have.

* Bare Metal Lab Gear:
  * [Network adapter for your workstation](https://www.amazon.com/gp/product/B08VN3DGK6/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1)
    * __Noter:__ You will not be able to use the WiFi in your MacBook for the bootstrap network bridge.  We'll need a physical adapter.
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
  * [Gigabit Network Switch](https://www.bhphotovideo.com/c/product/1614892-REG/ubiquiti_networks_usw_flex_mini_unifi_usw_flex_mini.html)
  * [Tomtoc 360 16-inch Laptop Shoulder Bag](https://www.amazon.com/gp/product/B082DTNLBJ/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1)
  * [240W slim Power Supply](https://www.amazon.com/gp/product/B07QZGLFWF/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1)
    * __Note:__ Get a 320W Power Supply if you use the NUC10i7FNK machines.  They need a bit more muscle for the 6 cores.
  * [7.4x5.0mm to 5.5x2.5mm Adapter](https://www.amazon.com/gp/product/B07W59BMSD/ref=ppx_od_dt_b_asin_title_s00?ie=UTF8&psc=1)
  * [5.5x2.5mm 1 to 4 splitter](https://www.amazon.com/gp/product/B07BBQ54K4/ref=ppx_yo_dt_b_search_asin_title?ie=UTF8&psc=1)
  * 3 X Intel NUC10i3FNK configured with 32 or 64GB RAM & 1TB NVMe

     Other NUC models will work as well.  The slim models are much more portable, so I tend to prefer those.  I love the NUC10i7FNK because it has 6 cores.  That's 12 vCPUs for your nodes!!!
     Prices fluctuate so much on the NUCs, M2 NVMe, and RAM that I am not listing any links here.  But I get most of my compute gear from [B&H Photo Video](https://www.bhphotovideo.com), or [Amazon.com](https://www.amazon.com).

It will look like this: 

![Bare Metal Lab](/_pages/home-lab/bare-metal/images/bare-metal-lab.jpg)

![Bare Metal Lab](/_pages/home-lab/bare-metal/images/bare-metal-front.jpg)

![Bare Metal Lab](/_pages/home-lab/bare-metal/images/bare-metal-bag.jpg)

![Bare Metal Lab](/_pages/home-lab/bare-metal/images/NetworkTopologyBareMetal.png)

Most of the bare-metal configuration is going to be just like the KVM setup that I posted previously.  The one significant difference for this setup, is that we are going to run the bootstrap node from our workstation.  In this case, a MacBook Pro with 16GB of RAM.

Everything else is pretty much the same.  The cluster nodes will boot via iPXE, retrieve their ignition configs, and run the installation.

Let's get to it!

Go here first:  [Setting up Your Workstation for a Bare Metal OKD install](/home-lab/bare-metal-okd-workstation/) Then, follow the links at the end of each section.
