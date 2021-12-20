---
sitemap: true
published: true
permalink: /home-lab/bare-metal-bootstrap/
title: Set Up a MacBook for Qemu with Bridged Network
description: Qemu Bridged Network on a MacBook for OpenShift Bootstrap Node
tags:
  - openshift bare metal install
  - qemu bridged network on Mac OS
  - qemu on Mac OS
---
Let's set up a MacBook to run the OpenShift Bootstrap node.

1. Install Qemu and some dev tools.

   _Note:_ You will likely have to install Xcode CLI tools. 

   ```bash
   brew install qemu autoconf automake wolfssl
   ```

1. Plug in your USB-C network adapter and identify the device:

   1. Run this to list all of your devices:

      ```bash
      networksetup -listallhardwareports
      ```

   1. Look for the USB entry:

      Mine looked like this:

      ```bash
      Hardware Port: USB 10/100/1G/2.5G LAN
      Device: en6
      Ethernet Address: 00:e0:4c:84:ca:aa
      ```

   1. Note the `Device` name, and set a variable:

      ```bash
      BOOTSTRAP_BRIDGE=en6
      ```

   1. Add this device to your lab configuration:

      ```bash
      yq e ".bootstrap.bridge-dev = \"${BOOTSTRAP_BRIDGE}\"" -i ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
      ```

      You should see an entry in `${OKD_LAB_PATH}/lab-config/dev-cluster.yaml` for the bridge-dev now:

      ```yaml
      ...
      butane-spec-version: 1.3.0
      okd-version: ${OKD_VERSION}
      bootstrap:
        metal: true
        mac-addr: "52:54:00:a1:b2:c3"
        boot-dev: sda
        ...
        bridge-dev: en6
        ...
      ```

1. Set your WiFi to be the primary internet link:

   1. Click on the wifi icon in the top right of your screen.

      ![Network Preferences](/_pages/home-lab/bare-metal/images/network-preferences.png)

   1. In the bottom left of the pop up, select the menu dropdown and click on `Set Service Order`

      ![Set Service Order](/_pages/home-lab/bare-metal/images/set-service-order.png)

   1. Drag `WiFi` to the top.

      ![Set Service Order](/_pages/home-lab/bare-metal/images/service-order.png)

      ![Set Service Order](/_pages/home-lab/bare-metal/images/wifi-first.png)

   1. Click `OK` then click `Apply`

1. Now, install VDE for bridged networking:

   ```bash
   mkdir -p ${OKD_LAB_PATH}/work-dir
   cd ${OKD_LAB_PATH}/work-dir
   git clone https://github.com/virtualsquare/vde-2.git
   cd vde-2
   autoreconf -fis
   ./configure --prefix=/opt/vde
   make
   sudo make install
   ```

1. Finally, set up the network bridge device:

   ```bash
   cd ${OKD_LAB_PATH}/work-dir
   git clone https://github.com/lima-vm/vde_vmnet
   cd vde_vmnet
   make PREFIX=/opt/vde
   sudo make PREFIX=/opt/vde install
   sudo make install BRIDGED=${BOOTSTRAP_BRIDGE}
   ```

1. Now, you are ready to configure your edge router.

   __[Edge Router](/home-lab/edge-router/)__