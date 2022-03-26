---
permalink: /home-lab/labcli/
title: "Command Line Interface for your Kubernetes (OpenShift) Home Lab"
description: "CLI for OpenShift and OKD Home Lab with Raspberry Pi, Intel NUC, CentOS Stream, and OpenWRT"
tags:
  - openshift
  - okd
  - kubernetes
  - openwrt
  - raspberry pi
  - home lab
---
I have provided a set of shell utilities to simplify many of the provisioning and management tasks for your lab.  These utilities also enable you to run multiple OpenShift clusters at the same time.

__Note:__ These utilities are very opinionated toward the equipment that I run in my lab.  See the equipment list here: [Lab Equipment](/home-lab/equipment/)

You can get the utilities from: [https://github.com/cgruver/kamarotos](https://github.com/cgruver/kamarotos)

## Install the Utilities

1. Prepare your lab working directory:

   ```bash
   export OKD_LAB_PATH=${HOME}/okd-lab
   mkdir ${OKD_LAB_PATH}
   ```

1. Install the `yq` command for YAML file manipulation.  My lab utilities are dependent on it:

   ```bash
   brew install yq
   ```

1. Clone the utiliy code repo:

   ```bash
   git clone https://github.com/cgruver/kamarotos.git ${OKD_LAB_PATH}/kamarotos
   ```

1. Install the utility scripts:

   ```bash
   cp ${OKD_LAB_PATH}/kamarotos/bin/* ${OKD_LAB_PATH}/bin
   chmod 700 ${OKD_LAB_PATH}/bin/*
   ```

1. Edit your shell `rc` (`.bashrc` or `.zshrc`) file to enable the utilities in the path, and load that lab functions into the shell:

   ```bash
   export OKD_LAB_PATH=${HOME}/okd-lab
   export PATH=$PATH:${OKD_LAB_PATH}/bin
   export LAB_CONFIG_FILE=${OKD_LAB_PATH}/lab-config/lab.yaml
   . ${OKD_LAB_PATH}/bin/labctx.env
   ```

1. Log off and back on to set the variables.

## Lab CLI Documentation: `labctx` & `labcli`

## `labctx`

`labctx` is used to set local environment variables in your shell that the `labcli` command uses to interact with a given domain in your lab.

It can be executed in two ways:

### Interactive

With no argument, `labctx` will parse your lab configuration files and ask you to select the domain that you want to work with in a given shell terminal:

```bash
user@localhost ~ % labctx
1 - cp
2 - dc1
3 - dc2
4 - dc3
5 - metal
Enter the index of the domain that you want to work with:
```

Key in the index value for the domain that you want to work with and press `return`:

```bash
user@localhost ~ % labctx
1 - cp
2 - dc1
3 - dc2
4 - dc3
5 - metal
Enter the index of the domain that you want to work with:
3
Your shell environment is now set up to control lab domain: dc2.my.awesome.lab
user@localhost ~ %
```

List your environment variables, and you will see that your shell is now setup with a lot of domain specific variables that the `labcli` operations will use.

### Explicit

By passing an argument indicating the domain that you want to manage, `labctx` will bypass the interactive selection.

```bash
labctx dc2
```

## `labcli`

The `labcli` command has multiple subcommands and one global, optional argument:

### `labcli -d=<domain> --subcommand -subcommand-option`

The optional `-d=domain` argument will bypass the interactive invocation of `labctx` and use the domain specified.  

example: `labcli -d=dc2 --pi -s`

__Note:__ The domain variable set in the execution of `labcli` do not alter your current shell environment.

### `labcli --pi`

The `pi` subcommand is used to configure the Raspberry Pi that is used for host installation, Sonatype Nexus, and other functions.

`labcli --pi` has four options:

1. `labcli --pi -i` Initialize the SD-Card for the Raspberry Pi

1. `labcli --pi -s` Perform the initial setup of the Raspberry Pi after booting from the SD-Card

1. `labcli --pi -n` Install and configure Sonatype Nexus

1. `labcli --pi -g` Install and configure Gitea

### `labcli --router`

The `router` subcommand is used to configure the GL-iNet routers that I use in my lab.

`labcli --router` has three operations:

1. `labcli --router -i` Initialize a new or reset edge or domain router to prepare it for your network.

   Add the `-e` option to initialize the edge network router.

   `labcli --router -e -i`

   Add the `-wl` option to configure a wireless lan on the GL-iNet MV1000W

   Add the `-ww` option to configure a wireless repeater on the GL-iNet MV1000W

   Example: Initialize the edge network router with WiFi lan, and a repeater connection to your home WiFi:

   `labcli --router -e -i -wl -ww`

1. `labcli --router -s` Configure a domain or edge router that is attached to the lab network

   This command takes two optional variables:

   1. Add the `-e` option to operate on the edge network router.

   1. Add the `-aw` option to configure a wireless lan on the GL-iNet MV1000 with a supported WiFi dongle attached

### `labcli --disconnect`

This command will deny internet access to the selected lab domain.

Use this to simulate a disconnected or air-gapped data center environment.

### `labcli --connect`

This command will restore internet access to the selected lab domain.

Use this when you get really annoyed that most Kubernetes projects don't consider use in an air-gapped environment.  __;-)__

### `labcli --deploy`

The `deploy` subcommand is used to deploy the compute infrastructure for your home lab.

`labcli --deploy` has three operations:

1. `labcli --deploy -c` Creates the deployment configuration and artifacts for the control plane for an OpenShift cluster in the selected domain.

1. `labcli --deploy -w` Creates the deployment configuration and artifacts for worker nodes for an OpenShift cluster in the selected domain.

1. `labcli --deploy -k` Creates the deployment configuration and artifacts for CentOS Stream based KVM hosts.

### `labcli --destroy`

The `destroy` subcommand is used to tear down lab infrastructure.

`labcli --destroy` has five operations:

1. `labcli --destroy -b` Removes the `boostrap` node during an OpenShift cluster install.

1. `labcli --destroy -w=<host-name>` Removes the specified worked node from the OpenShift cluster.  If `-w=all` then it removes all worker nodes from the cluster.

1. `labcli --destroy -c` Tears down the whole OpenShift cluster.

1. `labcli --destroy -k=<host-name>` Destroys the specified KVM host from a lab domain.  If `-k=all` then it removes all KVM hosts from the domain.  The KVM hosts are reset to PXE boot on the next power on.

1. `labcli --destroy -m=<host-name>` Removes a control-plan node from the OpenShift cluster.

### `labcli --start`

The `start` subcommand is used to start the KVM guests that are part of an OpenShift cluster.

`labcli --start` has four operations:

1. `labcli --start -b` Brings up the bootstrap node to start an OpenShift cluster install.

1. `labcli --start -m` Brings up the control-plane nodes of an OpenShift cluster.

1. `labcli --start -w` Brings up the worker nodes of an OpenShift cluster.

1. `labcli --start -u` Removes the scheduling cordon from the worker nodes of an OpenShift cluster that has been shut down.

### `labcli --stop`

The `stop` subcommand is used to shut down OpenShift cluster nodes in a lab domain.

`labcli --stop` has two operations:

1. `labcli --stop -w` Gracefully shuts down the worker nodes in an OpenShift cluster.

1. `labcli --stop -c` Gracefully shuts down an entire OpenShift cluster.

### `labcli --user`

The `user` subcommand is used to add htpasswd authenticated users to your OpenShift clusters

`labcli --user` has one operation with two optional flags:

To initialize the htpasswd OAuth provider and create a cluster admin user:

`labcli --user -i -a -u=<user-name>` This will prompt for a passwd, create the htpasswd secret, patch the oauth provider for htpasswd, and then grant the new user the cluster-admin role.

To add additional users:

`labcli --user -u=<user-name>` This will prompt for a passwd, and create a user in the cluster.

`labcli --user -a -u=<user-name>` This will prompt for a passwd, and create a cluster admin user in the cluster.

### `labcli --trust`

The `trust` subcommand will pull the self-signed cert from a cluster and trust it on your workstation.

### `labcli --config-infra`

The `config-infra` subcommand is used after installing a cluster and adding worker nodes.  It wil label the control plan nodes as infrastructure nodes, and move the ingress, registry, and monitoring workloads to the control plane, leaving your worker nodes for application workloads.

### `labcli --csr`

The `csr` subcommand is used during the installation of worker nodes to approve the certificate signing requests from the new worker nodes.

### `labcli --pull-secret`

The `pull-secret` subcommand is used in preparation for installing an OpenShift cluster to prepare the registry Pull Secret.

### `labcli --latest`

The `latest` subcommand will update the selected domain to use the latest release of OKD.

### `labcli --mirror`

The `mirror` subcommand creates a local mirror of the OpenShift images for executing a disconnected network install.

### `labcli --cli`

The `cli` subcommand will download the OpenShift cli for the selected lab domain, and create symbolic links in the shell path.

### `labcli --kube`

The `kube` subcommand retrieves the saved kubeadmin credentials to give you break-glass access to the selected domain cluster.

## Convienience operations for Mac OS users:

### `labcli --console`

The `console` subcommand launches the Safari web browser with the URL of the selected OpenShift cluster.

### `labcli --login`

The `login` command will issue `oc login` against the selected domain cluster.

### `labcli --dns`

The `dns` subcommand will reset the Mac OS DNS client.  This is sometimes necessary to clear the cache.

### `labcli --git-secret -n=<kube namespace>`

The `git-secret` subcommand will create a basic auth secret for your git service account and assign it to the `pipeline` service account in the designated namespace.

## `labcli` Configuration Files

There are two YAML configuration files that are used by the `labcli` utilities for deploying the infrastructure for you home lab:

The first configuration file defines the networks for your lab, as well as any KVM Hosts that are deployed on the edge LAN network.

```yaml
# Edge LAN Configuration
domain: my.awesome.lab
network: 10.11.12.0
router-ip: 10.11.12.1
bastion-ip: 10.11.12.10
netmask: 255.255.255.0
# CentOS Stream Mirror to pull from
centos-mirror: rsync://mirror.cogentco.com/CentOS/
# Gitea release to install on Bastion Host
gitea-version: 1.15.9
# URL of your git server
git-url: https://gitea.my.awesome.lab:3000
# OpenWRT version to install on the Bastion Host
openwrt-version: 21.02.1
# Region Network Configurations
sub-domain-configs:
  # Domain Name, this is prepended to the lab domain. i.e. dev.my.awesome.lab
- name: dev
  # edge network ip address of the domain router
  router-edge-ip: 10.11.12.2
  # internal ip address of the domain router
  router-ip: 10.11.13.1
  # domain network
  network: 10.11.13.0
  # domain netmask
  netmask: 255.255.255.0
  # path to the OpenShift cluster config file
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
  # hostname to assign to the physical host
- host-name: kvm-host01
  # MAC Address of the NIC that will be used for network booting and configured as the primary NIC on the host
  mac-addr: 1c:69:7a:6f:ab:12
  # IP address to be assigned to the primary NIC
  ip-addr: 10.11.12.200
  # List of up to two disk devices that will be combined into a single volume group for CentOS Stream installation
  disks:
    disk1: nvme0n1
    disk2: NA
- host-name: kvm-host02
  mac-addr: 1c:69:7a:6f:cd:34
  ip-addr: 10.11.12.201
  disks:
    disk1: nvme0n1
    disk2: nvme0n2
```

The second YAML file defines the infrastructure for provisioning an OpenShift Cluster:

```yaml
# Cluster Configuration
cluster:
  # Name of the cluster
  name: okd4
  # CIDR Info for the Cluster
  cluster-cidr: 10.100.0.0/14
  service-cidr: 172.30.0.0/16
  # Location of the pull secret
  secret-file: /home/user/okd-lab/pull_secret.json
  # URL to the registry used to mirror the OpenShift install images
  local-registry: nexus.my.awesome.lab:5001
  # URL to the Nexus group used to proxy remote registries
  proxy-registry: nexus.my.awesome.lab:5000
  # The URL to the registry hosting the OpenShift install images
  remote-registry: quay.io/openshift/okd
  # The version of butane used to configure ignition files for the FCOS nodes
  butane-version: v0.12.1
  # The version of the Butane specification to use for the ignition files
  butane-spec-version: 1.3.0
  # The OpenShift release to install
  release: 4.8.0-0.okd-2021-11-14-052418
  # The HA Proxy IP address to assign on the router
  ingress-ip-addr: 10.11.12.2
# KVM Hosts provisioned in the region
kvm-hosts:
    # The hostname to assign to the KVM host
  - host-name: kvm-host01
    # The MAC Address of the machine
    mac-addr: 1c:69:7a:6f:ef:56
    # The IP Address to assign to the KVM host
    ip-addr: 10.11.12.200
    # The physical discs installed on the machine
    disks:
      disk1: nvme0n1
      disk2: NA
  - host-name: kvm-host02
    mac-addr: 1c:69:7a:6f:ba:21
    ip-addr: 10.11.12.201
    disks:
      disk1: nvme0n1
      disk2: NA
# Bootstrap Node configuration for KVM install
bootstrap:
  # If true, install the bootstrap node with Qemu on the local workstation.  If false, install the bootstrap node as a KVM guest
  metal: false
  # KVM host for provisioning the bootstrap guest VM, not needed if metal=true
  kvm-host: kvm-host01
  # The MAC address to assign to the bootstrap node if metal=true, auto-populated if metal=false
  mac-addr: "52:54:00:a1:b2:c3"
  # The IP address to assign to the bootstrap node
  ip-addr: 10.11.12.49
  # The boot device to use if metal=true, not needed if metal=false
  boot-dev: sda
  # The network bridge device to use if metal=true, not needed if metal=false
  bridge-dev: en6
  # The hostname assigned to the bootstrap node.  Auto-populated by the labcli install utilities.
  name: okd4-bootstrap
  # The specifications to use for the bootstrap node guest VM
  node-spec:
    # RAM in MB
    memory: 12288
    # vCPUs
    cpu: 4
    # Disk size in GB
    root_vol: 50
# Master Node configuration for bare metal install
control-plane:
  metal: true
  node-spec:
    memory: 20480
    cpu: 6
    root_vol: 100
  okd-hosts:
  - name: "okd4-master-0"
    mac-addr: "1c:69:11:22:33:44"
    boot-dev: sda
    ip-addr: 10.11.12.60
  - name: "okd4-master-1"
    mac-addr: "1c:69:ab:cd:12:34"
    boot-dev: sda
    ip-addr: 10.11.12.61
  - name: "okd4-master-2"
    mac-addr: "1c:69:fe:dc:ba:21"
    boot-dev: sda
    ip-addr: 10.11.12.62
# Worker Node configuration for KVM install
compute-nodes:
- metal: false
  name: "okd4-worker-0"
  kvm-host: kvm-host02
  ip-addr: 10.11.12.70
  node-spec:
    memory: 20480
    cpu: 4
    root_vol: 50
    ceph_vol: 200
- metal: false
  name: "okd4-worker-1"
  kvm-host: kvm-host02
  ip-addr: 10.11.12.71
  node-spec:
    memory: 20480
    cpu: 4
    root_vol: 50
    ceph_vol: 200
- metal: false
  name: "okd4-worker-2"
  kvm-host: kvm-host02
  ip-addr: 10.11.12.72
  node-spec:
    memory: 20480
    cpu: 4
    root_vol: 50
    ceph_vol: 200
# Worker Node configuration for bare metal install
compute-nodes:
- metal: true
  name: "okd4-worker-0"
  mac-addr: "1c:69:ab:cd:12:34"
  boot-dev: sda
  ip-addr: 10.11.12.70
- metal: false
  name: "okd4-worker-1"
  mac-addr: "1c:69:11:22:33:44"
  boot-dev: sda
  ip-addr: 10.11.12.71
- metal: false
  name: "okd4-worker-2"
  mac-addr: "1c:69:fe:dc:ba:21"
  boot-dev: sda
  ip-addr: 10.11.12.72
# Device and Node information for installing Ceph with the Rook Operator
rook-ceph-nodes:
- host: okd4-worker-0
  disk: sdb
- host: okd4-worker-1
  disk: sdb
- host: okd4-worker-2
  disk: sdb
```
