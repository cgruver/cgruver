---
layout: page
permalink: /home-lab/dev-router-prep/
title: Dev Cluster Network Router - Prep
description: Configure OpenWRT as a router with HA Proxy and a Bind DNS Server
tags:
  - bind dns server
  - openwrt router
  - haproxy load balancer
  - openshift dns
  - openwrt ipxe boot
  - openwrt dhcp configuration
---
1. Connect to your dev cluster router:

    Connect from your workstation with a network cable.

1. Copy your SSH public key to the router for login:

    ```bash
    cat ~/.ssh/id_rsa.pub | ssh root@192.168.8.1 "cat >> /etc/dropbear/authorized_keys"
    ```

1. Create a YAML file for the cluster network configuration:

   First, we're going to be opinionated about your network configuration.  Let's set the cluster network by adding one to the third octet of your lab network.  So, if your lab network is `10.11.12.0`, then your cluster network will be `10.11.13.0`.  Likewise, your internal router will be `10.11.13.1`, and your ha-proxy load balancer will be `10.11.13.2`

   I am being prescriptive, because later on it will make it easier to add additional clusters to your lab.  I periodically reconfigure my lab to simulate either multiple data centers, or dev/qa/prod environments.  Later, I will show you how to do this.

   ```bash
   IFS=. read -r i1 i2 i3 i4 << EOI
   ${EDGE_NETWORK}
   EOI

   export EDGE_IP=$(echo "${i1}.${i2}.${i3}.2")
   export ROUTER=${i1}.${i2}.$(( ${i3} + 1 )).1
   export LB_IP=${i1}.${i2}.$(( ${i3} + 1 )).2
   export NETWORK=${i1}.${i2}.$(( ${i3} + 1 )).0
   ```

   Now create the YAML file:

   ```bash
   mkdir -p ${OKD_LAB_PATH}/lab-config
   
   cat << EOF  > ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
   cluster-sub-domain: dev
   cluster-name: okd4-dev
   edge-ip: ${EDGE_IP}
   router: ${ROUTER}
   lb-ip: ${LB_IP}
   network: ${NETWORK}
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
   EOF
   ```

1. Create an environment script to help configure the router:

   ```bash
   ${OKD_LAB_PATH}/bin/createEnvScript.sh -c=${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
   cat ${OKD_LAB_PATH}/work-dir/internal-router | ssh root@192.168.8.1 "cat >> /root/.profile"
   ```

1. Add env vars to the edge router for additional configuration:

   ```bash
   cat ${OKD_LAB_PATH}/work-dir/edge-router | ssh root@${EDGE_ROUTER} "cat >> /root/.profile"
   ```

1. Add a forwarding zone to the edge router DNS:

   ```bash
   cat ${OKD_LAB_PATH}/work-dir/edge-zone | ssh root@${EDGE_ROUTER} "cat >> /etc/bind/named.conf"
   ssh root@${EDGE_ROUTER} "/etc/init.d/named restart"
   rm -rf ${OKD_LAB_PATH}/work-dir
   ```

1. Create a static route in the edge router:

   ```bash
   ssh root@${EDGE_ROUTER}

   unset ROUTE
   
   ROUTE=$(uci add network route)
   uci set network.${ROUTE}.interface=lan
   uci set network.${ROUTE}.target=${DEV_NETWORK}
   uci set network.${ROUTE}.netmask=${NETMASK}
   uci set network.${ROUTE}.gateway=${DEV_ROUTER}
   uci commit network
   /etc/init.d/network restart
   /etc/init.d/named restart
   exit
   ```

1. Log into the router:

    ```bash
    ssh root@192.168.8.1
    ```

1. Set a root password:

    ```bash
    passwd
    ```

1. Create an SSH key pair:

   ```bash
   mkdir -p /root/.ssh
   dropbearkey -t rsa -s 4096 -f /root/.ssh/id_dropbear
   ```

1. Disable password login:

   ```bash
   uci set dropbear.@dropbear[0].PasswordAuth='off'
   uci set dropbear.@dropbear[0].RootPasswordAuth='off'
   uci commit dropbear
   ```

1. Configure the IP address and hostname:

   ```bash
   uci set network.wan.proto='static'
   uci set network.wan.ipaddr=${EDGE_IP}
   uci set network.wan.netmask=${NETMASK}
   uci set network.wan.gateway=${EDGE_ROUTER}
   uci set network.wan.hostname=router.${DOMAIN}
   uci set network.wan.dns=${EDGE_ROUTER}
   uci set network.lan.ipaddr=${ROUTER}
   uci set network.lan.netmask=${NETMASK}
   uci set network.lan.hostname=router.${DOMAIN}
   uci delete network.guest
   uci delete network.wan6
   uci commit network

   uci set system.@system[0].hostname=router.${DOMAIN}
   uci commit system
   ```

1. Configure the `wan` firewall zone to accept traffic and disable NAT:

   ```bash
   unset zone
   let i=0
   let j=1
   while [[ ${j} -eq 1 ]]
   do
     zone=$(uci get firewall.@zone[${i}].name)
     let rc=${?}
     if [[ ${rc} -ne 0 ]]
     then
       let j=2
      elif [[ ${zone} == "wan" ]]
      then
        let j=0
      else
        let i=${i}+1
      fi
   done
   if [[ ${j} -eq 0 ]]
   then
     uci set firewall.@zone[${i}].input='ACCEPT'
     uci set firewall.@zone[${i}].output='ACCEPT'
     uci set firewall.@zone[${i}].forward='ACCEPT'
     uci set firewall.@zone[${i}].masq='0'
     uci commit firewall
   else
     echo "FIREWALL ZONE NOT FOUND, CCONFIGURE MANUALLY WITH LUCI"
   fi

   unset ENTRY
   ENTRY=$(uci add firewall forwarding)
   uci set firewall.${ENTRY}.src=wan
   uci set firewall.${ENTRY}.dest=lan
   uci commit firewall
   /etc/init.d/firewall restart
   ```

1. Now power off the router, connect to the uplink port on the router to one of the LAN ports on your edge router:

   ```bash
   poweroff
   ```

1. Now, we should be able to log into our new internal network router:

   ```bash
   DEV_ROUTER=$(ssh root@${EDGE_ROUTER} ". /root/.profile ; echo \${DEV_ROUTER}")
   ssh root@${DEV_ROUTER}
   ```

1. Continue the setup here: [Internal Network Router Setup](/home-lab/internal-router/)
