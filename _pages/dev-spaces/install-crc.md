---
permalink: /dev-spaces/install-crc/
title: Install OpenShift Local and OpenShift Dev Spaces
description: "Install OpenShift Local and OpenShift Dev Spaces"
tags:
  - openshift local
  - openshift dev spaces
---
1. Go To: [https://developers.redhat.com/products/openshift/overview](https://developers.redhat.com/products/openshift/overview)

   <img src="/_pages/dev-spaces/images/install-openshift-local-entry.png" width="75%"/>

1. Select `Install Red Hat OpenShift on your laptop`

   This will take you to a login page.  If you don't have a Red Hat developer account you will register for one here.  It's free and you'll get access to a lot of ebooks, guides, and tools.

1. From the landing page after you log in, you will need to download two things:

   1. Download the OpenShift Local installation package for your OS and architecture

   1. Download your pull secret.  This will give you access to all of the Operators in the Red Hat operator catalog.

   <img src="/_pages/dev-spaces/images/download-openshift-local.png" width="75%"/>

1. Install OpenShift Local with the installation package that you downloaded.

1. Open a terminal and prepare your workstation to run the cluster:

   ```bash
   crc setup
   ```

   __Note:__ This will take a while.  OpenShift Local will first download the latest cluster bundle, decompress it, and set up your system to run the cluster.

1. Configure your OpenShift Local cluster: __Note:__ You need at least 16GB of RAM on your workstation, 32GB is better. 

  Adjust the settings below based on your workstation config.

  If you only have 16GB of RAM, change `memory 16384` to `memory 12288`.

  If you only have 2 CPU cores, (4 threads), then change `cpus 6` to `cpus 4`

   ```bash
   crc config set cpus 6
   crc config set memory 12288
   crc config set disk-size 100
   crc config set kubeadmin-password crc-admin
   ```

1. Start OpenShift Local:

   ```bash
   crc start
   ```

   After the cluster starts, you should see output similar to:

   ```bash
   INFO All operators are available. Ensuring stability... 
   INFO Operators are stable (2/3)...                
   INFO Operators are stable (3/3)...                
   INFO Adding crc-admin and crc-developer contexts to kubeconfig... 
   Started the OpenShift cluster.

   The server is accessible via web console at:
     https://console-openshift-console.apps-crc.testing

   Log in as administrator:
     Username: kubeadmin
     Password: crc-admin

   Log in as user:
     Username: developer
     Password: developer

   Use the 'oc' command line interface:
     $ eval $(crc oc-env)
     $ oc login -u developer https://api.crc.testing:6443
   ```

## Install the OpenShift Dev Spaces Operator

1. Launch the OpenShift console in your browser:

   ```bash
   crc console
   ```

1. Log in with user: `kubeadmin`, password: `crc-admin`

1. Navigate to the `Operator Hub`

   <img src="/_pages/dev-spaces/images/operator-hub.png" width="75%"/>

1. Type `dev spaces` into the search, and select `Red Hat OpenShift Dev Spaces`:

   <img src="/_pages/dev-spaces/images/operator-search.png" width="75%"/>

1. Click `Install`:

   <img src="/_pages/dev-spaces/images/operator-install-select.png" width="75%"/>

1. Click `Install`:

   <img src="/_pages/dev-spaces/images/operator-install-confirm.png" width="75%"/>

   The Operator should begin installing:

   <img src="/_pages/dev-spaces/images/operator-installing.png" width="50%"/>

1. Observe the installed Operators, by clicking on `Installed Operators`  underneath `Operator Hub` in the left nav menu bar:

   <img src="/_pages/dev-spaces/images/installed-operators.png" width="75%"/>

## Create the OpenShift Dev Spaces CheCluster Instance

1. Open a terminal and login to the OpenShift Local instance with the CLI:

   ```bash
   oc login -u kubeadmin -p crc-admin https://api.crc.testing:6443
   ```

   ```bash
   cat << EOF | oc apply -f -
   apiVersion: v1
   kind: Namespace
   metadata:
     name: openshift-devspaces
   ---
   apiVersion: org.eclipse.che/v2
   kind: CheCluster
   metadata:
     name: devspaces
     namespace: openshift-devspaces
   spec:
     components:
       cheServer:
         debug: false
         logLevel: INFO
       metrics:
         enable: true
       pluginRegistry:
         openVSXURL: https://open-vsx.org
     containerRegistry: {}
     devEnvironments:
       startTimeoutSeconds: 300
       secondsOfRunBeforeIdling: -1
       maxNumberOfWorkspacesPerUser: -1
       maxNumberOfRunningWorkspacesPerUser: 5
       containerBuildConfiguration:
         openShiftSecurityContextConstraint: container-build
       disableContainerBuildCapabilities: false
       defaultEditor: che-incubator/che-code/latest
       defaultNamespace:
         autoProvision: true
         template: <username>-devspaces
       secondsOfInactivityBeforeIdling: 1800
       storage:
         pvcStrategy: per-workspace
     gitServices: {}
     networking: {}
   EOF
   ```

1. Wait for the Dev Spaces cluster to complete its rollout:

   In the console, select from the left hand nav menu `Workloads -> Pods`, Then select the `Project`: `openshift-devspaces` from the drop down in the top left.

   When the rollout is complete, the list of running pods should look somethings like:

   <img src="/_pages/dev-spaces/images/running-che-pods.png" width="75%"/>

You can now proceed with creating a Dev Spaces Workspace.
