angular.module('viaggia.controllers.timetable', ['ionic', 'ionic-timepicker'])

.config(function (ionicTimePickerProvider) {
  var timePickerObj = {
    inputTime: ((new Date().getHours() * 60 * 60) + ((new Date()).getMinutes() * 60)),
    format: 24,
    step: 5,
    setLabel: 'Fatto',
    closeLabel: 'Chiudi'
  };
  ionicTimePickerProvider.configTimePicker(timePickerObj);
})

.controller('TTRouteListCtrl', function ($scope, $rootScope, $state, $stateParams, $timeout, $ionicPopup, $filter, $ionicScrollDelegate, ionicMaterialMotion, ionicMaterialInk, Config, ttService, settingsSrv) {
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
      if (settingsSrv.isAccessible()) {
        $state.go('app.ttacc', {
          ref: e.ref,
          agencyId: e.agencyId,
          groupId: groupId,
          routeId: e.route.routeId
        });
      } else {
        $state.go('app.tt', {
          ref: e.ref,
          agencyId: e.agencyId,
          groupId: groupId,
          routeId: e.route.routeId
        });
      }
      // group with single route: go to table
    } else if (e.group.routes != null && e.group.routes.length == 1) {
      if (settingsSrv.isAccessible()) {
        $state.go('app.ttacc', {
          ref: e.ref,
          agencyId: e.agencyId,
          groupId: e.group.label,
          routeId: e.group.routes[0].routeId
        });
      } else {
        $state.go('app.tt', {
          ref: e.ref,
          agencyId: e.agencyId,
          groupId: e.group.label,
          routeId: e.group.routes[0].routeId
        });
      }
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
})

.controller('TTAccCtrl', function ($scope, $rootScope, $state, $location, $stateParams, $ionicPosition, $ionicScrollDelegate, $timeout, $filter, ttService, GeoLocate, ionicTimePicker, Config, Toast, bookmarkService, stopNameSrv) {

  $scope.arrayOfStops = [];
  $scope.nearestStop = {};
  $scope.wheelchairAvailable = "NON DISPONIBILE";
  $scope.indexRide = 0;
  $scope.indexOfTime = 0;
  $scope.runningDate = new Date();
  $scope.runningLineDate = new Date();
  $scope.color = '#dddddd';

  /* Function called on load and reload of the page */
  $scope.$on('$ionicView.enter', function () {
    $scope.colwidth = getTextWidth("000000000", "12px RobotoMono");
    $scope.load();
  });
  $scope.load = function () {
    $scope.route = Config.getTTData($stateParams.ref, $stateParams.agencyId, $stateParams.groupId, $stateParams.routeId);
    $scope.title = ($scope.route.label ? ($scope.route.label + ': ') : '') + $scope.route.title;
    $scope.bookmarkStyle = bookmarkService.getBookmarkStyle($location.path());
    $scope.setNearestLineStop();
    $scope.getTT($scope.runningDate.getTime());

    if (!$scope.route.color) {
      var group = Config.getTTData($stateParams.ref, $stateParams.agencyId, $stateParams.groupId);
      if (group && group.color) $scope.color = group.color;
    } else {
      $scope.color = $scope.route.color;
    }
  };
  $scope.reloadLine = function () {
    GeoLocate.locate().then(function (pos) {
      $rootScope.myPosition = pos;
    }).finally(function () {
      $scope.setNearestLineStop();
      $scope.runningLineDate = new Date();
      $scope.getTT(new Date().getTime());
      $scope.$broadcast('scroll.refreshComplete');
    })
  };

  /* Move to the next or previous day */
  $scope.prevDate = function () {
    $scope.runningDate.setDate($scope.runningDate.getDate() - 1);
    $scope.getTT($scope.runningDate.getTime());
  };
  $scope.nextDate = function () {
    $scope.runningDate.setDate($scope.runningDate.getDate() + 1);
    $scope.getTT($scope.runningDate.getTime());
  };


  /* Set the nearest line's stop */
  $scope.setNearestLineStop = function () {
    ttService.getStops($stateParams.agencyId, $stateParams.routeId).then(function (data) {
      $scope.getKilometersFromNearestStop(data);
    }, function (err) {
      Config.loaded();
      Toast.show($filter('translate')('pop_up_error_server_template'), "short", "bottom");

    });
  }
  $scope.getKilometersFromNearestStop = function (listOfStops) {
    $scope.nearestStop = ttService.getNearestStopByDistance(listOfStops);
    if ($scope.nearestStop) stopNameSrv.setNameNearest($scope.nearestStop.name);
  };
  $scope.retrieveNearestStopTime = function (listOfStops) {
    for (var key in listOfStops) {
      var stop = listOfStops[key];
      if (stop.name === $scope.nearestStop.name) {
        $scope.nearestStopTime = ttService.checkTimes(stop.times[0]);
        break;
      }
    }
  };

  /* Load list of stops of the current line */
  $scope.getTT = function (date) {
    Config.loading();
    ttService.getTT($stateParams.agencyId, $scope.route.routeSymId, date).then(
      function (data) {
        $scope.indexRide = 0;
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
  $scope.bookmarkLine = function (color) {
    var ref = Config.getTTData($stateParams.ref);
    var transportType = ($stateParams.groupId == 'Funivia') ? 'TRANSIT' : ref.transportType;
    $rootScope.bookmarksListDirty = true;

    bookmarkService.toggleBookmark($location.path(), $scope.title, transportType, $scope.title, $scope.title, color, "").then(function (style) {
      $scope.bookmarkStyle = style;
    });
  };
  $scope.getBookmarkStyle = function () {
    return bookmarkService.getBookmarkStyle($location.path());
  };

  /* Handle the currentTime and the Timepicker function */
  $scope.currentTime = function () {
    var currentTime = new Date();
    $scope.time.hours = currentTime.getHours();
    var mins = currentTime.getMinutes();
    var hours = currentTime.getHours();
    if (mins < 10) {
      $scope.time.minutes = "0" + mins;
    } else {
      $scope.time.minutes = mins;
    }
    if (hours < 10) {
      $scope.time.hours = "0" + hours;
    } else {
      $scope.time.hours = hours;
    }
  };
  $scope.openTimePicker = function () {
    ionicTimePicker.openTimePicker(ipObj1);
  };

  /* Move to the next and the previous ride*/
  $scope.nextRide = function () {
    Config.loading();
    ($scope.indexOfTime < $scope.dataTimesLength - 1) ? $scope.indexRide++: $scope.disableRideUpperButton = true;
    getStopsList($scope.stopData, $scope.runningLineDate.getTime(), 1);
  };
  $scope.prevRide = function () {
    Config.loading();
    ($scope.indexOfTime > 0) ? $scope.indexRide--: $scope.disableRideBottomButton = true;
    getStopsList($scope.stopData, $scope.runningLineDate.getTime(), 1);
  };

  /* Set the array of lines to be displayed on the timetable page */
  var getStopsList = function (data, currentTime, threeShold) {
    ttService.getStops($stateParams.agencyId, $stateParams.routeId).then(function (stops) {
      if (stops) {
        if (data) {

          $scope.arrayOfStops = [];
          $scope.dataTimesLength = data.times.length;
          $scope.indexOfTime = 0;

          var i = 0;
          var indexOfStop = 0;
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
                  $scope.indexOfTime = j;
                  break;
                }
              }
            }
            i++;
          } while ($scope.indexOfTime == 0 && i <= data.times[0].length);

          $scope.indexOfTime += $scope.indexRide;

          if ($scope.indexOfTime > 0) {

            for (var i = 0; i < data.stops.length; i++) {
              var name1 = data.stops[i];
              for (var k = 0; k < stops.length; k++) {
                var name2 = stops[k].name;
                if (name1 === name2) {
                  indexOfStop = k;
                  break;
                }
              }

              for (var j = $scope.indexOfTime; j < data.times.length; j++) {
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
              $scope.arrayOfStops[i].times[0] = ttService.checkTimes($scope.arrayOfStops[i].times[0]);
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
    }, function (err) {
      Config.loaded();
      Toast.show($filter('translate')('pop_up_error_server_template'), "short", "bottom");

    });
  };

  /* Text Styler on page load */
  var getTextWidth = function (text, font) {
    var measurer = document.getElementById('measurer');
    return (measurer.getBoundingClientRect().width);
  };

  /* Timepicker object*/
  var ipObj1 = {
    callback: function (val) {
      if (typeof (val) === 'undefined') {
        console.log("Time not selected");
      } else {
        var selectedTime = new Date(val * 1000);
        Config.loading();
        $scope.runningLineDate.setHours(selectedTime.getUTCHours(), selectedTime.getUTCMinutes());
        $scope.indexRide = 0;
        getStopsList($scope.stopData, $scope.runningLineDate, 1);
      }
    }
  };



})

.controller('TTCtrl', function ($scope, $rootScope, $state, $location, $stateParams, $ionicPosition, $ionicScrollDelegate, $timeout, $filter, ttService, Config, Toast, bookmarkService, $ionicLoading, profileService) {
    $scope.data = [];
    var biggerTable = false;
    $scope.tableStyle = profileService.isLittleSize() ? 'ic_text_size_outline' : 'ic_text_size';
    var rowHeight = 20;
    $scope.rowHeight = rowHeight;
    var headerRowHeight = 25; // has a border
    $scope.stopsColWidth = 100; // has border
    // $scope.flagAccessibility = profileService.getAccessibility();
    $scope.flagAccessibility = false;
    $scope.headervariable = 90;
    $scope.stopsColLineHeight = 20;
    if (ionic.Platform.isWebView() && ionic.Platform.isIOS() && ionic.Platform.version() < 9) {
      $scope.stopsColLineHeight = 21;
      rowHeight = 21;
      $scope.rowHeight = rowHeight;
    }

    // header height from the standard style. Augmented in case of iOS non-fullscreen.
    var headerHeight = 44 + $scope.headervariable + 1;
    if (ionic.Platform.isIOS() && !ionic.Platform.isFullScreen) {
      headerHeight += 20;
    }
    var cellWidthBase = 50;
    //    var firstColWidth = 100;
    var cellHeightBase = 28;
    var firstRowHeight = 28;

    $scope.scrollLeftPosition = 0;
    $scope.tt = null;
    $scope.runningDate = new Date();
    $scope.color = '#dddddd';


    //    set the variables for bigger style
    var setBiggerStyle = function () {
      biggerTable = true;
      var rowHeight = 30;
      $scope.rowHeight = rowHeight;
      var headerRowHeight = 30; // has a border
      $scope.stopsColWidth = 150; // has border
      $scope.stopsColLineHeight = 30;
      if (ionic.Platform.isWebView() && ionic.Platform.isIOS() && ionic.Platform.version() < 9) {
        $scope.stopsColLineHeight = 31;
        rowHeight = 31;
        $scope.rowHeight = rowHeight;
      }
      var headerTable = document.getElementById('header-table');
      var headerheight = 90;
      if (headerTable) {
        headerheight = headerTable.clientHeight;
      }
      $scope.headervariable = headerheight + 5 * $scope.header_row_number;
      // header height from the standard style. Augmented in case of iOS non-fullscreen.
      var headerHeight = 44 + $scope.headervariable + 1;
      if (ionic.Platform.isIOS() && !ionic.Platform.isFullScreen) {
        headerHeight += 20;
      }
      var cellWidthBase = 60;
      var cellHeightBase = 48;
      var firstRowHeight = 48;
      $scope.fontsize = 16;
      $scope.scrollHeight = window.innerHeight - headerHeight;

    };

    //    set the variables for smaller style
    var setSmallerStyle = function () {
      biggerTable = false;
      var rowHeight = 20;
      $scope.rowHeight = rowHeight;
      var headerRowHeight = 20; // has a border
      $scope.stopsColWidth = 100; // has border
      $scope.fontsize = 12;
      $scope.stopsColLineHeight = 20;
      if (ionic.Platform.isWebView() && ionic.Platform.isIOS() && ionic.Platform.version() < 9) {
        $scope.stopsColLineHeight = 21;
        rowHeight = 21;
        $scope.rowHeight = rowHeight;
      }
      var headerTable = document.getElementById('header-table');
      var headerheight = 90;
      if (headerTable) {
        headerheight = headerTable.clientHeight;
      }
      $scope.headervariable = headerheight + 5 * $scope.header_row_number;

      // header height from the standard style. Augmented in case of iOS non-fullscreen.
      var headerHeight = 44 + $scope.headervariable + 1;
      if (ionic.Platform.isIOS() && !ionic.Platform.isFullScreen) {
        headerHeight += 20;
      }
      var cellWidthBase = 50;
      //    var firstColWidth = 100;
      var cellHeightBase = 28;
      var firstRowHeight = 28;
      $scope.scrollHeight = window.innerHeight - headerHeight;
    };

    $scope.changeStyleTable = function () {
      //change style to the table

      var actualPosition = {};
      var actualCol = 0;
      var actualRow = 0;
      $ionicLoading.show({
        duration: 2000
      });
      $timeout(function () {
        if (!biggerTable) {
          setBiggerStyle();
          profileService.setTableBigSize();
        } else {
          setSmallerStyle();
          profileService.setTableLittleSize()
        }
        $scope.tableStyle = biggerTable ? 'ic_text_size' : 'ic_text_size_outline';
        actualPosition = $ionicScrollDelegate.$getByHandle('list').getScrollPosition();
        actualCol = actualPosition.left / $scope.colwidth;
        actualRow = actualPosition.top / $scope.stopsColLineHeight;
        $ionicScrollDelegate.$getByHandle('list').scrollTo(0, 0, false);
        $ionicScrollDelegate.$getByHandle('list').resize();
      }, 100);
      $timeout(function () {
        $ionicScrollDelegate.$getByHandle('list').scrollTo(actualCol * $scope.colwidth, actualRow * $scope.stopsColLineHeight, false);

      }, 2000);

    }
    var getTextWidth = function (text, font) {
      var measurer = document.getElementById('measurer');
      return (measurer.getBoundingClientRect().width);
    };

    $scope.$on('$ionicView.enter', function () {
      $scope.colwidth = getTextWidth("000000000", "12px RobotoMono");
      $scope.load();
    });
    // load timetable data
    $scope.getTT = function (date) {
      Config.loading();
      ttService.getTT($stateParams.agencyId, $scope.route.routeSymId, date).then(
        function (data) {
          if ($scope.tt && data.delays && data.delays.length > 0) {
            $scope.tt.delays = data.delays;
            updateDelays(data);
          }
        },
        function (err) {
          $scope.tt = {
            tripIds: []
          };
          Config.loaded();
        },
        function (data) {
          constructTable(data);
          if (profileService.isLittleSize()) {
            setSmallerStyle();
          } else {
            setBiggerStyle();
          }

          Config.loaded();
        });
    };

    // convert delay object to string
    var getDelayValue = function (delay) {
        var res = '';
        //    if (delay && delay.SERVICE && delay.SERVICE > 0) {
        //      res += '<span>'+delay.SERVICE+'\'</span>';
        //    }
        //    if (delay && delay.USER && delay.USER > 0) {
        //      res += '<span>'+delay.USER+'\'</span>';
        //    }
        if (delay && delay.SERVICE && delay.SERVICE > 0) {
          res += delay.SERVICE + '\'';
        }
        if (delay && delay.USER && delay.USER > 0) {
          if (res.length > 0) res += ' / ';
          res += delay.USER + '\'';
        }
        return res;
      }
      // custom trip name if trip row is shown
    var getTripText = function (trip) {
      try {
        return TRIP_TYPE_EXTRACTOR($stateParams.agencyId, $scope.route.routeSymId, trip);
      } catch (e) {
        return trip;
      }
    }

    var initMeasures = function (data, noscroll) {
      if (window.innerHeight < window.innerWidth) {
        $scope.stopsColWidth = 170;
      } else {
        if (biggerTable) {
          $scope.stopsColWidth = 150;
        } else {
          $scope.stopsColWidth = 100;
        }
      }
      // header rows
      $scope.header = null;
      // first col with stops
      $scope.col = null;

      if (!$scope.tt.tripIds || $scope.tt.tripIds.length == 0) return;

      //    var cn = Math.floor((window.innerWidth - firstColWidth) / cellWidthBase);
      //    $scope.column_width = (window.innerWidth - firstColWidth) / cn;
      //    $scope.column_number = Math.min(cn, data.tripIds.length);
      //
      //    var rn = Math.floor((window.innerHeight - (firstRowHeight+1)*$scope.header_row_number - headerHeight) / cellHeightBase);
      //    $scope.row_height = (window.innerHeight - (firstRowHeight+1)*$scope.header_row_number - headerHeight) / rn;
      //    $scope.row_number = Math.min(rn, data.stops.length);
      //
      //    $timeout(function(){;$scope.scrollLeftPosition = ttService.locateTablePosition(data,new Date());},0);

      $scope.tableHeight = data.stops.length * rowHeight;
      //        $scope.scrollWidth = stopsColWidth + data.tripIds.length * $scope.colwidth;
      $scope.scrollWidth = window.innerWidth + ($scope.flagAccessibility ? 0 : 25); //plus accessibility
      $scope.scrollHeight = window.innerHeight - headerHeight;
      // $scope.tableHeaderHeight = $scope.header_row_number * headerRowHeight;
      $scope.tableHeaderHeight = $scope.header_row_number * headerRowHeight;

      if (!noscroll) {
        $timeout(function () {
          //      if ($scope.header == null) {
          //        $scope.header = document.getElementById('table-header');
          //        $scope.colwidth = ($scope.header.getBoundingClientRect().width) / data.tripIds.length;
          //      }

          var columnScrollTo = ttService.locateTablePosition(data, new Date());
          columnScrollTo = Math.min(columnScrollTo, data.tripIds.length - ($scope.scrollWidth - $scope.stopsColWidth) / $scope.colwidth);
          var pos = $scope.colwidth * columnScrollTo;
          //alert('scroll to:' + pos);
          //            $ionicScrollDelegate.$getByHandle('list').scrollTo(0, 0, false);
          $ionicScrollDelegate.$getByHandle('list').scrollTo(pos, 0, true);

        }, 300);
      }
    }

    var lastResize = 0;
    // track size change due to, e.g., orientation change
    window.onresize = function (event) {
      lastResize = new Date().getTime();

      $timeout(function () {
        // on drag may be many events. let's wait a bit
        if ((new Date().getTime() - 200) >= lastResize) {
          var tt = $scope.tt;
          // reset the tt data to trigger ng-if condition
          $scope.tt = null;
          $timeout(function () {
            constructTable(tt);
          });
        }
      }, 200);
    };

    var expandStr = function (str) {
      if (str.length < 9) {
        var m = 9 - str.length;
        var l = Math.round(m / 2);
        for (var i = 0; i < l; i++) {
          str = '&nbsp;' + str;
        }
        for (var i = 0; i < m - l; i++) {
          str += '&nbsp';
        }
      }
      return str;
    };

    $scope.doScroll = function () {
      if ($scope.header == null) {
        $scope.header = document.getElementById('table-header');
      }
      if ($scope.col == null) {
        $scope.col = document.getElementById('table-col');
      }
      var pos = $ionicScrollDelegate.$getByHandle('list').getScrollPosition();
      if ($scope.header != null) {
        $scope.header.style.top = pos.top + 'px';
      }
      if ($scope.col != null) {
        $scope.col.style.left = pos.left + 'px';
        //        alert('scroll top' + pos.top + 'px ' + pos.left + 'px');
      }

    }

    var updateDelays = function (data) {
      str = '';
      for (var i = 0; i < data.tripIds.length; i++) {
        str += expandStr(getDelayValue(data.delays[i]));
      }
      $scope.headStr[0] = str;
    }

    // construct the table
    var constructTable = function (data) {

      $scope.header_row_number = $scope.route.showTrips ? 2 : 1;

      var dataStr = '';
      var headStr = $scope.header_row_number == 2 ? ['', ''] : [''];
      var colStr = '';
      var tableCornerStr = ['', ''];

      var rows = [];
      if (data.stops) {
        for (var row = 0; row < data.stops.length + $scope.header_row_number; row++) {
          var rowContent = [];
          for (var col = 0; col <= data.tripIds.length; col++) {
            // corner 0
            if (col == 0 && row == 0) {
              var str = $filter('translate')('lbl_delays');
              rowContent.push(str);
              tableCornerStr[0] = str;
              // corner 1
            } else if ($scope.header_row_number == 2 && row == 1 && col == 0) {
              var str = $filter('translate')('lbl_trips');
              rowContent.push(str);
              tableCornerStr[1] = str;
              // stops column
            } else if (col == 0) {
              rowContent.push(data.stops[row - $scope.header_row_number]);
              //check from data if accessibility
              if (!!data.wheelChairBoarding && data.wheelChairBoarding[row - $scope.header_row_number] == 1) {
                // if (data.wheelChairBoarding && data.wheelChairBoarding[row - $scope.header_row_number] == 1) {
                colStr += '<div class="accessibilityBullet"><i class="icon ion-record"></i></div>';
              } else {
                colStr += '<div class="accessibilityBullet"></div>';

              }
              colStr += data.stops[row - $scope.header_row_number] + '<br/>';
              // delays header row
            } else if (row == 0) {
              var str = '';
              if (data.delays) str = getDelayValue(data.delays[col - 1]);
              rowContent.push(str);
              str = expandStr(str);
              headStr[0] += str;
              // train lines header row
            } else if ($scope.header_row_number == 2 && row == 1) {
              var str = getTripText(data.tripIds[col - 1]);
              rowContent.push(str);
              str = expandStr(str, true);
              headStr[1] += str;
              // table data
            } else {
              var str = data.times[col - 1][row - $scope.header_row_number];
              rowContent.push(str);
              if (!str) str = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
              dataStr += '&nbsp;&nbsp;' + str + '&nbsp;&nbsp;';
              if (col == data.tripIds.length) dataStr += '<br/>';
            }
          }
          rows.push(rowContent);
        }
      } else {
        data.stops = [];
        data.stopIds = [];
      }
      $scope.data = rows;
      $scope.headStr = headStr;
      $scope.dataStr = dataStr;
      $scope.tableCornerStr = tableCornerStr;
      $scope.colStr = colStr;

      $scope.tt = data;

      initMeasures(data);
    };

    // initialize
    $scope.load = function () {
      $scope.route = Config.getTTData($stateParams.ref, $stateParams.agencyId, $stateParams.groupId, $stateParams.routeId);
      $scope.title = ($scope.route.label ? ($scope.route.label) : $scope.route.title);
      $scope.subtitle = ($scope.route.label ? ($scope.route.title) : '');
      $scope.bookmarkStyle = bookmarkService.getBookmarkStyle($location.path());
      //$scope.accessibilityStyle = getAccessibilityStyle();
      setAccessibilityKnow();
      if ($scope.accesibilityKnow && $scope.route.wheelChairBoarding != 2) {
        $scope.flagAccessibility = profileService.getAccessibility();
      } else {
        $scope.flagAccessibility = false;
      }
      $scope.accessibilityStyle = getAccessibilityStyle();

      if (!$scope.route.color) {
        var group = Config.getTTData($stateParams.ref, $stateParams.agencyId, $stateParams.groupId);
        if (group && group.color) $scope.color = group.color;
      } else {
        $scope.color = $scope.route.color;
      }
      $scope.getTT($scope.runningDate.getTime());
    }

    // go to next date
    $scope.nextDate = function () {
        $scope.runningDate.setDate($scope.runningDate.getDate() + 1);
        $scope.getTT($scope.runningDate.getTime());
      }
      // go to prev date
    $scope.prevDate = function () {
      $scope.runningDate.setDate($scope.runningDate.getDate() - 1);
      $scope.getTT($scope.runningDate.getTime());
    }

    // $scope.styleFn = function (value, row, col) {
    //   //        var cls = col % 2 == 0 ? 'even' : 'odd';
    //   var res = '';
    //   if (row == 0) res += 'color: red;';
    //   if (col % 2 == 0) return res;
    //   return res + 'background-color: #eee';
    // }

    $scope.showStop = function ($event) {
      var pos = $ionicScrollDelegate.$getByHandle('list').getScrollPosition().top + $event.clientY - $scope.tableHeaderHeight - headerHeight;
      var idx = Math.floor(pos / $scope.stopsColLineHeight);
      if (idx < 0 || idx >= $scope.tt.stops.length) return;
      var stop = $scope.tt.stops[idx];
      Toast.show(stop, "short", "bottom");
    }

    //        $scope.bookmark = function () {
    //            var ref = Config.getTTData($stateParams.ref);
    //            bookmarkService.toggleBookmark($location.path(), $scope.title, ref.transportType).then(function (style) {
    //                $scope.bookmarkStyle = style;
    //            });
    //        };
    /* Set the stop in bookmark page*/
    $scope.bookmark = function () {
      var ref = Config.getTTData($stateParams.ref);
      var transportType = ($stateParams.groupId == 'Funivia') ? 'TRANSIT' : ref.transportType;
      $rootScope.bookmarksListDirty = true;

      bookmarkService.toggleBookmark($location.path(), $scope.title + ':' + $scope.subtitle, transportType, $scope.title + ':' + $scope.subtitle, $scope.title + ':' + $scope.subtitle, $scope.color, "").then(function (style) {
        $scope.bookmarkStyle = style;
      });
    };
    $scope.toggleAccessibility = function () {

      if ($scope.route.wheelChairBoarding == 1) {
        $scope.flagAccessibility = !$scope.flagAccessibility;
      } else {
        Toast.show($filter('translate')('not_acc_label'), "short", "bottom");

      }
      profileService.setAccessibility($scope.flagAccessibility);
      $scope.accessibilityStyle = getAccessibilityStyle();

      initMeasures($scope.tt, true);
      $scope.doScroll();
    }

    function setAccessibilityKnow() {
      if ($scope.route.wheelChairBoarding == 1) {
        $scope.accesibilityKnow = true;

      } else if ($scope.route.wheelChairBoarding == 2) {
        $scope.accesibilityKnow = true;
      } else { // if I don't know, don't see it
        $scope.accesibilityKnow = false;
      }
    }

    function getAccessibilityStyle() {
      //        if ($scope.route.wheelChairBoarding == 1) {
      //            $scope.accesibilityKnow = true;
      //
      //        } else if ($scope.route.wheelChairBoarding == 2) {
      //            $scope.accesibilityKnow = true;
      //        } else { // if I don't know, don't see it
      //            $scope.accesibilityKnow = false;
      //        }
      setAccessibilityKnow();
      return $scope.flagAccessibility ? 'ic_access' : 'ic_access_outline';
    }
  })
  .controller('TTMapCtrl', function ($scope, $rootScope, $state, $stateParams, $timeout, $ionicModal, $ionicPopup, $filter, ionicMaterialMotion, ionicMaterialInk, mapService, Config, ttService, GeoLocate, Toast, profileService) {
    $scope.allMarkers = null;

    var mapData = ttService.getTTMapData();
    $scope.elements = mapData.elements;
    $scope.markerIcon = mapData.markerIcon;
    $scope.icon = mapData.icon;
    $scope.title = mapData.title;
    $scope.ref = mapData.ref;
    $scope.flagAccessibility = profileService.getAccessibility();
    $scope.accessibilityStyle = getAccessibilityStyle($scope.ref);
    if (!$scope.accesibilityKnow) {
      $scope.flagAccessibility = false;
    }
    var MAX_MARKERS = 20;
    $scope.$on('leafletDirectiveMap.ttMap.moveend', function (event) {
      $scope.filterMarkers();
    });


    function getAccessibilityStyle(ref) {

      //check if bus or train
      if (ref === 'urbano') {
        $scope.accesibilityKnow = true;
      } else {
        $scope.accesibilityKnow = false;
      }
      return $scope.flagAccessibility ? 'ic_access' : 'ic_access_outline';

    }

    $scope.toggleAccessibility = function () {

      $scope.flagAccessibility = !$scope.flagAccessibility;
      $scope.accessibilityStyle = getAccessibilityStyle($scope.ref);
      $scope.filterMarkers(true);
      profileService.setAccessibility($scope.flagAccessibility);
    }
    var getAgencies = function () {
      var res = [];
      $scope.elements.forEach(function (e) {
        if (e.agencyId && res.indexOf(e.agencyId) < 0) res.push(e.agencyId);
      });
      return res;
    };

    $scope.filterMarkers = function (accessibility) {
      Config.loading();
      mapService.getMap('ttMap').then(function (map) {
        var currBounds = map.getBounds();
        if ($scope.allMarkers == null || accessibility) {
          var agencyIds = getAgencies();
          var list = ttService.getStopData(agencyIds);
          var markers = [];
          for (var i = 0; i < list.length; i++) {
            if (list[i].wheelChairBoarding == 1 || !$scope.flagAccessibility) {
              var iconUrl = 'img/' + $scope.markerIcon + '.png';
            } else {
              var iconUrl = 'img/ic_urbanBus_no_acc.png';
            }
            markers.push({
              stop: list[i],
              lat: parseFloat(list[i].coordinates[0]),
              lng: parseFloat(list[i].coordinates[1]),
              icon: {
                iconUrl: iconUrl,
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
          $scope.filterMarkers(false);
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
        ref: mapData.ref
      });
    }

    $scope.navigate = function () {
      planService.setPlanConfigure({
        to: {
          name: $scope.popupStop.name,
          lat: $scope.popupStop.coordinates[0],
          long: $scope.popupStop.coordinates[1]
        },
      });
      planService.setName('to', $scope.popupStop.name);
      $state.go('app.plan');
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
//            {
//              text: '<i class="icon ion-navigate"></i>',
//              onTap: $scope.navigate,
//                },
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

.controller('TTStopCtrl', function ($scope, $rootScope, $state, $stateParams, $timeout, $location, $ionicPopup, $filter, ionicMaterialMotion, ionicMaterialInk, Config, ttService, bookmarkService, stopNameSrv) {
  $scope.bookmarkStyle = bookmarkService.getBookmarkStyle($location.path());
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
    }

  };

  $scope.setStopDataInit = function () {
    $scope.stopData = ttService.getTTStopData();
  };

  $scope.getStopBookmarkStyle = function (stopName) {
    return bookmarkService.getBookmarkStyleStop(stopName, $stateParams.routeId);
  };

  $scope.isEmpty = function () {
    return angular.equals($scope.stopData.data, {});
  };

  $scope.bookmarkStop = function (index, color, id) {
    var ref = Config.getTTData($stateParams.ref);
    var transportType = ($stateParams.groupId == 'Funivia') ? 'TRANSIT' : ref.transportType;
    $rootScope.bookmarksListDirty = true;

    bookmarkService.toggleBookmark($location.path(), stopNameSrv.getName(index), transportType + 'STOP', $scope.title, $scope.title, color, id, $stateParams.routeId, true).then(function (style) {
      // $scope.bookmarkStyle = style;
    });
  };
  $scope.bookmarkNoAccStop = function () {
    var ref = Config.getTTData($stateParams.ref);
    var transportType = ($stateParams.groupId == 'Funivia') ? 'TRANSIT' : ref.transportType;
    $rootScope.bookmarksListDirty = true;

    bookmarkService.toggleBookmark($location.path(), $scope.stopData.name, transportType + 'STOP', $scope.title, $scope.title, null, $scope.stopData.id, $stateParams.routeId, true).then(function (style) {
      $scope.bookmarkStyle = style;
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
    return stopNameSrv.getStops()
      .map(function (x) {
        return x.name;
      })
      .indexOf(stopNameSrv.getNearestName());
  }
});
