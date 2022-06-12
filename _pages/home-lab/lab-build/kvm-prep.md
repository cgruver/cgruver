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

1. Read the `MAC` address off of the bottom of the NUC and add it to the cluster config file:

   Edit `${HOME}/okd-lab/lab-config/domain-configs/dev.yaml` and replace `YOUR_HOST_MAC_HERE` with the MAC address of your NUC.

   __Note:__ Use lower case letters in the MAC.

1. You need to know whether you have NVME or SATA SSDs in the NUC.

   1. If you have an NVME drive installed in the NUC, you do not need to modify anything.

   1. If you have SATA M.2 drive instead of NVME then edit: `${OKD_LAB_PATH}/lab-config/domain-configs/dev.yaml`, and replace `nvme0n1` with `sda`.

   1. If you have more than one drive installed, then edit: `${OKD_LAB_PATH}/lab-config/domain-configs/dev.yaml`, and replace `disk2: NA` with `disk2: nvme0n2` or `disk2: sdb` as appropriate

## Now We are Ready To Prepare a Disconnected Install of OpenShift

__[Preparing to Install OpenShift - Mirror OKD Images](/home-lab/mirror-okd-images/)__
