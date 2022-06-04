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
   mkdir ${HOME}/okd-lab
   ```

1. Install the `yq` command for YAML file manipulation.  My lab utilities are dependent on it:

   ```bash
   brew install yq
   ```

1. Clone the utiliy code repo:

   ```bash
   git clone https://github.com/cgruver/kamarotos.git ${HOME}/okd-lab/kamarotos
   ```

1. Install the utility scripts:

   ```bash
   cp ${HOME}/okd-lab/kamarotos/bin/* ${HOME}/okd-lab/bin
   chmod 700 ${HOME}/okd-lab/bin/*
   ```

1. Edit your shell `rc` (`.bashrc` or `.zshrc`) file to enable the utilities in the path, and load that lab functions into the shell:

   ```bash
   export LAB_CONFIG_FILE=${HOME}/okd-lab/lab-config/lab.yaml
   . ${HOME}/okd-lab/bin/labEnv.sh
   ```

1. Log off and back on to set the variables.

## Configuration Files

There are two YAML configuration files that are used by the `labcli` utilities for deploying the infrastructure for you home lab:

[Lab CLI Configuration Files](/home-lab/labcli-files/)

The `examples` directory in the `kamarotos` project contains a sample `lab.yaml` file.  This file is the main configuration file for your lab.  It contains references to "sub domains" that contain the configuration for a specific OpenShift cluster.

The OpenShift cluster configuration files are in `examples/domain-configs`

These files correspond to the following cluster configurations:

| Domain Config File | Description |
| --- | --- |
| `kvm-cluster-basic.yaml` | 3 Node cluster with control-plane & worker combined nodes, deployed on a single KVM host. |
| `kvm-cluster-3-worker.yaml` | 6 Node cluster, 3 control-plane & 3 worker nodes, deployed on 2 KVM hosts. |
| `sno-kvm.yaml` | Single Node Cluster, deployed on a KVM host. |
| `sno-bm.yaml` | Single Node Cluster, deployed on a bare metal server |
| `bare-metal-basic.yaml` | 3 Node cluster with control-plane & worker combined nodes, deployed on 3 bare metal servers |
| `bare-metal-3-worker.yaml` | 6 Node cluster, 3 control-plane & 3 worker nodes, deployed on 6 bare metal servers |

## `labctx` function

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

### Declarative

By passing an argument indicating the domain that you want to manage, `labctx` will bypass the interactive selection.

```bash
labctx dc2
```

## `labenv` function

The `labenv` function is used to set or unset the appropriate shell environment variables for your lab.  It has four subcommands.

`labenv [-e | -k | -c] [-d=lab-domain]`

1. `labenv -e`

1. `labenv -k`

1. `labenv -c`

## `labcli`

The `labcli` command has multiple subcommands and one global, optional argument:

### `labcli -d=<domain> --subcommand -subcommand-option`

The optional `-d=domain` argument will bypass the interactive invocation of `labctx` and use the domain specified.  

example: `labcli -d=dc2 --pi -s`

__Note:__ The domain variable set in the execution of `labcli` do not alter your current shell environment.

## Lab Network Configuration

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

## OpenShift Cluster Provisioning

### `labcli --pull-secret`

The `pull-secret` subcommand is used in preparation for installing an OpenShift cluster to prepare the registry Pull Secret.

### `labcli --latest`

The `latest` subcommand will update the selected domain to use the latest release of OKD.

### `labcli --mirror`

The `mirror` subcommand creates a local mirror of the OpenShift images for executing a disconnected network install.

### `labcli --cli`

The `cli` subcommand will download the OpenShift cli for the selected lab domain, and create symbolic links in the shell path.

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

### `labcli --trust`

The `trust` subcommand will pull the self-signed cert from a cluster and trust it on your workstation.

### `labcli --config-infra`

The `config-infra` subcommand is used after installing a cluster and adding worker nodes.  It wil label the control plan nodes as infrastructure nodes, and move the ingress, registry, and monitoring workloads to the control plane, leaving your worker nodes for application workloads.

### `labcli --csr`

The `csr` subcommand is used during the installation of worker nodes to approve the certificate signing requests from the new worker nodes.

## OpenShift Cluster Tasks

### `labcli --user`

The `user` subcommand is used to add htpasswd authenticated users to your OpenShift clusters

`labcli --user` has one operation with two optional flags:

To initialize the htpasswd OAuth provider and create a cluster admin user:

`labcli --user -i -a -u=<user-name>` This will prompt for a passwd, create the htpasswd secret, patch the oauth provider for htpasswd, and then grant the new user the cluster-admin role.

To add additional users:

`labcli --user -u=<user-name>` This will prompt for a passwd, and create a user in the cluster.

`labcli --user -a -u=<user-name>` This will prompt for a passwd, and create a cluster admin user in the cluster.

### `labcli --kube`

The `kube` subcommand retrieves the saved kubeadmin credentials to give you break-glass access to the selected domain cluster.

## Other Operatrions

### `labcli --git-secret -n=<kube namespace>`

The `git-secret` subcommand will create a basic auth secret for your git service account and assign it to the `pipeline` service account in the designated namespace.



## Convienience operations for Mac OS users:

### `labcli --console`

The `console` subcommand launches the Safari web browser with the URL of the selected OpenShift cluster.

### `labcli --login`

The `login` command will issue `oc login` against the selected domain cluster.

### `labcli --dns`

The `dns` subcommand will reset the Mac OS DNS client.  This is sometimes necessary to clear the cache.

## WIP (These commands work, but need docs)

### `labcli --post`

`labcli --post -d`

### `labcli --ceph`

### `labcli --monitor`

### `labcli --reset-nic`

### `labcli --update`

### `labcli --nodes`
