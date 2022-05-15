---
permalink: /home-lab/mirror-okd-images/
title: Preparing to Install OpenShift - Mirror OKD Images
description: Installing UPI OpenShift on Intel NUC with OKD
tags:
  - openshift disconnected install
  - okd disconnected install
  - kubernetes disconnected install
---
### Create OpenShift image mirror

From your workstation, do the following:

1. Create the pull secret for Nexus.  Use the username and password that we created with admin authority on the `okd` repository that we created.

   ```bash
   labcli --pull-secret
   ```

1. Set your cluster configuration for the latest OKD release:

   ```bash
   labcli --latest
   ```

1. Now mirror the OKD images into the local Nexus: __This can take a while.  Be patient__

   ```bash
   labcli --mirror 
   ```

   __Note:__ If you see X509 errors, and you are on a MacBook, you might have to open KeyChain and trust the Nexus cert.  Then run the above command again.

   The final output should look something like:

   ```bash
   Success
   Update image:  nexus.my.awesome.lab:5001/okd:4.10.0-0.okd-2022-05-07-021833
   Mirror prefix: nexus.my.awesome.lab:5001/okd
   Mirror prefix: nexus.my.awesome.lab:5001/okd:4.10.0-0.okd-2022-05-07-021833

   To use the new mirrored repository to install, add the following section to the install-config.yaml:

   imageContentSources:
   - mirrors:
     - nexus.my.awesome.lab:5001/okd
     source: quay.io/openshift/okd
   - mirrors:
     - nexus.my.awesome.lab:5001/okd
     source: quay.io/openshift/okd-content


   To use the new mirrored repository for upgrades, use the following to create an ImageContentSourcePolicy:

   apiVersion: operator.openshift.io/v1alpha1
   kind: ImageContentSourcePolicy
   metadata:
     name: example
   spec:
     repositoryDigestMirrors:
     - mirrors:
       - nexus.my.awesome.lab:5001/okd
       source: quay.io/openshift/okd
     - mirrors:
       - nexus.my.awesome.lab:5001/okd
       source: quay.io/openshift/okd-content    
   ```

## Now We are Ready To Install OpenShift

__[Installing OpenShift](/home-lab/install-okd-lab/)__
