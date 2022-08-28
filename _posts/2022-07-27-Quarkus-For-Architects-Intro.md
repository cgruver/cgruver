---
title: "Quarkus for Architects who Sometimes Write Code - Introduction"
date:   2022-07-27 00:00:00 -0400
description: "Blog Series on writing Cloud Native Applications for OpenShift / Kubernetes with Quarkus"
tags:
  - OpenShift
  - Kubernetes
  - Homelab
  - Home Lab
  - Quarkus
categories:
  - Blog Post
  - Quarkus Series
---

So...   I have written a few applications over the course of my career in IT.  But, I've never been a "real" Software Engineer.  That is to say, I've never been a coder on an application delivery team.  You can likely tell from the content of this blog, that I am more of a platform guy than a developer.  As I made the transition from platform engineer to architect, the code that I wrote was mainly for prototyping and teaching.  But, I find that knowing the principles of software engineering and design as well as platforms and security has been a huge help in my various roles as an enterprise architect.  It has given me a level of empathy for the Dev, Sec, & Ops roles that I would not otherwise have had.

With that in mind, I am starting a new Blog series today.  This, (hopefully weekly), series will be focused on software engineering topics for architects who sometimes write code.

Plus, I'm a huge fan of the Quarkus Java Framework.  So, this is also an opportunity to share that with you too.  Check it out here: [https://quarkus.io](https://quarkus.io){:target="_blank"}  It's a Java framework for Kubernetes native apps.  If you are familiar with Spring Boot, you'll find a lot to like about Quarkus.

__Note:__ I am assuming in this series that you are at least somewhat familiar with the Java programming language.

In this first post, we are going to set up our dev tools and create a simple Quarkus project.

## Set Up Your Dev Environment

At a minimum, you are going to need the following:

1. Git CLI: [https://git-scm.com](https://git-scm.com){:target="_blank"}

1. An IDE, I will be using Visual Studio Code: [https://code.visualstudio.com](https://code.visualstudio.com){:target="_blank"}

   Note: I've installed the following extensions for my Java development:

     * Extension Pack for Java
     * Lombok Annotations Support for VS Code
     * OpenShift Extension Pack
     * Quarkus Tools for Visual Studio Code
     * YAML

1. Java - I'm using OpenJDK 17 [https://adoptium.net](https://adoptium.net){:target="_blank"}

   __Note:__ We're going to be using the Java `record` type.  So, you need at least Java 14.  Java 17 is the current LTS release, so I am using that.

1. Maven build tool: [https://maven.apache.org](https://maven.apache.org){:target="_blank"}

   __Note:__ Make sure that Maven uses the correct Java version.  Your `$JAVA_HOME` needs to resolve correctly.

1. The Quarkus CLI: [https://quarkus.io/guides/cli-tooling](https://quarkus.io/guides/cli-tooling){:target="_blank"}

1. YQ for parsing and manipulating YAML. [https://mikefarah.gitbook.io/yq/](https://mikefarah.gitbook.io/yq/)

1. JQ for parsing and manipulating JSON.

1. Curl for interacting with HTTP endpoints from the command line.  (This is likely already part of your base OS)

### MacBook Setup

If you are on a MacBook like I am, this will install the CLI tools and Java:

__Note:__ If you already have one or more JDKs installed, the following might mess up your setup.  These instructions are for a clean install.

1. Install HomeBrew if you don't have it already:

   ```bash
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   ```

1. Install the tools:

   ```bash
   brew install jq yq maven openjdk@17 git quarkusio/tap/quarkus
   ```

1. Fix Maven JDK version on Mac OS:

   HomeBrew installs the latest OpenJDK as a dependency for Maven.  We don't want Maven to use a different JDK.

   ```bash
   brew uninstall --ignore-dependencies openjdk
   ```

   In the next step we'll set `JAVA_HOME` so that Maven uses the default JDK.  In this case OpenJDK 17.

1. Set your `$PATH`

   ```bash
   cat << EOF >> ~/.zshrc
   ### Brew Vars
   PATH="/usr/local/opt/openjdk@17/bin:$PATH"
   export CPPFLAGS="-I/usr/local/opt/openjdk@17/include"
   export JAVA_HOME=$(/usr/libexec/java_home)
   ###
   EOF
   ```

### Create a working directory for these projects:

```bash
mkdir -p ${HOME}/okd-lab/quarkus-projects
```

I'm being prescriptive here to keep things consistent with my other lab projects on this site.

## Let's write some code

In this first project were going to write a very basic application.  No TLS.  No authentication.  just a very basic app.

We'll get familiar with the tooling and processes.  Then, next week we'll start adding complexity.

Eventually we'll set up CI/CD tooling with [OpenShift Pipelines/Tekton](https://github.com/tektoncd).

But, first...  Let's say "Hello World".

### Explore the Quarkus CLI and Dev tooling

Let's stand up a very basic Quarkus application.

```bash
cd ${HOME}/okd-lab/quarkus-projects
quarkus create
```

You should see output similar to:

```bash
Creating an app (default project type, see --help).
Looking for the newly published extensions in registry.quarkus.io
-----------

applying codestarts...
📚  java
🔨  maven
📦  quarkus
📝  config-properties
🔧  dockerfiles
🔧  maven-wrapper
🚀  resteasy-reactive-codestart

-----------
[SUCCESS] ✅  quarkus project has been successfully generated in:
--> /Users/charrogruver/okd-lab/quarkus/code-with-quarkus
-----------
Navigate into this directory and get started: quarkus dev
```

Take a look at what just happened!

The quarkus cli abstracts away a lot of the drudgery of setting up a new project.

Go explore the project that was created in `${HOME}/okd-lab/quarkus-projects/code-with-quarkus`

```bash
.
├── README.md
├── mvnw
├── mvnw.cmd
├── pom.xml
└── src
    ├── main
    │   ├── docker
    │   │   ├── Dockerfile.jvm
    │   │   ├── Dockerfile.legacy-jar
    │   │   ├── Dockerfile.native
    │   │   └── Dockerfile.native-micro
    │   ├── java
    │   │   └── org
    │   │       └── acme
    │   │           └── GreetingResource.java
    │   └── resources
    │       ├── META-INF
    │       │   └── resources
    │       │       └── index.html
    │       └── application.properties
    └── test
        └── java
            └── org
                └── acme
                    ├── GreetingResourceIT.java
                    └── GreetingResourceTest.java
```

Because we took all of the defaults when we ran the `quarkus create` command, it bootstrapped a conventional REST API for us.  We'll start here on our journey, and then create our own apps.

### Start Quarkus Dev Mode

1. One of the many fantastic features of Quarkus is its live developer mode.  We'll go ahead and start that now.

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/code-with-quarkus
   quarkus dev
   ```

1. You should see output similar to:

   ```bash
   __  ____  __  _____   ___  __ ____  ______ 
   --/ __ \/ / / / _ | / _ \/ //_/ / / / __/ 
   -/ /_/ / /_/ / __ |/ , _/ ,< / /_/ /\ \   
   --\___\_\____/_/ |_/_/|_/_/|_|\____/___/   
   2022-07-27 07:51:47,931 INFO  [io.quarkus] (Quarkus Main Thread) code-with-quarkus 1.0.0-SNAPSHOT on JVM (powered by Quarkus 2.10.3.Final) started in 1.190s. Listening on: http://localhost:8080

   2022-07-27 07:51:47,943 INFO  [io.quarkus] (Quarkus Main Thread) Profile dev activated. Live Coding activated.
   2022-07-27 07:51:47,943 INFO  [io.quarkus] (Quarkus Main Thread) Installed features: [cdi, resteasy-reactive, smallrye-context-propagation, vertx]

   --
   Tests paused
   Press [r] to resume testing, [o] Toggle test output, [:] for the terminal, [h] for more options>
   ```

1. __Note:__ At the bottom of your terminal output:

   ```bash
   --
   Tests paused
   Press [r] to resume testing, [o] Toggle test output, [:] for the terminal, [h] for more options>
   ```

   Go ahead and press `r`

   Note that all the tests pass.

### Explore the Quarkus Dev UI

Point your browser at [http://localhost:8080](http://localhost:8080){:target="_blank"}

You will see the content from the generated index.html file:

![Quarkus Dev UI](/_pages/home-lab/dev-tooling/images/quarkus-dev-ui.png)

Spend a few minutes exploring the links on this page.  Take a good look at the `DEV UI` behind the `VISIT THE DEV UI` button.  From here you can manipulate a lot of the configuration of your running application.

Leave the terminal with `quarkus dev` running for now.  We'll be referring to it in the next steps:

### Working with the Live Developer Mode

1. Point your browser at [http://localhost:8080/hello](http://localhost:8080/hello){:target="_blank"}

   Note the output: `Hello from RESTEasy Reactive`

1. Import your new project into your IDE.

1. Open the file: `GreetingResource.java`

   ```java
   package org.acme;

   import javax.ws.rs.GET;
   import javax.ws.rs.Path;
   import javax.ws.rs.Produces;
   import javax.ws.rs.core.MediaType;

   @Path("/hello")
   public class GreetingResource {

      @GET
      @Produces(MediaType.TEXT_PLAIN)
      public String hello() {
         return "Hello from RESTEasy Reactive";
      }
   }
   ```

1. Make the following change:

   ```java
   package org.acme;

   import javax.ws.rs.GET;
   import javax.ws.rs.Path;
   import javax.ws.rs.Produces;
   import javax.ws.rs.core.MediaType;

   @Path("/hello")
   public class GreetingResource {

      @GET
      @Produces(MediaType.TEXT_PLAIN)
      public String hello() {
         return "Hello from Quarkus";
      }
   }
   ```

1. Save the file and reload your browser at: [http://localhost:8080/hello](http://localhost:8080/hello){:target="_blank"}

   Note that the output changed to: `Hello from Quarkus`

The application applied your changes in realtime!  Isn't that nice?

Now, take a look at the terminal where you have the Quarkus CLI running your live dev mode.

1. Note that the tests are now failing!

   Our code change broke a test.  So, let's fix it.

1. Open the file: `GreetingResourceTest.java` under the `src/test` directory tree.

   ```java
   package org.acme;

   import io.quarkus.test.junit.QuarkusTest;
   import org.junit.jupiter.api.Test;

   import static io.restassured.RestAssured.given;
   import static org.hamcrest.CoreMatchers.is;

   @QuarkusTest
   public class GreetingResourceTest {

      @Test
      public void testHelloEndpoint() {
         given()
            .when().get("/hello")
            .then()
               .statusCode(200)
               .body(is("Hello from RESTEasy Reactive"));
      }

   }
   ```

1. Notice the problem.  We changed the response body, so now the test fails.

1. Fix the test:

   ```java
   package org.acme;

   import io.quarkus.test.junit.QuarkusTest;
   import org.junit.jupiter.api.Test;

   import static io.restassured.RestAssured.given;
   import static org.hamcrest.CoreMatchers.is;

   @QuarkusTest
   public class GreetingResourceTest {

      @Test
      public void testHelloEndpoint() {
         given()
            .when().get("/hello")
            .then()
               .statusCode(200)
               .body(is("Hello from Quarkus"));
      }

   }
   ```

1. Save the file. 

   In the terminal window, Note that all tests are now passing. 

   Press `r` if you want it to re-run the tests.

There you have it...  Test Driven Development with live code reloading...  in it's simplest form.

### Create a More interesting Payload

One last thing for today.  Let's have our API return a `JSON` payload instead of `TEXT`.  After all, you are going to write very few if any APIs that respond with `TEXT_PLAIN`...  right?!?!?

1. Make sure that you are running dev mode in a terminal, if you stopped it above.

   ```bash
   quarkus dev
   ```

1. Add a file named `Greeting.java` to the same folder holding `GreetingResource.java`

   ```java
   package org.acme;

   import java.util.UUID;

   public class Greeting {

      private UUID greetingId;
      private String greeting;

      public Greeting() {
      }

      public Greeting(UUID greetingId, String greeting) {
         this.greetingId = greetingId;
         this.greeting = greeting;
      }

      public UUID getGreetingId() {
         return greetingId;
      }

      public void setGreetingId(UUID greetingId) {
         this.greetingId = greetingId;
      }

      public String getGreeting() {
         return greeting;
      }

      public void setGreeting(String greeting) {
         this.greeting = greeting;
      }
      
   }
   ```

1. Now, let's fix the test first this time:

   Modify `GreetingResourceTest.java` as follows:

   ```java
   package org.acme;

   import io.quarkus.test.junit.QuarkusTest;
   import org.junit.jupiter.api.Test;

   import static io.restassured.RestAssured.given;
   import static org.hamcrest.CoreMatchers.is;

   @QuarkusTest
   public class GreetingResourceTest {

      @Test
      public void testHelloEndpoint() {
         given()
            .when().get("/hello")
            .then()
               .statusCode(200).body("greeting", is("Hello There"));
      }
   }
   ```

1. Note that when you saved that file, the test fails.

   That's good.  Now we need to fix the code so that it passes the test.

1. Modify `GreetingResource.java` as follows:

   ```java
   package org.acme;

   import java.util.UUID;

   import javax.ws.rs.GET;
   import javax.ws.rs.Path;
   import javax.ws.rs.Produces;
   import javax.ws.rs.core.MediaType;

   @Path("/hello")
   public class GreetingResource {

      @GET
      @Produces(MediaType.APPLICATION_JSON)
      public Greeting hello() {
         return new Greeting(UUID.randomUUID(), "Hello There");
      }
   }
   ```

1. Note that the test still fails!!!

   What?!? Is something still wrong?

   Kind of.  We need to include the ability to marshal and unmarshal JSON.

1. Here's another hint at the problem:

   Point your browser at: [http://localhost:8080/hello](http://localhost:8080/hello){:target="_blank"}

   Note the arcane output.  That's not a JSON payload...  Looks to me like the reference address to an instance of `org.acme.Greeting`.

   While that is the object that we want to return, we want it to be returned as JSON.

1. We are missing a dependency now.  So, let's add `Jackson` to our project for handling JSON.

   I did this intentionally to show you yet another cool feature of the quarkus CLI.

1. In your terminal with Quarkus dev mode running, hit `q` to shut down dev mode.

1. Run this command to add the missing dependency:

   ```bash
   quarkus ext add resteasy-reactive-jackson
   ```

1. Restart dev mode:

   ```bash
   quarkus dev
   ```

1. Note that the application is rebuilt, and tests are again paused.

1. Press `r` in the dev mode terminal to resume tests, and note that this time the test passes.

1. Point your browser at: [http://localhost:8080/hello](http://localhost:8080/hello){:target="_blank"}

   Note the JSON output.

1. One last thing.

   Remember we installed JQ.  It is great for parsing JSON on the command line.

1. Here's a taste:

   Leave dev mode running and open a new terminal.

   Execute the following:

   ```bash
   curl http://localhost:8080/hello
   ```

   Note the JSON output.

   ```bash
   curl http://localhost:8080/hello | jq
   ```

   Isn't that nice?

That's it for today.  I'm going to try to keep these short so that I can create at least one post a week in this series.

## PS One More Thing

OK, if you are using Java 17, let's get rid of all of the boilerplate in our `Greeting` object.

Modify `Greeting.java` as follows:

```java
package org.acme;

import java.util.UUID;

public record Greeting(UUID greetingId, String greeting) {}
```

Save it, and verify that your test still passes, and that the API output still looks the same.

Nice!  Right!?  Love `record`.  It is awesome.

Now, we're really done.

Next time, we'll build our simple API Server and Client applications.
