'use strict';

angular.module('prosperity')
    .directive('inventory', ['$rootScope', '$timeout', '$mdDialog', 'Player', 'Engine',
        function($rootScope, $timeout, $mdDialog, Player, Engine) {
            return {
                templateUrl: 'modules/prosperity/templates/inventory.html',
                restrict: 'E',
                scope: {
                    type: '@'
                },
                link: function postLink(scope, element) {
                    scope.sortOrder = "name"; //other values "quantity"
                    scope.sortByName = true;

                    scope.sortAsc = true;

                    function sortFn(a, b) {
                        var aobj = $rootScope.itemList[a.itemid];
                        var bobj = $rootScope.itemList[b.itemid];
                        if (aobj.sticky === undefined) {
                            aobj.sticky = false;
                        }
                        if (bobj.sticky === undefined) {
                            bobj.sticky = false;
                        }
                        var ret;
                        if (aobj.sticky === bobj.sticky) {
                            switch (scope.sortOrder) {
                                case 'name':
                                    var aname = aobj.name;
                                    var bname = bobj.name;
                                    if (aname > bname) {
                                        ret = 1;
                                    } else if (aname === bname) {
                                        ret = 0;
                                    } else if (aname < bname) {
                                        ret = -1;
                                    }
                                    break;
                                case 'quantity':
                                    if (a.amt > b.amt) {
                                        ret = 1;
                                    } else if (a.amt === b.amt) {
                                        ret = 0;
                                    } else if (a.amt < b.amt) {
                                        ret = -1;
                                    }
                                    break;
                            }
                            if (!scope.sortAsc) {
                                ret = -ret;
                            }
                            return ret;
                        } else {
                            return bobj.sticky - aobj.sticky;
                        }

                    }

                    function setup() {

                        if ($rootScope.player && $rootScope.world.home.foodStore && $rootScope.player.inventory) {
                            switch (scope.type) {
                                case 'granary':
                                    scope.inventory = $rootScope.world.home.foodStore;
                                    break;
                                case 'warehouse':
                                    scope.inventory = $rootScope.player.inventory;
                                    break;
                            }
                            scope.items = [];
                            angular.forEach(scope.inventory, function(amt, id) {
                                scope.items.push({
                                    itemid: id,
                                    amt: amt,
                                    sticky: ($rootScope.itemList[id].sticky ? true : false)
                                });
                            });
                            sortItems();

                            scope.$watchCollection('inventory', function(n, o) {
                                var reSort = false;
                                //between n and o, check what different
                                angular.forEach(n, function(amt, id) {
                                    if (o[id] !== amt) {
                                        var inserted = updateVal(id, amt);
                                        if (inserted || scope.sortOrder === "quantity") {
                                            reSort = true;
                                        }
                                    }
                                });

                                if (reSort) {
                                    sortItems();
                                }

                            });

                        } else {
                            $timeout(setup, 500);
                        }

                    }

                    function updateVal(id, amt) {
                        var inserted = false;
                        var obj = $rootScope.itemList[id];
                        var item = scope.items.find(function(item) {
                            return item.itemid === id;
                        });
                        if (!item) {
                            item = {
                                itemid: id,
                                amt: amt,
                                sticky: obj.stickied
                            }
                            scope.items.push(item);
                            inserted = true;
                        }

                        item.amt = amt;
                        return inserted;
                    }

                    function updateSticky(id, sticky) {
                        var item = scope.items.find(function(item) {
                            return item.itemid === id;
                        });
                        if (item) {
                            item.sticky = sticky;
                            sortItems();
                        }
                    }

                    function sortItems() {
                        scope.items.sort(sortFn);
                    }

                    scope.setSortOrder = function(type) {
                        if (scope.sortOrder != type) {
                            scope.sortOrder = type;
                            scope.sortByName = (type === "name" ? true : false);
                            scope.sortByAmt = (type === "quantity" ? true : false);
                            sortItems();
                        }
                    };

                    scope.setSortAsc = function(asc) {
                        if (scope.sortAsc != asc) {
                            scope.sortAsc = asc;
                            sortItems();
                        }
                    };

                    setup();
                }
            };
        }
    ]);
