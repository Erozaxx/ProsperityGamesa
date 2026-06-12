'use strict';

angular.module('prosperity')
    .service('Forest', ['$rootScope', 'Engine',
        function Forest($rootScope, Engine) {


            // AngularJS will instantiate a singleton by calling "new" on this function
            function getText(num) {
                var order = Math.floor(Math.log(num) / Math.log(10));
                if (order < 2) {
                    return 'Less than 100';
                } else if (order === 2) {
                    return 'Hundreds';
                } else if (order === 3) {
                    return 'Thousands';
                } else if (order === 4) {
                    return 'Tens of Thousands';
                } else if (order >= 5) {
                    return 'Way too many';
                }
            }

            var forest = {
                decreaseAnimals: function(amt) {
                    if ($rootScope.world.forest.curAnimals >= amt) {
                        $rootScope.world.forest.curAnimals -= amt;
                    } else {
                        $rootScope.world.forest.curAnimals = 0;
                    }
                },
                increaseAnimals: function(amt) {
                    $rootScope.world.forest.curAnimals += amt;
                    if ($rootScope.world.forest.curAnimals > $rootScope.world.forest.curTrees / 8) {
                        $rootScope.world.forest.curAnimals = Math.floor($rootScope.world.forest.curTrees / 8);
                    }
                },
                decreaseTrees: function(amt) {
                    if ($rootScope.world.forest.curTrees >= amt) {
                        $rootScope.world.forest.curTrees -= amt;
                    } else {
                        $rootScope.world.forest.curTrees = 0;
                    }
                },
                increaseTrees: function(amt) {
                    $rootScope.world.forest.curTrees += amt;
                },
                step: function() {
                    if ($rootScope.engine.curStep % $rootScope.STEPSPERDAY == 0) {
                        var forest = $rootScope.world.forest;

                        var curTrees = forest.curTrees;

                        if ($rootScope.engine.curStep % ($rootScope.STEPSPERDAY * 10) == 0) {
                            forest.health = 100; //TODO: fix this
                            if (forest.saplings) {
                                var newTrees = forest.saplings.shift();

                                var newSaplings = 0;

                                newSaplings += forest.curTrees * 0.004;

                                if ($rootScope.season.curSeason == 'Spring') {
                                    if (forest.curTrees < 500) {
                                        newSaplings += 120;
                                    } else {
                                        newSaplings += 20;
                                    }
                                    if ($rootScope.itemList.pollinationService.unlocked) {
                                        newSaplings += Math.round(100 + forest.curTrees * 0.007);
                                    }
                                    if (forest.lastFire && (($rootScope.engine.curStep - forest.lastFire) < $rootScope.season.STEPSPERDAY * 180)) {
                                        newSaplings += Math.round(forest.curTrees * 0.01); //bonus for ashes
                                    }
                                }

                                forest.saplings.push(newSaplings);

                                for(var i = 0; i < forest.saplings.length; i++){
                                    forest.saplings[i] -= (forest.saplings[i]*(100 - forest.health)/5); //worst case health, 20% of saplings are lost
                                }

                                if ($rootScope.area.forestSpace < $rootScope.used.forestSpace + newTrees + 100) {
                                    newTrees = $rootScope.area.forestSpace - $rootScope.used.forestSpace - 100;
                                }

                                forest.curTrees += newTrees;
                            }

                            if ($rootScope.season.curSeason == 'Autumn') {
                                if ($rootScope.itemList.forester.number > 0) {
                                    forest.maxTrees = Math.round(forest.maxTrees * $rootScope.itemList.forester.number * 400);
                                }

                                //fire risk
                                forest.timeSinceLastFire = forest.timeSinceLastFire || 0;
                                if (forest.timeSinceLastFire > 23) {
                                    var risk = Math.pow((forest.curTrees / forest.maxTrees), 2);
                                    if (Math.random() < risk) {
                                        //fires!
                                        forest.curTrees = Math.round(forest.curTrees * 0.5);
                                        var msg = 'A forest fire took out half of the forest, leaving behind a layer of ash';
                                        Engine.log(msg);
                                        Engine.createNotification(msg, {
                                            icon: 'images/icons/fire_s.png'
                                        });
                                        forest.lastFire = $rootScope.engine.curStep;
                                    }
                                    forest.timeSinceLastFire = 0;
                                } else {
                                    forest.timeSinceLastFire++;
                                }
                            }

                            //setting up how animals and trees regen
                            var curAnimals = $rootScope.world.forest.curAnimals;
                            var newTrees = 0;
                            if (forest.curAnimals <= 20) {
                                if (!forest.consecutiveNoAnimal) {
                                    forest.consecutiveNoAnimal = 0;
                                } else {
                                    forest.consecutiveNoAnimal++;
                                    if (forest.consecutiveNoAnimal > 10 && $rootScope.season.curSeason == 'Spring') {
                                        //migration event
                                        forest.consecutiveNoAnimal = 0;
                                        forest.curAnimals += 600 + Math.ceil(Math.random() * 450);

                                    }
                                }
                            } else {
                                forest.curAnimals += Math.ceil(curAnimals * 0.0075 + curTrees / (curAnimals * 10.5 + 20));
                                if (forest.consecutiveNoAnimal > 0) {
                                    forest.consecutiveNoAnimal = 0;
                                }
                            }

                            if ($rootScope.season.curSeason == 'Spring') {

                                forest.curAnimals += 70;
                            } else if ($rootScope.season.curSeason == 'Summer') {
                                forest.curAnimals += 30;
                            }

                            forest.curAnimals += forest.animalGrowth;
                            //forest.curTrees += newTrees;

                            if (forest.curAnimals > forest.curTrees / 5) {
                                var diff = forest.curAnimals - forest.curTrees / 5;

                                forest.curAnimals -= Math.floor(diff / 5);

                            }




                            /*var curAnimalsText = getText($rootScope.world.forest.curAnimals);
                    if(curAnimalsText !== $rootScope.world.forest.curAnimalsText){
                        $rootScope.world.forest.curAnimalsText = curAnimalsText;
                    }

                    var curTreesText = getText($rootScope.world.forest.curTrees);
                    if(curTreesText !== $rootScope.world.forest.curTreesText){
                        $rootScope.world.forest.curTreesText = curTreesText;
                    }*/

                        }
                    }

                }
            };

            return forest;
        }
    ]);
