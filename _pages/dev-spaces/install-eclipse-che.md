---
permalink: /dev-spaces/install-eclipse-che/
title: Install Eclipse Che
description: "Install Eclipse Che"
tags:
  - openshift dev spaces
---
### Install and Configure a CheCluster

The first thing that we need to do, is create a `CatalogSource` for the DevWorkspace Operator.  Eclipse Che and OpenShift Dev Spaces are dependent on this operator.  If you are on a subscribed OpenShift cluster or using OpenShift Local, then the DevWorkspace Operator is already available, and you can install the Red Hat supported build of Eclipse Che called OpenShift Dev Spaces.  

1. Log into your OpenShift cluster with the `oc` CLI as a cluster admin user.

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
       maxNumberOfRunningWorkspacesPerUser: 5
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
