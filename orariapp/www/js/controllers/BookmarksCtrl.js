angular.module('viaggia.controllers.bookmarks', [])

	.controller('BookmarksCtrl', function ($scope, $rootScope, $location, $filter, $ionicHistory, $timeout, $ionicPopup, $ionicListDelegate, $state, $ionicModal, Config, bookmarkService, stopNameSrv) {
		$scope.languageTutorial = "en";
        $scope.title = [];

		$scope.tab = 0;
		$scope.tabs = ["FERMATE", "LINEE"];

		$scope.select = function ($index) {
			$scope.tab = $index;
			console.log("Tab Index Changed in", $scope.tab);
		};

		$scope.$on('$ionicView.beforeEnter', function () {
			('alert 2');
		});

		$scope.init = function () {
			Config.init().then(function () {
				bookmarkService.getBookmarks().then(function (list) {
					$scope.bookmarks = list;
                    console.log($scope.bookmarks);
                    $scope.getBookmarkTitle(list);
				});
			});
			initTutorial();
			setLanguageTutorial();
			$scope.showTutorial();
		};

        $scope.getBookmarkTitle = function (list) {
            for (var key in list) {
                var stop = list[key];
				if (stop.type.indexOf("TRAIN") < 0 && stop.type.indexOf("TRANSIT") < 0) {
					var split = stop.data.split(":");
					$scope.title.push(split[0].trim() + " - " + Config.getNewDestination(split[1]));
				} 
				else {
					$scope.title.push(Config.getNewDestination(stop.data));
					console.log("PUSHED: ", Config.getNewDestination(stop.data));
				}
            }
			console.log("titles",$scope.title);
        };

        $scope.removeBookmarkTitle = function (idx) {
            $scope.title.splice(idx, 1);
        };

		$scope.$on('ngLastRepeat.bookmarks', function (e) {
			$timeout(function () {
				ionicMaterialMotion.ripple();
				ionicMaterialInk.displayEffect()
			}); // No timeout delay necessary.
		});

		$scope.delete = function (idx, $event) {
			$scope.deleting = true;
			Config.loading();
			$event.preventDefault();
			bookmarkService.removeBookmark(idx).then(function (list) {
				$scope.bookmarks = list;
                $scope.removeBookmarkTitle(idx);
				$ionicListDelegate.closeOptionButtons();
				Config.loaded();
			});
		};

		$scope.reorder = function (from, to) {
			Config.loading();
			bookmarkService.reorderBookmark(from, to).then(function (list) {
				$scope.bookmarks = list;
				$ionicHistory.clearCache();
				Config.loaded();
			});
		};
		$scope.toggleReorder = function () {
			$scope.showReorder = !$scope.showReorder;
		}
		$scope.go = function (state) {
			if ($scope.deleting) {
				$scope.deleting = false;
			}
			else {
				$location.path(state);
			}
		}
		$scope.openModal = function () {
			$scope.modal.show();
		};
		$scope.closeModal = function () {
			$scope.modal.hide();
		};

		function initTutorial() {
			$scope.imageSrc = '';
			$scope.showReorder = false;
			$scope.tutorialIndex = 1;
			$scope.stepTutorial = 2;
			$scope.endTutorial = false;
		}

		function setLanguageTutorial() {
			if (typeof navigator.globalization !== "undefined") {
				navigator.globalization.getPreferredLanguage(function (language) {
					$scope.languageTutorial = language.value.split("-")[0];
				}, null);
			}
		}

		function doTutorial() {
			if (!window.localStorage.getItem(Config.getAppId() + '_tutorialDone') || window.localStorage.getItem(Config.getAppId() + '_tutorialDone') == 'false') {
				return true;
			}
			else {
				return false;
			}
		}
		$rootScope.forceTutorial = function () {
			window.localStorage.setItem(Config.getAppId() + '_tutorialDone', false);
			$scope.showTutorial();
		}
		$scope.showTutorial = function () {
			if (doTutorial()) {
				if (window.cordova && window.cordova.plugins.screenorientation) {
					screen.lockOrientation('portrait');
				}
				$ionicModal.fromTemplateUrl('templates/bookmarkstutorial.html', {
					scope: $scope
                    , animation: 'slide-in-up'
				}).then(function (modal) {
					$scope.modal = modal;
					initTutorial();
					$scope.showImage($scope.tutorialIndex);
					$scope.openModal();
				});
			}
			//return true;
		}
		$scope.closeTutorial = function () {
			$scope.closeModal();
			if (window.cordova && window.cordova.plugins.screenorientation) {
				screen.unlockOrientation()
			}
			window.localStorage.setItem(Config.getAppId() + '_tutorialDone', true);
		}
		$scope.nextStep = function () {
			if ($scope.tutorialIndex < $scope.stepTutorial) {
				$scope.tutorialIndex = $scope.tutorialIndex + 1;
				if ($scope.tutorialIndex == $scope.stepTutorial) {
					$scope.endTutorial = true;
				}
				$scope.showImage($scope.tutorialIndex);
			}
			else {
				$scope.closeTutorial();
			}
		}
		$scope.showImage = function (index) {
			$scope.imageSrc = 'img/bookmarks/step_' + index + '_' + $scope.languageTutorial + '.png';
		}

		$scope.showStopData = function (idx) {
			var currentStop = $scope.bookmarks[idx];
			var stateParms = currentStop.state.split('/');
			console.log(stateParms);
			$state.go('app.ttstop', {
				stopId: currentStop.id,
				agencyId: stateParms[4],
				ref: stateParms[3],
				routeId: stateParms[6],
			});
		}
	})