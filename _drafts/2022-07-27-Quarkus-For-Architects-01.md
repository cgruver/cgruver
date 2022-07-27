---
title: "Quarkus for Architects who Sometimes Write Code - Client & Server"
date:   2022-07-28 00:00:00 -0400
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

### Install a helper script

I will also be using one of the utility scripts that I wrote for managing tasks in my own home lab.  You don't need to install the whole project right now, but you'll need it later if you decide to set up your own [OpenShift cluster](/home-lab/lab-intro/){:target="_blank"} and [developer tooling](https://upstreamwithoutapaddle.com/blog%20post/2022/06/25/API-Dev-Tools.html){:target="_blank"}.

The scripts and home lab configuration files are at: [https://github.com/cgruver/kamarotos](https://github.com/cgruver/kamarotos){:target="_blank"}

The only script from that bundle that we need is: [https://raw.githubusercontent.com/cgruver/kamarotos/main/bin/code](https://raw.githubusercontent.com/cgruver/kamarotos/main/bin/code){:target="_blank"}

Do the following to install it:

```bash
mkdir -p ${HOME}/okd-lab/bin
curl -o ${HOME}/okd-lab/bin/code -fsSL https://raw.githubusercontent.com/cgruver/kamarotos/main/bin/code
chmod 700
```

Now, edit your `~/.zshrc` or `~/.bashrc` file and add `${HOME}/okd-lab/bin` to your `$PATH`

For example:

```bash
echo "PATH=$PATH:${HOME}/okd-lab/bin" >> ~/.zshrc
```
