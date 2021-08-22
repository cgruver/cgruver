---
title: Build Code Ready Containers - With OKD
layout: page
permalink: /home-lab/okd-crc/
description: How to build Code Ready Containers for OKD
tags:
  - crc for okd
---
## This Page Is A Work In Progress

Stay tuned for full instructions

### One time setup

```bash
dnf -y module install virt
dnf -y install jq golang-bin gcc-c++ golang make zip wget git bash-completion libguestfs-tools virt-install
dnf -y update
reboot

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

mkdir -p ${HOME}/bin

cat << FOE > ${HOME}/bin/sncSetup.sh
export OKD_VERSION=\$1
export CRC_DIR=${HOME}/crc-build
export PATH=${HOME}/crc-build/snc/openshift-clients/linux/:\${PATH}
export OPENSHIFT_PULL_SECRET_PATH="\${CRC_DIR}/pull_secret.json"
export BUNDLE_VERSION=\${OKD_VERSION}
export BUNDLE_DIR=\${CRC_DIR}/snc
export OKD_BUILD=true
export SNC_GENERATE_MACOS_BUNDLE=true
export SNC_GENERATE_WINDOWS_BUNDLE=true
export TF_VAR_libvirt_bootstrap_memory=16384
export LIBGUESTFS_BACKEND=direct
export KUBECONFIG=\${CRC_DIR}/snc/crc-tmp-install-data/auth/kubeconfig
export OC=\${CRC_DIR}/snc/openshift-clients/linux/oc
cat << EOF > \${CRC_DIR}/pull_secret.json
{"auths":{"fake":{"auth": "Zm9vOmJhcgo="}}}
EOF
FOE

chmod 700 ${HOME}/bin/sncSetup.sh

mkdir ${HOME}/crc-build
cd ${HOME}/crc-build

git clone https://github.com/code-ready/crc
git clone https://github.com/code-ready/snc
```

### Build SNC:

```bash
. sncSetup.sh $(curl https://github.com/openshift/okd/releases/latest | cut -d"/" -f8 | cut -d\" -f1)

cd ${CRC_DIR}/snc
git fetch
git checkout 4.7
git pull
./snc.sh

# Watch progress:
export KUBECONFIG=${CRC_DIR}/snc/crc-tmp-install-data/auth/kubeconfig 
oc get pods --all-namespaces

# Rotate Certs:
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i id_ecdsa_crc core@api.crc.testing -- sudo openssl x509 -checkend 2160000 -noout -in /var/lib/kubelet/pki/kubelet-client-current.pem

oc delete secrets/csr-signer-signer secrets/csr-signer -n openshift-kube-controller-manager-operator
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i id_ecdsa_crc core@api.crc.testing -- sudo rm -fr /var/lib/kubelet/pki
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i id_ecdsa_crc core@api.crc.testing -- sudo rm -fr /var/lib/kubelet/kubeconfig
ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i id_ecdsa_crc core@api.crc.testing -- sudo systemctl restart kubelet

oc get csr
oc get csr '-ojsonpath={.items[*].metadata.name}' | xargs oc adm certificate approve

ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -i id_ecdsa_crc core@api.crc.testing -- sudo openssl x509 -checkend 2160000 -noout -in /var/lib/kubelet/pki/kubelet-client-current.pem

# Clean up Ingress:

oc get pods --all-namespaces | grep NodeAffinity | while read i
do
    NS=$(echo ${i} | cut -d" " -f1 )
    POD=$(echo ${i} | cut -d" " -f2 )
    oc delete pod ${POD} -n ${NS}
done

oc get pods --all-namespaces | grep CrashLoop | while read i
do
    NS=$(echo ${i} | cut -d" " -f1 )
    POD=$(echo ${i} | cut -d" " -f2 )
    oc delete pod ${POD} -n ${NS}
done

oc delete pod --field-selector=status.phase==Succeeded --all-namespaces

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
