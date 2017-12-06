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
    
.controller('BusRideCtrl', function ($scope, $stateParams, $timeout, ionicTimePicker, ttService, GeoLocate, $filter) {

    var ipObj1 = {
        callback: function (val) {
            if (typeof (val) === 'undefined') {
                console.log("Time not selected");
            }
            else {
                var selectedTime = new Date(val * 1000);
                console.log("SelectedTime",selectedTime.getTime());
                //console.log("H: ", selectedTime.getUTCHours(), " M: ", selectedTime.getUTCMinutes());
            }
        }
        , setLabel: $filter('translate')('pop_up_ok')
        , closeLabel: $filter('translate')('pop_up_cancel')
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

})