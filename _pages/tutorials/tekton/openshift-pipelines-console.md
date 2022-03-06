---
title: "OpenShift Pipelines (Tekton) - Console"
description: "Quick Tour of the OpenShift Pipelines Console"
sitemap: true
published: true
permalink: /tutorials/openshift-pipelines-console/
tags:
  - openshift pipelines
  - tekton
---
## There's a Console Too

Let's pause from our CLI work for a moment and take a look at the OpenShift Web Console as it relates to Pipelines.

I know, I know...  

You really don't care about the GUI right?  

You're all in on the CLI.  

Never fear, we'll get back to the CLI soon enough...

;-)

### Pipelines In The OpenShift Web Console

1. If you are currently in the `Developer` perspective, switch to the `Administrator` perspective:

   ![Console](/_pages/tutorials/tekton/images/Developer-Perspective.png)

   ![Console](/_pages/tutorials/tekton/images/Switch-Perspective.png)

   ![Console](/_pages/tutorials/tekton/images/Admin-Perspective.png)

   You should now see additional options in the left-hand nav bar.

1. From the left-hand nav bar, select `Home -> Projects`, then select the `my-app` project.

   You should now see the overview of the `my-app` project.

   ![Console](/_pages/tutorials/tekton/images/Project-Overview.png)

1. Now select `Pipelines` in the left-hand nav bar.

   ![Console](/_pages/tutorials/tekton/images/Expand-Pipelines.png)

   You should see an expanded list with `Pipelines`, `Tasks`, and `Triggers`.

1. Select `Pipelines` from the expanded view in the left-hand nav:

   From here, you can use the horizontal tabs to explore `Pipelines`, `PipelineRuns`, `PipelineResources`, and `Conditions`.

   __Note:__ PipelineResources are deprecated.  Don't use them.

   We haven't discussed `Conditions` yet.  We'll save that for later.

1. Look at the `Pipelines`:

   ![Console](/_pages/tutorials/tekton/images/View-Pipelines.png)

   Clicking into an item in the list of Pipelines will show you the details of that pipeline:

   ![Console](/_pages/tutorials/tekton/images/Pipeline-Menu.png)

   The stacked dot menu at the far right of each pipeline object in the list will expand to show you more options.

   Selecting `start` allows you to manually start a PipelineRun by providing the parameter values.

   ![Console](/_pages/tutorials/tekton/images/Start-Pipeline.png)

1. Look at the `PipelineRuns`:

   ![Console](/_pages/tutorials/tekton/images/View-PipelineRuns.png)

   Clicking into an item in the list of PipelineRuns will show you the details of that run:

   ![Console](/_pages/tutorials/tekton/images/PipelineRun-Details.png)

   ![Console](/_pages/tutorials/tekton/images/PipelineRun-Details-2.png)

1. Select `Tasks` from the expanded view in the left-hand nav:

   From here, you can use the horizontal tabs to explore `Tasks`, `TaskRuns`, and `ClusterTasks`

   ![Console](/_pages/tutorials/tekton/images/View-Tasks.png)

   ![Console](/_pages/tutorials/tekton/images/View-TaskRuns.png)

   ![Console](/_pages/tutorials/tekton/images/View-ClusterTasks.png)

   Clicking on any item in the list, will give you a detailed view of that item.

## So... that's the Console

We still haven't written any application code... compiled it...  or, deployed it.

That's kind of important for CI/CD.

We also need to put the `C` into CI/CD.

So, let's do that next.  Then we'll write some code!  I promise.

Go here for the next lesson: __[OpenShift Pipelines (Tekton) - Triggers Basics](/tutorials/tekton-triggers-basics/)__
