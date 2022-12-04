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

## Create A Project For Our Code

```bash
mkdir -p ${HOME}/okd-lab/quarkus-projects
cd ${HOME}/okd-lab/quarkus-projects
code --create -b -a=book_catalog -g=fun.is.quarkus -x=scheduler
```

```bash
cd ${HOME}/okd-lab/quarkus-projects/book_catalog
code --dependency -g=org.mapstruct -a=mapstruct -v=1.5.3.Final
code --dependency -g=org.mapstruct -a=mapstruct-processor -v=1.5.3.Final
```

## Create the Stargate Client API

```bash
cd ${HOME}/okd-lab/quarkus-projects
code --create -a=stargate_api -g=fun.is.quarkus -x=quarkus-openapi-generator
```

```bash
mkdir -p ${HOME}/okd-lab/quarkus-projects/stargate_api/src/main/openapi

echo 'quarkus.openapi-generator.codegen.spec.stargate_json.base-package=fun.is.quarkus.book_catalog.collaborators.stargate' >> ${HOME}/okd-lab/quarkus-projects/stargate_api/src/main/resources/application.properties

curl -o ${HOME}/okd-lab/quarkus-projects/stargate_api/src/main/openapi/stargate.json https://raw.githubusercontent.com/cgruver/k8ssandra-blog-resources/main/openApi/stargate-doc-openapi.json
```

```bash
cd ${HOME}/okd-lab/quarkus-projects/stargate_api

mvn compile

cp -r ./target/generated-sources/open-api-json/fun ${HOME}/okd-lab/quarkus-projects/book_catalog/src/main/java

cd ${HOME}/okd-lab/quarkus-projects

rm -rf ${HOME}/okd-lab/quarkus-projects/stargate_api

sed -i "s|public void|public Uni<Response>|g" ${HOME}/okd-lab/quarkus-projects/book_catalog/src/main/java/fun/is/quarkus/book_catalog/collaborators/stargate/api/AuthApi.java

sed -i "s|public void|public Uni<Response>|g" ${HOME}/okd-lab/quarkus-projects/book_catalog/src/main/java/fun/is/quarkus/book_catalog/collaborators/stargate/api/DocumentsApi.java

```

## Application Queries

Add Book To Catalog
Get Books by Title
Get Books by Author
Get Book by Title & Author
Get Book by ISBN
Get Book by ID

[https://openlibrary.org/dev/docs/api/books](https://openlibrary.org/dev/docs/api/books)

```bash
curl 'https://openlibrary.org/api/books?bibkeys=0575043636&format=json&jscmd=data' | jq
```

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
      },
      {
        "url": "https://openlibrary.org/authors/OL4929687A/Joanne_Harris",
        "name": "Joanne Harris"
      },
      {
        "url": "https://openlibrary.org/authors/OL5196765A/Stephen_Briggs",
        "name": "Stephen Briggs"
      },
      {
        "url": "https://openlibrary.org/authors/OL7311709A/Celia_Imrie",
        "name": "Celia Imrie"
      }
    ],
    "number_of_pages": 251,
    "pagination": "251 p. ;",
    "by_statement": "by Terry Pratchett.",
    "identifiers": {
      "goodreads": [
        "364526"
      ],
      "librarything": [
        "1044878"
      ],
      "isbn_10": [
        "0575043636"
      ],
      "lccn": [
        "91155583"
      ],
      "oclc": [
        "21874666"
      ],
      "openlibrary": [
        "OL1614567M"
      ]
    },
    "classifications": {
      "lc_classifications": [
        "PR6066.R34 W97 1988",
        "PR6066.R34 W97 1989"
      ],
      "dewey_decimal_class": [
        "823/.914"
      ]
    },
    "publishers": [
      {
        "name": "V. Gollancz"
      }
    ],
    "publish_places": [
      {
        "name": "London"
      }
    ],
    "publish_date": "1988",
    "subjects": [
      {
        "name": "Fiction, fantasy, general",
        "url": "https://openlibrary.org/subjects/fiction,_fantasy,_general"
      },
      {
        "name": "Discworld (imaginary place), fiction",
        "url": "https://openlibrary.org/subjects/discworld_(imaginary_place),_fiction"
      },
      {
        "name": "Granny weatherwax (fictitious character), fiction",
        "url": "https://openlibrary.org/subjects/granny_weatherwax_(fictitious_character),_fiction"
      },
      {
        "name": "Fiction",
        "url": "https://openlibrary.org/subjects/fiction"
      },
      {
        "name": "Discworld (Imaginary place)",
        "url": "https://openlibrary.org/subjects/discworld_(imaginary_place)"
      },
      {
        "name": "Occult fiction",
        "url": "https://openlibrary.org/subjects/occult_fiction"
      },
      {
        "name": "Witches",
        "url": "https://openlibrary.org/subjects/witches"
      },
      {
        "name": "Fantasy",
        "url": "https://openlibrary.org/subjects/fantasy"
      },
      {
        "name": "MacBeth",
        "url": "https://openlibrary.org/subjects/macbeth"
      },
      {
        "name": "satire",
        "url": "https://openlibrary.org/subjects/satire"
      },
      {
        "name": "humor",
        "url": "https://openlibrary.org/subjects/humor"
      },
      {
        "name": "kingdom",
        "url": "https://openlibrary.org/subjects/kingdom"
      },
      {
        "name": "Fantasy fiction",
        "url": "https://openlibrary.org/subjects/fantasy_fiction"
      },
      {
        "name": "Fiction, humorous",
        "url": "https://openlibrary.org/subjects/fiction,_humorous"
      },
      {
        "name": "Fiction, humorous, general",
        "url": "https://openlibrary.org/subjects/fiction,_humorous,_general"
      },
      {
        "name": "Literature and fiction, fantasy",
        "url": "https://openlibrary.org/subjects/literature_and_fiction,_fantasy"
      },
      {
        "name": "Fiction, science fiction, general",
        "url": "https://openlibrary.org/subjects/fiction,_science_fiction,_general"
      },
      {
        "name": "English Fantasy fiction",
        "url": "https://openlibrary.org/subjects/english_fantasy_fiction"
      },
      {
        "name": "Translations into Turkish",
        "url": "https://openlibrary.org/subjects/translations_into_turkish"
      },
      {
        "name": "Turkish Fantasy fiction",
        "url": "https://openlibrary.org/subjects/turkish_fantasy_fiction"
      },
      {
        "name": "Translations from English",
        "url": "https://openlibrary.org/subjects/translations_from_english"
      },
      {
        "name": "Disque-monde (Lieu imaginaire)",
        "url": "https://openlibrary.org/subjects/disque-monde_(lieu_imaginaire)"
      },
      {
        "name": "Romans, nouvelles",
        "url": "https://openlibrary.org/subjects/romans,_nouvelles"
      },
      {
        "name": "Sorcières",
        "url": "https://openlibrary.org/subjects/sorcières"
      }
    ],
    "subject_places": [
      {
        "name": "Lancre (Imaginary place)",
        "url": "https://openlibrary.org/subjects/place:lancre_(imaginary_place)"
      },
      {
        "name": "Ankh-Morpork (Imaginary place)",
        "url": "https://openlibrary.org/subjects/place:ankh-morpork_(imaginary_place)"
      }
    ],
    "subject_people": [
      {
        "name": "Nanny Ogg",
        "url": "https://openlibrary.org/subjects/person:nanny_ogg"
      },
      {
        "name": "Granny Weatherwax",
        "url": "https://openlibrary.org/subjects/person:granny_weatherwax"
      },
      {
        "name": "Maigrat",
        "url": "https://openlibrary.org/subjects/person:maigrat"
      },
      {
        "name": "Greebo",
        "url": "https://openlibrary.org/subjects/person:greebo"
      },
      {
        "name": "Verence",
        "url": "https://openlibrary.org/subjects/person:verence"
      },
      {
        "name": "Death",
        "url": "https://openlibrary.org/subjects/person:death"
      }
    ],
    "ebooks": [
      {
        "preview_url": "https://archive.org/details/wyrdsisters0000prat_h5y3",
        "availability": "borrow",
        "formats": {},
        "borrow_url": "https://openlibrary.org/books/OL1614567M/Wyrd_sisters/borrow",
        "checkedout": false
      }
    ],
    "cover": {
      "small": "https://covers.openlibrary.org/b/id/4683700-S.jpg",
      "medium": "https://covers.openlibrary.org/b/id/4683700-M.jpg",
      "large": "https://covers.openlibrary.org/b/id/4683700-L.jpg"
    }
  }
}
```

BookInfo DTO

```json
{
  "catalogId": "OL24385514M",
  "title": "Thief of time",
  "openLibraryUrl": "http://openlibrary.org/books/OL24385514M/Thief_of_time",
  "numberOfPages": 357,
  "coverImageUrl": "https://covers.openlibrary.org/b/id/6636627-S.jpg",
  "publishDate": "2002",
  "inCatalog": false,
  "identifiers": {
    "isbn10": [
      "0061031321"
    ],
    "isbn13": [
      "9780061031328"
    ]
  },
  "authors": [
    {
      "openLibraryUrl": "http://openlibrary.org/authors/OL25712A/Terry_Pratchett",
      "name": "Terry Pratchett"
    }
  ]
}
```

BookInfo

```json
{
  "catalogId": "OL24385514M",
  "title": "Thief of time",
  "openLibraryUrl": "http://openlibrary.org/books/OL24385514M/Thief_of_time",
  "numberOfPages": 357,
  "coverImageUrl": "https://covers.openlibrary.org/b/id/6636627-S.jpg",
  "publishDate": "2002",
  "inCatalog": false,
  "isbn10List": [
    {
      "isbn10": "0061031321"
    }
  ],
  "isbn13List": [
    {
      "isbn13": "9780061031328"
    }
  ],
  "authors": [
    {
      "openLibraryUrl": "http://openlibrary.org/authors/OL25712A/Terry_Pratchett",
      "name": "Terry Pratchett"
    }
  ]
}
```

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
export OPEN_LIBRARY_URL=https://openlibrary.org
export SERVER_PORT=8080
export STARGATE_USER=$(oc -n k8ssandra-operator get secret k8ssandra-cluster-superuser -o jsonpath="{.data.username}" | base64 -d)
export STARGATE_PW=$(oc -n k8ssandra-operator get secret k8ssandra-cluster-superuser -o jsonpath="{.data.password}" | base64 -d)
export STARGATE_AUTH_URL=https://$(oc -n k8ssandra-operator get route sg-auth -o jsonpath="{.spec.host}")
export STARGATE_JSON_URL=https://$(oc -n k8ssandra-operator get route sg-rest -o jsonpath="{.spec.host}")
```

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

GET https://sg-rest-k8ssandra-operator.apps-crc.testing/v2/namespaces/home_library/collections/book_catalog?where=%7B%2522identifiers.isbn10List.%5B*%5D.isbn10%2522%3A%7B%2522%24eq%2522%3A%25220061031321%2522%7D%7D, Status[400 Bad Request], Headers[date=Mon, 28 Nov 2022 19:38:50 GMT content-type=application/json set-cookie=af3ca6a7014ba62db41735906a1d9f76=e4529690fa21c1b9c40c1bb3a3c7453a; path=/; HttpOnly; Secure; SameSite=None content-length=108], Body:
{"description":"The `where` parameter expects a valid JSON object representing search criteria.","code":400}

GET https://sg-rest-k8ssandra-operator.apps-crc.testing/v2/namespaces/home_library/collections/book_catalog?where=%7B%22identifiers.isbn10List.%5B*%5D.isbn10%22%3A%7B%22%24eq%22%3A%220061031321%22%7D%7D Headers[Accept=application/json User-Agent=Resteasy Reactive Client X-Cassandra-Token=391c3c86-eb34-46dd-8ac6-13074b399415], Empty body

{"data":{"OL24385514M":{"authors":[{"name":"Terry Pratchett","openLibraryUrl":"http://openlibrary.org/authors/OL25712A/Terry_Pratchett"}],"catalogId":"OL24385514M","coverImageUrl":"https://covers.openlibrary.org/b/id/6636627-S.jpg","identifiers":{"isbn10List":[{"isbn10":"0061031321"}],"isbn13List":[{"isbn13":"9780061031328"}]},"inCatalog":false,"numberOfPages":357,"openLibraryUrl":"http://openlibrary.org/books/OL24385514M/Thief_of_time","publishDate":"2002","title":"Thief of time"}}}

```json
{
  "data": {
    "OL24385514M": {
      "authors": [
        {
          "name": "Terry Pratchett",
          "openLibraryUrl": "http://openlibrary.org/authors/OL25712A/Terry_Pratchett"
        }
      ],
      "catalogId": "OL24385514M",
      "coverImageUrl": "https://covers.openlibrary.org/b/id/6636627-S.jpg",
      "identifiers": {
        "isbn10List": [
          {
            "isbn10": "0061031321"
          }
        ],
        "isbn13List": [
          {
            "isbn13": "9780061031328"
          }
        ]
      },
      "inCatalog": false,
      "numberOfPages": 357,
      "openLibraryUrl": "http://openlibrary.org/books/OL24385514M/Thief_of_time",
      "publishDate": "2002",
      "title": "Thief of time"
    }
  }
}
```

{"OL24385514M":{"authors":[{"name":"Terry Pratchett","openLibraryUrl":"http://openlibrary.org/authors/OL25712A/Terry_Pratchett"}],"catalogId":"OL24385514M","coverImageUrl":"https://covers.openlibrary.org/b/id/6636627-S.jpg","identifiers":{"isbn10List":[{"isbn10":"0061031321"}],"isbn13List":[{"isbn13":"9780061031328"}]},"inCatalog":false,"numberOfPages":357,"openLibraryUrl":"http://openlibrary.org/books/OL24385514M/Thief_of_time","publishDate":"2002","title":"Thief of time"}}
