angular.module('viaggia.controllers.home', [])

.controller('HomeCtrl', function ($scope, $state, $rootScope, $filter, $location, $ionicTabsDelegate, Config, ttService, settingsSrv, $ionicModal) {
  $scope.tab = 0;
  var titles = ['menu_real_time_bus_urban', 'menu_real_time_train', 'menu_bookmarks'];
  var refs = ['urbano', 'trains'];


  $scope.accessibilityChooses = settingsSrv.getAllAccessibilityMode();
  $scope.data = {
    typeOfAccessibility: 'standard'
  };
  $scope.standardAccessibility = true;

  $scope.$on("$ionicView.enter", function (event, data) {
    $scope.homeTab = $ionicTabsDelegate.$getByHandle('homeTabs').selectedIndex();
    $rootScope.$apply();
    console.log('ciao');
  });

  $scope.$on("$ionicView.beforeEnter", function (event, data) {
    Config.init().then(function () {
      $rootScope.title = Config.getAppName();
      if (!settingsSrv.alreadyChoosen()) {
        //show modal
        $ionicModal.fromTemplateUrl('templates/startup.html', {
          scope: $scope,
          animation: 'slide-in-up',
          hardwareBackButtonClose: false
        }).then(function (modal) {
          $scope.modal = modal;
          $scope.modal.show();
        });
      } else {
        //set map button visualization
        $scope.standardAccessibility = !settingsSrv.isAccessible();
      }

    });
  });
  $scope.selectAcc = function () {
    //chooose acc from  $scope.data.typeOfAccessibility
    settingsSrv.setCurrentAccessibilityMode($scope.data.typeOfAccessibility);
    //set map button visualization
    $scope.standardAccessibility = !settingsSrv.isAccessible();
    //close modal and show home page
    $scope.modal.hide();
  }
  $scope.select = function (tab) {
    $scope.homeTab = tab;
    $rootScope.viewTitle = $filter('translate')(titles[tab]);
  }
  $scope.action = function () {
    if ($scope.tab == 2) $rootScope.forceTutorial();
    else $scope.showMap();
  }
  $scope.go = function (state) {
    $location.path(state);
  }
  $scope.showMap = function () {
    var ref = refs[$scope.tab];
    var data = Config.getTTData(ref);
    var vis = {
      title: $scope.viewTitle,
      markerIcon: data.markerIcon,
      icon: data.icon,
      elements: Config.flattenData(data, ref),
      ref: ref
    };
    ttService.setTTMapData(vis);
    $state.go('app.ttmap');
  };
})
