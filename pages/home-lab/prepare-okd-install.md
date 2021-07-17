---
layout: page
permalink: /home-lab/prepare-okd-install/
title: Preparing to Install OpenShift
---
## Prepare to Install OKD 4.4

I have provided a set of utility scripts to automate a lot of the tasks associated with deploying and tearing down an OKD cluster.  In your `~/bin/lab-bin` directory you will see the following:

| | |
|-|-|
| `UnDeployLabGuest.sh` | Destroys a guest VM and supporting infrastructure |
| `DeployOkdNodes.sh` | Creates the HA-Proxy, Bootstrap, Master, and Worker VMs from an inventory file, (described below) |
| `UnDeployOkdNodes.sh` | Destroys the OKD cluster and all supporting infrastructure |
| `PowerOnVms.sh` | Helper script that uses IPMI to power on the VMs listed in an inventory file |

1. First, let's prepare to deploy the VMs for our OKD cluster by preparing the Cluster VM inventory file:

    This is not an ansible inventory like you might have encountered with OKD 3.11.  This is something I made up for my lab that allows me to quickly create, manage, and destroy virtual machines.

    I have provided an example that will create the virtual machines for this deployment.  It is located at `./Provisioning/guest_inventory/okd4_lab`.  The file is structured in such a way that it can be parsed by the utility scripts provided in this project.  The columns in the comma delimited file are used for the following purposes:

    | Column | Name | Description |
    |-|-|-|
    | 1 | KVM_HOST_NODE  | The hypervisor host that this VM will be provisioned on |
    | 2 | GUEST_HOSTNAME | The hostname of this VM, must be in DNS with `A` and `PTR` records |
    | 3 | MEMORY | The amount of RAM in MB to allocate to this VM |
    | 4 | CPU | The number of vCPUs to allocate to this VM |
    | 5 | ROOT_VOL | The size in GB of the first HDD to provision |
    | 6 | DATA_VOL | The size in GB of the second HDD to provision; `0` for none |
    | 7 | NUM_OF_NICS | The number of NICs to provision for thie VM; `1` or `2` |
    | 8 | ROLE | The OKD role that this VM will play: `bootstrap`, `master`, or `worker` |

    It looks like this: (The entries for the three worker nodes are commented out, if you have two KVM hosts with 64GB RAM each, then you can uncomment those lines and have a full 6-node cluster)

    ```bash
    bastion,okd4-lb01,4096,1,50,0,1,ha-proxy,2668
    bastion,okd4-bootstrap,16384,4,50,0,1,bootstrap,6229
    kvm-host01,okd4-master-0,20480,4,100,0,1,master,6230
    kvm-host01,okd4-master-1,20480,4,100,0,1,master,6231
    kvm-host01,okd4-master-2,20480,4,100,0,1,master,6232
    # kvm-host02,okd4-worker-0,20480,4,100,0,1,worker,6233
    # kvm-host02,okd4-worker-1,20480,4,100,0,1,worker,6234
    # kvm-host02,okd4-worker-2,20480,4,100,0,1,worker,6235
    ```

    Copy this file into place, and modify it if necessary:

    ```bash
    mkdir -p ${OKD4_LAB_PATH}/guest-inventory
    cp ./Provisioning/guest_inventory/okd4_lab ${OKD4_LAB_PATH}/guest-inventory
    ```

1. Retrieve the `oc` command.  We're going to grab an older version of `oc`, but that's OK.  We just need it to retrieve to current versions of `oc` and `openshift-install`

    ```bash
    wget https://github.com/openshift/okd/releases/download/4.5.0-0.okd-2020-07-14-153706-ga/openshift-client-linux-4.5.0-0.okd-2020-07-14-153706-ga.tar.gz
    ```

1. Uncompress the archive and move the `oc` executable to your ~/bin directory.  Make sure ~/bin is in your path.

    ```bash
    tar -xzf openshift-client-linux-4.5.0-0.okd-2020-07-14-153706-ga.tar.gz
    mv oc ~/bin
    ```

    The `DeployOkdNodes.sh` script will pull the correct version of `oc` and `openshift-install` when we run it.  It will over-write older versions in `~/bin`.

1. Now, we need a couple of pull secrets.  

   The first one is for quay.io.  Since we are installing OKD, we don't need an official pull secret.  So, we will use a fake one.

    1. Create the pull secret for Nexus.  Use a username and password that has write authority to the `origin` repository that we created earlier.

        ```bash
        NEXUS_PWD=$(echo -n "admin:your_admin_password" | base64 -w0)
        ```

    1. We need to put the pull secret into a JSON file that we will use to mirror the OKD images into our Nexus registry.  We'll also need the pull secret for our cluster install.

        ```bash
        cat << EOF > ${OKD4_LAB_PATH}/pull_secret.json
        {"auths": {"fake": {"auth": "Zm9vOmJhcgo="},"nexus.${LAB_DOMAIN}:5001": {"auth": "${NEXUS_PWD}"}}}
        EOF 
        ```

1. We need to pull a current version of OKD.  So point your browser at `https://origin-release.svc.ci.openshift.org`.  

    ![OKD Release](images/OKD-Release.png)

    Select the most recent 4.4.0-0.okd release that is in a Phase of `Accepted`, and copy the release name into an environment variable:

    ```bash
    export OKD_RELEASE=4.7.0-0.okd-2021-04-24-103438
    getOkdCmds.sh
    ```

1. The next step is to prepare our install-config.yaml file that `openshift-install` will use to create the `ignition` files for bootstrap, master, and worker nodes.

    I have prepared a skeleton file for you in this project, `./Provisioning/install-config-upi.yaml`.

    ```yaml
    apiVersion: v1
    baseDomain: %%LAB_DOMAIN%%
    metadata:
      name: %%CLUSTER_NAME%%
    networking:
      networkType: OpenShiftSDN
      clusterNetwork:
      - cidr: 10.100.0.0/14 
        hostPrefix: 23 
      serviceNetwork: 
      - 172.30.0.0/16
      machineNetwork:
      - cidr: 10.11.11.0/24
    compute:
    - name: worker
      replicas: 0
    controlPlane:
      name: master
      replicas: 3
    platform:
      none: {}
    pullSecret: '%%PULL_SECRET%%'
    sshKey: %%SSH_KEY%%
    additionalTrustBundle: |

    imageContentSources:
    - mirrors:
      - nexus.%%LAB_DOMAIN%%:5001/origin
      source: registry.svc.ci.openshift.org/origin/%%OKD_VER%%
    - mirrors:
      - nexus.%%LAB_DOMAIN%%:5001/origin
      source: registry.svc.ci.openshift.org/origin/release
    ```

    Copy this file to our working directory.

    ```bash
    cp ./Provisioning/install-config-upi.yaml ${OKD4_LAB_PATH}/install-config-upi.yaml
    ```

    Patch in some values:

    ```bash
    sed -i "s|%%LAB_DOMAIN%%|${LAB_DOMAIN}|g" ${OKD4_LAB_PATH}/install-config-upi.yaml
    SECRET=$(cat ${OKD4_LAB_PATH}/pull_secret.json)
    sed -i "s|%%PULL_SECRET%%|${SECRET}|g" ${OKD4_LAB_PATH}/install-config-upi.yaml
    SSH_KEY=$(cat ~/.ssh/id_rsa.pub)
    sed -i "s|%%SSH_KEY%%|${SSH_KEY}|g" ${OKD4_LAB_PATH}/install-config-upi.yaml
    ```

    For the last piece, you need to manually paste in a cert.  No `sed` magic here for you...

    Copy the contents of: `/etc/pki/ca-trust/source/anchors/nexus.crt` and paste it into the blank line here in the config file:

    ```bash
    additionalTrustBundle: |

    imageContentSources:
    ```

    You need to indent every line of the cert with two spaces for the yaml syntax.

    Your install-config-upi.yaml file should now look something like:

    ```yaml
    apiVersion: v1
    baseDomain: your.domain.org
    metadata:
      name: %%CLUSTER_NAME%%
    networking:
      networkType: OpenShiftSDN
      clusterNetwork:
      - cidr: 10.100.0.0/14 
        hostPrefix: 23 
      serviceNetwork: 
      - 172.30.0.0/16
    compute:
    - name: worker
      replicas: 0
    controlPlane:
      name: master
      replicas: 3
    platform:
      none: {}
    pullSecret: '{"auths": {"fake": {"auth": "Zm9vOmJhcgo="},"nexus.oscluster.clgcom.org:5002": {"auth": "YREDACTEDREDACTED=="}}}'
    sshKey: ssh-rsa AAAREDACTEDREDACTEDAQAREDACTEDREDACTEDMnvPFqpEoOvZi+YK3L6MIGzVXbgo8SZREDACTEDREDACTEDbNZhieREDACTEDREDACTEDYI/upDR8TUREDACTEDREDACTEDoG1oJ+cRf6Z6gd+LZNE+jscnK/xnAyHfCBdhoyREDACTEDREDACTED9HmLRkbBkv5/2FPpc+bZ2xl9+I1BDr2uREDACTEDREDACTEDG7Ms0vJqrUhwb+o911tOJB3OWkREDACTEDREDACTEDU+1lNcFE44RREDACTEDREDACTEDov8tWSzn root@bastion
    additionalTrustBundle: |
      -----BEGIN CERTIFICATE-----
      MIIFyTREDACTEDREDACTEDm59lk0W1CnMA0GCSqGSIb3DQEBCwUAMHsxCzAJBgNV
      BAYTAlREDACTEDREDACTEDVTMREwDwYDVQQIDAhWaXJnaW5pYTEQMA4GA1UEBwwH
      A1UECgwGY2xnY29tMREwDwREDACTEDREDACTEDYDVQQLDAhva2Q0LWxhYjEjMCEG
      b3NjbHVzdGVyLmNsZ2NvbS5vcmcwHhcNMjAwMzREDACTEDREDACTEDE0MTYxMTQ2
      MTQ2WREDACTEDREDACTEDjB7MQswCQYDVQQGEwJVUzERMA8GA1UECAwIVmlyZ2lu
      B1JvYW5va2UxDzANBgNVBREDACTEDREDACTEDAoMBmNsZ2NvbTERMA8GA1UECwwI
      BgNVBAMMGm5leHVzLm9zY2x1c3Rlci5jbGdjbREDACTEDREDACTED20ub3JnMIIC
      REDACTEDREDACTEDAQEFAAOCAg8AMIICCgKCAgEAwwnvZEW+UqsyyWwHS4rlWbcz
      hmvMMBXEXqNqSp5sREDACTEDREDACTEDlYrjKIBdLa9isEfgIydtTWZugG1L1iA4
      hgdAlW83s8wwKW4bbEd8iDZyUFfzmFSKREDACTEDREDACTEDTrwk9JcH+S3/oGbk
      9iq8oKMiFkz9loYxTu93/p/iGieTWMFGajbAuUPjZsBYgbf9REDACTEDREDACTED
      REDACTEDREDACTEDYlFMcpkdlfYwJbJcfqeXAf9Y/QJQbBqRFxJCuXzr/D5Ingg3
      HrXXvOr612LWHFvZREDACTEDREDACTEDYj7JRKKPKXIA0NHA29Db0TdVUzDi3uUs
      WcDBmIpfZTXfrHG9pcj1CbOsw3vPhD4mREDACTEDREDACTEDCApsGKET4FhnFLkt
      yc2vpaut8X3Pjep821pQznT1sR6G1bF1eP84nFhL7qnBdhEwREDACTEDREDACTED
      REDACTEDREDACTEDIuOZH60cUhMNpl0uMSYU2BvfVDKQlcGPUh7pDWWhZ+5I1pei
      KgWUMBT/j3KAJNgFREDACTEDREDACTEDX43aDvUxyjbDg8FyjBGY1jdS8TnGg3YM
      zGP5auSqeyO1yZ2v3nbr9xUoRTVuzPUwREDACTEDREDACTED0SfiaeGPczpNfT8f
      6H0CAwEAAaNQME4wHQYDVR0OBBYEFPAJpXdtNX0bi8dh1QMsREDACTEDREDACTED
      REDACTEDREDACTEDIwQYMBaAFPAJpXdtNX0bi8dh1QMsE1URxd8tMAwGA1UdEwQF
      hvcNAQELBQADggIBREDACTEDREDACTEDAAx0CX20lQhP6HBNRl7C7IpTEBpds/4E
      dHuDuGMILaawZTbbKLMTlGu01Y8uCO/3REDACTEDREDACTEDUVZeX7X9NAw80l4J
      kPtLrp169L/09F+qc8c39jb7QaNRWenrNEFFJqoLRakdXM1MREDACTEDREDACTED
      REDACTEDREDACTED5CAWBCRgm67NhAJlzYOyqplLs0dPPX+kWdANotCfVxDx1jRM
      8tDL/7kurJA/wSOLREDACTEDREDACTEDDCaNs205/nEAEhrHLr8NHt42/TpmgRlg
      fcZ7JFw3gOtsk6Mi3XtS6rxSKpVqUWJ8REDACTEDREDACTED3nafC2IQCmBU2KIZ
      3Oir8xCyVjgf4EY/dQc5GpIxrJ3dV+U2Hna3ZsiCooAdq957REDACTEDREDACTED
      REDACTEDREDACTED57krXJy+4z8CdSMa36Pmc115nrN9Ea5C12d6UVnHnN+Kk4cL
      Wr9ZZSO3jDiwuzidREDACTEDREDACTEDk/IP3tkLtS0s9gWDdHdHeW0eit+trPib
      Oo9fJIxuD246HTQb+51ZfrvyBcbAA/M3REDACTEDREDACTED06B/Uq4CQMjhRwrU
      aUEYgiOJjUjLXGJSuDVdCo4J9kpQa5D1bUxcHxTp3R98CasnREDACTEDREDACTED
      -----END CERTIFICATE-----
    imageContentSources:
    - mirrors:
      - nexus.your.domain.org:5001/origin
      source: %%OKD_SOURCE_1%%
    - mirrors:
      - nexus.your.domain.org:5001/origin
      source: %%OKD_SOURCE_2%%
    ```

1. Now mirror the OKD images into the local Nexus:

    ```bash
    mirrorOkdRelease.sh
    ```

    The output should look something like:

    ```bash
    Success
    Update image:  nexus.your.domain.org:5001/origin:4.5.0-0.okd-2020-08-12-020541
    Mirror prefix: nexus.your.domain.org:5001/origin

    To use the new mirrored repository to install, add the following section to the install-config.yaml:

    imageContentSources:
    - mirrors:
      - nexus.your.domain.org:5001/origin
      source: quay.io/openshift/okd
    - mirrors:
      - nexus.your.domain.org:5001/origin
      source: quay.io/openshift/okd-content


    To use the new mirrored repository for upgrades, use the following to create an ImageContentSourcePolicy:

    apiVersion: operator.openshift.io/v1alpha1
    kind: ImageContentSourcePolicy
    metadata:
      name: example
    spec:
      repositoryDigestMirrors:
      - mirrors:
        - nexus.your.domain.org:5001/origin
        source: quay.io/openshift/okd
      - mirrors:
        - nexus.your.domain.org:5001/origin
        source: quay.io/openshift/okd-content
    ```

1. Create the cluster virtual machines and set up for OKD installation:

    ```bash
    DeployOkdNodes.sh -i=${OKD4_LAB_PATH}/guest-inventory/okd4_lab -cn=okd4
    ```

    This script does a whole lot of work for us.

    1. It will pull the current versions of `oc` and `openshift-install` based on the value of `${OKD_RELEASE}` that we set previously.
    1. fills in the OKD version and `%%CLUSTER_NAME%%` in the install-config-upi.yaml file and copies that file to the install directory as install-config.yaml.
    1. Invokes the openshift-install command against our install-config to produce ignition files
    1. Copies the ignition files into place for FCOS install
    1. Sets up for a mirrored install by putting `quay.io` and `registry.svc.ci.openshift.org` into a DNS sinkhole.
    1. Creates guest VMs based on the inventory file at `${OKD4_LAB_PATH}/guest-inventory/okd4`
    1. Creates iPXE boot files for each VM and copies them to the iPXE server, (your router)

[OpenShift Install](/home-lab/install-okd)
