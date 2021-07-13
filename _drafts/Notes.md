# Notes

```bash
cat ~/.ssh/id_rsa.pub | ssh root@YOUR_OPENWRT_ROUTER "cat >> /etc/dropbear/authorized_keys"
```

## GitLab

```bash
opkg update && opkg install pgsql-server pgsql-cli pgsql-cli-extra



https://packages.gitlab.com/gitlab/raspberry-pi2/packages/raspbian/buster/gitlab-ce_14.0.0-ce.0_armhf.deb

https://packages.gitlab.com/gitlab/gitlab-ce/packages/ubuntu/focal/gitlab-ce_13.11.6-ce.0_arm64.deb

wget https://packages.gitlab.com/gitlab/gitlab-ce/packages/ubuntu/focal/gitlab-ce_13.11.6-ce.0_arm64.
deb/download.deb

wget https://packages.gitlab.com/gitlab/gitlab-ce/packages/debian/buster/gitlab-ce_14.0.5-ce.0_arm64.deb/download.deb

wget https://packages.gitlab.com/gitlab/gitlab-ce/packages/ubuntu/focal/gitlab-ce_14.0.5-ce.0_arm64.deb/download.deb

wget https://packages.gitlab.com/gitlab/gitlab-ce/packages/el/8/gitlab-ce-14.0.5-ce.0.el8.aarch64.rpm/download.rpm

```