---
title: "Quarkus for Architects who Sometimes Write Code - It's OK To Be Reactive"
date:   2022-08-03 00:00:00 -0400
description: "Blog Series on writing Cloud Native Applications for OpenShift / Kubernetes with Quarkus - Reactive API Server"
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

1. Create the project scaffolding:

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

1. Import the project into your IDE of choice.  FWIW, I'm using VS Code.

## Create the application

1. Create the API interface

   Create an interface at: `src/main/java/fun/is/quarkus/italktomyself/api` named `TalkToMyselfApi.java`

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

   __Note:__ Here we are introducing the `Uni` type which is the key to our reactive vs. imperative code.

   Check it out here: [https://quarkus.io/guides/rest-json#reactive](https://quarkus.io/guides/rest-json#reactive), and here: [https://smallrye.io/smallrye-mutiny/1.7.0/](https://smallrye.io/smallrye-mutiny/1.7.0/)

1. Create the DTOs

   __Note:__ As before, we are taking advantage of the relatively new `record` type in Java.

   The following DTOs will be created in: `src/main/java/fun/is/quarkus/italktomyself/dto`

   `HeartBeatDto.java`

   ```java
   package fun.is.quarkus.italktomyself.dto;

   import java.util.UUID;

   public record HeartBeatDto(UUID sender, UUID messageId, String url) {}
   ```

   `InstanceOfMeDto.java`

   ```java
   package fun.is.quarkus.italktomyself.dto;

   import java.util.UUID;

   public record InstanceOfMeDto(UUID instanceId, String url, boolean active) {}
   ```

   `ReplyDto.java`

   ```java
   package fun.is.quarkus.italktomyself.dto;

   import java.util.UUID;

   public record ReplyDto(UUID sender, UUID replyId, UUID messageId, String url) {}
   ```

   `StatusDto.java`

   ```java
   package fun.is.quarkus.italktomyself.dto;

   import java.util.List;
   import java.util.UUID;

   public record StatusDto(UUID instanceId, List<InstanceOfMeDto> instances) {}
   ```

1. Create the Model:

   The following classes will be created in: `src/main/java/fun/is/quarkus/italktomyself/model`

   `HeartBeat.java`

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

   `InstanceOfMe.java`

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

   __Note:__ These are Lombok annotated POJOs, not Entity objects.  We're not using a persistence layer in this application.  All state will be ephemeral within a given instance of the application.

   If you are not familiar with Project Lombok, check it out here: [https://projectlombok.org](https://projectlombok.org)

   Lombok is a great tool for eliminating a lot of boiler plate code.  As you can see from the minimal content in our Model classes.

1. Create a Mapper to convert between the Model and the DTOs

   Create an interface named `DtoMapper.java` in the location: `src/main/java/fun/is/quarkus/italktomyself/mapper`

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

1. Create the implementation of the API interface:

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

1. Create the application logic:

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
       public List<HeartBeatDto> getPendingHeartbeats() {
           List<HeartBeatDto> hBeatDtos = new ArrayList<HeartBeatDto>();
           for (HeartBeat hb : pendingHeartbeats.values()) {
               hBeatDtos.add(mapper.heartBeatToDto(hb));
           }
           return hBeatDtos;
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

```bash
SERVER_PORT=4070 quarkus dev --no-debug
```

```bash
SERVER_PORT=4080 quarkus dev --no-debug
```

```bash
SERVER_PORT=4090 quarkus dev --no-debug
```
