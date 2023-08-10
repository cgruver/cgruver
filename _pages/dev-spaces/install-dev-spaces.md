---
permalink: /dev-spaces/install-dev-spaces/
title: Install OpenShift Dev Spaces
description: "Install OpenShift Dev Spaces"
tags:
  - openshift dev spaces
---
1. Log into the OpenShift console from your browser.

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

1. Open a terminal and login to your OpenShift cluster with the CLI.

1. Create an instance of Dev Spaces in your cluster:

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
