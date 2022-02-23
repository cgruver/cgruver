---
title: "OpenShift Pipelines (Tekton) - Overview & Tutorial"
description: "Introduction to Tekton and Tekton Triggers"
sitemap: true
published: true
permalink: /tutorials/tekton-overview/
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

1. Your workstation will need to be set up with the following tools:

   * OpenJDK 11
   * Apache Maven 3.8.4 or newer
   * Git
   * OpenShift Command line Tools
   * Quarkus Command Line Tools

1. __Note:__ This tutorial assumes that you are using a workstation with a `bash` or `zsh` shell.  If you are on a Windows based system, you may be able to use Git Bash in Visual Studio Code.

## Time for some Vocabulary

Let's get the Tekton vocabulary out of the way first.  I'll include links to the upstream documentation for each item:

There are two main components to Tekton - Pipelines & Triggers

### Tekton Pipelines:

Let's cover the components of Pipelines first:

Pipelines is composed of the Tekton elements that will actually orchestrate and run your code builds, tests, and deployments.  It is made up of these main components:

1. Task
1. ClusterTask
1. TaskRun
1. Pipeline
1. PipelineRun

Here is a brief description of each, with a link to the upstream documentation:

1. __[Task](https://github.com/tektoncd/pipeline/blob/main/docs/tasks.md){:target="_blank"}__

   Task is the basic unit-of-work for Tekton.

   * A Task is composed of [Steps](https://github.com/tektoncd/pipeline/blob/main/docs/tasks.md#defining-steps){:target="_blank"}
   * A Task accepts parameters which can be used by the Steps to drive logic & set the runtime environment
   * Each Step executes it's work within a container
   * A Task runs in a Pod
     * Each container associated with a step, runs in the Task Pod
     * All of the Steps in a Task are able to share the resources of the Pod
       * ConfigMaps
       * Secrets
       * Volumes
       * etc...
  
   ![TektonTask](/_pages/tutorials/images/TektonTask.png)

   __Note:__ When you look at the documentation, take care to note that [PipelineResources](https://github.com/tektoncd/pipeline/blob/main/docs/resources.md){:target="_blank"} are deprecated.  Don't use them.  I'll be showing you how to build pipelines without them.

1. __[ClusterTask](https://github.com/tektoncd/pipeline/blob/main/docs/tasks.md#task-vs-clustertask){:target="_blank"}__

   A ClusterTask is a Task which is cluster scoped, and therefore can be used by any namespace in the cluster.

1. __[TaskRun](https://github.com/tektoncd/pipeline/blob/main/docs/taskruns.md){:target="_blank"}__

   A TaskRun creates an instance of a Task with specified parameter values, and runs it in a Pod

1. __[Pipeline](https://github.com/tektoncd/pipeline/blob/main/docs/pipelines.md){:target="_blank"}__

   A Pipeline composes Tasks into chains of sequential or parallel work

   * Pipelines accept parameters which can be passed to the Tasks
   * Pipelines support logic to determine whether or not a given Task should execute based on runtime conditions
   * Pipelines support Workspaces which can be attached to PVCs to provide shared state across Tasks

1. __[PipelineRun](https://github.com/tektoncd/pipeline/blob/main/docs/pipelineruns.md){:target="_blank"}__

   A PipelineRun creates an instance of a Pipeline with specified parameter values, and runs it by creating a TaskRun for each Task in the appropriate order

### Tekton Triggers

Triggers is the event driven side of Tekton.  These elements put the `C` in CI/CD.

Triggers has 5 main components:

1. TriggerTemplate
1. TriggerBinding
1. Trigger
1. EventListener
1. Interceptor

Here is a brief description of each, with a link to the upstream documentation:

1. __[TriggerTemplate](https://github.com/tektoncd/triggers/blob/main/docs/triggertemplates.md){:target="_blank"}__

   A TriggerTemplate defines the Pipeline and/or Task resources, and the parameters which are passed to them

1. __[TriggerBinding](https://github.com/tektoncd/triggers/blob/main/docs/triggerbindings.md){:target="_blank"}__

   A TriggerBinding links values from a webhook payload to parameters that are passed to a TriggerTemplate

1. __[Trigger](https://github.com/tektoncd/triggers/blob/main/docs/triggers.md){:target="_blank"}__

   A Trigger is a custom resource that combines Interceptors, TriggerBindings, and TriggerTemplates into a unit

1. __[EventListener](https://github.com/tektoncd/triggers/blob/main/docs/eventlisteners.md){:target="_blank"}__

   An EventListener receives the webhook payload and passes it to one or more Triggers.  The EventListener is the only component in Tekton that is a long running process.  It runs as a Pod in the Namespace that it was created in.

1. __[Interceptor](https://github.com/tektoncd/triggers/blob/main/docs/interceptors.md){:target="_blank"}__

   An Interceptor is used to perform validation or value-add activities on a webhook payload before it is passed to the TriggerTemplate for the execution of pipelines and or tasks

### Pictorial View

__Here's an overview of all of the pieces, and how they are accociated:__

![TektonOverview](/_pages/tutorials/images/TektonOverview.png)

__Note:__ We'll talk later about Workspaces & PVCs.

## It's Time To Write Some Code:

Now, let's learn by doing.

Go to the first lesson here: __[OpenShift Pipelines (Tekton) - Basics](/tutorials/tekton-basics/){:target="_blank"}__
