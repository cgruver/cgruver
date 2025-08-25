---
permalink: /macbook/
title: MacBook Setup
sitemap: false
published: false
---
## Set Up New Mac

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

echo "### Brew Vars" >> ~/.zshrc
/opt/homebrew/bin/brew shellenv >> ~/.zshrc

zsh

brew install autoconf automake coreutils gnutls gnu-sed go helm ko jq yq kustomize lftp maven nmap node@18 openjdk@17 podman podman-desktop qemu ruby tektoncd-cli watch wget git gh quarkusio/tap/quarkus kubernetes-cli openshift-cli

sudo ${HOMEBREW_REPOSITORY}/bin/podman-mac-helper install

brew uninstall --ignore-dependencies openjdk

sudo ln -sfn ${HOMEBREW_REPOSITORY}/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

cat << EOF >> ~/.zshrc
PATH="${HOMEBREW_REPOSITORY}/opt/node@18/bin:${HOMEBREW_REPOSITORY}/opt/coreutils/libexec/gnubin:${HOMEBREW_REPOSITORY}/opt/openjdk@17/bin:${HOMEBREW_REPOSITORY}/opt/ruby/bin:${HOMEBREW_REPOSITORY}/opt/gnu-sed/libexec/gnubin:\$PATH"
export GUILE_TLS_CERTIFICATE_DIRECTORY=${HOMEBREW_REPOSITORY}/etc/gnutls/
# export CPPFLAGS="-I${HOMEBREW_REPOSITORY}/opt/openjdk@17/include"
export LDFLAGS="-L${HOMEBREW_REPOSITORY}/opt/ruby/lib"
export CPPFLAGS="-I${HOMEBREW_REPOSITORY}/opt/ruby/include"
# export LDFLAGS="-L${HOMEBREW_REPOSITORY}/opt/node@18/lib"
# export CPPFLAGS="-I${HOMEBREW_REPOSITORY}/opt/node@18/include"
export PKG_CONFIG_PATH="${HOMEBREW_REPOSITORY}/opt/ruby/lib/pkgconfig"
export JAVA_HOME=\$(/usr/libexec/java_home)
### My Env Config
set -o vi
alias ssh="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -oHostKeyAlgorithms=+ssh-rsa -oPubkeyAcceptedAlgorithms=+ssh-rsa"
alias scp="scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -oHostKeyAlgorithms=+ssh-rsa -oPubkeyAcceptedAlgorithms=+ssh-rsa"
alias wifi-scan="/System/Library/PrivateFrameworks/Apple80211.framework/Versions/A/Resources/airport scan"
function resetDNS() {
sudo killall -HUP mDNSResponder
}

function startBlog() {
  cd ~/Documents/VSCode/Blog/cgruver/
  bundle
  bundle exec jekyll serve --livereload --drafts --unpublished
}
### Go Vars
export GOPATH="\$HOME/go"
export PATH="\${PATH}:\${GOPATH}/bin"
### Krew
export PATH="\${PATH}:\${HOME}/.krew/bin"
###
EOF

gh auth login

mkdir -p ~/Documents/VSCode/Blog/
cd ~/Documents/VSCode/Blog/
git clone https://github.com/cgruver/cgruver.git

cd cgruver

gem update --system
gem update
rm Gemfile.lock
bundle update --all
```

## Install Krew

```bash
(
  set -x; cd "$(mktemp -d)" &&
  OS="$(uname | tr '[:upper:]' '[:lower:]')" &&
  ARCH="$(uname -m | sed -e 's/x86_64/amd64/' -e 's/\(arm\)\(64\)\?.*/\1\2/' -e 's/aarch64$/arm64/')" &&
  KREW="krew-${OS}_${ARCH}" &&
  curl -fsSLO "https://github.com/kubernetes-sigs/krew/releases/latest/download/${KREW}.tar.gz" &&
  tar zxvf "${KREW}.tar.gz" &&
  ./"${KREW}" install krew
)

export PATH="${PATH}:${HOME}/.krew/bin"

oc krew install sniff
```

## Install VSCodium

```bash
brew install --cask vscodium
```

## Install Wireshark

```bash
brew install --cask wireshark
```
## Setup CentOS Stream

```bash
sudo dnf config-manager --add-repo https://cli.github.com/packages/rpm/gh-cli.repo
sudo dnf install gh

cat << EOF >> ~/.bashrc
### My Env Config
set -o vi
alias ssh="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -oHostKeyAlgorithms=+ssh-rsa -oPubkeyAcceptedAlgorithms=+ssh-rsa"
alias scp="scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null -oHostKeyAlgorithms=+ssh-rsa -oPubkeyAcceptedAlgorithms=+ssh-rsa"
```

## Setup Podman for multi-arch builds:

```bash
podman machine ssh sudo rpm-ostree install qemu-user-static
podman machine ssh sudo systemctl reboot
```

## Set up Llama.cpp

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.cpp.llama</string>
    <key>ProgramArguments</key>
      <array>
        <string>/opt/homebrew/bin/llama-server</string>
        <string>--model /usr/local/models/devstral:24b --host 0.0.0.0 --n-gpu-layers 999 --flash-attn --ctx-size 131072 --jinja --no-prefill-assistant --reasoning-format none</string>
      </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/llama-server/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/llama-server/stderr.log</string>
  </dict>
</plist>
```

```bash
cat << EOF > /Library/LaunchDaemons/llama-server.plist
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.cpp.llama</string>
    <key>ProgramArguments</key>
      <array>
        <string>/opt/homebrew/bin/llama-server</string>
        <string>--model</string>
        <string>/usr/local/models/devstral:24b</string>
        <string>--host</string>
        <string>0.0.0.0</string>
        <string>--n-gpu-layers</string>
        <string>999</string>
        <string>--flash-attn</string>
        <string>--ctx-size</string>
        <string>131072</string>
        <string>--jinja</string>
        <string>--no-prefill-assistant</string>
        <string>--reasoning-format</string>
        <string>none</string>
      </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/llama-server/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/llama-server/stderr.log</string>
  </dict>
</plist>
EOF

launchctl load /Library/LaunchDaemons/llama-server.plist

launchctl start /Library/LaunchDaemons/llama-server.plist
```