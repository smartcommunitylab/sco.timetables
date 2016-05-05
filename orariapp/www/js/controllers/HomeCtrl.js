angular.module('viaggia.controllers.home', [])

.controller('HomeCtrl', function ($scope, $state, $rootScope, $ionicPlatform, $timeout, $filter, $location, $ionicHistory, Config, GeoLocate, mapService, ionicMaterialMotion, ionicMaterialInk, bookmarkService, ttService) {

    $scope.tab = 0;

    var titles = ['menu_real_time_bus_urban','menu_real_time_train','menu_bookmarks'];
    var refs = ['urbano', 'trains'];

    Config.init().then(function () {
      $rootScope.title = Config.getAppName();
    });


    $scope.select = function(tab) {
      $scope.tab = tab;
      $rootScope.viewTitle = $filter('translate')(titles[tab]);
    }

    $scope.action = function() {
      if ($scope.tab == 2)  $rootScope.forceTutorial();
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
