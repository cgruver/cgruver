---
title: "Quarkus for Architects who Sometimes Write Code - Being Persistent - Part 03"
date:   2022-12-12 00:00:00 -0400
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
__Note:__ This is part three of a three part post.  In this post we'll create a Quarkus micro-service to store and retrieve data with Cassandra and Stargate.

Make sure you have completed parts 1 & 2:

1. [Quarkus for Architects who Sometimes Write Code - Being Persistent - Part 01](https://upstreamwithoutapaddle.com/blog%20post/quarkus%20series/2022/10/08/Quarkus-For-Architects-03.html){:target="_blank"}
2. [Quarkus for Architects who Sometimes Write Code - Being Persistent - Part 02](https://upstreamwithoutapaddle.com/blog%20post/quarkus%20series/2022/10/23/Quarkus-For-Architects-04.html){:target="_blank"}

I'm going to lead you through building all of the code for this app.  But... if you really just want to skip ahead, or don't trust your copy & paste skills, I've got all of the code in a repo for you as well: [https://github.com/lab-monkeys/book_catalog.git](https://github.com/lab-monkeys/book_catalog.git)

This example app is going to demonstrate several capabilities:

1. Integration with the Stargate Document API as an interface to Cassandra (The reason for these three blog posts)
1. Integration with [https://openlibrary.org](https://openlibrary.org)
1. Mapstruct for Model to DTO mappings (We're going to use some advanced features)
1. Customer Serializers for JSON marshaling and unmarshaling
1. Java `record` type
1. Quarkus Scheduler for scheduled tasks (cheesy example since we're not using an IAM provider and secrets manager...)
1. OpenAPI code generator with Quarkus

Let's get started!

## Install or update the tools

__Note:__ I've made some updates to my helper script since I introduced it in an earlier post.

Follow the instructions here: [Quarkus for Architects who Sometimes Write Code - Setup](/tutorials/quarkus-for-architects-dev-setup/){:target="_blank"}

## Build the Book Catalog Service



### Bootstrap A Project For Our Code

1. Bootstrap a basic REST project with the Quarkus Scheduler extension added

   ```bash
   mkdir -p ${HOME}/okd-lab/quarkus-projects
   cd ${HOME}/okd-lab/quarkus-projects
   code --create -b -a=book_catalog -g=fun.is.quarkus -x=scheduler
   ```

1. Add MapStruct as a dependency:

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/book_catalog
   code --dependency -g=org.mapstruct -a=mapstruct -v=1.5.3.Final
   code --dependency -g=org.mapstruct -a=mapstruct-processor -v=1.5.3.Final
   ```

### Create the Stargate API Client

Next, we're going to need code that will help us interface with the Stargate APIs.  Fortunately, Stargate has published an OpenAPI spec for their APIs.  We'll use that, plus a code generator to create the client code that we need.

1. Create a temporary project for the generated code:

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects
   code --create -a=stargate_api -g=fun.is.quarkus -x=quarkus-openapi-generator
   ```

   We're going to use a relatively new Quarkus extension here that is an opinionated implementation of [OpenAPI Generator Tool](https://openapi-generator.tech/){:target="_blank"}.

   You can find the Quarkus extension here: [https://github.com/quarkiverse/quarkus-openapi-generator](https://github.com/quarkiverse/quarkus-openapi-generator){:target="_blank"}

1. Create a directory for the OpenAPI spec file:

   ```bash
   mkdir -p ${HOME}/okd-lab/quarkus-projects/stargate_api/src/main/openapi
   ```

1. Grab the OpenAPI spec:

   __Note:__ I've selected a specific version and put it in my blog resources project.  This ensures that you don't hit any compatibility issues since the K8ssandra resources that you deployed will work with this version of the API.

   ```bash
   curl -o ${HOME}/okd-lab/quarkus-projects/stargate_api/src/main/openapi/stargate.json https://raw.githubusercontent.com/cgruver/k8ssandra-blog-resources/main/openApi/stargate-doc-openapi.json
   ```

1. Add configuration information to the `application.properties` file to specify the base package for the generated code:

   ```bash
   echo 'quarkus.openapi-generator.codegen.spec.stargate_json.base-package=fun.is.quarkus.book_catalog.collaborators.stargate' >> ${HOME}/okd-lab/quarkus-projects/stargate_api/src/main/resources/application.properties
   ```

1. Generate the code:

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/stargate_api
   mvn compile
   ```

   __Note:__ You can ignore the errors like:

   ```[ERROR] Undefined property/schema for `SchemaFor500ResponseBodyApplicationJson`. Default to type:string.```

1. Copy the generated code into our project:

   ```bash
   cp -r ./target/generated-sources/open-api-json/fun ${HOME}/okd-lab/quarkus-projects/book_catalog/src/main/java
   ```

1. Remove the `SchemasApi` which we don't need:

   ```bash
   rm ${HOME}/okd-lab/quarkus-projects/book_catalog/src/main/java/fun/is/quarkus/book_catalog/collaborators/stargate/api/SchemasApi.java
   ```

1. Remove the temporary project:

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects
   rm -rf ${HOME}/okd-lab/quarkus-projects/stargate_api
   ```

Take a look at the files that we copied into `./src/main/java/fun/is/quarkus/book_catalog/collaborators/stargate`

```bash
src/main/java
└── fun
    └── is
        └── quarkus
            └── book_catalog
                └── collaborators
                    └── stargate
                        ├── api
                        │   ├── AuthApi.java
                        │   ├── DocumentsApi.java
                        └── model
                            ├── Credentials.java
                            └── Token.java
```

`AuthApi.java` is the class that we will use to get an authorization token.  `Credentials.java` & `Token.java` are its DTOs.

`DocumentsApi.java` is the class that we'll use to interface with the Stargate Document API.

We are going to be using Resteasy Reactive in our application.  But the generated classes do not support that.  In fact, if you look at the generated classes, you'll see that all of the methods return `void`.  So, we now have some generated code for interfacing with Stargate.  But...  It's not quite what we're going to need.

Let's fix that with `sed`...  I bet you didn't think of `sed` as a code editor...

Well, we're going to use `sed` to fix the return type from the methods to be `Uni<Response>`, and we're going to get rid of all of the `@Generated...` annotations.

We also need to fix the `configKey` entries in `@RegisterRestClient`.  `AuthApi.java` and `DocumentsApi.java` have the same entries.  That won't work for us since the resources are at different URLs.

1. Set a couple of variables for the two files that we need to manipulate:

   ```bash
   AUTH_API_FILE=${HOME}/okd-lab/quarkus-projects/book_catalog/src/main/java/fun/is/quarkus/book_catalog/collaborators/stargate/api/AuthApi.java
   DOC_API_FILE=${HOME}/okd-lab/quarkus-projects/book_catalog/src/main/java/fun/is/quarkus/book_catalog/collaborators/stargate/api/DocumentsApi.java
   ```

1. Run the following script to make changes to the files:

   ```bash
   for i in ${AUTH_API_FILE} ${DOC_API_FILE}
   do
     sed -i "s|public void|public Uni<Response>|g" ${i}
     sed -i "/@GeneratedMethod \(.*\)/d" ${i}
     sed -i "/@GeneratedClass\(.*\)/d" ${i}
     sed -i "/io.quarkiverse.openapi.generator.annotations/d" ${i}
     sed -i "s|@GeneratedParam.* @|@|g" ${i}
   done
   ```

1. Fix the `configKey` entries:

   ```bash
   sed -i "s|@RegisterRestClient(baseUri=\"https://localhost:8082\", configKey=\"stargate_json\")|@RegisterRestClient(configKey=\"stargate_auth\")|g" ${AUTH_API_FILE}
   sed -i "s|@RegisterRestClient(baseUri=\"https://localhost:8082\", configKey=\"stargate_json\")|@RegisterRestClient(configKey=\"stargate_doc\")|g" ${DOC_API_FILE}
   ```

1. Import this project into your IDE

1. Now take a look at `AuthApi.java` and `DocumentsApi.java`.  They are almost ready for use.

   The last thing that you need to do is add the following imports to each file:

   ```java
   import javax.ws.rs.core.Response;
   import io.smallrye.mutiny.Uni;
   ```

   There are also several unused imports in the files now.  Remove those if you want to clean up the code.

### OpenLibrary API Client

Create the code for the OpenLibrary client.  Below is the tree for the file that you need to create.  The code for the file is below.

__`src/main/java/fun/is/quarkus/book_catalog/collaborators/openlibrary/api`__

```bash
src/main/java
└── fun
    └── is
        └── quarkus
            └── book_catalog
                └── collaborators
                    └── openlibrary
                        └── api
                            └── OpenLibraryApi.java
```

__`OpenLibraryApi.java`__

This interface defines the `openlibrary.org` Books API: [https://openlibrary.org/dev/docs/api/books](https://openlibrary.org/dev/docs/api/books){:target="_blank"}

You can test endpoint that we are creating an interface for with this:

```bash
curl 'https://openlibrary.org/api/books?bibkeys=0575043636&format=json&jscmd=data' | jq
```

Add this code to the file `OpenLibraryApi.java`

```java
package fun.is.quarkus.book_catalog.collaborators.openlibrary.api;

import javax.enterprise.context.ApplicationScoped;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import org.eclipse.microprofile.rest.client.inject.RegisterRestClient;

import io.smallrye.mutiny.Uni;

@Path("/api")
@RegisterRestClient(configKey = "open_library_api")
@ApplicationScoped
public interface OpenLibraryApi {
    
    @GET
    @Path("/books")
    @Produces(MediaType.APPLICATION_JSON)
    public Uni<Response> getBookInfo(@QueryParam("bibkeys") final String isbn, @QueryParam("format") final String format, @QueryParam("jscmd") final String jscmd);
}
```

### OpenLibrary API DTO

Create the code for the OpenLibrary client DTO.  Below is the tree for the files that you need to create.  The code for each file is below.

__`src/main/java/fun/is/quarkus/book_catalog/collaborators/openlibrary/dto`__

```bash
src/main/java
└── fun
    └── is
        └── quarkus
            └── book_catalog
                └── collaborators
                    └── openlibrary
                        └── dto
                            ├── OpenLibraryBookDto.java
                            ├── OpenLibraryBookDetailDto.java
                            ├── OpenLibraryBookAuthorDto.java
                            ├── OpenLibraryBookCoverUrlDto.java
                            ├── OpenLibraryBookIdentifiersDto.java
                            ├── OpenLibraryBookPublisherDto.java
                            ├── OpenLibraryBookSubjectsDto.java
                            └── OpenLibraryBookDeserializer.java
```

1. __`OpenLibraryBookDto.java`__

   ```java
   package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

   import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

   import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

   @JsonIgnoreProperties(ignoreUnknown = true)
   @JsonDeserialize(using = OpenLibraryBookDeserializer.class)
   public record OpenLibraryBookDto(String isbn, OpenLibraryBookDetailDto details) {}
   ```

   __Note:__ In the `OpenLibraryBookDto` record we are using the `@JsonDeserialize` annotation.  We are doing this because the response from `openlibrary.org` does not directly map to our DTO.  I'll explain more when we get to the deserializer below.

1. __`OpenLibraryBookDetailDto.java`__

   ```java
   package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

   import java.util.List;

   import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
   import com.fasterxml.jackson.annotation.JsonProperty;

   @JsonIgnoreProperties(ignoreUnknown = true)
   public record OpenLibraryBookDetailDto(
       List<OpenLibraryBookPublisherDto> publishers, 
       OpenLibraryBookIdentifiersDto identifiers, 
       String title, 
       String url, 
       String notes, 
       @JsonProperty("number_of_pages")
       Long numberOfPages, 
       OpenLibraryBookCoverUrlDto cover, 
       List<OpenLibraryBookSubjectsDto> subjects, 
       @JsonProperty("publish_date") 
       String publishDate, 
       String key, 
       List<OpenLibraryBookAuthorDto> authors
       ) {}
   ```

1. __`OpenLibraryBookAuthorDto.java`__

   ```java
   package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

   import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

   @JsonIgnoreProperties(ignoreUnknown = true)
   public record OpenLibraryBookAuthorDto (String url, String name) {}
   ```

1. __`OpenLibraryBookCoverUrlDto.java`__

   ```java
   package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

   import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

   @JsonIgnoreProperties(ignoreUnknown = true)
   public record OpenLibraryBookCoverUrlDto(String small, String large, String medium){}
   ```

1. __`OpenLibraryBookIdentifiersDto.java`__

   ```java
   package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

   import java.util.List;

   import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
   import com.fasterxml.jackson.annotation.JsonProperty;

   @JsonIgnoreProperties(ignoreUnknown = true)
   public record OpenLibraryBookIdentifiersDto(
       @JsonProperty("isbn_13")
       List<String> isbn13,
       List<String> amazon,
       @JsonProperty("isbn_10")
       List<String> isbn10,
       List<String> openlibrary
   ){}
   ```

1. __`OpenLibraryBookPublisherDto.java`__

   ```java
   package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

   import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

   @JsonIgnoreProperties(ignoreUnknown = true)
   public record OpenLibraryBookPublisherDto(String name){}
   ```

1. __`OpenLibraryBookSubjectsDto.java`__

   ```java
   package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

   import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

   @JsonIgnoreProperties(ignoreUnknown = true)
   public record OpenLibraryBookSubjectsDto (String url, String name){}
   ```

1. __`OpenLibraryBookDeserializer.java`__

   ```java
   package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

   import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
   import com.fasterxml.jackson.core.JsonParser;
   import com.fasterxml.jackson.core.JsonProcessingException;
   import com.fasterxml.jackson.databind.DeserializationContext;
   import com.fasterxml.jackson.databind.JsonDeserializer;
   import com.fasterxml.jackson.databind.JsonNode;
   import com.fasterxml.jackson.databind.ObjectMapper;

   import java.io.IOException;

   @JsonIgnoreProperties(ignoreUnknown = true)
   public class OpenLibraryBookDeserializer extends JsonDeserializer<OpenLibraryBookDto> {

       @Override
       public OpenLibraryBookDto deserialize(JsonParser p, DeserializationContext ctxt) throws IOException, JsonProcessingException {

           ObjectMapper objectMapper = new ObjectMapper();
           String isbn = p.nextFieldName();
           JsonNode node = p.getCodec().readTree(p);
           OpenLibraryBookDto book = new OpenLibraryBookDto(isbn, objectMapper.treeToValue(node.get(isbn), OpenLibraryBookDetailDto.class));
           return book;
       }
   }
   ```

   OK, let's talk about this deserializer a bit.

   If you run this curl command; `curl 'https://openlibrary.org/api/books?bibkeys=0575043636&format=json&jscmd=data' | jq` You will see that the response body does not map directly to our DTO.  The response is actually a key:value, where the key is the ISBN that use used to query.

   ```json
   {
     "0575043636": {
       "url": "https://openlibrary.org/books/OL1614567M/Wyrd_sisters",
       "key": "/books/OL1614567M",
       "title": "Wyrd sisters",
       "subtitle": "starring three witches, also kings, daggers, crowns ...",
       "authors": [
         {
           "url": "https://openlibrary.org/authors/OL25712A/Terry_Pratchett",
           "name": "Terry Pratchett"
         }
       ],
   etc...
   ```

   In order to get something that maps to our DTO we need to grab the value associated with that key and use it to deserialize to our `OpenLibraryBookDetailDto`

### Book Catalog API

Create the API that our Book Catalog Service will expose.  We're going to implement 5 resources.

1. `getBookById(@PathParam("catalog-id") String catalogId)`

   Returns a specific document by its unique identifier.

1. `getBookByIsbn(@PathParam("isbn") String isbn)`

   Returns books that match a search by ISBN.

1. `getBooksByAuthor(@PathParam("author") String author, @PathParam("num_results") Integer numResults)`

   Returns books that match a search by Author.

1. `getOpenLibraryBookByIsbn(@PathParam("isbn") String isbn)`

   Retrieves a book from `openlibrary.org` identified by ISBN.

1. `saveBookInfo(BookInfoDto dto)`

   Saves a book in the Cassandra cluster.

Add the following code to the project as indicated by the tree below:

__`src/main/java/fun/is/quarkus/book_catalog/api/`__

```bash
src/main/java
└── fun
    └── is
        └── quarkus
            └── book_catalog
                └── api
                    └── BookInfoApi.java
```

__`BookInfoApi.java`__

```java
package fun.is.quarkus.book_catalog.api;

import javax.enterprise.context.ApplicationScoped;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

import fun.is.quarkus.book_catalog.dto.BookInfoDto;
import io.smallrye.mutiny.Uni;

@ApplicationScoped
@Path("/book-info")
public interface BookInfoApi {
    
    @GET
    @Path("/book-by-id/{catalog-id}")
    @Produces(MediaType.APPLICATION_JSON)
    public Uni<Response> getBookById(@PathParam("catalog-id") String catalogId);

    @GET
    @Path("/book-by-isbn/{isbn}")
    @Produces(MediaType.APPLICATION_JSON)
    public Uni<Response> getBookByIsbn(@PathParam("isbn") String isbn);

    @GET
    @Path("/books-by-author/{author}/{num_results}")
    @Produces(MediaType.APPLICATION_JSON)
    public Uni<Response> getBooksByAuthor(@PathParam("author") String author, @PathParam("num_results") Integer numResults);

    @GET
    @Path("/open-library/{isbn}")
    @Produces(MediaType.APPLICATION_JSON)
    public Uni<Response> getOpenLibraryBookByIsbn(@PathParam("isbn") String isbn);

    @POST
    @Path("/save-book")
    @Consumes(MediaType.APPLICATION_JSON)
    public Uni<Response> saveBookInfo(BookInfoDto dto);
}
```

### Book Catalog Service

Create the following code to implement the BookInfoApi, as well as a service to keep the application authenticated with the Cassandra cluster.

__`src/main/java/fun/is/quarkus/book_catalog/service/`__

```bash
src/main/java
└── fun
    └── is
        └── quarkus
            └── book_catalog
                └── service
                    ├── BookInfoService.java
                    └── StargateAuthToken.java
```

1. __`BookInfoService.java`__

   ```java
   package fun.is.quarkus.book_catalog.service;

   import java.time.Duration;
   import javax.enterprise.context.ApplicationScoped;
   import javax.inject.Inject;
   import javax.ws.rs.core.Response;
   import org.eclipse.microprofile.config.inject.ConfigProperty;
   import org.eclipse.microprofile.rest.client.inject.RestClient;

   import fun.is.quarkus.book_catalog.api.BookInfoApi;
   import fun.is.quarkus.book_catalog.collaborators.openlibrary.api.OpenLibraryApi;
   import fun.is.quarkus.book_catalog.collaborators.openlibrary.dto.OpenLibraryBookDto;
   import fun.is.quarkus.book_catalog.collaborators.stargate.api.DocumentsApi;
   import fun.is.quarkus.book_catalog.dto.BookInfoDto;
   import fun.is.quarkus.book_catalog.mapper.BookInfoMapper;
   import fun.is.quarkus.book_catalog.model.BookById;
   import fun.is.quarkus.book_catalog.model.Books;
   import io.smallrye.mutiny.Uni;

   @ApplicationScoped
   public class BookInfoService implements BookInfoApi {

       @ConfigProperty(name = "stargate.book-catalog.namespace")
       String cassNamespace;

       @ConfigProperty(name = "stargate.book-catalog.collection")
       String cassCollection;

       @Inject
       StargateAuthToken authToken;

       @RestClient
       @Inject
       DocumentsApi stargateDoc;

       @RestClient
       @Inject
       OpenLibraryApi openLibrary;

       @Inject
       BookInfoMapper bookMapper;

       @Override
       public Uni<Response> getBookById(String catalogId) {
           return stargateDoc.getDocById(authToken.getAuthToken(), cassNamespace, cassCollection, catalogId, null, null).ifNoItem().after(Duration.ofMillis(1000)).failWith(new Exception("Query Timeout")).onItem().transform(reply -> Response.ok(bookMapper.bookInfoToDto(reply.readEntity(BookById.class).data())).build()).onFailure().transform(fail -> new Exception(fail.getMessage()));
       }

       @Override
       public Uni<Response> getBookByIsbn(String isbn) {

           String isbnType = "isbn13";
           if (isbn.length() == 10) {
               isbnType = "isbn10";
           }
           if (isbn.length() == 13) {
               isbnType = "isbn13";
           }

           String isbnQuery = "{\"identifiers." + isbnType + "List.[*]." + isbnType + "\":{\"$eq\":\"" + isbn + "\"}}";

           return processQuery(isbnQuery, 1);
       }

       @Override
       public Uni<Response> getBooksByAuthor(String author, Integer numResults) {
           
           String authorQuery = "{\"authors.[*].name\":{\"$eq\":\"" + author + "\"}}";

           return processQuery(authorQuery, numResults);
       }

       @Override
       public Uni<Response> getOpenLibraryBookByIsbn(String isbn) {
           return openLibrary.getBookInfo(isbn, "json", "data").ifNoItem().after(Duration.ofMillis(1000)).failWith(new Exception("Query Timeout")).onItem().transform(reply -> Response.ok(bookMapper.OpenLibraryBookDtoToBookInfoDto(reply.readEntity(OpenLibraryBookDto.class))).build()).onFailure().transform(fail -> new Exception(fail.getMessage()));
       }

       @Override
       public Uni<Response> saveBookInfo(BookInfoDto dto) {
           return stargateDoc.replaceDoc(authToken.getAuthToken(), cassNamespace, cassCollection, dto.catalogId(), bookMapper.dtoToBookInfo(dto)).onItem().transform(reply -> Response.ok(reply.readEntity(Object.class)).build());
       }

       private Uni<Response> processQuery(String query, Integer numResults) {
           return stargateDoc.searchDoc(authToken.getAuthToken(), cassNamespace, cassCollection, query, null, numResults, null, null).ifNoItem().after(Duration.ofMillis(1000)).failWith(new Exception("Query Timeout")).onItem().transform(reply -> Response.ok(bookMapper.bookInfosToDtos(reply.readEntity(Books.class).books())).build()).onFailure().transform(fail -> new Exception(fail.getMessage()));
       }
   }
   ```

1. __`StargateAuthToken.java`__

   ```java
   package fun.is.quarkus.book_catalog.service;

   import java.time.Duration;

   import javax.enterprise.event.Observes;
   import javax.inject.Singleton;
   import javax.ws.rs.core.Response;

   import org.eclipse.microprofile.config.inject.ConfigProperty;
   import org.eclipse.microprofile.rest.client.inject.RestClient;
   import org.jboss.logging.Logger;

   import fun.is.quarkus.book_catalog.collaborators.stargate.api.AuthApi;
   import fun.is.quarkus.book_catalog.collaborators.stargate.model.Credentials;
   import io.quarkus.runtime.StartupEvent;
   import io.quarkus.scheduler.Scheduled;

   @Singleton
   public class StargateAuthToken {
       
       final Logger LOG = Logger.getLogger(StargateAuthToken.class);

       @RestClient
       AuthApi stargateAuth;

       @ConfigProperty(name = "stargate.auth.user")
       private String stargateUser;

       @ConfigProperty(name = "stargate.auth.pw")
       private String stargatePw;

       private String authToken;
       Credentials stargateCreds = null;

       void startUp(@Observes StartupEvent startupEvent) {
           stargateCreds = new Credentials();
           stargateCreds.setPassword(stargatePw);
           stargateCreds.setUsername(stargateUser);
       }
       
       @Scheduled(every = "{stargate.token_renew}")
       public void authenticate() {
           stargateAuth.createToken(stargateCreds).ifNoItem().after(Duration.ofMillis(1000)).failWith(new Exception("Request Timeout - Authentication")).subscribe().with(reply -> setToken(reply), fail -> handleFailure(fail));
       }

       private void setToken(Response reply) {
           this.authToken = reply.readEntity(Token.class).authToken();
           LOG.info("Token: " + this.authToken);
       }

       private void handleFailure(Throwable error) {
           error.printStackTrace();
       }

       public String getAuthToken() {
           return this.authToken;
       }
   }
   ```

   Since we are not using an IAM provider, we need to do basic authentication against the cassandra cluster.  Stargate implements a resource that returns a token for our Stargate Document API calls to use for authentication.

   This class implements a very rudimentary way to maintain our auth token.  It also serves as a demo of how to use a couple of Quarkus annotations.

   `@Observes StartupEvent` enables our service to perform an initial task when the application is started.

   `@Scheduled` enables a method to be executed at a specified time.

### Book Catalog DTO

__`src/main/java/fun/is/quarkus/book_catalog/dto/`__

```bash
src/main/java
└── fun
    └── is
        └── quarkus
            └── book_catalog
                └── dto
                    ├── BookInfoAuthorDto.java
                    ├── BookInfoDto.java
                    └── BookInfoIdentifiersDto.java
```

1. __`BookInfoAuthorDto.java`__

   ```java
   package fun.is.quarkus.book_catalog.dto;

   public record BookInfoAuthorDto(String openLibraryUrl, String name) {}
   ```

1. __`BookInfoDto.java`__

   ```java
   package fun.is.quarkus.book_catalog.dto;

   import java.util.List;

   public record BookInfoDto (
       String catalogId,
       String title,
       String openLibraryUrl,
       Long numberOfPages,
       String coverImageUrl,
       String publishDate,
       boolean inCatalog,
       BookInfoIdentifiersDto identifiers,
       List<BookInfoAuthorDto> authors
   ) {}
   ```

1. __`BookInfoIdentifiersDto.java`__

   ```java
   package fun.is.quarkus.book_catalog.dto;

   import java.util.List;

   public record BookInfoIdentifiersDto(
       List<String> isbn10,
       List<String> isbn13
   ) {}
   ```

### Book Catalog Model

__`src/main/java/fun/is/quarkus/book_catalog/model/`__

```bash
src/main/java
└── fun
    └── is
        └── quarkus
            └── book_catalog
                └── model
                    ├── BookInfo.java
                    ├── BookInfoAuthor.java
                    ├── BookInfoISBN10.java
                    ├── BookInfoISBN13.java
                    ├── BookInfoIdentifiers.java
                    ├── BookById.java
                    ├── Books.java
                    └── BooksDeserializer.java
```

1. __`BookInfo.java`__

   ```java
   package fun.is.quarkus.book_catalog.model;

   import java.util.List;

   public record BookInfo (
       String catalogId,
       String title,
       String openLibraryUrl,
       Long numberOfPages,
       String coverImageUrl,
       String publishDate,
       boolean inCatalog,
       BookInfoIdentifiers identifiers,
       List<BookInfoAuthor> authors
   ) {}
   ```

1. __`BookInfoAuthor.java`__

   ```java
   package fun.is.quarkus.book_catalog.model;

   public record BookInfoAuthor (String openLibraryUrl, String name) {}
   ```

1. __`BookInfoIdentifiers.java`__

   ```java
   package fun.is.quarkus.book_catalog.model;

   import java.util.List;

   public record BookInfoIdentifiers(
       List<BookInfoISBN10> isbn10List,
       List<BookInfoISBN13> isbn13List
   ) {}
   ```

1. __`BookInfoISBN10.java`__

   ```java
   package fun.is.quarkus.book_catalog.model;

   public record BookInfoISBN10(String isbn10) {}
   ```

1. __`BookInfoISBN13.java`__

   ```java
   package fun.is.quarkus.book_catalog.model;

   public record BookInfoISBN13(String isbn13) {}
   ```

1. __`BookById.java`__

   ```java
   package fun.is.quarkus.book_catalog.model;

   public record BookById(String documentId, BookInfo data) {}
   ```

   __Note:__ This class represents the Stargate response body for a Document query by Document ID.  The Document is in the value of the key element `data`.

1. __`Books.java`__

   ```java
   package fun.is.quarkus.book_catalog.model;

   import java.util.List;

   import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

   @JsonDeserialize(using = BooksDeserializer.class)
   public record Books(List<BookInfo> books) {}
   ```

   __Note:__ We're using a custom deserializer on this class like we did with the `openlibrary.org` response body.  That's because our response from startgate for the ISBN and Author searches can return multiple books.  The response body from Stargate has its own structure that we need to extract our `BookInfo` list from.  We'll implement that deserializer next.

1. __`BooksDeserializer.java`__

   ```java
   package fun.is.quarkus.book_catalog.model;

   import java.io.IOException;
   import java.util.ArrayList;
   import java.util.Iterator;
   import java.util.List;

   import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
   import com.fasterxml.jackson.core.JacksonException;
   import com.fasterxml.jackson.core.JsonParser;
   import com.fasterxml.jackson.databind.DeserializationContext;
   import com.fasterxml.jackson.databind.JsonDeserializer;
   import com.fasterxml.jackson.databind.JsonNode;
   import com.fasterxml.jackson.databind.ObjectMapper;

   import io.quarkus.logging.Log;

   @JsonIgnoreProperties(ignoreUnknown = true)
   public class BooksDeserializer extends JsonDeserializer<Books> {

       @Override
       public Books deserialize(JsonParser p, DeserializationContext ctxt) throws IOException, JacksonException {
           ObjectMapper objectMapper = new ObjectMapper();

           JsonNode data = p.getCodec().readTree(p);
           Log.debug(data);
           JsonNode books = data.get("data");
           Log.debug(books);
           
           int resultSize = data.size();
           Log.debug("Result Size: " + resultSize);
           List<BookInfo> results = new ArrayList<BookInfo>();
           Iterator<String> fields = books.fieldNames();
           while (fields.hasNext()) {
               BookInfo bookInfo = objectMapper.treeToValue(books.get(fields.next()), BookInfo.class);
               Log.debug(bookInfo);
               results.add(bookInfo);
           }
           return new Books(results);
       }
   }
   ```

   This deserializer takes the response body from Stargate and maps it to a `List` of `BookInfo`.

   The response body from Stagate is a key:value where the key is `data` and the value is the actual query data.  Each object returned from the query is a key:value pair where the key is the unique ID of the document, and the value is the document object.

   ```json
   {
     "data": {
       "OL24385514M": {
         "authors": [
           {
             "name": "Terry Pratchett",
             "openLibraryUrl": "http://openlibrary.org/authors/OL25712A/Terry_Pratchett"
           }
           etc...
   ```

### Data Mapper

Finally, create the MapStruct interface for mapping our models to DTOs and vice versa.

```bash
src/main/java
└── fun
    └── is
        └── quarkus
            └── book_catalog
                └── mapper
                    └── BookInfoMapper.java
```

__`BookInfoMapper.java`__

```java
package fun.is.quarkus.book_catalog.mapper;

import java.util.ArrayList;
import java.util.List;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import fun.is.quarkus.book_catalog.collaborators.openlibrary.dto.OpenLibraryBookAuthorDto;
import fun.is.quarkus.book_catalog.collaborators.openlibrary.dto.OpenLibraryBookDto;
import fun.is.quarkus.book_catalog.dto.BookInfoIdentifiersDto;
import fun.is.quarkus.book_catalog.dto.BookInfoAuthorDto;
import fun.is.quarkus.book_catalog.dto.BookInfoDto;
import fun.is.quarkus.book_catalog.model.BookInfo;
import fun.is.quarkus.book_catalog.model.BookInfoAuthor;
import fun.is.quarkus.book_catalog.model.BookInfoISBN10;
import fun.is.quarkus.book_catalog.model.BookInfoISBN13;
import fun.is.quarkus.book_catalog.model.BookInfoIdentifiers;

@Mapper(componentModel = "cdi")
public interface BookInfoMapper {

    @Mapping(target = "openLibraryUrl", source = "url")
    @Mapping(target = "name", source = "name")
    BookInfoAuthorDto openLibraryAuthorToDto(OpenLibraryBookAuthorDto author);

    List<BookInfoAuthorDto> openLibraryAuthorsToDtos(List<OpenLibraryBookAuthorDto> authors);

    @Mapping(source = "details.title", target = "title")
    @Mapping(source = "details.url", target = "openLibraryUrl")
    @Mapping(source = "details.numberOfPages", target = "numberOfPages")
    @Mapping(source = "details.cover.small", target = "coverImageUrl")
    @Mapping(source = "details.publishDate", target = "publishDate")
    @Mapping(source = "details.authors", target = "authors")
    @Mapping(source = "details.identifiers", target = "identifiers")
    @Mapping(target = "inCatalog", ignore = true)
    @Mapping(target = "catalogId", expression = "java(bookInfo.details().identifiers().openlibrary().get(0))")
    BookInfoDto OpenLibraryBookDtoToBookInfoDto(OpenLibraryBookDto bookInfo);

    BookInfo dtoToBookInfo(BookInfoDto dto);

    BookInfoDto bookInfoToDto(BookInfo book);

    List<BookInfoDto> bookInfosToDtos(List<BookInfo> books);

    BookInfoAuthor dtoToBookInfoAuthor(BookInfoAuthorDto dto);

    BookInfoAuthorDto bookInfoAuthorToDto(BookInfoAuthor author);

    default BookInfoIdentifiers dtoToBookInfoIdentifiers(BookInfoIdentifiersDto dto){
        List<BookInfoISBN10> isbn10List = new ArrayList<BookInfoISBN10>();
        List<BookInfoISBN13> isbn13List = new ArrayList<BookInfoISBN13>();
        if (dto.isbn10() != null) {
        for (String isbn : dto.isbn10()) {
            BookInfoISBN10 isbn10 = new BookInfoISBN10(isbn);
            isbn10List.add(isbn10);
        }}
        if (dto.isbn13() != null) {
        for (String isbn : dto.isbn13()) {
            BookInfoISBN13 isbn13 = new BookInfoISBN13(isbn);
            isbn13List.add(isbn13);
        }}
        return new BookInfoIdentifiers(isbn10List, isbn13List);
    }

    default BookInfoIdentifiersDto bookInfoIdentifiersToDto(BookInfoIdentifiers identifiers) {
        List<String> isbn10 = new ArrayList<String>();
        List<String> isbn13 = new ArrayList<String>();

        if (identifiers.isbn10List() != null) {
        for (BookInfoISBN10 isbn : identifiers.isbn10List()) {
            isbn10.add(isbn.isbn10());
        }}
        if (identifiers.isbn13List() != null) {
        for (BookInfoISBN13 isbn : identifiers.isbn13List()) {
            isbn13.add(isbn.isbn13());
        }}
        return new BookInfoIdentifiersDto(isbn10, isbn13);

    }
}
```

There are a couple of more advanced MapStruct concepts here that I want to point out:

1. `@Mapping(target = "catalogId", expression = "java(bookInfo.details().identifiers().openlibrary().get(0))")`

   The MapStruct mapping of a `target` with an `expression` allows to to manipulate values before the mapping occurs.  The expression in this example is Java code that gets added to the generated class.  In this particular case, we need to extract the unique identifier that we're going to use for our Book in Cassandra.  We are using the OpenLibrary ID as our document ID.  That ID is in an Array, (even though there is only one value), so we are extracting that value from the `openlibrary` element.

1. `default BookInfoIdentifiers dtoToBookInfoIdentifiers(BookInfoIdentifiersDto dto)`

   Adding a `default` method to a MapStruct interface, instructs MapStruct to use that method for mapping instead of trying to generate one.

   We are using `default` methods for our mapping of BookInfoIdentifiers because we need to dynamically manipulate a `List`.  Remember that `record` objects are immutable once they are created.  Because of that, we can't make changes to a record after our mapping creates it.  Our only option would be to create a new one and copy all of the values from the old to new along with our changes to the `List` objects.

   Doing that Rube Goldberg type of operation would sort of defeat the purpose of using `record` to simplify our lives.

   Using a `default` method allows us to define the mapping and keep the simplicity of using `record`.

### Application Config

Create the `application.yml` that will externalize the configuration for the Book Catalog service.

__`src/main/resources/application.yml`__

```yaml
quarkus:
  tls:
    trust-all: true
  application:
    name: bookCatalog
  http:
    port: ${SERVER_PORT}
  log:
    level: "DEBUG"
    console:
      enable: true
    category:
      "org.jboss.resteasy.reactive.client.logging":
      level: DEBUG
  rest-client:
    logging:
      scope: request-response
      body-limit: 1024
stargate: 
  token_renew: "30s"
  auth:
    user: ${STARGATE_USER}
    pw: ${STARGATE_PW}
  book-catalog:
    namespace: home_library
    collection: book_catalog
stargate_auth/mp-rest/url: ${STARGATE_AUTH_URL}
stargate_doc/mp-rest/url: ${STARGATE_DOC_URL}
open_library_api/mp-rest/url: ${OPEN_LIBRARY_URL}
```

__Notes:__

1. We're enabling `DEBUG` level logging here.

1. We're instructing the rest-easy client to log requests and responses.  This is REALLY useful in development to see exactly what is being sent and returned in your API interactions.  Note however, that it logs EVERYTHING including your credentials.  So, __don't forget to turn it off...__

## Build and Run the Book Catalog Service

### Import Postman Collection & Environment

I've created a Postman collection and environment for this demo.

Follow the instructions at this link to import them: [Configure Postman](/tutorials/quarkus-for-architects-postman-setup/){:target="_blank"}

### Start the Book Catalog Service

1. Make sure that you have your Cassandra cluster running:

   This assumes that you have completed: [Quarkus for Architects who Sometimes Write Code - Being Persistent - Part 01](https://upstreamwithoutapaddle.com/blog%20post/quarkus%20series/2022/10/08/Quarkus-For-Architects-03.html){:target="_blank"}

1. Open a shell for running the application.

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/book_catalog
   ```

1. Log into your `crc` instance of OpenShift

   1. Set the environment:

      ```bash
      eval $(crc oc-env)
      ```

   1. Get the credentials to log in:

      ```bash
      crc console --credentials
      ```

      The output will show you how to login with the two pre-configured users:

      ```bash
      To login as a regular user, run 'oc login -u developer -p developer https://api.crc.testing:6443'.
      To login as an admin, run 'oc login -u kubeadmin -p FkIy7-LFYXG-PvYFZ-Ppp2G https://api.crc.testing:6443'
      ```

   1. Log into the cluster:

      ```bash
      oc login -u kubeadmin -p <The Password For kubeadmin> https://api.crc.testing:6443
      ```

1. Set the environment variables for the app

   ```bash
   export OPEN_LIBRARY_URL=https://openlibrary.org
   export SERVER_PORT=8080
   export STARGATE_USER=$(oc -n k8ssandra-operator get secret k8ssandra-cluster-superuser -o jsonpath="{.data.username}" | base64 -d)
   export STARGATE_PW=$(oc -n k8ssandra-operator get secret k8ssandra-cluster-superuser -o jsonpath="{.data.password}" | base64 -d)
   export STARGATE_AUTH_URL=https://$(oc -n k8ssandra-operator get route sg-auth -o jsonpath="{.spec.host}")
   export STARGATE_DOC_URL=https://$(oc -n k8ssandra-operator get route sg-rest -o jsonpath="{.spec.host}")
   ```

1. Start the app

   ```bash
   cd ${HOME}/okd-lab/quarkus-projects/book_catalog
   
   mvn clean
   quarkus dev
   ```

   You should see output similar to the following, indicating that the app is running and successfully authenticated with Stargate.

   ```bash
   2022-12-12 08:46:00,311 DEBUG [org.jbo.res.rea.cli.log.DefaultClientLogger] (vert.x-eventloop-thread-5) Response: POST https://sg-auth-k8ssandra-operator.apps-crc.testing/v1/auth, Status[201 Created], Headers[date=Mon, 12 Dec 2022 13:46:00 GMT cache-control=no-transform, max-age=1790, s-maxage=1790 content-type=application/json set-cookie=f90f1ecbc004220e792e5d69a11f92cd=4118fa27082b4435f688d1793014d658; path=/; HttpOnly; Secure; SameSite=None content-length=52], Body:
   {"authToken":"cbe41357-b15e-42cd-a9e0-989b53dfd9fc"}

   2022-12-12 08:46:00,325 INFO  [fun.is.qua.boo.ser.StargateAuthToken] (vert.x-eventloop-thread-5) Token: cbe41357-b15e-42cd-a9e0-989b53dfd9fc

   --
   Tests paused
   Press [r] to resume testing, [o] Toggle test output, [:] for the terminal, [h] for more options>
   ```

### Use Postman to interact with the Book Catalog Service

Take a look at the collection that you imported:

![Postman](/_pages/tutorials/quarkus-for-architects/images/postman-book-catalog-collection.png)

There are three main folders in this collection:

| --- | --- |
| __Book Catalog Stargate Demo__ | This folder contains queries for interacting directly with Stargate |
| __Open Library Queries__ | This folder contains queries for testing the openlibrary.org `books` API |
| __Book Catalog Quarkus Demo__ | This folder contains a set of sub-folders with queries for using the BookCatalog service |

We'll be using the queries in the `Book Catalog Quarkus Demo` folder.

The queries in the `Setup` folder are for creating the `home_library` namespace and `book_catalog` collection.  If you have deleted the namespace after a previous demo, then you need to recreate it now.  Execute the three queries in order.

Now, on to the demo.

We're going to run these queries in a specific sequence to populate your `book_catalog` collection in Cassandra.

Each of the first 5 `GET` queries will retrieve book information from `openlibrary.org` using the `books` API.  The response body for each book request will be stored in the `book_info_dto` environment variable in the Postman environment.

The `Save Book Info` `POST` query will invoke our Book Catalog Service to save a book in our collection.  The query uses the `book_info_dto` environment variable for the body of the `POST` request.

We are simulating the actions of a client application or UI/UX.

Once you have added all five books to the collection, you can run the `Get By Author`, `Get Book Info By ISBN`, & `Get Book Info By CatalogID` queries to explore the rest of our Book Catalog Service.

Here's the order in which to execute these Postman Queries:

1. `Get Thud Info From OpenLibrary.org`

1. `Save Book Info`

1. `Get Lords and Ladies Info From OpenLibrary.org`

1. `Save Book Info`

1. `Get A Hat Full Of Sky From OpenLibrary.org`

1. `Save Book Info`

1. `Get The Wee Free Men From OpenLibrary.org`

1. `Save Book Info`

1. `Get Night Watch From OpenLibrary.org`

1. `Save Book Info`

1. `Get By Author`

   __Note:__ You should see all five books returned in a list.  Also note the URL that is invoked.  The `10` in the path is a parameter that tells Stargate the maximum number of results to return.  There's a lot more that can be done with the Stargate `Search` resourse.

1. `Get Book Info By ISBN`

1. `Get Book Info By CatalogID`

Now, play around with the service by modifying the Postman queries if you like.

When you are done, the two queries in the `Clean Up` sub-folder will invoke the Stargate API to delete the Cassandra namespace and clean up.

That's it!  I hope you enjoyed this tour of Stargate & Quarkus with a Cassandra back end.

Now, go be persistent.

Cheers.
