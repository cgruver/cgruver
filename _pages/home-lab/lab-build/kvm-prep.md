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
__Note:__ This is part of a series.  Make sure you started here: [Building a Portable Kubernetes Home Lab with OpenShift - OKD4](/home-lab/lab-intro/)

1. If you did not set up a mirror of the CentOS Stream install files when you set up your Raspberry Pi.  You will need to do that now.

   ```bash
   ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null root@10.11.12.10 "nohup /root/bin/MirrorSync.sh &"
   ```

   This will take a while to complete.  Wait until the MirrorSynch process on your Pi is complete.  Depending on network speed, this could take an hour or more.

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

Once you have completed the configuration file changes, Deploy the KVM hosts:

1. Prepare for the CentOS Stream install:

   ```bash
   labcli --deploy -k -d=dev
   ```

   This command will configure the `iPXE` and `kickstart` files for you as well as create the appropriate `DNS` records.

1. We are now ready to plug in the NUC and boot it up.

   __Note:__  This is the point at which you might have to attach a keyboard and monitor to your NUC.  We need to ensure that the BIOS is set up to attempt a Network Boot with UEFI, not legacy.  You also need to ensure that `Secure Boot` is disabled in the BIOS since we are not explicitly trusting the boot images.

   Also, Take this opportunity to apply the latest BIOS to your NUC.__  You won't need the keyboard or mouse again, until it's time for another BIOS update...  Eventually we'll figure out how to push those from the OS too.  ;-)

1. Make sure that the KVM host is connected to your network and power it on.

   At this point, it should PXE boot off of the router, and start an unattended install of CentOS Stream.

   Attach a monitor and keyboard if you want to watch.

   1. The host will power on and find no bootable OS
   1. The host will attempt a network boot by requesting a DHCP address and PXE boot info
      * The DHCP server will issue an IP address and direct the host to the PXE boot file on the TFTP boot server
   1. The host will retrieve the `boot.ipxe` file from the TFTP boot server
   1. The `boot.ipxe` script will then retrieve an iPXE script name from the MAC address of the host.
   1. The host will begin booting:
      1. The host will retrieve the `vmlinuz`, and `initrd` files from the HTTP install server
      1. The host will load the kernel and init-ram
      1. The host will retrieve the kickstart file or ignition config file depending on the install type.
   1. The host should now begin an unattended install.

## Now We are Ready To Prepare a Disconnected Install of OpenShift

__[Preparing to Install OpenShift - Mirror OKD Images](/home-lab/mirror-okd-images/)__
