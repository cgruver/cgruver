---
title: "What Is 3 X 3 + 1? or... I needed a new CLI..."
date:   2022-02-03 00:00:00 -0400
description: "Managing Multiple OpenShift Lab Domains with a CLI"
tags:
  - Kubernetes Home Lab
categories:
  - Blog Post
---
I've mentioned a couple of times that this year I am starting a project to build a cloud native application that is deployed across multiple regions.

This post is the official start of that project.  

It is not my direct intention to show you best practices right out of the gate.  The main reason is that I haven't done this before myself.  So, it's going to be a journey of learning.  Previously in my career, I have designed and helped to build POS and supply chain capabilities that are Active/Active/Active in a single data center and deployed across 2 data centers in an Active/Passive configuration.  That is typically what you will find these days, even in large cloud native applications.

__*But...*__ the holy grail, the big kahoona, the whole enchilada...  is an application that never goes down, is geographically dispersed, and maintains consistency, availability, and partition tolerance.

__Consistency, Availability, & Partition Tolerance,__ I vaguely recall reading something about that...

In the early days of distributed computing, a.k.a not everything runs on the mainframe anymore, a computer scientist by the name of [Eric Brewer](https://en.wikipedia.org/wiki/Eric_Brewer_(scientist)) postulated the CAP Principle.

This is your prerequisite reading assignment: [CAP Theorem - Wikipedia](https://en.wikipedia.org/wiki/CAP_theorem)

The CAP Theorem is what we are going to be working with or against on this multi-region journey.

However, before we get started...  we're going to need a multi-region OpenShift environment.

It is that need, that this first post in the series is dedicated to.

I have simplified the lab setup in order to make it easier for you to create and tear down OpenShift clusters and the infrastructure that supports them.

## __Introducing: `labcli`__ Check it out here: [Lab CLI](/home-lab/labcli/)

I used it this week to build this three region OpenShift setup: __3__ clusters, __3__ compute nodes each, plus a __Single Node OpenShift__ cluster for the management plane:

![Three Region Lab - Top View](/_pages/home-lab/images/multi-region-lab-top.jpg)

### Every good data center has a fire suppression system...  ;-)

![Three Region Lab - Front View](/_pages/home-lab/images/multi-region-lab-front.jpg)

__Here's a revised SNO install using the new `labcli`:__

1. [Workstation Setup](/home-lab/bare-metal-sno-workstation/)
1. [Network](/home-lab/network-setup/)
1. [Deploy Cluster](/home-lab/bare-metal-install-sno/)

In the next couple of weeks, I hope to post a video of the install process for the three region lab.
