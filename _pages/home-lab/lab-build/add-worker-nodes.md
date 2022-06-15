---
title: Add Worker Nodes
permalink: /home-lab/add-worker-nodes/
description: Add worker nodes to OpenShift cluster with OKD
---
You can add KVM or Bare Metal worker nodes to your cluster.  It's also possible to mix and match them.

For hosting 3 KVM based Worker Nodes, you will need another NUC like the one that you used to build the initial lab.  Like before, it will need at least 4 cores, 1TB NVMe, and 64GB of RAM.

For a Bare Metal worker node, you will need one or more NUCs with at least an Intel i3 CPU and 32 GB of RAM.  If you configure them with at least 1TB NVMe drives, then you can also set them up to serve Ceph storage via the Rook Operator.

If you are adding a new host for `KVM` based nodes, then you need to add an appropriate entry to your domain config YAML file.

The [Kamarotos](https://github.com/cgruver/kamarotos) project includes examples that you can copy.

For example: [kvm-cluster-3-worker.yaml](https://github.com/cgruver/kamarotos/blob/main/examples/domain-configs/kvm-cluster-3-worker.yaml) contains the configuration for 2 KVM hosts with the control plane nodes on the first host, and 3 worker nodes on the second host:

```yaml
...
kvm-hosts:
  - host-name: kvm-host01
    mac-addr: "YOUR_HOST_MAC_HERE"
    ip-addr: 10.11.14.200
    disks:
      disk1: nvme0n1
      disk2: NA
  - host-name: kvm-host02
    mac-addr: "YOUR_HOST_MAC_HERE"
    ip-addr: 10.11.14.201
    disks:
      disk1: nvme0n1
      disk2: NA
...
compute-nodes:
  - metal: false
    ip-addr: 10.11.14.63
    kvm-host: kvm-host02
    node-spec:
      memory: 20480
      cpu: 6
      root-vol: 100
    ceph:
      ceph-dev: /dev/sdb
      ceph-vol: 200
      type: disk
  - metal: false
    ip-addr: 10.11.14.64
    kvm-host: kvm-host02
    node-spec:
      memory: 20480
      cpu: 6
      root-vol: 100
    ceph:
      ceph-dev: /dev/sdb
      ceph-vol: 200
      type: disk
  - metal: false
    ip-addr: 10.11.14.65
    kvm-host: kvm-host02
    node-spec:
      memory: 20480
      cpu: 6
      root-vol: 100
    ceph:
      ceph-dev: /dev/sdb
      ceph-vol: 200
      type: disk
```

__Note:__ Each compute node is also configured with a second disk for hosting Ceph storage.

Once you have the configuration updated, it's time to add the worker nodes.

1. If you are adding a second KVM host:

   ```bash
   labcli --deploy -k -h=kvm-host02  # Replace "kvm-host02" with the host name value of the kvm-host entry in the YAML config file.
   ```

   Power on the host, and wait for it to complete its install of CentOS Stream.

1. Create the configuration for the worker nodes:

   ```bash
   labcli --deploy -w
   ```

1. Start the worker nodes:

   __KVM:__

   ```bash
   labcli --start -w
   ```

   __Metal__

   Hit the power button.

1. As the worker nodes install, there are CSRs that need to be approved.

   ```bash
   labcli --csr
   ```

   __Note:__ There will be 3 CSRs per worker node.

1. Configure control-plane nodes as Infrastructure nodes:

   ```bash
   labcli --config-infra
   ```

### That's it!  We now have more compute nodes in our cluster
