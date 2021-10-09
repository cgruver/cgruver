---
title: And Now For Something Slightly Different... CodeReady Containers
date:   2021-08-27 00:00:00 -0400
description: "How To Build CodeReady Containers with OKD"
tags:
  - codeready
  - okd
  - openshift
categories:
  - Home Lab
  - Developer Tools
---
[CodeReady Containers](https://developers.redhat.com/products/codeready-containers/overview) is the successor to MiniShift, which was itself derived from [MiniKube](https://minikube.sigs.k8s.io/docs/).
It's purpose is to enable an OpenShift 4 based development environment on your local workstation.

In this post, I am going to show you how to build your own release of CRC using the community supported, OKD distribution of Kubernetes.  OKD shares its code base with Red Hat OpenShift.  The main distinction being that OKD is leveraging the upstream of Red Hat CoreOS, Fedora CoreOS.

See the following for more information on these projects:

* [OKD](https://www.okd.io)
* [Fedora CoreOS](https://docs.fedoraproject.org/en-US/fedora-coreos/)
* [Red Hat OpenShift](https://www.redhat.com/en/technologies/cloud-computing/openshift)
* [Red Hat CoreOS](https://cloud.redhat.com/learn/coreos/)

__Now, grab a little server and let's build our own release of CodeReady Containers__

Follow the tutorial here: [CodeReady Containers with OKD](/home-lab/okd-crc/)
