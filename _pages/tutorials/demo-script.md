---
title: "OpenShift Pipelines (Tekton) - Demo Script"
description: "Demo of the Tekton manifests provided for this lab"
sitemap: false
published: false
permalink: /tutorials/demo-script/
---
## Opinionated Approach to CI/CD - Convention Over Code

### Objectives:

1. Create convention driven pipelines that require no modification by dev teams.

1. Demonstrate secure CI/CD practices

   * TLS communications with trusted certs
   * Webhook validation

1. Allow for appropriate configuration for common application needs

   * Environment through ConfigMaps and Secrets
   * Health Probes
   * Requests & Limits
   * Replicas
   * Init Containers

1. Traceability

   * Use git commit hash to label all resources

1. Support Canary / Blue-Green Deployments & the ability to roll back

### Script

Create an OpenShift project:

```bash
oc new-project app-demo
```

Apply the demo manifests to the project:

```bash
oc apply -f ${OKD_LAB_PATH}/okd-home-lab/pipelines/manifests/ -n app-demo
```

Create a ConfigMap for maven-settings.xml

```bash
cat << EOF | oc apply -n app-demo -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: maven-settings-xml
data:
  settings.xml: |
    <?xml version="1.0" encoding="UTF-8"?>
    <settings>
      <mirrors>
        <mirror>
          <id>maven-public</id>
          <name>maven-public</name>
          <url>https://nexus.${LAB_DOMAIN}:8443/repository/maven-public/</url>
          <mirrorOf>*</mirrorOf>
        </mirror>
      </mirrors>
      <profiles>
        <profile>
          <id>maven-nexus-repo</id>
          <repositories>
            <repository>
              <id>maven-public</id>
              <name>maven-public</name>
              <url>https://nexus.${LAB_DOMAIN}:8443/repository/maven-public/</url>
            </repository>
          </repositories>
        </profile>
      </profiles>
      <activeProfiles>
        <activeProfile>maven-nexus-repo</activeProfile>
      </activeProfiles>
    </settings>
EOF
```

Create a secret for the Gitea service account:

```bash

read GITEA_USER

read -s GITEA_PASSWD

cat << EOF | oc apply -n app-demo -f -
apiVersion: v1
kind: Secret
metadata:
    name: gitea-secret
    annotations:
      tekton.dev/git-0: https://gitea.${LAB_DOMAIN}:3000
type: kubernetes.io/basic-auth
data:
  username: $(echo -n ${GITEA_USER} | base64)
  password: $(echo -n ${GITEA_PASSWD} | base64)
EOF

GITEA_USER=""
GITEA_PASSWD=""
```

Make the `pipeline` service account aware of the secret:

```bash
oc patch sa pipeline --type json --patch '[{"op": "add", "path": "/secrets/-", "value": {"name":"gitea-secret"}}]' -n app-demo
```

Create an application

```bash
quarkus create app --maven --java=11 --no-wrapper --package-name=fun.is.quarkus.demo fun.is.quarkus:app-demo:0.1
```

Put the application into Gitea:

```bash
cd app-demo
git init
git branch -m trunk
git add .
git commit -m "init"

git remote add origin https://gitea.${LAB_DOMAIN}:3000/demo/app-demo
git push --set-upstream origin trunk
```

Set up the application with the CI/CD Pipeline

```bash
oc process app-demo//create-rolling-replace-quarkus-fast-jar-app -p GIT_REPOSITORY=https://gitea.${LAB_DOMAIN}:3000/demo/app-demo -p GIT_BRANCH=trunk | oc apply -n app-demo -f -
```

Trigger a build

```bash
echo "test-1" >> test.txt
git add .
git commit -m test-1
git push
```

Add some configuration for the Deployment:

```bash
quarkus ext add quarkus-smallrye-health

mkdir -p deploy-config/patch

cat << EOF > deploy-config/patch/deployment-patch.yaml
spec:
  replicas: 1
  template:
    spec:
      containers:
      - name: --DEPLOY_NAME--
        resources:
          requests:
            memory: 512Mi
            cpu:    500m
          limits:
            memory: 512Mi
            cpu:    1
        readinessProbe:
          failureThreshold: 10
          httpGet:
            path: /q/health/ready
            port: 8080
            scheme: HTTP
          periodSeconds: 1
          successThreshold: 1
          timeoutSeconds: 1
        livenessProbe:
          failureThreshold: 10
          httpGet:
            path: /q/health/live
            port: 8080
            scheme: HTTP
          periodSeconds: 1
          successThreshold: 1
          timeoutSeconds: 1
      terminationGracePeriodSeconds: 15
EOF

git add .
git commit -m health
git push
```
