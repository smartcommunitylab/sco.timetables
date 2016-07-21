angular.module('viaggia.services.shareVariablesSrv',[])

.service("ShareVariablesSrv", function () {
    var show;
    var stops = [];
    return {
        setShow: function (s) {
            show = s;
        },
        getShow: function () {
            return show;
        },
        setStops: function (st) {
            stops = st;
        },
        getStops:function(){
            return stops;
        },
        getStop: function (i) {
            return stops[i];
        }
    }
})