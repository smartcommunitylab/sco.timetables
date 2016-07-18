angular.module('viaggia.controllers.busRide', ['ionic', 'ionic-timepicker'])
    
.config(function (ionicTimePickerProvider) {
    var timePickerObj = {
        inputTime: ((new Date().getHours() * 60 * 60) + ((new Date()).getMinutes() * 60))
        , format: 24
        , step: 5
        , setLabel: 'Fatto'
        , closeLabel: 'Chiudi'
    };
    ionicTimePickerProvider.configTimePicker(timePickerObj);
})
.controller('BusRideCtrl', function ($scope, $stateParams, $timeout, ionicTimePicker, ttService, GeoLocate) {
    $scope.distanceToStop = [];
    $scope.nearestStop = {};
    
    var ipObj1 = {
        callback: function (val) {
            if (typeof (val) === 'undefined') {
                console.log("Time not selected");
            }
            else {
                var selectedTime = new Date(val * 1000);
                console.log("H: ", selectedTime.getUTCHours(), " M: ", selectedTime.getUTCMinutes());
            }
        }
    };
    
    $scope.currentTime = function () {
        var currentTime = new Date();
        $scope.time.hours = currentTime.getHours();
        var mins = currentTime.getMinutes();
        var hours = currentTime.getHours();
        if (mins < 10) {
            $scope.time.minutes = "0" + mins;
        }
        else {
            $scope.time.minutes = mins;
        }
        if (hours < 10) {
            $scope.time.hours = "0" + hours;
        }
        else {
            $scope.time.hours = hours;
        }
    };
    
    $scope.openTimePicker = function () {
        ionicTimePicker.openTimePicker(ipObj1);
    };

    function setLineStops() {
        /*Retrieve stops for line selected*/
        ttService.getStops($stateParams.agencyId, $stateParams.routeId).then(function (data) {
            $scope.getKilometersFromStop(data);
        });
        $scope.nearestStop = $scope.distanceToStop[0];
    }
    
    $scope.getKilometersFromStop = function (listOfStops) {
        for (var i = 0; i < listOfStops.length; i++) {
            GeoLocate.distanceToRealStop(listOfStops[i]).then(function (data) {
                $scope.distanceToStop.push(data);
                $scope.distanceToStop.sort(function (a, b) {
                    return a.distance - b.distance;
                });
            });
        };
    };
    
    setLineStops();
    console.log($scope.distanceToStop);
    console.log($scope.distanceToStop.length);
    console.log($scope.nearestStop);
})