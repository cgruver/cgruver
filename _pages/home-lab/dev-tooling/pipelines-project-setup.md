---
title: "Tekton Pipelines - OpenShift Project Setup"
description: "Setting up an OpenShift namespace and Gitea organization for Tekton Triggers with Gitea Webhooks"
sitemap: true
published: true
permalink: /home-lab/pipelines-project-setup/
tags:
  - openshift pipelines
  - tekton
  - tekton triggers
  - Quarkus
  - Gitea Webhooks
---
### Setting up Pipelines in an OpenShift project  

*In a later post, I'll show you how to automate this setup across your whole cluster.*

1. Select the Lab subdomain that you want to work with:

   ```bash
   labctx
   ```

1. Create an OpenShift project for our demonstration:

   ```bash
   oc login -u devuser https://api.okd4.${SUB_DOMAIN}.${LAB_DOMAIN}:6443
   oc new-project app-demo
   ```

1. Create a maven settings.xml file for your maven builds:

   Remember, our OpenShift cluster is on a disconnected network.  This means that our Java builds will not be able to access Maven Central directly.  So, we will leverage Nexus as a maven mirror.  Nexus comes configured, out of the box, with a proxy for Maven Central already configured.  We will leverage that.

   This ConfigMap will be mounted as a volume by our Tekton Task that builds Java applications.

   ```bash
   cat << EOF | oc apply -n app-demo -f -
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: maven-settings-xml
   data:
     settings.xml: |
       <?xml version="1.0" encoding="UTF-8"?>
       <settings>
         <mirrors>
           <mirror>
             <id>maven-public</id>
             <name>maven-public</name>
             <url>https://nexus.${LAB_DOMAIN}:8443/repository/maven-public/</url>
             <mirrorOf>*</mirrorOf>
           </mirror>
         </mirrors>
         <profiles>
           <profile>
             <id>maven-nexus-repo</id>
             <repositories>
               <repository>
                 <id>maven-public</id>
                 <name>maven-public</name>
                 <url>https://nexus.${LAB_DOMAIN}:8443/repository/maven-public/</url>
               </repository>
             </repositories>
           </profile>
         </profiles>
         <activeProfiles>
           <activeProfile>maven-nexus-repo</activeProfile>
         </activeProfiles>
       </settings>
   EOF
   ```

1. Install the pipelines resources:

   ```bash
   oc apply -f ${OKD_LAB_PATH}/okd-home-lab/pipelines/manifests/ -n app-demo
   ```

   *A TL;DR description of the manifests can be found here*: [Tekton Pipelines - Overview of Lab Manifests](/home-lab/behind-the-scenes/tekton-overview/)

1. Create an authentication secret so that the pipeline service account can access gitea with the credentials we created above:

   Place the credentials into environment variables.  We're using the `read` shell command so that the username and password are not stored in the shell history.

   ```bash
   read GITEA_USER
   ```

   Type the service account user name that we created above and hit `retrun`:

   ```bash
   read GITEA_PASSWD
   ```

   Type the service account password that we created above and hit `retrun`:

   Now create a Kubernetes Secret with this information:

   ```bash
   cat << EOF | oc apply -n app-demo -f -
   apiVersion: v1
   kind: Secret
   metadata:
       name: gitea-secret
       annotations:
         tekton.dev/git-0: https://gitea.${LAB_DOMAIN}:3000
   type: kubernetes.io/basic-auth
   data:
     username: $(echo -n ${GITEA_USER} | base64)
     password: $(echo -n ${GITEA_PASSWD} | base64)
   EOF

   oc patch sa pipeline --type json --patch '[{"op": "add", "path": "/secrets/-", "value": {"name":"gitea-secret"}}]' -n app-demo
   ```

   Clear the environment variables:

   ```bash
   GITEA_USER=""
   GITEA_PASSWD=""
   ```

__Finally, we are ready to write some code.  So, let's create a simple Quarkus application:__

__[Quarkus Build & Deploy - Pipelines Demo](/home-lab/quarkus-gitea-webhook-demo/)__
