Usage
========

Updater machine
------------

Add CNAME to updater_config.json `{ host: CNAME }`
Add CNAME to hosts file if necessary.

```
git clone https://github.com/valerybugakov/lamassu-updater.git

scp -r user@host:/path/to/generated/cetrs certs
npm start
```

