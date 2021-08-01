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

## Firewall

```bash
uci add firewall rule
uci set firewall.@rule[-1].src='wan'

rule_name=$(uci add firewall rule) 
uci batch << EOI
set firewall.$rule_name.enabled='1'
set firewall.$rule_name.target='ACCEPT'
set firewall.$rule_name.src='wan'
set firewall.$rule_name.proto='tcp udp'
set firewall.$rule_name.dest_port='111'
set firewall.$rule_name.name='NFS_share'
EOI
uci commit

uci add firewall rule
uci set firewall.@rule[-1].src='wan'
uci set firewall.@rule[-1].target='ACCEPT'
uci set firewall.@rule[-1].proto='tcp'
uci set firewall.@rule[-1].dest_port='22'
uci commit firewall
/etc/init.d/firewall restart

/etc/init.d/firewall reload

config rule
    option name     example rule
    option src      lan
    option family   ipv4
    option proto    all
    option dest     wan
    option dest_ip  192.168.1.64/26
    option target   REJECT

rule_name=$(uci add firewall rule) 
uci batch << EOI
set firewall.$rule_name.enabled='1'
set firewall.$rule_name.target='REJECT'
set firewall.$rule_name.src='lan'
set firewall.$rule_name.src_ip='10.11.13.0/24'
set firewall.$rule_name.dest='wan'
set firewall.$rule_name.name='DC1_BLOCK'
set firewall.$rule_name.proto='all'
set firewall.$rule_name.family='ipv4'
EOI
uci commit firewall
/etc/init.d/firewall reload

```

## WiFi

1. Configure Wireless repeater to your home Wifi:

   ```bash
   uci set wireless.radio2.disabled='0'
   uci set wireless.radio2.repeater='1'
   uci set wireless.sta.ssid='Your-WiFi-SSID'  # Replace with your WiFi SSID
   uci set wireless.sta.encryption='psk2'      # Replace with your encryption type
   uci set wireless.sta.key='Your-WiFi-Key'    # Replace with your WiFi Key
   ```

1. Configure a Wireless Network for Your Lab:

   ```bash
   uci set wireless.default_radio3=wifi-iface
   uci set wireless.default_radio3.device='radio3'
   uci set wireless.default_radio3.ifname='wlan3'
   uci set wireless.default_radio3.network='lan'
   uci set wireless.default_radio3.mode='ap'
   uci set wireless.default_radio3.disabled='0'
   uci set wireless.default_radio3.ssid='OKD-LAB-5G'
   uci set wireless.default_radio3.key='WelcomeToMyLab'
   uci set wireless.default_radio3.encryption='psk2'
   uci set wireless.default_radio3.multi_ap='1'
   uci commit wireless
   ```

Test Bind

```bash
/usr/sbin/named -u bind -g -c /etc/bind/named.conf
```
