---
title: "Quarkus for Architects who Sometimes Write Code - Postman Setup"
description: "Quarkus Application Development Examples"
sitemap: true
published: true
permalink: /tutorials/quarkus-for-architects-postman-setup/
tags:
  - Quarkus Examples
  - Postman Collection
  - Postman Environment
---
I have created a Postman collection for you to use in this exercise.  If you don't have postman, now is a good time to go get it: [https://www.postman.com/downloads/](https://www.postman.com/downloads/){:target="_blank"}

1. Once you have Postman installed, go ahead and start it.

1. Now, we're going to import a Postman collection and an environment.

   Postman collections allow you to create and save API calls and tests.  An environment allows you to store variable configurations for the API calls and tests.  There's a lot more to it than that, but that's what we're going to need for this exercise.

   1. From the main Postman screen, click on the `Import` button that is in the top left portion of the screen:

      ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-startup.png)

   1. You should now see the Import dialog.  Select the `Link` option from the list at the top of the Import window.

      ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-import-window.png)

   1. Past the following URL into the text box under `Enter a URL`, then click `Continue`:

      `https://raw.githubusercontent.com/cgruver/k8ssandra-blog-resources/main/postman/BookCatalog-Quarkus-Demo.postman_collection.json`

      ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-book-catalog-import-url.png)

   1. Click `Import` to import the collection:

      ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-book-catalog-import.png)

   1. Repeat the above steps with the following URL to also import the Envrionment that I prepared for you:

      `https://raw.githubusercontent.com/cgruver/k8ssandra-blog-resources/main/postman/BookCatalog-Quarkus-Demo.postman_environment.json`

Take some time to explore the `collection` and `environment`.  You can access them via the left-hand vertical nav bar.

![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-book-catalog-collection.png)

![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-book-catalog-environment.png)

## Add Credentials to Environment and Activate the Environment

1. Next, we need credentials to access Cassandra.  We're going to bypass creating additional users in Cassandra for this exercise and just use the super-user account that was automatically generated for us.

   The auto-generated credentials are stored in a `secret` that is in the `k8ssandra-operator` namespace.  To retrieve it, first log into your `crc` OpenShift instance:

   1. Open a terminal and set the `crc` environment:

      ```bash
      ~ % eval $(crc oc-env)
      ```

   1. Retireve the login command and credentials:

      ```bash
      ~ % crc console --credentials
      ```

      You should see output similar to:

      ```bash
      To login as a regular user, run 'oc login -u developer -p developer https://api.crc.testing:6443'.
      To login as an admin, run 'oc login -u kubeadmin -p 3QxJ6-P5Z2c-DD7as-zfmfI https://api.crc.testing:6443'
      ```

   1. Copy the command to login as `kubeadmin` and run it:

      ```bash
      ~ % oc login -u kubeadmin -p 3QxJ6-P5Z2c-DD7as-zfmfI https://api.crc.testing:6443
      ```

      You should see output similar to:

      ```bash
      Login successful.

      You have access to 68 projects, the list has been suppressed. You can list all projects with 'oc projects'

      Using project "default".
      ```

   1. Now grab the contents of the secret created for the Cassandra credentials:

      ```bash
      echo $(oc -n k8ssandra-operator get secret k8ssandra-cluster-superuser -o jsonpath="{.data.password}" | base64 -d)
      ```

      Copy the resulting string into your clipboard.  We're going to add it to our Postman environment.

1. Add the cassandra super-user password to the Postman Environment:

   __Note:__  I know I don't have to say this...  but I'm going to anyway...  You should NEVER put production credentials into your Postman environment.  This is a development tool.  While the values that we're going to be using are not persisted, it's still sitting there on your machine in plain text for the duration of your session.

   OK, with that disclaimer out of the way, go ahead and open the Environment that I prepared for you:

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-book-catalog-environment.png)

   Note that there are two columns of values for each key.  The left column of values, called `INITIAL VALUE`, is persisted as part of the collection.  Never put anything sensitive there.  It will be saved in plain-text.  The right hand column of values, called `CURRENT_VALUE`, is ephemeral.  It lasts as long as your postman session, and can be dynamically changed by your Postman tests or scripts.  We'll see an example of that with the value for `AUTH_TOKEN` token.  I still wouldn't put anything sensitive here, but that's up to you.  :-)

   Now, paste the value for the k8ssandra-cluster-superuser password in the row named `auth_password`.  Paste it into the `CURRENT VALUE` column.

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-book-catalog-environment-with-pw.png)

1. Finally, activate the environment for this session by clicking the checkbox next to `Book Catalog - Quarkus Demo ...` in the Environments list:

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-activate-environment.png)
