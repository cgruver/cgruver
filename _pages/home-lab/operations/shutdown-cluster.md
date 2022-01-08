---
title: Gracefully Shut Down Your Cluster
sitemap: false
published: false
---

1. Select the Lab subdomain that you want to work with:

   ```bash
   labctx
   ```

1. Shutdown the Image Registry:

   ```bash
   oc patch configs.imageregistry.operator.openshift.io cluster --type merge --patch '{"spec":{"managementState":"Removed"}}'
   ```

1. Cordon, and Drain the `worker` nodes:  (This will take a while, be patient)

   ```bash
   for i in 0 1 2 ; do oc adm cordon okd4-worker-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} ; done

   for i in 0 1 2 ; do oc adm drain okd4-worker-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} --ignore-daemonsets --force --grace-period=60 --delete-emptydir-data; done
   ```

1. Shut down the worker nodes: (Wait for them to all shut down before proceeding)

   ```bash
   for i in 0 1 2 ; do ssh core@okd4-worker-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} "sudo shutdown -h now"; done
   for i in 1 2 3 ; do ssh root@kvm-host0${i}.${SUB_DOMAIN}.${LAB_DOMAIN} "virsh list --all" ; done
   ```

Shut down the master nodes: (Wait for them to all shut down before proceeding)

   ```bash
   for i in 0 1 2 ; do ssh core@okd4-master-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} "sudo shutdown -h now"; done
   for i in 1 2 3 ; do ssh root@kvm-host0${i}.${SUB_DOMAIN}.${LAB_DOMAIN} "virsh list --all" ; done
   ```

Shut down the kvm-hosts:

   ```bash
   for i in 1 2 3 ; do ssh root@kvm-host0${i}.${SUB_DOMAIN}.${LAB_DOMAIN} "shutdown -h now" ; done
   ```

Shutdown the internal router and bastion:

   ```bash
   ssh root@router.${SUB_DOMAIN}.${LAB_DOMAIN} "poweroff"
   ssh root@bastion.${LAB_DOMAIN} "poweroff"
   ```

Finally, shutdown your edge router: (Note, this will disconnect you from the internet)

   ```bash
   ssh root@router.${LAB_DOMAIN} "poweroff"
   ```

### Restarting after shutdown:

   ```bash
    oc login -u admin  https://api.okd4.${LAB_DOMAIN}:6443

    oc get nodes

    NAME                                 STATUS                        ROLES          AGE   VERSION
    okd4-master-0.your.domain.org   Ready                         infra,master   21d   v1.17.1
    okd4-master-1.your.domain.org   Ready                         infra,master   21d   v1.17.1
    okd4-master-2.your.domain.org   Ready                         infra,master   21d   v1.17.1
    okd4-worker-0.your.domain.org   NotReady,SchedulingDisabled   worker         21d   v1.17.1
    okd4-worker-1.your.domain.org   NotReady,SchedulingDisabled   worker         21d   v1.17.1
    okd4-worker-2.your.domain.org   NotReady,SchedulingDisabled   worker         21d   v1.17.1

    oc get nodes

    NAME                                 STATUS                     ROLES          AGE   VERSION
    okd4-master-0.your.domain.org   Ready                      infra,master   21d   v1.17.1
    okd4-master-1.your.domain.org   Ready                      infra,master   21d   v1.17.1
    okd4-master-2.your.domain.org   Ready                      infra,master   21d   v1.17.1
    okd4-worker-0.your.domain.org   Ready,SchedulingDisabled   worker         21d   v1.17.1
    okd4-worker-1.your.domain.org   Ready,SchedulingDisabled   worker         21d   v1.17.1
    okd4-worker-2.your.domain.org   Ready,SchedulingDisabled   worker         21d   v1.17.1

    oc get nodes

    NAME                                 STATUS   ROLES          AGE   VERSION
    okd4-master-0.your.domain.org   Ready    infra,master   21d   v1.17.1
    okd4-master-1.your.domain.org   Ready    infra,master   21d   v1.17.1
    okd4-master-2.your.domain.org   Ready    infra,master   21d   v1.17.1
    okd4-worker-0.your.domain.org   Ready    worker         21d   v1.17.1
    okd4-worker-1.your.domain.org   Ready    worker         21d   v1.17.1
    okd4-worker-2.your.domain.org   Ready    worker         21d   v1.17.1


    for i in 0 1 2 ; do oc adm uncordon okd4-worker-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} ; done

    oc patch configs.imageregistry.operator.openshift.io cluster --type merge --patch '{"spec":{"managementState":"Managed"}}'
   ```
