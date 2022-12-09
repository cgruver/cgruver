---
title: "Quarkus for Architects who Sometimes Write Code - Introduction"
description: "Quarkus Application Development Examples"
sitemap: true
published: true
permalink: /tutorials/quarkus-for-architects-intro/
tags:
  - Quarkus Examples
  - Quarkus CLI
  - Quarkus Dev Mode Example
---

So...   I have written a few applications over the course of my career in IT.  But, I've never been a "real" Software Engineer.  That is to say, I've never been a coder on an application delivery team.  You can likely tell from the content of this blog, that I am more of a platform guy than a developer.  As I made the transition from platform engineer to architect, the code that I wrote was mainly for prototyping and teaching.  But, I find that knowing the principles of software engineering and design as well as platforms and security has been a huge help in my various roles as an enterprise architect.  It has given me a level of empathy for the Dev, Sec, & Ops roles that I would not otherwise have had.

I'm a huge fan of the Quarkus Java Framework.  Check it out here: [https://quarkus.io](https://quarkus.io){:target="_blank"}  It's a Java framework for Kubernetes native apps.  If you are familiar with Spring Boot, you'll find a lot to like about Quarkus.

__Note:__ I am assuming in this series that you are at least somewhat familiar with the Java programming language.

In this first section, we are going to set up our dev tools and create a simple Quarkus project.

## Set Up Your Dev Environment

Follow the instructions here: [Quarkus for Architects who Sometimes Write Code - Setup](/tutorials/quarkus-for-architects-dev-setup/){:target="_blank"}

## Now, Let's write some code

In this first project were going to write a very basic application.  No TLS.  No authentication.  just a very basic app.

We'll get familiar with the tooling and processes.

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

1. Make the output pretty with JQ:

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

## Switch from Class to Record

OK, if you are using Java 17, let's get rid of all of the boilerplate in our `Greeting` object.

Modify `Greeting.java` as follows:

```java
package org.acme;

import java.util.UUID;

public record Greeting(UUID greetingId, String greeting) {}
```

Save it, and verify that your test still passes, and that the API output still looks the same.

Nice!  Right!?  Love `record`.  It is awesome.

## Setting up the Developer Tools for the Quarkus Examples



## Create the API Server and Client Projects

Let's go ahead and use this script to bootstrap two projects for us:

1. Create the API server project scaffolding:

   ```bash
   mkdir -p ${HOME}/okd-lab/quarkus-projects
   cd ${HOME}/okd-lab/quarkus-projects
   code --create -b -a=apiserver -g=fun.is.quarkus
   ```

1. Take a look at what the script did:

   As I mentioned, this script wraps the Quarkus CLI to bootstrap your project structure.

   I am using it in an opinionated way:

   ```bash
   quarkus create app --maven --java=${JAVA_VER} --no-wrapper --no-code --package-name=${GROUP_ID}.${APP_NAME} --extensions=${BASE_EXTENSIONS}${ADD_EXTENSIONS} ${QUARKUS_VERSION} ${GROUP_ID}:${APP_NAME}:0.1
   ```

   The base extensions that I include by default are: `resteasy-reactive-jackson`, `rest-client-reactive-jackson`, `smallrye-health`, and `config-yaml`.

   I use `config-yaml` mainly just to remind folks that you can use YAML, and JSON for that matter, for your application config files.  While it creates a less compact file than the `path.property=value` that you are likely used to, it does lend itself to automation.

   You'll also notice that I'm using Maven, not Gradle.  No particular reason, I just haven't had a good reason to switch.  I don't have an opinion in the Gradle vs. Maven death match.

   I'm also creating an opinionated directory structure:

   ```bash
   apiserver
   ├── README.md
   ├── pom.xml
   └── src
       ├── main
       │   ├── docker
       │   │   ├── Dockerfile.jvm
       │   │   ├── Dockerfile.legacy-jar
       │   │   ├── Dockerfile.native
       │   │   └── Dockerfile.native-micro
       │   ├── java
       │   │   └── fun
       │   │       └── is
       │   │           └── quarkus
       │   │               └── apiserver
       │   │                   ├── aop
       │   │                   ├── api
       │   │                   ├── collaborators
       │   │                   ├── dto
       │   │                   ├── event
       │   │                   ├── mapper
       │   │                   ├── model
       │   │                   └── service
       │   └── resources
       │       └── application.yml
       └── test
           └── java
               └── fun
                   └── is
                       └── quarkus
                           └── apiserver
   ```

   The subdirectories under `src/main/java` are intended to be used as follows:

   | Directory | Description |
   | --- | --- |
   | `aop` | AOP Interceptors |
   | `api` | Java Interfaces that define the API resources exposed by this application |
   | `collaborators` | Java Interfaces that define the API resources consumed by this application |
   | `dto` | Java Record Interfaces that define the JSON payloads produced or consumed by this application |
   | `event` | Messaging handlers, for example: Kafka or Event Bus |
   | `mapper` | Java Interfaces that define Mapstruct mappings from DTO to Entity |
   | `model` | The Entity objects that define the persistence model for this application |
   | `service` | The Objects that contain the business logic for this application |

   Love it or hate it...  This is how I like to organize my code.  So, there you have it.  ;-)

1. Now that we've reviewed the structure, create the API client application:

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects
   code --create -b -a=apiclient -g=fun.is.quarkus -x=scheduler
   ```

1. Add Mapstruct and Lombok dependencies to the POMs.

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/apiserver
   code --dependency -g=org.mapstruct -a=mapstruct -v=1.5.2.Final
   code --dependency -g=org.mapstruct -a=mapstruct-processor -v=1.5.2.Final
   code --dependency -g=org.projectlombok -a=lombok -v=1.18.24
   code --dependency -g=org.projectlombok -a=lombok-mapstruct-binding -v=0.2.0
   ```

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/apiclient
   code --dependency -g=org.mapstruct -a=mapstruct -v=1.5.2.Final
   code --dependency -g=org.mapstruct -a=mapstruct-processor -v=1.5.2.Final
   code --dependency -g=org.projectlombok -a=lombok -v=1.18.24
   code --dependency -g=org.projectlombok -a=lombok-mapstruct-binding -v=0.2.0
   ```

   __Note:__ We're not going to use Lombok or Mapstruct this week, but they'll be there when we add more functionality next week.  Plus, I just wanted you to use my helper script to add some dependencies to your `pom.xml`...

1. Make sure that the dependencies can be resolved and that everything is clean

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/apiserver
   mvn clean package
   cd ${HOME}/okd-lab/quarkus-projects/apiclient
   mvn clean package
   ```

1. Now, import these two projects into your IDE, and let's put some code in them.
