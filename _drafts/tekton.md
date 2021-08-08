

```bash
openssl s_client -showcerts -connect default-route-openshift-image-registry.apps.okd4.dc1.clg.lab:443 </dev/null 2>/dev/null|openssl x509 -outform PEM > /tmp/okd.${LAB_DOMAIN}.crt
sudo security add-trusted-cert -d -r trustRoot -k "/Library/Keychains/System.keychain" /tmp/okd.${LAB_DOMAIN}.crt



podman login -u openshift-mirror ${LOCAL_REGISTRY}

export KO_DOCKER_REPO=${LOCAL_REGISTRY}/tekton

make TARGET=openshift apply

make TARGET=openshift clean

```
