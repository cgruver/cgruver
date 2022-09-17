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

## Install Cassandra and Stargate

```bash
export K8SSANDRA_WORKDIR=${HOME}/okd-lab/quarkus-projects/k8ssandra-work-dir
mkdir -p ${K8SSANDRA_WORKDIR}/cert-manager-install
mkdir ${K8SSANDRA_WORKDIR}/tmp

git clone https://github.com/cgruver/k8ssandra-blog-resources.git ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources
```

## Copy Images to Lab Nexus Registry

```bash
export PUSH_REGISTRY=$(oc get route default-route -n openshift-image-registry -o jsonpath='{.spec.host}')
export PULL_REGISTRY="image-registry.openshift-image-registry.svc:5000"

eval $(crc podman-env)

podman login -u $(oc whoami) -p $(oc whoami -t) --tls-verify=false ${PUSH_REGISTRY}

. ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/k8ssandra/versions.sh
envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/k8ssandra/images.yaml > ${K8SSANDRA_WORKDIR}/images.yaml
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
  podman tag ${source_registry}/${image_name}:${image_version} target_registry/${image_name}:${image_version}
  podman push --tls-verify=false target_registry/${image_name}:${image_version}
  image_index=$(( ${image_index} + 1 ))
done
```

## Install Cert Manager

```bash
wget -O ${K8SSANDRA_WORKDIR}/tmp/cert-manager.yaml https://github.com/jetstack/cert-manager/releases/download/${CERT_MGR_VER}/cert-manager.yaml

envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/k8ssandra/cert-manager-kustomization.yaml > ${K8SSANDRA_WORKDIR}/tmp/kustomization.yaml

kustomize build ${K8SSANDRA_WORKDIR}/tmp > ${K8SSANDRA_WORKDIR}/cert-manager-install.yaml

for i in dc1 dc2 dc3 cp
do
  labctx ${i}
  oc --kubeconfig ${KUBE_INIT_CONFIG} create -f ${K8SSANDRA_WORKDIR}/cert-manager-install.yaml
done

rm ${K8SSANDRA_WORKDIR}/tmp/cert-manager.yaml
```

### Install K8ssandra Operator

```bash



```bash
for DEPLOY_TYPE in control-plane data-plane
do
  export DEPLOY_TYPE
  envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/k8ssandra/k8ssandra-kustomization.yaml > ${K8SSANDRA_WORKDIR}/tmp/kustomization.yaml
  kustomize build ${K8SSANDRA_WORKDIR}/tmp > ${K8SSANDRA_WORKDIR}/k8ssandra-${DEPLOY_TYPE}.yaml
done

labctx cp
oc --kubeconfig ${KUBE_INIT_CONFIG} create -f ${K8SSANDRA_WORKDIR}/k8ssandra-control-plane.yaml
oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator patch role k8ssandra-operator --type=json -p='[{"op": "add", "path": "/rules/-", "value": {"apiGroups": [""],"resources": ["endpoints/restricted"],"verbs": ["create"]} }]'
oc --kubeconfig ${KUBE_INIT_CONFIG} adm policy add-scc-to-user anyuid -z default -n k8ssandra-operator

for i in dc1 dc2 dc3
do
  labctx ${i}
  oc --kubeconfig ${KUBE_INIT_CONFIG} create -f ${K8SSANDRA_WORKDIR}/k8ssandra-data-plane.yaml
  oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator patch role k8ssandra-operator --type=json -p='[{"op": "add", "path": "/rules/-", "value": {"apiGroups": [""],"resources": ["endpoints/restricted"],"verbs": ["create"]} }]'
  oc --kubeconfig ${KUBE_INIT_CONFIG} adm policy add-scc-to-user anyuid -z default -n k8ssandra-operator
done

for i in dc1 dc2 dc3 cp
do
  labctx ${i}
  oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator scale deployment cass-operator-controller-manager --replicas=0
  oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator scale deployment k8ssandra-operator --replicas=0
  oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator patch configmap cass-operator-manager-config --patch="$(envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/k8ssandra/cass-config-patch.yaml)"
  oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator scale deployment cass-operator-controller-manager --replicas=1
  oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator scale deployment k8ssandra-operator --replicas=1
done
```

## Create ClientConfigs

```bash
mkdir -p ${K8SSANDRA_WORKDIR}/tmp
labctx cp
oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator scale deployment k8ssandra-operator --replicas=0

for i in dc1 dc2 dc3
do
  labctx ${i}
  sa_secret=$(oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator get serviceaccount k8ssandra-operator -o yaml | yq e ".secrets" - | grep token | cut -d" " -f3)
  sa_token=$(oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator get secret $sa_secret -o jsonpath='{.data.token}' | base64 -d)
  ca_cert=$(oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator get secret $sa_secret -o jsonpath="{.data['ca\.crt']}")
  cluster=$(oc --kubeconfig ${KUBE_INIT_CONFIG} config view -o jsonpath="{.contexts[0].context.cluster}")
  cluster_addr=$(oc --kubeconfig ${KUBE_INIT_CONFIG} config view -o jsonpath="{.clusters[0].cluster.server}")

  export SECRET_FILE=${K8SSANDRA_WORKDIR}/tmp/kubeconfig

  envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/k8ssandra/kubeconfig-secret.yaml > ${SECRET_FILE}

  labctx cp

  oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator create secret generic ${cluster}-config --from-file="${SECRET_FILE}"

  envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/k8ssandra/client-config.yaml | oc --kubeconfig ${KUBE_INIT_CONFIG} apply -n k8ssandra-operator -f -

done

labctx cp
oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator scale deployment k8ssandra-operator --replicas=1
```

## Deploy Cluster

```bash
labctx cp
envsubst < ${K8SSANDRA_WORKDIR}/k8ssandra-blog-resources/k8ssandra/k8ssandra-cluster.yaml | oc --kubeconfig ${KUBE_INIT_CONFIG} -n k8ssandra-operator apply -f -
```


```bash

cd ${HOME}/okd-lab/quarkus-projects
code --create -a=book_catalog -g=fun.is.quarkus
cd ${HOME}/okd-lab/quarkus-projects/book_catalog
code --dependency -g=org.mapstruct -a=mapstruct -v=1.5.2.Final
code --dependency -g=org.mapstruct -a=mapstruct-processor -v=1.5.2.Final
code --dependency -g=org.projectlombok -a=lombok -v=1.18.24
code --dependency -g=org.projectlombok -a=lombok-mapstruct-binding -v=0.2.0
```

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
