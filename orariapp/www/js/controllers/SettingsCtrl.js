angular.module('viaggia.controllers.settings', [])

.controller('SettingsCtrl', function ($scope, $filter, $state, $ionicHistory, settingsSrv) {
    $scope.title = $filter('translate')('settings_title');
    $scope.accessibilityChooses = settingsSrv.getAllAccessibilityMode();
    $scope.data = {
        typeOfAccessibility: settingsSrv.getCurrentAccessibilityMode().value
    };

    $scope.selectAcc = function () {
        //chooose acc from  $scope.data.typeOfAccessibility
        settingsSrv.setCurrentAccessibilityMode($scope.data.typeOfAccessibility);
        $ionicHistory.nextViewOptions({
            disableBack: true
        });
        $state.go("app.home");
    }
});
