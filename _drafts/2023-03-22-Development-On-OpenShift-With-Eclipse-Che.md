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

If you work for a large non-tech enterprise, you are also likely working on a machine that you had little input into selecting.  Your code runs in Linux based containers, but your development environment is anything but.  You might be among those who have embraced Mac Books for developers.  That, at least has UNIX underpinnings.  But, you are likely on the good old standard of Windows.  Plus, let's face it.  Linux has come a long way on the desktop, but most organizations don't embrace it there.

How about compute resources?  Do you have enough CPU or RAM?  If you do, how much time does that investment sit idle?

Do you have the ability to run all of the other apps that your project interacts with?  A Kafka cluster? PostgreSQL or Cassandra?  What about all of the other micro-services that your app consumes APIs or messages from?

Finally, let's talk about governance.  Do you have to submit a help desk ticket every time you need a new tool?  How to you handle updates?  How do you install new technologies that your app needs?  Are you permitted to install new software or change the configuration of your workstation?  What do you do when you are working on different projects that use conflicting versions of something?

If you are fortunate enough to have full autonomy on your workstation, how many times have you rendered it useless and had to rebuild from scratch?  Yeah...  I'm one of those (un)fortunate few.  I've been there many, many times.  I've donated many days to trying to get something to work on my machine...

__Wouldn't it be nice if...__

OK, now that the song is stuck in your head.

Wouldn't it be nice if you could automatically configure your development environment based on the needs of the specific project that you are working on?

What if all you needed was the git URL to your project, and all of the IDE tools, dependencies, and peripheral applications were automatically provisioned for you, and then torn down when you were done?

What if you could destroy the whole environment with a click, and rebuild it with another click?

What if all you needed to joyfully deliver awesome apps, was a browser...?

__Enter - OpenShift Dev Spaces, (aka Eclipse Che)__  

You can get all of the TL;DR here:

* [https://www.eclipse.org/che/](https://www.eclipse.org/che/)
* [https://access.redhat.com/documentation/en-us/red_hat_openshift_dev_spaces](https://access.redhat.com/documentation/en-us/red_hat_openshift_dev_spaces)

But, who wants to read when we can write code!?  So, let's install Eclipse Che in our lab and use it to write some code.

## Installing Eclipse Che

We're going to install the upstream Eclipse Che on the community supported build of OpenShift, OKD.

If you don't have an OKD cluster, you can build one by following the instructions in this post: [Back To Where It All Started - Let’s Build an OpenShift Home Lab](/blog%20post/2023/03/06/Back-To-Where-It-All-Started.html)

The first thing that we need to do, is create a `CatalogSource` for the DevWorkspace Operator.  Eclipse Che and OpenShift Dev Spaces are dependent on this operator.  If you are on a subscribed OpenShift cluster, then the DevWorkspace Operator is already available, and you can installed the Red Hat supported build of Eclipse Che called OpenShift Dev Spaces.  __Note:__ If you don't have access to an OKD cluster, or want to use OpenShift Local with OpenShift Dev Spaces, then skip this next section and follow the instructions here instead: [Install OpenShift Local and OpenShift Dev Spaces](/dev-spaces/install-crc/)  Then, come back here for the demo section.

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

1. __Navigate to the Operator Hub:__

   <img src="/_pages/dev-spaces/images/operator-hub.png" width="100%"/>

1. __Search for the Eclipse Che Operator:__

   <img src="/_pages/dev-spaces/images/eclipse-che-search.png" width="75%"/>

1. __Click on the Eclipse Che Operator and acknowledge the popup about Community Operators:__

   <img src="/_pages/dev-spaces/images/show-community-operators.png" width="40%"/>

1. __Click `Install`:__

   <img src="/_pages/dev-spaces/images/eclipse-che-install-select.png" width="60%"/>

1. __Leave the default settings and click `Install`:__

   <img src="/_pages/dev-spaces/images/eclipse-che-install-confirm.png" width="80%"/>

1. __If you click on `Installed Operators` in the left hand nav menu, you can verify the installation process:__

   <img src="/_pages/dev-spaces/images/che-operators-installing.png" width="100%"/>

1. __When the installation is complete, you should see both Eclipse Che and the DevWorkspace operators installed.__

   <img src="/_pages/dev-spaces/images/che-operators-installed.png" width="100%"/>

1. Finally, we need to create an instance of `CheCluster`:

   From a terminal, log in to your cluster with cluster-admin privileges and run the following:

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

## Eclipse Che Demo

Now that everything is installed.  Let's see it in action.

You will need an unprivileged OpenShift account for this demo.  You can do this with cluster-admin, but I encourage you not to.  I want you to see just how much autonomy you can have with a normal `restricted` OpenShift account.

<img src="/_pages/dev-spaces/demo-app-images/demo-login-openshift.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-select-eclipse-che-app.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-login-with-openshift.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-login-che.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-authorize-access.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-che-landing-page.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-enter-project-git-url.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-workspace-starting.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-trust-authors.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-workspace-started.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-open-workspace.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-trust-authors-2.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-extensions-installing.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-three-repos-cloned.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-opening-java-projects.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-java-build-running.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-java-build-done.png" width="100%"/>

<img src="" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-copy-kubeconfig.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-set-angular-env.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-start-quarkus-app.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-quarkus-live.png" width="100%"/>

<img src="/_pages/dev-spaces/demo-app-images/demo-npm-install.png" width="100%"/>



<img src="" width="100%"/>

<img src="" width="100%"/>

<img src="" width="100%"/>

<img src="" width="100%"/>

<img src="" width="100%"/>

<img src="" width="100%"/>

<img src="" width="100%"/>

<img src="" width="100%"/>

<img src="" width="100%"/>




![](/_pages/dev-spaces/demo-app-images/demo-acknowledge-page-open.png)
![](/_pages/dev-spaces/demo-app-images/demo-angular-app-running.png)
![](/_pages/dev-spaces/demo-app-images/demo-angular-code.png)
![](/_pages/dev-spaces/demo-app-images/demo-angular-live-update.png)
![]()
![]()
![]()
![](/_pages/dev-spaces/demo-app-images/demo-delete-workspace.png)
![](/_pages/dev-spaces/demo-app-images/demo-enter-first-random-thought.png)
![]()
![]()
![](/_pages/dev-spaces/demo-app-images/demo-failed-to-load.png)
![](/_pages/dev-spaces/demo-app-images/demo-get-first-random-thought.png)
![]()
![]()
![](/_pages/dev-spaces/demo-app-images/demo-live-quarkus-change.png)
![]()
![](/_pages/dev-spaces/demo-app-images/demo-login-openshift.png)
![]()
![](/_pages/dev-spaces/demo-app-images/demo-modify-angular.png)
![]()
![](/_pages/dev-spaces/demo-app-images/demo-open-angular-app.png)
![]()
![]()
![](/_pages/dev-spaces/demo-app-images/demo-quarkus-code-change.png)
![]()
![](/_pages/dev-spaces/demo-app-images/demo-quarkus-service.png)
![](/_pages/dev-spaces/demo-app-images/demo-restarting-workspace.png)
![](/_pages/dev-spaces/demo-app-images/demo-run-npm-install.png)
![](/_pages/dev-spaces/demo-app-images/demo-running-workspaces.png)
![](/_pages/dev-spaces/demo-app-images/demo-second-thought.png)
![](/_pages/dev-spaces/demo-app-images/demo-select-delete-workspace.png)
![]()
![](/_pages/dev-spaces/demo-app-images/demo-select-get.png)
![](/_pages/dev-spaces/demo-app-images/demo-select-to-quick-start.png)
![](/_pages/dev-spaces/demo-app-images/demo-select-workspaces.png)
![]()
![](/_pages/dev-spaces/demo-app-images/demo-start-node.png)
![]()
![](/_pages/dev-spaces/demo-app-images/demo-stop-workspace.png)
![](/_pages/dev-spaces/demo-app-images/demo-switch-view-to-code.png)
![]()
![]()
![]()
![]()
