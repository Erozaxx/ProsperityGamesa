'use strict';

angular.module('prosperity')
    .directive('battleMap', ['$rootScope', '$timeout', '$interval', 'Battle', 'Player', 'Engine',

        function($rootScope, $timeout, $interval, Battle, Player, Engine) {
            return {
                templateUrl: 'modules/prosperity/templates/battleMap.html',
                restrict: 'E',
                link: function postLink(scope, element, attrs) {

                    var mousedown = false;
                    var origCoords = [];
                    var touched = false;

                    $('#theMap').mousemove(function(e) {
                        if (mousedown) {
                            var deltaX = e.pageX - origCoords[0];
                            var deltaY = e.pageY - origCoords[1];
                            $('#mapViewer').scrollTop($('#mapViewer').scrollTop() - deltaY);
                            $('#mapViewer').scrollLeft($('#mapViewer').scrollLeft() - deltaX);
                            origCoords = [e.pageX, e.pageY];
                        }

                    });

                    $('#theMap').mousedown(function(e) {
                        mousedown = true;
                        origCoords = [e.pageX, e.pageY];
                    });

                    $('#theMap').mouseup(function(e) {
                        mousedown = false;
                        origCoords = [];
                    });

                    $('#theMap').mouseout(function(e) {
                        mousedown = false;
                        origCoords = [];
                    })

                    $rootScope.$watch('configged', function() {
                        if ($rootScope.configged) {

                            scope.homeZone = $rootScope.itemList.homeZone;
                            scope.player = $rootScope.itemList.player;
                            scope.bum = $rootScope.itemList.bum;
                            scope.inventory = $rootScope.player.inventory;
                            scope.gold = $rootScope.player.gold;

                            scope.armory = {
                                sword: $rootScope.player.inventory.sword || 0,
                                armour: $rootScope.player.inventory.armour || 0,
                                longbow: $rootScope.player.inventory.longbow || 0,
                            }

                            $rootScope.$watchCollection('player.inventory', function() {
                                scope.armory = {
                                    sword: $rootScope.player.inventory.sword || 0,
                                    armour: $rootScope.player.inventory.armour || 0,
                                    longbow: $rootScope.player.inventory.longbow || 0,
                                }
                            });

                            scope.zoneDetails = {
                                zone: null
                            };

                            $rootScope.$watch('player.gold', function() {
                                scope.gold = $rootScope.player.gold;
                            });

                            scope.displayMap = function() {
                                scope.showMap = true;
                                $timeout(function() {
                                    $('#mapViewer').scrollTop(100);
                                    $('#mapViewer').scrollLeft(800);
                                }, 50);
                            }
                            scope.hideMap = function() {
                                scope.showMap = false;
                            }

                            scope.reduceDeployed = function(zone, type) {
                                if (zone[type] > 0) {
                                    zone[type]--;
                                    scope.homeZone[type]++;
                                }
                            }

                            scope.increaseDeployed = function(zone, type) {
                                if (scope.homeZone[type] > 0) {
                                    zone[type]++;
                                    scope.homeZone[type]--;
                                }
                            }

                            scope.deploymentModal = {
                                zone: null,
                                show: false,
                                increaseDeployed: 0,
                                amount: 0,
                                set: function() {
                                    var self = this;
                                    if (self.increaseDeployed) {
                                        if (scope.homeZone.deployed >= self.amount) {
                                            self.zone.deployed += self.amount;
                                            scope.homeZone.deployed -= self.amount;
                                            scope.deploymentModal.show = false;
                                        }
                                    } else {
                                        if (self.zone.deployed <= self.amount) {
                                            self.zone.deployed -= self.amount;
                                            scope.homeZone.deployed += self.amount;
                                            scope.deploymentModal.show = false;
                                        }
                                    }
                                }
                            }

                            scope.addWarrior = function(amount) {
                                if (!amount) {
                                    amount = 1;
                                }
                                var self = this;
                                var cost = {
                                    'gold': 256,
                                    'sword': 1,
                                    'armour': 1
                                };

                                angular.forEach(cost, function(amt, key) {
                                    cost[key] *= amount;
                                });

                                if (Player.canAfford(cost) && (scope.homeZone.archers + scope.homeZone.warriors + amount <= scope.homeZone.maxunits)) {
                                    Player.pay(cost);
                                    scope.homeZone.warriors += amount;
                                }
                            }

                            scope.addArcher = function(amount) {
                                if (!amount) {
                                    amount = 1;
                                }
                                var self = this;
                                var cost = {
                                    'longbow': 1,
                                    'quiver': 3,
                                    'gold': 512
                                };

                                angular.forEach(cost, function(amt, key) {
                                    cost[key] *= amount;
                                });

                                if (Player.canAfford(cost) && (scope.homeZone.archers + scope.homeZone.warriors + amount <= scope.homeZone.maxunits)) {
                                    Player.pay(cost);
                                    scope.homeZone.archers += amount;
                                }
                            }

                            scope.removeWarrior = function(amount) {
                                if (!amount) {
                                    amount = 1;
                                }
                                var self = this;
                                if (scope.homeZone.warriors >= amount) {
                                    scope.homeZone.warriors -= amount;
                                    //return equipment
                                    player.insertInventory({
                                        sword: $rootScope.randRound(amount * 2 / 3),
                                        armour: $rootScope.randRound(amount * 2 / 3)
                                    });
                                }
                            }

                            scope.trainWarrior = function() {
                                this.addWarrior(1);
                            }

                            scope.trainArcher = function() {
                                this.addArcher(1);
                            }

                            scope.retireWarrior = function() {
                                this.removeWarrior(1);
                            }

                            scope.retireArcher = function() {
                                this.removeArcher(1);
                            }

                            scope.invasionModal = {
                                show: false,
                                target: null,
                                amount: 0,
                                send: function() {
                                    if (this.amount <= scope.homeZone.deployed) {
                                        scope.homeZone.deployed -= this.amount;
                                        var battle = Battle.create(this.target, {
                                            liege: 'player',
                                            deployed: this.amount,
                                            battleBonus: $rootScope.player.battleBonus
                                        });
                                        Battle.start(battle);
                                    }
                                }
                            }

                            scope.invasion = {
                                warriors: 0,
                                archers: 0,
                                general: null
                            }

                            scope.detail = function(zoneId) {

                                scope.cancelInvasion(); //remove any previous details about invasion
                                var zone = $rootScope.itemList[zoneId];
                                scope.zoneDetails.zone = zone;
                                scope.zoneDetails.display = true;
                                scope.zoneliege = $rootScope.itemList[zone.liege];
                                console.log(zone.liege);
                                console.log(scope.zoneliege);


                                //spy information
                                scope.spy = $rootScope.itemList.player.spy;
                                scope.spySuccessRate = scope.spy.successRate - (scope.zoneliege.cautious ? scope.zoneliege.cautious * 0.1 : 0);
                                scope.spyCost = ~~ (scope.spy.baseDeployCost * Math.pow(1.2, scope.spy.deployedTimes));
                                scope.spyState = 0; //spy hasn't been sent yet
                                scope.canSpy = true;


                                zone.canAttack = false;
                                //check if we can attack it (if it is neighbours with at least one vassal);

                                for (var i = 0; i < zone.neighbours.length; i++) {
                                    var xzone = $rootScope.itemList[zone.neighbours[i]];
                                    if (xzone.liege == 'player') {
                                        zone.canAttack = true;
                                    }
                                }
                                Engine.stop();
                            }

                            scope.closeDetail = function() {
                                scope.zoneDetails.zone = null;
                                scope.zoneDetails.display = false;
                                scope.zoneDetails.invade = false;
                                scope.zoneliege = null;
                                Engine.start();
                            }

                            scope.cancelInvasion = function() {
                                scope.zoneDetails.invade = false;
                                scope.invasion.general = null;
                                scope.invasion.warriors = 0;
                                scope.invasion.archers = 0;
                            }

                            scope.sendInvasion = function() {
                                //player is sending an invasion, lets make sure the stats are all good.

                                if (scope.invasion.warriors || scope.invasion.archers) {
                                    if (scope.invasion.warriors <= scope.homeZone.warriors) {
                                        if (scope.invasion.archers <= scope.homeZone.archers) {
                                            //create the invasion
                                            scope.homeZone.archers -= scope.invasion.archers;
                                            scope.homeZone.warriors -= scope.invasion.warriors;

                                            var invasion = {
                                                target: scope.zoneDetails.zone,
                                                liege: $rootScope.itemList.player,
                                                warriors: {
                                                    number: scope.invasion.warriors,
                                                    strength: scope.player.warriors.strength,
                                                    defense: scope.player.warriors.defense
                                                },
                                                archers: {
                                                    number: scope.invasion.archers,
                                                    strength: scope.player.archers.strength,
                                                    defense: scope.player.archers.defense
                                                },
                                                action: 'Attacking', //Attacking or Defending
                                            };

                                            //create the defense
                                            var opponent = scope.zoneliege;
                                            var defense = {
                                                liege: opponent,
                                                warriors: {
                                                    number: scope.zoneDetails.zone.warriors,
                                                    strength: opponent.warriors.strength,
                                                    defense: opponent.warriors.defense
                                                },
                                                archers: {
                                                    number: scope.zoneDetails.zone.archers,
                                                    strength: opponent.archers.strength,
                                                    defense: opponent.archers.defense
                                                },
                                                action: 'Attacking', //Attacking or Defending

                                            }


                                            //create the battle through the service
                                            Battle.create(scope.zoneDetails.zone, defense, invasion);

                                            //close the invasion modal
                                            scope.closeDetail();
                                        }
                                    }

                                }

                            }

                            scope.sendSpy = function(zone) {
                                console.log(scope);
                                console.log(scope.spyState);
                                //success rate = spy success rate - (zone.liege.cautious.level * 0.1)
                                if (scope.spy && scope.spySuccessRate && scope.spyCost && (scope.spyState == 3 || scope.spyState == 0)) {
                                    if (Player.canAfford({
                                        gold: scope.spyCost
                                    })) {
                                        Player.pay({
                                            gold: scope.spyCost
                                        });
                                        scope.spyState = 2;
                                        $timeout(function() {
                                            if (Math.random() < scope.spySuccessRate) {
                                                //success
                                                scope.spy.deployedTimes++;
                                                scope.zoneDetails.zone.knownWarriorNum = scope.zoneDetails.zone.warriors;
                                                scope.zoneDetails.zone.knownArcherNum = scope.zoneDetails.zone.archers;
                                                scope.spyState = 4; // success, no point spying again
                                            } else {
                                                scope.spyState = 3; //failure
                                                scope.spyCD = 10;
                                                scope.cdInt = $interval(function() {
                                                    scope.spyCD--;
                                                    if (scope.spyCD == 0) {
                                                        scope.spyState = 0;
                                                        $interval.cancel(scope.spyCD);
                                                    }
                                                }, 1000);
                                            }

                                        }, 10000);
                                    } else {
                                        scope.spyState = 5;
                                    }
                                }
                            }
                        }
                    });
                }
            };
        }
    ]);