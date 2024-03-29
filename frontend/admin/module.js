import angular from "angular"

import auth from "../auth"
import common from "../common"

var module = angular.module("billett.admin", [
  "angularFileUpload",
  auth,
  common,
  "ngResource",
  "ui.router",
  "ui.bootstrap.modal",
  "ui.bootstrap.typeahead",
  "ui.bootstrap.tpls",
  "ui.unique",
  "ng-sortable",
  "focusOn",
])

module.run(function ($modalStack, $rootScope) {
  // make sure modals close on state change
  $rootScope.$on("$stateChangeSuccess", function () {
    var topModal = $modalStack.getTop()
    while (topModal) {
      $modalStack.dismiss(topModal.key, "$locationChangeSuccess")
      topModal = $modalStack.getTop()
    }
  })
})
