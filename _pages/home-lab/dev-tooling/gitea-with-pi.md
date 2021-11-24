---
title:  Gitea - "Git with a cup of tea"... and a slice of Pi
permalink: /home-lab/gitea-with-pi/
description: Installing Gitea on a Raspberry Pi 4B with OpenWRT
sitemap: true
published: true
tags:
  - git
  - raspberry pi
  - openwrt
---
### Let's install Gitea on our Bastion host

This tutorial assumes that you have already configured your lab with the following guide: [Build A Kubernetes Home Lab with OKD4](/home-lab/lab-intro/)

We're going to install Gitea on the Raspberry Pi that we previously installed Nexus on.

1. Create a DNS entry for gitea on the edge router:

   ```bash
   BASTION_HOST=$(yq e ".bastion-ip" ${LAB_CONFIG_FILE})
   EDGE_ROUTER=$(yq e ".router" ${LAB_CONFIG_FILE})

   echo "gitea.${LAB_DOMAIN}.           IN      A      ${BASTION_HOST}" | ssh root@${EDGE_ROUTER} "cat >> /etc/bind/db.${LAB_DOMAIN}"
   ssh root@${EDGE_ROUTER} "/etc/init.d/named restart"
   ```

1. Really annoying Mac thing...

   If you are on a Mac, you might have to give DNS a kick for it to resolve the gitea address:

   ```bash
   sudo killall -HUP mDNSResponder
   ```

1. Log into the Bastion Pi server:

   ```bash
   ssh root@${BASTION_HOST}
   ```

1. Add the OpenShift wildcard certificate to the local keystore so that Gitea will trust Tekton Trigger routes that we'll create later:

   ```bash
   openssl s_client -showcerts -connect console-openshift-console.apps.okd4.${SUB_DOMAIN}.${DOMAIN}:443 </dev/null 2>/dev/null|openssl x509 -outform PEM > /etc/ssl/certs/apps.okd4.${DOMAIN}.crt
   ```

1. Install SQLite3 and ssh-keygen

   ```bash
   opkg update && opkg install sqlite3-cli openssh-keygen
   ```

1. Install Gitea:

   ```bash
   mkdir -p /usr/local/gitea
   for i in bin etc custom data db git
   do
     mkdir /usr/local/gitea/${i}
   done
   wget -O /usr/local/gitea/bin/gitea https://dl.gitea.io/gitea/1.15.6/gitea-1.15.6-linux-arm64
   chmod 750 /usr/local/gitea/bin/gitea
   ```

1. Create a self-signed key pair for Gitea:

   ```bash
   cd /usr/local/gitea/custom
   /usr/local/gitea/bin/gitea cert --host gitea.${DOMAIN}
   cd
   ```

1. Create the Gitea configuration file:

   ```bash
   INTERNAL_TOKEN=$(/usr/local/gitea/bin/gitea generate secret INTERNAL_TOKEN)
   SECRET_KEY=$(/usr/local/gitea/bin/gitea generate secret SECRET_KEY)
   JWT_SECRET=$(/usr/local/gitea/bin/gitea generate secret JWT_SECRET)

   cat << EOF > /usr/local/gitea/etc/app.ini
   RUN_USER = gitea
   RUN_MODE = prod

   [repository]
   ROOT = /usr/local/gitea/git
   SCRIPT_TYPE = sh
   DEFAULT_BRANCH = main
   DEFAULT_PUSH_CREATE_PRIVATE = true
   ENABLE_PUSH_CREATE_USER = true
   ENABLE_PUSH_CREATE_ORG = true

   [server]
   PROTOCOL = https
   ROOT_URL = https://gitea.${DOMAIN}:3000/
   HTTP_PORT = 3000
   CERT_FILE = cert.pem
   KEY_FILE  = key.pem
   STATIC_ROOT_PATH = /usr/local/gitea/web
   APP_DATA_PATH    = /usr/local/gitea/data
   LFS_START_SERVER = true

   [service]
   DISABLE_REGISTRATION = true

   [database]
   DB_TYPE = sqlite3
   PATH = /usr/local/gitea/db/gitea.db

   [security]
   INSTALL_LOCK = true
   SECRET_KEY = ${SECRET_KEY}
   INTERNAL_TOKEN = ${INTERNAL_TOKEN}

   [oauth2]
   JWT_SECRET = ${JWT_SECRET}

   [session]
   PROVIDER = file

   [log]
   ROOT_PATH = /usr/local/gitea/log
   MODE = file
   LEVEL = Info
   EOF
   ```

1. Create a user to run gitea

   ```bash
   groupadd gitea
   useradd -g gitea -d /usr/local/gitea gitea
   chown -R gitea:gitea /usr/local/gitea
   ```

1. Create an init script to control Gitea:

   ```bash
   cat <<EOF > /etc/init.d/gitea
   #!/bin/sh /etc/rc.common

   START=99
   STOP=80
   SERVICE_USE_PID=0

   start() {
      service_start /usr/bin/su - gitea -c 'GITEA_WORK_DIR=/usr/local/gitea /usr/bin/nohup /usr/local/gitea/bin/gitea --config /usr/local/gitea/etc/app.ini web > /dev/null 2>&1 &'
   }

   restart() {
      /usr/bin/su - gitea -c 'GITEA_WORK_DIR=/usr/local/gitea /usr/local/gitea/bin/gitea --config /usr/local/gitea/etc/app.ini manager restart'
   }

   stop() {
      /usr/bin/su - gitea -c 'GITEA_WORK_DIR=/usr/local/gitea /usr/local/gitea/bin/gitea --config /usr/local/gitea/etc/app.ini manager shutdown'
   }
   EOF

   chmod 755 /etc/init.d/gitea
   ```

1. Initialize the Gitea database:

   ```bash
   su - gitea -c 'GITEA_WORK_DIR=/usr/local/gitea /usr/local/gitea/bin/gitea --config /usr/local/gitea/etc/app.ini migrate'
   ```

1. Create a couple of users:

   The first user is your admin user, we're naming it `gitea`:

   ```bash
   su - gitea -c "GITEA_WORK_DIR=/usr/local/gitea /usr/local/gitea/bin/gitea --config /usr/local/gitea/etc/app.ini admin user create --admin --username gitea --password password --email gitea@gitea.${DOMAIN} --must-change-password"
   ```

   The second user is a developer user.  You can repeat this command later with different user names to add more users:

   ```bash
   su - gitea -c "GITEA_WORK_DIR=/usr/local/gitea /usr/local/gitea/bin/gitea --config /usr/local/gitea/etc/app.ini admin user create --username devuser --password password --email devuser@gitea.${DOMAIN} --must-change-password"
   ```

1. Enable the Gitea service and start it:

   ```bash
   /etc/init.d/gitea enable
   /etc/init.d/gitea start
   exit
   ```

1. Trust the gitea certs on your workstation:

   * Mac OS:

     ```bash
     openssl s_client -showcerts -connect gitea.${LAB_DOMAIN}:3000 </dev/null 2>/dev/null|openssl x509 -outform PEM > /tmp/gitea.${LAB_DOMAIN}.crt
     sudo security add-trusted-cert -d -r trustRoot -k "/Library/Keychains/System.keychain" /tmp/gitea.${LAB_DOMAIN}.crt
     ```

   * Linux:

     ```bash
     openssl s_client -showcerts -connect gitea.${LAB_DOMAIN}:3000 </dev/null 2>/dev/null|openssl x509 -outform PEM > /etc/pki/ca-trust/source/anchors/gitea.${LAB_DOMAIN}.crt
     update-ca-trust
     ```

1. Now point your browser to `https://gitea.${LAB_DOMAIN}:3000`

   On Mac OS:

   ```bash
   open -a Safari https://gitea.${LAB_DOMAIN}:3000
   ```

   That's it!
