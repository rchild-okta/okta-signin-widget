/*jshint maxparams:17 */
define([
  'okta',
  'vendor/lib/q',
  'underscore',
  'jquery',
  '@okta/okta-auth-js/jquery',
  'util/Util',
  'helpers/mocks/Util',
  'helpers/dom/EnrollWindowsHelloForm',
  'helpers/dom/Beacon',
  'helpers/util/Expect',
  'sandbox',
  'util/webauthn',
  'LoginRouter',
  'helpers/xhr/MFA_ENROLL_allFactors',
  'helpers/xhr/MFA_ENROLL_ACTIVATE_Webauthn'
],
function (Okta,
          Q,
          _,
          $,
          OktaAuth,
          LoginUtil,
          Util,
          Form,
          Beacon,
          Expect,
          $sandbox,
          webauthn,
          Router,
          responseMfaEnrollAll,
          responseMfaEnrollActivateWebauthn) {

  var itp = Expect.itp;
  var tick = Expect.tick;

  Expect.describe('EnrollWindowsHello', function () {

    function setup() {
      var setNextResponse = Util.mockAjax([responseMfaEnrollAll, responseMfaEnrollActivateWebauthn]);
      var baseUrl = 'https://foo.com';
      var authClient = new OktaAuth({url: baseUrl, transformErrorXHR: LoginUtil.transformErrorXHR});
      var router = new Router({
        el: $sandbox,
        baseUrl: baseUrl,
        authClient: authClient,
        globalSuccessFn: function () {}
      });
      Util.mockRouterNavigate(router);
      return tick()
      .then(function () {
        router.refreshAuthState('dummy-token');
        return tick();
      })
      .then(function () {
        router.enrollWindowsHello();
        return tick(null);
      })
      .then(function () {
        return {
          router: router,
          beacon: new Beacon($sandbox),
          form: new Form($sandbox),
          ac: authClient,
          setNextResponse: setNextResponse
        };
      });
    }

    function emulateNotWindows() {
      spyOn(webauthn, 'isAvailable').and.returnValue(false);
      spyOn(webauthn, 'makeCredential');
      spyOn(webauthn, 'getAssertion');

      return tick();
    }

    function emulateWindows() {
      spyOn(webauthn, 'isAvailable').and.returnValue(true);

      spyOn(webauthn, 'makeCredential').and.callFake(function () {
        var deferred = Q.defer();

        deferred.resolve({
          credential: {id: 'credentialId'},
          publicKey: 'publicKey'
        });

        return tick(deferred.promise);
      });

      return tick();
    }

    Expect.describe('Header & Footer', function () {
      itp('displays the correct factorBeacon', function () {
        return emulateNotWindows()
        .then(setup)
        .then(function (test) {
          expect(test.beacon.isFactorBeacon()).toBe(true);
          expect(test.beacon.hasClass('mfa-windows-hello')).toBe(true);
        });
      });
      itp('has a "back" link in the footer', function () {
        return emulateNotWindows()
        .then(setup)
        .then(function (test) {
          Expect.isVisible(test.form.backLink());
        });
      });
    });

    Expect.describe('Enroll factor', function () {
      itp('displays error if not Windows', function () {
        return emulateNotWindows()
        .then(setup)
        .then(function (test) {
          expect(test.form.hasErrorNotWindows()).toBe(true);
          expect(test.form.submitButton().length).toBe(0);
        });
      });

      itp('does not display error if Windows', function () {
        return emulateWindows()
        .then(setup)
        .then(function (test) {
          expect(test.form.hasErrorNotWindows()).toBe(false);
          expect(test.form.submitButton().length).toBe(1);
        });
      });

      itp('subtitle changes after submitting the form', function () {
        return emulateWindows()
        .then(setup)
        .then(function (test) {
          expect(test.form.subtitleText())
          .toEqual(Okta.loc('enroll.windowsHello.subtitle', 'login'));
          test.form.submit();
          expect(test.form.subtitleText()).toEqual(Okta.loc('enroll.windowsHello.subtitle.loading', 'login'));
        });
      });

      itp('sends enroll request after submitting the form', function () {
        return emulateWindows()
        .then(setup)
        .then(function (test) {
          test.form.submit();
          return tick();
        })
        .then(function () {
          expect($.ajax.calls.count()).toBe(2);
          Expect.isJsonPost($.ajax.calls.argsFor(1), {
            url: 'https://foo.com/api/v1/authn/factors',
            data: {
              factorType: 'webauthn',
              provider: 'FIDO',
              stateToken: 'testStateToken'
            }
          });
        });
      });

      itp('calls webauthn.makeCredential and activates the factor', function () {
        return emulateWindows()
        .then(setup)
        .then(function (test) {
          test.setNextResponse(responseMfaEnrollActivateWebauthn);
          test.form.submit();
          return tick(test);
        })
        .then(function (test) {
          expect(webauthn.makeCredential).toHaveBeenCalled();
          return tick(test);
        })
        .then(function () {
          expect($.ajax.calls.count()).toBe(3);
          Expect.isJsonPost($.ajax.calls.argsFor(2), {
            url: 'https://foo.com/api/v1/authn/factors/factorId1234/lifecycle/activate',
            data: {
              credentialId: 'credentialId',
              publicKey: 'publicKey',
              stateToken: 'testStateToken',
              attestation: null
            }
          });
        });
      });
    });
  });

});
