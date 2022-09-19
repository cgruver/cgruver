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

brew install autoconf automake coreutils gnutls gnu-sed go helm ko jq yq kustomize lftp maven nmap node openjdk@17 podman podman-desktop qemu ruby tektoncd-cli watch wget git gh quarkusio/tap/quarkus kubernetes-cli openshift-cli

brew uninstall --ignore-dependencies openjdk

ln -s /opt/homebrew/opt /usr/local/opt
sudo ln -sfn /usr/local/opt/openjdk@17/libexec/openjdk.jdk /Library/Java/JavaVirtualMachines/openjdk-17.jdk

cat << EOF >> ~/.zshrc
PATH="/usr/local/opt/coreutils/libexec/gnubin:/usr/local/opt/openjdk@17/bin:/usr/local/opt/ruby/bin:/usr/local/opt/gnu-sed/libexec/gnubin:\$PATH"
export GUILE_TLS_CERTIFICATE_DIRECTORY=/usr/local/etc/gnutls/
export CPPFLAGS="-I/usr/local/opt/openjdk@17/include"
export LDFLAGS="-L/usr/local/opt/ruby/lib"
export CPPFLAGS="-I/usr/local/opt/ruby/include"
export PKG_CONFIG_PATH="/usr/local/opt/ruby/lib/pkgconfig"
export JAVA_HOME=$(/usr/libexec/java_home)
### My Env Config
set -o vi
alias ssh="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
alias scp="scp -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"

function resetDNS() {
sudo killall -HUP mDNSResponder
}

function startBlog() {
  cd ~/Documents/VSCode/Blog/cgruver/
  bundle
  bundle exec jekyll serve --livereload --drafts --unpublished
}
### Go Vars
### Go
export GOPATH="\$HOME/go"
export PATH="\${PATH}:\${GOPATH}/bin"
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