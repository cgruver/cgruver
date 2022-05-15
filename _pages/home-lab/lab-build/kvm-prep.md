---
permalink: /home-lab/prepare-kvm-okd-install/
title: Preparing To Install OpenShift on KVM
description: Preparing for a KVM Based UPI OpenShift Install on Intel NUC with OKD
tags:
  - openshift install
  - okd install
  - kubernetes install
  - kvm
---
## Create The Lab Configuration YAML File

__As before, I'm being intentionally prescriptive here to help ensure success the first time you try this.__

1. Set the shell environment from the lab configuration file that we created earlier:

   ```bash
   labctx dev
   ```

1. Create an encrypted root password for your KVM host:

   ```bash
   read KVM_ROOT_PWD
   ```

   Type the password that you want to set for your KVM hosts and hit `<return>`

   ```bash
   openssl passwd -1 "${KVM_ROOT_PWD}" > ${OKD_LAB_PATH}/lab_host_pw
   ```

1. Add your workstation's public SSH key to the authorized keys file that the KVM host will install:

   ```bash
   cat ~/.ssh/id_rsa.pub | ssh root@bastion.${LAB_DOMAIN} "cat >> /usr/local/www/install/postinstall/authorized_keys" 
   ```

1. Read the `MAC` address off of the bottom of the NUC and create an environment variable:

   ```bash
   MAC_ADDR=1c:69:7a:6f:ab:12  # Substitute your NUC's MAC Address
   ```

1. Set a variable for the cluster network:

   ```bash
   IFS="." read -r i1 i2 i3 i4 <<< "${DOMAIN_NETWORK}"
   export NET_PREFIX=${$i1}.${$i2}.${$i3}
   ```

1. Create a YAML file to define the network and hosts for the OpenShift cluster that we're going to install:

   ```bash
   cat << EOF  > ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
   cluster:
     name: dev
     cluster-cidr: 10.100.0.0/14
     service-cidr: 172.30.0.0/16
     secret-file: ${OKD_LAB_PATH}/lab-config/pull_secret.json
     local-registry: nexus.${LAB_DOMAIN}:5001
     proxy-registry: nexus.${LAB_DOMAIN}:5000
     remote-registry: quay.io/openshift/okd
     butane-version: v0.14.0
     butane-spec-version: 1.4.0
     ingress-ip-addr: ${NET_PREFIX}.2
   bootstrap:
     metal: false
     node-spec:
       memory: 12288
       cpu: 4
       root-vol: 50
     kvm-host: kvm-host01
     ip-addr: ${NET_PREFIX}.49
   control-plane:
     metal: false
     node-spec:
       memory: 20480
       cpu: 6
       root-vol: 100
     okd-hosts:
     - kvm-host: kvm-host01
       ip-addr: ${NET_PREFIX}.60
     - kvm-host: kvm-host01
       ip-addr: ${NET_PREFIX}.61
     - kvm-host: kvm-host01
       ip-addr: ${NET_PREFIX}.62
   kvm-hosts:
   - host-name: kvm-host01
     mac-addr: ${MAC_ADDR}
     ip-addr: ${NET_PREFIX}.200
     disks:
       disk1: nvme0n1
       disk2: NA
   EOF
   ```

1. You need to know whether you have NVME or SATA SSDs in the NUC.

   1. If you have an NVME drive installed in the NUC, you do not need to modify anything.

   1. If you have SATA M.2 drive instead of NVME then edit: `${OKD_LAB_PATH}/lab-config/dev-cluster.yaml`, and replace `nvme0n1` with `sda`.

   1. If you have more than one drive installed, then edit: `${OKD_LAB_PATH}/lab-config/dev-cluster.yaml`, and replace `disk2: NA` with `disk2: nvme0n2` or `disk2: sdb` as appropriate

### Configuration Complete

Your OpenShift cluster configuration YAML file should look something like this:

```yaml
cluster:
  name: dev
  cluster-cidr: 10.100.0.0/14
  service-cidr: 172.30.0.0/16
  secret-file: /your/home/dir/lab-config/pull_secret.json
  local-registry: nexus.my.awesome.lab:5001
  proxy-registry: nexus.my.awesome.lab:5000
  remote-registry: quay.io/openshift/okd
  butane-version: v0.14.0
  butane-spec-version: 1.4.0
  ingress-ip-addr: 10.11.13.2
bootstrap:
  metal: false
  node-spec:
    memory: 12288
    cpu: 4
    root-vol: 50
  kvm-host: kvm-host01
  ip-addr: 10.11.13.49
control-plane:
  metal: false
  node-spec:
    memory: 20480
    cpu: 6
    root-vol: 100
  okd-hosts:
  - kvm-host: kvm-host01
    ip-addr: 10.11.13.60
  - kvm-host: kvm-host01
    ip-addr: 10.11.13.61
  - kvm-host: kvm-host01
    ip-addr: 10.11.13.62
kvm-hosts:
- host-name: kvm-host01
  mac-addr: 1c:69:7a:6f:ab:12
  ip-addr: 10.11.13.200
  disks:
    disk1: nvme0n1
    disk2: NA
```

## Now We are Ready To Prepare a Disconnected Install of OpenShift

__[Preparing to Install OpenShift - Mirror OKD Images](/home-lab/mirror-okd-images/)__
