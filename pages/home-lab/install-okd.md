---
layout: page
permalink: /home-lab/install-okd/
title: Installing OpenShift
---

## We are now ready to fire up our OKD cluster!!!

1. Start the LB and watch the installation.

    ```bash
    ipmitool -I lanplus -H10.11.11.10 -p6228 -Uadmin -Ppassword chassis power on
    virsh console okd4-lb01
    ```

    You should see your HA Proxy VM do an iPXE boot and begin an unattended installation of CentOS 8.

1. Start the bootstrap node

    ```bash
    ipmitool -I lanplus -H10.11.11.10 -p6229 -Uadmin -Ppassword chassis power on
    ```

1. Start the cluster master nodes

    ```bash
    for i in 6230 6231 6232
    do
      ipmitool -I lanplus -H10.11.11.10 -p${i} -Uadmin -Ppassword chassis power on
    done
    ```

1. Start the cluster worker nodes (If you have any)

    ```bash
    for i in 6233 6234 6235
    do
      ipmitool -I lanplus -H10.11.11.10 -p${i} -Uadmin -Ppassword chassis power on
    done
    ```

### Now let's sit back and watch the install:

__Note: It is normal to see logs which look like errors while `bootkube` and `kublet` are waiting for resources to be provisioned.__

__Don't be alarmed if you see streams of `connection refused` errors for a minute or two.__  If the errors persist for more than a few minutes, then you might have real issues, but be patient.

* To watch a node boot and install:
  * Bootstrap node from the Bastion host:

      ```bash
      virsh console okd4-bootstrap
      ```

  * Master Node from `kvm-host01`

      ```bash
      virsh console okd4-master-0
      ```

* Once a host has installed FCOS:
  * Bootstrap Node:

      ```bash
      ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@okd4-bootstrap "journalctl -b -f -u bootkube.service"
      ```

  * Master Node:

      ```bash
      ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@okd4-master-0 "journalctl -b -f -u kubelet.service"
      ```

* Monitor OKD install progress:
  * Bootstrap Progress:

      ```bash
      openshift-install --dir=${OKD_LAB_PATH}/okd4-install-dir wait-for bootstrap-complete --log-level debug
      ```

  * When bootstrap is complete, remove the bootstrap node from HA-Proxy

      ```bash
      ssh root@okd4-lb01 "cat /etc/haproxy/haproxy.cfg | grep -v bootstrap > /etc/haproxy/haproxy.tmp && mv /etc/haproxy/haproxy.tmp /etc/haproxy/haproxy.cfg && systemctl restart haproxy.service"
      ```

    Destroy the Bootstrap Node on the Bastion host:

      ```bash
      DestroyBootstrap.sh
      ```

  * Install Progress:

      ```bash
      openshift-install --dir=${OKD_LAB_PATH}/okd4-install-dir wait-for install-complete --log-level debug
      ```

* Install Complete:

    You will see output that looks like:

    ```bash
    INFO Waiting up to 10m0s for the openshift-console route to be created... 
    DEBUG Route found in openshift-console namespace: console 
    DEBUG Route found in openshift-console namespace: downloads 
    DEBUG OpenShift console route is created           
    INFO Install complete!                            
    INFO To access the cluster as the system:admin user when using 'oc', run 'export KUBECONFIG=/root/okd4-lab/okd4-install-dir/auth/kubeconfig' 
    INFO Access the OpenShift web-console here: https://console-openshift-console.apps.okd4.your.domain.org 
    INFO Login to the console with user: kubeadmin, password: aBCdE-FGHiJ-klMNO-PqrSt
    ```

### Log into your new cluster console:

Point your browser to the url listed at the completion of install: `https://console-openshift-console.apps.okd4.your.domain.org`

Log in as `kubeadmin` with the password from the output at the completion of the install.

__If you forget the password for this initial account, you can find it in the file:__ `${OKD_LAB_PATH}/okd4-install-dir/auth/kubeadmin-password`

__Note: the first time you try to log in, you may have to wait a bit for all of the console resources to initialize.__

You will have to accept the certs for your new cluster.

### Issue commands against your new cluster:

```bash
export KUBECONFIG="${OKD_LAB_PATH}/okd4-install-dir/auth/kubeconfig"
oc get pods --all-namespaces
```

You may need to approve the certs of you master and or worker nodes before they can join the cluster:

```bash
oc get csr
```

If you see certs in a Pending state:

```bash
oc get csr -ojson | jq -r '.items[] | select(.status == {} ) | .metadata.name' | xargs oc adm certificate approve
```

Create an Empty volume for registry storage:

```bash
oc patch configs.imageregistry.operator.openshift.io cluster --type merge --patch '{"spec":{"managementState":"Managed","storage":{"emptyDir":{}}}}'
```

### If it all goes pancake shaped:

```bash
openshift-install --dir=okd4-install gather bootstrap --bootstrap 10.11.11.49 --master 10.11.11.60 --master 10.11.11.61 --master 10.11.11.62
```

### Next: 

1. Create an Image Pruner:

    ```bash
    oc patch imagepruners.imageregistry.operator.openshift.io/cluster --type merge -p '{"spec":{"schedule":"0 0 * * *","suspend":false,"keepTagRevisions":3,"keepYoungerThan":60,"resources":{},"affinity":{},"nodeSelector":{},"tolerations":[],"startingDeadlineSeconds":60,"successfulJobsHistoryLimit":3,"failedJobsHistoryLimit":3}}'
    ```
1. [Designate your Master Nodes as Infrastructure Nodes](InfraNodes.md)

    __Do Not do this step if you do not have dedicated `worker` nodes.__

    If you have dedicated worker nodes in addition to three master nodes, then I recommend this step to pin your Ingress Routers to the Master nodes.  If they restart on worker nodes, you will lose Ingress access to your cluster unless you add the worker nodes to your external HA Proxy configuration.  I prefer to use Infrasturcture nodes to run the Ingress routers and a number of other pods.

1. [Set up Htpasswd as an Identity Provider](HtPasswd.md)
1. [Deploy a Ceph cluster for block storage provisioning](Ceph.md)
1. [Create a MariaDB Galera StatefulSet](MariaDB.md)
1. [Updating Your Cluster](UpdateOKD.md)
1. Coming soon...  Tekton pipeline for Quarkus and Spring Boot applications.
1. [Gracefully shut down your cluster](ShuttingDown.md)
