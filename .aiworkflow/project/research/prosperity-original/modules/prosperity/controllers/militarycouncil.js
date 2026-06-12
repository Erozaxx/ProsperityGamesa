angular.module('prosperity').controller('MilitarycouncilCtrl', ['$scope', '$rootScope', '$mdBottomSheet', '$timeout', 'Battle', 'Engine', 'Home', 'Player', 'World',
    function($scope, $rootScope, $mdBottomSheet, $timeout, Battle, Engine, Home, Player, World) {
        function init() {
            $scope.homeZone = $rootScope.itemList.homeZone;
            $scope.player = $rootScope.itemList.player;
            $scope.bum = $rootScope.itemList.bum;
            $scope.inventory = $rootScope.player.inventory;
            $scope.gold = $rootScope.player.gold;

            $scope.armory = {
                sword: $rootScope.player.inventory.sword || 0,
                armour: $rootScope.player.inventory.armour || 0,
                longbow: $rootScope.player.inventory.longbow || 0,
                quiver: $rootScope.player.inventory.quiver || 0
            }

            $rootScope.$watchCollection('player.inventory', function() {
                $scope.armory = {
                    sword: $rootScope.player.inventory.sword || 0,
                    armour: $rootScope.player.inventory.armour || 0,
                    longbow: $rootScope.player.inventory.longbow || 0,
                    quiver: $rootScope.player.inventory.quiver || 0
                }
            });


            $scope.zoneDetails = {
                zone: null
            };

            $rootScope.$watch('player.gold', function() {
                $scope.gold = $rootScope.player.gold;
            });

            $scope.deploymentModal = {
                fromZone: null,
                toZone: null,
                show: false,
                warriors: 0,
                archers: 0,
                pctWarrior: 0,
                pctArcher: 0,
                set: function() {
                    if ($scope.deploymentModal.fromZone.warriors < $scope.deploymentModal.warriors || $scope.deploymentModal.warriors < 0 || $scope.deploymentModal.fromZone.archers < $scope.deploymentModal.archers || $scope.deploymentModal.archers < 0) {
                        //do nothing.
                    } else {
                        if ($scope.deploymentModal.fromZone.warriors >= $scope.deploymentModal.warriors) {
                            $scope.deploymentModal.fromZone.warriors -= $scope.deploymentModal.warriors;
                            $scope.deploymentModal.toZone.warriors += $scope.deploymentModal.warriors;
                            $scope.deploymentModal.warriors = 0;
                        }

                        if ($scope.deploymentModal.fromZone.archers >= $scope.deploymentModal.archers) {
                            $scope.deploymentModal.fromZone.archers -= $scope.deploymentModal.archers;
                            $scope.deploymentModal.toZone.archers += $scope.deploymentModal.archers;
                            $scope.deploymentModal.archers = 0;
                        }

                        $scope.deploymentModal.cancel();
                    }

                },
                cancel: function() {
                    $scope.deploymentModal.warriors = 0;
                    $scope.deploymentModal.archers = 0;
                    $scope.deploymentModal.pctWarrior = 0;
                    $scope.deploymentModal.pctArcher = 0;
                    $scope.deploymentModal.show = false;

                },
                setAmtWarrior: function() {
                    if (!$scope.deploymentModal.warriors || $scope.deploymentModal.warriors < 0) {
                        $scope.deploymentModal.warriors = 0;
                    }
                    $scope.deploymentModal.warriors = Math.round($scope.deploymentModal.fromZone.warriors * $scope.deploymentModal.pctWarrior / 100);

                },

                setAmtArcher: function() {
                    if (!$scope.deploymentModal.archers || $scope.deploymentModal.archers < 0) {
                        $scope.deploymentModal.archers = 0;
                    }
                    $scope.deploymentModal.archers = Math.round($scope.deploymentModal.fromZone.archers * $scope.deploymentModal.pctArcher / 100);
                },

                setPctWarrior: function() {
                    $scope.deploymentModal.pctWarrior = $scope.deploymentModal.warriors / $scope.deploymentModal.fromZone.warriors * 100;
                },

                setPctArcher: function() {
                    $scope.deploymentModal.pctArcher = $scope.deploymentModal.archers / $scope.deploymentModal.fromZone.archers * 100;
                }

            }



            $rootScope.fns.updateTotalMilitaryUnits();


            $scope.invasionModal = {
                show: false,
                target: null,
                amount: 0,
                send: function() {
                    if (this.amount <= $scope.homeZone.deployed) {
                        $scope.homeZone.deployed -= this.amount;
                        var battle = Battle.create(this.target, {
                            liege: 'player',
                            deployed: this.amount,
                            battleBonus: $rootScope.player.battleBonus
                        });
                        Battle.start(battle);
                    }
                }
            }

            $scope.invasion = {
                warriors: 0,
                archers: 0,
                general: null
            }
            $scope.resetDeployToSelection = function() {
                angular.forEach($rootScope.zones, function(zone) {
                    if (zone.liege != 'player') {
                        delete zone.style["-webkit-filter"];
                        delete zone.style["filter"];
                    }
                });

                delete $rootScope.itemList[$scope.originatedZoneId].style["box-shadow"];
                $("#deploymentNotice").remove();
                $scope.originatedZoneId = null;
                $scope.selectZoneToDeployTo = false;
            }

            $scope.detail = function(zoneId) {

                Engine.stop();
                if ($scope.selectZoneToDeployTo) {
                    var zone = $rootScope.itemList[zoneId];

                    $scope.closeDetail();
                    if ($scope.originatedZoneId && zoneId != $scope.originatedZoneId && zone.liege == 'player') {
                        //good place to deploy to?
                        $scope.showDeploymentModal($scope.originatedZoneId, zoneId);

                        $scope.resetDeployToSelection();


                    } else {
                        //do nothing, wait for the user to select some place valid.
                    }

                } else {
                    $scope.cancelInvasion(); //remove any previous details about invasion
                    var zone = $rootScope.itemList[zoneId];
                    $scope.zoneDetails.zone = zone;
                    $scope.zoneDetails.display = true;
                    $scope.zoneDetails.zone.resourcesListed = $rootScope.fns.listGoods($scope.zoneDetails.zone.resources);
                    $scope.zoneliege = $rootScope.itemList[zone.liege];

                    //spy information
                    $scope.spy = $rootScope.itemList.player.spy;
                    $scope.spySuccessRate = $scope.spy.successRate - ($scope.zoneliege.cautious ? $scope.zoneliege.cautious * 0.1 : 0);
                    $scope.spyCost = ~~ ($scope.spy.baseDeployCost * Math.pow(1.2, $scope.spy.deployedTimes));
                    $scope.spyState = 0; //spy hasn't been sent yet
                    $scope.canSpy = true;

                    //deploy to elsewhere
                    $scope.canDeploy = false;

                    if (zone.warriors > 0 || zone.archers > 0) {
                        for (var i = 0; i < $rootScope.zones.length; i++) {
                            var z = $rootScope.zones[i];
                            if (z.id != 'homeZone' && z.liege == 'player') {
                                $scope.canDeploy = true;
                                break;
                            }
                        }
                    }

                    zone.canAttack = false;
                    //check if we can attack it (if it is neighbours with at least one vassal);

                    for (var i = 0; i < zone.neighbours.length; i++) {
                        var xzone = $rootScope.itemList[zone.neighbours[i]];
                        if (xzone.liege == 'player') {
                            zone.canAttack = true;
                        }
                    }
                }

            }

            $scope.closeDetail = function() {
                $scope.zoneDetails.zone = null;
                $scope.zoneDetails.display = false;
                $scope.zoneDetails.invade = false;
                $scope.zoneliege = null;
                Engine.start();
            }

            $scope.cancelInvasion = function() {
                $scope.zoneDetails.invade = false;
                $scope.invasion.general = null;
                $scope.invasion.warriors = 0;
                $scope.invasion.archers = 0;
            }

            $scope.setAmtWarrior = function() {
                $scope.invasion.warriors = Math.round($scope.homeZone.warriors * $scope.invasion.pctWarrior / 100);

            }

            $scope.setAmtArcher = function() {
                $scope.invasion.archers = Math.round($scope.homeZone.archers * $scope.invasion.pctArcher / 100);

            }

            $scope.setPctWarrior = function() {
                $scope.invasion.pctWarrior = $scope.invasion.warriors / $scope.homeZone.warriors * 100;
            }

            $scope.setPctArcher = function() {
                $scope.invasion.pctArcher = $scope.invasion.archers / $scope.homeZone.archers * 100;
            }

            $scope.sendInvasion = function() {
                //player is sending an invasion, lets make sure the stats are all good.

                if ($scope.invasion.warriors || $scope.invasion.archers) {
                    if ($scope.invasion.warriors <= $scope.homeZone.warriors) {
                        if ($scope.invasion.archers <= $scope.homeZone.archers) {
                            //create the invasion
                            $scope.homeZone.archers -= $scope.invasion.archers;
                            $scope.homeZone.warriors -= $scope.invasion.warriors;

                            var invasion = {
                                target: $scope.zoneDetails.zone,
                                liege: $rootScope.itemList.player,
                                warriors: {
                                    number: $scope.invasion.warriors,
                                    strength: $scope.player.warriors.strength,
                                    defense: $scope.player.warriors.defense
                                },
                                archers: {
                                    number: $scope.invasion.archers,
                                    strength: $scope.player.archers.strength,
                                    defense: $scope.player.archers.defense
                                },
                                action: 'Attacking', //Attacking or Defending
                            };

                            if($scope.zoneDetails.zone.liege == $scope.zoneDetails.zone.originalLiege){
                                //attacking a neutral town, favour - 80;

                                $rootScope.fns.increaseFavour($scope.zoneDetails.zone.id, 'player', -80);
                            }

                            //create the defense
                            var opponent = $scope.zoneliege;
                            var defense = {
                                liege: opponent,
                                warriors: {
                                    number: $scope.zoneDetails.zone.warriors,
                                    strength: opponent.warriors.strength,
                                    defense: opponent.warriors.defense
                                },
                                archers: {
                                    number: $scope.zoneDetails.zone.archers,
                                    strength: opponent.archers.strength,
                                    defense: opponent.archers.defense
                                },
                                action: 'Attacking', //Attacking or Defending

                            }


                            //create the battle through the service
                            Battle.create($scope.zoneDetails.zone, defense, invasion);

                            //close the invasion modal
                            $scope.closeDetail();
                        }
                    }

                }

            }

            $scope.showDeploymentModal = function(from, to) {
                $scope.deploymentModal.fromZone = $rootScope.itemList[from];
                $scope.deploymentModal.toZone = $rootScope.itemList[to];

                $scope.deploymentModal.show = true;
            }

            $scope.sendSpy = function(zone) {
                console.log($scope);
                console.log($scope.spyState);
                //success rate = spy success rate - (zone.liege.cautious.level * 0.1)
                if ($scope.spy && $scope.spySuccessRate && $scope.spyCost && ($scope.spyState == 3 || $scope.spyState == 0)) {
                    if (Player.canAfford({
                        gold: $scope.spyCost
                    })) {
                        Player.pay({
                            gold: $scope.spyCost
                        });
                        $scope.spyState = 2;
                        $timeout(function() {
                            if (Math.random() < $scope.spySuccessRate) {
                                //success
                                $scope.spy.deployedTimes++;
                                $scope.zoneDetails.zone.knownWarriorNum = $scope.zoneDetails.zone.warriors;
                                $scope.zoneDetails.zone.knownArcherNum = $scope.zoneDetails.zone.archers;
                                $scope.spyState = 4; // success, no point spying again
                            } else {
                                $scope.spyState = 3; //failure
                                $scope.spyCD = 10;
                                $scope.cdInt = $interval(function() {
                                    $scope.spyCD--;
                                    if ($scope.spyCD == 0) {
                                        $scope.spyState = 0;
                                        $interval.cancel($scope.spyCD);
                                    }
                                }, 1000);
                            }

                        }, 10000);
                    } else {
                        $scope.spyState = 5;
                    }
                }
            }

            $scope.deployTo = function(zoneid) {
                $scope.selectZoneToDeployTo = true;
                $scope.originatedZoneId = zoneid;
                angular.forEach($rootScope.zones, function(zone) {
                    if (zone.liege != 'player') {
                        zone.style["-webkit-filter"] = zone.style["filter"] = "blur(2px)";
                    }
                });

                $rootScope.itemList[zoneid].style["box-shadow"] = "0 0 13px yellow";


                var $notice = $("<div id='deploymentNotice'>Moving troops from " + $rootScope.itemList[zoneid].name + " to... </div>");

                var $resetDeploymentBtn = $("<a href='#' class='btn btn-danger'>Cancel</a>");

                $resetDeploymentBtn.on('click', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    $scope.resetDeployToSelection();
                });

                $notice.append($resetDeploymentBtn);

                $("#mapViewer").append($notice);

                $scope.closeDetail();
            }

            $scope.openMilitaryInfo = function($event) {
                Engine.stop();
                $mdBottomSheet.show({
                    templateUrl: '/modules/prosperity/templates/militaryInfo.html',
                    controller: 'MilitaryInfoCtrl',
                    targetEvent: $event,
                }).then(function() {
                    Engine.start();
                }, function() {
                    Engine.start();
                });
            }



            $timeout(function() {
                $("#theMap").css({
                    top: -204,
                    left: -729
                });
            }, 50);

        }

        function tryInit() {
            if ($rootScope.itemList) {
                init();
            } else {
                $timeout(init, 500);
            }
        }
        if (World.checkReady()) {
            Player.travel('militaryCouncil');

            var mapBorderWidth = 25;
            $("#theMap").draggable({
                cursor: "crosshair",
                drag: function(event, ui) {
                    if (!$scope.scale) {
                        $scope.scale = 1;
                    }
                    ui.position.left = Math.min(mapBorderWidth, ui.position.left);
                    ui.position.left = Math.max($("#mapViewer").width() - $("#theMap").width() - mapBorderWidth, ui.position.left);
                    ui.position.top = Math.min(mapBorderWidth, ui.position.top);
                    ui.position.top = Math.max($("#mapViewer").height() - $("#theMap").height() - mapBorderWidth, ui.position.top);
                }
            });

            $scope.$on('$destroy', function() {
                $("#theMap").draggable("disable");
            });



            tryInit();
        }


    }
]).controller('MilitaryInfoCtrl', ['$rootScope', '$scope', 'Player', '$mdBottomSheet', '$timeout',
    function($rootScope, $scope, Player, $mdBottomSheet, $timeout) {
        $scope.closeMilitaryInfo = function() {
            $mdBottomSheet.hide();
        }

        //recall Units
        $scope.recallUnits = function(){
            var homeZone = $rootScope.itemList.homeZone;
            angular.forEach($rootScope.zones, function(zone, id){
                if(zone.liege == 'player' && zone.id != 'homeZone'){
                    homeZone.warriors += zone.warriors;
                    zone.warriors = 0;
                    homeZone.archers += zone.archers;
                    zone.archers = 0;
                }
            });
        }

        //Training stuff
        $scope.numWarriorsToTrain = 0;
        $scope.numArchersToTrain = 0;
        var inv = $rootScope.player.inventory;
        
        $scope.updateInv = function(){
            $scope.inv = {
                longbow: inv.longbow || 0,
                quiver: inv.quiver || 0,
                sword: inv.sword || 0,
                armour: inv.armour || 0
            }
        }
        $scope.updateInv();
        $scope.updateTrainingBill = function() {
            $scope.trainingBill = {
                gold: 0,
                longbow: 0,
                quiver: 0,
                sword: 0,
                armour: 0
            };
            $scope.canAffordTrainingBill = false;
            if ($scope.numWarriorsToTrain >= 0 && $scope.numArchersToTrain >= 0) {

                $rootScope.fns.updateTotalMilitaryUnits();

                var costOfWarriors = {};
                if ($scope.numWarriorsToTrain > 0) {
                    //costOfWarriors = $rootScope.fns.calcBulkUnitCost($scope.numWarriorsToTrain, 'warrior');
                    costOfWarriors = {
                        sword: $scope.numWarriorsToTrain,
                        armour: $scope.numWarriorsToTrain,
                        gold: $scope.numWarriorsToTrain * $rootScope.GOLDCOSTPERWARRIOR
                    };
                }

                var costOfArchers = {};
                if ($scope.numArchersToTrain > 0) {
                    //costOfArchers = $rootScope.fns.calcBulkUnitCost($scope.numArchersToTrain, 'archer');
                    costOfArchers = {
                        longbow: $scope.numArchersToTrain,
                        quiver: $scope.numArchersToTrain,
                        gold: $scope.numArchersToTrain * $rootScope.GOLDCOSTPERARCHER
                    };
                }

                angular.forEach(costOfWarriors, function(amt, itemid) {
                    $scope.trainingBill[itemid] += amt;
                });

                angular.forEach(costOfArchers, function(amt, itemid) {
                    $scope.trainingBill[itemid] += amt;
                });

                console.log($scope.trainingBill);
                //prune the training bill
                var items = Object.keys($scope.trainingBill);
                for (var i = 0; i < items; i++) {
                    if ($scope.trainingBill[i] <= 0) {
                        delete $scope.trainingBill[i];
                    }
                }
                $scope.canAffordTrainingBill = Player.canAfford($scope.trainingBill);

                $scope.trainingBillItems = $rootScope.fns.listGoods($scope.trainingBill);
            }
        };

        $scope.trainAll = function() {
            if (Player.canAfford($scope.trainingBill)) {
                Player.pay($scope.trainingBill);

                $rootScope.itemList.homeZone.warriors += $scope.numWarriorsToTrain;
                $rootScope.itemList.homeZone.archers += $scope.numArchersToTrain;

                $scope.numWarriorsToTrain = 0;
                $scope.numArchersToTrain = 0;
                $scope.updateTrainingBill();
                $scope.updateInv();
            }
        }
    }
])