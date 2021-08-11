---
layout: page
permalink: /home-lab/post-install/
title: Add Users
sitemap: false
---

Let's add some users to the cluster that we created.

OpenShift supports multiple authentication methods, from enterprise SSO to very basic auth.  We're going to start with something a little basic, using `htpasswd`.

1. If you don't already have it available, install `htpasswd` on your workstation.
1. Log into your cluster with the `kubeadmin` key:

   ```bash
   export KUBECONFIG="${OKD_LAB_PATH}/okd-install-dir/auth/kubeconfig"
   ```

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
   cat << EOF
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
   EOF | oc apply -f -
   ```

1. Assign the `admin` user to be a cluster administrator:

   ```bash
   oc adm policy add-cluster-role-to-user cluster-admin admin
   ```

1. Now you can verify that the new user account works:

   ```bash
   oc login -u admin https://api.okd4.dc1.${LAB_DOMAIN}:6443
   ```

1. After you verify that the new admin account works.  you can delete the temporary kubeadmin account:

   ```bash
   oc delete secrets kubeadmin -n kube-system
   ```
