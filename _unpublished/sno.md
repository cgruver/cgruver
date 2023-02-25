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
