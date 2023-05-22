# SNO Notes

```bash
git clone https://github.com/kubevirt/hostpath-provisioner-operator.git
git checkout release-v0.15

oc create -f https://github.com/cert-manager/cert-manager/releases/download/v1.8.0/cert-manager.yaml
oc wait --for=condition=Available -n cert-manager --timeout=120s --all deployments
oc create -f https://raw.githubusercontent.com/kubevirt/hostpath-provisioner-operator/release-v0.15/deploy/namespace.yaml
oc create -f https://raw.githubusercontent.com/kubevirt/hostpath-provisioner-operator/release-v0.15/deploy/webhook.yaml -n hostpath-provisioner
oc create -f https://raw.githubusercontent.com/kubevirt/hostpath-provisioner-operator/release-v0.15/deploy/operator.yaml -n hostpath-provisioner

cat << EOF | oc apply -f -
apiVersion: hostpathprovisioner.kubevirt.io/v1beta1
kind: HostPathProvisioner
metadata:
  name: hostpath-provisioner
spec:
  imagePullPolicy: Always
  storagePools:
    - name: "local"
      path: "/var/hpvolumes"
  workload:
    nodeSelector:
      kubernetes.io/os: linux
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: hostpath-csi
  annotations:
     storageclass.kubernetes.io/is-default-class: "true"
provisioner: kubevirt.io.hostpath-provisioner
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
parameters:
  storagePool: local
EOF

cat << EOF | oc apply -f -
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: registry-pvc
  namespace: openshift-image-registry
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: hostpath-csi
EOF

oc patch configs.imageregistry.operator.openshift.io cluster --type merge --patch '{"spec":{"rolloutStrategy":"Recreate","managementState":"Managed","storage":{"pvc":{"claim":"registry-pvc"}}}}'

chectl server:deploy --platform openshift

```

```bash
cat << EOF | butane | oc apply -f -
variant: openshift
version: 4.12.0
metadata:
  labels:
    machineconfiguration.openshift.io/role: master
  name: hostpath
storage:
  disks:
  - device: /dev/nvme0n1
    wipe_table: true
    partitions:
    - label: hostpath
      number: 1
      size_mib: 0
  filesystems:
  - device: /dev/nvme0n1p1
    format: ext4
    wipe_filesystem: true
    path: /var/hostpath
    label: hostpath
EOF
```

```bash
cat << EOF | butane | oc apply -f -
variant: openshift
version: 4.12.0
metadata:
  labels:
    machineconfiguration.openshift.io/role: master
  name: patch-network
storage:
  files:
    - path: /etc/systemd/network/25-nic0.link
      mode: 0644
      contents:
        inline: |
          [Match]
          MACAddress=48:21:0b:50:b6:d7
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
          mac-address=48:21:0b:50:b6:d7

          [ipv4]
          method=manual
          addresses=10.11.12.60/24
          gateway=10.11.12.1
          dns=10.11.12.1
          dns-search=my.awesome.lab
    - path: /etc/hostname
      mode: 0420
      overwrite: true
      contents:
        inline: |
          okd4-sno-1-node
    - path: /etc/chrony.conf
      mode: 0644
      overwrite: true
      contents:
        inline: |
          pool 10.11.12.1 iburst 
          driftfile /var/lib/chrony/drift
          makestep 1.0 3
          rtcsync
          logdir /var/log/chrony
EOF
```

```bash
cat << EOF | butane | oc apply -f -
variant: openshift
version: 4.12.0
metadata:
  labels:
    machineconfiguration.openshift.io/role: master
  name: hostpath
systemd:
  units:
  - contents: |
      [Unit]
      Description=Make File System on /dev/nvme0n1
      DefaultDependencies=no
      BindsTo=dev-nvme0n1.device
      After=dev-nvme0n1.device var.mount
      Before=systemd-fsck@dev-nvme0n1.service

      [Service]
      Type=oneshot
      RemainAfterExit=yes
      ExecStart=/usr/lib/systemd/systemd-makefs ext4 /dev/nvme0n1
      TimeoutSec=0

      [Install]
      WantedBy=hostpath.mount
    enabled: true
    name: systemd-mkfs@dev-nvme0n1.service
  - contents: |
      [Unit]
      Description=Mount /dev/nvme0n1 to /var/hostpath
      Before=local-fs.target
      Requires=systemd-mkfs@dev-nvme0n1.service
      After=systemd-mkfs@dev-nvme0n1.service

      [Mount]
      What=/dev/nvme0n1
      Where=/var/hostpath
      Type=ext4
      Options=defaults

      [Install]
      WantedBy=local-fs.target
    enabled: true
    name: var-hostpath.mount
EOF
```

```bash
cat << EOF | butane | oc apply -f -
variant: openshift
version: 4.12.0
metadata:
  labels:
    machineconfiguration.openshift.io/role: master
  name: hostpath-fix
systemd:
  units:
  - contents: |
      [Unit]
      Description=Make File System on /dev/nvme0n1
      DefaultDependencies=no
      BindsTo=dev-nvme0n1.device
      After=dev-nvme0n1.device var.mount
      Before=systemd-fsck@dev-nvme0n1.service

      [Service]
      Type=oneshot
      RemainAfterExit=yes
      ExecStart=-/bin/bash -c "/usr/bin/mkdir /var/hostpath"
      TimeoutSec=0

      [Install]
      WantedBy=hostpath.mount
    enabled: true
    name: systemd-mkdir@dev-nvme0n1.service
EOF
```

```bash
CERT_MGR_VER=$(basename $(curl -Ls -o /dev/null -w %{url_effective} https://github.com/cert-manager/cert-manager/releases/latest))
HPP_VER=$(basename $(curl -Ls -o /dev/null -w %{url_effective} https://github.com/kubevirt/hostpath-provisioner-operator/releases/latest))
oc create -f https://github.com/cert-manager/cert-manager/releases/download/${CERT_MGR_VER}/cert-manager.yaml
oc wait --for=condition=Available -n cert-manager --timeout=120s --all deployments
oc create -f https://github.com/kubevirt/hostpath-provisioner-operator/releases/download/${HPP_VER}/namespace.yaml
oc create -f https://github.com/kubevirt/hostpath-provisioner-operator/releases/download/${HPP_VER}/webhook.yaml -n hostpath-provisioner
oc create -f https://github.com/kubevirt/hostpath-provisioner-operator/releases/download/${HPP_VER}/operator.yaml -n hostpath-provisioner
oc wait --for=condition=Available -n hostpath-provisioner --timeout=120s --all deployments

cat << EOF | oc apply -f -
apiVersion: hostpathprovisioner.kubevirt.io/v1beta1
kind: HostPathProvisioner
metadata:
  name: hostpath-provisioner
spec:
  imagePullPolicy: Always
  storagePools:
    - name: "local"
      path: "/var/hostpath"
  workload:
    nodeSelector:
      kubernetes.io/os: linux
---
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: hostpath-csi
  annotations:
    storageclass.kubernetes.io/is-default-class: "true"
provisioner: kubevirt.io.hostpath-provisioner
reclaimPolicy: Delete
volumeBindingMode: WaitForFirstConsumer
parameters:
  storagePool: local
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: registry-pvc
  namespace: openshift-image-registry
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 100Gi
  storageClassName: hostpath-csi
EOF

oc patch configs.imageregistry.operator.openshift.io cluster --type merge --patch '{"spec":{"rolloutStrategy":"Recreate","managementState":"Managed","storage":{"pvc":{"claim":"registry-pvc"}}}}'
```
