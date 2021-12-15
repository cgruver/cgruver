---
title: "Time for some Metal!!! Good Bye Hypervisor..."
date:   2021-12-13 00:00:00 -0400
description: "Installing OKD on Bare Metal Intel NUCs"
tags:
  - Bare Metal OpenShift Install
  - Bare Metal Kubernetes
  - Intel NUC
categories:
  - Home Lab
---
Let's ditch the hypervisor and put our lab right on the metal!

First, go listen to __[this](https://www.youtube.com/watch?v=tMDFv5m18Pw)__.  It will put you in the right frame of mind for what's to come.

OK, now let's talk about this installation.

This project is not for the feint of heart.  It will require some investment.  You are going to need at least 3 Intel NUC machines with a minimum of 2 cores and 32GB RAM each.

I am going to show you a full cluster install on some of my older machines.

The control plane nodes are:  NUC8i3BEK machines with 32GB of RAM and 500GB SATA M.2 SSDs.

The worker nodes are: NUC6i7KYK machines with 64GB of RAM, 256GB SATA SSD for FCOS, and 1TB SATA SSD for Ceph.

![Bare Metal](/_pages/home-lab/bare-metal/images/bare-metal.jpg)

Most of the configuration is going to be just like the KVM setup that I posted previously.  In fact, I have refactored the lab helper scripts to support both KVM and Bare metal installations.

The one significant difference for this setup, is that we are going to run the bootstrap node from our workstation.  In this case, a MacBook Pro with 16GB of RAM.

Everything else is pretty much the same.  The cluster nodes with boot via iPXE, retrieve their ignition configs, and run the installation.

Let's get to it!

Go here first:  [Setting up Your Workstation for a Bare Metal OKD install](/home-lab/bare-metal-okd-workstation/)
