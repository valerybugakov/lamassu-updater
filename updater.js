var https = require('https')
var fs = require('fs')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var path = require('path')
var exec = require('child_process').exec

process.on('SIGUSR2', function () { process.exit() })
process.on('SIGTERM', function () { /* Immune */ })

var UPDATER_CONFIG = path.resolve(__dirname, './updater_config.json')
var config = JSON.parse(fs.readFileSync(UPDATER_CONFIG))

var Updater = function (config) {
  this.config = config
}

util.inherits(Updater, EventEmitter)

Updater.factory = function factory (config) {
  return new Updater(config)
}

Updater.prototype.run = function run () {
  if (!this.init()) {
    console.log('Certificate files not available yet, exiting.')
    return
  }

  this.update()
  var self = this

  setInterval(function () { self.update() }, this.config.updateInterval)
  // setInterval(function () { self.die() }, this.config.deathInterval)
}

function fetchVersion () {
  var str = fs.readFileSync('./package.json')
  var packageJson = JSON.parse(str)
  return packageJson.version
}

Updater.prototype.init = function init () {
  var certs = {
    certFile: this.config.certs.certFile,
    keyFile: this.config.certs.keyFile,
    caFile: this.config.certs.caFile
  }

  if (!fs.existsSync(certs.keyFile) || !fs.existsSync(certs.certFile)) {
    return false
  }

  this.key = fs.readFileSync(certs.keyFile)
  this.cert = fs.readFileSync(certs.certFile)
  this.ca = fs.readFileSync(certs.caFile)

  this.downloadDir = this.config.downloadDir
  this.packagePath = this.config.downloadDir + '/update.sh'

  this.version = fetchVersion()
  this.httpsOptions = this.getHttpsOptions()
  return true
}

Updater.prototype.cleanup = function () {
  if (fs.existsSync(this.downloadDir)) {
    if (fs.existsSync(this.packagePath)) fs.unlinkSync(this.packagePath)
  } else {
    fs.mkdirSync(this.downloadDir)
  }
}

Updater.prototype.getHttpsOptions = function getHttpsOptions () {
  var config = this.config

  var options = {
    host: config.host,
    port: config.port,
    key: this.key,
    cert: this.cert,
    ca: this.ca,
    ciphers: 'AES128-GCM-SHA256:RC4:HIGH:!MD5:!aNULL:!EDH',
    secureProtocol: 'TLSv1_method',
    rejectUnauthorized: true,
    headers: {
      'application-version': this.version,
      'device-id': config.deviceId
    }
  }

  options.agent = new https.Agent(options)
  return options
}

Updater.prototype.update = function () {
  if (this.downloading) return
  this.cleanup()
  var self = this

  // console.log('\nMaking request...')
  https.get(this.httpsOptions, function (res) {
    var code = res.statusCode
    // console.log('\nStatus Code: ', code);

    switch (code) {
      case 304:
        res.resume()
        break
      case 412:
        res.resume()
        self.emit('error', new Error('Server has lower version!'))
        break
      case 200:
        self.downloadFile(res)
        break
      default:
        res.resume()
        this.emit('error', new Error('Unknown response code: ' + code))
    }
  }).on('error', noop)
}

function noop () {}

Updater.prototype.downloadFile = function (res) {
  this.downloading = true
  var self = this
  var filename = path.join(__dirname, this.packagePath)
  var fileOut = fs.createWriteStream(filename)
  res.pipe(fileOut)

  res.on('end', function () {
    self.downloading = false
    fs.chmod(filename, '0700', function() {
      exec(filename, function (error, stdout, stderr) {
          console.log('stdout: ' + stdout);
          if (error !== null) {
            console.log('exec error: ' + error);
          } else {
            // console.log('exec successfully')
            // process.exit()
          }
      });
    })
  }).on('error', function (err) {
    self.downloading = false
    this.emit('error', err)
  })
}

Updater.prototype.die = function die () {
  if (this.downloading) return
  process.exit(0)
}

Updater.factory(config).run()
