Usage
========

Updater machine
------------

Change HOSTNAME in config.json `{ host: "HOSTNAME" }`
Change deviceId in config.json `{ deviceId: "TestMachine" }` that id will be used to
identify machine when sending updates.
Copy certs folder from server machine.

```sh
git clone https://github.com/valerybugakov/lamassu-updater.git
cd lamassu-updater

scp -r user@host:/path/to/generated/cetrs certs
npm start
```

Add upstart job (for new machines)

Create file:

```sh
sudo nano /etc/init/rce-client.conf
```

Copy paste:

```
description "rce-client"
start on runlevel [2345]
stop on runlevel [!2345]
respawn
respawn limit 3 60
script
        chdir /root/rce-client/
        exec node updater
end script
```

Start:

```sh
start rce-client
```

Debug

```sh
tail -f /var/log/upstart/rce-client.log
```
