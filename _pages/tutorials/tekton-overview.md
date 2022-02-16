---
title: "OpenShift Pipelines (Tekton) - Overview & Tutorial"
description: "Description of the Tekton manifests provided for this lab"
sitemap: false
published: false
permalink: /tutorials/tekton-overview/
tags:
  - openshift pipelines
  - tekton
  - tekton triggers
  - Gitea Webhooks
---
## Introduction To Tekton

You can find a lot of great information about OpenShift Pipelines here: 

* OpenShift Official Documentation:
  * [OCP 4.9 Pipelines](https://access.redhat.com/documentation/en-us/openshift_container_platform/4.9/html/cicd/pipelines){:target="_blank"}
* Upstream Tekton Project:
  * [Tekton Pipelines](https://github.com/tektoncd/pipeline){:target="_blank"}
  * [Tekton Triggers](https://github.com/tektoncd/triggers){:target="_blank"}

In this tutorial, I am going to summarize a lot of information, and then focus on running code examples.

For the code examples, you will need access to an OpenShift cluster with the OpenShift Pipelines Operator installed.

### Tekton Overview:

Let's get some vocabulary out of the way first.  I'll include links to the upstream documentation for each item:

1. [Task](https://github.com/tektoncd/pipeline/blob/main/docs/tasks.md){:target="_blank"}

   __Note:__ When you look at the documentation, take care to note that [PipelineResources](https://github.com/tektoncd/pipeline/blob/main/docs/resources.md){:target="_blank"} are deprecated.  Don't use them.  I'll be showing you how to build pipelines without them.

   * Task is the basic unit-of-work for Tekton
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

1. [TaskRun](https://github.com/tektoncd/pipeline/blob/main/docs/taskruns.md){:target="_blank"}

   A TaskRun creates an instance of a Task with specified parameter values, and runs it in a Pod

1. [Pipeline](https://github.com/tektoncd/pipeline/blob/main/docs/pipelines.md){:target="_blank"}

   A Pipeline composes Tasks into chains of sequential or parallel work

   * Pipelines accept parameters which can be passed to the Tasks
   * Pipelines support logic to determine whether or not a given Task should execute based on runtime conditions
   * Pipelines support Workspaces which can be attached to PVCs to provide shared state across Tasks

1. [PipelineRun](https://github.com/tektoncd/pipeline/blob/main/docs/pipelineruns.md){:target="_blank"}

   A PipelineRun creates an instance of a Pipeline with specified parameter values, and runs it by creating a TaskRun for each Task in the appropriate order



1. [TriggerTemplate](https://github.com/tektoncd/triggers/blob/main/docs/triggertemplates.md){:target="_blank"}

   A TriggerTemplate defines the Pipeline and/or Task resources, and the parameters which are passed to them

1. [TriggerBinding](https://github.com/tektoncd/triggers/blob/main/docs/triggerbindings.md){:target="_blank"}

   A TriggerBinding links values from a webhook payload to parameters that are passed to a TriggerTemplate

1. [Interceptor](https://github.com/tektoncd/triggers/blob/main/docs/interceptors.md)

   An Interceptor is used to perform validation or value-add activities on a webhook payload before it is passed to the TriggerTemplate for the execution of pipelines and or tasks

1. [Trigger](https://github.com/tektoncd/triggers/blob/main/docs/triggers.md){:target="_blank"}

   A Trigger is a custom resource that combines Interceptors, TriggerBindings, and TriggerTemplates into a unit

1. [EventListener](https://github.com/tektoncd/triggers/blob/main/docs/eventlisteners.md){:target="_blank"}

   An EventListener receives the webhook payload and passes it to one or more Triggers.  The EventListener is the only component in Tekton that is a long running process.  It runs as a Pod in the Namespace that it was created in.

__Here's an overview of all of the pieces, and how they are accociated:__

![TektonOverview](/_pages/tutorials/images/TektonOverview.png)

## Examples with Code:

Now, let's learn by doing.  You will need your workstation set up with the following tools:

* OpenJDK 11
* Apache Maven 3.6.3+
* Git
* OpenShift Command line Tools
* Quarkus Command Line Tools

This tutorial assumes that you are using a Mac OS or Linux based workstation.

### Quarkus Application

```bash
quarkus create app --maven --java=11 --no-wrapper --package-name=fun.is.quarkus.demo fun.is.quarkus:app-demo:0.1
```

```bash
cd app-demo
git init
git branch -m trunk
git add .
git commit -m "init"
```

```bash
git remote add origin https://gitea.${LAB_DOMAIN}:3000/demo/app-demo
git push --set-upstream origin trunk
```

```yaml

```
