---
title: "Quarkus for Architects who Sometimes Write Code - Being Persistent"
date:   2022-09-10 00:00:00 -0400
description: "Blog Series on writing Cloud Native Applications for OpenShift / Kubernetes with Quarkus - Cassandra and JSON"
tags:
  - OpenShift
  - Kubernetes
  - Quarkus Cassandra Stargate Example
  - Quarkus Mapstruct
  - Quarkus Lombok
categories:
  - Blog Post
  - Quarkus Series
---
## Install and Configure OpenShift Local

```bash
openssl s_client -showcerts -connect console-openshift-console.apps-crc.testing:443 </dev/null 2>/dev/null|openssl x509 -outform PEM > /tmp/crc-cert
sudo security add-trusted-cert -d -r trustAsRoot -k "/Library/Keychains/System.keychain" /tmp/crc-cert
```

```bash
eval $(crc podman-env)
```

```bash
crc console --credentials
```

```bash
To login as a regular user, run 'oc login -u developer -p developer https://api.crc.testing:6443'.
To login as an admin, run 'oc login -u kubeadmin -p FkIy7-LFYXG-PvYFZ-Ppp2G https://api.crc.testing:6443'
```

```bash
oc login -u kubeadmin -p FkIy7-LFYXG-PvYFZ-Ppp2G https://api.crc.testing:6443
```

## Install Cassandra and Stargate

```bash
export K8SSANDRA_WORKDIR=${HOME}/okd-lab/quarkus-projects/k8ssandra-work-dir
mkdir -p ${K8SSANDRA_WORKDIR}/cert-manager-install
mkdir ${K8SSANDRA_WORKDIR}/tmp

git clone https://github.com/cgruver/k8ssandra-blog-resources.git ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources
```

## Copy Images to Local Registry

```bash
export PUSH_REGISTRY=$(oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}')
export PULL_REGISTRY="image-registry.openshift-image-registry.svc:5000"

eval $(crc podman-env)

podman login -u $(oc whoami) -p $(oc whoami -t) --tls-verify=false ${PUSH_REGISTRY}

. ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/versions.sh
envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/images.yaml > ${K8SSANDRA_WORKDIR}/images.yaml
IMAGE_YAML=${K8SSANDRA_WORKDIR}/images.yaml
image_count=$(yq e ".images" ${IMAGE_YAML} | yq e 'length' -)
let image_index=0
while [[ image_index -lt ${image_count} ]]
do
  image_name=$(yq e ".images.[${image_index}].name" ${IMAGE_YAML})
  source_registry=$(yq e ".images.[${image_index}].source-registry" ${IMAGE_YAML})
  target_registry=$(yq e ".images.[${image_index}].target-registry" ${IMAGE_YAML})
  image_version=$(yq e ".images.[${image_index}].version" ${IMAGE_YAML})
  podman pull ${source_registry}/${image_name}:${image_version}
  podman tag ${source_registry}/${image_name}:${image_version} ${target_registry}/${image_name}:${image_version}
  podman push --tls-verify=false ${target_registry}/${image_name}:${image_version}
  image_index=$(( ${image_index} + 1 ))
done
```

## Install Cert Manager

```bash
wget -O ${K8SSANDRA_WORKDIR}/tmp/cert-manager.yaml https://github.com/jetstack/cert-manager/releases/download/${CERT_MGR_VER}/cert-manager.yaml

envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/cert-manager-kustomization.yaml > ${K8SSANDRA_WORKDIR}/tmp/kustomization.yaml

kustomize build ${K8SSANDRA_WORKDIR}/tmp > ${K8SSANDRA_WORKDIR}/cert-manager-install.yaml

oc apply -f ${K8SSANDRA_WORKDIR}/cert-manager-install.yaml
```

### Install K8ssandra Operator

```bash
export DEPLOY_TYPE=control-plane
envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/k8ssandra-kustomization.yaml > ${K8SSANDRA_WORKDIR}/tmp/kustomization.yaml
kustomize build ${K8SSANDRA_WORKDIR}/tmp > ${K8SSANDRA_WORKDIR}/k8ssandra-${DEPLOY_TYPE}.yaml
oc create -f ${K8SSANDRA_WORKDIR}/k8ssandra-control-plane.yaml

oc -n k8ssandra-operator patch role k8ssandra-operator --type=json -p='[{"op": "add", "path": "/rules/-", "value": {"apiGroups": [""],"resources": ["endpoints/restricted"],"verbs": ["create"]} }]'
oc -n k8ssandra-operator adm policy add-scc-to-user anyuid -z default 

oc -n k8ssandra-operator scale deployment cass-operator-controller-manager --replicas=0
oc -n k8ssandra-operator scale deployment k8ssandra-operator --replicas=0
oc -n k8ssandra-operator patch configmap cass-operator-manager-config --patch="$(envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/cass-config-patch.yaml)"
oc -n k8ssandra-operator scale deployment cass-operator-controller-manager --replicas=1
oc -n k8ssandra-operator scale deployment k8ssandra-operator --replicas=1
```

```bash
cat << EOF | oc apply -f -
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: k8ssandra-sc
provisioner: no-provisioning 
reclaimPolicy: Retain
volumeBindingMode: WaitForFirstConsumer
EOF
```

```bash
oc delete pv pv0030
```

```bash
cat << EOF | oc apply -f -
apiVersion: v1
kind: PersistentVolume
metadata:
  labels:
    app: k8ssandra-cluster
  name: k8ssandra-cluster-0
spec:
  accessModes:
  - ReadWriteOnce
  - ReadWriteMany
  - ReadOnlyMany
  capacity:
    storage: 100Gi
  hostPath:
    path: /mnt/pv-data/pv0030
    type: ""
  persistentVolumeReclaimPolicy: Retain
  storageClassName: k8ssandra-sc
  claimRef:
    name: server-data-k8ssandra-cluster-dc1-default-sts-0
    namespace: k8ssandra-operator
EOF
```

```bash
export SSH_KEY=${HOME}/.crc/machines/crc/id_ecdsa
ssh -i ${SSH_KEY} -p 2222 core@127.0.0.1 "sudo chown 999:999 /mnt/pv-data/pv0030"
```

## Deploy Cluster

```bash
labctx cp
envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/k8ssandra-cluster.yaml | oc -n k8ssandra-operator apply -f -
```

## Expose Stargate Services:

```bash
oc -n k8ssandra-operator create route edge sg-graphql --service=k8ssandra-cluster-${i}-stargate-service --port=8080
oc -n k8ssandra-operator create route edge sg-auth --service=k8ssandra-cluster-${i}-stargate-service --port=8081
oc -n k8ssandra-operator create route edge sg-rest --service=k8ssandra-cluster-${i}-stargate-service --port=8082
```

## Connect To the Cluster

```bash
POD_NAME=$(oc -n k8ssandra-operator get statefulsets --selector app.kubernetes.io/name=cassandra -o jsonpath='{.items[0].metadata.name}')-0
oc -n k8ssandra-operator port-forward ${POD_NAME} 9042

CLUSTER_INIT_USER=$(oc -n k8ssandra-operator get secret k8ssandra-cluster-superuser -o jsonpath="{.data.username}" | base64 -d)
CLUSTER_INIT_PWD=$(oc -n k8ssandra-operator get secret k8ssandra-cluster-superuser -o jsonpath="{.data.password}" | base64 -d)

oc -n k8ssandra-operator port-forward svc/k8ssandra-cluster-dc1-stargate-service 9042

cqlsh -u ${CLUSTER_INIT_USER} -p ${CLUSTER_INIT_PWD} -e CREATE ROLE IF NOT EXISTS book-catalog
```

[https://docs.datastax.com/en/astra-serverless/docs/develop/tooling.html#postman-resources](https://docs.datastax.com/en/astra-serverless/docs/develop/tooling.html#postman-resources)

[https://docs.datastax.com/en/astra-serverless/docs/quickstart/qs-rest.html](https://docs.datastax.com/en/astra-serverless/docs/quickstart/qs-rest.html)

```bash

cd ${HOME}/okd-lab/quarkus-projects
code --create -a=book_catalog -g=fun.is.quarkus
cd ${HOME}/okd-lab/quarkus-projects/book_catalog
code --dependency -g=org.mapstruct -a=mapstruct -v=1.5.2.Final
code --dependency -g=org.mapstruct -a=mapstruct-processor -v=1.5.2.Final
code --dependency -g=org.projectlombok -a=lombok -v=1.18.24
code --dependency -g=org.projectlombok -a=lombok-mapstruct-binding -v=0.2.0
```

[https://openlibrary.org/dev/docs/api/books](https://openlibrary.org/dev/docs/api/books)

```bash
curl 'https://openlibrary.org/api/books?bibkeys=0575043636&format=json&jscmd=data' | jq
```

```json
{
  "0575043636": {
    "url": "https://openlibrary.org/books/OL1614567M/Wyrd_sisters",
    "key": "/books/OL1614567M",
    "title": "Wyrd sisters",
    "subtitle": "starring three witches, also kings, daggers, crowns ...",
    "authors": [
      {
        "url": "https://openlibrary.org/authors/OL25712A/Terry_Pratchett",
        "name": "Terry Pratchett"
      },
      {
        "url": "https://openlibrary.org/authors/OL4929687A/Joanne_Harris",
        "name": "Joanne Harris"
      },
      {
        "url": "https://openlibrary.org/authors/OL5196765A/Stephen_Briggs",
        "name": "Stephen Briggs"
      },
      {
        "url": "https://openlibrary.org/authors/OL7311709A/Celia_Imrie",
        "name": "Celia Imrie"
      }
    ],
    "number_of_pages": 251,
    "pagination": "251 p. ;",
    "by_statement": "by Terry Pratchett.",
    "identifiers": {
      "goodreads": [
        "364526"
      ],
      "librarything": [
        "1044878"
      ],
      "isbn_10": [
        "0575043636"
      ],
      "lccn": [
        "91155583"
      ],
      "oclc": [
        "21874666"
      ],
      "openlibrary": [
        "OL1614567M"
      ]
    },
    "classifications": {
      "lc_classifications": [
        "PR6066.R34 W97 1988",
        "PR6066.R34 W97 1989"
      ],
      "dewey_decimal_class": [
        "823/.914"
      ]
    },
    "publishers": [
      {
        "name": "V. Gollancz"
      }
    ],
    "publish_places": [
      {
        "name": "London"
      }
    ],
    "publish_date": "1988",
    "subjects": [
      {
        "name": "Fiction, fantasy, general",
        "url": "https://openlibrary.org/subjects/fiction,_fantasy,_general"
      },
      {
        "name": "Discworld (imaginary place), fiction",
        "url": "https://openlibrary.org/subjects/discworld_(imaginary_place),_fiction"
      },
      {
        "name": "Granny weatherwax (fictitious character), fiction",
        "url": "https://openlibrary.org/subjects/granny_weatherwax_(fictitious_character),_fiction"
      },
      {
        "name": "Fiction",
        "url": "https://openlibrary.org/subjects/fiction"
      },
      {
        "name": "Discworld (Imaginary place)",
        "url": "https://openlibrary.org/subjects/discworld_(imaginary_place)"
      },
      {
        "name": "Occult fiction",
        "url": "https://openlibrary.org/subjects/occult_fiction"
      },
      {
        "name": "Witches",
        "url": "https://openlibrary.org/subjects/witches"
      },
      {
        "name": "Fantasy",
        "url": "https://openlibrary.org/subjects/fantasy"
      },
      {
        "name": "MacBeth",
        "url": "https://openlibrary.org/subjects/macbeth"
      },
      {
        "name": "satire",
        "url": "https://openlibrary.org/subjects/satire"
      },
      {
        "name": "humor",
        "url": "https://openlibrary.org/subjects/humor"
      },
      {
        "name": "kingdom",
        "url": "https://openlibrary.org/subjects/kingdom"
      },
      {
        "name": "Fantasy fiction",
        "url": "https://openlibrary.org/subjects/fantasy_fiction"
      },
      {
        "name": "Fiction, humorous",
        "url": "https://openlibrary.org/subjects/fiction,_humorous"
      },
      {
        "name": "Fiction, humorous, general",
        "url": "https://openlibrary.org/subjects/fiction,_humorous,_general"
      },
      {
        "name": "Literature and fiction, fantasy",
        "url": "https://openlibrary.org/subjects/literature_and_fiction,_fantasy"
      },
      {
        "name": "Fiction, science fiction, general",
        "url": "https://openlibrary.org/subjects/fiction,_science_fiction,_general"
      },
      {
        "name": "English Fantasy fiction",
        "url": "https://openlibrary.org/subjects/english_fantasy_fiction"
      },
      {
        "name": "Translations into Turkish",
        "url": "https://openlibrary.org/subjects/translations_into_turkish"
      },
      {
        "name": "Turkish Fantasy fiction",
        "url": "https://openlibrary.org/subjects/turkish_fantasy_fiction"
      },
      {
        "name": "Translations from English",
        "url": "https://openlibrary.org/subjects/translations_from_english"
      },
      {
        "name": "Disque-monde (Lieu imaginaire)",
        "url": "https://openlibrary.org/subjects/disque-monde_(lieu_imaginaire)"
      },
      {
        "name": "Romans, nouvelles",
        "url": "https://openlibrary.org/subjects/romans,_nouvelles"
      },
      {
        "name": "Sorcières",
        "url": "https://openlibrary.org/subjects/sorcières"
      }
    ],
    "subject_places": [
      {
        "name": "Lancre (Imaginary place)",
        "url": "https://openlibrary.org/subjects/place:lancre_(imaginary_place)"
      },
      {
        "name": "Ankh-Morpork (Imaginary place)",
        "url": "https://openlibrary.org/subjects/place:ankh-morpork_(imaginary_place)"
      }
    ],
    "subject_people": [
      {
        "name": "Nanny Ogg",
        "url": "https://openlibrary.org/subjects/person:nanny_ogg"
      },
      {
        "name": "Granny Weatherwax",
        "url": "https://openlibrary.org/subjects/person:granny_weatherwax"
      },
      {
        "name": "Maigrat",
        "url": "https://openlibrary.org/subjects/person:maigrat"
      },
      {
        "name": "Greebo",
        "url": "https://openlibrary.org/subjects/person:greebo"
      },
      {
        "name": "Verence",
        "url": "https://openlibrary.org/subjects/person:verence"
      },
      {
        "name": "Death",
        "url": "https://openlibrary.org/subjects/person:death"
      }
    ],
    "ebooks": [
      {
        "preview_url": "https://archive.org/details/wyrdsisters0000prat_h5y3",
        "availability": "borrow",
        "formats": {},
        "borrow_url": "https://openlibrary.org/books/OL1614567M/Wyrd_sisters/borrow",
        "checkedout": false
      }
    ],
    "cover": {
      "small": "https://covers.openlibrary.org/b/id/4683700-S.jpg",
      "medium": "https://covers.openlibrary.org/b/id/4683700-M.jpg",
      "large": "https://covers.openlibrary.org/b/id/4683700-L.jpg"
    }
  }
}
```
