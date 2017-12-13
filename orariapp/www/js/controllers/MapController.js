angular.module('viaggia.controllers.map', [])

    .controller('MapController', function ($q, $filter, $scope, $cordovaGeolocation, $ionicLoading, $ionicPopup, $interval, stopNameSrv, GeoLocate, Config) {

        $scope.initMap = function () {
            Directions();
            console.log("Primoh");
            $interval(function () {
                // Directions();
                console.log("Aggiornizio!");
            }, 30000);
        };

        function Directions() {
            var directionService = new google.maps.DirectionsService;
           
            calculateTravel(stopNameSrv.getStop(stopNameSrv.getIndex()), directionService).then(

                function (res) {
                    var directionDisplay = new google.maps.DirectionsRenderer;
                    document.getElementById("directionPanel").innerHTML = "";
                    directionDisplay.setPanel(document.getElementById("directionPanel"));
                    directionDisplay.setDirections(res);
                },
                function (error) {
                    document.getElementById("directionPanel").innerHTML = $filter('translate')("pop_up_error_server_template");
                });
        }

        function calculateTravel(destination, directionService) {
            var deferred = $q.defer();
            Config.loading(); 
            GeoLocate.locate().then(function (pos) {
                var start = new google.maps.LatLng(pos[0], pos[1]);
                var end = new google.maps.LatLng(destination.lat, destination.lng);

                var request = {
                    origin: start,
                    destination: end,
                    travelMode: google.maps.TravelMode.WALKING
                };

                directionService.route(request, function (res, status) {
                    console.log(status);
                    Config.loaded();
                    if (status == google.maps.DirectionsStatus.OK) {
                        deferred.resolve(res);
                    } else {
                        deferred.reject();
                    }
                })
            });
            return deferred.promise;
        }
    });