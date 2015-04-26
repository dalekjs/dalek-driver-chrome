'use strict';
var wd;

// load the driver
var Driver = require('./index.js');
// initialize the driver
var driver = new Driver({
  host: '127.0.0.1'
});
// start the driver
driver.start(
  // callback invoked when driver is started
  function(options) {
    // load, connect and initialize WD.js
    wd = require('wd').promiseChainRemote(options.wd);
    wd.init(options.wd).then(
      haveSomeFunWithWebDriver,
      console.error.bind(console)
    );
  },
  // callback invoked when driver could not start
  console.error.bind(console),
  // callback invoked when driver crashed after successful start
  console.error.bind(console)
);

function stop() {
  // stop the client
  wd.quit().then(function() {
    // then stop the driver
    driver.stop(function() {
      // now we're done
      console.log("bye bye");
    });
  });
}

function success(data) {
  console.log("success", JSON.stringify(data, null, 2));
  return data;
}

function error(data) {
  console.log("error", JSON.stringify(data, null, 2));
}

function haveSomeFunWithWebDriver() {
  // open a website
  wd.get('https://google.com')
    // find all its links
    .elements('css', 'a').then(success, error)
    // stop WD and the driver
    .then(stop)
    // woopsi
    .catch(function(error) {
      console.error("failure", error);
      stop();
    })
    // promises…
    .done();
}
