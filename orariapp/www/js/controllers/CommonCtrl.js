angular.module('viaggia.controllers.common', [])

.controller('AppCtrl', function ($scope, $state, $rootScope, $location, $timeout, DataManager, $ionicPopup, $ionicModal, $filter, $translate, $window, $ionicLoading, Config, Toast) {
    /*menu group*/
    $scope.shownGroup = false;
    $scope.toggleGroupRealTime = function () {
        if ($scope.isGroupRealTimeShown()) {
            $scope.shownGroup = false;
        } else {
            $scope.shownGroup = true;
        }
        localStorage.setItem(Config.getAppId() + '_shownGroup', $scope.shownGroup);

    };
    $scope.isGroupRealTimeShown = function () {
        return $scope.shownGroup === true;
    };
    $scope.isAccessibilitySet = function () {
        return Config.getAccessibility();
    }
    $ionicModal.fromTemplateUrl('templates/credits.html', {
        id: '3',
        scope: $scope,
        backdropClickToClose: false,
        animation: 'slide-in-up'
    }).then(function (modal) {
        $scope.creditsModal = modal;
    });
    $scope.closeCredits = function () {
        $scope.creditsModal.hide();
    };
    $scope.openCredits = function () {
            $scope.creditsModal.show();
        }
        /*pop up managers*/
        //    $scope.newPlan = function () {
        //        planService.setTripId(null); //reset data for pianification
        //        $state.go('app.plan');
        //    };
    $scope.popupLoadingShow = function () {
        $ionicLoading.show({
            template: $filter('translate')("pop_up_loading")
        });
    };
    $scope.popupLoadingHide = function () {
        $ionicLoading.hide();
    };

    $scope.showConfirm = function (template, title, functionOnTap) {
        var confirmPopup = $ionicPopup.confirm({
            title: title,
            template: template,
            buttons: [
                {
                    text: $filter('translate')("pop_up_cancel"),
                    type: 'button-cancel'
                            },
                {
                    text: $filter('translate')("pop_up_ok"),
                    type: 'button-custom',
                    onTap: functionOnTap
                    }
            ]
        });
    }

    $scope.showNoConnection = function () {
        var alertPopup = $ionicPopup.alert({
            title: $filter('translate')("pop_up_no_connection_title"),
            template: $filter('translate')("pop_up__no_connection_template"),
            buttons: [
                {
                    text: $filter('translate')("pop_up_ok"),
                    type: 'button-custom'
                            }
            ]
        });
    };
    $scope.showErrorServer = function () {
        var alertPopup = $ionicPopup.alert({
            title: $filter('translate')("pop_up_error_server_title"),
            template: $filter('translate')("pop_up_error_server_template"),
            buttons: [
                {
                    text: $filter('translate')("pop_up_ok"),
                    type: 'button-custom'
                            }
            ]
        });
    };

    Config.init().then(function () {
        $scope.version = Config.getVersion();
        $scope.shownGroup = JSON.parse(localStorage.getItem(Config.getAppId() + '_shownGroup')) || false;
        $scope.contactLink = Config.getContactLink();
    });

    $scope.selectInfomenu = function (m) {
        //      m.data.label = m.label;
        //      Config.setInfoMenuParams(m.data);
        //      $state.go(m.state);
    };

    $scope.questionnaireWindow = function () {
        var questionnaireWindow = null;
        var processThat = false;

        var url = 'https://in-app.welive.smartcommunitylab.it/html/index.html?app=' + Config.getWeLiveAppId() + '&pilotId=Trento&callback=http://localhost' + '&lang=' + $translate.use().toUpperCase();

        //Open the questionnaire page in the InAppBrowser
        if (!questionnaireWindow) {
            questionnaireWindow = window.open(url, '_blank', 'location=no,toolbar=no');
            processThat = !!questionnaireWindow;
        }

        var processURL = function (url, w) {
            var status = /http:\/\/localhost(\/)?\?questionnaire-status=(.+)$/.exec(url);

            if (w && (status)) {
                if (status == 'error') {
                    Tast.show($filter('translate')('pop_up_error_server_title'));
                }
                //Always close the browser when match is found
                w.close();
                questionnaireWindow = null;
            }
        }

        if (ionic.Platform.isWebView()) {
            if (processThat) {
                questionnaireWindow.addEventListener('loadstart', function (e) {
                    //console.log(e);
                    var url = e.url;
                    processURL(url, questionnaireWindow);
                });
            }
        } else {
            angular.element($window).bind('message', function (event) {
                $rootScope.$apply(function () {
                    processURL(event.data);
                });
            });
        }
    }

    $rootScope.credits_info_p1 = $filter('translate')('credits_info');

})

.factory('Toast', function ($rootScope, $timeout, $ionicPopup, $cordovaToast) {
    return {
        show: function (message, duration, position) {
            message = message || "There was a problem...";
            duration = duration || 'short';
            position = position || 'top';

            if (!!window.cordova) {
                // Use the Cordova Toast plugin
                $cordovaToast.show(message, duration, position);
            } else {
                if (duration == 'short') {
                    duration = 2000;
                } else {
                    duration = 5000;
                }

                var myPopup = $ionicPopup.show({
                    template: "<div class='toast'>" + message + "</div>",
                    scope: $rootScope,
                    buttons: []
                });

                $timeout(function () {
                    myPopup.close();
                }, duration);
            }
        }
    };
})

.controller('TutorialCtrl', function ($scope, $ionicLoading) {})

.controller('TermsCtrl', function ($scope, $ionicHistory, $state, $filter, $ionicPopup, $ionicSideMenuDelegate, $timeout, $translate, Config) {

    // before routine.
    $scope.$on('$ionicView.enter', function () {
        Config.loading();
        Config.getLanguage().then(function (data) {
            Config.loaded();
            $scope.termsfile = 'templates/terms/terms-' + data + '.html';
        });
        var acceptStr = localStorage["orariapp_isPrivacyAccepted"];
        $scope.accepting = acceptStr != 'true';
    });

    $scope.acceptPrivacy = function () {
        localStorage["orariapp_isPrivacyAccepted"] = true;
        $ionicHistory.nextViewOptions({
            disableBack: true
        });
        $state.go('app.home');
    };

    $scope.refusePrivacy = function () {
        var myPopup = $ionicPopup.show({
            template: "<center>" + $filter('translate')('terms_refused_alert_text') + "</center>",
            cssClass: 'custom-class custom-class-popup'
        });
        $timeout(function () {
                myPopup.close();
            }, 1800) //close the popup after 1.8 seconds for some reason
            .then(function () {
                navigator.app.exitApp(); // sometimes doesn't work with Ionic View
                ionic.Platform.exitApp();
                console.log('App closed');
            });
    };

})


;
