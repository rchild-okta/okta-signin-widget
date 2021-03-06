/*!
 * Copyright (c) 2015-2016, Okta, Inc. and/or its affiliates. All rights reserved.
 * The Okta software accompanied by this notice is provided pursuant to the Apache License, Version 2.0 (the "License.")
 *
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *
 * See the License for the specific language governing permissions and limitations under the License.
 */

define([
    'okta',
    'shared/views/BaseView'
  ],
  function (Okta, BaseView) {

    var template = '\
      <span class="icon error-24"></span>\
      <h4><strong>{{i18n code="enroll.windowsHello.error.notWindows" bundle="login"}}</strong></h4>\
    ';

    return BaseView.extend({
      template: template,
      className: 'okta-infobox-error infobox infobox-error infobox-md margin-btm-25',
      attributes: {
        'data-se': 'o-form-error-not-windows'
      }
    });
  });
