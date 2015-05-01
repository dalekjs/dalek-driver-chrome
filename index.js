'use strict';

var fs = require('fs');
var spawn = require('child_process').spawn;
var portscanner = require('portscanner');
var expandHomeDir = require('expand-home-dir');
var chromedriverPath = require('chromedriver').path;
var behaviors = require('./behaviors.js');

var defaults = {
  // name of the browser instance
  browserName: 'Chrome',
  // the host (actually "network interface") to expose WebDriver on
  host: '127.0.0.1',
  // all ports are negotiated, but the user might want to use a specific range
  portRange: [2048, 4096],
  binary: chromedriverPath,
  args: [],
};

function noop() {}

function Browser(options) {
  this.options = options || {};
  Object.keys(Browser.defaults).forEach(function(key) {
    if (this.options[key] === undefined) {
      this.options[key] = Browser.defaults[key];
    }
  }, this);

  if (!Array.isArray(this.options.portRange)) {
    throw new TypeError('option "portRange" must be a range: [min, max]');
  }

  if (!Array.isArray(this.options.args)) {
    this.options.args = [this.options.args];
  }

  if (this.options.binary !== chromedriverPath) {
    this.options.binary = expandHomeDir(this.options.binary);
  }
}

Browser.defaults = defaults;
Browser.prototype.behavior = behavior;

Browser.prototype.start = function(success, error, failure) {
  if (this.process) {
    throw new Error('Process already running');
  }

  this._findPort(function(port) {
    this.options.port = port;

    var args = [
      '--port=' + port,
      '--verbose',
      '--url-base=/wd/hub/'
    ].concat(this.options.args);

    this.process = spawn(this.options.binary, args);
    this._startListening(success || noop, error || noop, failure || noop);
  }.bind(this), error);
};

Browser.prototype.stop = function(callback) {
  if (!this.process) {
    callback && callback();
    return;
  }

  this.process.removeListener('error', this._handleProcessFailure);
  this.process.removeListener('close', this._handleProcessFailure);

  this.process.on('close', function(code, signal) {
    this.process = null;
    callback && callback();
  }.bind(this));

  this.process.kill('SIGTERM');
};

Browser.prototype.kill = function() {
  if (!this.process) {
    return;
  }

  this.process.kill('SIGKILL');
  this.process = null;
};

Browser.prototype._findPort = function(success, error) {
  portscanner.findAPortNotInUse(
    this.options.portRange[0],
    this.options.portRange[1],
    this.options.host,
    function checkPorts(err, port) {
      if (err) {
        return error(new Error('No sufficient port available'));
      }

      success(port);
    }
  );
};

Browser.prototype._startListening = function(success, error, failure) {
  this._watchStartupOut = this._watchStartupOut.bind(this, success, error);
  this._watchStartupErr = this._watchStartupErr.bind(this, success, error);
  this._handleStartupClose = this._handleStartupClose.bind(this, success, error);
  this._handleStartupError = this._handleStartupError.bind(this, success, error);
  this._handleProcessFailure = this._handleProcessFailure.bind(this, failure);

  this.process.on('close', this._handleStartupClose);
  this.process.on('error', this._handleStartupError);
  this.process.stdout.on('data', this._watchStartupOut);
  this.process.stderr.on('data', this._watchStartupErr);

  this._timeout = setTimeout(function() {
    error(new Error('ChromeDriver did not respond within 5s'));
  }, 5000);
};

Browser.prototype._stopListening = function() {
  clearTimeout(this._timeout);
  this.process.removeListener('close', this._handleStartupClose);
  this.process.removeListener('error', this._handleStartupError);
  this.process.stdout.removeListener('data', this._watchStartupOut);
  this.process.stderr.removeListener('data', this._watchStartupErr);
  // we're done with the startup phase, now we're observing regular execution time
  this.process.on('error', this._handleProcessFailure);
  this.process.on('close', this._handleProcessFailure);
};

Browser.prototype._watchStartupOut = function(success, error, data) {
  var _data = String(data);
  if (_data.indexOf('Starting ChromeDriver') !== -1) {
    this._stopListening();
    var endpoints = {
      wd: {
        browserName: this.options.browserName,
        host: this.options.host,
        port: this.options.port,
      }
    };

    success(endpoints, this.options);
  } else if (_data.indexOf('Exiting...') !== -1) {
    this._stopListening();
    this.kill();
    error(
      new Error('Could not start ChromeDriver'),
      this.options
    );
  }
};

Browser.prototype._watchStartupErr = function(success, error, data) {
  this._stopListening();
  this.kill();
  error(
    new Error('Process error: ' + String(data)),
    this.options
  );
};

Browser.prototype._handleStartupClose = function(success, error, code) {
  this._stopListening();
  this.kill();
  error(
    new Error('Process closed with code: ' + code),
    this.options
  );
};

Browser.prototype._handleStartupError = function(success, error, err) {
  this._stopListening();
  this.kill();
  error(
    new Error('Unable to start "' + this.options.binary + '" (' + err + ')'),
    this.options
  );
};

Browser.prototype._handleProcessFailure = function(failure, err) {
  this.kill();
  failure(
    new Error('Process quit unexpectedly "' + this.options.binary + '" (' + err + ')'),
    this.options
  );
};

module.exports = Browser;
