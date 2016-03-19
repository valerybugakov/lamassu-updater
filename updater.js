var https = require('https')
var fs = require('fs')
var path = require('path')
var exec = require('child_process').exec

var downloading;
var config = JSON.parse(fs.readFileSync(path.resolve(__dirname, './config.json')))
var packagePath = config.downloadDir + '/update.sh'

var httpsOptions = {
  host: config.host,
  port: config.port,
  key: fs.readFileSync(config.certs.keyFile),
  cert: fs.readFileSync(config.certs.certFile),
  ca: fs.readFileSync(config.certs.caFile),
  ciphers: 'AES128-GCM-SHA256:RC4:HIGH:!MD5:!aNULL:!EDH',
  secureProtocol: 'TLSv1_method',
  rejectUnauthorized: true,
  headers: {
    'device-id': config.deviceId
  }
}

console.log('Updater started as: ' + config.deviceId);
update();
setInterval(update, config.updateInterval);

function cleanup() {
  if (fs.existsSync(config.downloadDir)) {
    if (fs.existsSync(packagePath)) {fs.unlinkSync(packagePath)}
  } else {
    fs.mkdirSync(config.downloadDir)
  }
}

function update() {
  cleanup()
  if (downloading) {return;}
  downloading = true;
  https.get(httpsOptions, function (res) {
    var code = res.statusCode
    switch (code) {
      case 200:
        downloadFile(res)
        break;
      default:
        res.resume()
    }
  }).on('error', function () {downloading = false;});
}

function downloadFile(res) {
  var filename = path.join(__dirname, packagePath)
  var fileOut = fs.createWriteStream(filename)
  res.pipe(fileOut)

  res.on('end', function () {
    downloading = false;
    fs.chmod(filename, '0700', function () {
      setTimeout(function () {
        exec(filename, function (error, stdout, stderr) {
          uploadResult(stdout);
          if (error) {
            console.log('exec error: ' + error);
          } else {
            console.log('exec successfully')
          }
        });
      }, 1000);
    })
  }).on('error', function (err) {
    downloading = false;
    console.log(err);
  })
}

function uploadResult(data) {
  var postHttpsOptions = {}
  Object.keys(httpsOptions).forEach(function (key) {postHttpsOptions[key] = httpsOptions[key];});
  postHttpsOptions.method = 'POST';
  var postRequest = https.request(postHttpsOptions, function () {}).on('error', console.log.bind(console));
  postRequest.write(data);
  postRequest.end();
}
