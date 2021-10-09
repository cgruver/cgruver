---
title: Update Cluster
sitemap: false
published: false
description: "How to Update your OpenShift/OKD cluster on a Disconnected Network"
---

```bash
${OKD_LAB_PATH}/bin/getOkdCmds.sh
```

```bash
${OKD_LAB_PATH}/bin/mirrorOkdRelease.sh
```

```bash
OKD_RELEASE=$(oc version --client=true | cut -d" " -f3)
cat << EOF | oc apply -f -
apiVersion: operator.openshift.io/v1alpha1
kind: ImageContentSourcePolicy
metadata:
  name: okd-mirror-${OKD_RELEASE}
spec:
  repositoryDigestMirrors:
  - mirrors:
    - nexus.my.awesome.lab:5001/${OKD_RELEASE}
    source: quay.io/openshift/okd
  - mirrors:
    - nexus.my.awesome.lab:5001/${OKD_RELEASE}
    source: quay.io/openshift/okd-content
EOF
```
