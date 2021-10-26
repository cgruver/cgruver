---
title: Home Library Demo App
sitemap: false
published: false
---

```bash
oc new-project home-library
oc apply -f manifests/
oc apply -f manifests/triggers
```

```bash
mkdir ${OKD_LAB_PATH}/work-dir
cd ${OKD_LAB_PATH}/work-dir
curl -s https://cgruver:@api.github.com/orgs/lab-monkeys/repos | jq ".[].clone_url" | xargs -n 1 git clone --mirror
for i in $(ls)
do
  cd ${i}
  git remote set-url --push origin https://gitea.${LAB_DOMAIN}:3000/home-library/${i}
  git push --mirror
  cd ..
done
cd
rm -rf ${OKD_LAB_PATH}/work-dir

BRANCH=main
GIT_URL=gitea.clg.lab
oc process home-library//create-rolling-replace-quarkus-fast-jar-app -p GIT_REPOSITORY=git@${GIT_URL}:cgruver/catalog.git -p GIT_BRANCH=${BRANCH} | oc apply -n home-library -f -
```
