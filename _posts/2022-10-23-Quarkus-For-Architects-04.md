---
title: "Quarkus for Architects who Sometimes Write Code - Being Persistent - Part 02"
date:   2022-10-23 00:00:00 -0400
description: "Blog Series on writing Cloud Native Applications for OpenShift / Kubernetes with Quarkus - Cassandra and JSON"
tags:
  - OpenShift
  - Kubernetes
  - Quarkus Cassandra Stargate Example
  - K8ssandra Operator
  - Quarkus Mapstruct
  - Quarkus Lombok
categories:
  - Blog Post
  - Quarkus Series
---
__Note:__ This is part two of a three part post.  In this post we'll use Postman to interact with the Cassandra instance that we created in the first post.  

Make sure you have completed part 1 - [Quarkus for Architects who Sometimes Write Code - Being Persistent - Part 01](https://upstreamwithoutapaddle.com/blog%20post/quarkus%20series/2022/10/08/Quarkus-For-Architects-03.html)

In the next post, we'll finally get around to writing a Quarkus app.  But today, we are going to use the [Stargate Document API](https://docs.datastax.com/en/astra-serverless/docs/develop/dev-with-doc.html){:target="_blank"} to get a feel for what the interaction will be like when we write a Quarkus app.

## Make sure your OpenShift cluster is running

__Note:__ If your OpenShift cluster that you installed the K8ssandra operator into is not running, start it now:

   From a terminal run:

   ```bash
   crc start
   ```

This will take a few minutes to restart, but you can go ahead and get Postman set up in the mean time.  Leave this terminal window open so you can see the progress.

## Configure Postman

I have created a Postman collection for you to use in this exercise.  If you don't have postman, now is a good time to go get it: [https://www.postman.com/downloads/](https://www.postman.com/downloads/){:target="_blank"}

1. Once you have Postman installed, go ahead and start it.

1. Now, we're going to import a Postman collection and an environment.

   Postman collections allow you to create and save API calls and tests.  An environment allows you to store variable configurations for the API calls and tests.  There's a lot more to it than that, but that's what we're going to need for this exercise.

   1. From the main Postman screen, click on the `Import` button that is in the top left portion of the screen:

      ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-startup.png)

   1. You should now see the Import dialog.  Select the `Link` option from the list at the top of the Import window.

      ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-import-window.png)

   1. Past the following URL into the text box under `Enter a URL`, then click `Continue`:

      `https://raw.githubusercontent.com/cgruver/k8ssandra-blog-resources/main/postman/book-catalog-01.postman_collection.json`

      ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-import-collection-url.png)

   1. Click `Import` to import the collection:

      ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-import-collection.png)

   1. Repeat the above steps with the following URL to also import the Envrionment that I prepared for you:

      `https://raw.githubusercontent.com/cgruver/k8ssandra-blog-resources/main/postman/book-catalog-01.postman_environment.json`

      ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-import-environment.png)

Take some time to explore the `collection` and `environment`.  You can access them via the left-hand vertical nav bar.

![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-collection.png)

![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-environment.png)

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

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-environment.png)

   Note that there are two columns of values for each key.  The left column of values, called `INITIAL VALUE`, is persisted as part of the collection.  Never put anything sensitive there.  It will be saved in plain-text.  The right hand column of values, called `CURRENT_VALUE`, is ephemeral.  It lasts as long as your postman session, and can be dynamically changed by your Postman tests or scripts.  We'll see an example of that with the value for `AUTH_TOKEN` token.  I still wouldn't put anything sensitive here, but that's up to you.  :-)

   Now, paste the value for the k8ssandra-cluster-superuser password in the row named `auth_password`.  Paste it into the `CURRENT VALUE` column.

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-environment-with-pw.png)

1. Finally, activate the environment for this session by selecting `Book Catalog Stargate Env` from the environment drop down in the top right had corner of Postman:

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-select-environment.png)

## Use Postman To Interact with Cassandra via the Stargate Document API

Now let's use Postman to put some data into our new Cassandra cluster, and query it.

Expand the list of prepared calls in the `Book Catalog - Blog Post` collection:

1. Select the `Collections` button at the top left of the Postman window.

1. Expand the `Book Catalog - Blog Post` collection.

1. Expand the `Stargate Document API` folder.

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-book-catalog-api-list.png)

We're going to pretty much hit these API invocations from the top down.  

The results will be:

1. Create an Authentication Token and store it in the Postman environment

1. Create a Document Namespace

1. Create a Collection to hold Documents

1. Add information about 2 books to the Collection as Documents

1. Search for a book information document by ISBN10 and ISBN13

   We'll see that we get back one document that matches the search.

1. Search for book information by Author

   We'll see that we get back a list of documents.

1. Delete the Collection, so we don't leave garbage sitting around.

Now, let's dive in:

### Put Some Data in Cassandra

1. The first step is to authenticate with Cassandra and get a Token:

   Select `create-auth-token` and click `Send`:

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-create-auth-token.png)

    __Note:__ You will likely see a failure.  Click on `Disable SSL Verification`.  Your OpenShift Local instance is using a self-signed cert, and Postman does not pick up certs from your local keystore.  It has its own.  You can add the cert to Postman's local store if you like, but the `crc` cert will change every time you destroy it and create a new cluster.

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-disable-ssl-valid.png)

   Now, click `Send` again, and you should see an `authToken` returned:

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-auth-token-response.png)

1. Take a moment to click over to the `Book Catalog Stargate Env` environment, and notice that the `authToken` has been stored in the `CURRENT VALUE` column for the `AUTH_TOKEN` key:

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-token-in-environment.png)

1. Now, go back and select `Create home_library NameSpace` from the collection

   Click `Send` and notice the successful creation of your NameSpace:

   __Note:__ You can see the payload submitted in `POST` or `PUT` calls by clicking on `body` right under the URL.  You can toggle through those tabs to see `Params`, `Headers`, etc...

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-create-namespace.png)

   The response for this call will be an empty `201` if it is successful.

1. Repeat with the `Create book_catalog Collection`:

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-create-collection.png)

1. Now that we have a collection in a namespace, let's add some data:

   Select `Save Thief Of Time` and click `Send`:

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-add-book-01.png)

   Take a look at the `body` of the request.  It represents a Book Info document.  We'll turn this into code when we build the Quarkus app.

   Note also that we are using the `PUT` verb.  If we use `POST` cassandra will assign the document id for us as a UUID.  Using `PUT` allows us to create our own ID.  `PUT` can also be used to update an existing document.

1. Add the second book info document by selecting `Save Wyrd Sisters` and click `Send`:

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-add-book-02.png)

At this point we have inserted two documents into our collection.  Behind the scenes, Stargate has interacted with Cassandra to persist this data and perform some optimizations on it for query.

This is really where the power of Stargate is going to come into play.  As a developer, we are going to be abstracted away from the nuances of Cassandra data modeling and optimization.  I'm fairly new to this, so I'm sure there are plenty of tradeoffs, but the simplicity can't be beat.

So, let's query our data!

### Query The Data That We Persisted

__Note:__ At some point your AUTH TOKEN may expire.  If you get an authentication failure, just hit `Send` on the `create-auth-token` call in the collection.  This will refresh your token.

1. Select `Get by isbn13` from the collection:

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-query-by-isbn13.png)

   Take a look at the URL.  Note the query parameter:

   `where={"identifiers.isbn13List.[*].isbn13":{"$eq":"9780061031328"}}`

   This is Stargate Document API specific syntax.

   Note that the value of the `where` key is JSON.

   The key of the JSON object is a JSON path.

   The value of the JSON object is an instruction to use an equals method with the value of `9780061031328` against the data at the end of the JSON path.

   This should return to us any document that has the object `{"isbn13":"9780061031328"}` in its `isbn13List` array.

1. Click `Send`:

   Notice that the document for the book "Thief Of Time" is returned

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-query-isbn13-response.png)

1. Select `Get by isbn10` from the collection and click `Send`:

   Notice that once again, the document for the book "Thief Of Time" is returned

   ![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-query-isbn10-response.png)

1. Select `Get by Author` from the collection and hit `Send`:

   Notice that you get both documents returned since Terry Pratchett is included as an author on both book info documents.

1. Now, go play.  Change the queries, add more book info documents.

   As a start, replace "Terry Pratchett" with "Joanne Harris" in the `Get by Author` call and hit `Send` again.

   This time you should just see the data for "Wyrd Sisters" returned.

When you are done, select `Delete book_catalog Collection` from the collection and hit `Send`.  This will delete the data from Cassandra.

That's it!

Next time we'll turn this into a Quarkus app that will retrieve data from the Open Library API, and store it in our Cassandra cluster using the Stargate Document API.

Check out Open Library here: [https://openlibrary.org](https://openlibrary.org)

Cheers!
