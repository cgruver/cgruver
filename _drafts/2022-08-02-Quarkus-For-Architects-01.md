---
title: "Quarkus for Architects who Sometimes Write Code - API Server & Client"
date:   2022-08-01 00:00:00 -0400
description: "Quarkus Services"
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
This is the second post in a series that I started to take you on a journey with me writing Quarkus applications with cloud native runtimes.

The first post is here: [Quarkus for Architects who Sometimes Write Code - Introduction](/blog%20post/quarkus%20series/2022/07/27/Quarkus-For-Architects-Intro.html){:target="_blank"}

This week we're going to write a simple API server and client.  The client is going to use an internal scheduler to fire its calls to the server.

## First: Install a helper script

I will also be using one of the utility scripts that I wrote for managing tasks in my own home lab.  You don't need to install the whole project right now, but you'll need it later if you decide to set up your own [OpenShift cluster](/home-lab/lab-intro/){:target="_blank"} and [developer tooling](https://upstreamwithoutapaddle.com/blog%20post/2022/06/25/API-Dev-Tools.html){:target="_blank"}.

The scripts and home lab configuration files are at: [https://github.com/cgruver/kamarotos](https://github.com/cgruver/kamarotos){:target="_blank"}

The only script from that bundle that we need is: [https://raw.githubusercontent.com/cgruver/kamarotos/main/bin/code](https://raw.githubusercontent.com/cgruver/kamarotos/main/bin/code){:target="_blank"}

Do the following to install it:

```bash
mkdir -p ${HOME}/okd-lab/bin
curl -o ${HOME}/okd-lab/bin/code -fsSL https://raw.githubusercontent.com/cgruver/kamarotos/main/bin/code
chmod 700 ${HOME}/okd-lab/bin/code
```

Now, edit your `~/.zshrc` or `~/.bashrc` file and add `${HOME}/okd-lab/bin` to your `$PATH`

For example:

```bash
echo "PATH=$PATH:${HOME}/okd-lab/bin" >> ~/.zshrc
```

The script that you just grabbed is very opinionated toward the way I like to organize my code when I am prototyping.  It also wraps the Quarkus CLI, and includes a couple of functions for adding properties and dependencies to a `pom.xml` file.  I really hate manually modifying the POM file...  It's just a quirk of mine...  so I wrote a couple of functions to do the most common tasks.

## Create the API Server and Client Projects

Let's go ahead and use this script to bootstrap two projects for us:

1. Create the API server project scaffolding:

   ```bash
   mkdir -p ${HOME}/okd-lab/quarkus-projects
   cd ${HOME}/okd-lab/quarkus-projects
   code --create -a=apiserver -g=fun.is.quarkus
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
   code --create -a=apiclient -g=fun.is.quarkus -x=scheduler
   ```

1. Add Mapstruct and Lombok dependencies to the POMs.

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/apiserver
   code --dependency -g=org.mapstruct -a=mapstruct -v=1.5.2.Final
   code --dependency -g=org.mapstruct -a=mapstruct-processor -v=1.5.2.Final
   code --dependency -g=org.projectlombok -a=lombok -v=1.18.24
   ```

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/apiclient
   code --dependency -g=org.mapstruct -a=mapstruct -v=1.5.2.Final
   code --dependency -g=org.mapstruct -a=mapstruct-processor -v=1.5.2.Final
   code --dependency -g=org.projectlombok -a=lombok -v=1.18.24
   ```

1. Make sure that the dependencies can be resolved and that everything is clean

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/apiserver
   mvn clean package
   cd ${HOME}/okd-lab/quarkus-projects/apiclient
   mvn clean package
   ```

1. Now, import these two projects into your IDE, and let's put some code in them.

## Code the API Server

OK, let's write our API server.  Eventually we'll get to some API first development with the OpenAPI spec.  For now, what we're doing is so simple, it's not worth the extra lifting.  However, if you want to take a look at some good resources, check out this link: [Contract-First Development](https://appdev.consulting.redhat.com/tracks/contract-first/)

We're also going to ignore testing this week...  So, not TDD...

1. Create the API interface:

   Create a new Interface named `ServerApi` in the `api` folder: `src/main/java/fun/is/quarkus/apiserver/api`

   Add the following content:

   ```java
   package fun.is.quarkus.apiserver.api;

   import javax.ws.rs.Consumes;
   import javax.ws.rs.POST;
   import javax.ws.rs.Path;
   import javax.ws.rs.core.MediaType;
   import javax.ws.rs.core.Response;

   import fun.is.quarkus.apiserver.dto.MessageDto;

   @Path("/api-test")
   public interface ServerApi {

       @POST
       @Path("/message")
       @Consumes(MediaType.APPLICATION_JSON)
       public Response receiveMessage(MessageDto message);
   }
   ```

1. Create the DTO:

   Create a new Record named `MessageDto` in the `dto` folder.

   Add the following content:

   ```java
   package fun.is.quarkus.apiserver.dto;

   import java.util.UUID;

   public record MessageDto(UUID messageId, String message){}
   ```

   Note: We're using the new `record` type introduced back in Java 14.  I think?

