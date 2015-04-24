# dalek-driver-phantomjs - Browser/WebDriver process control

Browser Driver for [PhantomJS 2](http://phantomjs.org/) providing an API to control the Browser/WebDriver process, buggyfill the browser's WebDriver capabilities, as well as provide an easy means to install the necessary binaries etc.

## Browser / Driver Documentation

* [PhantomJS Command Line Interface](http://phantomjs.org/api/command-line.html)

---

## API Documentation

```js
var Browser = require('dalek-driver-phantomjs');
var browser = new Browser({
  // path to binary
  // default: provided by phantomjs
  "binary": "/path/to/browser-executable",
  // make the WebDriver instance listen on interface 127.0.0.1
  // default: "127.0.0.1"
  "host": "127.0.0.1",
  // make the WebDriver instance listen on a port between 1111 and 2222
  // default: [2048, 4096]
  "portRange": [1111, 2222],
  // CLI parameters passed to PhantomJS at startup
  // default: (--webdriver=<host:port> --ignore-ssl-errors=true)
  "args": [
    // see http://phantomjs.org/api/command-line.html
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
browser.start(success, error, failure);

// gracefully stop the browser
browser.stop(function() {
  console.log('stopped!');
});

// force kill the process (in case stop() doesn't work)
browser.kill();
```

a full integration using [WD.js](https://github.com/admc/wd) could look like

```js
var WD = require('wd');
var Browser = require('dalek-driver-phantomjs');

var wd = wd.promiseChainRemote();
var browser = new Browser({
  name: 'Phantom',
  args: [
    '--local-to-remote-url-access=true'
  ]
});

browser.start(function(options) {
  // initialize WD client from configuration options
  // provided by the browser driver
  wd.remote(options.wd).then(function() {
    // some fun with WebDriver
  });
}, console.log.bind(console));

// stop WD client, then service and browser
wd.quit().then(function() {
  browser.stop();
});
```
