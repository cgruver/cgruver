---
title: Cajun Navy Notes
permalink: /cajun-navy/notes/
sitemap: false
published: false
---
```bash
brew install quarkusio/tap/quarkus

quarkus create app --maven --java=11 --no-wrapper --no-code --package-name=org.clg.cajun_navy.disaster org.clg.cajun_navy:disaster:0.1


```

This work is inspired by, and principally based on [Emergency Response Demo](https://erdemo.io).  For a working application, follow that link.

I am doing this re-write principally for my own education, but also as a companion to my OKD tutorial at: [Installing OKD4.X with User Provisioned Infrastructure](https://github.com/cgruver/okd4-upi-lab-setup)

I am writing this application with the Quarkus Java framework, using reactive techniques.  The persistence layer will be provided by a three node Cassandra cluster, deployed with the [K8ssandra](https://github.com/k8ssandra/k8ssandra) project.

## Hi Wendy

![Fiat](/assets/images/Fiat-Wide.jpg)

## How it will work:

1. A disaster is registered
    1. Shelters
    1. Inclusion Zones
1. Incidents are registered (Asynchronous Activity)
    1. Victims
1. Responders enroll (Asynchronous Activity)
1. Responders are assigned to Incidents
    1. Missions

### Services:

1. ___[Disaster Service](https://github.com/cgruver-cajun-navy/disaster)___

    * Registers a disaster
    * Responds to the creation of Incidents and creates Missions with available Responders
    * Records the rescue status of Victim to Shelters
    * Manages the prioritization of Incidents when there are not enough Responders 

1. ___[Incident Service](https://github.com/cgruver-cajun-navy/incident)___

    * Manages Incident State

1. ___[Responder Service](https://github.com/cgruver-cajun-navy/responder)___

    * Manages Responder State

1. ___[Mission Service](https://github.com/cgruver-cajun-navy/mission)___

    * Creates Missions for Responders

### Kafka Topics:

| Topic  | Description | Producer | Consumers |
| - | - | - | - |
| incident-reported | | Incident Service | Disaster Service |
| incident-updated | | Incident Service | |
| incident-update-location | | Disaster Service | Incident Service |
| incident-update-status | | Disaster Service | Incident Service |
| incident-assigned | | Disaster Service | Incident Service |
| | | | |
| responder-info-update | | Disaster Service | Responder Service |
| responder-location-update | | Disaster Service | Responder Service, Mission Service |
| responder-availability-update | | Disaster Service | Responder Service |
| responder-created | | Responder Service | |
| responder-updated | | Responder Service | Disaster Service |
| responder-location-updated | | Responder Service | |
| | | | |
| priority-zone-clear | | | Incident Service |
| mission-command | | Disaster Service | Mission Service |
| mission-event | | Mission Service | Disaster Service |
| | | |

### Kafka Topics by Service

| Service | Produces | Consumes |
| - | - | - |
| Incident Service | | |
| | incident-reported | incident-update-location |
| | incident-updated | incident-update-status |
| | | incident-assigned |
| Disaster Service | | |
| | incident-update-location | incident-reported |
| | incident-update-status | incident-updated |
| | incident-assigned | responder-updated |
| | responder-info-update | responder-created |
| | responder-location-update | mission-event |
| | responder-availability-update | victim-rescued |
| | mission-command |
| Responder Service | | |
| | responder-created | responder-info-update |
| | responder-updated | responder-location-update |
| | responder-location-updated | responder-availability-update |
| | | |
| Mission Service | | |
| | mission-event | mission-command |
| | | responder-location-updated |

### Development Roadmap:

1. MVP

    * Record Disaster
    * Add Shelters

1. Incident

    * Register Incident and associate with Disaster

1. Responder

    * Register Responders and associate with Disaster

1. Assignments

    Assign Responder to Incident

1. TBD

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

### Install Pipelines
