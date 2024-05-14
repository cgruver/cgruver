---
permalink: /home-lab/install-labcli/
title: "Command Line Interface for your Kubernetes (OpenShift) Home Lab"
description: "CLI for OpenShift and OKD Home Lab with Raspberry Pi, Intel NUC, CentOS Stream, and OpenWRT"
tags:
  - openshift
  - okd
  - kubernetes
  - openwrt
  - raspberry pi
  - home lab
---
I have provided a set of shell utilities to simplify many of the provisioning and management tasks for your lab.  These utilities also enable you to run multiple OpenShift clusters at the same time.

__Note:__ These utilities are very opinionated toward the equipment that I run in my lab.  See the equipment list here: [Lab Equipment](/home-lab/equipment/)

You can get the utilities from: [https://github.com/cgruver/kamarotos](https://github.com/cgruver/kamarotos)

## Install the Utilities

In the spirit of Kubernetes naming, I wanted to give it a nautical name.  Since these scripts take on the drudgery of repeated tasks, I chose to name them after the guy that cleans the toilets on a ship...  Thus, the project is named: __καμαρότος__.  That is, kamarótos; Greek for Ship's steward or cabin boy...

1. Create a directory for all of your lab manifests and utilities:

   ```bash
   mkdir -p ${HOME}/okd-lab/bin
   ```

1. Create a temporary working directory:

   ```bash
   WORK_DIR=$(mktemp -d)
   ```

1. Clone the git repository that I have created with helper scripts:

   ```bash
   git clone -b archive-2 https://github.com/cgruver/kamarotos.git ${WORK_DIR}
   ```

1. Copy the helper scripts to `${HOME}/okd-lab`:

   ```bash
   cp ${WORK_DIR}/bin/* ${HOME}/okd-lab/bin
   chmod 700 ${HOME}/okd-lab/bin/*
   ```

1. Copy the lab configuration example files to ${HOME}/okd-lab/lab-config/examples

   ```bash
   mkdir -p ${HOME}/okd-lab/lab-config/cluster-configs
   cp -r ${WORK_DIR}/examples ${HOME}/okd-lab/lab-config
   ```

1. Remove the temporary directory

   ```bash
   rm -rf ${WORK_DIR}
   ```

1. Add the following to your shell environment:

   Your default shell will be something like `bash` or `zsh`.  Although you might have changed it.

   You need to add the following line to the appropriate shell file in your home directory: `.bashrc`, or `.zshrc`, etc...

   __Bash:__

   ```bash
   echo ". ${HOME}/okd-lab/bin/labEnv.sh" >> ~/.bashrc
   ```

   __Zsh:__

   ```bash
   echo ". ${HOME}/okd-lab/bin/labEnv.sh" >> ~/.zshrc
   ```

   __Note:__ Take a look at the file `${HOME}/okd-lab/bin/labEnv.sh`.  It will set variables in your shell when you log in, so make sure you are comfortable with what it is setting.  If you don't want to add it to your shell automatically, the you will need to execute `. ${HOME}/okd-lab/bin/labEnv.sh` before running any lab commands.

   It's always a good practice to look at what a downloaded script is doing, since it is running with your logged in privileges...  I know that you NEVER run one of those; `curl some URL | bash`...  without looking at the file first...  right?

   There will be a test later...  :-)

1. Install `yq`

   We will need the `yq` utility for YAML file manipulation: [https://mikefarah.gitbook.io/yq/](https://mikefarah.gitbook.io/yq/)

   * MacOS:

      ```bash
      brew install yq
      ```

   * Linux:

      ```bash
      mkdir ${OKD_LAB_PATH}/yq-tmp
      YQ_VER=$(basename $(curl -Ls -o /dev/null -w %{url_effective} https://github.com/mikefarah/yq/releases/latest))
      wget -O ${OKD_LAB_PATH}/yq-tmp/yq.tar.gz https://github.com/mikefarah/yq/releases/download/${YQ_VER}/yq_linux_amd64.tar.gz
      tar -xzf ${OKD_LAB_PATH}/yq-tmp/yq.tar.gz -C ${OKD_LAB_PATH}/yq-tmp
      cp ${OKD_LAB_PATH}/yq-tmp/yq_linux_amd64 ${OKD_LAB_PATH}/bin/yq
      chmod 700 ${OKD_LAB_PATH}/bin/yq
      ```

1. Create an SSH Key Pair:

   If you don't have an SSH key pair configured on your workstation, then create one now:

   ```bash
   ssh-keygen -t rsa -b 4096 -N "" -f ${HOME}/.ssh/id_rsa
   ```

1. Copy the SSH public key to the Lab configuration folder:

   ```bash
   cp ~/.ssh/id_rsa.pub ${OKD_LAB_PATH}/ssh_key.pub
   ```

1. __Open a new terminal to set the variables.__
