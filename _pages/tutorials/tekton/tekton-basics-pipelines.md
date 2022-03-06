---
title: "OpenShift Pipelines (Tekton) - Basics - Pipelines"
description: "Coding Basic Tekton Pipelines"
sitemap: true
published: true
permalink: /tutorials/tekton-basics-pipelines/
tags:
  - openshift pipelines
  - tekton
---
## We're getting familiar with Tasks, let's move on to creating a Pipeline

Let's separate the steps in our multi step Task into two separate Tasks, and orchestrate them with a Pipeline.

1. Create the Task to build the container image:

   Take a look at the file named `build-task.yaml` in `tutorial-resources/basics`

   ```yaml
   apiVersion: tekton.dev/v1beta1
   kind: Task
   metadata:
     name: build-image
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
         BUILDAH_ARGS="--storage-driver vfs"
         CONTAINER=$( buildah ${BUILDAH_ARGS} from registry.access.redhat.com/ubi8/ubi-minimal:8.5 )
         cat << EOF > ./test.sh
         #!/bin/bash
         echo "---- hello there! ----"
         sleep 5
         echo "---- goodbye for now. ----"
         exit 0
         EOF
         chmod 750 ./test.sh
         buildah ${BUILDAH_ARGS} copy ${CONTAINER} ./test.sh /application.sh
         buildah ${BUILDAH_ARGS} config --entrypoint '["/application.sh"]' ${CONTAINER}
         buildah ${BUILDAH_ARGS} config --label APP_LABEL="Hello This Is My Label" --author="Tekton" ${CONTAINER}
         buildah ${BUILDAH_ARGS} commit ${CONTAINER} ${DESTINATION_IMAGE}
         buildah ${BUILDAH_ARGS} unmount ${CONTAINER}
         buildah ${BUILDAH_ARGS} push ${DESTINATION_IMAGE} docker://${DESTINATION_IMAGE}
       env:
       - name: user.home
         value: /workspace
       workingDir: "/workspace"
     volumes:
     - name: varlibc
       emptyDir: {}
   ```

1. Create a Task that will create a Pod from the new container image:

   Take a look at the file named `pod-task.yaml` in `tutorial-resources/basics`

   ```yaml
   apiVersion: tekton.dev/v1beta1
   kind: Task
   metadata:
     name: create-pod
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

1. Create the Tasks in your OpenShift project:

   ```bash
   oc apply -f ./basics/build-task.yaml -n my-app
   oc apply -f ./basics/pod-task.yaml -n my-app
   ```

1. Verfy that the two new Tasks appear in your project:

   ```bash
   oc get tasks -n my-app
   ```

   ```bash
   NAME                AGE
   build-image         7s
   buildah-demo-task   3h26m
   create-pod          15s
   multi-step-task     80m
   ```

1. Do it again with the `tkn` cli:

   ```bash
   tkn task list -n my-app
   ```

   ```bash
   NAME                DESCRIPTION   AGE
   build-image                       51 minutes ago
   buildah-demo-task                 4 hours ago
   create-pod                        51 minutes ago
   multi-step-task                   2 hours ago
   ```

   It's always nice to have multiple ways to get to the same answer...

OK.  We've got our two Tasks.  Let's wire them together with a Pipeline:

1. Create a YAML definition for the Pipeline:

   Take a look at the file named `build-run-pipeline.yaml` in `tutorial-resources/basics`

   ```yaml
   apiVersion: tekton.dev/v1beta1
   kind: Pipeline
   metadata:
     name: build-container-run-pod
   spec:
     params:
     - name: app-name
       type: string
       description: The application name
     - name: run-it
       type: string
       description: Should I run the new container image?
     tasks:
     - name: build
       taskRef:
         name: build-image
       params:
       - name: app-name
         value: $(params.app-name)
     - name: run
       taskRef:
         name: create-pod
       runAfter:
       - build
       when:
       - input: "$(params.run-it)"
         operator: in
         values: ["yes-please"]
       params:
       - name: app-name
         value: $(params.app-name)
   ```

1. Add the Pipeline to your OpenShift Project:

   ```bash
   oc apply -f ./basics/build-run-pipeline.yaml -n my-app
   ```

1. Verify that is was created properly:

   ```bash
   oc get pipeline -n my-app
   ```

   ```bash
   NAME                      AGE
   build-container-run-pod   78s
   ```

   __Note:__ I've been subtly showing you something here.  The names of the YAML files are arbitrary.  It's the `metadata.name` value that matters.

1. Oh yeah...  We have the `tkn` cli too:

   ```bash
   tkn pipeline list -n my-app
   ```

   ```bash
   NAME                      AGE             LAST RUN   STARTED   DURATION   STATUS
   build-container-run-pod   4 minutes ago   ---        ---       ---        ---
   ```

   Hey!  That has more info in it!  Nice!

1. Before we talk about what's in our new Pipeline, let's run it:

   ```bash
   cat << EOF | oc apply -n my-app -f -
   apiVersion: tekton.dev/v1beta1
   kind: PipelineRun
   metadata:
     name: my-app-pipeline-run
     labels:
       app-name: my-app-pipeline
   spec:
     serviceAccountName: pipeline
     pipelineRef: 
       name: build-container-run-pod
     params:
     - name: app-name
       value: my-app
     - name: run-it
       value: no-thanks
   EOF
   ```

1. You can watch the logs:

   ```bash
   tkn pipelinerun logs my-app-pipeline-run -f -n my-app
   ```

1. You can check the status:

   ```bash
   tkn pipelinerun describe my-app-pipeline-run -n my-app
   ```

1. Wait for it...

1. Did you catch that?

1. Look closely...  

   You will see that only one Task ran.

   The PipelineRun completed successfully, but only ran the `build` task.  It did not run the Pod!

1. Let's try again: (Yes, I'm going somewhere with this.)

   ```bash
   cat << EOF | oc apply -n my-app -f -
   apiVersion: tekton.dev/v1beta1
   kind: PipelineRun
   metadata:
     name: my-app-pipeline-run-take-two
     labels:
       app-name: my-app-pipeline
   spec:
     serviceAccountName: pipeline
     pipelineRef: 
       name: build-container-run-pod
     params:
     - name: app-name
       value: my-app
     - name: run-it
       value: yes-please
   EOF
   ```

1. Watch the logs:

   ```bash
   tkn pipelinerun logs my-app-pipeline-run-take-two -f -n my-app
   ```

1. Check the status:

   ```bash
   tkn pipelinerun describe my-app-pipeline-run-take-two -n my-app
   ```

1. Note that this time, both Tasks ran.

   ```bash
   oc logs my-app-pod
   ```

   ```bash
   ---- hello there! ----
   ---- goodbye for now. ----
   ```

## Time To Examine the Pipeline and PipelineRun

Just like Task & TaskRun, Pipeline & PipelineRun are examples of CustomResources that enhance the Kubernetes API.

### Pipeline Details

Let's take a look at our Pipeline first:

The `spec:` in our Pipeline, has two elements.

1. `params:` Defines a list of parameters that the Pipeline will accept.

   In this example, we have two parameters. You will see how they are being used when we discuss the Task orchestration below.

   ```yaml
   ...
   params:
   - name: app-name
     type: string
     description: The application name
   - name: run-it
     type: string
     description: Should I run the new container image?
   ...
   ```

1. `tasks:` Defines the list of Tasks that are part of this Pipeline, and how they are wired together.

   ```yaml
   ...
   tasks:
   - name: build
     taskRef:
       name: build-image
     params:
     - name: app-name
       value: $(params.app-name)
   - name: run
     taskRef:
       name: create-pod
     runAfter:
     - build
     when:
     - input: "$(params.run-it)"
       operator: in
       values: ["yes-please"]
     params:
     - name: app-name
       value: $(params.app-name)
   ...
   ```

   Let's take apart the list of `tasks:`.

   | | |
   |`name:`|A unique identifier of the task within the context of this Pipeline|
   |`taskRef.name:`|A reference to a specific Task object|
   |`runAfter:`|A list of Tasks which must complete before this `task` is run.  This allows you to chain Tasks together.  Note, tasks which do not specify chaining, will be run in parallel.|
   |`when`|A list of conditions which must be met for this task to run.  __Note:__ This is how we controlled the execution of the `run` task in our examples above.|
   |`params`|The list of parameters that are passed to the task.|

   Take a look at the Upstream documentation to understand the full depth and flexibility available in a [Pipeline](https://github.com/tektoncd/pipeline/blob/main/docs/pipelines.md){:target="_blank"}.  You can build some serious [Rube Goldberg Devices](https://en.wikipedia.org/wiki/Rube_Goldberg_machine){:target="_blank"} with Pipelines.  So please, for the love of all that is beautiful and good, be careful.  ;-)

1. `workspaces:` We haven't talked about these yet.  But, I'm going to mention them anyway.

   Workspaces are a mechanism by which Tasks can share state information.  The workspaces are actually defined in a PipelineRun, and can be associated with a PersistentVolumeClaim, a Kubernetes Secret, or a ConfigMap.

   More on workspaces later.

### PipelineRun Details

Now, let's look at the PipelineRun:

Our PipelineRun is a fairly minimal example.  It has three elements:

1. `serviceAccountName:`  This declares the namespace scoped service-account that we want the Pods, of our Tasks in our Pipeline to run under.  __Note:__ This can also be declared as a list by `serviceAccountNames:` in order to specify different service-accounts at the Task level.

1. `pipelineRef:` A reference to the `metadata.name` of the Pipeline that we want to run.

1. `param:` The list of parameters to pass to the Pipeline.

__Note:__  We ran our Pipeline twice, with different values for the parameter `run-it`.  We did this to demonstrate the task guard logic in a Pipeline.

* With the value of `run-it=no-thanks`, the task guard logic evaluated to false, and thus the guarded task, `run` was skipped.
* With the value of `run-it=yes-please`, the task guard logic evaluated to true, and thus the guarded task, `run` was executed after the `build` task.

## Summary

OK.  Let's pause for a minute and take stock.

We have covered the basics of the execution side of Tekton:

* Task
* TaskRun
* Pipeline
* PipelineRun

## What's Next

Let's take a quick pause and tour the OpenShift Console W.R.T Pipelines:

Go here for that tour: __[OpenShift Pipelines (Tekton) - Console](/tutorials/openshift-pipelines-console/)__
