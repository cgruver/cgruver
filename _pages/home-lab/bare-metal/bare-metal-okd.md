---
sitemap: false
published: false
permalink: /home-lab/bare-metal-okd/
title: Installing OpenShift on Bare Metal with Intel NUC
description: Installing UPI OpenShift on Bare Metal Intel NUC with OKD
tags:
  - openshift bare metal install
  - okd install
  - kubernetes bare metal install
---

```bash
brew install qemu
brew install autoconf
brew install automake
brew install wolfssl

git clone https://github.com/virtualsquare/vde-2.git
cd vde-2
autoreconf -fis
./configure --prefix=/opt/vde
make
sudo make install

cd ..
git clone https://github.com/lima-vm/vde_vmnet
cd vde_vmnet
make PREFIX=/opt/vde
sudo make PREFIX=/opt/vde install
sudo make install BRIDGED=en0

qemu-img create -f qcow2 bootstrap-node.qcow2 50G

qemu-system-x86_64 -accel accel=hvf -m 12G -smp 2 -display none -nographic -drive file=bootstrap-node.qcow2,if=virtio -boot n -netdev vde,id=nic0,sock=/var/run/vde.bridged.en13.ctl -device virtio-net-pci,netdev=nic0,mac=52:54:00:12:34:56

```
