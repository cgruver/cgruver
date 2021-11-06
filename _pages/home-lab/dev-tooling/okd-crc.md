---
title: Build CodeReady Containers - With OKD
permalink: /home-lab/okd-crc/
description: How to build CodeReady Containers for OKD
sitemap: true
published: true
tags:
  - crc
  - codeready
  - openshift
  - okd
---




### Prepare for the CRC Build

You will need a Linux workstation with a healthy amount of RAM for this build.
I am using an Intel [NUC8i3BEK](https://ark.intel.com/content/www/us/en/ark/products/126149/intel-nuc-kit-nuc8i3bek.html) that is one of the KVM nodes in my home lab.
It is equipped with a 500GB SSD and 32GB of RAM.  The host is running CentOS 8 Stream.  Fedora should also work fine.  If you choose to use a different Linux distribution, you will have to alter the initial setup that is described below.  For more on my home lab setup, see this post: [Let's build an OpenShift Home Lab!](http://127.0.0.1:4000/openshift/home%20lab/kubernetes/2021/08/01/Blog-Introduction.html)

CodeReady containers is built from two code repositories, in a three step process.

* [https://github.com/code-ready/snc](https://github.com/code-ready/snc)
* [https://github.com/code-ready/crc](https://github.com/code-ready/crc)

1. Deploy an OpenShift single node cluster on Libvirt
1. Create a `qcow2` disk image from the VM running the OpenShift cluster
1. Compile `crc` and embed the `qcow2` image.

Now, let's build CodeReady Containers with OKD!

### Initial Set Up For The CRC Dev Environment

1. Starting with a minimal CentOS 8 Stream install, add the following packages, update and reboot you host:

   ```bash
   dnf -y module install virt
   dnf -y install jq golang-bin gcc-c++ golang make zip wget git bash-completion libguestfs-tools virt-install
   dnf -y update
   reboot
   ```

1. Configure that firewall to allow local access to libvirt:

   ```bash
   firewall-cmd --add-rich-rule "rule service name="libvirt" reject" --permanent
   firewall-cmd --zone=dmz --change-interface=tt0 --permanent
   firewall-cmd --zone=dmz --add-service=libvirt --permanent
   firewall-cmd --zone=dmz --add-service=dns --permanent
   firewall-cmd --zone=dmz --add-service=dhcp --permanent
   firewall-cmd --reload
   ```

1. Enable `libvirtd` to listen on port `16509`

   ```bash
   cat <<EOF >> /etc/libvirt/libvirtd.conf
   listen_tls = 0
   listen_tcp = 1
   auth_tcp = "none"
   tcp_port = "16509"
   EOF
   ```

1. Stop the `libvirtd` service, enable the tcp socket listener for `libvirtd`, and restart it.

   ```bash
   systemctl stop libvirtd
   systemctl enable libvirtd-tcp.socket --now
   systemctl start libvirtd
   ```

1. Create a helper script to set environment variables:

   ```bash
   mkdir -p ${HOME}/bin

   cat << FOE > ${HOME}/bin/sncSetup.sh
   export OKD_VERSION=\$(curl https://github.com/openshift/okd/releases/latest | cut -d"/" -f8 | cut -d\" -f1)
   export CRC_DIR=${HOME}/crc-build
   export PATH=${HOME}/crc-build/snc/openshift-clients/linux/:\${PATH}
   export OPENSHIFT_PULL_SECRET_PATH="\${CRC_DIR}/pull_secret.json"
   export BUNDLE_VERSION=\${OKD_VERSION}
   export BUNDLE_DIR=\${CRC_DIR}/snc
   export OKD_BUILD=true
   export SNC_GENERATE_MACOS_BUNDLE=true
   export SNC_GENERATE_WINDOWS_BUNDLE=true
   export TF_VAR_libvirt_bootstrap_memory=16384
   export LIBGUESTFS_BACKEND=direct
   export KUBECONFIG=\${CRC_DIR}/snc/crc-tmp-install-data/auth/kubeconfig
   export OC=\${CRC_DIR}/snc/openshift-clients/linux/oc
   cat << EOF > \${CRC_DIR}/pull_secret.json
   {"auths":{"fake":{"auth": "Zm9vOmJhcgo="}}}
   EOF
   FOE

   chmod 700 ${HOME}/bin/sncSetup.sh
   ```

1. Clone the code repos:

   ```bash
   mkdir ${HOME}/crc-build
   cd ${HOME}/crc-build

   git clone https://github.com/cgruver/crc
   git clone https://github.com/cgruver/snc
   ```

### Step 1 - Create the Single Node Cluster

1. Execute the helper script to set the environment:

   ```bash
   . sncSetup.sh
   ```

1. Ensure that you have the latest code, and switch to the okd-4.8 branch:

   ```bash
   cd ${CRC_DIR}/snc
   git fetch
   git checkout okd-4.8
   git pull
   ```

1. Start the deployment of the single node cluster: (This will take a while)

   ```bash
   ./snc.sh
   ```

1. When the deployment is complete, you will see output like this:

   ```bash
   Cluster has stabilized
   + break
   + grep -v Completed
   + grep -v Running
   + oc get pod --no-headers --all-namespaces
   + retry ./openshift-clients/linux/oc delete pod --field-selector=status.phase==Succeeded --all-namespaces
   + local retries=10
   + local count=0
   + ./openshift-clients/linux/oc delete pod --field-selector=status.phase==Succeeded --all-namespaces
   pod "installer-2-crc-hqh5f-master-0" deleted
   pod "revision-pruner-2-crc-hqh5f-master-0" deleted
   pod "installer-2-crc-hqh5f-master-0" deleted
   pod "installer-3-crc-hqh5f-master-0" deleted
   pod "installer-4-crc-hqh5f-master-0" deleted
   pod "installer-5-crc-hqh5f-master-0" deleted
   pod "installer-6-crc-hqh5f-master-0" deleted
   pod "installer-7-crc-hqh5f-master-0" deleted
   pod "revision-pruner-3-crc-hqh5f-master-0" deleted
   pod "revision-pruner-5-crc-hqh5f-master-0" deleted
   pod "revision-pruner-7-crc-hqh5f-master-0" deleted
   pod "installer-3-crc-hqh5f-master-0" deleted
   pod "installer-4-crc-hqh5f-master-0" deleted
   pod "installer-5-crc-hqh5f-master-0" deleted
   pod "installer-6-crc-hqh5f-master-0" deleted
   pod "installer-7-crc-hqh5f-master-0" deleted
   pod "revision-pruner-4-crc-hqh5f-master-0" deleted
   pod "revision-pruner-5-crc-hqh5f-master-0" deleted
   pod "revision-pruner-6-crc-hqh5f-master-0" deleted
   pod "revision-pruner-7-crc-hqh5f-master-0" deleted
   pod "installer-3-crc-hqh5f-master-0" deleted
   pod "installer-4-crc-hqh5f-master-0" deleted
   pod "installer-5-crc-hqh5f-master-0" deleted
   pod "installer-6-crc-hqh5f-master-0" deleted
   pod "installer-7-crc-hqh5f-master-0" deleted
   pod "revision-pruner-5-crc-hqh5f-master-0" deleted
   pod "revision-pruner-6-crc-hqh5f-master-0" deleted
   pod "revision-pruner-7-crc-hqh5f-master-0" deleted
   + return 0
   + jobs=($(jobs -p))
   ++ jobs -p
   + '[' -n 24340 ']'
   + (( 5 ))
   + kill 24340
   ./snc.sh: line 1: kill: (24340) - No such process
   + true
   ```

1. Check out the OKD cluster:

   ```bash
   export KUBECONFIG=${CRC_DIR}/snc/crc-tmp-install-data/auth/kubeconfig 
   oc get pods --all-namespaces
   ```

   You should see a very clean listing of healthy pods.

   ```bash
   NAMESPACE                                    NAME                                                     READY   STATUS    RESTARTS   AGE
   openshift-apiserver-operator                 openshift-apiserver-operator-75f74d6456-zdjlv            1/1     Running   0          23m
   openshift-apiserver                          apiserver-746bff698b-hwgrc                               2/2     Running   0          27m
   openshift-authentication-operator            authentication-operator-66c5f8676c-9kvc5                 1/1     Running   1          27m
   openshift-authentication                     oauth-openshift-fcbb4554c-4v6w5                          1/1     Running   0          30m
   openshift-authentication                     oauth-openshift-fcbb4554c-5gpp8                          1/1     Running   0          30m
   openshift-cluster-machine-approver           machine-approver-77cc698544-cwlrk                        2/2     Running   0          23m
   openshift-cluster-node-tuning-operator       cluster-node-tuning-operator-598cfb69ff-25wg9            1/1     Running   0          23m
   openshift-cluster-node-tuning-operator       tuned-dqzwb                                              1/1     Running   0          25h
   openshift-cluster-samples-operator           cluster-samples-operator-78875bd7b4-5c8sr                2/2     Running   0          27m
   openshift-cluster-version                    cluster-version-operator-5794fc5fc-x547n                 1/1     Running   1          28m
   openshift-config-operator                    openshift-config-operator-57b84d4d9c-l2cg2               1/1     Running   0          23m
   openshift-console-operator                   console-operator-c74b976f5-f46hd                         1/1     Running   0          23m
   openshift-console                            console-86bb4d4dc8-92lrn                                 1/1     Running   0          24h
   openshift-console                            console-86bb4d4dc8-ztn96                                 1/1     Running   0          24h
   openshift-console                            downloads-6684b5d869-g7klk                               1/1     Running   0          27m
   openshift-controller-manager-operator        openshift-controller-manager-operator-6b65899945-7p5pd   1/1     Running   0          23m
   openshift-controller-manager                 controller-manager-xxtnj                                 1/1     Running   1          28m
   openshift-dns-operator                       dns-operator-5cfc8c7c89-c62vv                            2/2     Running   0          23m
   openshift-dns                                dns-default-w74lp                                        3/3     Running   0          25h
   openshift-etcd-operator                      etcd-operator-68f96d7bf8-cdv4b                           1/1     Running   0          23m
   openshift-etcd                               etcd-crc-hqh5f-master-0                                  3/3     Running   0          25h
   openshift-etcd                               etcd-quorum-guard-68c65dd785-fd6bf                       1/1     Running   0          25h
   openshift-image-registry                     cluster-image-registry-operator-69799f54dd-9vv5j         1/1     Running   0          23m
   openshift-image-registry                     image-registry-578bb6758d-p7k4b                          1/1     Running   0          27m
   openshift-image-registry                     node-ca-rb466                                            1/1     Running   0          24h
   openshift-ingress-canary                     ingress-canary-zq4m9                                     1/1     Running   0          24h
   openshift-ingress-operator                   ingress-operator-5bb8ffff48-lsf8k                        2/2     Running   0          23m
   openshift-ingress                            router-default-6fbf95b45-j5bbj                           1/1     Running   3          24h
   openshift-kube-apiserver-operator            kube-apiserver-operator-85ccb995cf-9bz9w                 1/1     Running   0          23m
   openshift-kube-apiserver                     kube-apiserver-crc-hqh5f-master-0                        5/5     Running   0          25m
   openshift-kube-controller-manager-operator   kube-controller-manager-operator-7794b64ddb-ksqx9        1/1     Running   0          23m
   openshift-kube-controller-manager            kube-controller-manager-crc-hqh5f-master-0               4/4     Running   6          24h
   openshift-kube-scheduler-operator            openshift-kube-scheduler-operator-c759dbbd4-5k9t9        1/1     Running   0          23m
   openshift-kube-scheduler                     openshift-kube-scheduler-crc-hqh5f-master-0              3/3     Running   4          24h
   openshift-marketplace                        community-operators-jnbx9                                1/1     Running   0          25h
   openshift-marketplace                        marketplace-operator-5594b977df-sz7p7                    1/1     Running   0          23m
   openshift-multus                             multus-admission-controller-kmnv5                        2/2     Running   0          25h
   openshift-multus                             multus-skj77                                             1/1     Running   0          25h
   openshift-multus                             network-metrics-daemon-27d8k                             2/2     Running   0          25h
   openshift-network-diagnostics                network-check-source-587567b644-85xv7                    1/1     Running   0          25h
   openshift-network-diagnostics                network-check-target-x54kh                               1/1     Running   0          25h
   openshift-network-operator                   network-operator-5b7884f84f-vwn7h                        1/1     Running   0          23m
   openshift-oauth-apiserver                    apiserver-74fc8d5cb8-9kxjr                               1/1     Running   6          25h
   openshift-operator-lifecycle-manager         catalog-operator-c4885b46c-rwqz8                         1/1     Running   0          23m
   openshift-operator-lifecycle-manager         olm-operator-554765c4cf-rpl7v                            1/1     Running   0          23m
   openshift-operator-lifecycle-manager         packageserver-64c9867f9c-2cgz6                           1/1     Running   6          25h
   openshift-sdn                                sdn-controller-89k44                                     1/1     Running   2          25h
   openshift-sdn                                sdn-q6tl2                                                2/2     Running   0          25h
   openshift-service-ca-operator                service-ca-operator-75c599f496-g7pf7                     1/1     Running   1          27m
   openshift-service-ca                         service-ca-54886b9fbc-cxb7c                              1/1     Running   2          25h
   ```

   If you see pods crash looping or otherwise not `Running`, then there may be issues with the cluster which will inhibit your crc build.

1. Create the `qcow2` Disk Image

   ```bash
   ./createdisk.sh crc-tmp-install-data
   ```

1. Compile the CRC Executable with an Embedded Disk Image

   ```bash
   cd ../crc
   git fetch
   git pull
   git checkout crc-okd
   make clean
   make embed_bundle
   ```

   __The `crc` executables will be in the `${CRC_DIR}/crc/out` folder, arranged by architecture.__

   ```bash
   ./crc/out/macos-amd64/crc
   ./crc/out/linux-amd64/crc
   ./crc/out/windows-amd64/crc.exe
   ```

### Post build clean up

1. Delete the virtual machine resources that were created:

   ```bash
   CRC=$(virsh net-list --all | grep crc- | cut -d" " -f2)
   virsh destroy ${CRC}-bootstrap
   virsh undefine ${CRC}-bootstrap
   virsh destroy ${CRC}-master-0
   virsh undefine ${CRC}-master-0
   virsh net-destroy ${CRC}
   virsh net-undefine ${CRC}
   virsh pool-destroy ${CRC}
   virsh pool-undefine ${CRC}
   rm -rf /var/lib/libvirt/openshift-images/${CRC}
   ```

1. Clean up the artifacts from the single node cluster build:

   ```bash
   rm -rf ${CRC_DIR}/snc/crc_*_${OKD_VERSION}*
   ```

That's it!  

You now have your own, personal copy of CodeReady Containers.

To get up and running quickly:

1. Copy the appropriate binary to your workstation.
1. Put the `crc` binary in your path.
1. execute:

   ```bash
   crc setup
   ```

1. execute:

   ```bash
   crc start
   ```

1. Develop and Deploy code!
1. When you are done:

   ```bash
   crc stop
   ```

1. To delete a cluster instance:

   ```bash
   crc delete
   ```

The documentation for how to use it is here: [https://code-ready.github.io/crc/](https://code-ready.github.io/crc/)

__Note, that documentation is for the official Red Hat release of CodeReady Containers.  Some of the documentation is not relevant to what you just built.__
