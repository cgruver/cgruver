---
permalink: /home-lab/post-install-okd/
title: OpenShift Post Install Tasks
description: OpenShift Post Installation Tasks
tags:
  - openshift install
  - okd install
  - kubernetes install
---
## Our install is nearly complete.  We just have a few more tasks.

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

1. Because our install is disconnected from the internet, we need to remove the cluster update channel, and the Samples Operator:

   ```bash
   oc patch ClusterVersion version --type merge -p '{"spec":{"channel":""}}'
   oc patch configs.samples.operator.openshift.io cluster --type merge --patch '{"spec":{"managementState":"Removed"}}'
   ```

1. Before we do anything else, let's save the emergency keys to our cluster:

   ```bash
   mkdir -p ${OKD_LAB_PATH}/lab-config/okd4.${SUB_DOMAIN}.${LAB_DOMAIN}
   cp ${OKD_LAB_PATH}/okd-install-dir/auth/kubeconfig ${OKD_LAB_PATH}/lab-config/okd4.${SUB_DOMAIN}.${LAB_DOMAIN}/
   chmod 400 ${OKD_LAB_PATH}/lab-config/okd4.${SUB_DOMAIN}.${LAB_DOMAIN}/kubeconfig
   ```

   __If you ever forget the password for your cluster admin account, you can access your cluster with the `kubeadmin` token that we saved in the file:__ `${OKD_LAB_PATH}/lab-config/okd4.${SUB_DOMAIN}.${LAB_DOMAIN}/kubeconfig`

   ```bash
   export KUBECONFIG="${OKD_LAB_PATH}/lab-config/okd4.${SUB_DOMAIN}.${LAB_DOMAIN}/kubeconfig"
   ```

### Log into your new cluster console

1. Add the OKD Cluster cert to the trust store on your workstation:

   * Mac OS:

     ```bash
     openssl s_client -showcerts -connect  console-openshift-console.apps.okd4.${SUB_DOMAIN}.${LAB_DOMAIN}:443 </dev/null 2>/dev/null|openssl x509 -outform PEM > /tmp/okd-console.${SUB_DOMAIN}.${LAB_DOMAIN}.crt
     sudo security add-trusted-cert -d -r trustAsRoot -k "/Library/Keychains/System.keychain" /tmp/okd-console.${SUB_DOMAIN}.${LAB_DOMAIN}.crt
     ```

   * Linux:

     ```bash
     openssl s_client -showcerts -connect console-openshift-console.apps.okd4.${SUB_DOMAIN}.${LAB_DOMAIN}:443 </dev/null 2>/dev/null|openssl x509 -outform PEM > /etc/pki/ca-trust/source/anchors/okd-console.${SUB_DOMAIN}.${LAB_DOMAIN}.crt
     update-ca-trust
     ```

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

1. Wait a couple of minutes for the Authentication pods to restart and stabalize.

1. Now you can verify that the new user account works:

   ```bash
   oc login -u admin https://api.okd4.${SUB_DOMAIN}.${LAB_DOMAIN}:6443
   ```

1. After you verify that the new admin account works.  you can delete the temporary kubeadmin account:

   ```bash
   oc delete secrets kubeadmin -n kube-system
   ```

1. Now you can point your browser to the url listed at the completion of install: i.e. `https://console-openshift-console.apps.okd4.dev.my.awesome.lab`

   On Mac OS:

   ```bash
   open -a Safari https://console-openshift-console.apps.okd4.${SUB_DOMAIN}.${LAB_DOMAIN}
   ```

   Log in as `admin` with the password from the output at the completion of the install.

That's it!  You now have a three node OpenShift cluster.