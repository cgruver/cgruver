1. Create a YAML file to define the network and hosts for the OpenShift cluster that we're going to install:

   ```bash
   cat << EOF  > ${OKD_LAB_PATH}/lab-config/dev-cluster.yaml
   cluster-name: okd4
   secret-file: ${OKD_LAB_PATH}/lab-config/pull_secret.json
   local-registry: nexus.${LAB_DOMAIN}:5001
   remote-registry: quay.io/openshift/okd
   butane-version: v0.12.1
   butane-spec-version: 1.3.0
   okd-version: ${OKD_VERSION}
   bootstrap:
     metal: false
     kvm-host: kvm-host01
     memory: 12288
     cpu: 4
     root_vol: 50
   control-plane:
     metal: false
     memory: 20480
     cpu: 6
     root_vol: 100
     kvm-hosts:
     - kvm-host01
     - kvm-host01
     - kvm-host01
   EOF
   ```

   Your OpenShift cluster configuration YAML file should look something like this:

   ```yaml
   cluster-name: okd4
   secret-file: ${OKD_LAB_PATH}/lab-config/pull_secret.json
   local-registry: nexus.${LAB_DOMAIN}:5001
   remote-registry: quay.io/openshift/okd
   butane-version: v0.12.1
   butane-spec-version: 1.3.0
   okd-version: 4.8.0-0.okd-2021-11-14-052418
   bootstrap:
     metal: false
     kvm-host: kvm-host01
     memory: 12288
     cpu: 4
     root_vol: 50
   control-plane:
     metal: false
     memory: 20480
     cpu: 6
     root_vol: 100
     kvm-hosts:
     - kvm-host01
     - kvm-host01
     - kvm-host01
   ```
