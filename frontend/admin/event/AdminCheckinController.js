import { api } from "../../api"

var module = angular.module("billett.admin")

module.controller(
  "AdminCheckinController",
  function (AdminEvent, AdminOrder, Page, $http, $stateParams, $scope) {
    var ctrl = this

    /*
     * Initialize data
     */
    ctrl.tickets = null
    ctrl.orders = null
    var ticketLinks = {}
    var loader = Page.setLoading()
    resetSearchInput()
    loadEvent(true)

    Page.setTitle("Innsjekking av billetter")

    /*
     * Export functions to view
     */
    ctrl.checkin = function (ticket) {
      performCheckin(ticket, true)
      $("#keyfield").select()
    }
    ctrl.checkout = function (ticket) {
      ctrl.keyok = null
      ctrl.keyticket = null
      performCheckin(ticket, false)
      $("#keyfield").select()
    }
    ctrl.loadTickets = function () {
      loadTickets()
      $("#keyfield").select()
    }
    ctrl.performSearch = function () {
      $("#keyfield").select()
    }

    /*
     * Watch changes to variables in view
     */
    $scope.$watchCollection("ctrl.searchinput", function (oldVal, newVal) {
      if (oldVal.page == newVal.page && newVal.page != 1) {
        ctrl.searchinput.page = 1
        return
      }

      if (ctrl.event) searchForOrders()
      if (ctrl.keysearch) {
        $("#keyfield").select()
      }
    })

    /**
     * Load more data when event is loaded first time
     */
    function eventLoadedFirstTimeEvent() {
      loadTickets()
      loadLastUsedTickets()
    }

    /**
     * Load event
     * @param bool isFirstRun
     */
    function loadEvent(isFirstRun) {
      AdminEvent.get(
        { id: $stateParams["id"], checkin: true },
        function (ret) {
          ctrl.event = ret

          if (isFirstRun) {
            loader()
            eventLoadedFirstTimeEvent()
          }
        },
        function () {
          if (isFirstRun) {
            loader()
          }
          Page.set404()
        },
      )
    }

    /**
     * Perform a search of orders
     */
    function searchForOrders() {
      resetTicketsList()
      ctrl.keysearch = null

      var filter = generateSearchFilter()
      if (filter == "") {
        if (!ctrl.ticketsLoading) loadTickets()
        return
      }

      ctrl.ordersLoading = true

      var limit = 6
      var q = {
        order: "-time",
        with: "tickets.event,tickets.ticketgroup,payments",
        limit: limit,
        offset: limit * (ctrl.searchinput.page - 1),
        filter: filter,
      }

      AdminOrder.query(q, function (res) {
        ctrl.orders = parseOrdersList(res)
        delete ctrl.ordersLoading
        checkKeySearch()
      })
    }

    /**
     * Parse order list returned from server
     * @param   array  List of orders
     * @returns array  List of orders
     */
    function parseOrdersList(list) {
      ticketLinks = {}
      list.result.forEach(function (order) {
        order.total_valid = 0
        order.total_reserved = 0
        order.tickets.forEach(function (ticket) {
          ticketLinks[ticket.id] = ticket

          if (ticket.is_revoked) return
          order[ticket.is_valid ? "total_valid" : "total_reserved"] +=
            ticket.ticketgroup.price + ticket.ticketgroup.fee
        })
      })

      return list
    }

    /**
     * Automatically checkin if possible
     */
    function checkKeySearch() {
      // TODO
      return
      ctrl.keyok = null
      ctrl.keyticket = null

      if (ctrl.keysearch && !ctrl.keysearchlast == ctrl.keysearch) {
        ctrl.keysearchlast = ctrl.keysearch
        ctrl.orders.result.forEach(function (order) {
          order.tickets.forEach(function (ticket) {
            if (ctrl.keysearch == ticket.key) {
              ctrl.keyok = ticket.is_valid && !ticket.is_revoked && !ticket.used
              ctrl.keyticket = ticket

              if (ctrl.keyok) {
                ctrl.checkin(ticket.id)
              }
            }
          })
        })
      }
    }

    /**
     * Generate filter string for quering for orders
     * @returns string
     */
    function generateSearchFilter() {
      var r = []
      if (ctrl.searchinput.name) {
        if (/^\d{6}$/.test(ctrl.searchinput.name)) {
          ctrl.keysearch = ctrl.searchinput.name
          r.push("tickets.key=" + ctrl.searchinput.name)
        } else {
          r.push("name:like:" + ctrl.searchinput.name + "%")
        }
      }

      if (ctrl.searchinput.id) {
        var x = ctrl.searchinput.id.length > 8 ? "order_text_id" : "id"
        r.push(x + "=" + ctrl.searchinput.id)
      }

      ;["email", "phone"].forEach(function (x) {
        if (ctrl.searchinput[x]) {
          r.push(x + ":like:" + ctrl.searchinput[x] + "%")
        }
      })

      return r.join(",")
    }

    function resetSearchInput() {
      ctrl.keysearch = null
      ctrl.keysearchlast = null
      ctrl.keyok = null
      ctrl.keyticket = null

      if (!ctrl.searchinput) {
        ctrl.searchinput = {
          page: 1,
        }
      } else {
        angular.forEach(ctrl.searchinput, function (val, key) {
          ctrl.searchinput[key] = ""
        })
        ctrl.searchinput.page = 1
      }
    }

    /**
     * Reset orders searching
     */
    function resetOrdersList() {
      ctrl.orders = null
      delete ctrl.ordersLoading
      resetSearchInput()
    }

    /**
     * Reset tickets listing
     */
    function resetTicketsList() {
      ctrl.tickets = null
      delete ctrl.ticketsLoading
    }

    function loadTickets() {
      ctrl.ticketsLoading = true
      resetOrdersList()

      $http
        .get(api("ticket"), {
          params: {
            filter: "event_id=" + ctrl.event.id,
            order: "-time",
            with: "order,ticketgroup",
          },
        })
        .then(function (response) {
          ctrl.tickets = parseTicketsList(response.data)
          delete ctrl.ticketsLoading
        })
        .catch(function () {
          alert("Ukjent feil ved lasting av billetter.")
        })
    }

    /**
     * Parse ticket list returned from server
     * @param   array  List of tickets returned
     * @returns array  List of orders containing only returned tickets
     */
    function parseTicketsList(list) {
      var orders = []
      var orders_link = {}
      ticketLinks = {}

      list.forEach(function (row) {
        ticketLinks[row.id] = row
        if (row.order.id in orders_link) {
          orders_link[row.order.id].tickets.push(row)
        } else {
          var order = row.order
          orders_link[order.id] = order
          orders.push(order)

          order.tickets = [row]
        }
      })

      return orders
    }

    /**
     * Load/reload last used tickets list
     */
    function loadLastUsedTickets() {
      ctrl.lastUsedTicketsLoading = true
      $http
        .get(api("ticket"), {
          params: {
            filter: "event_id=" + ctrl.event.id + ",used:NOTNULL",
            limit: 10,
            order: "-used",
            with: "order,ticketgroup",
          },
        })
        .then(function (response) {
          const ret = response.data
          delete ctrl.lastUsedTicketsLoading
          ctrl.lastUsedTickets = ret.result
        })
        .catch(function () {
          alert("Ukjent feil ved lasting av siste innsjekkede billetter")
        })
    }

    /**
     * Respond to changes to tickets
     */
    function ticketsChangedEvent(ticket) {
      // event checkin information will be changed, reload it
      loadEvent()

      // list of last checked in tickets are probably changed, reload it
      loadLastUsedTickets()
    }

    /**
     * Run a checkin/checkout call
     */
    function performCheckin(ticket, isCheckin) {
      ticket.isWorking = true
      return $http
        .post(
          api(
            "ticket/" + ticket.id + "/" + (isCheckin ? "checkin" : "checkout"),
          ),
        )
        .then(function (response) {
          const newTicket = response.data
          delete ticket.isWorking
          newTicket.event = ticket.event
          newTicket.ticketgroup = ticket.ticketgroup
          ticket = ticketLinks[ticket.id] || ticket
          angular.copy(newTicket, ticket)
          ticketsChangedEvent(ticket)
        })
        .catch(function () {
          delete ticket.isWorking
        })
    }
  },
)
