---
title: "Eclipse Che / OpenShift Dev Spaces - Podman With Fuse Overlay"
date:   2023-08-10 00:00:00 -0400
description: "Eclipse Che & OpenShift Dev Spaces: Faster Image Builds With Fuse Overlay Support"
header:
  image: /_pages/dev-spaces/images/code-on-ipad.png
tags:
  - OpenShift Dev Spaces
  - Kubernetes
  - Eclipse Che
  - Cloud Native IDE
  - Devfile
  - VS Code Workspace
categories:
  - Blog Post
---
In this post, I am going to show you how to enable faster `podman` builds in Eclipse Che / OpenShift Dev Spaces by enabling support for `/dev/fuse` in your workspace.  This will eliminate the need for using `vfs` with podman.  It also gets us closer to being able to to `podman run` in a rootless container.

But first, you need an OpenShift cluster and Eclipse Che or OpenShift Dev Spaces.

## Install Eclipse Che / Dev Spaces on an OpenShift Cluster

If you don't already have access to an OpenShift cluster, here are a few options for you:

* Local Workstation:
  * [Install OpenShift and Dev Spaces on Your Workstation](/dev-spaces/install-crc/){:target="_blank"}
  * This option requires a fairly beefy machine.  You need 16GB RAM minimum for it to run effectively.
* Build Your Own (OKD) OpenShift:
  * KVM Based:
    * [Single Node](/blog%20post/2023/03/06/Back-To-Where-It-All-Started.html){:target="_blank"}
    * [Three Node](/blog%20post/2023/03/18/Multi-Node-OpenShift-Home-Lab.html){:target="_blank"}
  * Bare Metal Single Node __(My Favorite)__
    * [SNO on Bare Metal](/blog%20post/2023/05/21/Pull-Youself-Up-By-Your-Bootstraps.html){:target="_blank"}
  * [__Install upstream Eclipse Che on OKD or OCP__](/dev-spaces/install-eclipse-che){:target="_blank"}
* On Your Own OCP Cluster:
  * [Install Dev Spaces on an OCP Cluster](/dev-spaces/install-dev-spaces/){:target="_blank"}
  * __Note:__ This will not work on ROSA or ARO.  It is technically feasible, but the managed nature of those offerings does not allow you to apply your own MachineConfigs.

## Configure your OpenShift Cluster to Allow Pods to Mount `/dev/fuse`

We are now going to create a MachineConfig that will enable containers in OpenShift Pods to access `/dev/fuse`.

This is a fairly advanced task on your OpenShift cluster.  Which is why ROSA and other managed offerings don't allow users to do this.  You can really mess up your cluster with a bad MachineConfig.

So, with that warning in place, let's do something dangerous!  ;-)

To modify our cluster, we are going to inject an additional configuration into the CRI-O engine that is the core of running containers on OpenShift.

This configuration change is going to enable a Kubernetes feature that allows containers to access devices on the host operating system.  Since it follows an "Allow" list paradigm, this is relatively safe and secure as long as you don't leak a device that grants unintended access.

AFAIK, leaking `/dev/fuse` into containers does not pose a security risk...  But, I'm ready to be wrong too...

With that second disclaimer in place, let's do this.

1. Install `butane`:

   [https://coreos.github.io/butane/](https://coreos.github.io/butane/){:target="_blank"}

   We need `butane` to assist with the creation of MachineConfigs.  It's really handy for that.

   __Note:__ If you previously followed one of my blog posts to install your OpenShift cluster, then you should already have `butane` installed.

1. Open a shell terminal and log into your OpenShift cluster with the `oc` CLI.

1. Set a variable for the OpenShift Node role that you are going to apply the changes to:

   If you are using a Single Node cluster or OpenShift Local, then set:

   ```bash
   NODE_ROLE=master
   ```

   If you are using an OpenShift cluster with separate control-plane and compute nodes, then set:

   ```bash
   NODE_ROLE=worker
   ```

1. Apply a MachineConfig to enable Pods to mount `/dev/fuse`

   __Note:__ If you are using a SingleNode instance, it will reboot.  So, make sure you do not have any processes running that need to complete.

   ```bash
   cat << EOF | butane | oc apply -f -
   variant: openshift
   version: 4.13.0
   metadata:
     labels:
       machineconfiguration.openshift.io/role: ${NODE_ROLE}
     name: podman-dev-fuse-${NODE_ROLE}
   storage:
     files:
     - path: /etc/crio/crio.conf.d/99-podman-fuse
       mode: 0644
       overwrite: true
       contents:
         inline: |
           [crio.runtime.workloads.podman-fuse]
           activation_annotation = "io.openshift.podman-fuse"
           allowed_annotations = [
             "io.kubernetes.cri-o.Devices"
           ]
           [crio.runtime]
           allowed_devices=["/dev/fuse"]
   EOF
   ```

1. Wait for the MachineConfig to apply.  This will reboot the affected nodes.

That's it!  We have just enabled `/dev/fuse` access for containers.

In the next section, we'll demo it within Dev Spaces.

But first, let's talk about what this MachineConfig did to the cluster.

This particular MachineConfig is pretty simple.  We're just adding a file to the underlying Linux operating system.

The file will be written to: `/etc/crio/crio.conf.d/99-podman-fuse`

The contents of the file will be:

```bash
[crio.runtime.workloads.podman-fuse]
activation_annotation = "io.openshift.podman-fuse"
allowed_annotations = [
 "io.kubernetes.cri-o.Devices"
]
[crio.runtime]
allowed_devices=["/dev/fuse"]
```

This file modifies the configuration of the CRI-O engine which runs containers on the linux host.  It instructs CRI-O to allow a container to mount an underlying device by using the `io.kubernetes.cri-o.Devices` annotation, if that container also has the `io.openshift.podman-fuse` annotation.

The list of allowed devices is limited to `/dev/fuse`.

So, a container with the following annotations, will be allowed access to `/dev/fuse`:

```yaml
annotations:
  io.openshift.podman-fuse: ""
  io.kubernetes.cri-o.Devices: "/dev/fuse"
```

Now, let's see it in action.

## Demo Of `fuse-overlay` in Dev Spaces

1. Log into Eclipse Che / Dev Spaces with a non privileged user.  Don't use `cluster-admin`` access for this part.

1. Create a new workspace from [https://github.com/cgruver/che-podman-fuse-demo.git](https://github.com/cgruver/che-podman-fuse-demo.git)

   <img src="/_pages/dev-spaces/podman-fuse-demo-images/podman-fuse-demo-create-workspace.png" width="75%"/>

1. After the workspace starts, VS Code will ask you to trust the authors of the code repository.

   You can trust me.  ;-)

   <img src="/_pages/dev-spaces/podman-fuse-demo-images/podman-fuse-demo-trust-authors.png" width="50%"/>

1. Now, open a terminal:

  Right click on the code repo folder `che-podman-fuse-demo`

  Click `Open in integrated Terminal`

   <img src="/_pages/dev-spaces/podman-fuse-demo-images/podman-fuse-demo-open-terminal.png" width="50%"/>

1. In the terminal execute the following:

   ```bash
   podman build -t test:test -f podman-fuse.Containerfile .
   ```

1. You should have seen a successful build of the container image.

   <img src="/_pages/dev-spaces/podman-fuse-demo-images/podman-fuse-demo-build-images.png" width="100%"/>

So, that's Podman with `/dev/fuse` enabled.

Now, here's something that I'm still working on.

## Demo of *"Almost"* working `podman run` in Dev Spaces

OK, this is a bit of a bonus here...  Something else that I'm working on.  *"How do you enable `podman run` in Dev Spaces?"*

This isn't quite usable yet for Java test-containers or other activities that require a full container execution environment.  But I feel like it's getting really close.

I'm also not clear on the security implications to what I'm doing here.  __So, tread carefully and don't do this on a shared cluster.__

We need to apply another MachineConfig that is going to configure SELinux to add some allowed capabilities to the existing `container_t` Type.

1. Open a shell terminal and log into your OpenShift cluster with the `oc` CLI.

1. Set a variable for the OpenShift Node role that you are going to apply the changes to:

   If you are using a Single Node cluster or OpenShift Local, then set:

   ```bash
   NODE_ROLE=master
   ```

   If you are using an OpenShift cluster with separate control-plane and compute nodes, then set:

   ```bash
   NODE_ROLE=worker
   ```

1. Now, apply the MachineConfig and wait for your cluster to apply it.  __Note:__ As before, this will reboot your Single Node cluster if that's what you are running.

   ```bash
   cat << EOF | butane | oc apply -f -
   variant: openshift
   version: 4.13.0
   metadata:
     labels:
       machineconfiguration.openshift.io/role: ${NODE_ROLE}
     name: nested-podman-${NODE_ROLE}
   storage:
     files:
     - path: /etc/nested-podman/nested-podman.te
       mode: 0644
       overwrite: true
       contents:
         inline: |
           module nested-podman 1.0;

           require {
             type container_t;
             type devpts_t;
             type tmpfs_t;
             type sysfs_t;
             type nsfs_t;
             class chr_file open;
             class filesystem { mount remount unmount };
           }
           allow container_t tmpfs_t:filesystem mount;
           allow container_t devpts_t:filesystem mount;
           allow container_t devpts_t:filesystem remount;
           allow container_t devpts_t:chr_file open;
           allow container_t nsfs_t:filesystem unmount;
           allow container_t sysfs_t:filesystem remount;
   systemd:
     units:
     - contents: |
         [Unit]
         Description=Modify SeLinux Type container_t to allow devpts_t and tmpfs_t
         DefaultDependencies=no
         After=kubelet.service

         [Service]
         Type=oneshot
         RemainAfterExit=yes
         ExecStart=bash -c "/bin/checkmodule -M -m -o /tmp/nested-podman.mod /etc/nested-podman/nested-podman.te && /bin/semodule_package -o /tmp/nested-podman.pp -m /tmp/nested-podman.mod && /sbin/semodule -i /tmp/nested-podman.pp"
         TimeoutSec=0

         [Install]
         WantedBy=multi-user.target
       enabled: true
       name: systemd-nested-podman-selinux.service
   EOF
   ```

Now, let's see it in action.

## Demo Of `podman run` in Dev Spaces

1. Log into Eclipse Che / Dev Spaces with a non privileged user.

1. Open the `podman-fuse-demo` workspace that we previously created from [https://github.com/cgruver/che-podman-fuse-demo.git](https://github.com/cgruver/che-podman-fuse-demo.git)

   <img src="/_pages/dev-spaces/podman-fuse-demo-images/podman-fuse-demo-open-workspace.png" width="100%"/>

1. After the workspace starts, open a terminal as before

   <img src="/_pages/dev-spaces/podman-fuse-demo-images/podman-fuse-demo-open-terminal.png" width="50%"/>

1. In the terminal, execute the following to set up the Podman config:

   ```bash
   mkdir ${HOME}/proc
   mkdir -p ~/.config/containers
   cat << EOF > ~/.config/containers/containers.conf                              
   [containers]
   netns="host"
   volumes=[
     "${HOME}/proc:/proc:rw"
   ]
   EOF
   ```

   We're adding this config because podman will not have access to `/dev/tun`.

   I could probably add that to the MachineConfig.  But I haven't yet.

   We are also adding an empty `proc` directory because Podman does not have access to `/proc`.  That's a puzzle I haven't solved yet.

1. In the terminal run a container:

   ```bash
   podman run registry.access.redhat.com/ubi9/ubi-minimal echo hello
   ```

1. You should have seen a successful execution of the container.

   <img src="/_pages/dev-spaces/podman-fuse-demo-images/podman-fuse-demo-run-hello.png" width="75%"/>

1. Now, run:

   ```bash
   podman run -it registry.access.redhat.com/ubi9/ubi-minimal
   ```

1. You should now have an open shell into the running container.

   <img src="/_pages/dev-spaces/podman-fuse-demo-images/podman-fuse-demo-run-with-shell.png" width="75%"/>

I hope you had fun with this little exercise.

Watch this blog for future updates.

Cheers.
