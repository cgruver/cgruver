---
title: "Quarkus for Architects who Sometimes Write Code - Setup"
description: "Quarkus Application Development Examples"
sitemap: true
published: true
permalink: /tutorials/quarkus-for-architects-dev-setup/
tags:
  - Quarkus Examples
  - Quarkus CLI
  - Quarkus Dev Mode Example
---

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
   PATH="/usr/local/opt/openjdk@17/bin:\$PATH"
   export CPPFLAGS="-I/usr/local/opt/openjdk@17/include"
   export JAVA_HOME=$(/usr/libexec/java_home)
   ###
   EOF
   ```

### Install my code prototyping helper script

In these Quarkus examples I will be using one of the utility scripts that I wrote for managing tasks in my own home lab.  You don't need to install the whole project right now, but you'll need it later if you decide to set up your own [OpenShift cluster](/home-lab/lab-intro/){:target="_blank"} and [developer tooling](https://upstreamwithoutapaddle.com/blog%20post/2022/06/25/API-Dev-Tools.html){:target="_blank"}.

The scripts and home lab configuration files are at: [https://github.com/cgruver/kamarotos](https://github.com/cgruver/kamarotos){:target="_blank"}

The only script from that bundle that we need is: [https://raw.githubusercontent.com/cgruver/kamarotos/main/bin/code](https://raw.githubusercontent.com/cgruver/kamarotos/main/bin/code){:target="_blank"}

Do the following to install it:

1. Create a working directory for these Quarkus examples:

   ```bash
   mkdir -p ${HOME}/okd-lab/bin
   mkdir ${HOME}/okd-lab/quarkus-projects
   ```

   __Note:__ I'm being prescriptive here to keep things consistent with my other lab projects on this site.

1. Grab the helper script:

   ```bash
   curl -o ${HOME}/okd-lab/bin/code -fsSL https://raw.githubusercontent.com/cgruver/kamarotos/main/bin/code
   chmod 700 ${HOME}/okd-lab/bin/code
   ```

1. Now, edit your `~/.zshrc` or `~/.bashrc` file and add `${HOME}/okd-lab/bin` to your `$PATH`

   For example:

   ```bash
   echo "PATH=$PATH:${HOME}/okd-lab/bin" >> ~/.zshrc
   ```

### Description of my `code` project bootstrapping script

The script that you just grabbed is very opinionated toward the way I like to organize my code when I am prototyping.  It also wraps the Quarkus CLI, and includes a couple of functions for adding properties and dependencies to a `pom.xml`.  I really hate manually modifying the POM file...  It's just a quirk of mine...  so I wrote a couple of functions to do the most common tasks.

As I mentioned, this script wraps the Quarkus CLI to bootstrap your project structure.

I am using `quarkus` it in an opinionated way:

```bash
quarkus create app --maven --java=${JAVA_VER} --no-wrapper --no-code --package-name=${GROUP_ID}.${APP_NAME} --extensions=${EXTENSIONS} ${QUARKUS_VERSION} ${GROUP_ID}:${APP_NAME}:0.1
```

To see the script in action, run:

```bash
code --create -b -a=apiclient -g=fun.is.quarkus -x=scheduler
```

This creates a basic REST service structure and includes the Quarkus Scheduler extension.

The base extensions that I include with the `-b` option are: `resteasy-reactive-jackson`, `rest-client-reactive-jackson`, `smallrye-health`, and `config-yaml`.

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
