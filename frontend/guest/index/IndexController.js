import { api } from "../../api"

import template from "./index.html?raw"

var module = angular.module("billett.guest")

module.config(function ($stateProvider) {
  $stateProvider.state("index", {
    url: "/",
    template,
    controller: "IndexController",
  })
})

module.controller(
  "IndexController",
  function (AuthService, Page, $http, $scope) {
    Page.setTitle("Arrangementer")

    $scope.has_role_admin = false
    AuthService.hasRole("billett.admin").then((res) => {
      $scope.has_role_admin = res
    })

    $http.get(api("event/get_upcoming")).then(function (response) {
      $scope.upcoming = response.data
    })

    $http.get(api("eventgroup")).then(function (response) {
      $scope.eventgroups = response.data
    })

    var categories = []
    $scope.categoryNum = function (category) {
      var i = categories.indexOf(category)
      if (i == -1) {
        i = categories.push(category) - 1
      }
      return i
    }
  },
)
