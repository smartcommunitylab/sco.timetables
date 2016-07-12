angular.module('viaggia.accessibility', ['ngAria'])

.controller('AccessibilityCtrl', function ($scope, $timeout) {
 
  $timeout(function () {
      console.log("content loaded");
      document.getElementsByClassName("tab-item-active")[0].setAttribute("role", "tab");
      document.getElementsByClassName("tab-item-active")[0].setAttribute("aria-label", "selezionato, i miei viaggi");
      document.getElementsByClassName("tab-title")[0].setAttribute("aria-label", "true");
   });
  
})

