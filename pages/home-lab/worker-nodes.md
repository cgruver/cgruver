---
layout: page
title: Add Worker Nodes
permalink: /home-lab/worker-nodes/
---

You will need another NUC like the one that you used to build the initial lab.  Like before, it will need at least 4 cores, 1TB NVMe, and 64GB of RAM.

1. First, make sure that you have DNS A and PTR records for the new host. The DNS configuration that we set up previously included three KVM hosts, kvm-host01, kvm-host02, and kvm-host03.  So, let's assume that this host is going to be `kvm-host02`.

1. Update the helper scripts for this project:

   ```bash
   cd ${OKD_LAB_PATH}/okd-home-lab
   git fetch
   git pull
   cp ./bin/*.sh ${OKD_LAB_PATH}/bin
   chmod 700 ${OKD_LAB_PATH}/bin/*.sh
   ```

1. Read the MAC address off of the bottom of the NUC. Then create the iPXE and kickstart files with the helper script:

   ```bash
   ${OKD_LAB_PATH}/bin/deployKvmHost.sh -c=1 -h=kvm-host02 -m=<MAC Address Here> -d=nvme0n1
   ```

1. Now, connect the NUC to the remaining LAN port on the internal router and power it on. After a few minutes, it should be up and running.

1. Verify that everything looks good on the new host:

   ```bash
   ssh root@kvm-host02.dc1.${LAB_DOMAIN}
   # Take a look around
   exit
   ```

1. Now, back to the business of doubling our workforce.

   Create the inventory file for the new worker nodes:

   ```bash
   cat << EOF > ${OKD_LAB_PATH}/worker-inventory
   kvm-host02,okd4-worker-0,20480,6,100,200,worker
   kvm-host02,okd4-worker-1,20480,6,100,200,worker
   kvm-host02,okd4-worker-2,20480,6,100,200,worker
   EOF
   ```

   __Note:__ We added an extra disk to these nodes.  Next week we'll install Ceph cloud storage using those disks.

1. Initialize the ignition files and iPXE boot files for the new worker nodes:

   ```bash
   ${OKD_LAB_PATH}/bin/initWorker.sh -i=${OKD_LAB_PATH}/worker-inventory -c=1
   ```

1. Start the nodes:

   ```bash
   ${OKD_LAB_PATH}/bin/startNodes.sh -i=${OKD_LAB_PATH}/worker-inventory -c=1
   ```

1. Now, you need to monitor the cluster Certificate Signing Requests.  You are looking for requests in a `Pending` state.

   ```bash
   watch oc get csr
   ```

1. When you see Certificate Signing Requests in a `Pending` state, you need to approve them:

   ```bash
   oc get csr -ojson | jq -r '.items[] | select(.status == {} ) | .metadata.name' | xargs oc adm certificate approve
   ```

   __There will be a total of 6 CSRs that you need to approve.__

## Designate Master nodes as Infrastructure nodes

Since we now have three dedicated worker nodes for our applications, let's move the infrastructure functions to the control plane.

1. Add a label to your master nodes:

   ```bash
   for i in 0 1 2
   do
   oc label nodes okd4-master-${i}.dc1.${LAB_DOMAIN} node-role.kubernetes.io/infra=""
   done
   ```

1. Remove the `worker` label from the master nodes:

   ```bash
   oc patch scheduler cluster --patch '{"spec":{"mastersSchedulable":false}}' --type=merge
   ```

1. Add `nodePlacement` and taint tolerations to the Ingress Controller:

   ```bash
   oc patch -n openshift-ingress-operator ingresscontroller default --patch '{"spec":{"nodePlacement":{"nodeSelector":{"matchLabels":{"node-role.kubernetes.io/infra":""}},"tolerations":[{"key":"node.kubernetes.io/unschedulable","effect":"NoSchedule"},{"key":"node-role.kubernetes.io/master","effect":"NoSchedule"}]}}}' --type=merge
   ```

1. Verify that your Ingress pods get provisioned onto the master nodes:

   ```bash
   oc get pod -n openshift-ingress -o wide
   ```

1. Reset the Ingress Canary pods:

   This will eliminate an annoying message about the ingress-canaries running on the wrong nodes.

   ```bash
   for i in $(oc get pods -n openshift-ingress-canary | grep -v NAME | cut -d" " -f1)
   do
     oc delete pod ${i} -n openshift-ingress-canary
   done
   ```

1. Repeat for the ImageRegistry:

   ```bash
   oc patch configs.imageregistry.operator.openshift.io cluster --patch '{"spec":{"nodeSelector":{"node-role.kubernetes.io/infra":""},"tolerations":[{"key":"node.kubernetes.io/unschedulable","effect":"NoSchedule"},{"key":"node-role.kubernetes.io/master","effect":"NoSchedule"}]}}' --type=merge
   ```

1. Finally for Cluster Monitoring:

   Create a config map for cluster monitoring:

   ```bash
   cat << EOF | oc apply -f -
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: cluster-monitoring-config
     namespace: openshift-monitoring
   data:
     config.yaml: |
       prometheusOperator:
         nodeSelector:
           node-role.kubernetes.io/infra: ""
         tolerations:
         - key: "node-role.kubernetes.io/master"
           operator: "Equal"
           value: ""
           effect: "NoSchedule"
       prometheusK8s:
         nodeSelector:
           node-role.kubernetes.io/infra: ""
         tolerations:
         - key: "node-role.kubernetes.io/master"
           operator: "Equal"
           value: ""
           effect: "NoSchedule"
       alertmanagerMain:
         nodeSelector:
           node-role.kubernetes.io/infra: ""
         tolerations:
         - key: "node-role.kubernetes.io/master"
           operator: "Equal"
           value: ""
           effect: "NoSchedule"
       kubeStateMetrics:
         nodeSelector:
           node-role.kubernetes.io/infra: ""
         tolerations:
         - key: "node-role.kubernetes.io/master"
           operator: "Equal"
           value: ""
           effect: "NoSchedule"
       grafana:
         nodeSelector:
           node-role.kubernetes.io/infra: ""
         tolerations:
         - key: "node-role.kubernetes.io/master"
           operator: "Equal"
           value: ""
           effect: "NoSchedule"
       telemeterClient:
         nodeSelector:
           node-role.kubernetes.io/infra: ""
         tolerations:
         - key: "node-role.kubernetes.io/master"
           operator: "Equal"
           value: ""
           effect: "NoSchedule"
       k8sPrometheusAdapter:
         nodeSelector:
           node-role.kubernetes.io/infra: ""
         tolerations:
         - key: "node-role.kubernetes.io/master"
           operator: "Equal"
           value: ""
           effect: "NoSchedule"
       openshiftStateMetrics:
         nodeSelector:
           node-role.kubernetes.io/infra: ""
         tolerations:
         - key: "node-role.kubernetes.io/master"
           operator: "Equal"
           value: ""
           effect: "NoSchedule"
       thanosQuerier:
         nodeSelector:
           node-role.kubernetes.io/infra: ""
         tolerations:
         - key: "node-role.kubernetes.io/master"
           operator: "Equal"
           value: ""
           effect: "NoSchedule"
   EOF
   ```

### That's it!  We now have three more nodes in our cluster.