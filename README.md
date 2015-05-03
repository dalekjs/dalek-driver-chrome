# dalek-driver-chrome - Browser/WebDriver process control

Browser Driver for [Google Chrome](https://google.com/chrome/) using [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/) providing an API to control the Browser/WebDriver process.

## Browser / Driver Documentation

* [Chromedriver Docs](https://sites.google.com/a/chromium.org/chromedriver/)
* [WebDriver Capabilities](https://sites.google.com/a/chromium.org/chromedriver/capabilities)

---

## API Documentation

```js
var Driver = require('dalek-driver-chrome');
var driver = new Driver({
  // path to binary
  // default: provided by chrome
  "binary": "/path/to/browser-executable",
  // make the WebDriver instance listen on interface 127.0.0.1
  // default: "127.0.0.1"
  "host": "127.0.0.1",
  // make the WebDriver instance listen on a port between 1111 and 2222
  // default: [2048, 4096]
  "portRange": [1111, 2222],
  // CLI parameters passed to Chrome at startup
  // default: (--port=<host:port> --verbose --url-base=/wd/hub/)
  "args": [
    // see http://peter.sh/experiments/chromium-command-line-switches/
    "--local-to-remote-url-access=true"
  ],
});

function success(data) {
  console.log("Started browser, WebDriver available at", data.wd);
}

// callback invoked when the process could not be started
function error(err) {
  console.log("Could not start Browser", err);
}

// callback invoked when the process crashed
function failure(err) {
  console.log("Browser crashed!", err);
}

// fire up the browser and WebDriver service
driver.start(success, error, failure);

// gracefully stop the browser
driver.stop(function() {
  console.log('stopped!');
});

// force kill the process (in case stop() doesn't work)
driver.kill();
```

a full integration using [WD.js](https://github.com/admc/wd) could look like

```js
var WD = require('wd');
var Driver = require('dalek-driver-chrome');

var wd = wd.promiseChainRemote();
var driver = new Driver({
  name: 'Chrome'
});

driver.start(function(options) {
  // initialize WD client from configuration options
  // provided by the browser driver
  wd.remote(options.wd).then(function() {
    // some fun with WebDriver
  });
}, console.log.bind(console));

// stop WD client, then service and browser
wd.quit().then(function() {
  driver.stop();
});
```
