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

## Create a Kubernetes Namespace from a Git branch creation webhook event

```bash
oc new-project namespace-provisioner
```

```bash
oc create sa provisioner -n namespace-provisioner
oc adm policy add-cluster-role-to-user self-provisioner -z provisioner -n namespace-provisioner
```

```bash
cat < EOF | oc apply -n namespace-provisioner -f -
apiVersion: v1
kind: ConfigMap
metadata:
  name: trusted-ca
  labels:
    config.openshift.io/inject-trusted-cabundle: 'true'
EOF
```

```bash
oc apply -f ~/tekton-tutorial/gitea-demo/namespace-provisioner/
```

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