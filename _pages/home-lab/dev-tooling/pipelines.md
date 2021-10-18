---
title: Tekton Pipelines
sitemap: false
published: false
---

```bash
mkdir ${OKD_LAB_PATH}/work-dir
cd ${OKD_LAB_PATH}/work-dir
curl -s https://cgruver:@api.github.com/orgs/lab-monkeys/repos | jq ".[].clone_url" | xargs -n 1 git clone --mirror
for i in $(ls)
do
  cd ${i}
  git remote set-url --push origin https://gitea.${LAB_DOMAIN}:3000/home-library/${i}
  git push --mirror
  cd ..
done
cd
rm -rf ${OKD_LAB_PATH}/work-dir
```

```bash

GITEA_CERT=$(openssl s_client -showcerts -connect gitea.${LAB_DOMAIN}:3000 </dev/null 2>/dev/null|openssl x509 -outform PEM | base64)

NEXUS_CERT=$(openssl s_client -showcerts -connect nexus.${LAB_DOMAIN}:8443 </dev/null 2>/dev/null|openssl x509 -outform PEM | base64)

cat << EOF | oc apply -f -
apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  labels:
    machineconfiguration.openshift.io/role: worker
  name: 50-developer-ca-certs
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
