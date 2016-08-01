angular.module('viaggia.controllers.timetable', ['ionic', 'ionic-timepicker'])

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

    .controller('TTRouteListCtrl', function ($scope, $rootScope, $state, $stateParams, $timeout, $ionicPopup, $filter, $ionicScrollDelegate, ionicMaterialMotion, ionicMaterialInk, Config, ttService) {
        var min_grid_cell_width = 90;
        var ref = null;
        var agencyId = null;
        var groupId = null;

        $scope.title = null;
        $scope.view = 'list';

        $scope.hasMap = false;
        $scope.allMarkers = null;

        $scope.selectElement = function (e) {
            // route element: go to table
            if (e.route != null) {
                $state.go('app.tt', {
                    ref: e.ref,
                    agencyId: e.agencyId,
                    groupId: groupId,
                    routeId: e.route.routeId
                });
                // group with single route: go to table
            } else if (e.group.routes != null && e.group.routes.length == 1) {
                $state.go('app.tt', {
                    ref: e.ref,
                    agencyId: e.agencyId,
                    groupId: e.group.label,
                    routeId: e.group.routes[0].routeId
                });
                // group with multiple elements: go to group
            } else {
                $state.go('app.ttgroup', {
                    ref: e.ref,
                    agencyId: e.agencyId,
                    groupId: groupId ? (groupId + ',' + e.group.label) : e.group.label
                });
            }

        }

        var prepareGrid = function () {
            var cols = Math.floor(window.innerWidth / min_grid_cell_width);
            var gridRows = [];
            var row = [];
            gridRows.push(row);
            for (var i = 0; i < $scope.elements.length; i++) {
                row.push($scope.elements[i]);
                if ((i + 1) % cols == 0) {
                    row = [];
                    gridRows.push(row);
                }
            }
            for (var i = row.length; i < cols; i++) {
                row.push({});
            }
            $scope.gridRows = gridRows;
        }

        $scope.init = function (r, a, g) {
            //        var ref = $stateParams.ref;
            //        var agencyId = $stateParams.agencyId;
            //        var groupId = $stateParams.groupId;
            ref = r;
            agencyId = a;
            groupId = g;

            Config.init().then(function () {
                if (agencyId == null && groupId == null) {
                    // main data
                    var data = Config.getTTData(ref);
                } else if (agencyId != null) {
                    // specific data
                    if (groupId != null) {
                        // specific group
                        var data = Config.getTTData(ref, agencyId, groupId);
                    } else {
                        // agency
                        var data = Config.getTTData(ref, agencyId);
                    }
                }
                if (data) {
                    $scope.hasMap = data.hasMap;
                    $scope.markerIcon = data.markerIcon;
                    $scope.icon = data.icon;

                    var title = $filter('translate')(data.title ? data.title : data.label);
                    if (title.length < 5) title = $filter('translate')('lbl_line') + ' ' + title;
                    $scope.title = title;
                    $scope.elements = Config.flattenData(data, ref, agencyId);
                    $scope.view = data.view ? data.view : 'list';
                    if ($scope.view == 'grid') {
                        prepareGrid();
                    }
                }
            });
        }

        if (!!$stateParams.ref) {
            $scope.init($stateParams.ref, $stateParams.agencyId, $stateParams.groupId);
        }

        window.onresize = function (event) {
            if ($scope.view == 'grid') {
                $scope.view = null;
                $timeout(function () {
                    $scope.view = 'grid';
                    prepareGrid();
                });

            }
        }

        $scope.$on('ngLastRepeat.elements', function (e) {
            $timeout(function () {
                ionicMaterialMotion.ripple();
                ionicMaterialInk.displayEffect()
            }, 0); // No timeout delay necessary.
        });

        $scope.showMap = function () {
            var vis = {
                title: $scope.title,
                markerIcon: $scope.markerIcon,
                icon: $scope.icon,
                elements: $scope.elements,
                ref: ref
            };

            ttService.setTTMapData(vis);
            $state.go('app.ttmap');
        };

        // SCRIPT ACCESSIBILITA'
        $timeout(function () {
            //        document.getElementsByClassName("back-text").setAttribute("aria-label", "torna indietro");
            //        document.getElementsByClassName("back-text").setAttribute("role", "button");

            //      var myEl = angular.element( document.querySelector( '.tab-item' )[0] );
            //      myEl.attr('aria-label',"trasporti urbani");
            //      
        })

    })

    .controller('TTCtrl', function ($scope, $rootScope, $state, $location, $stateParams, $ionicPosition, $ionicScrollDelegate, $timeout, $filter, ttService, GeoLocate, ionicTimePicker, Config, Toast, bookmarkService, stopNameSrv) {
        
        $scope.arrayOfStops = [];
        $scope.nearestStop = {};
        $scope.wheelchairAvailable = "NON DISPONIBILE";
        //$scope.indexRide = 0;
        //$scope.disableRideBottomButton = false;
        //$scope.disableRideUpperButton = false;
        $scope.runningDate = new Date();
        $scope.color = '#dddddd';

        /* Function called on load and reload of the page */
        $scope.$on('$ionicView.enter', function () {
            $scope.colwidth = getTextWidth("000000000", "12px RobotoMono");
            $scope.load();
        });

        $scope.load = function () {
            $scope.route = Config.getTTData($stateParams.ref, $stateParams.agencyId, $stateParams.groupId, $stateParams.routeId);
            $scope.title = ($scope.route.label ? ($scope.route.label + ': ') : '') + $scope.route.title;
            $scope.setNearestLineStop();
            $scope.getTT($scope.runningDate.getTime());

            if (!$scope.route.color) {
                var group = Config.getTTData($stateParams.ref, $stateParams.agencyId, $stateParams.groupId);
                if (group && group.color) $scope.color = group.color;
            } else {
                $scope.color = $scope.route.color;
            }
        }

        $scope.reloadLine = function () {
            GeoLocate.locate().then(function (pos) {
                $rootScope.myPosition = pos;
            }).finally(function () {
                $scope.setNearestLineStop();
                $scope.getTT(new Date().getTime());
                $scope.$broadcast('scroll.refreshComplete');
            })
        }

        /* Move to the next or previous day */
        $scope.prevDate = function () {
            $scope.runningDate.setDate($scope.runningDate.getDate() - 1);
            $scope.getTT($scope.runningDate.getTime());
        }

        $scope.nextDate = function () {
            $scope.runningDate.setDate($scope.runningDate.getDate() + 1);
            $scope.getTT($scope.runningDate.getTime());
        }


        /* Set the nearest line's stop */
        $scope.setNearestLineStop = function () {
            ttService.getStops($stateParams.agencyId, $stateParams.routeId).then(function (data) {
                $scope.getKilometersFromNearestStop(data);
            });
        }

        $scope.getKilometersFromNearestStop = function (listOfStops) {
            $scope.nearestStop = ttService.getNearestStopByDistance(listOfStops);
            stopNameSrv.setNameNearest($scope.nearestStop.name);
        };

        $scope.retrieveNearestStopTime = function(listOfStops) {
            for(var key in listOfStops) {
                var stop = listOfStops[key];
                if(stop.name === $scope.nearestStop.name) {
                    $scope.nearestStopTime = stop.times[0];
                    break;
                }
            }
            console.log($scope.nearestStopTime);
        }

         /* Load list of stops of the current line */
        $scope.getTT = function (date) {
            Config.loading();
            ttService.getTT($stateParams.agencyId, $scope.route.routeSymId, date).then(
                function (data) {
                    $scope.stopData = data;
                    getStopsList(data, date, 1);
                });
        };

        /* Shows the timetable of the current selected stop */
        $scope.showStopData = function (currentStopId) {
            $state.go('app.ttstop', {
                stopId: currentStopId,
                agencyId: $stateParams.agencyId,
                ref: $stateParams.ref,
                routeId: $stateParams.routeId,
            });
        }

        /* Set the stop in bookmark page*/
        $scope.bookmark = function (color) {
            var ref = Config.getTTData($stateParams.ref);
            if ($stateParams.groupId == "Funivia") ref.transportType = "TRANSIT";
            bookmarkService.toggleBookmark($location.path(), $scope.title, ref.transportType, $scope.title, $scope.title, color).then(function (style) {
            });
        };

        $scope.getBookmarkStyle = function () {
            return bookmarkService.getBookmarkStyle($scope.title);
        };

        var getStopsList = function (data, currentTime, threeShold) {
            ttService.getStops($stateParams.agencyId, $stateParams.routeId).then(function (stops) {

                if (stops) {
                    if (data) {

                        $scope.arrayOfStops = [];
                        //$scope.dataTimesLength = data.times.length;
                        var i = 0;
                        var indexOfStop = 0;
                        var indexOfTime = 0;
                        var stopTimes = [];

                        var threeSholdTime = new Date(currentTime);
                        threeSholdTime.setHours(threeSholdTime.getHours() + threeShold);
                        threeSholdTime = $filter('date')(threeSholdTime, "HH:mm");
                        currentTime = $filter('date')(currentTime, 'HH:mm');

                        //Get the index of the stop that has the closest time from the current time    
                        do {
                            for (var j = 0; j < data.times.length; j++) {
                                var time = data.times[j][i];
                                if (time) {
                                    if (time.localeCompare(currentTime) >= 0 && time.localeCompare(threeSholdTime) < 0) {
                                        indexOfTime = j;
                                        break;
                                    }
                                }
                            }
                            i++;
                        } while (indexOfTime == 0);

                        if (indexOfTime > 0) {

                            for (var i = 0; i < data.stops.length; i++) {
                                var name1 = data.stops[i];
                                for (var k = 0; k < stops.length; k++) {
                                    var name2 = stops[k].name;
                                    if (name1 === name2) {
                                        indexOfStop = k;
                                        break;
                                    }
                                }

                                for (var j = indexOfTime; j < data.times.length; j++) {
                                    stopTimes.push(data.times[j][i]);
                                }

                                $scope.arrayOfStops.push({
                                    name: stops[indexOfStop].name,
                                    wheelchair: stops[indexOfStop].wheelChairBoarding,
                                    wcAvailable: ((stops[indexOfStop].wheelChairBoarding > 1) ? "DISPONIBILE" : "NON DISPONIBILE"),
                                    id: stops[indexOfStop].id,
                                    lat: stops[indexOfStop].latitude,
                                    lng: stops[indexOfStop].longitude,
                                    times: stopTimes
                                });
                                stopTimes = [];
                            }
                        }
                        $scope.retrieveNearestStopTime($scope.arrayOfStops);
                        stopNameSrv.setName($scope.arrayOfStops);
                    } else {
                        console.log("DATA ERROR");
                    }
                } else {
                    console.log("STOPS ERROR");
                }
                Config.loaded();
            });
        };

        var getTextWidth = function (text, font) {
            var measurer = document.getElementById('measurer');
            return (measurer.getBoundingClientRect().width);
        };

        /* Timepicker object*/

        var ipObj1 = {
            callback: function (val) {
                if (typeof (val) === 'undefined') {
                    console.log("Time not selected");
                }
                else {
                    var selectedTime = new Date(val * 1000);
                    Config.loading();
                    getStopsList($scope.stopData, selectedTime.setHours(selectedTime.getUTCHours(), selectedTime.getUTCMinutes()), 1);
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

        /*
        $scope.nextRide = function() {
            ($scope.indexRide < $scope.dataTimesLength) ? $scope.indexRide++ : $scope.disableRideUpperButton = true;
            getStopsList($scope.stopData, $scope.runningDate.getTime(), 1);
        }

        $scope.prevRide = function() {
            ($scope.indexRide < $scope.dataTimesLength) ? $scope.indexRide-- : $scope.disableRideBottomButton = true;
            getStopsList($scope.stopData, $scope.runningDate.getTime(), 1);
        }
        */

    })


    .controller('TTMapCtrl', function ($scope, $rootScope, $state, $stateParams, $timeout, $ionicModal, $ionicPopup, $filter, ionicMaterialMotion, ionicMaterialInk, mapService, Config, ttService, GeoLocate, Toast) {
        $scope.allMarkers = null;

        var mapData = ttService.getTTMapData();
        $scope.elements = mapData.elements;
        $scope.markerIcon = mapData.markerIcon;
        $scope.icon = mapData.icon;
        $scope.title = mapData.title;
        $scope.routeIds = [];

        var MAX_MARKERS = 20;
        $scope.$on('leafletDirectiveMap.ttMap.moveend', function (event) {
            $scope.filterMarkers();
        });

        var getAgencies = function () {
            var res = [];
            $scope.elements.forEach(function (e) {
                if (e.agencyId && res.indexOf(e.agencyId) < 0) res.push(e.agencyId);
            });
            return res;
        };

        $scope.filterMarkers = function () {
            Config.loading();
            mapService.getMap('ttMap').then(function (map) {
                var currBounds = map.getBounds();
                if ($scope.allMarkers == null) {
                    var agencyIds = getAgencies();
                    var list = ttService.getStopData(agencyIds);
                    var markers = [];
                    for (var i = 0; i < list.length; i++) {
                        markers.push({
                            stop: list[i],
                            lat: parseFloat(list[i].coordinates[0]),
                            lng: parseFloat(list[i].coordinates[1]),
                            icon: {
                                iconUrl: 'img/' + $scope.markerIcon + '.png',
                                iconSize: [36, 50],
                                iconAnchor: [18, 50],
                                popupAnchor: [-0, -50]
                            },
                        });
                    }
                    $scope.allMarkers = markers;
                }
                var filteredMarkers = [];

                if ($scope.allMarkers.length > MAX_MARKERS) {
                    $scope.allMarkers.forEach(function (m) {
                        if (currBounds.contains(L.latLng(m.lat, m.lng))) {
                            filteredMarkers.push(m);
                        }
                    });

                    Config.loaded();
                    if (filteredMarkers.length > MAX_MARKERS) {
                        console.log('too many markers');
                        if (!$scope.tooManyMarkers) {
                            Toast.show($filter('translate')('err_too_many_markers'), "short", "bottom");
                            $scope.tooManyMarkers = true;
                        }
                        return;
                    } else if (filteredMarkers.length < MAX_MARKERS) {
                        $scope.tooManyMarkers = false;
                    }
                } else {
                    Config.loaded();
                    $scope.tooManyMarkers = false;
                }
                $scope.markers = filteredMarkers;
            });
        };

        $scope.initMap = function () {
            mapService.initMap('ttMap').then(function () {
                GeoLocate.locate().then(function (pos) {
                    $scope.center = {
                        lat: pos[0],
                        lng: pos[1],
                        zoom: 18
                    };
                }, function () {
                    $scope.filterMarkers();
                });

            });
        };
        $scope.$on('$ionicView.beforeEnter', function () {
            mapService.refresh('ttMap');
        });

        $scope.showStopData = function () {
            ttService.setTTStopData($scope.popupStop);
            $state.go('app.ttstop', {
                stopId: $scope.popupStop.id,
                agencyId: $scope.popupStop.agencyId,
                ref: mapData.ref,
                routeId: "Map"
            });
        };

        $scope.navigate = function () {
        };

        $scope.$on('leafletDirectiveMarker.ttMap.click', function (e, args) {
            var showPopup = function () {
                $ionicPopup.show({
                    templateUrl: 'templates/stopPopup.html',
                    title: $filter('translate')('lbl_stop'),
                    cssClass: 'parking-popup',
                    scope: $scope,
                    buttons: [
                        {
                            text: $filter('translate')('btn_close'),
                            type: 'button-close'
                        },
                        {
                            text: '<i class="icon ion-android-time"></i>',
                            onTap: $scope.showStopData
                        }
                    ]
                });
            };

            var p = $scope.markers[args.modelName].stop;
            $scope.popupStop = p;
            Config.loading();
            ttService.getNextTrips($scope.popupStop.agencyId, $scope.popupStop.id, 5).then(function (data) {
                Config.loaded();
                //          var routes = [];
                $scope.elements.forEach(function (e) {
                    var list = [];
                    if (e.group) {
                        if (e.group.routes) list = list.concat(e.group.routes);
                        else if (e.group.route) list.push(e.group.route);
                    } else {
                        if (e.routes) list = list.concat(e.routes);
                        else if (e.route) list.push(e.route);
                    }
                    list.forEach(function (r) {
                        if (data[r.routeId] != null) {
                            data[r.routeId].routeElement = e;
                            data[r.routeId].routeObject = r;
                            //                routes.push(data[r.routeId]);
                        } else if (data[r.routeSymId] != null) {
                            data[r.routeSymId].routeElement = e;
                            data[r.routeSymId].routeObject = r;
                            //                routes.push(data[r.routeSymId]);
                        }
                    });
                });
                $scope.popupStop.data = data;
                $scope.popupStop.icon = $scope.icon;
                //          $scope.popupStop.routes = routes;
                $scope.popupStop.visualization = Config.getStopVisualization($scope.popupStop.agencyId);
                showPopup();
            }, function (err) {
                Config.loaded();
                showPopup();
                console.log('No data');
            });
        });

        $scope.isEmpty = function (data) {
            return angular.equals(data, {});
        };


        angular.extend($scope, {
            center: {
                lat: Config.getMapPosition().lat,
                lng: Config.getMapPosition().long,
                zoom: 18
            },
            markers: [],
            events: {}
        });
    })

    .controller('TTStopCtrl', function ($scope, $state, $stateParams, $timeout, $location, $ionicPopup, $filter, ionicMaterialMotion, ionicMaterialInk, Config, ttService, bookmarkService, stopNameSrv) {

        var group = Config.getTTData($stateParams.ref, $stateParams.agencyId, $stateParams.groupId);
        if (group && group.color) $scope.color = group.color;


        $scope.$on('$ionicView.beforeEnter', function () {
            $scope.loadStopData();
        });

        $scope.loadStopData = function () {

            $scope.setStopDataInit();
            if ($scope.stopData) {
                Config.loading();
                ttService.getTTStopDataAsync($stateParams.ref, $stateParams.agencyId, $stateParams.stopId).then(function (stop) {
                    $scope.stopData = stop;
                    init($scope.stopData);
                    Config.loaded();
                }, function (err) {
                    Config.loaded();
                });
            } else {
                init($scope.stopData);
            }
        };

        var init = function (stopData) {
            stopData = $scope.stopData;
            $scope.stopList = [];
            $scope.title = [];

            if (stopData.data) {

                var d = new Date();
                d.setHours(0);
                d.setMinutes(0);
                d.setSeconds(0);
                d.setMilliseconds(0);
                d.setDate(d.getDate() + 1);

                if ($scope.stopData.data[$stateParams.routeId]) {
                    $scope.stopList.push(stopData.data[$stateParams.routeId]);
                    $scope.title.push(Config.getNewDestination($scope.stopList[0].routeObject.title));
                } else {
                    for (var stop in stopData.data) {
                        $scope.stopList.push(stopData.data[stop]);
                        $scope.title.push(Config.getNewDestination(stopData.data[stop].routeObject.title));
                    }
                }
                console.log($scope.stopList);
                console.log($scope.title);
            }

        };

        $scope.setStopDataInit = function () {
            $scope.stopData = ttService.getTTStopData();
        };

        $scope.getBookmarkStyle = function (stopName) {
            return bookmarkService.getBookmarkStyle(stopName);
        };

        $scope.isEmpty = function () {
            return angular.equals($scope.stopData.data, {});
        };

        $scope.bookmark = function (index, color, id) {
            var ref = Config.getTTData($stateParams.ref);
            bookmarkService.toggleBookmark($location.path(), stopNameSrv.getName(index), ref.transportType + 'STOP', $scope.title, $scope.title, color, id).then(function (style) {
            });
        };
        $scope.openDirectionPopup = function (index) {

            $scope.selectedStop = stopNameSrv.getStop(index);
            stopNameSrv.setIndex(index);
            $ionicPopup.show({
                templateUrl: 'templates/directions.html',
                scope: $scope,
                buttons: [
                    {
                        text: $filter('translate')('btn_close'),
                        type: 'button-close'
                    }
                ]
            });

        }

        $scope.getIndexOfNearest = function () {
            console.log("NearestName:", stopNameSrv.getNearestName());
            console.log("IndexOf: ", stopNameSrv.getStops().map(function (x) { return x.name; }).indexOf(stopNameSrv.getNearestName()));
            return stopNameSrv.getStops()
                .map(function (x) {
                    return x.name;
                })
                .indexOf(stopNameSrv.getNearestName());
        }
    });
