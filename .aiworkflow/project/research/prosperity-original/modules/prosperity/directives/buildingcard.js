'use strict';

angular.module('prosperity')
    .directive('buildingCard', ['$rootScope', 'Home', 'Player', 'Item', '$timeout', '$mdDialog',
        function($rootScope, Home, Player, Item, $timeout, $mdDialog) {
            return {
                templateUrl: 'modules/prosperity/templates/buildingCard.html',
                restrict: 'E',
                scope: {
                    buildingid: '@'
                },
                link: function postLink(scope, element) {

                    scope.showDescription = false;
                    scope.showCost = true;

                    function init() {
                        scope.building = $rootScope.itemList[scope.buildingid];
                        scope.building.maxxed = scope.building.max && (scope.building.created >= scope.building.max);
                        if (scope.building.citySpace) {
                            scope.building.spaceType = 'citySpace';
                        } else if (scope.building.fieldSpace) {
                            scope.building.spaceType = 'fieldSpace';
                        } else if (scope.building.forestSpace) {
                            scope.building.spaceType = 'forestSpace';
                        } else if (scope.building.mineSpace) {
                            scope.building.spaceType = 'mineSpace';
                        } else if (scope.building.riverSpace) {
                            scope.building.spaceType = 'riverSpace';
                        } else if (scope.building.otherSpace) {
                            scope.building.spaceType = 'otherSpace';
                        }

                        scope.spaceUsed = 0;

                        scope.updateCostDetail = function() {
                            if ($rootScope.engine.state) {
                                scope.area = $rootScope.area;
                                scope.spaceUsed = $rootScope.fns.calcSpaceUsed(scope.building.spaceType);
                                scope.spaceAvailable = Math.round($rootScope.area[scope.building.spaceType] - scope.spaceUsed);
                                if (!scope.building) {
                                    console.log('buliding not available: ',scope.buildingid);
                                } else {
                                    if (Player.canAfford(scope.building.cost)) {
                                        //can we actually afford the space?
                                        if (scope.spaceAvailable >= scope.building[scope.building.spaceType]) {
                                            scope.building.canAfford = true;
                                        } else {
                                            scope.building.canAfford = false;
                                        }
                                    } else {
                                        scope.building.canAfford = false;
                                    }

                                    scope.costDetail = "";
                                    var costArr = [];
                                    angular.forEach(scope.building.cost, function(amount, itemid) {
                                        var item = $rootScope.itemList[itemid];
                                        var p = Player.count(itemid);
                                        var notEnough = (p < amount);

                                        if (itemid == 'gold') {
                                            amount = $rootScope.fns.convertToCurrency(amount, true);
                                            p = $rootScope.fns.convertToCurrency(p, true);
                                        }
                                        var s = item.name + ": " + amount + " <span class='" + (notEnough ? 'text-danger' : 'text-success') + "'>[" + p + "]</span>";

                                        costArr.push(s);

                                    });

                                    var notEnough = (scope.spaceAvailable < scope.building[scope.building.spaceType]);
                                    costArr.push($rootScope.itemList[scope.building.spaceType].name + ": " + scope.building[scope.building.spaceType] + " <span class='" + (notEnough ? 'text-danger' : 'text-success') + "'>[" + scope.spaceAvailable + "]</span>");

                                    scope.costDetail = costArr.join("<br>");

                                    scope.effectsDetail = $rootScope.fns.parseEffects(scope.building.effects).join("<br>");
                                }
                            }
                            scope.timeout = $timeout(scope.updateCostDetail, 2000);

                        }
                        scope.build = function() {

                            var home = $rootScope.world.home;
                            if (Player.canAfford(scope.building.cost) && home.projectQueue.length < home.mason.maxProjectQueue * home.mason.number) {
                                Player.pay(scope.building.cost);
                                //scope.building.inProgress = true;
                                home.projectQueue.push({
                                    id: (new Date()).getTime(),
                                    buildingId: scope.building.id,
                                    curProgress: 0,
                                    maxProgress: scope.building.maxProgress,
                                    builders: scope.building.builders || 0,
                                    removable: true,
                                    progressPct: 0,
                                    buildersWorking: 0,
                                    cost: scope.building.cost
                                });
                                scope.countInQueue();
                            }
                        }

                        scope.destroy = function() {
                            var destroyed = false;
                            for (var i in $rootScope.world.home.projectQueue) {
                                var project = $rootScope.world.home.projectQueue[i];
                                if (project.buildingId == scope.building.id && project.type != 'repair' && !destroyed) {
                                    Player.insertInventory(scope.building.cost);
                                    $rootScope.world.home.projectQueue.splice(i, 1);
                                    destroyed = true;
                                }
                            }

                            if (scope.building.created > 0 && !destroyed) {

                                scope.building.verifyDestruction = true; //verify if player actually wants to destroy this.

                            }
                            scope.building.maxDestroy = scope.building.created;
                            scope.building.destroyAmt = 1;
                            scope.countInQueue();
                        }

                        scope.$watch('building.destroyAmt', function() {
                            if (scope.building.destroyAmt) {
                                if (scope.building.destroyAmt < 1) {
                                    scope.building.destroyAmt = 1;
                                } else if (scope.building.destroyAmt > scope.building.maxDestroy) {
                                    scope.building.destroyAmt = scope.building.maxDestroy;
                                }
                            }
                        });

                        scope.confirmDestruction = function() {
                            if (scope.building.destroyAmt <= scope.building.maxDestroy) {
                                scope.building.verifyDestruction = false;
                                for (var i = 0; i < scope.building.destroyAmt; i++) {
                                    Home.destroy(scope.building.id);
                                }

                            }

                        };

                        scope.cancelDestruction = function() {
                            scope.building.verifyDestruction = false;
                        }

                        scope.countInQueue = function() {
                            scope.building.inQueue = 0;
                            angular.forEach($rootScope.world.home.projectQueue, function(project) {
                                if (project.buildingId == scope.building.id) {
                                    scope.building.inQueue++;
                                }
                            });
                        };

                        scope.playerCount = function(itemid) {
                            return Player.count(itemid);
                        }

                        scope.activate = function(panel) {
                            if (panel == 'cost') {
                                $(element).find("[data-t='cost']").addClass("active");
                                $(element).find("[data-id='cost']").removeClass("hide");
                                $(element).find("[data-t='description']").removeClass("active");
                                $(element).find("[data-id='description']").addClass("hide");
                                $(element).find("[data-t='effects']").removeClass("active");
                                $(element).find("[data-id='effects']").addClass("hide");
                            } else if (panel == 'description') {
                                $(element).find("[data-t='cost']").removeClass("active");
                                $(element).find("[data-id='cost']").addClass("hide");
                                $(element).find("[data-t='description']").addClass("active");
                                $(element).find("[data-id='description']").removeClass("hide");
                                $(element).find("[data-t='effects']").removeClass("active");
                                $(element).find("[data-id='effects']").addClass("hide");
                            } else if (panel == 'effects') {
                                $(element).find("[data-t='cost']").removeClass("active");
                                $(element).find("[data-id='cost']").addClass("hide");
                                $(element).find("[data-t='description']").removeClass("active");
                                $(element).find("[data-id='description']").addClass("hide");
                                $(element).find("[data-t='effects']").addClass("active");
                                $(element).find("[data-id='effects']").removeClass("hide");

                            }
                        }

                        scope.detailInstances = function(ev) {
                            $mdDialog.show({
                                controller: function($scope, $rootScope, $mdDialog) {
                                    $scope.closeDetailInstance = function() {
                                        $mdDialog.hide();
                                    }
                                },
                                templateUrl: '/modules/prosperity/templates/buildingInstances.html',
                                scope: scope,
                                preserveScope: true,
                                targetEvent: ev

                            });
                        }

                        if (scope.building.attachments) {
                            scope._attachments = [];
                            for (var i in scope.building.attachments) {
                                scope._attachments.push($rootScope.itemList[scope.building.attachments[i]]);
                            }
                        }


                        scope.updateCostDetail();
                    }
                    if (scope.buildingid && $rootScope.configged) {
                        init();

                    } else {
                        console.log('rootScope is not configged');
                        console.log(scope.buildingid + ', does not exist?');
                    }


                    scope.showDescription = true; //default show description
                    element.on('$destroy', function() {
                        $timeout.cancel(scope.timeout); //destroys the tiemout
                    });
                }
            };
        }
    ]);
