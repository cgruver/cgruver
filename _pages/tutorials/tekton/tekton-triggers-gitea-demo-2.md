---
title: "OpenShift Pipelines (Tekton) - Triggers with a cup of Gitea - Branch Webhook Demo"
description: "Create a Kubernetes Namespace from a Git branch creation webhook event"
sitemap: true
published: true
permalink: /tutorials/tekton-triggers-gitea-demo-2/
tags:
  - openshift pipelines
  - tekton
  - gitea webhook
---
## Prerequisite

__[Triggers with a cup of Gitea - Cluster Setup](/tutorials/tekton-triggers-gitea-setup/){:target="_blank"}__

## Set Up The Namespace Provisioner

1. Create a Namespace

   ```bash
   oc new-project namespace-provisioner
   ```

1. Create a service account with self-provisioner privileges

   ```bash
   oc create sa provisioner -n namespace-provisioner
   oc adm policy add-cluster-role-to-user self-provisioner -z provisioner -n namespace-provisioner
   ```

1. Create a ConfigMap for the CA bundle that includes our Gitea server

   ```bash
   cat << EOF | oc apply -n namespace-provisioner -f -
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: trusted-ca
     labels:
       config.openshift.io/inject-trusted-cabundle: 'true'
   EOF
   ```

1. Create the Tekton Task and Trigger objects

   ```bash
   oc apply -f ~/tekton-tutorial/gitea-demo/namespace-provisioner/ -n namespace-provisioner
   ```

1. Expose the Trigger via a Secured Route

   ```bash
   SVC_NAME=$(oc get el ns-prov-trigger-listener -o=jsonpath='{.status.configuration.generatedName}')
   oc create route edge ${SVC_NAME} --service=${SVC_NAME}
   ```

## Create the Gitea Webhook

   ```bash
   echo "https://$(oc get route ${SVC_NAME} -o=jsonpath='{.spec.host}')"
   ```

1. ![Gitea Devuser](images/gitea-ns-prov-login.png)

1. ![Gitea Devuser](images/gitea-ns-prov-select-organization.png)

1. ![Gitea Devuser](images/gitea-ns-prov-select-settings.png)

1. ![Gitea Devuser](images/gitea-ns-prov-select-add-webhook.png)

1. ![Gitea Devuser](images/gitea-ns-prov-create-webhook.png)

1. ![Gitea Devuser](images/gitea-ns-prov-add-webhook.png)

1. ![Gitea Devuser](images/gitea-ns-prov-webhook-added.png)

### Create A Quarkus Application

1. Create a basic Quarkus REST service:

   We're using the Quarkus CLI for this step.  Check it out here: [https://quarkus.io/guides/cli-tooling](https://quarkus.io/guides/cli-tooling)

   ```bash
   quarkus create app --maven --java=11 --no-wrapper --package-name=fun.is.quarkus.demo fun.is.quarkus:app-demo:0.1
   ```

1. Initialize a git repository for the demo app code:

   ```bash
   cd app-demo
   git init -b main
   git add .
   git commit -m "initial commit"
   ```

1. Add the Gitea server as a remote origin:

   ```bash
   git remote add origin https://$(oc get route gitea -o=jsonpath='{.spec.host}' -n gitea)/demo/app-demo
   ```

1. Push the demo code to our Gitea instance:

   ```bash
   GIT_SSL_NO_VERIFY=true git push --set-upstream origin main
   ```

   When prompted, enter the credentials that you created for your gitea user: `developer`





```json
{
  "sha": "f075bf441d79ab76171bb58e8c494eb4b712806d",
  "ref": "test-hook",
  "ref_type": "branch",
  "repository": {
    "id": 8,
    "owner": {"id":4,"login":"demo","full_name":"","email":"","avatar_url":"https://gitea.clg.lab:3000/user/avatar/demo/-1","language":"","is_admin":false,"last_login":"0001-01-01T00:00:00Z","created":"2022-02-13T21:29:42Z","restricted":false,"active":false,"prohibit_login":false,"location":"","website":"","description":"","visibility":"private","followers_count":0,"following_count":0,"starred_repos_count":0,"username":"demo"},
    "name": "app-demo",
    "full_name": "demo/app-demo",
    "description": "",
    "empty": false,
    "private": true,
    "fork": false,
    "template": false,
    "parent": null,
    "mirror": false,
    "size": 244,
    "html_url": "https://gitea.clg.lab:3000/demo/app-demo",
    "ssh_url": "gitea@gitea.clg.lab:demo/app-demo.git",
    "clone_url": "https://gitea.clg.lab:3000/demo/app-demo.git",
    "original_url": "",
    "website": "",
    "stars_count": 0,
    "forks_count": 0,
    "watchers_count": 3,
    "open_issues_count": 0,
    "open_pr_counter": 0,
    "release_counter": 0,
    "default_branch": "trunk",
    "archived": false,
    "created_at": "2022-03-04T17:38:16Z",
    "updated_at": "2022-03-04T17:54:34Z",
    "permissions": {
      "admin": false,
      "push": false,
      "pull": false
    },
    "has_issues": true,
    "internal_tracker": {
      "enable_time_tracker": true,
      "allow_only_contributors_to_track_time": true,
      "enable_issue_dependencies": true
    },
    "has_wiki": true,
    "has_pull_requests": true,
    "has_projects": true,
    "ignore_whitespace_conflicts": false,
    "allow_merge_commits": true,
    "allow_rebase": true,
    "allow_rebase_explicit": true,
    "allow_squash_merge": true,
    "default_merge_style": "merge",
    "avatar_url": "",
    "internal": false,
    "mirror_interval": ""
  },
  "sender": {"id":1,"login":"gitea","full_name":"","email":"gitea@gitea.clg.lab","avatar_url":"https://gitea.clg.lab:3000/user/avatar/gitea/-1","language":"","is_admin":false,"last_login":"0001-01-01T00:00:00Z","created":"2022-01-23T22:54:15Z","restricted":false,"active":false,"prohibit_login":false,"location":"","website":"","description":"","visibility":"public","followers_count":0,"following_count":0,"starred_repos_count":0,"username":"gitea"}
}
```