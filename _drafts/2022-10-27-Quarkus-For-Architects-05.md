---
title: "Quarkus for Architects who Sometimes Write Code - Being Persistent - Part 03"
date:   2022-10-25 00:00:00 -0400
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

1. [Quarkus for Architects who Sometimes Write Code - Being Persistent - Part 01](https://upstreamwithoutapaddle.com/blog%20post/quarkus%20series/2022/10/08/Quarkus-For-Architects-03.html)
2. [Quarkus for Architects who Sometimes Write Code - Being Persistent - Part 02](https://upstreamwithoutapaddle.com/blog%20post/quarkus%20series/2022/10/23/Quarkus-For-Architects-04.html)

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

1. Add this project to your IDE

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

OK, we now have some generated code for interfacing with Stargate.  But...  It's not quite what we're going to need.

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
                        │   └── SchemasApi.java
                        └── model
                            ├── Credentials.java
                            └── Token.java
```

`AuthApi.java` is the class that we will use to get an authorization token.  `Credentials.java` & `Token.java` are its DTOs.

`DocumentsApi.java` is the class that we'll use to interface with the Stargate Document API.

We are going to be using Resteasy Reactive in our application.  But the generated classes to not support that.  In fact, if you look at the generated classes, you'll see that all of the methods return `void`.

Let's fix that with `sed`...  I bet you didn't think of `sed` as a code editor...

Well, we're going to use `sed` to fix the return type from the methods to be `Uni<Response>`, and we're going to get rid of all of the `@Generated...` annotations.

We also need to fix the `configKey` entries in `@RegisterRestClient`.  `AuthApi.java` and `DocumentsApi.java` have the same entries.  That won't work for us since the resources are at different URLs.

```bash
AUTH_API_FILE=${HOME}/okd-lab/quarkus-projects/book_catalog/src/main/java/fun/is/quarkus/book_catalog/collaborators/stargate/api/AuthApi.java
DOC_API_FILE=${HOME}/okd-lab/quarkus-projects/book_catalog/src/main/java/fun/is/quarkus/book_catalog/collaborators/stargate/api/DocumentsApi.java

for i in ${AUTH_API_FILE} ${DOC_API_FILE}
do
  sed -i "s|public void|public Uni<Response>|g" ${i}
  sed -i "/@GeneratedMethod \(.*\)/d" ${i}
  sed -i "/@GeneratedClass\(.*\)/d" ${i}
  sed -i "/io.quarkiverse.openapi.generator.annotations/d" ${i}
  sed -i "s|@GeneratedParam.* @|@|g" ${i}
done

sed -i "s|@RegisterRestClient(baseUri=\"https://localhost:8082\", configKey=\"stargate_json\")|@RegisterRestClient(configKey=\"stargate_auth\")|g" ${AUTH_API_FILE}
sed -i "s|@RegisterRestClient(baseUri=\"https://localhost:8082\", configKey=\"stargate_json\")|@RegisterRestClient(configKey=\"stargate_doc\")|g" ${DOC_API_FILE}
```

Now take a look at `AuthApi.java` and `DocumentsApi.java`.  They are ready for use.

### OpenLibrary API Client 

__`src/main/java/fun/is/quarkus/book_catalog/collaborators/openlibrary`__

```bash
src/main/java
└── fun
    └── is
        └── quarkus
            └── book_catalog
                └── collaborators
                    └── openlibrary
                        ├── api
                        │   └── OpenLibraryApi.java
                        └── dto
                            ├── OpenLibraryBookAuthorDto.java
                            ├── OpenLibraryBookCoverUrlDto.java
                            ├── OpenLibraryBookDeserializer.java
                            ├── OpenLibraryBookDetailDto.java
                            ├── OpenLibraryBookDto.java
                            ├── OpenLibraryBookIdentifiersDto.java
                            ├── OpenLibraryBookPublisherDto.java
                            └── OpenLibraryBookSubjectsDto.java
```

__`./api/OpenLibraryApi.java`__

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

__`./dto/OpenLibraryBookAuthorDto.java`__

```java
package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record OpenLibraryBookAuthorDto (String url, String name) {}
```

__`./dto/OpenLibraryBookCoverUrlDto.java`__

```java
package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record OpenLibraryBookCoverUrlDto(String small, String large, String medium){}
```

__`./dto/OpenLibraryBookDetailDto.java`__

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

__`./dto/OpenLibraryBookDto.java`__

```java
package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonDeserialize(using = OpenLibraryBookDeserializer.class)
public record OpenLibraryBookDto(String isbn, OpenLibraryBookDetailDto details) {}
```

__`./dto/OpenLibraryBookIdentifiersDto.java`__

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

__`./dto/OpenLibraryBookPublisherDto.java`__

```java
package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record OpenLibraryBookPublisherDto(String name){}
```

__`./dto/OpenLibraryBookSubjectsDto.java`__

```java
package fun.is.quarkus.book_catalog.collaborators.openlibrary.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record OpenLibraryBookSubjectsDto (String url, String name){}
```

__`./dto/OpenLibraryBookDeserializer.java`__

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

### Book Catalog API

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

__`BookInfoService.java`__

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
        stargateDoc.getDocById(authToken.getAuthToken(), cassNamespace, cassCollection, catalogId, catalogId, null);
        return null;
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

__`StargateAuthToken.java`__

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
import fun.is.quarkus.book_catalog.collaborators.stargate.model.Token;
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
        stargateCreds = new Credentials(stargateUser, stargatePw);
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

__`BookInfoAuthorDto.java`__

```java
package fun.is.quarkus.book_catalog.dto;

public record BookInfoAuthorDto(String openLibraryUrl, String name) {}
```

__`BookInfoDto.java`__

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

__`BookInfoIdentifiersDto.java`__

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
                    ├── Books.java
                    └── BooksDeserializer.java
```

__`BookInfo.java`__

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

__`BookInfoAuthor.java`__

```java
package fun.is.quarkus.book_catalog.model;

public record BookInfoAuthor (String openLibraryUrl, String name) {}
```

__`BookInfoIdentifiers.java`__

```java
package fun.is.quarkus.book_catalog.model;

import java.util.List;

public record BookInfoIdentifiers(
    List<BookInfoISBN10> isbn10List,
    List<BookInfoISBN13> isbn13List
) {}
```

__`BookInfoISBN10.java`__

```java
package fun.is.quarkus.book_catalog.model;

public record BookInfoISBN10(String isbn10) {}
```

__`BookInfoISBN13.java`__

```java
package fun.is.quarkus.book_catalog.model;

public record BookInfoISBN13(String isbn13) {}
```

__`Books.java`__

```java
package fun.is.quarkus.book_catalog.model;

import java.util.List;

import com.fasterxml.jackson.databind.annotation.JsonDeserialize;

@JsonDeserialize(using = BooksDeserializer.class)
public record Books(List<BookInfo> books) {}
```

__`BooksDeserializer.java`__

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

### Data Mapper

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

### Application Config

__`src/main/resources/application.yaml`__

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

## Postman Collection

## Run It

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
   mvn compile
   quarkus dev
   ```

## Application Queries

Add Book To Catalog
Get Books by Title
Get Books by Author
Get Book by Title & Author
Get Book by ISBN
Get Book by ID


## Connect To the Cluster

```bash
POD_NAME=$(oc -n k8ssandra-operator get statefulsets --selector app.kubernetes.io/name=cassandra -o jsonpath='{.items[0].metadata.name}')-0
oc -n k8ssandra-operator port-forward ${POD_NAME} 9042

CLUSTER_INIT_USER=$(oc -n k8ssandra-operator get secret k8ssandra-cluster-superuser -o jsonpath="{.data.username}" | base64 -d)
CLUSTER_INIT_PWD=$(oc -n k8ssandra-operator get secret k8ssandra-cluster-superuser -o jsonpath="{.data.password}" | base64 -d)

oc -n k8ssandra-operator port-forward svc/k8ssandra-cluster-dc1-stargate-service 9042

cqlsh -u ${CLUSTER_INIT_USER} -p ${CLUSTER_INIT_PWD} -e CREATE ROLE IF NOT EXISTS book-catalog
```

[https://docs.datastax.com/en/astra-serverless/docs/develop/tooling.html#postman-resources](https://docs.datastax.com/en/astra-serverless/docs/develop/tooling.html#postman-resources){:target="_blank"}

[https://docs.datastax.com/en/astra-serverless/docs/quickstart/qs-rest.html](https://docs.datastax.com/en/astra-serverless/docs/quickstart/qs-rest.html){:target="_blank"}

Set Env:



```bash
curl localhost:8080/book-info/book-by-isbn/0061031321 | jq
```

Create KeyStore:

```bash
mkdir ~/cert-work-dir
openssl s_client -showcerts -servername $(oc -n k8ssandra-operator get route sg-auth -o jsonpath="{.spec.host}") -connect $(oc -n k8ssandra-operator get route sg-auth -o jsonpath="{.spec.host}"):443 </dev/null 2>/dev/null|openssl x509 -outform PEM > ~/cert-work-dir/crc.crt
keytool -noprompt -importcert -file ~/cert-work-dir/crc.crt -keystore ~/cert-work-dir/keystore.jks -deststoretype pkcs12 -keypass changeit -storepass changeit
```

```bash
quarkus dev -D=javax.net.ssl.trustStore=~/cert-work-dir/keystore.jks -D=javax.net.ssl.trustStorePassword=changeit
```
