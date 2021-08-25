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

1. Copy the SSH public key from your workstation to the authorized_keys file hosted on the bastion pi:

   ```bash
   cat ~/.ssh/id_rsa.pub | ssh root@${BASTION_HOST} "cat >> /usr/local/www/install/postinstall/authorized_keys"
   ```

1. Create an encrypted root password for your KVM hosts:

   ```bash
   openssl passwd -1 'host-root-password' > ${OKD_LAB_PATH}/lab_host_pw
   ```


First, make sure that you have created DNS `A` and `PTR` records.  The DNS configuration that we set up previously included three KVM hosts, kvm-host01, kvm-host02, and kvm-host03.

We are now ready to plug in the NUC and boot it up.

__Note:__  This is the point at which you might have to attach a keyboard and monitor to your NUC.  We need to ensure that the BIOS is set up to attempt a Network Boot with UEFI, not legacy.  You also need to ensure that `Secure Boot` is disabled in the BIOS since we are not explicitly trusting the boot images.

__Now, Take this opportunity to apply the latest BIOS to your NUC.__  You won't need the keyboard or mouse again, until it's time for another BIOS update...  Eventually we'll figure out how to push those from the OS too.  ;-)

Now we need to flip the NUC over and get the MAC address for the wired NIC.  You also need to know whether you have NVME or SATA SSDs in the NUC.

I have provided a helper script, `deployKvmHost.sh` that will configure the `iPXE` and `kickstart` files for you.

   ```bash
   ${OKD_LAB_PATH}/bin/deployKvmHost.sh -c=1 -h=kvm-host01 -m=1c:69:7a:02:b6:c2 -d=nvme0n1 # Example with 1 NVME SSD
   ${OKD_LAB_PATH}/bin/deployKvmHost.sh -c=1 -h=kvm-host01 -m=1c:69:7a:02:b6:c2 -d=sda,sdb # Example with 2 SATA SSD
   ```

1. Read the MAC address off of the bottom of the NUC.  Make sure you get the address for the wired NIC not the WiFi.

1. Create the `iPXE` and `kickstart` files:

   ```bash
   ${OKD_LAB_PATH}/bin/deployKvmHost.sh -c=1 -h=kvm-host01 -m=<MAC Address Here> -d=nvme0n1
   ```

   ```bash
   -c=<cluster number>
   -h=<short hostname of the KVM host>
   -m=<MAC Address of the NUC>
   -d=<comma delimited list of installed SSDs>
   ```

After creating the install files, connect the NUC to your internal router and power it on.  After a few minutes, it should be up a running.

The last thing that I've prepared for you is the ability to reinstall your OS.

### Re-Install your NUC host

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
