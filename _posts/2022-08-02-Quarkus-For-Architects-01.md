---
title: "Quarkus for Architects who Sometimes Write Code - API Server & Client"
date:   2022-08-02 00:00:00 -0400
description: "Blog Series on writing Cloud Native Applications for OpenShift / Kubernetes with Quarkus - API Server & Client"
tags:
  - OpenShift
  - Kubernetes
  - Homelab
  - Home Lab
  - Quarkus REST Example
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

## Code the API Server

OK, let's write our API server.  Eventually we'll get to some API first development with the OpenAPI spec.  For now, what we're doing is so simple, it's not worth the extra lifting.  However, if you want to take a look at some good resources, check out this link: [Contract-First Development](https://appdev.consulting.redhat.com/tracks/contract-first/)

We're also going to ignore testing this week...  So, not TDD...

1. Create the API interface:

   Create a new file named `ServerApi.java` in the `api` folder: `src/main/java/fun/is/quarkus/apiserver/api`

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

   __Note:__ We're using the new `record` type introduced back in Java 14, I think?  It's now a supported part of the Java 17 LTE release.  It's a powerful and easy feature that eliminates a lot of boiler plate.

1. Create the API implementation:

   Create a new Class named `ApiService.java` in the `service` folder.

   Add the following content:

   ```java
   package fun.is.quarkus.apiserver.service;

   import java.util.UUID;

   import javax.enterprise.context.ApplicationScoped;
   import javax.ws.rs.core.Response;

   import org.jboss.logging.Logger;
   import fun.is.quarkus.apiserver.api.ServerApi;
   import fun.is.quarkus.apiserver.dto.MessageDto;

   @ApplicationScoped
   public class ApiService implements ServerApi {
    
       final Logger LOG = Logger.getLogger(ApiService.class);

       @Override
       public Response receiveMessage(MessageDto message) {
        
           LOG.info("Received Message: " + message);
           return(Response.ok(new MessageDto(UUID.randomUUID(), "Hello To You!")).build());
       }
   }
   ```

1. Add the application configuration:

   Modify the file `src/main/resources/application.yml` so that it looks like:

   ```yaml
   quarkus:
     application:
       name: apiServer
     http:
       port: ${PORT}
     log:
       level: "INFO"
       console:
         enable: true
   ```

   __Note:__ We'll be setting the http listen port via an environment variable.  This will be very useful later when we're deploying to OpenShift and setting our configuration via `ConfigMap`.

1. Now let's fire it up and test it out.

   Yes...  we could/should write tests...  We'll do that later.  After all, this is Quarkus for Architects who sometimes write code.  We preach about TDD, but do we practice it?  I'm hoping to get better at it, and you will too.

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/apiserver
   PORT=4080 quarkus dev --no-debug
   ```

1. Send a POST to the API resource:

   ```bash
   curl -X POST localhost:4080/api-test/message -H 'Content-Type: application/json' -d "{\"messageId\":\"$(uuidgen)\",\"message\":\"Hello Quarkus\"}" | jq
   ```

   Expect to see output similar to:

   ```json
   {
     "messageId": "d9b6efbd-5f83-4141-93a5-b016326030bf",
     "message": "Hello To You!"
   }
   ```

   __Note:__ if you don't have `jq` installed, you should.  It is very handy for dealing with JSON on the CLI.

That's it for the server.  Now let's build a client to call the server API resource.

## Code the API Client

The API Client needs to know the contract for the API.  If we had created an OpenAPI spec first, we could just use that.  But since we didn't, and we have the code for the server, that's not a problem.  We can literally copy it from the server.

1. Create the message payload, aka DTO.

   Create a file named `MessageDTO.java` in the client's `dto` folder, and populate it as follows:

   ```java
   package fun.is.quarkus.apiclient.dto;

   import java.util.UUID;

   public record MessageDto(UUID messageId, String message){}
   ```

   __Note:__ Other than the package name, it is identical to `MessageDto` in the server code.

1. Create the API interface that the client will connect to.

   OK.  This is where my own personal convention comes in.  The API server is a collaborator in the greater scheme of our little enterprise application.  So, when I prototype stuff like this, I put the API interfaces in a `collaborators` package.  For me, this makes it easy to distinguish between the APIs that a given piece of code is serving vs. consuming.

   Create a file named `ClientApi.java` in the `collaborators` folder, and populate it as follows:

   ```java
   package fun.is.quarkus.apiclient.colaborators;

   import javax.ws.rs.Consumes;
   import javax.ws.rs.POST;
   import javax.ws.rs.Path;
   import javax.ws.rs.core.MediaType;
   import javax.ws.rs.core.Response;

   import fun.is.quarkus.apiclient.dto.MessageDto;

   @Path("/api-test")
   public interface ClientApi {
    
       @POST
       @Path("/message")
       @Consumes(MediaType.APPLICATION_JSON)
       public Response receiveMessage(MessageDto message);
   }
   ```

   __Note:__ Take a look at the similarities and differences between the `ClientApi` and `ServerApi` interfaces.  The similarities are intentional.  They both define the exact same API resource.  The differences, like package name and interface name, are arbitrary.  Other than changing the package name, I could have copied the `ServerApi` code exactly.

   Now our client application knows how to talk to the server application via its API resource.  We'll tell the client how to find the API resource when we create the configuration.

1. Create the client's business logic:

   The last thing that we need is some sort of logic that invokes the server's API resource and does something useful.  Or, in this case, not very useful at all.  But maybe fun.  For a given value of fun...

   I'm going to reveal a little bit of what's to come here so that you get a glimpse at why I'm doing this.  I started out attempting to write a simple service for leader election across a multi-region app that needed a singleton processor for data or events.  I quickly realized that I needed to learn a few things to make it work properly.  Like I said, I write code but would never consider myself to be a software engineer.  Maybe a software tinkerer.

   So, in order to learn the new techniques that I needed, I started writing little snippets of working code that isolated the new idea that I was working on learning.  Thus the genesis of this blog series.  I decided to share the journey with you.

   OK. Let's create the logic for our client application.

   Create a file named `ClientApp.java` in the `apiclient` root folder, and populate it as follows.

   ```java
   package fun.is.quarkus.apiclient;

   import java.net.URI;
   import java.util.UUID;

   import javax.inject.Singleton;
   import javax.ws.rs.core.Response;

   import org.eclipse.microprofile.config.inject.ConfigProperty;
   import org.eclipse.microprofile.rest.client.RestClientBuilder;
   import org.jboss.logging.Logger;
   import fun.is.quarkus.apiclient.colaborators.ClientApi;
   import fun.is.quarkus.apiclient.dto.MessageDto;

   import io.quarkus.scheduler.Scheduled;

   @Singleton
   public class ClientApp {

       final Logger LOG = Logger.getLogger(ClientApp.class);

       @ConfigProperty(name = "api-server.url")
       private String url;
       
       @Scheduled(every = "{api-server.schedule}")
       public void sendMessage() {

           LOG.info("Scheduler Fired");
           MessageDto message = new MessageDto(UUID.randomUUID(), "Hello There");
           LOG.info("Sending message: " + message);
           ClientApi api = RestClientBuilder.newBuilder().baseUri(URI.create(this.url)).build(ClientApi.class);
           try {
               Response response = api.receiveMessage(message);
               LOG.info(response.getStatus());
               MessageDto responseMessage = response.readEntity(MessageDto.class);
               LOG.info(responseMessage);
           } catch (Exception e) {
               LOG.error(e.getMessage());
           }
       }
   }
   ```

   Take a few minutes to study this class.  There are a few things that I'll point out.

   1. I'm using `@Singleton` here for the scope of this class.  It will be instantiated as soon as the app starts, and there will only be one of it.

      Since we are using imperative coding here, the singleton nature of the class could cause problems with concurrency and blocking if this class gets complicated.

      We'll resolve that next time by switching to reactive code.

   1. The `sendMessage` method is going to be invoked on a schedule.  The timing will be provided by external configuration.  You'll see that in a bit.

   1. I'm not using `@RegisterRestClient` or `@RestClient` in this app.  Instead I am using `RestClientBuilder` to dynamically build the API client resource.

      I'm doing this because the leader elector will have to be able to call regionally dispersed instances of itself at changing URLs.

1. Now, let's configure that app.

   Modify the file `src/main/resources/application.yml` so that it looks like:

   ```yaml
   quarkus:
     application:
       name: apiClient
     http:
       port: ${PORT}
     log:
       level: "INFO"
       console:
         enable: true
   api-server:
     url: "${SERVER_URL}"
     schedule: "${HEARTBEAT}"
   ```

   __Note:__ We are externalizing the configuration values for the client's HTTP port, the API Server's URL, and the timing of the `sendMessage` method.

## Fire it all Up

1. It's time to see this little contraption at work.  If you still have the API server running from the previous section, then leave it alone.

   If you stopped the API server, go ahead and start it back up:

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/apiserver
   PORT=4080 quarkus dev --no-debug
   ```

1. Open a new terminal window, and start the API client application:

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/apiclient
   PORT=4090 SERVER_URL=http://localhost:4080 HEARTBEAT=10s quarkus dev --no-debug
   ```

1. You should see output from the Client app logs that looks like:

   ```bash
   2022-08-02 09:35:59,004 INFO  [fun.is.qua.api.ClientApp] (executor-thread-1) Scheduler Fired
   2022-08-02 09:35:59,005 INFO  [fun.is.qua.api.ClientApp] (executor-thread-1) Sending message: MessageDto[messageId=9de2b7d6-118a-4e72-8b24-51d0da8b24bb, message=Hello There]
   2022-08-02 09:35:59,019 INFO  [fun.is.qua.api.ClientApp] (executor-thread-1) 200
   2022-08-02 09:35:59,020 INFO  [fun.is.qua.api.ClientApp] (executor-thread-1) MessageDto[messageId=b5a459d4-0693-4139-9652-ec2b861d2d86, message=Hello To You!]
   ```

1. From the API server app you should see:

   ```bash
   2022-08-02 09:36:19,013 INFO  [fun.is.qua.api.ser.ApiService] (executor-thread-0) Received Message: MessageDto[messageId=acb292ee-4472-4daf-9baf-0858e6e4710b, message=Hello There]
   ```

1. The logs should progress with new request/response about every 10 seconds.

There you have it!

See you next time.  We'll switch from Imperative to Reactive.

Cheers.
