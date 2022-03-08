---
title: "OpenShift Pipelines (Tekton) - Basics - Tasks"
description: "Coding Basic Tekton Tasks"
sitemap: true
published: true
permalink: /tutorials/tekton-basics-tasks/
tags:
  - openshift pipelines
  - tekton
---
## Start with the basics - Tasks

__Note:__ You need to be logged into your OpenShift cluster with the `oc` cli tool.  You will also need to log into the cluster console from a browser.

1. Create an OpenShift project for this lab:

   __Note:__ You do not need to be a cluster administrator for these exercises, but you do need the ability to create OpenShift projects.

   ```bash
   oc new-project my-app
   ```

1. Create a directory for the files that we'll be creating.

   ```bash
   mkdir ~/tekton-tutorial
   cd tekton-tutorial
   ```

1. Clone the Github project with the code samples that I have prepared for you:

   ```bash
   git clone https://github.com/cgruver/tutorial-resources.git
   cd tutorial-resources
   ```

### The obligatory `Hello World`

First...  I'm sorry...  But we have to do it...

The `Hello World`

It's a capitol crime in IT not to...

So, here it is.

Do this:

1. Create the task:

   ```bash
   oc apply -n my-app -f ./basics/hello-world-task-1.yaml
   ```

1. Run it:

   ```bash
   cat << EOF | oc apply -n my-app -f -
   apiVersion: tekton.dev/v1beta1
   kind: TaskRun
   metadata:
     name: hello-world-task-run-1
   spec:
     taskRef:
       name: hello-world-task-1
   EOF
   ```

1. Watch the logs:

   ```bash
   oc logs -f $(oc get taskrun hello-world-task-run-1 -o jsonpath='{.status.podName}' -n my-app) -n my-app
   ```

   __Note:__ If you see an error like this:

   ```bash
   Error from server (BadRequest): container "step-hello" in pod "hello-world-task-run-1" is waiting to start: PodInitializing
   ```

   That's OK.  It just means that you were too fast for your cluster.  The Pod for the TaskRun is still initializing.  There are no logs to see yet.

   Run the above command again until you see the logs.

   __Note:__  I snuck in a trick with the `oc` command that you might not be familiar with...

   The pod started by the TaskRun may have a randomized name.  I used `-o jsonpath=` to extract the pod name from the TaskRun.

   ```bash
   oc get taskrun my-buildah-demo-task-run -o jsonpath='{.status.podName}' -n my-app
   ```

### That was so much fun, we should do it again

1. Create the task:

   ```bash
   oc apply -n my-app -f ./basics/hello-world-task-2.yaml
   ```

1. Run it:

   ```bash
   cat << EOF | oc apply -n my-app -f -
   apiVersion: tekton.dev/v1beta1
   kind: TaskRun
   metadata:
     name: hello-world-task-run-2
   spec:
     taskRef:
       name: hello-world-task-2
   EOF
   ```

1. Watch the logs:

   ```bash
   oc logs -f $(oc get taskrun hello-world-task-run-2 -o jsonpath='{.status.podName}' ) -c step-hello -n my-app -n my-app
   oc logs -f $(oc get taskrun hello-world-task-run-2 -o jsonpath='{.status.podName}' ) -c step-goodbye -n my-app -n my-app
   ```

### Pause Now, and Look at what we did

Take a look at the two tasks in the files `hello-world-task-1.yaml` & `hello-world-task-2.yaml`.  You will see that they are very minimal examples of Tasks.  The first one has a single step, the second has two steps.

We executed them by creating TaskRuns.

We watched the logs with some `oc` cli magic.

### Now... Let's create a Task with some meat in it

1. Create the Task:

   Take a look at the file named `first-real-task.yaml` in `tutorial-resources/basics`

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
   oc apply -f ./basics/first-real-task.yaml -n my-app
   ```

1. Verify that the task exists in your namespace:

   ```bash
   oc get tasks -n my-app
   ```

   ```bash
   NAME                 AGE
   buildah-demo-task    8s
   hello-world-task-1   10m
   hello-world-task-2   4m12s
   ```

   You should see your new Task listed in the output.

1. Now let's run the Task with a TaskRun:

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
   oc logs -f $(oc get taskrun my-buildah-demo-task-run -o jsonpath='{.status.podName}' -n my-app) -n my-app
   ```

   __Note: Remember...__ If you see an error like this:

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
       image: image-registry.openshift-image-registry.svc:5000/my-app/my-demo-app:latest
   EOF
   ```

1. Watch the logs of your Pod:

   ```bash
   oc logs -f my-demo-app-pod -c my-demo-app-container
   ```

## Wait, What Just Happened?

OK, that was a very quick dive right into the guts of a fairly complex example.

Let's pause for a minute and take it apart, looking at the elements in the Task and TaskRun:

### Task

The Task is an example of a Kubernetes CustomResource, defined by a [CustomerResourceDefinition](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/){:target="_blank"}

So, the definition of a Task, starts out with a header that is very similar to other Kubernetes resources:

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: buildah-demo-task
spec:
  ...
```

The `spec:` of this Task has several elements:

1. `params:` Defines a list of parameters that the Task will accept.

   We have defined one parameter for our Task:

   ```yaml
   ...
   params:
   - name: app-name
     type: string
     description: The application name
   ...
   ```

1. `stepTemplate:` Defines a snippet of a Pod specification which will be applied to every container that runs in the Task Pod.

   In our example we are specifying that all of the containers in our Step should use a common `volumeMount`  Not horribly exciting, since our Task only has one step, and thus one container.  In more complex Tasks, `stepTemplate` can save you a lot of typing and headache when you need common resources across multiple steps.

   ```yaml
   ...
   stepTemplate:
     volumeMounts:
     - name: varlibc
       mountPath: /var/lib/containers
   ...
   ```

1. `steps:` is a list of objects which define the sequential steps that a Task will execute:

   Our example Task has one step:

   ```yaml
   ...
   steps:
   - name: build-image
     image: quay.io/buildah/stable:latest
     securityContext:
       runAsUser: 1000
     imagePullPolicy: IfNotPresent
     script: |
       #!/bin/bash
       export BUILDAH_ISOLATION=chroot
       ...
     env:
     - name: user.home
       value: /workspace
     workingDir: "/workspace"
   ...
   ```

   Steps have quite a few attributes that can be defined.  In this example, I've shown you a very few of them.  You will note that their definition looks a lot like a `Pod` or `Deployment` specification.

   | | |
   |`name:`|Every step has a unique name in the task.  This name is also what will be assigned to the container that is created to run the step.|
   |`image:`|Every step runs in a container.  Therefore, you need to specify the container image that will be used. In this case we are pulling the latest stable `buildah` image from `quay.io`.|
   |`securityContext:`|You can specify a specific security context for the container to run under.  In this case, we needed to specify a specific UID that has the ability to run buildah in an unprivileged mode.|
   |`imagePullPolicy:`|Just like a Pod or Deployment specification, you can control the circumstances that cause an image to be pulled from the source registry.|
   |`script`|In this case we are asking the container to run a specific shell script that we include in the Task step.  This is a very powerful feature of Tekton.  Some steps will perform the work that you want explicitly from the standard entry point of the container.  There are multiple ways that you can tell the container what work you want it to do.|
   |`env:`|Sets the environment for the container. In this step we are setting the value of our user's home directory to `/workspace`.  `/workspace` is a special volumeMount that gives the steps in your Task a common place to store state during the execution of the Task.  There is a lot more to explore with `Workspaces`.|
   |`workingDir:`|This attribute is specifying that when our container runs the script that we specified earlier, it will run with the current working directory set to `/workspace`.|

   Refer to the upstream [Task](https://github.com/tektoncd/pipeline/blob/main/docs/tasks.md){:target="_blank"} documentation for all of the attributes that can be used in a `step`.

1. `volumes` is a list of Pod volumes which can be mounted into one or more containers that run in the Task.

   These volumes are defined in the same way that you would define volumes in a Pod spec or Deployment.

   In our example, we are providing an ephemeral volume of type `emptyDir`.  This volume is used by our buildah container to provide a read/write location for `buildah` to create a container image.

   ```yaml
   ...
   volumes:
   - name: varlibc
     emptyDir: {}
   ...
   ```

   Remember our `stepTemplate`?  That's what creates the volumeMount in our buildah container.

### TaskRun

TaskRun is also a Kubernetes CustomResource.

Just like the Task, it begins with a header.  The meat of the TaskRun, is in the `spec:`

Our TaskRun has two elements that we are using:

1. `taskRef:` Literally a reference to the `metadata.name` of the Task that we want to run.

1. `params:` A list of parameters, parameter name & value, to pass to the Task.

Ours is a pretty minimal TaskRun.  Refer to the upstream documentation for more info: [TaskRun](https://github.com/tektoncd/pipeline/blob/main/docs/taskruns.md){:target="_blank"}

### Examine the Task Further

So, what did our Task actually do?

Take a look at the shell script that the step: `build-image` in our Task executed.

I've added comments to explain each line.  Some of these comments were also logged by the TaskRun that you created above.  That was purely to give us something interesting to look at.

```bash
#!/bin/bash

# Set an env var for BUILDAH_ISOLATION
export BUILDAH_ISOLATION=chroot
# Set an env var for the image that will be created.
# $(context.taskRun.namespace) will resolve to the namespace (project) that we are in.
# $(params.app-name) will resolve to the value of the app-name parameter that is passed to the Task by the TaskRun.
export DESTINATION_IMAGE="image-registry.openshift-image-registry.svc:5000/$(context.taskRun.namespace)/$(params.app-name):latest"
# Set arguments for buildah"
BUILDAH_ARGS="--storage-driver vfs"
# Create a new container from the ubi-minimal 8.5 image"
CONTAINER=$( buildah ${BUILDAH_ARGS} from registry.access.redhat.com/ubi8/ubi-minimal:8.5 )
# Create a simple application for the new container to run"
cat << EOF > ./test.sh
#!/bin/bash
echo "---- hello there! ----"
sleep 5
echo "---- goodbye for now. ----"
exit 0
EOF
chmod 750 ./test.sh
# Copy the simple application to the new container"
buildah ${BUILDAH_ARGS} copy ${CONTAINER} ./test.sh /application.sh
# Set the entry point for the new container"
buildah ${BUILDAH_ARGS} config --entrypoint '["/application.sh"]' ${CONTAINER}
# Add a label to the new container"
buildah ${BUILDAH_ARGS} config --label APP_LABEL="Hello This Is My Label" --author="Tekton" ${CONTAINER}
# Save the new container image"
buildah ${BUILDAH_ARGS} commit ${CONTAINER} ${DESTINATION_IMAGE}
# Disconnect from the new container image"
buildah ${BUILDAH_ARGS} unmount ${CONTAINER}
# Push the new container image to the cluster image registry"
buildah ${BUILDAH_ARGS} push ${DESTINATION_IMAGE} docker://${DESTINATION_IMAGE}
```

We used the `buildah` cli to create a new container image from `registry.access.redhat.com/ubi8/ubi-minimal:8.5` and pushed that image to the internal OpenShift image registry.

I created this particular example for a couple of reasons:

1. I'm just a huge fan of the `buildah` cli for image manipulation.  You will note that we built a container image without a `.Docker` file.
2. I want you to see the tremendous flexibility of Tekton.  If there's a container for it, you can do it...  If there's not a container for it, you can build your own.

Finally, when we created the Pod to run our new container image, it automatically executed from the entry point that we specified.  Thus, the output of our container was:

```bash
---- hello there! ----
---- goodbye for now. ----
```

## Now, Let's Make It More Complex

### Add a step to the Task that runs the new container image in a Pod

We just demonstrated a pretty basic Tekton Task.  Albeit, with a fairly complex container build.  

So, now let's make it a bit more complex by adding a step to the Task that will create the Pod which we just created manually.

1. Clean up the pod that we created, so that we can run it again.

   ```bash
   oc delete pod my-demo-app-pod
   ```

1. Take a look at the file named `multi-step-task.yaml` in `tutorial-resources/basics`

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
   oc apply -f ./basics/multi-step-task.yaml -n my-app
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
   oc logs -f $(oc get taskrun multi-step-task-run -o jsonpath='{.status.podName}' -n my-app) -c step-build-image -n my-app
   oc logs -f $(oc get taskrun multi-step-task-run -o jsonpath='{.status.podName}' -n my-app) -c step-create-pod -n my-app
   ```

## But Wait! --- There's a CLI for This

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

   ```bash
   NAME                       STARTED          DURATION     STATUS
   multi-step-task-run        1 minute ago     19 seconds   Succeeded
   my-buildah-demo-task-run   2 minutes ago    18 seconds   Succeeded
   hello-world-task-run-2     8 minutes ago    6 seconds    Succeeded
   hello-world-task-run-1     13 minutes ago   44 seconds   Succeeded
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

1. Verfiy that your new pod ran:

   ```bash
   oc logs my-demo-app-pod -n my-app -f
   ```

   ```bash
   ---- hello there! ----
   ---- goodbye for now. ----
   ```

1. You can also use the `tkn` cli to create an instance of a TaskRun:

   ```bash
   tkn task start multi-step-task -p app-name=my-other-app -n my-app
   ```

1. Watch the logs of the new TaskRun:

   ```bash
   tkn task logs multi-step-task -n my-app -f --last
   ```

   __Note:__ When you use the cli to create a TaskRun, it gets a randomized name.

1. Finally, verify that the pod created by the new TaskRun completed:

   ```bash
   oc logs my-other-app-pod -n my-app -f
   ```

Now, go to the next lesson and we'll create a pipeline:

__[OpenShift Pipelines (Tekton) - Basics - Pipelines](/tutorials/tekton-basics-pipelines/)__
