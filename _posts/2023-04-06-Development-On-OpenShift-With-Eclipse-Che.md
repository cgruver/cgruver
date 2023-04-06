---
title: "OpenShift - Your New Favorite IDE"
date:   2023-04-06 00:00:00
description: "Eclipse Che & OpenShift Dev Spaces: Cloud Native Development - In The Cloud"
header:
  image: /_pages/dev-spaces/images/code-on-ipad.png
tags:
  - OpenShift Dev Spaces
  - Kubernetes
  - Eclipse Che
  - Cloud Native IDE
  - Quarkus On OpenShift
  - Angular On OpenShift
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

__Wouldn't it be nice if we could...__

OK, now that the song is stuck in your head.

Wouldn't it be nice if you could automatically configure your development environment based on the needs of the specific project that you are working on?

What if all you needed was the git URL to your project, and all of the IDE tools, dependencies, and peripheral applications were automatically provisioned for you, and then torn down when you were done?

What if you could destroy the whole environment with a click, and rebuild it with another click?

What if all you needed to joyfully deliver awesome apps, was a browser...?

__Enter - OpenShift Dev Spaces, (aka Eclipse Che)__  

You can get all of the TL;DR here:

* [https://www.eclipse.org/che/](https://www.eclipse.org/che/)
* [https://access.redhat.com/documentation/en-us/red_hat_openshift_dev_spaces](https://access.redhat.com/documentation/en-us/red_hat_openshift_dev_spaces)
* [https://devfile.io](https://devfile.io)

But, who wants to read when we can write code!?  So, let's install Eclipse Che in our lab and use it to write some code.

## Installing Eclipse Che

We're going to install the upstream Eclipse Che on the community supported build of OpenShift, OKD.

If you don't have an OKD cluster, you can build one by following the instructions in this post: [Back To Where It All Started - Let’s Build an OpenShift Home Lab](/blog%20post/2023/03/06/Back-To-Where-It-All-Started.html)

The first thing that we need to do, is create a `CatalogSource` for the DevWorkspace Operator.  Eclipse Che and OpenShift Dev Spaces are dependent on this operator.  If you are on a subscribed OpenShift cluster or using OpenShift Local, then the DevWorkspace Operator is already available, and you can install the Red Hat supported build of Eclipse Che called OpenShift Dev Spaces.  __Note:__ If you don't have access to an OKD cluster, or want to use OpenShift Local with OpenShift Dev Spaces, then skip this next section and follow the instructions here instead: [Install OpenShift Local and OpenShift Dev Spaces](/dev-spaces/install-crc/)  Then, come back here for the demo section.

But, like I said, this post is going to focus on upstream Eclipse Che.  This blog is all about upstream after all...

1. Log into your OKD cluster with the `oc` CLI as a cluster admin user.

1. Create a CatalogSource for the Dev Workspace Operator

   __Note:__ This step is not necessary if you are installing OpenShift Dev Spaces.

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

1. __Log in as an unprivileged user:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-login-openshift.png" width="50%"/>

1. __Note the little 9-box icon in the top right of the screen.  Click on that.__

   Then click on `Eclipse Che`

   <img src="/_pages/dev-spaces/demo-app-images/demo-select-eclipse-che-app.png" width="50%"/>

1. __Select `Log in with OpenShift`

   <img src="/_pages/dev-spaces/demo-app-images/demo-login-with-openshift.png" width="50%"/>

1. __Log in with the same user:__  (I know...  It's not SSO enabled...)

   <img src="/_pages/dev-spaces/demo-app-images/demo-login-che.png" width="50%"/>

1. __The first time, it will ask you to authorize access:__

   Click `Allow selected permissions`

   <img src="/_pages/dev-spaces/demo-app-images/demo-authorize-access.png" width="50%"/>

1. __You should now see the Eclipse Che landing page:__

<img src="/_pages/dev-spaces/demo-app-images/demo-che-landing-page.png" width="100%"/>

1. __Create a new Workspace:__

   This is where things start to happen.  All you need to get started is the URL of the git repository for your project.

   For this demo, I have created a more complex project so that you can really see some of the power of Eclipse Che (OpenShift Dev Spaces).

   I also created a GitHub organization to hold this project: [https://github.com/eclipse-che-demo-app](https://github.com/eclipse-che-demo-app)

   The documentation is pretty sparse at the time of this Blog post, but will be filling out soon.

   The project that we will be playing with is composed of three code repositories:

   * [https://github.com/eclipse-che-demo-app/che-demo-app.git](https://github.com/eclipse-che-demo-app/che-demo-app.git)

     This code repo contains the Eclipse Che and VS Code configurations for the project.

     The config file for the Eclipse Che workspace is `.devfile.yaml`  You can explore the syntax here: [https://devfile.io](https://devfile.io)

     In the not too distant future, I'll publish a post explaining the DevFile in this project.

   * [https://github.com/eclipse-che-demo-app/che-demo-app-ui.git](https://github.com/eclipse-che-demo-app/che-demo-app-ui.git)

     This code repo contains a very lame Angular UI that I wrote for this demo...  I'm not a UI/UX guy and had to learn Angular over the weekend.  So, no judgement please...  ;-)

   * [https://github.com/eclipse-che-demo-app/che-demo-app-service.git](https://github.com/eclipse-che-demo-app/che-demo-app-service.git)

     This code repo contains a Quarkus application which exposes a couple of REST endpoints and uses a PostgreSQL database as its data persistence engine.

   __To create your workspace, simply paste this URL:__
   
   `https://github.com/eclipse-che-demo-app/che-demo-app.git` 
   
   __into the `Import from Git` dialog as shown below and click `Create & Open`__

   <img src="/_pages/dev-spaces/demo-app-images/demo-enter-project-git-url.png" width="50%"/>

1. __Your workspace should now be starting:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-workspace-starting.png" width="50%"/>

   __Note:__ There is a slight chance that you will see an error like this:

   <img src="/_pages/dev-spaces/demo-app-images/demo-failed-to-load.png" width="50%">

   This popped up in `7.63`.  It appears to be a race condition of some sort.

   If you see this, your workspace did actually start.  It just failed to open your browser to the correct page.  In the left hand menu, you should see `che-demo-app` in `RECENT WORKSPACES`.  Just click on that and your workspace should open.

1. __VS Code will ask you to trust the authors of the git repository that you cloned:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-trust-authors.png" width="50%"/>

1. __At this point you should be looking at VS Code in your browser.  Note that it cloned the `che-demo-app` repo.  Also, note that it detected the presence of a VS Code workspace and is asking if you want to open it.__

   <img src="/_pages/dev-spaces/demo-app-images/demo-workspace-started.png" width="100%"/>

1. __Open the workspace:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-open-workspace.png" width="50%"/>

1. __You'll be prompted to trust the authors again, because it is now opening the other two code repos that it cloned.__

   <img src="/_pages/dev-spaces/demo-app-images/demo-trust-authors-2.png" width="50%"/>

1. __Sit back and watch for just a minute.  A lot is getting ready to happen.__

   One of the first things that you will likely notice, is that the screen suddenly changes from a dark theme to a light theme.  This is because VS Code is installing the extensions that are recommended in the workspace config file that you just opened, and VS Code is applying the configuration.  I intentionally used a light theme here to add more drama to the demo.  :-)  Plus, this is my favorite VS Code color theme.  Both light and dark.

   <img src="/_pages/dev-spaces/demo-app-images/demo-extensions-installing.png" width="100%"/>

1. __Look at the left side of the screen and notice that there are three code repos in your workspace:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-three-repos-cloned.png" width="50%"/>

1. __Look down at the bottom right of your browser window and notice the `Opening Java Projects:` dialog.__

   <img src="/_pages/dev-spaces/demo-app-images/demo-opening-java-projects.png" width="50%"/>

1. __Click on `check details` in that dialog:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-java-build-running.png" width="100%"/>

1. __You are seeing VS Code initialize the Quarkus app in this workspace:__

   When it is done, it will look like this:

   <img src="/_pages/dev-spaces/demo-app-images/demo-java-build-done.png" width="100%"/>

   You can click on the little `X` icon or the trashcan icon to close the terminal window.

## Time to Work On Some Code

At this point you have seen how quickly and easily you can get set up to contribute to a project.

The `DevFile` (`.devfile.yaml`) and the VS Code workspace config file have all of the configuration specified.  Eclipse Che (OpenShift Dev Spaces) consumed those files and set everything up for you.  We're not going to talk about it much in this post, but you even have a running PostgreSQL database, and the ability to create container images with `podman` or `buildah`.

This post is focused on coding, so let's write some code now.

1. __Before diving into some code, we need to set up a couple of things to enable live dev mode in Angular and Quarkus:__

   So, click on the icon in the left hand menu that looks like a small clipboard.  This is the Task Manager extension.  We need to run a few tasks to get set up.

   <img src="/_pages/dev-spaces/demo-app-images/demo-task-manager-perspective.png" width="40%"/>

1. __Run the `Copy Kubeconfig` task:__

   This first task is a bit of a hack to give the container with the `oc` cli the correct permissions.  You only have to do this once.

   <img src="/_pages/dev-spaces/demo-app-images/demo-copy-kubeconfig.png" width="40%"/>

1. __Run the `Set Angular Environment` task:__

   This is also a bit of a hack.  The Quarkus app will be exposing an API on an OpenShift Route that the workspace creates for you.  It has a generated name.  Our Angular app needs that API URL in order to talk to its backend that the Quarkus app is providing.  So, I wrote a shell script that injects the appropriate endpoint into the environment for the Angular app.  You also only need to run this task once.

   <img src="/_pages/dev-spaces/demo-app-images/demo-set-angular-env.png" width="40%"/>

1. __Run `npm install` to initialize the Angular app:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-run-npm-install.png" width="40%"/>

   <img src="/_pages/dev-spaces/demo-app-images/demo-npm-install.png" width="100%"/>

1. __Start the Quarkus app in live dev mode:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-start-quarkus-app.png" width="40%"/>


   <img src="/_pages/dev-spaces/demo-app-images/demo-quarkus-live.png" width="100%"/>

1. __Start the Angular account in live dev mode:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-start-node.png" width="50%"/>

1. __Open a browser tab to the Angular app:__

   Wait until the Angular app is running, then click on the `Open in New Tab` button that is down in the bottom right:

   <img src="/_pages/dev-spaces/demo-app-images/demo-open-angular-app.png" width="100%"/>

1. __Click `Open` in the popup dialog:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-acknowledge-page-open.png" width="40%"/>

1. __You should now see my really lame Angular app:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-angular-app-running.png" width="50%"/>

1. __Go back to the VS Code tab and open the `app.component.ts` file in the `che-demo-app-ui` project:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-angular-code.png" width="100%"/>

1. __Change the `title` to `My Random Thoughts`:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-modify-angular.png" width="50%"/>

1. __Notice that the browser tab with the Angular app open immediately reflects your change!__

   <img src="/_pages/dev-spaces/demo-app-images/demo-angular-live-update.png" width="50%"/>

   __You are LIVE CODING with Angular!!!__

1. __Type `Quarkus Is Fun` into the `Random Thought` text field and click `Submit`:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-enter-first-random-thought.png" width="50%"/>

1. __Click on the `Get Random Thoughts` button and observe the response:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-select-get.png" width="50%"/>

1. __The Quarkus app assigns a UUID to your thoughts which are then stored in the PostgreSQL database that is running in your workspace.__

   <img src="/_pages/dev-spaces/demo-app-images/demo-get-first-random-thought.png" width="50%"/>

1. __Now let's make a change to the Quarkus app:__

   Open the file; `src/main/java/fun/is/quarkus/randomThoughts/service/RandomThoughts.java` in the `che-demo-app-service` project:

   <img src="/_pages/dev-spaces/demo-app-images/demo-quarkus-service.png" width="75%"/>

1. __Make the code changes below:__

   ```java
   String modifiedThought = "My Random Thought: " + dto.randomTHought();

   RandomThoughtDto thought = new RandomThoughtDto(UUID.randomUUID(), modifiedThought);
   ```

   __The file should now look like:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-quarkus-code-change.png" width="75%"/>

1. __Now go back to the tab with the running Angular app and add another thought:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-second-thought.png" width="50%"/>

1. __Click on `Get Random Thoughts` and notice the change:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-live-quarkus-change.png" width="50%"/>

So, that's a quick demo of live coding in Dec Spaces / Eclipse Che.

## Stop, Start, & Delete

Go back to the Eclipse Che landing page.  We'll explore stopping, starting, and deleting a workspace.

1. __In the upper left portion of the page, click on the `Workspaces` section below `Create Workspace`:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-select-workspaces.png" width="50%"/>

1. __You can now see all of your workspaces...  all one of them...__

   <img src="/_pages/dev-spaces/demo-app-images/demo-running-workspaces.png" width="100%"/>

1. __Click on the three vertical dots on the right side of the row with your running workspace:__

   Select `Stop Workspace`

   <img src="/_pages/dev-spaces/demo-app-images/demo-stop-workspace.png" width="100%"/>

1. __Restart your workspace:__

   You can restart your workspace from the same menu, or you can click on the name of your workspace that is in the left hand column of the screen:

   <img src="/_pages/dev-spaces/demo-app-images/demo-select-to-quick-start.png" width="50%"/>

1. __Observe your worspace restart:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-restarting-workspace.png" width="50%"/>

   When VS Code opens, you can reopen the VS Code workspace.  You will notice that all of your uncommitted code changes are preserved.

1. __Now, delete the workspace:__

   Click on the three vertical dots on the right side of the row with your stopped workspace and select `Delete Workspace`
   <img src="/_pages/dev-spaces/demo-app-images/demo-select-delete-workspace.png" width="50%"/>

1. __Acknowledge the warning and click `Delete`:__

   <img src="/_pages/dev-spaces/demo-app-images/demo-delete-workspace.png" width="50%"/>

That's it!

You can recreate the workspace by following the same procedures above.

Later I'll dive deeper into the DevFile to show you how it all works.

Happy coding!
