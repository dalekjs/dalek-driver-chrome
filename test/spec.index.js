'use strict';

// configure chai
var chai = require('chai');
chai.config.includeStack = true;
var expect = chai.expect;

// file to test
var Browser = require('../index');
var chromedriverPath = require('chromedriver').path;
var Events = require('events');
var http = require('http');

// helper fns
var noop = function (){};
var _wrapConstructor = function (FN, data) {
  return function _wrapperConstructor() {
    new FN(data);
  };
};
var _wrapFn = function (fn, data) {
  return function _wrapperFn() {
    fn(data);
  };
};

describe('Can init without config', function initWithoutConfig() {
  var browser;

  before(function initWithoutConfigBefore() {
    browser = new Browser();
  });

  after(function initWithoutConfigAfter() {
    browser.kill();
  });

  it('should be defaults', function initWithoutConfigDefaults() {
    expect(browser.options.portRange).to.eql([2048, 4096]);
    expect(browser.options.host).to.equal('127.0.0.1');
    expect(browser.options.binary).to.equal(chromedriverPath);
    expect(browser.options.args).to.be.empty;
  });
});

describe('Can init with config', function initWithConfig() {
  var config = {portRange: [8000, 8010]};
  var browser;

  before(function initWithConfigBefore() {
    browser = new Browser(config);
  });

  after(function initWithConfigAfter() {
    browser.kill();
  });

  it('should have set port config data', function initWithConfigPortRange() {
    expect(browser.options.portRange).to.equal(config.portRange);
  });

  it('should leave defaults alone', function initWithConfigPortRangeDefaults() {
    expect(browser.options.host).to.equal('127.0.0.1');
    expect(browser.options.binary).to.equal(chromedriverPath);
    expect(browser.options.args).to.be.empty;
  });
});

describe('Throws without sufficient config', function throwsWithoutValidConfig() {
  it('if portRange is not an Array', function throwsWithoutValidConfigPortRange() {
    expect(_wrapConstructor(Browser, {portRange: 'foo'})).to.throw(TypeError);
    expect(_wrapConstructor(Browser, {portRange: 123})).to.throw(TypeError);
    expect(_wrapConstructor(Browser, {portRange: {}})).to.throw(TypeError);
    expect(_wrapConstructor(Browser, {portRange: false})).to.throw(TypeError);
    expect(_wrapConstructor(Browser, {portRange: null})).to.throw(TypeError);
  });
});

describe('Browser arguments', function browserArguments() {
  it('can be a string', function browserArgumentsString() {
    var browser = new Browser({args: 'local-to-remote-url=true'});
    expect(browser.options.args).to.be.an('array');
    expect(browser.options.args[0]).to.equal('local-to-remote-url=true');
    expect(browser.options.args).length.to.be(1);
  });
});

describe('Browser binary', function browserBinary() {
  it('can be set', function browserBinaryCanBeSet() {
    var browser = new Browser({binary: '~/chromedriver'});
    expect(browser.options.binary).to.not.contain('~');
    expect(browser.options.binary).to.equal(process.env.HOME + '/chromedriver');
  });
});

describe('Start should never be called twice', function startCanNotBeCalledTwice() {
  var browser = new Browser();
  browser.process = true;
  it('should throw an error', function startCanNotBeCalledTwiceThrows() {
    expect(_wrapFn(browser.start.bind(browser))).to.throw(Error);
    expect(_wrapFn(browser.start.bind(browser))).to.throw(/Process already running/);
  });
});

describe('#_findPort: No sufficiant port', function nonSufficientPort() {
  var config = {portRange: [0, 0]};
  var browser = new Browser(config);
  browser.start();
  it('should return error', function nonSufficientPortErrors() {
    var ecb = function nonSufficientPortErrorsCb(error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.have.string('No sufficient port available');
    };
    browser._findPort(noop, ecb);
  });
});

describe('#_watchStartupErr:', function watchStartupErr() {
  var browser = new Browser();
  browser.start();
  it('should return error when error code is given', function watchStartupErrShouldError() {
    var code = 5;
    var ecb = function watchStartupErrShouldErrorCb(error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.have.string('Process error:');
      expect(error.message).to.have.string(code);
    };
    browser._watchStartupErr(noop, ecb, code);
  });
});

describe('#_handleStartupClose:', function handleStartupClose() {
  var browser = new Browser();
  browser.start();
  it('should return error when error code is given', function handleStartupCloseShouldError() {
    var code = 5;
    var ecb = function handleStartupCloseShouldErrorCb(error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.have.string('Process closed with exit code:');
      expect(error.message).to.have.string(code);
    };
    browser._handleStartupClose(noop, ecb, code);
  });
});

describe('#_handleStartupError:', function handleStartupError() {
  var browser = new Browser();
  browser.start();
  it('should return error if error message is given', function handleStartupErrorIfMsgGiven() {
    var err = 'Random error';
    var ecb = function handleStartupErrorIfMsgGivenCb(error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.have.string('Unable to start');
      expect(error.message).to.have.string('(' + err + ')');
    };
    browser._handleStartupError(noop, ecb, err);
  });
});

describe('#_handleProcessFailure:', function handleProcessFailure() {
  var browser;

  before(function handleProcessFailureBefore() {
    browser = new Browser();
  });

  it('should return error', function handleProcessFailureErrors() {
    var err = 'Random error';
    var cb = function handleProcessFailureCb(error) {
      expect(error).to.be.an.instanceof(Error);
      expect(error.message).to.have.string('Process quit unexpectedly');
      expect(error.message).to.have.string('(' + err + ')');
    };
    browser._handleProcessFailure(cb, err);
  });
});

describe('#_watchStartupOut scans stdout', function watchStartupOutScansStdout() {
  var browser, ee;
  var EE = require('events').EventEmitter;


  beforeEach(function watchStartupOutScansStdoutBeforeEach() {
    ee = new EE();
    browser = new Browser();
    // mock the process object
    browser.process = ee;
    browser.process.kill = noop;
    browser.process.stdout = ee;
    browser.process.stderr = ee;
  });

  it('should return error with error data', function watchStartupOutScansStdoutWithoutData() {
    var _err = 'Could not start Ghost Driver';
    var cb = function watchStartupOutScansStdoutWithoutDataCb(err) {
      expect(err).to.be.an.instanceof(Error);
      expect(err.message).to.equal(_err);
    };
    browser._watchStartupOut(noop, cb, _err);
  });

  it('should succed with correct data', function watchStartupOutScansStdoutWithData() {
    var _data = 'GhostDriver - Main - running';
    var cb = function watchStartupOutScansStdoutWithData(data) {
      expect(data).to.be.an('object');
      expect(data).to.have.any.keys('wd');
      expect(data.wd).to.be.an('object');
      expect(data.wd).to.have.all.keys(['browserName', 'host', 'port']);
      expect(data.wd.host).to.equal('127.0.0.1');
    };
    browser._watchStartupOut(cb, noop, _data);
  });

  it('should do nothing with incorrect data', function watchStartupOutScansStdoutNoopData() {
    var _data = 'Foo - Bar - Baz';
    var scb = function watchStartupOutScansStdoutNoopDataEcb() {
      // just to make sure that this doesn't get called
      expect(false).to.be.true;
    };
    var ecb = function watchStartupOutScansStdoutNoopDataEcb() {
      // just to make sure that this doesn't get called
      expect(false).to.be.true;
    };
    browser._watchStartupOut(scb, ecb, _data);
  });
});


describe('#stop shuts down the processes', function stopShutdown() {
  var browser, ee;
  var EE = require('events').EventEmitter;

  beforeEach(function stopShutdownBeforeEach() {
    ee = new EE();
    browser = new Browser();
    browser.process = ee;
    browser.process.kill = noop;
    browser.process.stdout = ee;
    browser.process.stderr = ee;
  });

  it('should return undefined if no process is running', function stopShutdownNoProcess() {
    browser.process = null;
    expect(browser.stop(noop)).to.be.undefined;
  });

  it('should terminate the process gracefully', function stopShutdownTerminateGraceful() {
    browser.process.kill = function (cmd) {
      expect(cmd).to.equal('SIGTERM');
    };
    browser.stop(noop);
  });

  it('should clear the process property', function stopShutdownClearProcess() {
    browser.stop(noop);
    browser.process.emit('close');
    expect(browser.process).to.be.null;
  });

  it('should not fail, if no callback is given', function stopShutdownNoFailNoCallback() {
    browser.stop();
    browser.process.emit('close');
    expect(browser.process).to.be.null;
  });

  it('should execute the callback if given', function stopShutdownExecuteCallback() {
    var cb = function stopShutdownExecuteCallbackCb() {
      expect(true).to.be.true;
    };

    browser.stop(cb);
    browser.process.emit('close');
  });

});

describe('Binary can timeout', function binaryTimeout() {
  var browser = new Browser();
  var ee = new Events.EventEmitter();
  browser.process = ee;
  browser.process.stdout = ee;
  browser.process.stderr = ee;

  it('should generate an error', function binaryTimeoutError(done) {
    var cb = function binaryTimeoutErrorCb(err) {
      expect(err).to.be.an.instanceof(Error);
      expect(err.message).to.equal('GhostDriver did not respond within 5s');
      done();
    };
    browser._startListening(noop, cb, noop);
  });
});

describe('Webdriver interface should be enabled', function webdriverInterface() {
  var browser = new Browser();
  it('should be able to do a webdriver request', function webdriverInterfaceRequest(done) {
    browser.start(function webdriverInterfaceRequestStartCb(config) {
      http.get('http://' + config.wd.host + ':' + config.wd.port + '/status', function webdriverInterfaceRequestCb(res) {
        res.on('data', function webdriverInterfaceRequestDataCb(data) {
          var _data = JSON.parse(String(data));
          expect(_data).to.be.an('object');
          expect(_data).to.have.all.keys(['sessionId', 'status', 'value']);
          expect(_data.value).to.have.all.keys(['build', 'os']);
          expect(_data.value.build).to.have.any.keys('version');
          expect(_data.value.os).to.have.all.keys(['name', 'version', 'arch']);
          browser.stop(done);
        });
      });
    }, noop, noop);
  });
});
