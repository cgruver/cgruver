---
title: "OpenShift - Your New Favorite IDE"
date:   2023-03-22 00:00:00 -0400
description: "Eclipse Che & OpenShift Dev Spaces: Cloud Native Development - In The Cloud"
tags:
  - OpenShift Dev Spaces
  - Kubernetes
  - Eclipse Che
  - Cloud Native IDE
  - Quarkus On OpenShift
categories:
  - Blog Post
---

Think about this for a moment.  If you were handed a brand new laptop tomorrow, how long would it take you to get it fully set up for application development?

And then there's the old; __"But it works on my machine..."__ Yes, we've all been there.  You do your best with your local environment.  But, unless you are writing desktop apps, your local environment is likely much different from the environment that your code will ultimately run in.

You are also likely working on a machine that you had little input into selecting.  Your code runs in Linux based containers, but your development environment is anything but.  Plus, let's face it.  Linux has come a long way on the desktop, but most organizations don't embrace it there.

How about compute resources?  Do you have enough CPU or RAM?

Do you have the ability to run all of the other apps that your project interacts with?  A Kafka cluster? PostgreSQL or Cassandra?  What about all of the other micro-services that your app consumes APIs or messages from?

Finally, let's talk about governance.  Do you have to submit a help desk ticket every time you need a new tool?  How to you handle updates?  Or, new technologies that your app needs?  Are you permitted to install new software or change the configuration of your workstation?  What do you do when you are working on different projects that use conflicting versions of something?

Wouldn't it be nice if...

OK, now that the song is stuck in your head.

Wouldn't it be nice if you could automatically configure your development environment based on the needs of the specific project that you are working on?

What if all you needed was the git URL to your project, and all of the IDE tools, dependencies, and peripheral applications were automatically provisioned for you, and then torn down when you were done?

What if all you needed to joyfully deliver awesome apps, was a browser...?

__Enter - OpenShift Dev Spaces, (aka Eclipse Che):__  You can get all of the TL;DR here: [https://www.eclipse.org/che/](https://www.eclipse.org/che/) and here: [https://access.redhat.com/documentation/en-us/red_hat_openshift_dev_spaces](https://access.redhat.com/documentation/en-us/red_hat_openshift_dev_spaces)

But, who wants to read when we can write code!?  So, let's install Eclipse Che in our lab and use it to write some code.

## Installing Eclipse Che

We're going to install the upstream Eclipse Che on the community supported build of OpenShift, OKD.

If you don't have an OKD cluster, you can build one by following the instructions in this post: [Back To Where It All Started - Let’s Build an OpenShift Home Lab](/blog%20post/2023/03/06/Back-To-Where-It-All-Started.html)

The first thing that we need to do, is create a `CatalogSource` for the DevWorkspace Operator.  Eclipse Che and OpenShift Dev Spaces are dependent on this operator.  If you are on a subscribed OpenShift cluster, then the DevWorkspace Operator is already available, and you can installed the Red Hat supported build of Eclipse Che called OpenShift Dev Spaces.

But, like I said, this post is going to focus on upstream Eclipse Che.  This blog is all about upstream after all...

1. Log into your OKD cluster with the `oc` CLI as a cluster admin user.

1. Create a CatalogSource for the Dev Workspace Operator

   __Note:__ This step is not necessary if you are installing OpenShift Dev Spaces.  A supported OpenShift cluster already has the appropriate catalog sources.

   ```bash
   cat << EOF | oc apply -f -
   apiVersion: operators.coreos.com/v1alpha1
   kind: CatalogSource
   metadata:
     name: devworkspace-operator-catalog
     namespace: openshift-marketplace # Namespace for catalogsource, not operator itself
   spec:
     sourceType: grpc
     image: quay.io/devfile/devworkspace-operator-index:release
     publisher: Red Hat
     displayName: DevWorkspace Operator Catalog
     updateStrategy:
       registryPoll:
         interval: 5m
   EOF
   ```

1. Now, log into your OpenShift cluster web console as a cluster admin user.

1. Navigate to the Operator Hub:

   <img src="/_pages/dev-spaces/images/operator-hub.png" width="100%"/>

1. Search for the Eclipse Che Operator:

   <img src="/_pages/dev-spaces/images/eclipse-che-search.png" width="75%"/>

1. Click on the Eclipse Che Operator and acknowledge the popup about Community Operators:

   <img src="/_pages/dev-spaces/images/show-community-operators.png" width="40%"/>

1. Click `Install`:

   <img src="/_pages/dev-spaces/images/eclipse-che-install-select.png" width="60%"/>

1. Leave the default settings and click `Install`:

   <img src="/_pages/dev-spaces/images/eclipse-che-install-confirm.png" width="80%"/>

1. If you click on `Installed Operators` in the left hand nav menu, you can verify the installation process:

   <img src="/_pages/dev-spaces/images/che-operators-installing.png" width="100%"/>

1. When the installation is complete, you should see both Eclipse Che and the DevWorkspace operators installed.

   <img src="/_pages/dev-spaces/images/che-operators-installed.png" width="100%"/>

### Create an instance of Eclipse Che to serve the cluster

```bash
cat << EOF | oc apply -f -
apiVersion: v1
kind: Namespace
metadata:
  name: eclipse-che
---
apiVersion: org.eclipse.che/v2
kind: CheCluster
metadata:
  name: eclipse-che
  namespace: eclipse-che
spec:
  components:
    cheServer:
      debug: false
      logLevel: INFO
    metrics:
      enable: true
  containerRegistry: {}
  devEnvironments:
    startTimeoutSeconds: 300
    secondsOfRunBeforeIdling: -1
    maxNumberOfWorkspacesPerUser: -1
    containerBuildConfiguration:
      openShiftSecurityContextConstraint: container-build
    disableContainerBuildCapabilities: false
    defaultEditor: che-incubator/che-code/latest
    defaultNamespace:
      autoProvision: true
      template: <username>-che
    secondsOfInactivityBeforeIdling: 1800
    storage:
      pvcStrategy: per-workspace
  gitServices: {}
  networking: {}
EOF
```