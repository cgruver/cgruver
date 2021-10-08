---
layout: page
permalink: /home-lab/kvm-host-setup/
title: Setting Up Your KVM Hosts
description: Using KVM on CentOS Stream for OpenShift with OKD
tags:
  - install kvm
  - centos stream
  - ipxe boot
  - kickstart unattended install
---

The installation on a bare metal host will work like this:

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
1. The host will reboot and run the `firstboot.sh` script, if one is configured.  (selinux is temporarily disabled to allow this script to run)
1. The host is now ready to use!

There are a couple of things that we need to put in place to get started.

1. Create an encrypted root password for your KVM hosts:

   ```bash
   openssl passwd -1 'host-root-password' > ${OKD_LAB_PATH}/lab_host_pw
   ```

1. Read the `MAC` address off of the bottom of the NUC and create an environment variable:

  ```bash
  MAC_ADDR=1c:69:7a:6f:ab:12  # Substiture your NUC's MAC Address
  ```

1. Add `kvm-hosts` entries to your lab config file:

   ```bash
   cat << EOF >> ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
   kvm-hosts:
   - host-name: kvm-host01
     mac-addr: ${MAC_ADDR}
     ip-octet: 200
     disks:
       disk1: nvme0n1
       disk2: NA
   EOF
   ```

1. Now edit `${OKD_LAB_PATH}/lab-config/dev-cluster.yaml`: 

   You need to know whether you have NVME or SATA SSDs in the NUC.

   1. If you have more than one NMVE drive installed, then replace `disk2: NA` with `disk2: nvme0n2`
   1. If you have SATA M.2 drivers, then replace `nvme0n1` with `sda`, and `nvme0n2` with `sdb` if appropriate.

1. Your `${OKD_LAB_PATH}/lab-config/dev-cluster.yaml` file should now look something like:

   ```yaml
   cluster-sub-domain: dev
   cluster-name: okd4-dev
   edge-ip: 10.11.12.2
   router: 10.11.13.1
   lb-ip: 10.11.13.2
   network: 10.11.13.0
   netmask: 255.255.255.0
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
     mac-addr: 1c:69:7a:61:fb:44
     ip-octet: 200
     disks:
       disk1: nvme0n1
       disk2: NA
   ```

1. We are now ready to plug in the NUC and boot it up.

   __Note:__  This is the point at which you might have to attach a keyboard and monitor to your NUC.  We need to ensure that the BIOS is set up to attempt a Network Boot with UEFI, not legacy.  You also need to ensure that `Secure Boot` is disabled in the BIOS since we are not explicitly trusting the boot images.

   Also, Take this opportunity to apply the latest BIOS to your NUC.__  You won't need the keyboard or mouse again, until it's time for another BIOS update...  Eventually we'll figure out how to push those from the OS too.  ;-)

   __I have provided a helper script, `deployKvmHost.sh` that will configure the `iPXE` and `kickstart` files for you as well as create the appropriate `DNS` records.__

1. Create the KVM host reources:

   ```bash
   deployKvmHosts.sh -c=${OKD_LAB_PATH}/lab-config/lab.yaml -d=dev
   ```

1. After creating the install files, connect the NUC to your internal router and power it on.  After a few minutes, it should be up a running.

### Re-Install your NUC host

The last thing that I've prepared for you is the ability to reinstall your OS.

__*I have included a very dangerous script in this project.*__  If you follow all of the setup instructions, it will be installed in `/root/bin/rebuildhost.sh` of your host.

The script is a quick and dirty way to brick your host so that when it reboots, it will force a Network Install.

The script will destroy your boot partitions and wipe the MBR in the installed SSD drives.  For example:

1. Destroy boot partitions:

   ```bash
   umount /boot/efi
   umount /boot
   wipefs -a /dev/sda2
   wipefs -a /dev/sda1
   ```

1. Wipe MBR:

   ```bash
   dd if=/dev/zero of=/dev/sda bs=512 count=1
   ```

1. Reboot:

   ```bash
   shutdown -r now
   ```

That's it!  Your host is now a Brick.  If your PXE environment is set up properly, then in a few minutes you will have a fresh OS install.

Go ahead a build out all of your KVM hosts are this point.  For this lab you need at least one KVM host with 64GB of RAM.  With this configuration, you will build an OKD cluster with 3 Master nodes which are also schedulable, (is that a word?), as worker nodes.  If you have two, then you will build an OKD cluster with 3 Master and 3 Worker nodes.

Next, [Prepare for OpenShift Install](/home-lab/prepare-okd-install/)
