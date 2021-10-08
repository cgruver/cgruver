---
layout: pages
permalink: /home-lab/configuration/
title: Configuration Files & Deployment Automation for Your Lab
description: YAML configuration files for home lab automation
tags:
  - yaml
  - home lab
  - openshift lab
---
There are two YAML configuration files that are used by the helper scripts for deploying the infrastructure for you home lab:

The first configuration file defines the networks for your lab, as well as any KVM Hosts that are deployed on the edge LAN network.

```yaml
# Edge LAN Configuration
domain: my.awesome.lab
network: 10.11.12.0
router-ip: 10.11.12.1
bastion-ip: 10.11.12.10
netmask: 255.255.255.0
# Region Network Configurations
sub-domain-configs:
- name: dev
  router-edge-ip: 10.11.12.2
  router-ip: 10.11.13.1
  network: 10.11.13.0
  netmask: 255.255.255.0
  cluster-config-file: /home/username/okd-lab/lab-config/dev-cluster.yaml
- name: qa
  router-edge-ip: 10.11.12.3
  router-ip: 10.11.14.1
  network: 10.11.14.0
  netmask: 255.255.255.0
  cluster-config-file: /home/username/okd-lab/lab-config/qa-cluster.yaml
- name: prod
  router-edge-ip: 10.11.12.4
  router-ip: 10.11.15.1
  network: 10.11.15.0
  netmask: 255.255.255.0
  cluster-config-file: /home/username/okd-lab/lab-config/prod-cluster.yaml
# KVM Hosts provisioned on the Edge LAN network
kvm-hosts:
- host-name: kvm-host01
  mac-addr: 1c:69:7a:6f:ab:12
  ip-octet: 200
  disks:
    disk1: nvme0n1
    disk2: NA
- host-name: kvm-host02
  mac-addr: 1c:69:7a:6f:cd:34
  ip-octet: 201
  disks:
    disk1: nvme0n1
    disk2: nvme0n2
```

| Edge LAN Configuration Options | |
| --- | --- |
| domain | The root domain for your lab network |
| network | The edge LAN network for your lab that is isolated from your Home network |
| router-ip | The IP address of your edge LAN router |
| bastion-ip | The IP address of the Raspberry Pi 4B that we'll set up as a bastion host |
| netmask | The Netmask of the edge LAN |
| sub-domain-configs | A list of internal network configurations that define segmented regions in your lab |
| kmv-hosts | A list of configurations for KVM hosts that are provisioned in your edge LAN region |

| Internal Region Options `sub-domain-configs` | |
| --- | --- |
| name | The name of the region. i.e. `dev` This also defines the domain: `dev.my.awesome.lab` |
| router-edge-ip | The LAN facing IP address of the region router |
| router-ip | The internal IP address of the region router |
| network | The region network |
| netmask | The region netmask |
| cluster-config-file | The path to a YAML file which defines the configuration for an OpenShift cluster in the region |

| KVM Host Options `kvm-hosts` | |
| --- | --- |
| host-name | The hostname that will the KVM host will be provisioned with. The hostname will be appended to the region's domain. i.e. kvm-host01.my.awesome.lab |
| mac-addr | The MAC address of the NIC that will be used for iPXE booting the host. |
| ip-octet | The forth octet of the IP address that will be provisioned for the KVM Host. i.e. 10.11.12.200 |
| disks.disk1 | The name of the disk that will be partitioned during installation |
| disks.disk2 | The name of a second disk to combine with the first disk for partitioning (an LVM volume group will span the two disks) |

The second YAML file defines the infrastructure for provisioning an OpenShift Cluster:

```yaml
# Cluster Configuration
cluster-name: okd4
secret-file: ${OKD_LAB_PATH}/pull_secret.json
local-registry: nexus.${LAB_DOMAIN}:5001
remote-registry: quay.io/openshift/okd
# KVM Hosts provisioned in the region
kvm-hosts:
  - host-name: kvm-host01
    mac-addr: 1c:69:7a:6f:ef:56
    ip-octet: 200
    disks:
      disk1: nvme0n1
      disk2: NA
  - host-name: kvm-host02
    mac-addr: 1c:69:7a:6f:ba:21
    ip-octet: 201
    disks:
      disk1: nvme0n1
      disk2: NA
# Bootstrap Node configuration
bootstrap:
    kvm-host: kvm-host01
    memory: 12288
    cpu: 4
    root_vol: 50
# Master Node configuraion
control-plane:
    memory: 20480
    cpu: 6
    root_vol: 100
    kvm-hosts:
    - kvm-host01
    - kvm-host01
    - kvm-host01
# Worker Node configuraion
compute-nodes:
  memory: 20480
  cpu: 4
  root_vol: 50
  ceph_vol: 200
  kvm-hosts:
    - kvm-host02
    - kvm-host02
    - kvm-host02
```

| Cluster Configuration | |
| --- | --- |
| cluster-name | The name that will be used for the OpenShift Cluster.  This will also define it's network domain. i.e. `okd4.dev.my.awesome.lab` |
| secret-file | The path to the pull secret for this CLuster |
| local-registry | The URL of the lab Nexus registry that will be used for secure image mirroring |
| remote-registry | The URL of the source registry for the OpenShift images |
| bootstrap | Configuration for the bootstrap node: |
| control-plane | Configuration for the three master nodes of your cluster |
| compute-nodes | (__optional__) Configuration for the worker nodes of your cluster |
| kvm-hosts | A list of host configurations used to automate the provisioning of KVM hosts in your lab. |

| KVM Host Options `kvm-hosts` | |
| --- | --- |
| host-name | The hostname that will the KVM host will be provisioned with. The hostname will be appended to the region's domain. i.e. kvm-host01.dev.my.awesome.lab |
| mac-addr | The MAC address of the NIC that will be used for iPXE booting the host. |
| ip-octet | The forth octet of the IP address that will be provisioned for the KVM Host. i.e. 10.11.12.200 |
| disks.disk1 | The name of the disk that will be partitioned during installation |
| disks.disk2 | The name of a second disk to combine with the first disk for partitioning (an LVM volume group will span the two disks) |

| Bootstrap Configuration `bootstrap` | |
| --- | --- |
| kvm-host | The target libvirt host where the bootstrap node will be deployed |
| memory | The amount of RAM to be provisioned for the node |
| cpu | The number of vCPUs to be provisioned for the node |
| root_vol | The size, in Gb, of the disk to be provisioned for the node |

| Control Plane Configuration `control-plane` | |
| --- | --- |
| memory | The amount of RAM to be provisioned for each node |
| cpu | The number of vCPUs to be provisioned for each node |
| root-vol | The size, in Gb, of the disk to be provisioned for each node |
| kvm-hosts | A list of three KVM hostnames in the region.  One entry for each of the three master nodes. A master node will be provisioned for each of the entries.  If the hostnames are different then a master node will be provisioned on each KVM Host.  If the hostnames are the same, then all three master nodes will be provisioned on the same KVM host. |

| Worker Node Configuration `compute-nodes` | |
| --- | --- |
| memory | The amount of RAM to be provisioned for each node |
| cpu | The number of vCPUs to be provisioned for each node |
| root-vol | The size, in Gb, of the disk to be provisioned for each node |
| ceph-vol | (__optional__) The size , in Gb, of a second disk to be provisioned for each node.  This can be used for provisioning Ceph storage for you cluster. |
| kvm-hosts | A list of KVM hostnames in the region.  One Worker node will be provisioned for each entry in this list.  The node will be provisioned on the indicated KVM host.  This allows you to spread your compute nodes across your KVM hosts.  The provisioning script will select hostnames and IP addresses for the nodes. |

### Lab Helper Scripts

The helper scripts for this project are located in the `bin` directory of this repository: [https://github.com/cgruver/okd-home-lab](https://github.com/cgruver/okd-home-lab)

| Lab Helper Scripts | |
| --- | --- |
| createEnvScript.sh | Creates configuration files for the lab network routers  |
| deployKvmHosts.sh | Creates iPXE, Kickstart, and DNS configuration for provisioning the bare metal KVM hosts in your lab |
| deployOkdNodes.sh | Creates the OpenShift install manifests, Ignition files, and provisions the KVM guests for your OpenShift clusters |
| destroyNodes.sh | Deletes OpenShift nodes and removes the DNS, iPXE, and ignitions configurations |
| mirrorOkdRelease.sh | Mirrors the OpenShift install images to a local image registry |
| startNodes.sh | Starts KVM guests |
