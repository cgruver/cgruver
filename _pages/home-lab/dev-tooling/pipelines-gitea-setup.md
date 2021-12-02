---
title: "Tekton Pipelines - Gitea & Nexus Setup"
description: "Setting up an OpenShift namespace and Gitea organization for Tekton Triggers with Gitea Webhooks"
sitemap: true
published: true
permalink: /home-lab/pipelines-gitea-setup/
tags:
  - openshift pipelines
  - tekton
  - tekton triggers
  - Quarkus
  - Gitea Webhooks
---
__Note:__  __*If you have not installed Gitea, you need to do that first*__: [Install Gitea](/home-lab/gitea-with-pi/)

### Set up a Gitea organization and service account for the demo application:

1. Log into gitea as your admin user:

   ![Gitea Login](images/gitea-login.png)

1. Select `Site Administration` from the drop down menu in the top right corner:

   ![Gitea Admin](images/gitea-site-admin.png)

1. Select User Accounts:

   ![Gitea Users](images/gitea-user-accounts.png)

1. Create a Service Account for our demo:

    ![Service Account](images/gitea-create-service-account.png)

1. Update the service account by unchecking `May Create Organizations`

   ![Update Service Account](images/gitea-update-service-account.png)

1. Go back to `Site Administration` and select `Organizations`:

   ![Organizations](images/gitea-organizations.png)

1. Create an Organization for the demo code:

   ![Create Organization](images/gitea-create-organization.png)

1. From the new Organization, select the `Owners` Team from the `Teams` menu on the right hand of the screen:

   ![Owners Team](images/gitea-demo-organization.png)

1. Add your `devuser` account as a Team member:

   ![Add Dev User](images/gitea-add-devuser-to-team.png)

1. Go back to the `demo` Organization and this time select `New Team` from the right hand menu:

   Create a team as shown for the demo service account:

   ![Create Team - 1](images/gitea-create-team-page1.png)
   ![Create Team -2](images/gitea-create-team-page2.png)

1. Go back to the `demo` Organization and select the new `demo-sa` Team from the right hand menu:

   ![Add User to Team](images/gitea-owners-team.png)

1. Add the `demo-sa` user to the Team:

   ![Add User to Team](images/gitea-add-team-member.png)

__Now that Gitea is ready to play its part in our development ecosystem, let's get an OpenShift project set up:__

__[Tekton Pipelines - OpenShift Project Setup](/home-lab/pipelines-project-setup/)__
