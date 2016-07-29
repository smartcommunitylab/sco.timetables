angular.module('viaggia.controllers.map', [])

    .controller('MapController', function ($scope, $cordovaGeolocation, $ionicLoading, $interval, stopNameSrv, GeoLocate) {

        $scope.initMap = function () {
            Directions();
            console.log("Primoh");
            $interval(function () {
                Directions();
                console.log("Aggiornizio!");
            }, 30000);
        };

        function Directions() {
            var directionDisplay = new google.maps.DirectionsRenderer;
            var directionService = new google.maps.DirectionsService;
            document.getElementById("directionPanel").innerHTML = "";
            directionDisplay.setPanel(document.getElementById("directionPanel"));
            calculateTravel(stopNameSrv.getStop(stopNameSrv.getIndex()), directionDisplay, directionService);
        }

        function calculateTravel(destination, directionDisplay, directionService) {
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
                    if (status == google.maps.DirectionsStatus.OK) {
                        directionDisplay.setDirections(res);
                    }
                })
            });
        }
    });