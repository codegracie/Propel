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

/* global sinon */
/* eslint-env browser */

class FullStateStub extends window.BaseStateStub {
  constructor() {
    super();

    this.allStubs = [];

    // Fallbacks for browsers where we can't pre-select the permission dialog
    const permissionQueryStub = sinon.stub(window.goog.propel.PropelClient,
      'getPermissionState',
      () => {
        return Promise.resolve(this._currentPermission);
      }
    );

    // Notification.requestPermission
    const permissionRequestStub = sinon.stub(Notification,
      'requestPermission',
      cb => {
        cb(this._currentPermission);
      });

    // navigator.serviceWorker.register
    const registerStub = sinon.stub(
      navigator.serviceWorker, 'register', (swurl, options) => {
        if (this._currentRegistration === null) {
          return Promise.reject(new Error('No valid SW registered'));
        }

        if (this._currentRegistration && options && options.scope) {
          this._currentRegistration.scope = options.scope;
        }
        return Promise.resolve(this._currentRegistration);
      }
    );

    // navigator.serviceWorker.getRegistration
    const getRegistrationStub = sinon.stub(
      navigator.serviceWorker, 'getRegistration', scope => {
        if (this._currentRegistration) {
          this._currentRegistration.scope = scope;
        }

        return Promise.resolve(this._currentRegistration);
      }
    );

    this.allStubs.push(permissionQueryStub);
    this.allStubs.push(permissionRequestStub);
    this.allStubs.push(registerStub);
    this.allStubs.push(getRegistrationStub);
  }

  restore() {
    this.allStubs.forEach(stub => {
      stub.restore();
    });
  }

  setPermissionState(newState) {
    this._currentPermission = newState;
  }

  setUpRegistration(subscription) {
    this._currentRegistration = this._buildSWRegistration(subscription);
  }

  _buildSWRegistration(subscription) {
    let innerSubscription = subscription;
    if (innerSubscription) {
      innerSubscription.unsubscribe = () => {
        innerSubscription = null;
      };
    }
    return {
      scope: './',
      active: {
        // This is to skip handling of SW lifecycle.
      },
      pushManager: {
        subscribe: options => {
          if (!options.userVisibleOnly) {
            throw new Error('Test Stub Error: User Visible Required');
          }

          return Promise.resolve(innerSubscription);
        },
        getSubscription: () => {
          if (typeof subscription === 'undefined') {
            return Promise.reject(new Error('Test Generated Error'));
          }

          return Promise.resolve(innerSubscription);
        }
      }
    };
  }
}

window.FullStateStub = FullStateStub;
