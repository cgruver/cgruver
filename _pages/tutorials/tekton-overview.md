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
## Introduction To Tekton

You can find a lot of great information about OpenShift Pipelines here: 

* OpenShift Official Documentation:
  * [OCP 4.9 Pipelines](https://access.redhat.com/documentation/en-us/openshift_container_platform/4.9/html/cicd/pipelines){:target="_blank"}
* Upstream Tekton Project:
  * [Tekton Pipelines](https://github.com/tektoncd/pipeline){:target="_blank"}
  * [Tekton Triggers](https://github.com/tektoncd/triggers){:target="_blank"}

In this tutorial, I am going to summarize a lot of information, and then focus on running code examples.

For the code examples, you will need access to an OpenShift cluster with the OpenShift Pipelines Operator installed.

Let's get some vocabulary out of the way first.  I'll include links to the upstream documentation for each item:

### Tekton Pipelines:

1. __[Task](https://github.com/tektoncd/pipeline/blob/main/docs/tasks.md){:target="_blank"}__

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

1. __[TriggerTemplate](https://github.com/tektoncd/triggers/blob/main/docs/triggertemplates.md){:target="_blank"}__

   A TriggerTemplate defines the Pipeline and/or Task resources, and the parameters which are passed to them

1. __[TriggerBinding](https://github.com/tektoncd/triggers/blob/main/docs/triggerbindings.md){:target="_blank"}__

   A TriggerBinding links values from a webhook payload to parameters that are passed to a TriggerTemplate

1. __[Interceptor](https://github.com/tektoncd/triggers/blob/main/docs/interceptors.md){:target="_blank"}__

   An Interceptor is used to perform validation or value-add activities on a webhook payload before it is passed to the TriggerTemplate for the execution of pipelines and or tasks

1. __[Trigger](https://github.com/tektoncd/triggers/blob/main/docs/triggers.md){:target="_blank"}__

   A Trigger is a custom resource that combines Interceptors, TriggerBindings, and TriggerTemplates into a unit

1. __[EventListener](https://github.com/tektoncd/triggers/blob/main/docs/eventlisteners.md){:target="_blank"}__

   An EventListener receives the webhook payload and passes it to one or more Triggers.  The EventListener is the only component in Tekton that is a long running process.  It runs as a Pod in the Namespace that it was created in.

### Pictorial View

__Here's an overview of all of the pieces, and how they are accociated:__

![TektonOverview](/_pages/tutorials/images/TektonOverview.png)

## Examples with Code:

Now, let's learn by doing.  You will need your workstation set up with the following tools:

* OpenJDK 11
* Apache Maven 3.8.4 or newer
* Git
* OpenShift Command line Tools
* Quarkus Command Line Tools

__Note:__ This tutorial assumes that you are using a Mac OS or Linux based workstation.  If you are on a Windows based system, you may be able to use Git Bash in Visual Studio Code.

### Start with the basics - Let's create a Task and run it

__Note:__ You need to be logged into your OpenShift cluster with the `oc` cli tool.  You will also need to log into the cluster console from a browser.

1. Create an OpenShift project for this lab:

   ```bash
   oc new-project my-app
   ```

1. Create a Task:

   Add the following content to a file named `first-task.yaml`

   ```yaml
   apiVersion: tekton.dev/v1beta1
   kind: Task
   metadata:
     name: buildah-demo-task
   spec:
     params:
     - name: app-name
       type: string
       description: The application name
     stepTemplate:
       volumeMounts:
       - name: varlibc
         mountPath: /var/lib/containers
     steps:
     - name: build-image
       image: quay.io/buildah/stable:latest
       securityContext:
         runAsUser: 1000
       imagePullPolicy: IfNotPresent
       script: |
         #!/bin/bash
         export BUILDAH_ISOLATION=chroot
         DESTINATION_IMAGE="image-registry.openshift-image-registry.svc:5000/$(context.taskRun.namespace)/$(params.app-name):latest"
         echo "**** Set arguments for buildah"
         BUILDAH_ARGS="--storage-driver vfs"
         echo "**** Create a new container from the ubi-minimal 8.5 image"
         CONTAINER=$( buildah ${BUILDAH_ARGS} from registry.access.redhat.com/ubi8/ubi-minimal:8.5 )
         echo "**** Create a simple application for the new container to run"
         cat << EOF > ./test.sh
         #!/bin/bash
         echo "---- hello there! ----"
         sleep 5
         echo "---- goodbye for now. ----"
         exit 0
         EOF
         chmod 750 ./test.sh
         echo "**** Copy the simple application to the new container"
         buildah ${BUILDAH_ARGS} copy ${CONTAINER} ./test.sh /application.sh
         echo "**** Set the entry point for the new container"
         buildah ${BUILDAH_ARGS} config --entrypoint '["/application.sh"]' ${CONTAINER}
         echo "**** Add a label to the new container"
         buildah ${BUILDAH_ARGS} config --label APP_LABEL="Hello This Is My Label" --author="Tekton" ${CONTAINER}
         echo "**** Save the new container image"
         buildah ${BUILDAH_ARGS} commit ${CONTAINER} ${DESTINATION_IMAGE}
         echo "**** Disconnect from the new container image"
         buildah ${BUILDAH_ARGS} unmount ${CONTAINER}
         echo "**** Push the new container image to the cluster image registry"
         buildah ${BUILDAH_ARGS} push ${DESTINATION_IMAGE} docker://${DESTINATION_IMAGE}
       env:
       - name: user.home
         value: /workspace
       workingDir: "/workspace"
     volumes:
     - name: varlibc
       emptyDir: {}
   ```

1. Create the Task in your `my-app` project:

   ```bash
   oc apply -f first-task.yaml -n my-app
   ```

1. Verify that the task exists in your namespace:

   ```bash
   oc get tasks -n my-app
   ```

   You should see your new Task listed in the output.

1. Now let's run the Task with a TaksRun:

   ```bash
   cat << EOF | oc apply -n my-app -f -
   apiVersion: tekton.dev/v1beta1
   kind: TaskRun
   metadata:
     name: my-buildah-demo-task-run
   spec:
     taskRef:
       name: buildah-demo-task
     params:
     - name: app-name
       value: my-demo-app
   EOF
   ```

1. Watch the logs of your TaskRun

   ```bash
   oc logs -f my-buildah-demo-task-run-pod -n my-app
   ```

   __Note:__ If you see an error like this:

   ```bash
   Error from server (BadRequest): container "step-build-image" in pod "my-buildah-demo-task-run-pod" is waiting to start: PodInitializing
   ```

   That's OK.  It just means that you were too fast for your cluster.  The Pod for the TaskRun is still initializing.  There are no logs to see yet.

   Run the above command again until you see the logs.
 
1. Run the container image that you just created in a Pod:

   ```bash
   cat << EOF | oc apply -n my-app -f -
   apiVersion: v1
   kind: Pod
   metadata:
     name: my-demo-app-pod
   spec:
     restartPolicy: Never
     containers:
     - name: my-demo-app-container
       image: image-registry.openshift-image-registry.svc:5000/my-app/test:latest
   EOF
   ```

1. Watch the logs of your Pod:

   ```bash
   oc logs -f my-demo-app-pod -c my-demo-app-container
   ```

### Let's talk about what we just did

__ ----Full Description of the Task goes here---- __

### Add a step to the Task that runs the new container image in a Pod

We just demonstrated a pretty basic Tekton Task.  Let's make it a bit more complex by adding a step to the Task that will create the Pod which we just created manually.

1. Add the following content to a file named `multi-step-task.yaml`

   ```yaml
   apiVersion: tekton.dev/v1beta1
   kind: Task
   metadata:
     name: multi-step-task
   spec:
     params:
     - name: app-name
       type: string
       description: The application name
     stepTemplate:
       volumeMounts:
       - name: varlibc
         mountPath: /var/lib/containers
     steps:
     - name: build-image
       image: quay.io/buildah/stable:latest
       securityContext:
         runAsUser: 1000
       imagePullPolicy: IfNotPresent
       script: |
         #!/bin/bash
         export BUILDAH_ISOLATION=chroot
         DESTINATION_IMAGE="image-registry.openshift-image-registry.svc:5000/$(context.taskRun.namespace)/$(params.app-name):latest"
         echo "**** Set arguments for buildah"
         BUILDAH_ARGS="--storage-driver vfs"
         echo "**** Create a new container from the ubi-minimal 8.5 image"
         CONTAINER=$( buildah ${BUILDAH_ARGS} from registry.access.redhat.com/ubi8/ubi-minimal:8.5 )
         echo "**** Create a simple application for the new container to run"
         cat << EOF > ./test.sh
         #!/bin/bash
         echo "---- hello there! ----"
         sleep 5
         echo "---- goodbye for now. ----"
         exit 0
         EOF
         chmod 750 ./test.sh
         echo "**** Copy the simple application to the new container"
         buildah ${BUILDAH_ARGS} copy ${CONTAINER} ./test.sh /application.sh
         echo "**** Set the entry point for the new container"
         buildah ${BUILDAH_ARGS} config --entrypoint '["/application.sh"]' ${CONTAINER}
         echo "**** Add a label to the new container"
         buildah ${BUILDAH_ARGS} config --label APP_LABEL="Hello This Is My Label" --author="Tekton" ${CONTAINER}
         echo "**** Save the new container image"
         buildah ${BUILDAH_ARGS} commit ${CONTAINER} ${DESTINATION_IMAGE}
         echo "**** Disconnect from the new container image"
         buildah ${BUILDAH_ARGS} unmount ${CONTAINER}
         echo "**** Push the new container image to the cluster image registry"
         buildah ${BUILDAH_ARGS} push ${DESTINATION_IMAGE} docker://${DESTINATION_IMAGE}
       env:
       - name: user.home
         value: /workspace
       workingDir: "/workspace"
     - name: create-pod
       image: image-registry.openshift-image-registry.svc:5000/openshift/cli
       imagePullPolicy: IfNotPresent
       script: |
         cat << EOF | oc apply -f -
         apiVersion: v1
         kind: Pod
         metadata:
           name: $(params.app-name)-pod
         spec:
           restartPolicy: Never
           containers:
           - name: $(params.app-name)-container
             image: image-registry.openshift-image-registry.svc:5000/$(context.taskRun.namespace)/$(params.app-name):latest
         EOF
     volumes:
     - name: varlibc
       emptyDir: {}
   ```

1. Create the new task:

   ```bash
   oc apply -f multi-step-task.yaml
   ```

1. Run the new task:

   ```bash
   cat << EOF | oc apply -n my-app -f -
   apiVersion: tekton.dev/v1beta1
   kind: TaskRun
   metadata:
     name: multi-step-task-run
   spec:
     taskRef:
       name: multi-step-task
     params:
     - name: app-name
       value: my-demo-app
   EOF
   ```

1. Watch the logs:

   __Note:__ This time we have to specify which container we want to see the logs from.  Since there are two steps in this Task, there will be two containers which run in the Pod.  The containers will have the same name as the Task step which they are running.

   ```bash
   oc logs -f multi-step-task-run-pod -c step-build-image -n my-app
   ```

## Wait! There's a CLI for This

OK, OK, let's pause here for a minute.  I've been showing you how to do everything with the `oc` cli.  However, there is a Tekton specific CLI that will make some things easier.

So, let's pause for a minute, and go get the Tekton CLI.

* Upstream Tekton CLI: [https://github.com/tektoncd/cli](https://github.com/tektoncd/cli){:target="_blank"}
* Red Hat OpenShift Supported CLI: [https://docs.openshift.com/container-platform/4.9/cli_reference/tkn_cli/installing-tkn.html](https://docs.openshift.com/container-platform/4.9/cli_reference/tkn_cli/installing-tkn.html){:target="_blank"}

Whether you are using Upstream Tekton or Red Hat OpenShift Pipelines, take some time now to install the CLI for your workstation OS.

__Got the CLI?  Good.  Let's Continue.__

Do this to get help with the `tkn` cli:

```bash
tkn --help
```

Now, let's redo the lask task run with the cli.

1. List the taskruns in your namespace (OpenShift Project):

   ```bash
   tkn taskrun list -n my-app
   ```

1. Delete all of the previous taskruns:

   __Note:__ This will also delete the completed Pods, and thus the logs for the old TaskRuns.

   ```bash
   tkn taskrun delete --all -n my-app
   ```

1. Delete the Pod created by the last TaskRun that we did.

   ```bash
   oc delete pod my-demo-app-pod -n my-app
   ```

1. Create a new TaskRun for the Task, `multi-step-task`

   ```bash
   cat << EOF | oc apply -n my-app -f -
   apiVersion: tekton.dev/v1beta1
   kind: TaskRun
   metadata:
     name: multi-step-task-run
   spec:
     taskRef:
       name: multi-step-task
     params:
     - name: app-name
       value: my-demo-app
   EOF
   ```

1. Watch the logs for the new TaskRun with the `tkn` cli:

   ```bash
   tkn taskrun logs multi-step-task-run -f -n my-app
   ```

   __Now, wasn't that nice?__

1. Create a TaskRun using the `tkn` cli:

   ```bash
   tkn task start multi-step-task -p app-name=my-other-app -n my-app
   ```

1. Watch the logs of the new TaskRun:

   ```bash
   tkn task logs multi-step-task -n my-app -f --last
   ```

   __Note:__ When you use the cli to create a TaskRun, it gets a randomized name.

### Now, let's create a Pipeline that will both build and run our new container image

1. Create a Task that will create a Pod from the new container image:

   Add the following content to a file named `second-task.yaml`

   ```yaml
   apiVersion: tekton.dev/v1beta1
   kind: Task
   metadata:
     name: create-pod-task
   spec:
     params:
     - name: app-name
       type: string
       description: The application name
     steps:
     - name: create-pod
       image: image-registry.openshift-image-registry.svc:5000/openshift/cli
       imagePullPolicy: IfNotPresent
       script: |
         cat << EOF | oc apply -f -
         apiVersion: v1
         kind: Pod
         metadata:
           name: $(params.app-name)-pod
         spec:
           restartPolicy: Never
           containers:
           - name: $(params.app-name)-container
             image: image-registry.openshift-image-registry.svc:5000/$(context.taskRun.namespace)/$(params.app-name):latest
         EOF
   ```

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
