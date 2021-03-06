angular.module('viaggia.services.bookmarks', [])

.factory('bookmarkService', function ($q, $rootScope, Config) {
  var repo = '';
  $rootScope.bookmarksListDirty = null;
  Config.init().then(function () {
    repo = Config.getAppId() + '_bookmarks';
  });

  var getStoredBookmarks = function () {
    var value = localStorage.getItem(repo);
    if (!value) {
      value = [];
    } else {
      value = JSON.parse(value);
    }
    $rootScope.bookmarks = value;
    return value;
  };
  var getDefaultBookmarks = function () {
    return [];
  };
  var getBookmarks = function () {
    if (!localStorage.getItem(repo)) {
      var defList = getDefaultBookmarks();
      defList.forEach(function (e) {
        e.home = true;
      });
      localStorage.setItem(repo, JSON.stringify(defList));
      $rootScope.bookmarks = defList;
    }

    return getStoredBookmarks();
  };

  /**
   * Custom template for specific bookmark type
   */
  $rootScope.getBookmarkItemTemplate = function (type) {
    switch (type) {
    case 'TRAINSTOP':
    case 'BUSSTOP':
    case 'BUSSUBURBANSTOP':
      {
        return 'templates/bm/stop.html';
      }
    case 'TRAIN':
    case 'BUS':
    case 'BUSSUBURBAN':
      {
        return 'templates/bm/line.html';
      }
    default:
      return 'templates/bm/default.html';
    }
  }

  return {
    /**
     * add bookmark to the list. Return promise of the update bookmark list
     */
    addBookmark: function (bm) {
      var deferred = $q.defer();

      var list = getBookmarks();
      bm.home = true;
      bm.removable = true;
      list.splice(0, 0, bm);
      localStorage.setItem(repo, JSON.stringify(list));
      $rootScope.bookmarks = list;
      deferred.resolve(list);

      Config.log('AppPersonalize', {
        action: 'add'
      });

      return deferred.promise;
    },
    /**
     * Return promise of current list of bookmarks with real time data.
     */
    getBookmarksRT: function () {
      var deferred = $q.defer();
      var list = getBookmarks();
      var filtered = [];
      list.forEach(function (b) {
        updateRT(b);
      });
      deferred.resolve(list);
      return deferred.promise;
    },
    /**
     * Return promise of current list of bookmarks. Initially, set to the list of predefined bookmarks from the configuration (cannot be removed permanently).
     */
    getBookmarks: function () {
      var deferred = $q.defer();
      deferred.resolve(getBookmarks());
      return deferred.promise;
    },
    /**
     * Return position of the bookmark with the specified path in the list.
     */
    indexOfBookmark: function (title) {
      var list = getBookmarks();
      for (var i = 0; i < list.length; i++) {
        // if (title == list[i].state) return i;
        delimiter = '/';
        start = 3;
        tokens = title.split(delimiter).slice(start);
        resultTitle = tokens.join(delimiter); //remove first part could be different and keep only the last part
        tokens = list[i].state.split(delimiter).slice(start);
        resultBookmarks = tokens.join(delimiter);
        if (resultTitle == resultBookmarks && (list[i].routeId == null || list[i].routeId == "")) return i;
      }
      return -1;
    },
    /**
     * Return position of the bookmark stop with the specified path in the list.
     */
    indexOfBookmarkStop: function (title, routeId) {
      var list = getBookmarks();
      for (var i = 0; i < list.length; i++) {
        if (title == list[i].label && routeId == list[i].routeId) return i;
        //        delimiter = '/',
        //          start = 3,
        //          tokens = title.split(delimiter).slice(start);
        //        resultTitle = tokens.join(delimiter); //remove first part could be different and keep only the last part
        //        tokens = list[i].state.split(delimiter).slice(start);
        //        resultBookmarks = tokens.join(delimiter);
        //        if (resultTitle == resultBookmarks && routeId == list[i].routeId) return i;
      }
      return -1;
    },
    /**
     * Remove the bookmark at the specified index from the list (if possible). Return promise of the update bookmark list
     */
    removeBookmark: function (idx) {
      var deferred = $q.defer();
      var list = getBookmarks();
      if (list.length > idx && list[idx].removable) {
        list.splice(idx, 1);
        localStorage.setItem(repo, JSON.stringify(list));
      }
      $rootScope.bookmarks = list;
      deferred.resolve(list);

      Config.log('AppPersonalize', {
        action: 'remove'
      });
      return deferred.promise;
    },
    /**
     * Change order of two bookmarks. Return promise of the update bookmark list
     */
    reorderBookmark: function (idxFrom, idxTo) {
      var deferred = $q.defer();

      var list = getBookmarks();
      var from = list[idxFrom];
      if (idxTo + 1 == list.length) {
        list.push(from); //add to from
      } else {
        list.splice(idxTo, 0, from); //add to from
      }
      if (idxFrom > idxTo) { //remove from
        list.splice(idxFrom + 1, 1);
      } else {
        list.splice(idxFrom, 1);
      }
      localStorage.setItem(repo, JSON.stringify(list));
      $rootScope.bookmarks = list;
      deferred.resolve(list);

      return deferred.promise;
    },
    /**
     * Return the style of the bookmark button for the element
     */
    getBookmarkStyle: function (bm) {
      return this.indexOfBookmark(bm) >= 0 ? 'ion-ios-star' : 'ion-ios-star-outline';
    },
    /**
     * Return the style of the bookmark button for the element
     */
    getBookmarkStyleStop: function (title, routeId) {
      return this.indexOfBookmarkStop(title, routeId) >= 0 ? 'ion-ios-star' : 'ion-ios-star-outline';
    },
    /**
     * Add/remove a bookmark for the element of the specified type, path, and title. Returns promise for the update style.
     */
    toggleBookmark: function (path, title, type, data, line, colorIn, id, routeId, isAStop) {
      var deferred = $q.defer();
      var color = null,
        icon = null;

      if (routeId) {
        if (isAStop) {
          var pos = this.indexOfBookmarkStop(title, routeId);
        } else {
          var pos = this.indexOfBookmarkStop(path, routeId);
        }
      } else {
        var pos = this.indexOfBookmark(path);
      }

      if (pos >= 0) {
        this.removeBookmark(pos).then(function () {
          deferred.resolve('ion-ios-star-outline');
        });
      } else {
        switch (type) {
        case 'TRAIN':
          {
            var ct = Config.getColorsTypes()[type];
            color = colorIn;
            icon = 'ic_train';
            break;
          }
        case 'BUS':
          {
            var ct = Config.getColorsTypes()[type];
            color = colorIn;
            icon = 'ic_urban-bus';
            break;
          }
        case 'BUSSUBURBAN':
          {
            var ct = Config.getColorsTypes()[type];
            color = colorIn;
            icon = 'ic_extraurban-bus';
            break;
          }
        case 'TRAINSTOP':
          {
            var ct = Config.getColorsTypes()['TRAIN'];
            color = colorIn;
            icon = 'ic_m_train';
            break;
          }
        case 'BUSSTOP':
          {
            var ct = Config.getColorsTypes()['BUS'];
            color = colorIn;
            icon = 'ic_m_urban_bus';
            break;
          }
        case 'BUSSUBURBANSTOP':
          {
            var ct = Config.getColorsTypes()['BUSSUBURBAN'];
            color = colorIn;
            icon = 'ic_m_extraurban_bus';
            break;
          }
        case 'TRANSIT':
          {
            var ct = Config.getColorsTypes()['TRANSIT'];
            color = colorIn;
            icon = 'ic_funivia';
            break;
          }
        case 'TRANSITSTOP':
          {
            var ct = Config.getColorsTypes()['TRANSIT'];
            color = colorIn;
            icon = 'ic_funivia';
            break;
          }
        }
        this.addBookmark({
          "state": path,
          "label": title,
          "line": line,
          "icon": icon,
          "color": color,
          "routeId": routeId,
          type: type,
          data: data,
          "id": id
        }).then(function () {
          deferred.resolve('ion-ios-star');
        });
      }
      return deferred.promise;
    }
  };
})

.service('stopNameSrv', function () {
  var names = [];
  var nearest;
  var idx;
  return {
    getName: function (index) {
      //console.log(names[index].name);
      return names[index].name;
    },
    getStop: function (index) {
      return names[index];
    },
    setName: function (value) {
      names = value;
    },
    setNameNearest: function (name) {
      nearest = name;
    },
    getNearestName: function () {
      return nearest;
    },
    getStops: function () {
      return names;
    },
    setIndex: function (i) {
      idx = i;
    },
    getIndex: function () {
      return idx;
    }
  }
});
