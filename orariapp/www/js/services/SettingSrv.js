angular.module('viaggia.services.settings', [])
    .service('settingsSrv', function ($filter, Config) {
        var settingsSrv = {};
        var allAccessibilityMode = [{
            text: $filter('translate')('settings_choose_acc'),
            subtext: $filter('translate')('settings_choose_acc_subtext'),
            value: "acc"
                    }, {
            text: $filter('translate')('settings_choose_standard'),
            subtext: $filter('translate')('settings_choose_standard_subtext'),
            value: "standard"
                    }]

        settingsSrv.setCurrentAccessibilityMode = function (mode) {
            var storageAcc = allAccessibilityMode[0];
            if (mode === allAccessibilityMode[1].value) {
                storageAcc = allAccessibilityMode[1];
            }
            localStorage.setItem(Config.getAppId() + "_acc", JSON.stringify(storageAcc));
        };
        settingsSrv.getCurrentAccessibilityMode = function () {
            return JSON.parse(localStorage.getItem(Config.getAppId() + "_acc"));
        };
        settingsSrv.getAllAccessibilityMode = function () {
            return allAccessibilityMode;
        };
        settingsSrv.isAccessible = function () {
            if (settingsSrv.getCurrentAccessibilityMode().value === "acc") {
                return true;
            }
            return false;
        };
        settingsSrv.alreadyChoosen = function () {
            if (settingsSrv.getCurrentAccessibilityMode()) {
                return true;
            }
            return false;
        }

        return settingsSrv;
    });
