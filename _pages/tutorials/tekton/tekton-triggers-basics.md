---
title: "OpenShift Pipelines (Tekton) - Triggers Basics"
description: "The Basics of Tekton Triggers"
sitemap: true
published: true
permalink: /tutorials/tekton-triggers-basics/
tags:
  - openshift pipelines
  - tekton
---
## Let's Explore Tekton Triggers

__Recap from the Intro:__ A fully configured Tekton Trigger is composed of five components:

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

### Create a basic webhook trigger:

1. Add the following YAML to a file named `first-trigger.yaml`


   ```yaml
   apiVersion: triggers.tekton.dev/v1beta1
   kind: TriggerTemplate
   metadata:
     name: my-app-trigger-template
     annotations:
       triggers.tekton.dev/old-escape-quotes: 'true'
   spec:
     params:
       - name: app-name
         description: The application name
         default: my-app
       - name: run-it
         description: Should I run the new container image?
     resourcetemplates:
       - apiVersion: tekton.dev/v1beta1
         kind: PipelineRun
         metadata:
           generateName: my-app-pipeline-run-
           labels:
             app-name: my-app
         spec:
           serviceAccountName: pipeline
           pipelineRef: 
             name: build-container-run-pod
           params:
           - name: app-name
             value: $(tt.params.app-name)
           - name: run-it
             value: $(tt.params.run-it)
   ---
   apiVersion: triggers.tekton.dev/v1beta1
   kind: TriggerBinding
   metadata:
     name: my-app-trigger-binding
   spec:
     params:
       - name: app-name
         value: "$(body.name)"
       - name: run-it
         value: "$(body.run-it)"
   ---
   apiVersion: triggers.tekton.dev/v1beta1
   kind: Trigger
   metadata:
     name: my-app-trigger
   spec:
     interceptors: []
     bindings:
     - ref: my-app-trigger-binding
     template:
       ref: my-app-trigger-template
   ---
   apiVersion: triggers.tekton.dev/v1beta1
   kind: EventListener
   metadata:
     name: my-app-trigger-listener
   spec:
     serviceAccountName: pipeline
     triggers:
     - triggerRef: my-app-trigger
   ```

   This file contains four objects:

   1. A TriggerTemplate named `my-app-trigger-template`

   1. A TriggerBinding named `my-app-trigger-binding`

   1. A Trigger named `my-app-trigger`

   1. An EventListener named `my-app-trigger-listener`

1. Add these objects to your OpenShift project:

   ```bash
   oc apply -f first-trigger.yaml -n my-app
   ```

1. Note that you now have another Pod running:

   ```bash
   oc get pod --field-selector=status.phase==Running -n my-app
   ```

   ```bash
   NAME                                          READY   STATUS    RESTARTS   AGE
   el-my-app-trigger-listener-6bf78d7884-mkzgj   1/1     Running   0          7m41s
   ```

   This is the EventListener.  There is also a Service that was created for it.

1. Take a look at the Service that was created:

   Get the Service name, it will be the `generatedName` of the EventListener

   ```bash
   oc get el my-app-trigger-listener -o=jsonpath='{.status.configuration.generatedName}' -n my-app
   ```

   Let's nest that in another command to look at the Service:

   ```bash
   oc get service $(oc get el my-app-trigger-listener -o=jsonpath='{.status.configuration.generatedName}') -n my-app
   ```

   ```bash
   NAME                         TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)             AGE
   el-my-app-trigger-listener   ClusterIP   10.217.4.225   <none>        8080/TCP,9000/TCP   14m
   ```

1. Load the Service name into an environment variable.  We'll be using it a few times:

   ```bash
   SVC_NAME=$(oc get el my-app-trigger-listener -o=jsonpath='{.status.configuration.generatedName}')
   ```

1. Create a Route to expose the EventListener so that it can receive external webhook requests:

   ```bash
   oc create route edge ${SVC_NAME}-route --service=${SVC_NAME}
   ```

1. Take a look at the Route that was created:

   ```bash
   oc get route ${SVC_NAME}-route -n my-app
   ```

   ```bash
   NAME                               HOST/PORT                                                  PATH   SERVICES                     PORT            TERMINATION   WILDCARD
   el-my-app-trigger-listener-route   el-my-app-trigger-listener-route-my-app.apps-crc.testing          el-my-app-trigger-listener   http-listener   edge          None
   ```

   __Note:__ This is a TLS route with edge termination.

### Invoke The Trigger

Let's Pull that Trigger and see what happens!  Then, as before, we'll pause to talk about it.

First, if you want something to look at: 

1. Open the OpenShift web console and login:

   If you are using Code Ready Containers:

   ```bash
   crc console --credentials
   crc console
   ```

1. Navigate to the `my-app` project

1. Expand the `Pipelines` menu on the left-hand nav bar:

1. Click on `Pipelines` in the sub-menu:

1. Keep this window open where you can see it.

Now, invoke the trigger:

1. Load the EventListener URL into an environment variable.

   ```bash
   HOOK_URL=https://$(oc get route ${SVC_NAME}-route -o=jsonpath='{.spec.host}')
   ```

1. Invoke the Trigger with `curl`

   ```bash
   curl --insecure --location --request POST ${HOOK_URL} --header 'Content-Type: application/json' --data-raw '{"name":"run-my-app","run-it":"yes-please"}'
   ```

   __Note:__  We've likely got a self-signed cert on the cluster, so we used the `--insecure` flag...  I really hate that.

   If you have the gear for your own home lab, I show you how to set up secure trust with your cluster.  

1. Watch the OpenShift web console window that you have open:

   You should see the Pipeline start a run.

   ![Pipeline Trigger Run](/_pages/tutorials/tekton/images/Triggered-PipelineRun.png)

Pretty neat, right?

We just invoked a PipelineRun with an external webhook.

Albeit, insecurely...  Note that there was no validation that the webhook was from a legitimate source, or that the payload was valid.

That's what Interceptors are for.  We'll talk about them when we set up some real code here in a bit.

## Examine the Trigger Objects

As before, let's dive into each of the objects that we created:

### TriggerTemplate

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: my-app-trigger-template
  annotations:
    triggers.tekton.dev/old-escape-quotes: 'true'
spec:
  params:
    - name: app-name
      description: The application name
      default: my-app
    - name: run-it
      description: Should I run the new container image?
  resourcetemplates:
    - apiVersion: tekton.dev/v1beta1
      kind: PipelineRun
      metadata:
        generateName: my-app-pipeline-run-
        labels:
          app-name: my-app
      spec:
        serviceAccountName: pipeline
        pipelineRef: 
          name: build-container-run-pod
        params:
        - name: app-name
          value: $(tt.params.app-name)
        - name: run-it
          value: $(tt.params.run-it)
```

Our TriggerTemplate `spec:` has two elements:

1. `params:` These are the parameters that are passed into the template from a webhook payload.  The params are mapped from the webhook payload to the `TriggerTemplate` params by a `TriggerBinding`  We'll talk about the `TriggerBinding` here shortly.

1. `resourcetemplates: This is a list of TaskRun and/or PipelineRun objects.

   The objects are defined exactly like the TaskRun or PipelineRun objects that we created in a previous exercise.

   __Note:__ the reference to the TriggerTemplate params that map to the input params for the `resourcetemplate` objects - `$(tt.params.run-it)`

### TriggerBinding

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: my-app-trigger-binding
spec:
  params:
    - name: app-name
      value: "$(body.name)"
    - name: run-it
      value: "$(body.run-it)"
```

Our TriggerBinding `spec:` just has one element.  The parameters to be mapped.

The `value:` of each of the parameters in our example, is being extracted from the payload of the webhook.  The webhook is assumed to be JSON, and the payload is mapped to the parameter `body`.

### Trigger

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: Trigger
metadata:
  name: my-app-trigger
spec:
  interceptors: []
  bindings:
  - ref: my-app-trigger-binding
  template:
    ref: my-app-trigger-template
```

Our Trigger `spec:` has three elements:

1. `interceptors:` This would be a list of one or more interceptors that pre-process the webhook payload before releasing it to the TriggerTemplate.

   We'll illustrate Interceptors in the next exercise.

1. `bindings:` This is a list of one or more TriggerBindings to map data from the webhook to params that the TriggerTemplate can use.

1. `template:` This is a reference to the TriggerTemplate that defines the actions triggered by a webhook received by the EventListener.

### EventListener

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: my-app-trigger-listener
spec:
  serviceAccountName: pipeline
  triggers:
  - triggerRef: my-app-trigger
```

Our EventListener `spec:` has two elements:

1. `serviceAccountName:` The namespace scoped service account that we want the Tasks or Pipelines to run as.  __Note:__ `pipeline` is the default service account, but I included it here just to be explicit.

1. `triggers:` A list of triggers that the EventListener will invoke.  __Note:__ This can be a list of both `triggerRef:` to externally defined Trigger objects, or inline defined `trigger:` objects.  See the docs for more info.

## Now Let's Write Some Code and Build an App

Go to the next section, where we will set up Gitea as our SCM, write some code (generate it actually...), and create a real webhook!

__[OpenShift Pipelines (Tekton) - Triggers with a cup of Gitea](/tutorials/tekton-triggers-gitea/)__
