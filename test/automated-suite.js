/*
  Copyright 2016 Google Inc. All Rights Reserved.

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

'use strict';

/* eslint-disable max-len, no-console, padded-blocks, no-multiple-empty-lines */
/* eslint-env node,mocha */

// These tests make use of selenium-webdriver. You can find the relevant
// documentation here: http://selenium.googlecode.com/git/docs/api/javascript/index.html

require('chai').should();
const path = require('path');
const swTestingHelpers = require('sw-testing-helpers');
const TestServer = swTestingHelpers.TestServer;
const automatedBrowserTesting = swTestingHelpers.automatedBrowserTesting;
const mochaUtils = swTestingHelpers.mochaUtils;
const seleniumFirefox = require('selenium-webdriver/firefox');

describe('Test Propel', function() {
  // Browser tests can be slow
  this.timeout(60000);

  // Driver is initialised to null to handle scenarios
  // where the desired browser isn't installed / fails to load
  // Null allows afterEach a safe way to skip quiting the driver
  let globalDriverReference = null;
  let testServer;
  let testServerURL;

  before(function() {
    testServer = new TestServer();
    return testServer.startServer(path.join(__dirname, '..'))
    .then(portNumber => {
      testServerURL = `http://localhost:${portNumber}`;
    });
  });

  after(function() {
    testServer.killServer();
  });

  afterEach(function() {
    this.timeout(10000);

    return automatedBrowserTesting.killWebDriver(globalDriverReference);
  });

  const queueUnitTest = browserInfo => {
    it(`should pass all tests in ${browserInfo.getPrettyName()}`, () => {
      if (browserInfo.getSeleniumBrowserId() === 'firefox') {
        const ffProfile = new seleniumFirefox.Profile();
        ffProfile.setPreference('security.turn_off_all_security_so_that_viruses_can_take_over_this_computer', true);
        browserInfo.getSeleniumOptions().setProfile(ffProfile);
      }

      globalDriverReference = browserInfo.getSeleniumDriver();

      let initialisePromise = Promise.resolve();
      if (browserInfo.getSeleniumBrowserId() === 'firefox') {
        // H/T to web-push for this trick to get permissions accepted / denied
        // https://github.com/marco-c/web-push
        initialisePromise = globalDriverReference.executeScript(() => {
          /* global window, Components */
          window.netscape.security.PrivilegeManager.enablePrivilege('UniversalXPConnect');
          Components.utils.import('resource://gre/modules/Services.jsm');
        });
      }

      return initialisePromise
      .then(() => {
        return mochaUtils.startWebDriverMochaTests(
          browserInfo.getPrettyName(),
          globalDriverReference,
          `${testServerURL}/test/browser-tests/`
        );
      })
      .then(testResults => {
        if (testResults.failed.length > 0) {
          const errorMessage = mochaUtils.prettyPrintErrors(
            browserInfo.getPrettyName(),
            testResults
          );
          throw new Error(errorMessage);
        }
      });
    });
  };

  const automatedBrowsers = automatedBrowserTesting.getDiscoverableBrowsers();
  automatedBrowsers.forEach(browserInfo => {
    queueUnitTest(browserInfo);
  });
});
