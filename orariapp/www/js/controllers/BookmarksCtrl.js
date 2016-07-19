angular.module('viaggia.controllers.bookmarks', [])
	
	.controller('BookmarksCtrl', function ($scope, $rootScope, $location, $filter, $ionicHistory, $timeout, $ionicModal, $ionicListDelegate, Config, bookmarkService) {
	$scope.languageTutorial = "en";
   
    $scope.tab = 0;
    $scope.tabs = ["FERMATE","LINEE"];
    
    $scope.select = function($index){
        $scope.tab = $index;
        console.log("Tab Index Changed in",$scope.tab);
    };
    
    $scope.$on('$ionicView.beforeEnter', function () {
		('alert 2');
	});
	$scope.init = function () {
		Config.init().then(function () {
			bookmarkService.getBookmarks().then(function (list) {
				$scope.bookmarks = list;
                console.log($scope.bookmarks);
			});
		});
		initTutorial();
		setLanguageTutorial();
		$scope.showTutorial();
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
})