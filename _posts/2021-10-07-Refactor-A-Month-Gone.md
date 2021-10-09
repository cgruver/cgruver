---
title: Where Did September Go?!
date:   2021-10-07 00:00:00 -0400
description: "Lab refactored to support multiple clusters"
tags:
  - intel nuc
  - okd
  - openshift
categories:
  - Home Lab
---
OK...  So, a little over a month ago I showed you how to add the Tekton-OpenShift Pipelines Operator to your lab, and then promised to give you some code to deploy...

Yeah...  So, that didn't happen, right?

#DayJob got really busy.

But, that's just an excuse...  The real reason is that in true ADHD fashion, I got distracted by something else.

Deploying code to a Dev environment is great.  But deploying code to a Prod environment is excellent!

I have refactored my lab projects to allow for easier creation of multiple clusters.  These clusters can be used as dev/qa/prod environments, or they can be used to represent different data centers.

|   The main changes are to the helper scripts that I provide here: [https://github.com/cgruver/okd-home-lab](https://github.com/cgruver/okd-home-lab)
|   I also refactored the lab configuration to use YAML instead of delimited files.

In the near future, (see, not promising dates this time...), I will show you how to create additional clusters which we will use for CI/CD or for multi-region application deployments.  Much fun to be had by all.

...and, yes.  We will start coding with Quarkus soon as well.

Check out the refactoring here:

| [Build A Kubernetes Home Lab with OKD4](/home-lab/lab-intro/)
| [Add Worker Nodes to Your Lab](/home-lab/worker-nodes/)
