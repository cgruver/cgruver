---
title: Add Worker Nodes
permalink: /home-lab/add-worker-nodes/
description: Add worker nodes to OpenShift cluster with OKD
---
## Refactor In Progress To Use The Lab CLI - The Original Instructions are Below

1. Add Worker nodes:

   ```bash
   labcli --deploy -w
   ```

   KVM:

   ```bash
   labcli --start -w
   ```

   ```bash
   labcli --csr
   ```

1. Configure control-plane nodes as Infrastructure nodes:

   ```bash
   labcli --config-infra
   ```

## Original Instructions

You can add KVM or Bare Metal worker nodes to your cluster.  It's also possible to mix and match them.

For hosting 3 KVM based Worker Nodes, you will need another NUC like the one that you used to build the initial lab.  Like before, it will need at least 4 cores, 1TB NVMe, and 64GB of RAM.

For a Bare Metal worker node, you will need one or more NUCs with at least an Intel i3 CPU and 32 GB of RAM.  If you configure them with at least 1TB NVMe drives, then you can also set them up to serve Ceph storage via the Rook Operator.

1. Update the helper scripts for this project:

   ```bash
   cd ${OKD_LAB_PATH}/okd-home-lab
   git fetch
   git pull
   cp ./bin/*.sh ${OKD_LAB_PATH}/bin
   chmod 700 ${OKD_LAB_PATH}/bin/*.sh
   ```

1. Read the `MAC` address off of the bottom of the NUC and create an environment variable:

  ```bash
  MAC_ADDR=1c:69:7a:6f:ab:12  # Substiture your NUC's MAC Address
  ```

1. Add another `kvm-hosts` entry to your lab config file, and add records for the new worker nodes:

   ```bash
   cat << EOF > ${OKD_LAB_PATH}/lab-config/add-workers.yaml
   kvm-hosts:
   - host-name: kvm-host02
     mac-addr: ${MAC_ADDR}
     ip-octet: 201
     disks:
       disk1: nvme0n1
       disk2: NA
   compute-nodes:
     - metal: false
       name: ""
       kvm-host: kvm-host02
       node-spec:
         memory: 20480
         cpu: 6
         root_vol: 50
         ceph_vol: 200
     - metal: false
       name: ""
       kvm-host: kvm-host02
       node-spec:
         memory: 20480
         cpu: 6
         root_vol: 50
         ceph_vol: 200
     - metal: false
       name: ""
       kvm-host: kvm-host02
       node-spec:
         memory: 20480
         cpu: 6
         root_vol: 50
         ceph_vol: 200
   EOF
   ```

1. Select the Lab subdomain that you want to work with:

   ```bash
   labctx
   ```

1. Use `yq` to merge the new records into your lab configuration YAML file:

   ```bash
   yq eval-all --inplace 'select(fileIndex == 0) *+ select(fileIndex == 1)' ${OKD_LAB_PATH}/lab-config/${SUB_DOMAIN}-cluster.yaml ${OKD_LAB_PATH}/lab-config/add-workers.yaml
   rm ${OKD_LAB_PATH}/lab-config/add-workers.yaml
   ```

1. Take a look at the config file now:

   `${OKD_LAB_PATH}/lab-config/${SUB_DOMAIN}-cluster.yaml` should now look something like:

   ```yaml
   cluster-name: okd4
   bootstrap:
     kvm-host: kvm-host01
     memory: 12288
     cpu: 4
     root_vol: 50
   control-plane:
     memory: 20480
     cpu: 6
     root_vol: 100
     kvm-hosts:
     - kvm-host01
     - kvm-host01
     - kvm-host01
   kvm-hosts:
   - host-name: kvm-host01
     mac-addr: 1c:69:7a:6f:cd:23
     ip-octet: 200
     disks:
       disk1: nvme0n1
       disk2: NA
   - host-name: kvm-host02
     mac-addr: 1c:69:7a:6f:ab:12
     ip-octet: 201
     disks:
       disk1: nvme0n1
       disk2: NA
   compute-nodes:
     - metal: false
       name: ""
       kvm-host: kvm-host02
       node-spec:
         memory: 20480
         cpu: 6
         root_vol: 50
         ceph_vol: 200
     - metal: false
       name: ""
       kvm-host: kvm-host02
       node-spec:
         memory: 20480
         cpu: 6
         root_vol: 50
         ceph_vol: 200
     - metal: false
       name: ""
       kvm-host: kvm-host02
       node-spec:
         memory: 20480
         cpu: 6
         root_vol: 50
         ceph_vol: 200
   ```

1. Create the KVM host install config:

   ```bash
   deployKvmHosts.sh -h=kvm-host02 -d=${SUB_DOMAIN}
   ```

1. Now, connect the NUC to the remaining LAN port on the internal router and power it on. After a few minutes, it should be up and running.

1. Verify that everything looks good on the new host:

   ```bash
   ssh root@kvm-host02.${SUB_DOMAIN}.${LAB_DOMAIN}
   # Take a look around
   exit
   ```

1. Now, back to the business of doubling our workforce.

   Initialize the ignition files and iPXE boot files for the new worker nodes:

   ```bash
   deployOkdNodes.sh -w -d=${SUB_DOMAIN}
   ```

1. Start the nodes:

   ```bash
   startNodes.sh -w -d=${SUB_DOMAIN}
   ```

1. Now, you need to monitor the cluster Certificate Signing Requests.  You are looking for requests in a `Pending` state.

   ```bash
   watch "oc get csr | grep Pending"
   ```

1. When you see Certificate Signing Requests in a `Pending` state, you need to approve them:

   ```bash
   oc get csr -ojson | jq -r '.items[] | select(.status == {} ) | .metadata.name' | xargs oc adm certificate approve
   ```

   __There will be a total of 9 CSRs that you need to approve.__
   3 CSRs appear first for the node bootstrap.
   The final three will be for each worker node.


## Designate Master nodes as Infrastructure nodes

Since we now have three dedicated worker nodes for our applications, let's move the infrastructure functions to the control plane.

1. Add a label to your master nodes:

   ```bash
   for i in 0 1 2
   do
   oc label nodes okd4-master-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} node-role.kubernetes.io/infra=""
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
