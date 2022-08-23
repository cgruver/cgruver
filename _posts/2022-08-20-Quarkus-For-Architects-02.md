---
title: "Quarkus for Architects who Sometimes Write Code - It's OK To Be Reactive"
date:   2022-08-20 00:00:00 -0400
description: "Blog Series on writing Cloud Native Applications for OpenShift / Kubernetes with Quarkus - Reactive API Server"
tags:
  - OpenShift
  - Kubernetes
  - Quarkus Reactive Example
  - Quarkus Mapstruct
  - Quarkus Lombok
categories:
  - Blog Post
  - Quarkus Series
---
__Note:__ This is the third post in a series.  While the code in this post stands alone, I am using some tooling introduced in earlier posts:

1. [Quarkus for Architects who Sometimes Write Code - Introduction](/blog%20post/quarkus%20series/2022/07/27/Quarkus-For-Architects-Intro.html){:target="_blank"}

1. [Quarkus for Architects who Sometimes Write Code - API Server & Client](/blog%20post/quarkus%20series/2022/08/02/Quarkus-For-Architects-01.html){:target="_blank"}

## Today we're going to do something fairly complex, and completely useless 

Have I mentioned that I'm an enterprise architect?...

In this post, we're going to use reactive techniques to build a singleton application which will send heartbeats to clones of itself and monitor the responses.  Each instance of the app will talk to the other instances, as well as to itself.  The app will track the online/offline state of the other instances.

We're going to demonstrate several Quarkus capabilities:

* Reactive REST API with `io.smallrye.mutiny.Uni`
* Handling failure in asynchronous tasks with `io.smallrye.mutiny.groups.UniOnTimeout.failWith`
* Using `javax.ws.rs.core.Response` in APIs
* Scheduled execution of methods with `io.quarkus.scheduler.Scheduled`
* Intra-App Messaging with `io.vertx.mutiny.core.eventbus.EventBus`
* Application Lifecycle with `io.quarkus.runtime.StartupEvent`
* DTO to Entity mapping with `org.mapstruct.Mapper`
* ...and Lombok, just because I like a bit of controversy...  ...and I like Lombok...  ;-)

It's also worth noting, that while there are tutorial aspects to these posts, they are not intended to be stand-alone tutorials.  Rather, they are more demonstrations of capabilities.  Where relevant, I am including links to the underlying documentation so that you can explore further on your own.

1. __Create the project scaffolding:__

   Use the tooling that I introduced in the last post to create the project for this application.

   ```bash
   mkdir -p ${HOME}/okd-lab/quarkus-projects
   cd ${HOME}/okd-lab/quarkus-projects
   code --create -a=italktomyself -g=fun.is.quarkus -x=scheduler
   cd ${HOME}/okd-lab/quarkus-projects/italktomyself
   code --dependency -g=org.mapstruct -a=mapstruct -v=1.5.2.Final
   code --dependency -g=org.mapstruct -a=mapstruct-processor -v=1.5.2.Final
   code --dependency -g=org.projectlombok -a=lombok -v=1.18.24
   code --dependency -g=org.projectlombok -a=lombok-mapstruct-binding -v=0.2.0
   ```

1. __Import the project into your IDE of choice.__

   FWIW, I'm using VS Code.  [https://code.visualstudio.com](https://code.visualstudio.com){:target="_blank"}

## Create the application

Once again, we're going to dive straight into the code...  No TDD, BDD, or contract first.

Please don't tell my friend... [https://developers.redhat.com/articles/2021/11/08/test-driven-development-quarkus](https://developers.redhat.com/articles/2021/11/08/test-driven-development-quarkus){:target="_blank"}.

BTW, there's a ton of useful information in that link above.

### OK, On To The Code

1. __Create the API interface:__

   Create an interface named `TalkToMyselfApi.java` in the folder: `src/main/java/fun/is/quarkus/italktomyself/api` 

   Add the following code:

   ```java
   package fun.is.quarkus.italktomyself.api;

   import javax.ws.rs.Produces;
   import javax.ws.rs.Consumes;
   import javax.ws.rs.GET;
   import javax.ws.rs.POST;
   import javax.ws.rs.Path;
   import javax.ws.rs.core.MediaType;
   import javax.ws.rs.core.Response;

   import fun.is.quarkus.italktomyself.dto.HeartBeatDto;
   import io.smallrye.mutiny.Uni;

   @Path("/i-talk-to-myself")
   public interface TalkToMyselfApi {
       
       @Path("/heartbeat")
       @POST
       @Consumes(MediaType.APPLICATION_JSON)
       @Produces(MediaType.APPLICATION_JSON)
       public Uni<Response> heartbeat(HeartBeatDto heartbeat);

       @Path("/status")
       @GET
       @Produces(MediaType.APPLICATION_JSON)
       public Uni<Response> getStatus();

       @Path("/no-reply")
       @GET
       @Produces(MediaType.APPLICATION_JSON)
       public Uni<Response> getPendingHeartbeats();
       
       @Path("/sleep")
       @POST
       public Response sleep();

       @Path("/wake")
       @POST
       public Response wake();
   }
   ```

   ___Note:___ Here we are introducing the `Uni` type which is the key to our reactive vs. imperative code.

   Check it out here: [https://quarkus.io/guides/rest-json#reactive](https://quarkus.io/guides/rest-json#reactive){:target="_blank"}  This guide has links to deeper documentation as well.

1. __Create the DTOs:__

   ___Note:___ As before, we are taking advantage of the relatively new `record` type in Java.

    Useful Guide: [https://www.baeldung.com/java-record-keyword](https://www.baeldung.com/java-record-keyword){:target="_blank"}

   Create the following records in the path: `src/main/java/fun/is/quarkus/italktomyself/dto`

   ___`HeartBeatDto.java`___

   ```java
   package fun.is.quarkus.italktomyself.dto;

   import java.util.UUID;

   public record HeartBeatDto(UUID sender, UUID messageId, String url) {}
   ```

   ___`InstanceOfMeDto.java`___

   ```java
   package fun.is.quarkus.italktomyself.dto;

   import java.util.UUID;

   public record InstanceOfMeDto(UUID instanceId, String url, boolean active) {}
   ```

   ___`ReplyDto.java`___

   ```java
   package fun.is.quarkus.italktomyself.dto;

   import java.util.UUID;

   public record ReplyDto(UUID sender, UUID replyId, UUID messageId, String url) {}
   ```

   ___`NoReplyDto.java`___

   ```java
   package fun.is.quarkus.italktomyself.dto;

   import java.util.List;
   import java.util.UUID;

   public record NoReplyDto(UUID instanceId, List<HeartBeatDto>noReply) {}
   ```

   ___`StatusDto.java`___

   ```java
   package fun.is.quarkus.italktomyself.dto;

   import java.util.List;
   import java.util.UUID;

   public record StatusDto(UUID instanceId, List<InstanceOfMeDto> instances) {}
   ```

1. Create the Model:

   Create the following classes in the path: `src/main/java/fun/is/quarkus/italktomyself/model`

   ___`HeartBeat.java`___

   ```java
   package fun.is.quarkus.italktomyself.model;

   import java.util.UUID;
   import lombok.AllArgsConstructor;
   import lombok.Data;
   import lombok.NoArgsConstructor;

   @Data
   @AllArgsConstructor
   @NoArgsConstructor
   public class HeartBeat {
       UUID sender;
       UUID messageId;
       String url;
   }
   ```

   ___`InstanceOfMe.java`___

   ```java
   package fun.is.quarkus.italktomyself.model;

   import java.util.UUID;

   import lombok.AllArgsConstructor;
   import lombok.Data;
   import lombok.NoArgsConstructor;

   @Data
   @AllArgsConstructor
   @NoArgsConstructor
   public class InstanceOfMe {
       
       UUID instanceId;
       boolean active;
   }
   ```

   ___Note:___ These are Lombok annotated POJOs, not Entity objects.  We're not using a persistence layer in this application.  All state will be ephemeral within a given instance of the application.

   If you are not familiar with Project Lombok, check it out here: [https://projectlombok.org](https://projectlombok.org)

   Lombok is a great tool for eliminating a lot of boiler plate code.  As you can see from the minimal content in our Model classes.  Some developers love, some hate it...  If you are bored, Google it and enjoy the flame wars...

   For the record, I love it...

   But, as stated I'm also an architect who sometimes writes code.

1. __Create a Mapper to convert between the Model and the DTOs__

   Create an interface named `DtoMapper.java` in the folder: `src/main/java/fun/is/quarkus/italktomyself/mapper`

   Add the following code:

   ```java
   package fun.is.quarkus.italktomyself.mapper;

   import java.util.UUID;
   import org.mapstruct.Mapper;
   import org.mapstruct.Mapping;
   import fun.is.quarkus.italktomyself.dto.HeartBeatDto;
   import fun.is.quarkus.italktomyself.dto.InstanceOfMeDto;
   import fun.is.quarkus.italktomyself.model.HeartBeat;
   import fun.is.quarkus.italktomyself.model.InstanceOfMe;

   @Mapper(componentModel = "cdi")
   public interface DtoMapper {
       HeartBeat dtoToHeartBeat(HeartBeatDto dto);
       HeartBeatDto heartBeatToDto(HeartBeat heartbeat);
       
       @Mapping(target = "url", source = "url")
       InstanceOfMeDto instanceOfMeToDto(String url, InstanceOfMe instance);
   }
   ```

   MapStruct is a fantastic tool for generating mappings between DTO and Entity objects.  It allows you to maintain the separation of concerns between the inner workings of your code and the edge resources provided by your code.

   Check out the full project documentation here: [https://mapstruct.org](https://mapstruct.org)

1. __Create the implementation of the API interface:__

   Create a class named: `TalkToMyselfService.java` in the folder: `src/main/java/fun/is/quarkus/italktomyself/service`

   Add the following code:

   ```java
   package fun.is.quarkus.italktomyself.service;

   import javax.enterprise.context.ApplicationScoped;
   import javax.inject.Inject;
   import javax.ws.rs.core.Response;

   import fun.is.quarkus.italktomyself.api.TalkToMyselfApi;
   import fun.is.quarkus.italktomyself.dto.HeartBeatDto;
   import io.smallrye.mutiny.Uni;
   import io.vertx.mutiny.core.eventbus.EventBus;

   import org.jboss.logging.Logger;

   @ApplicationScoped
   public class TalkToMyselfService implements TalkToMyselfApi {

       final Logger LOG = Logger.getLogger(TalkToMyselfService.class);

       @Inject
       EventBus eventBus;

       @Override
       public Uni<Response> heartbeat(HeartBeatDto heartbeat) {
           return eventBus.<HeartBeatDto>request("receive-heartbeat", heartbeat).onItem().transform(item -> Response.ok(item.body()).build());
       }

       @Override
       public Uni<Response> getStatus() {
           return eventBus.request("status", null).onItem().transform(item -> Response.ok(item.body()).build());
       }

       @Override
       public Uni<Response> getPendingHeartbeats() {
           return eventBus.request("no-response", null).onItem().transform(item -> Response.ok(item.body()).build());
       }

       @Override
       public Response sleep() {
           eventBus.send("sleep", true);
           return Response.ok().build();
       }

       @Override
       public Response wake() {
           eventBus.send("sleep", false);
           return Response.ok().build();
       }
   }
   ```

1. __Create the application logic:__

   Create a class named `TalkToMyselfApp.java` in the folder: `src/main/java/fun/is/quarkus/italktomyself`

   ```java
   package fun.is.quarkus.italktomyself;

   import java.net.URI;
   import java.time.Duration;
   import java.util.ArrayList;
   import java.util.Collections;
   import java.util.HashMap;
   import java.util.List;
   import java.util.Map;
   import java.util.UUID;
   import javax.enterprise.event.Observes;
   import javax.inject.Inject;
   import javax.inject.Singleton;
   import javax.ws.rs.core.Response;
   import org.eclipse.microprofile.config.inject.ConfigProperty;
   import org.eclipse.microprofile.rest.client.RestClientBuilder;
   import org.jboss.logging.Logger;
   import fun.is.quarkus.italktomyself.api.TalkToMyselfApi;
   import fun.is.quarkus.italktomyself.dto.HeartBeatDto;
   import fun.is.quarkus.italktomyself.dto.InstanceOfMeDto;
   import fun.is.quarkus.italktomyself.dto.NoReplyDto;
   import fun.is.quarkus.italktomyself.dto.ReplyDto;
   import fun.is.quarkus.italktomyself.dto.StatusDto;
   import fun.is.quarkus.italktomyself.mapper.DtoMapper;
   import fun.is.quarkus.italktomyself.model.HeartBeat;
   import fun.is.quarkus.italktomyself.model.InstanceOfMe;
   import io.quarkus.runtime.StartupEvent;
   import io.quarkus.scheduler.Scheduled;
   import io.quarkus.vertx.ConsumeEvent;

   @Singleton
   public class TalkToMyselfApp {

       final Logger LOG = Logger.getLogger(TalkToMyselfApp.class);

       Map<String, InstanceOfMe> instances;

       Map<UUID, HeartBeat> pendingHeartbeats;

       @ConfigProperty(name = "instance-of-me.servers")
       List<String> serviceUrls;

       boolean pause;

       UUID myInstanceId;

       @Inject
       DtoMapper mapper;

       void startUp(@Observes StartupEvent startupEvent) {
           myInstanceId = UUID.randomUUID();
           instances = Collections.synchronizedMap(new HashMap<String, InstanceOfMe>());
           pendingHeartbeats = Collections.synchronizedMap(new HashMap<UUID, HeartBeat>());
       }

       @ConsumeEvent("receive-heartbeat")
       public ReplyDto receiveHeartbeat(HeartBeatDto heartbeat) {
           LOG.info("Received Heartbeat From Event Bus: " + heartbeat);
           if (this.pause) {
               LOG.info("Simulating Slow Response with 2500ms pause.");
               try {
                   Thread.sleep(1500);
               } catch (Exception e) {
                   LOG.error(e.getMessage() + e.getCause().getMessage());
               }
           }
           ReplyDto reply = new ReplyDto(myInstanceId, UUID.randomUUID(), heartbeat.messageId(), heartbeat.url());
           LOG.info("Sending Reply: " + reply + " To: " + heartbeat.sender());
           return reply;
       }

       @ConsumeEvent("status")
       public StatusDto status(Object noValue) {

           List<InstanceOfMeDto> instanceDtos = new ArrayList<InstanceOfMeDto>();
           for (String key : instances.keySet()) {
               LOG.info("Status Instances: " + key + instances.get(key));
               instanceDtos.add(mapper.instanceOfMeToDto(key, instances.get(key)));
           }
           
           StatusDto status = new StatusDto(myInstanceId, instanceDtos);
           return status;
       }

       @ConsumeEvent("no-response")
       public NoReplyDto getPendingHeartbeats(Object noValue) {
           
           List<HeartBeatDto> hBeatDtos = new ArrayList<HeartBeatDto>();
           for (HeartBeat hb : pendingHeartbeats.values()) {
               hBeatDtos.add(mapper.heartBeatToDto(hb));
           }
           NoReplyDto dto = new NoReplyDto(myInstanceId, hBeatDtos);
           return dto;
       }

       @ConsumeEvent("sleep")
       public void sleep(boolean sleep) {
           this.pause = sleep;
       }

       @Scheduled(every = "{instance-of-me.schedule}")
       public void heartbeat() {
           LOG.info("Scheduler Fired");
           for (String url : serviceUrls) {
               HeartBeat hb = new HeartBeat(myInstanceId, UUID.randomUUID(), url);
               pendingHeartbeats.put(hb.getMessageId(), hb);
               TalkToMyselfApi api = RestClientBuilder.newBuilder().baseUri(URI.create(url)).build(TalkToMyselfApi.class);
               LOG.info("Sending Heartbeat: " + hb + " To: " + url);
               api.heartbeat(mapper.heartBeatToDto(hb)).ifNoItem().after(Duration.ofMillis(1000)).failWith(new Exception("Request Timeout")).subscribe().with(reply -> processHbReply(reply), fail -> handleFailure(hb, fail));
           }
       }

       private void processHbReply(Response response) {
           ReplyDto reply = response.readEntity(ReplyDto.class);
           LOG.info("Received HB Reply: " + response.getStatus() + " From: " + reply.sender());
           pendingHeartbeats.remove(reply.messageId());
           instances.put(reply.url(), new InstanceOfMe(reply.sender(), true));
       }

       private void handleFailure(HeartBeat hb, Throwable error) {
           LOG.error("Failed sending heartbeat: " + hb + " To: " + hb.getUrl() + " With Error: " + error.getMessage());
           if(instances.containsKey(hb.getUrl())) {
               InstanceOfMe instance = instances.get(hb.getUrl());
               instance.setActive(false);
               instances.put(hb.getUrl(), instance);
           }
       }
   }
   ```

   There are several noteworthy things in this bit of code:

   1. `@ConfigProperty(name = "instance-of-me.servers")`

      Notice that it's not mapping a single configuration property.  It's mapping a List of properties.

      Check out more here: [https://quarkus.io/guides/config](https://quarkus.io/guides/config), and here: [https://quarkus.io/guides/config-mappings](https://quarkus.io/guides/config-mappings)

   1. `@Observes StartupEvent`: `io.quarkus.runtime.StartupEvent`

      We're reacting to an application lifecycle event here.  Specifically the `StartupEvent`

      This is a way that we can set some initial state, or perform other logic when the application starts.

      As expected, there is also a ShutdownEvent.

      [https://quarkus.io/guides/lifecycle](https://quarkus.io/guides/lifecycle)

   1. `@ConsumeEvent`: `io.quarkus.vertx.ConsumeEvent`

      This is how we are connecting to the messages on the EventBus.

      [https://quarkus.io/guides/reactive-event-bus](https://quarkus.io/guides/reactive-event-bus)

   1. `@Scheduled`: `io.quarkus.scheduler.Scheduled`

      Firing timed logic. [https://quarkus.io/guides/scheduler](https://quarkus.io/guides/scheduler)

   1. `RestClientBuilder`: `org.eclipse.microprofile.rest.client.RestClientBuilder`

      Dynamically building instances of API resources. [https://quarkus.io/guides/rest-client-reactive#programmatic-client-creation-with-restclientbuilder](https://quarkus.io/guides/rest-client-reactive#programmatic-client-creation-with-restclientbuilder)

   1. `...ifNoItem().after(Duration.ofMillis(1000)).failWith...`

      Controlling the API interaction and handling failure with additional logic.  [https://smallrye.io/smallrye-mutiny/1.7.0/](https://smallrye.io/smallrye-mutiny/1.7.0/)

### Create the Configuration

Before we can run the application, we need to create the `application.yml` content:

Modify the file `src/main/resources/application.yml` so that it looks like:

```yaml
quarkus:
  application:
    name: reactiveApp
  http:
    port: ${SERVER_PORT}
  log:
    level: "INFO"
    console:
      enable: true
instance-of-me:
  servers:
  - http://localhost:4070
  - http://localhost:4080
  - http://localhost:4090
  schedule: "10s"
```

Remeber `@ConfigProperty(name = "instance-of-me.servers")` from the app code above.  Note the YAML list of servers in the `application.yml`.  This is how they are wired together.

## Let's Take A Look At What We Just Built

OK, to run this you are going to need 4 terminals.  We're going to run three instances of this app.  Each instance is going to send a heartbeat DTO to the `heartbeat` resource of each of the servers listed in the config file.  So, each instance of the app is going to talk to the other two, and itself, through the heartbeat API resource.

Each instance will keep track of the state of the other instances.  That state `boolean active` will be visible via the `status` resource.

Unanswered heartbeat messages will be visible via the `no-reply` resource.

The `sleep` and `wake` resources are a really stupid way to create a response timeout...  But, by doing so we get to see the failure handling in action.

### Fire up this useless app

1. Open 4 terminals:

   ![Terminals](/_pages/tutorials/quarkus-for-architects/images/four-terminals.png)

1. In the first three terminals:

   `cd ${HOME}/okd-lab/quarkus-projects/italktomyself`

1. In the first terminal:

   ```bash
   SERVER_PORT=4070 quarkus dev --no-debug
   ```

1. In the second terminal:

   ```bash
   SERVER_PORT=4080 quarkus dev --no-debug
   ```

1. In the third terminal:

   ```bash
   SERVER_PORT=4090 quarkus dev --no-debug
   ```

1. Three instances of the app should now be running.

   There will have been some errors reported from the first two instances.  This is expected.

   ![Running Instances](/_pages/tutorials/quarkus-for-architects/images/i-talk-to-myself-running.png)

1. Check the status of the three instances:

   ```bash
   for i in 4070 4080 4090
   do
     curl localhost:${i}/i-talk-to-myself/status
   done | jq
   ```

   You should see output similar to:

   ```json
   {
     "instanceId": "841a65d3-3556-420d-a020-a360397fa3fa",
     "instances": [
       {
         "instanceId": "841a65d3-3556-420d-a020-a360397fa3fa",
         "url": "http://localhost:4070",
         "active": true
       },
       {
         "instanceId": "59f59d62-56e3-4d3f-8e07-4d4a3a1336f5",
         "url": "http://localhost:4080",
         "active": true
       },
       {
         "instanceId": "7daf9ab4-2f21-4def-af12-8e802999f1c2",
         "url": "http://localhost:4090",
         "active": true
       }
     ]
   }
   {
     "instanceId": "59f59d62-56e3-4d3f-8e07-4d4a3a1336f5",
     "instances": [
       {
         "instanceId": "841a65d3-3556-420d-a020-a360397fa3fa",
         "url": "http://localhost:4070",
         "active": true
       },
       {
         "instanceId": "59f59d62-56e3-4d3f-8e07-4d4a3a1336f5",
         "url": "http://localhost:4080",
         "active": true
       },
       {
         "instanceId": "7daf9ab4-2f21-4def-af12-8e802999f1c2",
         "url": "http://localhost:4090",
         "active": true
       }
     ]
   }
   {
     "instanceId": "7daf9ab4-2f21-4def-af12-8e802999f1c2",
     "instances": [
       {
         "instanceId": "841a65d3-3556-420d-a020-a360397fa3fa",
         "url": "http://localhost:4070",
         "active": true
       },
       {
         "instanceId": "59f59d62-56e3-4d3f-8e07-4d4a3a1336f5",
         "url": "http://localhost:4080",
         "active": true
       },
       {
         "instanceId": "7daf9ab4-2f21-4def-af12-8e802999f1c2",
         "url": "http://localhost:4090",
         "active": true
       }
     ]
   }
   ```

   Note that each of the instances records itself among the active instances.

1. Now, cause one of the instances to be "slow":

   ```bash
   curl -X POST localhost:4070/i-talk-to-myself/sleep
   ```

   Note that the all three instances start recording a `Request Timeout` from the application at `localhost:4070`

   ```bash
   2022-08-19 16:03:22,005 ERROR [fun.is.qua.ita.TalkToMyselfApp] (executor-thread-5) Failed sending heartbeat: HeartBeat(sender=59020124-5602-4979-8d14-e0f450802998, messageId=4c1670ee-6ed6-4581-93fe-b80541dfcc72, url=http://localhost:4070) To: http://localhost:4070 With Error: Request Timeout
   2022-08-19 16:03:23,016 INFO  [fun.is.qua.ita.TalkToMyselfApp] (vert.x-eventloop-thread-3) Received Heartbeat From Event Bus: HeartBeatDto[sender=145a3623-a687-4386-84eb-f4ffce9fd953, messageId=adf87b16-c3e8-4597-a6e4-2d292e7f7faa, url=http://localhost:4080]
   ```

1. Check the status again:

   ```bash
   for i in 4070 4080 4090
   do
     curl localhost:${i}/i-talk-to-myself/status
   done | jq
   ```

   You should see output similar to:

   ```json
   {
     "instanceId": "841a65d3-3556-420d-a020-a360397fa3fa",
     "instances": [
       {
         "instanceId": "841a65d3-3556-420d-a020-a360397fa3fa",
         "url": "http://localhost:4070",
         "active": false
       },
       {
         "instanceId": "59f59d62-56e3-4d3f-8e07-4d4a3a1336f5",
         "url": "http://localhost:4080",
         "active": true
       },
       {
         "instanceId": "7daf9ab4-2f21-4def-af12-8e802999f1c2",
         "url": "http://localhost:4090",
         "active": true
       }
     ]
   }
   {
     "instanceId": "59f59d62-56e3-4d3f-8e07-4d4a3a1336f5",
     "instances": [
       {
         "instanceId": "841a65d3-3556-420d-a020-a360397fa3fa",
         "url": "http://localhost:4070",
         "active": false
       },
       {
         "instanceId": "59f59d62-56e3-4d3f-8e07-4d4a3a1336f5",
         "url": "http://localhost:4080",
         "active": true
       },
       {
         "instanceId": "7daf9ab4-2f21-4def-af12-8e802999f1c2",
         "url": "http://localhost:4090",
         "active": true
       }
     ]
   }
   {
     "instanceId": "7daf9ab4-2f21-4def-af12-8e802999f1c2",
     "instances": [
       {
         "instanceId": "841a65d3-3556-420d-a020-a360397fa3fa",
         "url": "http://localhost:4070",
         "active": false
       },
       {
         "instanceId": "59f59d62-56e3-4d3f-8e07-4d4a3a1336f5",
         "url": "http://localhost:4080",
         "active": true
       },
       {
         "instanceId": "7daf9ab4-2f21-4def-af12-8e802999f1c2",
         "url": "http://localhost:4090",
         "active": true
       }
     ]
   }
   ```

   It may take a few seconds for all three instance to show `"active": false` for `http://localhost:4070`.

1. Resolve the slowness.

   ```bash
   curl -X POST localhost:4070/i-talk-to-myself/wake
   ```

   Note that all of the instances are healthy again.

1. Now kill the instance at `http://localhost:4070`

   Type `q` in the first terminal, or hit `ctrl c` to stop the app.

1. Check the status of the app at `http://localhost:4090`

   ```bash
   curl localhost:4090/i-talk-to-myself/status | jq
   ```

   Note that the instance at `http://localhost:4070` is inactive.  It may take a few seconds to reflect the change.  Remember, the scheduled task runs every 10 seconds.

   ```json
   {
     "instanceId": "145a3623-a687-4386-84eb-f4ffce9fd953",
     "instances": [
       {
         "instanceId": "4cbbf605-9a36-413a-83be-f5aa7e46fe67",
         "url": "http://localhost:4070",
         "active": false
       },
       {
         "instanceId": "59020124-5602-4979-8d14-e0f450802998",
         "url": "http://localhost:4080",
         "active": true
       },
       {
         "instanceId": "145a3623-a687-4386-84eb-f4ffce9fd953",
         "url": "http://localhost:4090",
         "active": true
       }
     ]
   }
   ```

1. Restart the instance at `http://localhost:4070`

   In the first terminal, restart the app:

   ```bash
   SERVER_PORT=4070 quarkus dev --no-debug
   ```

1. Check the status of the app at `http://localhost:4090`

   ```bash
   curl localhost:4090/i-talk-to-myself/status | jq
   ```

   Note that the instance at `http://localhost:4070` is active, but with a different `instanceId`

   ```json
   {
     "instanceId": "145a3623-a687-4386-84eb-f4ffce9fd953",
     "instances": [
       {
         "instanceId": "aba2a213-adf5-4359-a953-dc38d48937c3",
         "url": "http://localhost:4070",
         "active": true
       },
       {
         "instanceId": "59020124-5602-4979-8d14-e0f450802998",
         "url": "http://localhost:4080",
         "active": true
       },
       {
         "instanceId": "145a3623-a687-4386-84eb-f4ffce9fd953",
         "url": "http://localhost:4090",
         "active": true
       }
     ]
   }
   ```

1. Finally, play around with stopping and starting instances, or causing them to sleep.

   Check the unanswered heartbeats:

   ```bash
   curl localhost:4070/i-talk-to-myself/no-reply | jq
   ```

   You will see an output that contains all of the heartbeat messages that went unanswered from a particular instance.

   ```json
   {
     "instanceId": "d3abe7f0-9d66-4256-b613-07b4cf3e86c9",
     "noReply": [
       {
         "sender": "d3abe7f0-9d66-4256-b613-07b4cf3e86c9",
         "messageId": "61b17de6-186e-4439-ba48-4b2c71c8a9cd",
         "url": "http://localhost:4090"
       },
       {
         "sender": "d3abe7f0-9d66-4256-b613-07b4cf3e86c9",
         "messageId": "c679b114-c4e2-459d-b9f9-a38f735e495c",
         "url": "http://localhost:4090"
       },
       {
         "sender": "d3abe7f0-9d66-4256-b613-07b4cf3e86c9",
         "messageId": "83ba2301-240f-40dc-82d5-4895b1279f61",
         "url": "http://localhost:4080"
       }
     ]
   }
   ```

## That's it for now

See you next week.
