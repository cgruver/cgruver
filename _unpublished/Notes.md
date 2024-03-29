---
permalink: /notes/
title: Notes
sitemap: false
published: false
---

```bash
cat ~/.ssh/id_rsa.pub | ssh root@YOUR_OPENWRT_ROUTER "cat >> /etc/dropbear/authorized_keys"
```

## GitLab

```bash
opkg update && opkg install pgsql-server pgsql-cli pgsql-cli-extra



https://packages.gitlab.com/gitlab/raspberry-pi2/packages/raspbian/buster/gitlab-ce_14.0.0-ce.0_armhf.deb

https://packages.gitlab.com/gitlab/gitlab-ce/packages/ubuntu/focal/gitlab-ce_13.11.6-ce.0_arm64.deb

wget https://packages.gitlab.com/gitlab/gitlab-ce/packages/ubuntu/focal/gitlab-ce_13.11.6-ce.0_arm64.
deb/download.deb

wget https://packages.gitlab.com/gitlab/gitlab-ce/packages/debian/buster/gitlab-ce_14.0.5-ce.0_arm64.deb/download.deb

wget https://packages.gitlab.com/gitlab/gitlab-ce/packages/ubuntu/focal/gitlab-ce_14.0.5-ce.0_arm64.deb/download.deb

wget https://packages.gitlab.com/gitlab/gitlab-ce/packages/el/8/gitlab-ce-14.0.5-ce.0.el8.aarch64.rpm/download.rpm
```

### Install

```bash
opkg update && opkg install ar

wget https://packages.gitlab.com/gitlab/raspberry-pi2/packages/raspbian/buster/gitlab-ce_14.1.8-ce.0_armhf
.deb/download.deb -O gitlab.deb

mkdir gitlab

cd gitlab

ar -x ../gitlab.deb
tar -xzf data.tar.gz

ln -s /usr/local /opt

cp -r opt/gitlab /usr/local

cd /usr/local/gitalab

```

## Firewall

```bash
uci add firewall rule
uci set firewall.@rule[-1].src='wan'

rule_name=$(uci add firewall rule) 
uci batch << EOI
set firewall.$rule_name.enabled='1'
set firewall.$rule_name.target='ACCEPT'
set firewall.$rule_name.src='wan'
set firewall.$rule_name.proto='tcp udp'
set firewall.$rule_name.dest_port='111'
set firewall.$rule_name.name='NFS_share'
EOI
uci commit

uci add firewall rule
uci set firewall.@rule[-1].src='wan'
uci set firewall.@rule[-1].target='ACCEPT'
uci set firewall.@rule[-1].proto='tcp'
uci set firewall.@rule[-1].dest_port='22'
uci commit firewall
/etc/init.d/firewall restart

/etc/init.d/firewall reload

config rule
    option name     example rule
    option src      lan
    option family   ipv4
    option proto    all
    option dest     wan
    option dest_ip  192.168.1.64/26
    option target   REJECT

rule_name=$(uci add firewall rule) 
uci batch << EOI
set firewall.$rule_name.enabled='1'
set firewall.$rule_name.target='REJECT'
set firewall.$rule_name.src='lan'
set firewall.$rule_name.src_ip='10.11.13.0/24'
set firewall.$rule_name.dest='wan'
set firewall.$rule_name.name='DC1_BLOCK'
set firewall.$rule_name.proto='all'
set firewall.$rule_name.family='ipv4'
EOI
uci commit firewall
/etc/init.d/firewall reload

```

## WiFi

1. Configure Wireless repeater to your home Wifi:

   ```bash
   uci set wireless.radio2.disabled='0'
   uci set wireless.radio2.repeater='1'
   uci set wireless.sta.ssid='Your-WiFi-SSID'  # Replace with your WiFi SSID
   uci set wireless.sta.encryption='psk2'      # Replace with your encryption type
   uci set wireless.sta.key='Your-WiFi-Key'    # Replace with your WiFi Key
   ```

1. Configure a Wireless Network for Your Lab:

   ```bash
   uci set wireless.default_radio3=wifi-iface
   uci set wireless.default_radio3.device='radio3'
   uci set wireless.default_radio3.ifname='wlan3'
   uci set wireless.default_radio3.network='lan'
   uci set wireless.default_radio3.mode='ap'
   uci set wireless.default_radio3.disabled='0'
   uci set wireless.default_radio3.ssid='OKD-LAB-5G'
   uci set wireless.default_radio3.key='WelcomeToMyLab'
   uci set wireless.default_radio3.encryption='psk2'
   uci set wireless.default_radio3.multi_ap='1'
   uci commit wireless
   ```

Test Bind

```bash
/usr/sbin/named -u bind -g -c /etc/bind/named.conf
```

Use `wan` port as `lan`

```bash
LAN=$(uci show network.lan.ifname | cut -d"=" -f2 | cut -d"'" -f2)
uci set network.lan.ifname="${LAN} wan"
uci delete network.wan.ifname
uci commit network
/etc/init.d/network restart
```

Upgrade

```bash
PKG_LIST=""
opkg update
opkg list-upgradable | while read i
do
   PKG_LIST=$(echo "${PKG_LIST} $(echo ${i} | cut -d' ' -f1)")
done
```

Disk Part

```bash
partinfo=$(sfdisk -l /dev/mmcblk1 | grep mmcblk1p2)
sfdisk --delete /dev/mmcblk1 2
sfdisk -d /dev/mmcblk1 > /tmp/part.info
echo "/dev/mmcblk1p2 : start= $(echo ${partinfo} | cut -d" " -f2), type=83" >> /tmp/part.info
umount /dev/mmcblk1p1
sfdisk /dev/mmcblk1 < /tmp/part.info

e2fsck -f /dev/mmcblk1p2
resize2fs /dev/mmcblk1p2

sfdisk -l /dev/mmcblk1 

let SECTORS=$(sfdisk -l /dev/mmcblk1 | grep "Disk" | grep "/dev/mmcblk1" | cut -d" " -f7)


PART_INFO=$(sfdisk -l /dev/mmcblk1 | grep mmcblk1p2)
let ROOT_SIZE=41943040
let P2_START=$(echo ${PART_INFO} | cut -d" " -f2)
let P3_START=$(( ${P2_START}+${ROOT_SIZE}+8192 ))
sfdisk --delete /dev/mmcblk1 2
sfdisk -d /dev/mmcblk1 > /tmp/part.info
echo "/dev/mmcblk1p2 : start= ${P2_START}, size= ${ROOT_SIZE}, type=83" >> /tmp/part.info
echo "/dev/mmcblk1p3 : start= ${P3_START}, type=83" >> /tmp/part.info
umount /dev/mmcblk1p1
sfdisk /dev/mmcblk1 < /tmp/part.info

```

## Reset the HA Proxy configuration for a new cluster build:

```bash
ssh okd4-lb01 "curl -o /etc/haproxy/haproxy.cfg http://${INSTALL_HOST}/install/postinstall/haproxy.cfg && systemctl restart haproxy"
```

## Setup DNS resolution for a SNC build

```bash
nmcli connection mod "Bridge connection br0" ipv4.dns "${SNC_NAMESERVER}" ipv4.dns-search "${SNC_DOMAIN}"
```
## Upgrade:

```bash
oc adm upgrade 

Cluster version is 4.4.0-0.okd-2020-04-09-104654

Updates:

VERSION                       IMAGE
4.4.0-0.okd-2020-04-09-113408 registry.svc.ci.openshift.org/origin/release@sha256:724d170530bd738830f0ba370e74d94a22fc70cf1c017b1d1447d39ae7c3cf4f
4.4.0-0.okd-2020-04-09-124138 registry.svc.ci.openshift.org/origin/release@sha256:ce16ac845c0a0d178149553a51214367f63860aea71c0337f25556f25e5b8bb3

ssh root@${LAB_NAMESERVER} 'sed -i "s|registry.svc.ci.openshift.org|;sinkhole|g" /etc/named/zones/db.sinkhole && systemctl restart named'

export OKD_RELEASE=4.4.0-0.okd-2020-04-09-124138

oc adm -a ${LOCAL_SECRET_JSON} release mirror --from=${OKD_REGISTRY}:${OKD_RELEASE} --to=${LOCAL_REGISTRY}/${LOCAL_REPOSITORY} --to-release-image=${LOCAL_REGISTRY}/${LOCAL_REPOSITORY}:${OKD_RELEASE}

oc apply -f upgrade.yaml

ssh root@${LAB_NAMESERVER} 'sed -i "s|;sinkhole|registry.svc.ci.openshift.org|g" /etc/named/zones/db.sinkhole && systemctl restart named'

oc adm upgrade --to=${OKD_RELEASE}


oc patch clusterversion/version --patch '{"spec":{"upstream":"https://origin-release.svc.ci.openshift.org/graph"}}' --type=merge
```

## Samples Operator: Extract templates and image streams, then remove the operator.  We don't want everything and the kitchen sink...

```bash
mkdir -p ${OKD4_LAB_PATH}/OKD-Templates-ImageStreams/templates
mkdir ${OKD4_LAB_PATH}/OKD-Templates-ImageStreams/image-streams
oc project openshift
oc get template | grep -v NAME | while read line
do
    TEMPLATE=$(echo $line | cut -d' ' -f1)
    oc get --export template ${TEMPLATE} -o yaml > ${OKD4_LAB_PATH}/OKD-Templates-ImageStreams/templates/${TEMPLATE}.yml
done

oc get is | grep -v NAME | while read line
do
    IS=$(echo $line | cut -d' ' -f1)
    oc get --export is ${IS} -o yaml > ${OKD4_LAB_PATH}/OKD-Templates-ImageStreams/image-streams/${IS}.yml
done

oc patch configs.samples.operator.openshift.io cluster --type merge --patch '{"spec":{"managementState":"Removed"}}'
```

## Fix Hostname:

```bash
for i in 0 1 2 ; do ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@okd4-master-${i}.${LAB_DOMAIN} "sudo hostnamectl set-hostname okd4-master-${i}.my.domain.org && sudo shutdown -r now"; done
for i in 0 1 2 ; do ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@okd4-worker-${i}.${LAB_DOMAIN} "sudo hostnamectl set-hostname okd4-worker-${i}.my.domain.org && sudo shutdown -r now"; done
```

## Logs:

```bash
for i in 0 1 2 ; do echo "okd4-master-${i}" ; ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@okd4-master-${i}.${LAB_DOMAIN} "sudo journalctl --disk-usage"; done
for i in 0 1 2 ; do echo "okd4-master-${i}" ; ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@okd4-worker-${i}.${LAB_DOMAIN} "sudo journalctl --disk-usage"; done

for i in 0 1 2 ; do echo "okd4-master-${i}" ; ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@okd4-master-${i}.${LAB_DOMAIN} "sudo journalctl --vacuum-time=1s"; done
for i in 0 1 2 ; do echo "okd4-master-${i}" ; ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@okd4-worker-${i}.${LAB_DOMAIN} "sudo journalctl --vacuum-time=1s"; done
```

## Project Provisioning:

```bash
oc describe clusterrolebinding.rbac self-provisioners

# Remove self-provisioning from all roles
oc patch clusterrolebinding.rbac self-provisioners -p '{"subjects": null}'

# Remove from specific role
oc adm policy remove-cluster-role-from-group self-provisioner system:authenticated:oauth

# Prevent automatic updates to the role
oc patch clusterrolebinding.rbac self-provisioners -p '{ "metadata": { "annotations": { "rbac.authorization.kubernetes.io/autoupdate": "false" } } }'
```

## iSCSI:

```bash
echo "InitiatorName=iqn.$(hostname)" > /etc/iscsi/initiatorname.iscsi
systemctl enable iscsid --now

iscsiadm -m  discovery -t st -l -p 10.11.11.5:3260

for i in 0 1 2 ; do ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@okd4-prd-master-${i}.${LAB_DOMAIN} "sudo bash -c \"echo InitiatorName=iqn.$(hostname) > /etc/iscsi/initiatorname.iscsi\" && sudo systemctl enable iscsid --now"; done

for i in 0 1 2 3 4 5 ; do ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@okd4-prd-worker-${i}.${LAB_DOMAIN} "sudo bash -c \"echo InitiatorName=iqn.$(hostname) > /etc/iscsi/initiatorname.iscsi\" && sudo systemctl enable iscsid --now"; done
```

## FCCT:

```bash
wget https://github.com/coreos/fcct/releases/download/v0.6.0/fcct-x86_64-unknown-linux-gnu
mv fcct-x86_64-unknown-linux-gnu ~/bin/lab_bin/fcct 
chmod 750 ~/bin/lab_bin/fcct
```

```yaml
# Merge some tweaks/bugfixes with the master Ignition config
variant: fcos
version: 1.1.0
ignition:
  config:
    merge:
      - local: ./files/master.ign
systemd:                        
  units:                        
  # we don't want docker starting
  # https://github.com/openshift/okd/issues/243
  - name: docker.service
    mask: true
storage:
  files:
    # Disable zincati, this should be removed in the next OKD beta
    # https://github.com/openshift/machine-config-operator/pull/1890
    # https://github.com/openshift/okd/issues/215
    - path: /etc/zincati/config.d/90-disable-feature.toml
      contents:
        inline: |
          [updates]
          enabled = false
    - path: /etc/systemd/network/25-nic0.link
      mode: 0644
      contents:
        inline: |
          [Match]
          MACAddress=${NET_MAC_0}
          [Link]
          Name=nic0
    - path: /etc/NetworkManager/system-connections/nic0.nmconnection
      mode: 0600
      overwrite: true
      contents:
        inline: |
          [connection]
          type=ethernet
          interface-name=nic0

          [ethernet]
          mac-address=<insert MAC address>

          [ipv4]
          method=manual
          addresses=192.0.2.10/24
          gateway=192.0.2.1
          dns=192.168.124.1;1.1.1.1;8.8.8.8
          dns-search=redhat.com
```

## iPXE:

```bash
wget http://boot.ipxe.org/ipxe.efi
```

```bash
uci add_list dhcp.lan.dhcp_option="6,10.11.11.10,8.8.8.8,8.8.4.4"
uci set dhcp.@dnsmasq[0].enable_tftp=1
uci set dhcp.@dnsmasq[0].tftp_root=/data/tftpboot
uci set dhcp.efi64_boot_1=match
uci set dhcp.efi64_boot_1.networkid='set:efi64'
uci set dhcp.efi64_boot_1.match='60,PXEClient:Arch:00007'
uci set dhcp.efi64_boot_2=match
uci set dhcp.efi64_boot_2.networkid='set:efi64'
uci set dhcp.efi64_boot_2.match='60,PXEClient:Arch:00009'
uci set dhcp.ipxe_boot=userclass
uci set dhcp.ipxe_boot.networkid='set:ipxe'
uci set dhcp.ipxe_boot.userclass='iPXE'
uci set dhcp.uefi=boot
uci set dhcp.uefi.filename='tag:efi64,tag:!ipxe,ipxe.efi'
uci set dhcp.uefi.serveraddress='10.11.11.1'
uci set dhcp.uefi.servername='pxe'
uci set dhcp.uefi.force='1'
uci set dhcp.ipxe=boot
uci set dhcp.ipxe.filename='tag:ipxe,boot.ipxe'
uci set dhcp.ipxe.serveraddress='10.11.11.1'
uci set dhcp.ipxe.servername='pxe'
uci set dhcp.ipxe.force='1'
uci commit dhcp
/etc/init.d/dnsmasq restart
```

## Journald

```bash
sed -i 's/#Storage.*/Storage=persistent/' /etc/systemd/journald.conf
sed -i 's/#SystemMaxUse.*/SystemMaxUse=4G/' /etc/systemd/journald.conf
systemctl restart systemd-journald.service
```

## KubeVirt

### Node Maintenance Operator

```bash
git clone https://github.com/kubevirt/node-maintenance-operator.git
cd node-maintenance-operator/

oc apply -f deploy/deployment-ocp/catalogsource.yaml
oc apply -f deploy/deployment-ocp/namespace.yaml
oc apply -f deploy/deployment-ocp/operatorgroup.yaml
oc apply -f deploy/deployment-ocp/subscription.yaml
```

### Hyperconverged Cluster Operator

```bash
export REGISTRY_NAMESPACE=kubevirt
export IMAGE_REGISTRY=${LOCAL_REGISTRY}
export TAG=4.6
export CONTAINER_TAG=4.6
export OPERATOR_IMAGE=hyperconverged-cluster-operator
export CONTAINER_BUILD_CMD=podman
export WORK_DIR=${OKD4_LAB_PATH}/kubevirt

git clone https://github.com/kubevirt/hyperconverged-cluster-operator.git

git checkout release-4.6`

podman build -f build/Dockerfile -t ${LOCAL_REGISTRY}/${REGISTRY_NAMESPACE}/${OPERATOR_IMAGE}:${TAG} --build-arg git_sha=$(shell git describe --no-match  --always --abbrev=40 --dirty) .

podman build -f tools/operator-courier/Dockerfile -t hco-courier .
podman tag hco-courier:latest  ${LOCAL_REGISTRY}/${REGISTRY_NAMESPACE}/hco-courier:latest
podman tag hco-courier:latest  ${LOCAL_REGISTRY}/${REGISTRY_NAMESPACE}/hco-courier:${TAG}

podman login ${LOCAL_REGISTRY}

podman push ${LOCAL_REGISTRY}/${REGISTRY_NAMESPACE}/${OPERATOR_IMAGE}:${TAG}
podman push ${LOCAL_REGISTRY}/${REGISTRY_NAMESPACE}/hco-courier:latest
podman push ${LOCAL_REGISTRY}/${REGISTRY_NAMESPACE}/hco-courier:${TAG}

./hack/build-registry-bundle.sh

cd ${WORK_DIR}

cat <<EOF > ${WORK_DIR}/operator-group.yml 
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: hco-operatorgroup
  namespace: kubevirt-hyperconverged
spec:
  targetNamespaces:
  - "kubevirt-hyperconverged"
EOF

cat <<EOF > ${WORK_DIR}/catalog-source.yml
apiVersion: operators.coreos.com/v1alpha1
kind: CatalogSource
metadata:
  name: hco-catalogsource
  namespace: openshift-marketplace
spec:
  sourceType: grpc
  image: ${IMAGE_REGISTRY}/${REGISTRY_NAMESPACE}/hco-container-registry:${CONTAINER_TAG}
  displayName: KubeVirt HyperConverged
  publisher: ${LAB_DOMAIN}
  updateStrategy:
    registryPoll:
      interval: 30m
EOF

cat <<EOF > subscription.yml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: hco-subscription
  namespace: kubevirt-hyperconverged
spec:
  channel: "1.0.0"
  name: kubevirt-hyperconverged
  source: hco-catalogsource
  sourceNamespace: openshift-marketplace
EOF

oc create -f hco.cr.yaml -n kubevirt-hyperconverged

export KUBEVIRT_PROVIDER="okd-4.5"
```

### KubeVirt project:

```bash
# export DOCKER_PREFIX=${LOCAL_REGISTRY}/kubevirt
# export DOCKER_TAG=okd-4.5
```

## Chrony

https://docs.openshift.com/container-platform/4.5/installing/install_config/installing-customizing.html

```yaml
apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  labels:
    machineconfiguration.openshift.io/role: master
  name: 99-crhony-master
spec:
  config:
    ignition:
      version: 2.2.0
    storage:
      files:
      - contents:
          source: data:text/plain;charset=utf-8;base64,<crony configuration base64 encode>
        filesystem: root
        mode: 420
        path: /etc/chrony.conf
```

```bash
cat << EOF | base64
server clock.redhat.com iburst
driftfile /var/lib/chrony/drift
makestep 1.0 3
rtcsync
logdir /var/log/chrony
EOF

cat << EOF > ./99_masters-chrony-configuration.yaml
apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  labels:
    machineconfiguration.openshift.io/role: master
  name: masters-chrony-configuration
spec:
  config:
    ignition:
      config: {}
      security:
        tls: {}
      timeouts: {}
      version: 2.2.0
    networkd: {}
    passwd: {}
    storage:
      files:
      - contents:
          source: data:text/plain;charset=utf-8;base64,c2VydmVyIGNsb2NrLnJlZGhhdC5jb20gaWJ1cnN0CmRyaWZ0ZmlsZSAvdmFyL2xpYi9jaHJvbnkvZHJpZnQKbWFrZXN0ZXAgMS4wIDMKcnRjc3luYwpsb2dkaXIgL3Zhci9sb2cvY2hyb255Cg==
          verification: {}
        filesystem: root
        mode: 420
        path: /etc/chrony.conf
  osImageURL: ""
EOF
```

## Add Certs to Nodes:

1. The next thing that we are going to do, is add a couple of certificates to our OpenShift cluster nodes:

   Our Gitea server and our Nexus server are both using self-signed certificates.  It's a bad practice to disable TLS verification in all of our pipelines.  So, I am going to show you how to add additional trusted certs to your OpenShift cluster.

   We do this by creating MachineConfig objects which will add files to our control-plane and worker nodes:

   1. First, we need the Gitea and Nexus certificates in PEM format, then base64 encoded for the MachineConfig objects.

      ```bash
      GITEA_CERT=$(openssl s_client -showcerts -connect gitea.${LAB_DOMAIN}:3000 </dev/null 2>/dev/null|openssl x509 -outform PEM | base64)
      NEXUS_CERT=$(openssl s_client -showcerts -connect nexus.${LAB_DOMAIN}:8443 </dev/null 2>/dev/null|openssl x509 -outform PEM | base64)
      ```

   1. Now, create the MachineConfig for the worker nodes: (Note that this will cause a rolling reboot of the nodes)

      ```bash
      cat << EOF | oc apply -f -
      apiVersion: machineconfiguration.openshift.io/v1
      kind: MachineConfig
      metadata:
        labels:
          machineconfiguration.openshift.io/role: worker
        name: 50-developer-ca-certs-worker
      spec:
        config:
          ignition:
            version: 3.2.0
          storage:
            files:
            - contents:
                source: data:text/plain;charset=utf-8;base64,${GITEA_CERT}
              filesystem: root
              mode: 0644
              path: /etc/pki/ca-trust/source/anchors/gitea-ca.crt
            - contents:
                source: data:text/plain;charset=utf-8;base64,${NEXUS_CERT}
              filesystem: root
              mode: 0644
              path: /etc/pki/ca-trust/source/anchors/nexus-ca.crt
      EOF
      ```

   1. Repeat for the control-plane nodes:

      ```bash
      cat << EOF | oc apply -f -
      apiVersion: machineconfiguration.openshift.io/v1
      kind: MachineConfig
      metadata:
        labels:
          machineconfiguration.openshift.io/role: master
        name: 50-developer-ca-certs-master
      spec:
        config:
          ignition:
            version: 3.2.0
          storage:
            files:
            - contents:
                source: data:text/plain;charset=utf-8;base64,${GITEA_CERT}
              filesystem: root
              mode: 0644
              path: /etc/pki/ca-trust/source/anchors/gitea-ca.crt
            - contents:
                source: data:text/plain;charset=utf-8;base64,${NEXUS_CERT}
              filesystem: root
              mode: 0644
              path: /etc/pki/ca-trust/source/anchors/nexus-ca.crt
      EOF
      ```

## CRC for OKD:

### One time setup

```bash
dnf install jq golang-bin gcc-c++ golang make zip

firewall-cmd --add-rich-rule "rule service name="libvirt" reject" --permanent
firewall-cmd --zone=dmz --change-interface=tt0 --permanent
firewall-cmd --zone=dmz --add-service=libvirt --permanent
firewall-cmd --zone=dmz --add-service=dns --permanent
firewall-cmd --zone=dmz --add-service=dhcp --permanent
firewall-cmd --reload

cat <<EOF >> /etc/libvirt/libvirtd.conf
listen_tls = 0
listen_tcp = 1
auth_tcp = "none"
tcp_port = "16509"
EOF

systemctl stop libvirtd
systemctl enable libvirtd-tcp.socket --now
systemctl start libvirtd

cat <<EOF > /etc/NetworkManager/conf.d/openshift.conf
[main]
dns=dnsmasq
EOF

cat <<EOF > /etc/NetworkManager/dnsmasq.d/openshift.conf
server=/crc.testing/192.168.126.1
address=/apps-crc.testing/192.168.126.11
EOF

systemctl reload NetworkManager

```

### Build SNC:

```bash

mkdir /root/crc-build
cd /root/crc-build

git clone https://github.com/code-ready/crc
git clone https://github.com/code-ready/snc

cd snc

cat << FOE > ~/bin/sncSetup.sh
export OKD_VERSION=\$1
export CRC_DIR=/root/crc-build
export OPENSHIFT_PULL_SECRET_PATH="\${CRC_DIR}/pull_secret.json"
export BUNDLE_VERSION=\${OKD_VERSION}
export BUNDLE_DIR=\${CRC_DIR}/snc
export OKD_BUILD=true
export TF_VAR_libvirt_bootstrap_memory=16384
export LIBGUESTFS_BACKEND=direct
export KUBECONFIG=\${CRC_DIR}/snc/crc-tmp-install-data/auth/kubeconfig
export OC=\${CRC_DIR}/snc/openshift-clients/linux/oc
cat << EOF > \${CRC_DIR}/pull_secret.json
{"auths":{"fake":{"auth": "Zm9vOmJhcgo="}}}
EOF
FOE

chmod 700 ~/bin/sncSetup.sh

. sncSetup.sh 4.7.0-0.okd-2021-06-13-090745

./snc.sh

# Watch progress:
export KUBECONFIG=crc-tmp-install-data/auth/kubeconfig 
./oc get pods --all-namespaces

# Rotate Certs:
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i id_ecdsa_crc core@api.crc.testing -- sudo openssl x509 -checkend 2160000 -noout -in /var/lib/kubelet/pki/kubelet-client-current.pem

./oc delete secrets/csr-signer-signer secrets/csr-signer -n openshift-kube-controller-manager-operator
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i id_ecdsa_crc core@api.crc.testing -- sudo rm -fr /var/lib/kubelet/pki
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i id_ecdsa_crc core@api.crc.testing -- sudo rm -fr /var/lib/kubelet/kubeconfig
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i id_ecdsa_crc core@api.crc.testing -- sudo systemctl restart kubelet

./oc get csr
./oc get csr '-ojsonpath={.items[*].metadata.name}' | xargs ./oc adm certificate approve

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i id_ecdsa_crc core@api.crc.testing -- sudo openssl x509 -checkend 2160000 -noout -in /var/lib/kubelet/pki/kubelet-client-current.pem

# Clean up Ingress:

./oc get pods --all-namespaces | grep NodeAffinity | while read i
do
    NS=$(echo ${i} | cut -d" " -f1 )
    POD=$(echo ${i} | cut -d" " -f2 )
    ./oc delete pod ${POD} -n ${NS}
done

./oc get pods --all-namespaces | grep CrashLoop | while read i
do
    NS=$(echo ${i} | cut -d" " -f1 )
    POD=$(echo ${i} | cut -d" " -f2 )
    ./oc delete pod ${POD} -n ${NS}
done

./oc delete pod --field-selector=status.phase==Succeeded --all-namespaces

./createdisk.sh crc-tmp-install-data

cd ../crc

make release
make out/macos-amd64/crc-macos-amd64.pkg

```

### Clean up VMs:

```bash

CRC=$(virsh net-list --all | grep crc- | cut -d" " -f2)
virsh destroy ${CRC}-bootstrap
virsh undefine ${CRC}-bootstrap
virsh destroy ${CRC}-master-0
virsh undefine ${CRC}-master-0
virsh net-destroy ${CRC}
virsh net-undefine ${CRC}
virsh pool-destroy ${CRC}
virsh pool-undefine ${CRC}
rm -rf /var/lib/libvirt/openshift-images/${CRC}

```

### Clean up SNC build:

```bash
rm -rf ${CRC_DIR}/snc/crc_*_${OKD_VERSION}*
```
### Rebase Git

```bash
git remote add upstream https://github.com/code-ready/crc.git
git fetch upstream
git rebase upstream/master
git push origin master --force



git checkout -b okd-snc

git checkout -b wip
<Make Code Changes>
git reset --soft okd-snc
git add .
git commit -m "Message Here"
git push
```

## CentOS 8 Nic issue:

```bash
ethtool -K nic0 tso off
```

## Market Place Disconnected

```bash
oc patch OperatorHub cluster --type json -p '[{"op": "add", "path": "/spec/disableAllDefaultSources", "value": true}]'
oc patch OperatorHub cluster --type json -p '[{"op": "add", "path": "/spec/sources/0/disabled", "value": true}]'


# oc patch OperatorHub cluster --type json -p '[{"op": "remove", "path": "/spec/sources/0"}]'
# oc patch OperatorHub cluster --type json -p '[{"op": "replace", "path": "/spec/sources/0", "value": {"name":"community-operators","disabled":false}}]'
# oc patch OperatorHub cluster --type json -p '[{"op": "add", "path": "/spec/sources/-", "value": {"name":"community-operators","disabled":true}}]'
```

## Add worker node:

```bash
oc extract -n openshift-machine-api secret/worker-user-data --keys=userData --to=- > worker.ign
```

## Clean up Completed or Failed Pods:

```bash
oc delete pod --field-selector=status.phase==Succeeded
oc delete pod --field-selector=status.phase==Failed
```

## Pod Scheduling:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: frontend-app
  labels:
    app: frontend-app
spec:
  serviceName: galera-cluster
  podManagementPolicy: "OrderedReady"
  replicas: 3
  selector:
    matchLabels:
      app: frontend-app
  template:
    metadata:
      labels:
        app: frontend-app
    spec:
      securityContext:
        runAsUser: 27
        fsGroup: 27
      serviceAccount: mariadb
      terminationGracePeriodSeconds: 60
      nodeSelector:
        node-role.kubernetes.io/worker: ""
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - frontend-app
              topologyKey: kubernetes.io/hostname
        podAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - backend-app
              topologyKey: kubernetes.io/hostname
      containers:
      - name: frontend-app
        image: image-registry.openshift-image-registry.svc:5000/openshift/frontend-app:latest
        imagePullPolicy: IfNotPresent 
        env: {}
        ports: {}
        volumeMounts: {}
      volumes: {}

apiVersion: apps/v1
kind: Deployment
metadata:
  name: backend-app
  labels:
    app: backend-app
spec:
  serviceName: galera-cluster
  podManagementPolicy: "OrderedReady"
  replicas: 3
  selector:
    matchLabels:
      app: backend-app
  template:
    metadata:
      labels:
        app: backend-app
    spec:
      securityContext:
        runAsUser: 27
        fsGroup: 27
      serviceAccount: mariadb
      terminationGracePeriodSeconds: 60
      nodeSelector:
        node-role.kubernetes.io/worker: ""
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - backend-app
              topologyKey: kubernetes.io/hostname
      containers:
      - name: backend-app
        image: image-registry.openshift-image-registry.svc:5000/openshift/backend-app:latest
        imagePullPolicy: IfNotPresent 
        env: {}
        ports: {}
        volumeMounts: {}
      volumes: {}

```

## Clone multiple repos at once

```bash
curl -s https://cgruver:@api.github.com/orgs/cgruver-erdemo/repos | jq ".[].clone_url" | xargs -n 1 git clone
```

## Update CentOS 8 to CentOS Stream

```bash
dnf install centos-release-stream
dnf swap centos-{linux,stream}-repos
dnf distro-sync
```

## Docker Hub Mirror

```bash
cat <<EOF > dockerHubMirror.yaml
apiVersion: operator.openshift.io/v1alpha1
kind: ImageContentSourcePolicy
metadata:
  name: dockerhub
spec:
  repositoryDigestMirrors:
  - mirrors:
    - nexus.${LAB_DOMAIN}:5002/dockerhub 
    source: docker.io 
EOF
```

## CIDR magic:

```bash
mask2cidr ()
{
   local x=${1##*255.}
   set -- 0^^^128^192^224^240^248^252^254^ $(( (${#1} - ${#x})*2 )) ${x%%.*}
   x=${1%%$3*}
   echo $(( $2 + (${#x}/4) ))
}

cidr2mask ()
{
   set -- $(( 5 - ($1 / 8) )) 255 255 255 255 $(( (255 << (8 - ($1 % 8))) & 255 )) 0 0 0
   [ $1 -gt 1 ] && shift $1 || shift
   echo ${1-0}.${2-0}.${3-0}.${4-0}
}
```

## Blog:

```bash
gem install jekyll bundler
jekyll new blog-name
bundle add webrick
bundle exec jekyll serve --livereload --drafts

gem update --system
gem update
rm Gemfile.lock
bundle update --all
```

## Clean up local images

Warning: This will delete all of the container images on your system. It will also likely free up a LOT of disk space.

```bash
podman system prune --all --force
```

## Set up Gitea mirror

```bash
mkdir ${OKD_LAB_PATH}/work-dir
cd ${OKD_LAB_PATH}/work-dir
curl -s https://cgruver:@api.github.com/orgs/lab-monkeys/repos | jq ".[].clone_url" | xargs -n 1 git clone --mirror
for i in $(ls)
do
  cd ${i}
  git remote set-url --push origin https://gitea.${LAB_DOMAIN}:3000/cgruver/${i}
  git push --mirror
done
cd
rm -rf ${OKD_LAB_PATH}/work-dir
```

## Monitoring:

```bash
cat << EOF | oc apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
  config.yaml: |
    enableUserWorkload: true
EOF

cat << EOF | oc apply -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: user-workload-monitoring-config
  namespace: openshift-user-workload-monitoring
data:
  config.yaml: |
    prometheusOperator:
      nodeSelector:
        node-role.kubernetes.io/infra: ""
      tolerations:
      - key: "node-role.kubernetes.io/master"
        operator: "Equal"
        value: ""
        effect: "NoSchedule"
    prometheus:
      nodeSelector:
        node-role.kubernetes.io/infra: ""
      tolerations:
      - key: "node-role.kubernetes.io/master"
        operator: "Equal"
        value: ""
        effect: "NoSchedule"
    thanosRuler:
      nodeSelector:
        node-role.kubernetes.io/infra: ""
      tolerations:
      - key: "node-role.kubernetes.io/master"
        operator: "Equal"
        value: ""
        effect: "NoSchedule"
EOF



oc new-project alertme

mkdir ${OKD_LAB_PATH}/metrics-dir
cd ${OKD_LAB_PATH}/metrics-dir

mvn io.quarkus:quarkus-maven-plugin:2.2.2.Final:create -DprojectGroupId=lab.awesome.my -DprojectArtifactId=alertme -DclassName="lab.awesome.my.Metrics" -Dpath="/count" -Dextensions="quarkus-resteasy-jackson,quarkus-micrometer-registry-prometheus,openshift"

cd alertme

cat << EOF > src/main/java/lab/awesome/my/Metrics.java
package lab.awesome.my;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.inject.Inject;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Tags;

@Path("/count/{metric}")
public class Metrics {

    @Inject
    MeterRegistry meter;

    @GET
    @Produces(MediaType.TEXT_PLAIN)
    public String count(@PathParam(value = "metric") String metric) {
        meter.counter("metrics_count", Tags.of("metric", metric)).increment();
        return "Got It!";
    }
}
EOF

cat << EOF > src/test/java/lab/awesome/my/MetricsTest.java
package lab.awesome.my;

import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

import static io.restassured.RestAssured.given;
import static org.hamcrest.CoreMatchers.is;

@QuarkusTest
public class MetricsTest {

    @Test
    public void testMetricsEndpoint() {
        given()
          .when().get("/count/metric")
          .then()
             .statusCode(200)
             .body(is("Got It!"));
    }
}
EOF

oc project alertme

mvn clean package -Dquarkus.kubernetes.deploy=true -Dquarkus.openshift.route.expose=true -Dquarkus.openshift.labels.app=alertme -Dquarkus.kubernetes-client.trust-certs=true

cat << EOF | oc apply -n alertme -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  labels:
    k8s-app: prometheus-app-monitor
  name: prometheus-app-monitor
spec:
  endpoints:
  - interval: 10s
    targetPort: 8080
    path: /q/metrics
    scheme: http
  selector:
    matchLabels:
      app: 'alertme'
EOF

cat << EOF | oc apply -n alertme -f -
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: alertme-alarm
spec:
  groups:
  - name: alertme
    rules:
    - alert: FailureCount
      expr: metrics_count_total{metric = "fail"} >= 5
EOF
```

```bash
curl http://alertme-alertme.apps.okd4.dc1.${LAB_DOMAIN}/q/metrics

metrics_count_total{metric = "fail"}

curl http://alertme-alertme.apps.okd4.dc1.${LAB_DOMAIN}/count/fail
```

```bash
# oc patch AlertManager main --patch '{"spec":{"alertmanagerConfigSelector":{"matchLabels":{"alertmanagerConfig":"pager-duty-apps"}}}}' --type=merge -n openshift-monitoring

# oc patch ConfigMap cluster-monitoring-config --patch '{"spec":{"alertmanagerConfigSelector":{"matchLabels":{"alertmanagerConfig":"pager-duty-apps"}}}}' --type=merge -n openshift-monitoring

cd ${OKD_LAB_PATH}/metrics-dir

oc get ConfigMap cluster-monitoring-config -n openshift-monitoring -o jsonpath='{.data.config\.yaml}' > config.yaml

cat << EOF > patch.yaml
enableUserWorkload: true
alertmanagerMain:
  alertmanagerConfigNamespaceSelector:
    matchLabels:
      alertmanagerConfig: customAlerts
  alertmanagerConfigSelector:
    matchLabels:
      alertmanagerConfig: customReceiver
EOF

yq eval-all -i 'select(fileIndex == 0) * select(filename == "patch.yaml")' config.yaml patch.yaml

cat << EOF > monitoring-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
EOF

IFS= read -rd '' CONFIG < <(cat config.yaml)
config=${CONFIG} yq e -i '.data."config.yaml" = strenv(config)' monitoring-config.yaml

oc patch ConfigMap cluster-monitoring-config -n openshift-monitoring --patch $(cat monitoring-config.yaml)

export PD_INTEGRATION_KEY=<your pagerduty integration key>

cat << EOF | oc apply -n alertme -f -
apiVersion: monitoring.coreos.com/v1alpha1
kind: AlertmanagerConfig
metadata:
  name: pager-duty-apps
  labels:
    alertmanagerConfig: customReceiver
spec:
  receivers:
  - name: pager-duty-apps
    pagerdutyConfigs:
    - severity: info
      routingKey:
        name: pager-duty-routing-key
        key: routingKey
      client: "AlertMe"
      description: "PagerDuty AlertMe App"
      details:
      - key: num_firing
        {% raw %}value: '{{ .Alerts.Firing | len }}'{% endraw %}
      - key: num_resolved
        {% raw %}value: '{{ .Alerts.Resolved | len }}'{% endraw %}
      - key: service
        {% raw %}value: '{{ .CommonLabels.container }}'{% endraw %}
      - key: alertname
        {% raw %}value: '{{ .CommonLabels.alertname }}'{% endraw %}
      - key: metric
        {% raw %}value: '{{ .CommonLabels.metric }}'{% endraw %}
      - key: namespace
        {% raw %}value: '{{ .CommonLabels.namespace }}'{% endraw %}
      - key: container
        {% raw %}value: '{{ .CommonLabels.container }}'{% endraw %}
      - key: pod
        {% raw %}value: '{{ .CommonLabels.pod }}'{% endraw %}
  route:
    groupBy:
      - namespace
    groupInterval: 5m
    groupWait: 30s
    receiver: pager-duty-apps
    repeatInterval: 12h
---
apiVersion: v1
kind: Secret
type: Opaque
metadata:
  name: pager-duty-routing-key
data:
  routingKey: ${PD_INTEGRATION_KEY}
EOF

```

```yaml
global:
  resolve_timeout: 15s
inhibit_rules:
  - equal:
      - namespace
      - alertname
    source_match:
      severity: critical
    target_match_re:
      severity: warning|info
  - equal:
      - namespace
      - alertname
    source_match:
      severity: warning
    target_match_re:
      severity: info
receivers:
  - name: Watchdog
  - name: Default
    pagerduty_configs:
      - severity: info
        routing_key: ${PD_INTEGRATION_KEY}
        client: "PagerDuty Default"
        description: "PagerDuty Default Alert"
        details:
          num_firing: '{{ .Alerts.Firing | len }}'
          num_resolved: '{{ .Alerts.Resolved | len }}'
          service: '{{ .CommonLabels.service }}'
          alertname: '{{ .CommonLabels.alertname }}'
          metric: '{{ .CommonLabels.metric }}'
          namespace: '{{ .CommonLabels.namespace }}'
          container: '{{ .CommonLabels.container }}'
          pod: '{{ .CommonLabels.pod }}'
route:
  group_by:
    - namespace
  group_interval: 15s
  group_wait: 20s
  receiver: Default
  repeat_interval: 12h
  routes:
    - match:
        alertname: Watchdog
      receiver: Watchdog
```

## Project Provisioning

```bash
mkdir ${OKD_LAB_PATH}/project-dir
cd ${OKD_LAB_PATH}/project-dir

oc adm create-bootstrap-project-template -o yaml > project-template.yaml

- apiVersion: rbac.authorization.k8s.io/v1
  kind: RoleBinding
  metadata:
    creationTimestamp: null
    name: ${PROJECT_NAME}-tekton-monitor-edit
    namespace: developer-monitoring
  roleRef:
    apiGroup: rbac.authorization.k8s.io
    kind: Role
    name: monitor-edit
  subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: pipeline
    namespace: ${PROJECT_NAME}



apiVersion: template.openshift.io/v1
kind: Template
metadata:
  creationTimestamp: null
  name: project-provisioning
objects:
- apiVersion: project.openshift.io/v1
  kind: Project
  metadata:
    annotations:
      openshift.io/description: ${PROJECT_DESCRIPTION}
      openshift.io/display-name: ${PROJECT_DISPLAYNAME}
      openshift.io/requester: ${PROJECT_REQUESTING_USER}
    creationTimestamp: null
    name: ${PROJECT_NAME}
  spec: {}
  status: {}
- apiVersion: rbac.authorization.k8s.io/v1
  kind: RoleBinding
  metadata:
    creationTimestamp: null
    name: admin
    namespace: ${PROJECT_NAME}
  roleRef:
    apiGroup: rbac.authorization.k8s.io
    kind: ClusterRole
    name: admin
  subjects:
  - apiGroup: rbac.authorization.k8s.io
    kind: User
    name: ${PROJECT_ADMIN_USER}
- apiVersion: rbac.authorization.k8s.io/v1
  kind: RoleBinding
  metadata:
    creationTimestamp: null
    name: ${PROJECT_NAME}-tekton-monitoring-edit
    namespace: developer-monitoring
  roleRef:
    apiGroup: rbac.authorization.k8s.io
    kind: Role
    name: monitoring-edit
  subjects:
  - kind: ServiceAccount
    name: pipeline
    namespace: ${PROJECT_NAME}
parameters:
- name: PROJECT_NAME
- name: PROJECT_DISPLAYNAME
- name: PROJECT_DESCRIPTION
- name: PROJECT_ADMIN_USER
- name: PROJECT_REQUESTING_USER

```

### Force Rotation of the initial certs

1. Check for cert expiration:

   ```bash
   ssh core@okd4-master-0.dc1.${LAB_DOMAIN} "sudo openssl x509 -checkend 2160000 -noout -in /var/lib/kubelet/pki/kubelet-client-current.pem"
   ```

   Output will look like:

   ```bash
   Certificate will expire
   ```

1. Delete the current cert, forcing a new Certificate Signing Request

   ```bash
   oc delete secrets/csr-signer-signer secrets/csr-signer -n openshift-kube-controller-manager-operator
   for i in 0 1 2
   do
     ssh core@okd4-master-${i}.dc1.${LAB_DOMAIN} "sudo rm -fr /var/lib/kubelet/pki && sudo rm -fr /var/lib/kubelet/kubeconfig && sudo systemctl restart kubelet"
   done
   oc get csr
   oc get csr -ojson | jq -r '.items[] | select(.status == {} ) | .metadata.name' | xargs oc adm certificate approve

   ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i id_ecdsa_crc core@api.crc.testing -- sudo openssl x509 -checkend 2160000 -noout -in /var/lib/kubelet/pki/kubelet-client-current.pem
   ```

### YAML manipulation

```bash
yq e .master-nodes inventory.yaml | yq e '.[0]' -
yq e .master-nodes inventory.yaml | yq e 'length' -
yq e .master-nodes inventory.yaml | yq e '.[0].hostname' -

```

### Mac OS DNS
```bash
sudo killall -HUP mDNSResponder
```

### Bootstrap on Mac OS

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

qemu-system-x86_64 -accel accel=hvf -m 12G -smp 2 -display none -nographic -drive file=bootstrap-node.qcow2,if=virtio -boot n -netdev vde,id=nic0,sock=/var/run/vde.bridged.en13.ctl -device virtio-net-pci,netdev=nic0
```

### Gitea webhooks

```bash
curl --location --request POST 'http://git-tea-host/api/v1/repos/test-user/test-repo/hooks' \
--header 'Content-Type: application/json' \
--header 'Authorization: Basic <someBase64Str>' \
--header 'Content-Type: application/json' \
--data-raw '{
  "active": true,
  "branch_filter": "main",
  "config": {
    "content_type": "json",
    "url": "http://repositories/2222",
    "http_method": "post"
  },
  "events": [
    "push_only"
  ],
  "type": "gitea"
}'
```

```golang
type HookEvents struct {
	Create               bool `json:"create"`
	Delete               bool `json:"delete"`
	Fork                 bool `json:"fork"`
	Issues               bool `json:"issues"`
	IssueAssign          bool `json:"issue_assign"`
	IssueLabel           bool `json:"issue_label"`
	IssueMilestone       bool `json:"issue_milestone"`
	IssueComment         bool `json:"issue_comment"`
	Push                 bool `json:"push"`
	PullRequest          bool `json:"pull_request"`
	PullRequestAssign    bool `json:"pull_request_assign"`
	PullRequestLabel     bool `json:"pull_request_label"`
	PullRequestMilestone bool `json:"pull_request_milestone"`
	PullRequestComment   bool `json:"pull_request_comment"`
	PullRequestReview    bool `json:"pull_request_review"`
	PullRequestSync      bool `json:"pull_request_sync"`
	Repository           bool `json:"repository"`
	Release              bool `json:"release"`
}
```

```bash


KEY=$(curl -XPOST -H "Content-Type: application/json"  -k -d '{"name":"test"}' -u ${GITEA_CREDS} https://gitea.${LAB_DOMAIN}:3000/api/v1/users/library-sa/tokens | jq -r '.sha1')
```

### Tekton Task Test

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: task-test
spec:
  stepTemplate:
    volumeMounts:
    - name: varlibc
      mountPath: /var/lib/containers
  steps:
  - name: task-test
    image: image-registry.openshift-image-registry.svc:5000/openshift/jdk-11-builder:latest
    imagePullPolicy: IfNotPresent
    script: |
      echo sa
      ls -l /var/run/secrets/kubernetes.io/serviceaccount
      echo creds
      ls -l /tekton/creds-secrets
      echo home
      ls -l $HOME
      ls -l /tekton/creds-secrets/gitea-secret
      cat /tekton/creds-secrets/gitea-secret/username
      cat /tekton/creds-secrets/gitea-secret/password
    env:
    - name: user.home
      value: /tekton/home
    workingDir: "/workspace/source"
  volumes:
  - name: varlibc
    emptyDir: {}

---

apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  name: task-test-run
spec:
  taskRef:
    name: task-test
  params: []

---

apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: buildah-test
spec:
  stepTemplate:
    volumeMounts:
    - name: varlibc
      mountPath: /var/lib/containers
  steps:
  - name: prep-workingdir
    image: image-registry.openshift-image-registry.svc:5000/openshift/buildah:latest
    imagePullPolicy: IfNotPresent
    script: |
      chmod 777 /workspace/source
      cp -r /tekton/creds/.docker /workspace/source
      chown -R 1000:1000 /workspace/source/.docker
    env:
    - name: user.home
      value: /workspace/source
    workingDir: "/workspace/source"
  - name: build-image
    image: image-registry.openshift-image-registry.svc:5000/openshift/buildah:latest
    securityContext:
      runAsUser: 1000
    imagePullPolicy: Always
    script: |
      export HOME=/workspace/source
      export BUILDAH_ISOLATION=chroot
      APP_NAME=test
      DESTINATION_IMAGE="image-registry.openshift-image-registry.svc:5000/$(context.taskRun.namespace)/${APP_NAME}:latest"
      buildah --version
      BUILDAH_ARGS="--storage-driver vfs"
      CONTAINER=$(buildah ${BUILDAH_ARGS} from image-registry.openshift-image-registry.svc:5000/openshift/buildah:latest )
      # CONTAINER=$(buildah --storage-driver vfs --log-level trace --userns-uid-map $(id -u):$(( $(id -u) + 1 )):65536 --userns-gid-map $(id -u):$(( $(id -u) + 1 )):65536 --tls-verify=false from image-registry.openshift-image-registry.svc:5000/openshift/buildah:latest )
      cat << EOF > ./test.sh
      #!/bin/bash
      echo "hello"
      EOF
      chmod 750 ./test.sh
      buildah ${BUILDAH_ARGS} copy ${CONTAINER} ./test.sh /application.sh
      buildah ${BUILDAH_ARGS} config --entrypoint '["/application.sh"]' --port 8080 ${CONTAINER}
      buildah ${BUILDAH_ARGS} config --label GIT_COMMIT="Hello" --author="Tekton" ${CONTAINER}
      buildah ${BUILDAH_ARGS} commit ${CONTAINER} ${DESTINATION_IMAGE}
      buildah ${BUILDAH_ARGS} unmount ${CONTAINER}
      buildah ${BUILDAH_ARGS} push ${DESTINATION_IMAGE} docker://${DESTINATION_IMAGE}
    env:
    - name: user.home
      value: /workspace/source
    workingDir: "/workspace/source"
  volumes:
  - name: varlibc
    emptyDir: {}

---

apiVersion: tekton.dev/v1beta1
kind: TaskRun
metadata:
  name: buildah-test
spec:
  taskRef:
    name: buildah-test
  params: []

```

### ConfigMap to add certs to pod

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: lab-ca
  labels:
    config.openshift.io/inject-trusted-cabundle: "true"
data: {}
```

### CronJob to clean up pipeline runs

```bash
oc get pipelinerun -o go-template='{{range .items}}{{index .metadata.labels "app-name"}}{{"\n"}}{{end}}' | sort -u | grep -v "<no value>"

oc get pipelinerun -o go-template='{{range .items}}{{index .metadata.labels "tekton.dev/pipeline"}}{{"\n"}}{{end}}' 

oc get pipelinerun -o go-template='{{range .items}}{{index .metadata.name}}{{"\n"}}{{end}}' 

oc get pipelinerun -o jsonpath={.items[*].metadata.name}

oc get pipelinerun -l app-name=app-demo --sort-by=.metadata.creationTimestamp -o name

CURRENT_TIME=$(date +%s); for PIPELINE_RUN in $(oc get pipelinerun -o jsonpath='{.items[*].metadata.name}'); do CREATE_TIME=$(date -d$(oc get pipelinerun ${PIPELINE_RUN} -o jsonpath='{.metadata.creationTimestamp}') +%s); TIME_DELTA=$(( ${CURRENT_TIME} - ${CREATE_TIME} )); if [[ ${TIME_DELTA} -gt  ${RETAIN_TIME} ]]; then echo \"Removing PipelineRun: ${PIPELINE_RUN}\"; oc delete pipelinerun ${PIPELINE_RUN}; fi; done

CURRENT_TIME=$(date +%s)
RETAIN_TIME=86400
for PIPELINE_RUN in $(oc get pipelinerun -o jsonpath='{.items[*].metadata.name}')
do
  CREATE_TIME=$(date -d$(oc get pipelinerun ${PIPELINE_RUN} -o jsonpath='{.metadata.creationTimestamp}') +%s)
  TIME_DELTA=$(( ${CURRENT_TIME} - ${CREATE_TIME} ))
  if [[ ${TIME_DELTA} -gt  ${RETAIN_TIME} ]]
  then
    echo "Removing PipelineRun: ${PIPELINE_RUN}"
    oc delete pipelinerun ${PIPELINE_RUN}
  fi
done

oc get pipelinerun -o go-template='{{range .items}}{{index .metadata.labels "app-name"}}{{"\n"}}{{end}}' | sort -u | grep -v "<no value>" | while read appName
do
  oc get pipelinerun -l app-name=${appName} --sort-by=.metadata.creationTimestamp -o name | head -n -${RETAIN} | while read pipelineRun
  do
    echo "$(date -Is) Removing PipelineRun: ${pipelineRun}"
    oc delete ${pipelineRun}
  done
done

```

```yaml
apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: tekton-global-pipelinerun-pruner
spec:
  schedule: "0 0 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          serviceAccount: pipeline
          containers:
            - name: openshift-cli
              image: image-registry.openshift-image-registry.svc:5000/openshift/origin-cli:latest
              env:
                - name: RETAIN_TIME
                  value: "86400"
              command:
                - /bin/bash
              args:
                - -c
                - "CURRENT_TIME=$(date +%s); for PIPELINE_RUN in $(oc get pipelinerun -o jsonpath='{.items[*].metadata.name}'); do CREATE_TIME=$(date -d$(oc get pipelinerun ${PIPELINE_RUN} -o jsonpath='{.metadata.creationTimestamp}') +%s); TIME_DELTA=$(( ${CURRENT_TIME} - ${CREATE_TIME} )); if [[ ${TIME_DELTA} -gt  ${RETAIN_TIME} ]]; then echo \"Removing PipelineRun: ${PIPELINE_RUN}\"; oc delete pipelinerun ${PIPELINE_RUN}; fi; done"
              resources:
                requests:
                  cpu: 100m
                  memory: 64Mi
                limits:
                  cpu: 100m
                  memory: 64Mi

---

apiVersion: batch/v1beta1
kind: CronJob
metadata:
  name: tekton-app-pipelinerun-pruner
spec:
  schedule: "0 0 * * *"
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          serviceAccount: pipeline
          containers:
            - name: openshift-cli
              image: image-registry.openshift-image-registry.svc:5000/openshift/origin-cli:latest
              env:
                - name: SELECT_LABEL
                  value: "app-name"
                - name: RETAIN_LAST
                  value: "2"
              command:
                - /bin/bash
              args:
                - -c
                - "CURRENT_TIME=$(date +%s); for PIPELINE_RUN in $(oc get pipelinerun -o jsonpath='{.items[*].metadata.name}'); do CREATE_TIME=$(date -d$(oc get pipelinerun ${PIPELINE_RUN} -o jsonpath='{.metadata.creationTimestamp}') +%s); TIME_DELTA=$(( ${CURRENT_TIME} - ${CREATE_TIME} )); if [[ ${TIME_DELTA} -gt  ${RETAIN_TIME} ]]; then echo \"Removing PipelineRun: ${PIPELINE_RUN}\"; oc delete pipelinerun ${PIPELINE_RUN}; fi; done"
              resources:
                requests:
                  cpu: 100m
                  memory: 64Mi
                limits:
                  cpu: 100m
                  memory: 64Mi

```

```yaml
kind: Deployment
apiVersion: apps/v1
metadata:
  name: secrets-csi-test-deployment
  namespace: csi-driver-workloads
  labels:
    app: secrets-csi-test-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: secrets-csi-test-deployment
  template:
    metadata:
      labels:
        app: secrets-csi-test-deployment
    spec:
      containers:
        - name: secrets-csi-test-pod
          command:
            - /bin/sleep
            - '10000'
          volumeMounts:
            - name: secrets-store-inline
              readOnly: true
              mountPath: /mnt/secrets-store
          image: 'k8s.gcr.io/e2e-test-images/busybox:1.29'
      volumes:
        - name: secrets-store-inline
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: my-application-aws-secrets
---
kind: Pod
apiVersion: v1
metadata:
  name: secrets-csi-test-pod
  namespace: csi-driver-workloads
  labels:
    app: secrets-csi-test-pod
spec:
  containers:
    - name: secrets-csi-test-pod
      command:
        - /bin/sleep
        - '10000'
      volumeMounts:
        - name: secrets-store-inline
          readOnly: true
          mountPath: /mnt/secrets-store
      image: 'k8s.gcr.io/e2e-test-images/busybox:1.29'
  serviceAccount: default
  volumes:
    - name: secrets-store-inline
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: my-application-aws-secrets
```

## List Cluster Admins:

```bash
oc get clusterrolebindings -o json | jq '.items[] | select(.roleRef.name=="cluster-admin") | select(.subjects[].name=="admin" and .subjects[].kind=="User") | .subjects | length'
```

## Bare Metal Notes:

```bash
brew install qemu
brew install autoconf
brew install automake
brew install wolfssl

mkdir -p ${OKD_LAB_PATH}/work-dir
cd ${OKD_LAB_PATH}/work-dir
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
cd
rm -rf ${OKD_LAB_PATH}/work-dir

mkdir -p ${OKD_LAB_PATH}/bootstrap
qemu-img create -f qcow2 ${OKD_LAB_PATH}/bootstrap/bootstrap-node.qcow2 50G

BOOTSTRAP_BRIDGE=en6

qemu-system-x86_64 -accel accel=hvf -m 12G -smp 2 -display none -nographic -drive file=${OKD_LAB_PATH}/bootstrap/bootstrap-node.qcow2,if=none,id=disk1  -device ide-hd,bus=ide.0,drive=disk1,id=sata0-0-0,bootindex=1 -boot n -netdev vde,id=nic0,sock=/var/run/vde.bridged.${BOOTSTRAP_BRIDGE}.ctl -device virtio-net-pci,netdev=nic0,mac=52:54:00:a1:b2:c3

launchctl unload -w "/Library/LaunchDaemons/io.github.lima-vm.vde_vmnet.bridged.${BOOTSTRAP_BRIDGE}.plist"
launchctl unload -w "/Library/LaunchDaemons/io.github.virtualsquare.vde-2.vde_switch.bridged.${BOOTSTRAP_BRIDGE}.plist"
launchctl unload -w "/Library/LaunchDaemons/io.github.lima-vm.vde_vmnet.plist"
launchctl unload -w "/Library/LaunchDaemons/io.github.virtualsquare.vde-2.vde_switch.plist"

launchctl load -w "/Library/LaunchDaemons/io.github.virtualsquare.vde-2.vde_switch.plist"
launchctl load -w "/Library/LaunchDaemons/io.github.lima-vm.vde_vmnet.plist"
launchctl load -w "/Library/LaunchDaemons/io.github.virtualsquare.vde-2.vde_switch.bridged.${BOOTSTRAP_BRIDGE}.plist"
launchctl load -w "/Library/LaunchDaemons/io.github.lima-vm.vde_vmnet.bridged.${BOOTSTRAP_BRIDGE}.plist"

  disks:
    - device: /dev/${boot_dev}
      partitions:
        - label: root
          number: 4
          size_mib: 0
          resize: true

systemd:
   units:
     - name: hyper-thread.service
       enabled: true
       contents: |
         [Unit]
         Description=Enable HyperThreading
         Before=kubelet.service
         After=systemd-machine-id-commit.service
         ConditionKernelCommandLine=mitigations
         
         [Service]
         Type=oneshot
         RemainAfterExit=yes
         ExecStart=/bin/rpm-ostree kargs --replace="mitigations=auto" --reboot
         [Install]
         RequiredBy=kubelet.service
         WantedBy=multi-user.target

kill $(ps -ef | grep qemu | grep bootstrap | awk '{print $2}')

for i in 0 1 2
do
  ssh core@okd4-master-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} "sudo rpm-ostree kargs --replace=\"mitigations=auto,nosmt=auto\""
done

for i in 0 1 2
do
  ssh core@okd4-master-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} "sudo systemctl reboot"
  sleep 30
done

for i in 0 1 2
do
  ssh core@okd4-worker-${i}.${SUB_DOMAIN}.${LAB_DOMAIN} "sudo rpm-ostree kargs --replace=\"mitigations=auto,nosmt=auto\" --delete-if-present=\"mitigations=off\" --reboot"
done

```

```bash
podman pull -q quay.io/openshift/okd-content@sha256:57a303eec1366e3d8aa30a2fa02f63aafdeaa01e6e3bf072e22f3fc500bbe5e1

podman create --net=none --annotation=org.openshift.machineconfigoperator.pivot=true --name ostree-container-pivot-d5b4750a-a7fa-47ed-9c5e-1670e178b8fc quay.io/openshift/okd-content@sha256:57a303eec1366e3d8aa30a2fa02f63aafdeaa01e6e3bf072e22f3fc500bbe5e1

podman cp c7661ba70298684cf51ecb8615e8c6eec446e4b6e53be06573a8cd508bbfbfc1:/ /run/mco-machine-os-content/os-content-349361028


cpio --extract < ../rootfs.img
unsquashfs root.squashfs

mksquashfs squashfs-root/ rootfs

###

OKD_RELEAE_IMAGE=$(openshift-install version | grep image | cut -d" " -f3)

podman machine init fcos
podman machine start fcos

FCOS_SSH_PORT=$(cat ~/.config/containers/podman/machine/qemu/fcos.json | jq -r '.Port')

ssh -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo podman pull -q ${OKD_RELEAE_IMAGE}"
OS_CONTENT_IMAGE=$(ssh -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost  "sudo podman run --quiet --rm --net=none ${OKD_RELEAE_IMAGE} image machine-os-content")
ssh -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo podman pull -q ${OS_CONTENT_IMAGE}"
CONTAINER_ID=$(ssh -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo podman create --net=none --name ostree-container ${OS_CONTENT_IMAGE}")

ssh -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo mkdir -p /usr/local/fcos-image/os-content && sudo podman cp ${CONTAINER_ID}:/ /usr/local/fcos-image/os-content"

scp -i ~/.ssh/fcos -P ${FCOS_SSH_PORT} ${OKD_LAB_PATH}/ipxe-work-dir/fcos/okd4-sno-${SUB_DOMAIN}/rootfs.img core@localhost:/tmp/rootfs.img

ssh -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo mkdir -p /usr/local/fcos-image/rootfs && sudo cpio --extract -D /usr/local/fcos-image/rootfs < /tmp/rootfs.img"

ssh -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo unsquashfs -d /usr/local/fcos-image/new-fs /usr/local/fcos-image/rootfs/root.squashfs"

ssh -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo rm -rf /usr/local/fcos-image/new-fs/ostree/repo && mv /usr/local/fcos-image/os-content/srv/repo /usr/local/fcos-image/new-fs/ostree/repo"

ssh -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo rm -f /usr/local/fcos-image/rootfs/root.squashfs && mksquashfs /usr/local/fcos-image/new-fs/ /usr/local/fcos-image/rootfs/root.squashfs"

ssh -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo rm -rf /usr/local/fcos-image/new-fs/ /usr/local/fcos-image/os-content"

ssh -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo cpio -D /usr/local/fcos-image/rootfs --create < cpio.list > /usr/local/fcos-image/rootfs.img"

scp -i ~/.ssh/fcos -P ${FCOS_SSH_PORT} core@localhost:/usr/local/fcos-image/rootfs.img ${OKD_LAB_PATH}/ipxe-work-dir/fcos/okd4-sno-${SUB_DOMAIN}/bootstrap-rootfs.img 

podman machine stop fcos
podman machine rm fcos
```

## Wireless

```bash
. labctx.sh

createEnvScript.sh
cat ~/.ssh/id_rsa.pub | ssh root@192.168.8.1 "cat >> /etc/dropbear/authorized_keys"
cat ${OKD_LAB_PATH}/work-dir/internal-router | ssh root@192.168.8.1 "cat >> /root/.profile"
rm -rf ${OKD_LAB_PATH}/work-dir
scp ${OKD_LAB_PATH}/utils/domain/init-router.sh root@192.168.8.1:/tmp
ssh root@192.168.8.1 "chmod 700 /tmp/init-router.sh && . ~/.profile ; /tmp/init-router.sh"
ssh root@192.168.8.1 "poweroff"

scp ${OKD_LAB_PATH}/utils/domain/config-router.sh root@${DOMAIN_ROUTER}:/tmp
ssh root@${DOMAIN_ROUTER} "chmod 700 /tmp/config-router.sh && . ~/.profile ; /tmp/config-router.sh"
ssh root@${DOMAIN_ROUTER} "reboot"
```

```bash
uci set wireless.radio0.disabled=1
uci set wireless.radio1.disabled=1
uci set wireless.radio2.disabled=1
uci set wireless.default_radio0.disabled=1
uci commit wireless
/etc/init.d/network reload
```

## Single Node Cluster

```bash

ssh core@10.14.14.200 "sudo rpm-ostree kargs --replace=\"mitigations=auto,nosmt=auto\""
ssh core@10.14.14.200 "sudo systemctl reboot"

export KUBECONFIG="${OKD4_SNC_PATH}/okd4-install-dir/auth/kubeconfig"
oc patch etcd cluster -p='{"spec": {"unsupportedConfigOverrides": {"useUnsupportedUnsafeNonHANonProductionUnstableEtcd": true}}}' --type=merge
oc patch IngressController default -n openshift-ingress-operator -p='{"spec": {"replicas": 1}}' --type=merge
oc patch authentications.operator.openshift.io cluster -p='{"spec": {"unsupportedConfigOverrides": {"useUnsupportedUnsafeNonHANonProductionUnstableOAuthServer": true }}}' --type=merge

```

### Secret test

```bash
podman pull docker.io/library/nginx
podman tag docker.io/library/nginx:latest ${LOCAL_REGISTRY}/test/nginx:latest
podman login -u admin ${LOCAL_REGISTRY} --tls-verify=false
podman push ${LOCAL_REGISTRY}/test/nginx:latest --tls-verify=false

oc create sa test-sa

GITEA_CERT=$(openssl s_client -showcerts -connect gitea.${LAB_DOMAIN}:3000 </dev/null 2>/dev/null|openssl x509 -outform PEM | while read line; do echo "    $line"; done)

oc create secret generic secret-test --from-literal=cert=${GITEA_CERT}

cat << EOF | oc apply -f -
apiVersion: v1
kind: Secret
metadata:
  name: gitea-secret
type: kubernetes.io/basic-auth
data:
  username: $(echo -n "gitea-cert" | base64)
  password: "$(echo -n ${GITEA_CERT} | base64)"
EOF

oc patch sa test-sa --type json --patch '[{"op": "add", "path": "/secrets/-", "value": {"name":"secret-test"}}]'
oc patch sa test-sa --type json --patch '[{"op": "add", "path": "/secrets/-", "value": {"name":"gitea-secret"}}]'

cat << EOF | oc apply -f -
apiVersion: v1
kind: Pod
metadata:
  name: secret-test
spec:
  containers:
  - name: secret-test
    image: ${LOCAL_REGISTRY}/test/nginx:latest
  serviceAccount: test-sa
EOF
```

### FCOS RootFS
```bash
#!/bin/bash

SSH="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
SCP="scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
CONFIG_FILE=${LAB_CONFIG_FILE}

for i in "$@"
do
  case $i in
    -c=*|--config=*)
      CONFIG_FILE="${i#*=}"
      shift # past argument=value
    ;;
    -d=*|--domain=*)
      SUB_DOMAIN="${i#*=}"
      shift
    ;;
      *)
            # put usage here:
      ;;
  esac
done

DONE=false
DOMAIN_COUNT=$(yq e ".sub-domain-configs" ${CONFIG_FILE} | yq e 'length' -)
let i=0
while [[ i -lt ${DOMAIN_COUNT} ]]
do
  domain_name=$(yq e ".sub-domain-configs.[${i}].name" ${CONFIG_FILE})
  if [[ ${domain_name} == ${SUB_DOMAIN} ]]
  then
    INDEX=${i}
    DONE=true
    break
  fi
  i=$(( ${i} + 1 ))
done
if [[ ${DONE} == "false" ]]
then
  echo "Domain Entry Not Found In Config File."
  exit 1
fi

SUB_DOMAIN=$(yq e ".sub-domain-configs.[${INDEX}].name" ${CONFIG_FILE})
CLUSTER_CONFIG=$(yq e ".sub-domain-configs.[${INDEX}].cluster-config-file" ${CONFIG_FILE})
CLUSTER_NAME=$(yq e ".cluster-name" ${CLUSTER_CONFIG})
OKD_RELEAE_IMAGE=$(openshift-install version | grep image | cut -d" " -f3)

podman machine init fcos
podman machine start fcos

FCOS_SSH_PORT=$(cat ~/.config/containers/podman/machine/qemu/fcos.json | jq -r '.Port')

${SCP} -i ~/.ssh/fcos -P ${FCOS_SSH_PORT} ${OKD_LAB_PATH}/ipxe-work-dir/fcos/${CLUSTER_NAME}-${SUB_DOMAIN}/rootfs.img core@localhost:/tmp/rootfs.img

cat << EOF > /tmp/createRootFs.sh
#!/bin/bash

set -x

podman pull -q ${OKD_RELEAE_IMAGE}
OS_CONTENT_IMAGE=\$(podman run --quiet --rm --net=none ${OKD_RELEAE_IMAGE} image machine-os-content)
podman pull -q \${OS_CONTENT_IMAGE}
CONTAINER_ID=\$(podman create --net=none --name ostree-container \${OS_CONTENT_IMAGE})
mkdir -p /usr/local/fcos-image/os-content
podman cp \${CONTAINER_ID}:/ /usr/local/fcos-image/os-content
mkdir -p /usr/local/fcos-image/rootfs
cpio --extract -D /usr/local/fcos-image/rootfs < /tmp/rootfs.img
unsquashfs -d /usr/local/fcos-image/new-fs /usr/local/fcos-image/rootfs/root.squashfs
rm -rf /usr/local/fcos-image/new-fs/ostree/repo
mv /usr/local/fcos-image/os-content/srv/repo /usr/local/fcos-image/new-fs/ostree/repo
rm -f /usr/local/fcos-image/rootfs/root.squashfs
mksquashfs /usr/local/fcos-image/new-fs/ /usr/local/fcos-image/rootfs/root.squashfs -comp zstd
rm -rf /usr/local/fcos-image/new-fs/ /usr/local/fcos-image/os-content
ls /usr/local/fcos-image/rootfs > /usr/local/fcos-image/cpio.list
cpio -D /usr/local/fcos-image/rootfs --create < /usr/local/fcos-image/cpio.list > /usr/local/fcos-image/rootfs.img
EOF

${SCP} -i ~/.ssh/fcos -P ${FCOS_SSH_PORT} /tmp/createRootFs.sh core@localhost:/tmp/createRootFs.sh

${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo chmod 755 /tmp/createRootFs.sh"
${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo /tmp/createRootFs.sh"

${SCP} -i ~/.ssh/fcos -P ${FCOS_SSH_PORT} core@localhost:/usr/local/fcos-image/rootfs.img ${OKD_LAB_PATH}/ipxe-work-dir/fcos/okd4-sno-${SUB_DOMAIN}/bootstrap-rootfs.img 

# ${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo podman pull -q ${OKD_RELEAE_IMAGE}"
# OS_CONTENT_IMAGE=$(${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost  "sudo podman run --quiet --rm --net=none ${OKD_RELEAE_IMAGE} image machine-os-content")
# ${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo podman pull -q ${OS_CONTENT_IMAGE}"
# CONTAINER_ID=$(${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo podman create --net=none --name ostree-container ${OS_CONTENT_IMAGE}")

# ${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo mkdir -p /usr/local/fcos-image/os-content && sudo podman cp ${CONTAINER_ID}:/ /usr/local/fcos-image/os-content"

# ${SCP} -i ~/.ssh/fcos -P ${FCOS_SSH_PORT} ${OKD_LAB_PATH}/ipxe-work-dir/fcos/okd4-sno-${SUB_DOMAIN}/rootfs.img core@localhost:/tmp/rootfs.img

# ${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo mkdir -p /usr/local/fcos-image/rootfs && sudo cpio --extract -D /usr/local/fcos-image/rootfs < /tmp/rootfs.img"

# ${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo unsquashfs -d /usr/local/fcos-image/new-fs /usr/local/fcos-image/rootfs/root.squashfs"

# ${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo rm -rf /usr/local/fcos-image/new-fs/ostree/repo && sudo mv /usr/local/fcos-image/os-content/srv/repo /usr/local/fcos-image/new-fs/ostree/repo"

# ${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo rm -f /usr/local/fcos-image/rootfs/root.squashfs && sudo mksquashfs /usr/local/fcos-image/new-fs/ /usr/local/fcos-image/rootfs/root.squashfs"

# ${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo rm -rf /usr/local/fcos-image/new-fs/ /usr/local/fcos-image/os-content"

# ${SSH} -i ~/.ssh/fcos -p ${FCOS_SSH_PORT} core@localhost "sudo ls /usr/local/fcos-image/rootfs > /usr/local/fcos-image/cpio.list && sudo cpio -D /usr/local/fcos-image/rootfs --create < /usr/local/fcos-image/cpio.list > /usr/local/fcos-image/rootfs.img"

# ${SCP} -i ~/.ssh/fcos -P ${FCOS_SSH_PORT} core@localhost:/usr/local/fcos-image/rootfs.img ${OKD_LAB_PATH}/ipxe-work-dir/fcos/okd4-sno-${SUB_DOMAIN}/bootstrap-rootfs.img 

# podman machine stop fcos
# sleep 10
# podman machine rm --force fcos
```

## Lab Refator - Build from Scratch

```bash
cp ~/.ssh/id_rsa.pub ${OKD_LAB_PATH}/ssh_key.pub
labRouter.sh -e -i
labRouter.sh -e -s
labRouter.sh -e -aw
labPi.sh -i
labPi.sh -s
labPi.sh -n -g

ssh root@bastion.${LAB_DOMAIN} "echo \$(cat /usr/local/nexus/sonatype-work/nexus3/admin.password)"

labRouter.sh -i
labRouter.sh -s
```

## Mesh Netowrk

```bash
wpad-openssl
```

Mesh Config:

/etc/config/network

```bash
config device
        option name 'br-default'
        option type 'bridge'
        list ports 'eth0.1'
        list ports 'bat0'

config interface 'default'
        option device 'br-default'
        option proto 'static'
        option ipaddr '192.168.10.10'
        option netmask '255.255.255.0'
        option gateway '192.168.10.1'
        option dns '192.168.10.1'

config interface 'mesh5g'
      option proto 'batadv_hardif'
      option master 'bat0'
      option mtu '1536'

config interface 'mesh2g'
      option proto 'batadv_hardif'
      option master 'bat0'
      option mtu '1536'
```

/etc/config/wireless

```bash
config wifi-iface 'wmesh5g'
      option device 'radio1'
      option network 'mesh5g'
      option mode 'mesh'
      option mesh_id 'MeshCloud'
      option encryption 'sae'
      option key 'MeshPassword123'
      option mesh_fwding '0'
      option mesh_ttl '1'
      option mcast_rate '24000'
      option disabled '0'

config wifi-iface 'wmesh2g'
      option device 'radio0'
      option network 'mesh2g'
      option mode 'mesh'
      option mesh_id 'MeshCloud'
      option encryption 'sae'
      option key 'MeshPassword123'
      option mesh_fwding '0'
      option mesh_ttl '1'
      option mcast_rate '24000'
      option disabled '0'

```

```bash
delete network.guest

network.lan=interface
network.lan.type='bridge'
network.lan.ifname='eth0.1'
network.lan.proto='static'
network.lan.netmask='255.255.255.0'
network.lan.ip6assign='60'
network.lan.hostname='GL-AR750S-8a8'
network.lan.ipaddr='192.168.8.1'
network.wan=interface
network.wan.ifname='eth0.2'
network.wan.proto='dhcp'
network.wan.hostname='GL-AR750S-8a8'
network.wan.metric='10'
network.wan.ipv6='0'
network.wan6=interface
network.wan6.ifname='eth0.2'
network.wan6.proto='dhcpv6'
network.wan6.disabled='1'
network.@switch[0]=switch
network.@switch[0].name='switch0'
network.@switch[0].reset='1'
network.@switch[0].enable_vlan='1'
network.@switch_vlan[0]=switch_vlan
network.@switch_vlan[0].device='switch0'
network.@switch_vlan[0].vlan='1'
network.@switch_vlan[0].ports='2 3 0t'
network.@switch_vlan[1]=switch_vlan
network.@switch_vlan[1].device='switch0'
network.@switch_vlan[1].vlan='2'
network.@switch_vlan[1].ports='1 0t'
network.guest=interface
network.guest.ifname='guest'
network.guest.type='bridge'
network.guest.proto='static'
network.guest.ipaddr='192.168.9.1'
network.guest.netmask='255.255.255.0'
network.guest.ip6assign='60'



uci batch << EOI
delete wireless.radio0
delete wireless.radio1
delete wireless.default_radio0
delete wireless.default_radio1
delete wireless.guest5g
delete wireless.guest2g
set wireless.radio0=wifi-device
set wireless.radio0.type='mac80211'
set wireless.radio0.channel='48'
set wireless.radio0.hwmode='11a'
set wireless.radio0.path='pci0000:00/0000:00:00.0'
set wireless.radio0.htmode='VHT80'
set wireless.radio0.doth='0'
set wireless.radio0.txpower='20'
set wireless.radio0.txpower_max='20'
set wireless.radio0.band='5G'
set wireless.radio0.disabled='0'
set wireless.radio0.noscan='0'
set wireless.radio1=wifi-device
set wireless.radio1.type='mac80211'
set wireless.radio1.channel='9'
set wireless.radio1.hwmode='11g'
set wireless.radio1.path='platform/ahb/18100000.wmac'
set wireless.radio1.txpower_max='20'
set wireless.radio1.txpower='20'
set wireless.radio1.noscan='0'
set wireless.radio1.htmode='HT40'
set wireless.radio1.band='2G'
set wireless.radio1.disabled='0'
set wireless.default_radio0=wifi-iface
set wireless.default_radio0.device='radio0'
set wireless.default_radio0.network='lan'
set wireless.default_radio0.mode='mesh'
set wireless.default_radio0.mesh_id='CLG-LAB-MESH'
set wireless.default_radio0.encryption='psk2'
set wireless.default_radio0.key='WelcomeToMyLab'
set wireless.default_radio0.disassoc_low_ack='0'
set wireless.default_radio0.ifname='wlan0'
set wireless.default_radio0.mesh_fwding=0
set wireless.default_radio0.mesh_ttl=1
set wireless.default_radio0.mcast_rate=24000
set wireless.default_radio1=wifi-iface
set wireless.default_radio1.device='radio1'
set wireless.default_radio1.network='lan'
set wireless.default_radio1.mode='mesh'
set wireless.default_radio1.mesh_id='CLG-LAB-MESH'
set wireless.default_radio1.encryption='psk2'
set wireless.default_radio1.key='WelcomeToMyLab'
set wireless.default_radio1.disassoc_low_ack='0'
set wireless.default_radio1.ifname='wlan1'
set wireless.default_radio1.mesh_fwding=0
set wireless.default_radio1.mesh_ttl=1
set wireless.default_radio1.mcast_rate=24000
EOI





wireless.radio0=wifi-device
wireless.radio0.type='mac80211'
wireless.radio0.channel='36'
wireless.radio0.hwmode='11a'
wireless.radio0.path='pci0000:00/0000:00:00.0'
wireless.radio0.htmode='VHT80'
wireless.radio0.doth='0'
wireless.radio0.txpower='20'
wireless.radio0.txpower_max='20'
wireless.radio0.band='5G'
wireless.radio0.disabled='0'
wireless.radio0.noscan='0'
wireless.radio1=wifi-device
wireless.radio1.type='mac80211'
wireless.radio1.channel='9'
wireless.radio1.hwmode='11g'
wireless.radio1.path='platform/ahb/18100000.wmac'
wireless.radio1.txpower_max='20'
wireless.radio1.txpower='20'
wireless.radio1.htmode='HT40'
wireless.radio1.band='2G'
wireless.default_radio0=wifi-iface
wireless.default_radio0.device='radio0'
wireless.default_radio0.network='lan'
wireless.default_radio0.mode='mesh'
wireless.default_radio0.mesh_id='CLG-LAB-MESH'
wireless.default_radio0.encryption='psk2'
wireless.default_radio0.key='WelcomeToMyLab'
wireless.default_radio0.disassoc_low_ack='0'
wireless.default_radio0.ifname='wlan0'
wireless.default_radio0.mesh_fwding='0'
wireless.default_radio0.mesh_ttl='1'
wireless.default_radio0.mcast_rate='24000'
wireless.default_radio1=wifi-iface
wireless.default_radio1.device='radio1'
wireless.default_radio1.network='lan'
wireless.default_radio1.mode='mesh'
wireless.default_radio1.mesh_id='CLG-LAB-MESH'
wireless.default_radio1.encryption='psk2'
wireless.default_radio1.key='WelcomeToMyLab'
wireless.default_radio1.disassoc_low_ack='0'
wireless.default_radio1.ifname='wlan1'
wireless.default_radio1.mesh_fwding='0'
wireless.default_radio1.mesh_ttl='1'
wireless.default_radio1.mcast_rate='24000'
wireless.wifinet2=wifi-iface
wireless.wifinet2.ssid='CLG-LAB-M'
wireless.wifinet2.encryption='psk2'
wireless.wifinet2.device='radio1'
wireless.wifinet2.mode='ap'
wireless.wifinet2.network='lan'
wireless.wifinet2.key='WelcomeToMyLab'

```

### Install K8ssandra

Label worker nodes for affinity:

```bash
for i in 0 1 2
do
  oc label nodes okd4-worker-${i}.${LAB_DOMAIN} "topology.kubernetes.io/zone=az-${i}"
done
```

```bash
cat << EOF > user-monitoring.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
  config.yaml: |
    enableUserWorkload: true
EOF

oc apply -f user-monitoring.yaml
```

```bash
helm repo add k8ssandra https://helm.k8ssandra.io/stable
helm repo update
oc new-project k8ssandra
helm install -n k8ssandra -f k8ssandra/k8ssandra.yaml k8ssandra k8ssandra/k8ssandra

# Commented out, not necessary.
# oc adm policy add-scc-to-user nonroot -z k8ssandra-cass-operator -n k8ssandra
# oc adm policy add-scc-to-user nonroot -z k8ssandra-cleaner-k8ssandra -n k8ssandra
# oc adm policy add-scc-to-user nonroot -z k8ssandra-reaper-operator -n k8ssandra
# oc adm policy add-scc-to-user nonroot -z default -n k8ssandra

# Stargate requires anyuid...  Need to fix this...
oc adm policy add-scc-to-user anyuid -z default -n k8ssandra
```

```bash
pip3 install cqlsh==6.0.0b4
```

```bash
CQL_USER=$(oc get secret k8ssandra-superuser -n k8ssandra -o jsonpath="{.data.username}" | base64 --decode)
CQL_PWD=$(oc get secret k8ssandra-superuser -n k8ssandra -o jsonpath="{.data.password}" | base64 --decode)
oc port-forward svc/k8ssandra-dc1-stargate-service 8080 8081 8082 9042 &
cqlsh -u ${CQL_USER} -p ${CQL_PWD}

cqlsh -u $(oc get secret k8ssandra-superuser -n k8ssandra -o jsonpath="{.data.username}" | base64 --decode) -p $(oc get secret k8ssandra-superuser -n k8ssandra -o jsonpath="{.data.password}" | base64 --decode)
```

## Create API Cert:

```bash
labctx
WORK_DIR=${OKD_LAB_PATH}/${CLUSTER_NAME}-${SUB_DOMAIN}-${LAB_DOMAIN}/certs
rm -rf ${WORK_DIR}
mkdir -p ${WORK_DIR}
# Create CA
openssl req -x509 -newkey rsa:4096 -sha256 -nodes -keyout ${WORK_DIR}/ca.key -out ${WORK_DIR}/ca-cert.pem -sha256 -days 3560 -subj "/C=US/ST=Virginia/L=Roanoke/O=My Lab/OU=Org/CN=${CLUSTER_NAME}.${DOMAIN}" -extensions extensions -config <(echo "[req]"; echo "distinguished_name=req" ; echo '[extensions]' ; echo 'basicConstraints=CA:TRUE' ; echo 'subjectKeyIdentifier=hash' ; echo 'authorityKeyIdentifier=keyid,issuer')
# Create CSR
openssl req -new -newkey rsa:4096 -sha256 -nodes -keyout ${WORK_DIR}/api.key -out ${WORK_DIR}/api.csr -subj "/C=US/ST=Virginia/L=Roanoke/O=My Lab/OU=Org/CN=${CLUSTER_NAME}.${DOMAIN}"
# Sign CSR
openssl x509 -req -in ${WORK_DIR}/api.csr -CA ${WORK_DIR}/ca-cert.pem -CAkey ${WORK_DIR}/ca.key -CAcreateserial -out ${WORK_DIR}/api-cert.pem -days 3560 -extensions san -extfile <(echo '[san]' ; echo "subjectAltName=DNS:api.${CLUSTER_NAME}.${DOMAIN}")
# Create Cert Bundle
cat ${WORK_DIR}/api-cert.pem ${WORK_DIR}/ca-cert.pem > ${WORK_DIR}/api.pem
# Install the Cert
oc --kubeconfig=${KUBE_INIT_CONFIG} create secret tls ${CLUSTER_NAME}-api --cert=${WORK_DIR}/api.pem --key=${WORK_DIR}/api.key -n openshift-config
oc --kubeconfig=${KUBE_INIT_CONFIG} patch apiserver cluster --type=merge -p "{\"spec\":{\"servingCerts\":{\"namedCertificates\":[{\"names\": [\"api.${CLUSTER_NAME}.${DOMAIN}\"],\"servingCertificate\":{\"name\":\"${CLUSTER_NAME}-api\"}}]}}}"
```

```bash
openssl x509 -noout -text -in /tmp/okd-api.${SUB_DOMAIN}.${LAB_DOMAIN}.crt 

sudo security add-trusted-cert -d -r trustAsRoot -k "/Library/Keychains/System.keychain" ${WORK_DIR}/ca-cert.pem
```

```bash
openssl req -x509 -newkey rsa:4096 -sha256 -nodes -keyout ${WORK_DIR}/key.pem -out ${WORK_DIR}/api-cert.pem -sha256 -days 3560 -subj "/C=US/ST=Virginia/L=Roanoke/O=My Lab/OU=Org/CN=${CLUSTER_NAME}.${DOMAIN}" -extensions san -config <(echo "[req]"; echo "distinguished_name=req" ; echo '[san]'; echo "subjectAltName=DNS:api.${CLUSTER_NAME}.${DOMAIN}")

openssl req -x509 -newkey rsa:4096 -keyout ${WORK_DIR}/key.pem -out ${WORK_DIR}/api-cert.pem -sha256 -days 1825 -subj "/C=US/ST=Virginia/L=Roanoke/O=My Lab/OU=Org" -config <(echo "[req]"; echo "distinguished_name=req" ; echo "x509_extensions=extensions ; echo '[extensions]'; echo "subjectAltName=DNS:api.${CLUSTER_NAME}.${DOMAIN}") -nodes

oc --kubeconfig=${KUBE_INIT_CONFIG} create secret tls ${CLUSTER_NAME}-api --cert=${WORK_DIR}/api-cert.pem --key=${WORK_DIR}/key.pem -n openshift-config
oc --kubeconfig=${KUBE_INIT_CONFIG} patch apiserver cluster --type=merge -p "{\"spec\":{\"servingCerts\":{\"namedCertificates\":[{\"names\": [\"api.${CLUSTER_NAME}.${DOMAIN}\"],\"servingCertificate\":{\"name\":\"${CLUSTER_NAME}-api\"}}]}}}"

```

## OpenJDK

```bash
brew install openjdk@17
sudo ln -sfn /usr/local/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

```

## Manipulate `POM` with `YQ`

```bash
mv pom.xml pom.xml.orig
yq -p=xml '.project.properties += {"org.mapstruct.version":"1.5.2.Final","org.lombok.version":"1.18.24"}' pom.xml.orig | yq '.project.dependencies.dependency += [{"groupId":"org.projectlombok","artifactId":"lombok","version":"${org.lombok.version}"},{"groupId":"org.mapstruct","artifactId":"mapstruct","version":"${org.mapstruct.version}"},{"groupId":"org.mapstruct","artifactId":"mapstruct-processor","version":"${org.mapstruct.version}"}]' | yq -o=xml > pom.xml
```

```bash
function addProperty() {

  for i in "$@"
    do
      case $i in
        -p=*|--property=*)
          PROPERTY="${i#*=}"
        ;;
        -v=*|--value=*)
          VALUE="${i#*=}"
        ;;
      esac
    done

    mv pom.xml pom.xml.orig
    yq -p=xml ".project.properties += {\"${PROPERTY}\":\"${VALUE}\"}" pom.xml.orig | yq -o=xml > pom.xml
}

function addDependency() {
  for i in "$@"
  do
    case $i in
      -g=*|--groupid=*)
        GROUP_ID="${i#*=}"
      ;;
      -a=*|--artifactid=*)
        ARTIFACT_ID="${i#*=}"
      ;;
      -v=*|--version=*)
        VERSION="${i#*=}"
      ;;
    esac
  done
  mv pom.xml pom.xml.orig
  yq -p=xml ".project.dependencies.dependency += [{\"groupId\":\"${GROUP_ID}\",\"artifactId\":\"${ARTIFACT_ID}\",\"version\":\"${VERSION}\"}]' pom.xml.orig | yq -o=xml > pom.xml
}
```

## NanoPi Router

```bash


opkg update
opkg install losetup resize2fs
BOOT="$(sed -n -e "/\s\/boot\s.*$/{s///p;q}" /etc/mtab)"
DISK="${BOOT%%[0-9]*}"
PART="$((${BOOT##*[^0-9]}+1))"
ROOT="${DISK}${PART}"
LOOP="$(losetup -f)"
losetup ${LOOP} ${ROOT}
fsck.ext4 -y ${LOOP}
resize2fs ${LOOP}
reboot
```

## Install Pi

```bash
OPENWRT_VER=$(yq e ".openwrt-version" ${LAB_CONFIG_FILE})
wget https://downloads.openwrt.org/releases/${OPENWRT_VER}/targets/bcm27xx/bcm2711/openwrt-${OPENWRT_VER}-bcm27xx-bcm2711-rpi-4-ext4-factory.img.gz -O /tmp/openwrt.img.gz
gunzip /tmp/openwrt.img.gz
sudo dd if=/tmp/openwrt.img of=/dev/disk2 bs=4M conv=fsync
diskutil eject /dev/disk2

```

## Build Pipelines from Source

```bash
git clone https://github.com/tektoncd/operator.git
cd operator
git checkout v0.61.x
podman machine init
podman machine start
export LOCAL_REGISTRY=$(oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}')
export KO_DOCKER_REPO=${LOCAL_REGISTRY}/tekton
make KO_BIN=$(which ko) KUSTOMIZE_BIN=$(which kustomize) make TARGET=openshift apply
make KO_BIN=$(which ko) KUSTOMIZE_BIN=$(which kustomize) CR=config/all apply-cr
```

## CRC Work-around

```bash
export SSH_KEY=${HOME}/.crc/machines/crc/id_ecdsa
ssh -i ${SSH_KEY} -p 2222 core@127.0.0.1 'sudo auditctl -b 16384'
ssh -i ${SSH_KEY} -p 2222 core@127.0.0.1 'sudo sed -i "s|-b 8192|-b 16384|g" /etc/audit/rules.d/audit.rules'
ssh -i ${SSH_KEY} -p 2222 core@127.0.0.1 'sudo setenforce 0'
ssh -i ${SSH_KEY} -p 2222 core@127.0.0.1 'sudo sed -i "s|SELINUX=enforcing|SELINUX=disabled|g" /etc/sysconfig/selinux'
```

```bash
oc delete pod routes-controller -n openshift-ingress
export SSH_KEY=${HOME}/.crc/machines/crc/id_ecdsa   
ssh -i ${SSH_KEY} -p 2222 core@127.0.0.1 "sudo podman image rm quay.io/crcont/routes-controller:latest"
cat << EOF | oc apply -n openshift-ingress -f -
{"kind":"Pod","apiVersion":"v1","metadata":{"name":"routes-controller","namespace":"openshift-ingress","creationTimestamp":null},"spec":{"containers":[{"name":"routes-controller","image":"quay.io/crcont/routes-controller:latest","resources":{},"imagePullPolicy":"IfNotPresent"}],"serviceAccountName":"router"},"status":{}}
EOF
```

## Rotate Certs:

labctx
labenv -k

oc delete secrets/csr-signer-signer secrets/csr-signer -n openshift-kube-controller-manager-operator

for i in $(oc get nodes | grep -v NAME | cut -d" " -f1)
do
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@${i} -- sudo rm -fr /var/lib/kubelet/pki
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@${i} -- sudo rm -fr /var/lib/kubelet/kubeconfig
  ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null core@${i} -- sudo systemctl restart kubelet
done

labcli --csr

./oc get csr
./oc get csr '-ojsonpath={.items[*].metadata.name}' | xargs ./oc adm certificate approve

## Use project template to automatically apply limat-ranges and quotas

### If quotas are define, then requests and limits MUST be define.  The pod will be rejected otherwise.

### ClusterResourceQuota can apply across multiple projects

```bash
oc create clusterresourcequota my-cluster-resource-quota --project-label-selector=org=myorg --hard=pods=10 --hard=secrets=20
```

### Quota Example:

```yaml
echo '---
apiVersion: v1
kind: ResourceQuota
metadata:
  name: test-quota
spec:
  hard:
    requests.memory: 512Mi
    requests.cpu: "1"
    pods: "3"
    services: "5"
    replicationcontrollers: "5"
    resourcequotas: "1"' | oc create -n resourcemanagement -f - 
```

### Limit Range Example:

```yaml
echo '---
kind: LimitRange
apiVersion: v1
metadata:
  name: limits
spec:
  limits:
  - type: Pod
    max:
      cpu: 1
      memory: 1.5Gi
    min:
      cpu: 100m
      memory: 50Mi
  - type: Container
    max:
      cpu: 500m
      memory: 750Mi
    min:
      cpu: 100m
      memory: 50Mi
    default:
      cpu: 200m
      memory: 100Mi' | oc create -n resourcemanagement -f - 
```

### Create a project request template:

```bash
oc adm create-bootstrap-project-template -o yaml > $HOME/project_request_template.yaml
```

### Add the following to the objects list:

```yaml
- apiVersion: "v1"
  kind: "LimitRange"
  metadata:
    name: "core-resource-limits"
  spec:
    limits:
      - type: "Pod"
        max:
          cpu: "1"
          memory: "1Gi"
        min:
          cpu: "200m"
          memory: "6Mi"
      - type: "Container"
        max:
          cpu: "1"
          memory: "1Gi"
        min:
          cpu: "100m"
          memory: "4Mi"
        default:
          cpu: "300m"
          memory: "200Mi"
        defaultRequest:
          cpu: "200m"
          memory: "100Mi"
        maxLimitRequestRatio:
          cpu: "10"
- apiVersion: v1
  kind: ResourceQuota
  metadata:
    name: default-quota
  spec:
    hard:
      pods: "4"
      requests.cpu: "1"
      requests.memory: 1Gi
      limits.cpu: "2"
      limits.memory: 2Gi
      persistentvolumeclaims: "10"
      services: "100"
      services.loadbalancers: "5"
```

### Create the template:

```bash
oc create -f $HOME/project_request_template.yaml -n openshift-config
```

### Add the template to project requests

```bash
oc get projects.config.openshift.io -o yaml
```

## Create a new Kubeconfig

```bash
#!/bin/bash

KUBECONFIG_USER="okdadmin"
KUBECONFIG_FILE="newkubeconfig"
WORK_DIR=$(mktemp -d)

openssl req -new -newkey rsa:4096 -nodes -keyout ${WORK_DIR}/${KUBECONFIG_USER}.key -out ${WORK_DIR}/${KUBECONFIG_USER}.csr -subj "/CN=okd:admin"
oc delete csr ${KUBECONFIG_USER}-kubeconfig

cat << EOF | oc create -f -
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: ${KUBECONFIG_USER}-kubeconfig
spec:
  signerName: kubernetes.io/kube-apiserver-client
  groups:
  - system:authenticated
  request: $(cat ${WORK_DIR}/${KUBECONFIG_USER}.csr | base64 | tr -d '\n')
  usages:
  - client auth
EOF

oc adm certificate approve ${KUBECONFIG_USER}-kubeconfig
```

```bash
oc get csr ${KUBECONFIG_USER}-kubeconfig -o jsonpath='{.status.certificate}' | base64 -d > ${WORK_DIR}/${KUBECONFIG_USER}-kubeconfig.crt
oc config set-credentials okd:admin --client-certificate=${WORK_DIR}/${KUBECONFIG_USER}-kubeconfig.crt --client-key=${WORK_DIR}/${KUBECONFIG_USER}.key --embed-certs --kubeconfig=${WORK_DIR}/${KUBECONFIG_FILE}
oc config set-context okd:admin --cluster=$(oc config view -o jsonpath='{.clusters[0].name}') --namespace=default --user=okd:admin --kubeconfig=${WORK_DIR}/${KUBECONFIG_FILE}

oc -n openshift-authentication rsh `oc get pods -n openshift-authentication -o name | head -1` cat /run/secrets/kubernetes.io/serviceaccount/ca.crt > ${WORK_DIR}/ingress-ca.crt
oc config set-cluster $(oc config view -o jsonpath='{.clusters[0].name}') --server=$(oc config view -o jsonpath='{.clusters[0].cluster.server}') --certificate-authority=${WORK_DIR}/ingress-ca.crt --kubeconfig=${WORK_DIR}/${KUBECONFIG_FILE} --embed-certs
oc config use-context okd:admin --kubeconfig=${WORK_DIR}/${KUBECONFIG_FILE}
```

```bash
oc get pod --all-namespaces --kubeconfig=${WORK_DIR}/${KUBECONFIG_FILE}
```

### What role bindings does a user have

```bash
oc get rolebindings -n test -o json | jq '.items[] | select(.subjects[].name=="cgruver" and .subjects[].kind=="User") | .roleRef.name'
```

```bash
mc_version=$(oc get clusterversion.config.openshift.io/version -o jsonpath='{.status.desired.version}' | cut -d"-" -f1)
cat << EOF | butane 
variant: openshift
version: ${mc_version}
metadata:
  labels:
    machineconfiguration.openshift.io/role: master
  name: config-bip
openshift:
  kernel_arguments:
    should_exist:
      - mitigations=off
    should_not_exist:
      - mitigations=auto,nosmt
EOF
```

```bash
ssh core@10.11.12.72 "sudo rm -rf /var/lib/cni/bin/rhel9 && sudo rm -rf /var/lib/cni/bin/rhel8"
```
