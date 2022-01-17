---
permalink: /home-lab/bare-metal-install-sno/
title: Installing Single Node OpenShift on Bare Metal
description: Installing Single Node OpenShift on Intel NUC with OKD
tags:
  - bare metal openshift SNO
  - bare metal okd install
  - bare metal kubernetes single node cluster
---
### Preparing for the Installation

Since we are simulating a secure data center environment, let's deny internet access to our internal network:

1. Select the Lab subdomain that you want to work with:

   There is a function that we added to our shell when we set up the workstation.  It allows you to switch between different lab domain contexts so that you can run multiple clusters with potentially different releases of OpenShift.

   ```bash
   labctx -d=sno
   ```

1. Add a firewall rule to block internet bound traffic from the internal router:

   ```bash
   ssh root@router.${LAB_DOMAIN} "new_rule=\$(uci add firewall rule) ; \
   uci set firewall.\${new_rule}.enabled=1 ; \
   uci set firewall.\${new_rule}.target=REJECT ; \
   uci set firewall.\${new_rule}.src=lan ; \
   uci set firewall.\${new_rule}.src_ip=${DOMAIN_NETWORK}/24 ; \
   uci set firewall.\${new_rule}.dest=wan ; \
   uci set firewall.\${new_rule}.name=${SUB_DOMAIN}-internet-deny ; \
   uci set firewall.\${new_rule}.proto=all ; \
   uci set firewall.\${new_rule}.family=ipv4 ; \
   uci commit firewall && \
   /etc/init.d/firewall restart"
   ```

### Create OpenShift image mirror:

From your workstation, do the following:

1. First, we need a couple of pull secrets:

   1. Create the pull secret for Nexus.  Use the username and password that we created with admin authority on the `okd` repository that we created.

      If you followed the guide exactly, then the Nexus user is `openshift-mirror`

      ```bash
      read NEXUS_USER
      ```

      Type the username, i.e. `openshift-mirror` and hit `<return>`

      ```bash
      read NEXUS_PWD
      ```

      Type the password that you created for the Nexus user and hit `<return>`

      ```bash
      NEXUS_SECRET=$(echo -n "${NEXUS_USER}:${NEXUS_PWD}" | base64)
      ```

   1. We need to put the pull secret into a JSON file that we will use to mirror the OKD images into our Nexus registry.  We'll also need the pull secret for our cluster install.  Since we are installing OKD, we don't need an official quay.io pull secret.  So, we will use a fake one.

      ```bash
      cat << EOF > ${OKD_LAB_PATH}/pull_secret.json
      {"auths": {"fake": {"auth": "Zm9vOmJhcgo="},"nexus.${LAB_DOMAIN}:5001": {"auth": "${NEXUS_SECRET}"}}}
      EOF
      ```

1. Now mirror the OKD images into the local Nexus: __This can take a while.  Be patient__

   ```bash
   mirrorOkdRelease.sh -d=${SUB_DOMAIN} 
   ```

   __Note:__ If you see X509 errors, and you are on a MacBook, you might have to open KeyChain and trust the Nexus cert.  Then run the above command again.

   The final output should look something like:

   ```bash
   Success
   Update image:  nexus.my.awesome.lab:5001/okd:4.9.0-0.okd-2021-12-12-025847
   Mirror prefix: nexus.my.awesome.lab:5001/okd
   Mirror prefix: nexus.my.awesome.lab:5001/okd:4.9.0-0.okd-2021-12-12-025847

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

### Create the OpenShift install manifests, Fedora CoreOS ignition files, and the iPXE boot files

1. Create the manifests and Node installation files:

   ```bash
   cp ~/.ssh/id_rsa.pub ${OKD_LAB_PATH}/id_rsa.pub
   deployOkdNodes.sh -i
   ```

    This script does a whole lot of work for us.  Crack it open and take a look.

    1. Creates the OpenShift install-config.yaml
    1. Invokes the openshift-install command against our install-config to produce ignition files
    1. Uses `butane` to modify the ignition files to configure each node's network settings
    1. Copies the ignition files into place for Fedora CoreOS
    1. Creates iPXE boot files for each node and copies them to the iPXE server, (your router)

### We are now ready to fire up our OpenShift cluster

1. Start the bootstrap node on your workstation:

   In a separate terminal window, run the following:

   ```bash
   startNodes.sh -b
   ```

   * Do not close this terminal.  It is the console of the bootstrap node.
   * Do not power on your control plane nodes until the bootstrap Kubernetes API is available.

1. Monitor the bootstrap process:

   In a terminal window, run the following:

   ```bash
   openshift-install --dir=${INSTALL_DIR} wait-for bootstrap-complete --log-level debug
   ```

   __Note:__ This command does not affect to install process.  You can stop and restart it safely.  It is just for monitoring the bootstrap.

1. When the API is available, power on your control plane NUCs:

   You will see the following output from the above command:

   __NOTE:__ If you are on a 13" MacBook Pro like me, this will take a while.  Be patient.

   ```bash
   INFO API v1.20.0-1085+01c9f3f43ffcf0-dirty up     
   INFO Waiting up to 30m0s for bootstrapping to complete... 
   ```

   __Now, power on your NUCs to start the cluster installation.__

   If you want to watch bootstrap logs:

   In yet another terminal...

   ```bash
   ssh core@okd4-bootstrap.${SUB_DOMAIN}.${LAB_DOMAIN} "journalctl -b -f -u release-image.service -u bootkube.service"
   ```

   Or, to monitor the logs from one of the control plane nodes:

   ```bash
   ssh core@okd4-master-0.${SUB_DOMAIN}.${LAB_DOMAIN} "journalctl -b -f -u release-image.service -u bootkube.service"
   ```

1. Enable Hyper-Threading on the OpenShift node:

   By default, Fedora CoreOS will disable SMT on processors which are vulnerable to side channel attacks.  Since we are on a private cloud, we are less concerned about that, and could really use those extra CPUs.

   So, let's enable SMT.

   1. Make sure that all of the OpenShift node is up and installing:

      ```bash
      ssh core@okd4-snc-node.${SUB_DOMAIN}.${LAB_DOMAIN} "echo Running!"
      ```

   1. Modify the kernel arguments to enable SMT on the next boot:

      ```bash
      ssh core@okd4-snc-node.${SUB_DOMAIN}.${LAB_DOMAIN} "sudo rpm-ostree kargs --replace=\"mitigations=auto,nosmt=auto\""
      ```

1. Now, wait patiently for the bootstrap process to complete:

   You will see the following, when the bootstrap is complete:

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
   destroyNodes.sh -b
   ```

   This script shuts down and then deletes the Bootstrap VM.  Then it removes the bootstrap entries from the HA Proxy configuration.

1. Monitor the installation process:

   ```bash
   openshift-install --dir=${INSTALL_DIR} wait-for install-complete --log-level debug
   ```

1. Fix for a stuck MCO

   In some recent versions of OKD, the Machine Config Operator cannot complete the installation because it is looking for a non-existent machine config.

   See: [https://github.com/openshift/okd/issues/963](https://github.com/openshift/okd/issues/963)

   ```bash
   export KUBECONFIG=${KUBE_INIT_CONFIG}
   oc delete mc 99-master-okd-extensions 99-okd-master-disable-mitigations
   ```

   This will force a recreation of the control plane machine configs, and will allow the install to complete.

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

## Our install is nearly complete.  We just have a few more tasks.

1. Create an empty volume for the internal registry:

   ```bash
   export KUBECONFIG=${KUBE_INIT_CONFIG}
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
   export KUBECONFIG=${KUBE_INIT_CONFIG}
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

That's it!  You now have a single node OpenShift cluster.
