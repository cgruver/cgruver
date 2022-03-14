---
title: "OpenShift Pipelines (Tekton) - Tutorial"
description: "Introduction & Tutorial to Tekton and Tekton Triggers"
sitemap: true
published: true
permalink: /tutorials/tekton-intro/
tags:
  - openshift pipelines
  - tekton
  - tekton triggers
  - Gitea Webhooks
---
## __Note: Work-In-Progress__ Some sections are incomplete, and there are plenty of spelling and grammar errors

## Introduction To Tekton

In this tutorial, I am going to summarize a lot of information, and then focus on running code examples.

The intent is to get you up and running quickly with more than just a "Hello World".  I'm going to walk you through all of the pieces of the Tekton ecosystem that you will need to build a full CI/CD pipeline for your code.

You can find a lot of great information about OpenShift Pipelines here:

* __OpenShift Pipelines Official Documentation:__
  * [OCP 4.9 Pipelines](https://access.redhat.com/documentation/en-us/openshift_container_platform/4.9/html/cicd/pipelines){:target="_blank"}
* __Upstream Tekton Project:__
  * [Tekton Pipelines](https://github.com/tektoncd/pipeline){:target="_blank"}
  * [Tekton Triggers](https://github.com/tektoncd/triggers){:target="_blank"}

### Pre-Requisites

1. For the code examples, you will need access to an OpenShift cluster with the OpenShift Pipelines Operator installed.

   If you have a beefy developer workstation, then [Code Ready Containers](https://cloud.redhat.com/openshift/create/local){:target="_blank"} may work for you.

   I also have some lab tutorials that you may be interested in: [https://upstreamwithoutapaddle.com](https://upstreamwithoutapaddle.com){:target="_blank"}

   If you use Code Ready Containers, you need to give it at least 12GB of RAM, (16GB is better):

   ```bash
   crc setup
   crc config set memory 12288
   crc start
   ```

   The default memory allocation for CRC is just enough for the cluster and its default operators to run.  It won't support much else.

1. You will also need to have the OpenShift Pipelines Operator installed in your cluster.  Install it via Operator Hub, or if you are following one of my lab tutorials, you can install it from the upstream Tekton project here: [Install Tekton Pipelines](/home-lab/tekton-install/){:target="_blank"}

   If you are installing via Operator Hub, you need to log into your cluster as a cluster admin user.

   1. Navigate to `Operator Hub` in the left-hand nav menu:
      
      ![Operator](/_pages/tutorials/tekton/images/Operator-Hub.png)
    
   1. Type `pipelines` into the search dialog:

      ![Operator](/_pages/tutorials/tekton/images/Operator-Hub-Search.png)

    1. Select the `Red Hat OpenShift Pipelines` operator and select `Install`

       ![Operator](/_pages/tutorials/tekton/images/Operator-Hub-Pipelines.png)

    1. Select `Install`:

       ![Operator](/_pages/tutorials/tekton/images/Operator-Hub-Install-Pipelines.png)

    1. Wait for the installation to complete:

       ![Operator](/_pages/tutorials/tekton/images/Operator-Hub-Installing.png)

       ![Operator](/_pages/tutorials/tekton/images/Operator-Hub-Installed.png)

1. Your workstation will need to be set up with the following tools:

   * OpenJDK 11
   * Apache Maven 3.8.4 or newer
   * Git
   * OpenShift Command line Tools
   * Quarkus Command Line Tools
   * Curl

1. __Note:__ This tutorial assumes that you are using a workstation with a `bash` or `zsh` shell.  If you are on a Windows based system, you may be able to use Git Bash in Visual Studio Code.

This tutorial is broken up into chapters.  Each chapter builds on the previous one, so please follow them in order.

1. __[OpenShift Pipelines (Tekton) - Overview](/tutorials/tekton-overview/){:target="_blank"}__

1. __[OpenShift Pipelines (Tekton) - Basics - Tasks](/tutorials/tekton-basics-tasks/){:target="_blank"}__

1. __[OpenShift Pipelines (Tekton) - Basics - Pipelines](/tutorials/tekton-basics-pipelines/){:target="_blank"}__

1. __[OpenShift Pipelines (Tekton) - Console](/tutorials/openshift-pipelines-console/){:target="_blank"}__

1. __[OpenShift Pipelines (Tekton) - Triggers Basics](/tutorials/tekton-triggers-basics/){:target="_blank"}__

1. __[OpenShift Pipelines (Tekton) - Triggers with a cup of Gitea - Cluster Setup](/tutorials/tekton-triggers-gitea-setup/){:target="_blank"}__

1. __[OpenShift Pipelines (Tekton) - Triggers with a cup of Gitea - Quarkus Demo](/tutorials/tekton-triggers-gitea-demo/){:target="_blank"}__
