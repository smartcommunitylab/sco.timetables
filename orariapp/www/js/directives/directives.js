angular.module('viaggia.controllers.directives', [])
  .directive('watchMenu', function ($timeout, $ionicSideMenuDelegate) {
    return {
      restrict: 'A',
      link: function ($scope, $element, $attr) {
        // Run in the next scope digest
        $timeout(function () {
          // Watch for changes to the openRatio which is a value between 0 and 1 that says how "open" the side menu is

          $scope.$watch(function () {
              return $ionicSideMenuDelegate.getOpenRatio();
            },
            function (ratio) {
              $scope.data = ratio
              var firstMenuElement = document.getElementById('firstMenuElement');;
              if (ratio == 1) {
                //focus on first element of menu
                //                firstMenuElement.classList.add('is-active');
                //$timeout(function () {
                firstMenuElement.focus();
                // console.log(document.activeElement);
                // }, 750);
              } else {
                firstMenuElement.blur();
              }

            });
        });
      }
    };
  });
