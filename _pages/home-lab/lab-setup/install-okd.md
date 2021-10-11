---
permalink: /home-lab/install-okd/
title: Installing OpenShift
description: Installing UPI OpenShift on Intel NUC with OKD
tags:
  - openshift install
  - okd install
  - kubernetes install
  - kvm
---

## We are now ready to fire up our OpenShift cluster

1. Start the nodes:

   ```bash
   startNodes.sh -b -c=${OKD_LAB_PATH}/lab-config/lab.yaml -d=dev
   startNodes.sh -m -c=${OKD_LAB_PATH}/lab-config/lab.yaml -d=dev
   ```

1. Monitor the bootstrap process:

   ```bash
   openshift-install --dir=${OKD_LAB_PATH}/okd-install-dir wait-for bootstrap-complete --log-level debug
   ```

   __Note:__ This command does not affect to install process.  You can stop and restart it safely.  It is just for monitoring the bootstrap.

   If you want to watch logs for issues:

   ```bash
   ssh core@okd4-bootstrap.dev.${LAB_DOMAIN} "journalctl -b -f -u release-image.service -u bootkube.service"
   ```

1. You will see the following, when the bootstrap is complete:

   ```bash
   INFO Waiting up to 20m0s for the Kubernetes API at https://api.okd4.dev.my.awesome.lab:6443... 
   DEBUG Still waiting for the Kubernetes API: an error on the server ("") has prevented the request from succeeding 
   INFO API v1.20.0-1085+01c9f3f43ffcf0-dirty up     
   INFO Waiting up to 30m0s for bootstrapping to complete... 
   DEBUG Bootstrap status: complete                   
   INFO It is now safe to remove the bootstrap resources 
   DEBUG Time elapsed per stage:                      
   DEBUG Bootstrap Complete: 11m16s                   
   DEBUG                API: 3m5s                     
   INFO Time elapsed: 11m16s
   ```

1. When the bootstrap process is complete, remove the bootstrap node:

   ```bash
   destroyNodes.sh -b -c=${OKD_LAB_PATH}/lab-config/lab.yaml -d=dev
   ```

   This script shuts down and then deletes the Bootstrap VM.  Then it removes the bootstrap entries from the HA Proxy configuration.

1. Monitor the installation process:

   ```bash
   openshift-install --dir=${OKD_LAB_PATH}/okd-install-dir wait-for install-complete --log-level debug
   ```

1. Installation Complete:

   ```bash
   DEBUG Cluster is initialized                       
   INFO Waiting up to 10m0s for the openshift-console route to be created... 
   DEBUG Route found in openshift-console namespace: console 
   DEBUG OpenShift console route is admitted          
   INFO Install complete!                            
   INFO To access the cluster as the system:admin user when using 'oc', run 'export KUBECONFIG=/Users/yourhome/okd-lab/okd-install-dir/auth/kubeconfig' 
   INFO Access the OpenShift web-console here: https://console-openshift-console.apps.okd4.dev.my.awesome.lab 
   INFO Login to the console with user: "kubeadmin", and password: "AhnsQ-CGRqg-gHu2h-rYZw3" 
   DEBUG Time elapsed per stage:                      
   DEBUG Cluster Operators: 13m49s                    
   INFO Time elapsed: 13m49s
   ```

1. Create an empty volume for the internal registry:

   ```bash
   export KUBECONFIG="${OKD_LAB_PATH}/okd-install-dir/auth/kubeconfig"
   oc patch configs.imageregistry.operator.openshift.io cluster --type merge --patch '{"spec":{"managementState":"Managed","storage":{"emptyDir":{}}}}'
   ```

1. Create an Image Pruner:

   ```bash
   oc patch imagepruners.imageregistry.operator.openshift.io/cluster --type merge -p '{"spec":{"schedule":"0 0 * * *","suspend":false,"keepTagRevisions":3,"keepYoungerThan":60,"resources":{},"affinity":{},"nodeSelector":{},"tolerations":[],"startingDeadlineSeconds":60,"successfulJobsHistoryLimit":3,"failedJobsHistoryLimit":3}}'
   ```

1. Delete all of the Completed pods:

   ```bash
   oc delete pod --field-selector=status.phase==Succeeded --all-namespaces
   ```

1. Because our install is disconnected from the internet, we need to disable the Operator Marketplace, and the Samples Operator:

   ```bash
   oc patch OperatorHub cluster --type json -p '[{"op": "add", "path": "/spec/sources/0/disabled", "value": true}]'
   oc patch configs.samples.operator.openshift.io cluster --type merge --patch '{"spec":{"managementState":"Removed"}}'
   ```

1. Before we do anything else, let's save the emergency keys to our cluster:

   ```bash
   mkdir -p ${OKD_LAB_PATH}/kubecreds/okd4.dev.${LAB_DOMAIN}
   cp ${OKD_LAB_PATH}/okd-install-dir/auth/kubeadmin-password ${OKD_LAB_PATH}/kubecreds/okd4.dev.${LAB_DOMAIN}/
   cp ${OKD_LAB_PATH}/okd-install-dir/auth/kubeconfig ${OKD_LAB_PATH}/kubecreds/okd4.dev.${LAB_DOMAIN}/
   ```

   __If you ever forget the password for your cluster admin account, you can access your cluster with the `kubeadmin` token that we saved in the file:__ `${OKD_LAB_PATH}/kubecreds/okd4.dev.${LAB_DOMAIN}/kubeconfig`

   ```bash
   export KUBECONFIG="${OKD_LAB_PATH}/kubecreds/okd4.dev.${LAB_DOMAIN}/kubeconfig"
   ```

1. Install is Complete!!!

### Log into your new cluster console

1. Add the OKD Cluster cert to the trust store on your workstation:

   * Mac OS:

     ```bash
     openssl s_client -showcerts -connect  console-openshift-console.apps.okd4.dev.${LAB_DOMAIN}:443 </dev/null 2>/dev/null|openssl x509 -outform PEM > /tmp/okd-console.dev.${LAB_DOMAIN}.crt
     sudo security add-trusted-cert -d -r trustAsRoot -k "/Library/Keychains/System.keychain" /tmp/okd-console.dev.${LAB_DOMAIN}.crt
     ```

   * Linux:

     ```bash
     openssl s_client -showcerts -connect console-openshift-console.apps.okd4.dev.${LAB_DOMAIN}:443 </dev/null 2>/dev/null|openssl x509 -outform PEM > /etc/pki/ca-trust/source/anchors/okd-console.dev.${LAB_DOMAIN}.crt
     update-ca-trust
     ```

1. Point your browser to the url listed at the completion of install: i.e. `https://console-openshift-console.apps.okd4.dev.my.awesome.lab`

   On Mac OS:

   ```bash
   open -a Safari https://console-openshift-console.apps.okd4.dev.${LAB_DOMAIN}
   ```

   Log in as `kubeadmin` with the password from the output at the completion of the install.

### Create user accounts:

Let's add some users to the cluster that we created.  The temporary `kubeadmin` account is not a useful long term strategy for access to your cluster.  So, we're going to add a couple of user accounts.

OpenShift supports multiple authentication methods, from enterprise SSO to very basic auth.  We're going to start with something a little basic, using `htpasswd`.

1. If you don't already have it available, install `htpasswd` on your workstation.

1. Create an `htpasswd` file for a couple of users:

   ```bash
   mkdir -p ${OKD_LAB_PATH}/okd-creds
   htpasswd -B -c -b ${OKD_LAB_PATH}/okd-creds/htpasswd admin $(cat ${OKD_LAB_PATH}/okd-install-dir/auth/kubeadmin-password)
   htpasswd -b ${OKD_LAB_PATH}/okd-creds/htpasswd devuser devpwd
   ```

   This creates an `htpasswd` file with two users.  The admin user will have the same password that was created for the kubeadmin user.

1. Create a Kubernetes Secret with the htpasswd file:

   ```bash
   oc create -n openshift-config secret generic htpasswd-secret --from-file=htpasswd=${OKD_LAB_PATH}/okd-creds/htpasswd
   ```

   We'll associate this secret with a new htpasswd based OAuth provider.  If you want to change passwords or add more users, recreate the file and replace the secret.

1. Create the OAuth provider, associated with the secret that we just added.

   ```bash
   cat << EOF | oc apply -f -
   apiVersion: config.openshift.io/v1
   kind: OAuth
   metadata:
     name: cluster
   spec:
     identityProviders:
     - name: okd4_htpasswd_idp
       mappingMethod: claim 
       type: HTPasswd
       htpasswd:
         fileData:
           name: htpasswd-secret
   EOF
   ```

1. Assign the `admin` user to be a cluster administrator:

   ```bash
   oc adm policy add-cluster-role-to-user cluster-admin admin
   ```

1. Now you can verify that the new user account works:

   ```bash
   oc login -u admin https://api.okd4.dev.${LAB_DOMAIN}:6443
   ```

1. After you verify that the new admin account works.  you can delete the temporary kubeadmin account:

   ```bash
   oc delete secrets kubeadmin -n kube-system
   ```

That's it!  You now have a three node OpenShift cluster.
