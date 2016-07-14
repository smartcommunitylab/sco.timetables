angular.module('viaggia.controllers.busRide', ['ionic','ionic-timepicker'])

.config(function(ionicTimePickerProvider) {
    var timePickerObj={
        inputTime: ((new Date().getHours()*60*60)+((new Date()).getMinutes()*60)),
        format: 24,
        step: 5,
        setLabel: 'Fatto',
        closeLabel: 'Chiudi'
    };
    ionicTimePickerProvider.configTimePicker(timePickerObj);
})

.controller('BusRideCtrl', function ($scope, ionicTimePicker) {
    var ipObj1={
        callback: function(val){
            if(typeof(val) === 'undefined') {
                console.log("Time not selected");
            } else {
                var selectedTime = new Date(val * 1000);
               // console.log(val);
                console.log("H: ",selectedTime.getUTCHours()," M: ",selectedTime.getUTCMinutes());
            }
        }
    };
    $scope.openTimePicker = function(){
        ionicTimePicker.openTimePicker(ipObj1);
    }
})