'use strict';

angular.module('prosperity')
    .service('World', ['$location', '$rootScope', 'Skills', 'Engine', 'Home', 'Forest', 'Mine',
        'Field', 'Market', 'Seasons', 'Battle', 'Player', 'Techs', '$state',
        function World($location, $rootScope, Skills, Engine, Home, Forest, Mine, Field, Market, Seasons, Battle, Player, Techs, $state) {
            return {
                ZONEPOLICIES: {
                    population: 1,
                    military: 2,
                    resource: 0
                },
                AISTATES: {
                    default: 0,
                    growPop: 1,
                    growMil: 2,
                    growRes: 3,
                    prepAttack: 4, // spies can tell if this is happening
                    annoAttack: 5, // announcing an attack, spies can tell specific place
                    attacking: 6 //launches the actual attack, unable to change any other policies until next "turn"
                },
                checkReady: function() {
                    if (!$rootScope.configged || !$rootScope.initialized) {
                        console.log('rootScope not configged');
                        $state.go('home');
                    } else {
                        return true;
                    }
                },
                getLocation: function(id) {
                    return $rootScope.world[id];
                },
                processZone: function(zone) {
                    var self = this;
                    if (zone) {
                        if (zone.id != 'homeZone') {
                            //gold
                            zone.goldDemand = 150 * (zone.warriors + zone.archers);
                            zone.goldProduction = 50 * (zone.numWorkers);

                            if (!zone.goldStore) {
                                zone.goldStore = 0;
                            }

                            switch (zone.policy) {
                                case 1: //growth
                                    var addedWorkers;
                                    if (zone.numWorkers > 3800) {
                                        addedWorkers = ~~(Math.random() * 20);
                                    } else {
                                        addedWorkers = ~~(zone.numWorkers * 0.01 + 3);
                                    }

                                    if (zone.liege != 'player' && zone.numWorkers < zone.targetWorkerNum / 3) {
                                        addedWorkers += 15
                                    }

                                    if (zone.numWorkers > zone.targetWorkerNum) {
                                        addedWorkers = Math.floor(-20 * Math.random());
                                        if (zone.liege === 'player') {
                                            var msg = zone.name + " switched from growth policy to resource policy, there are too many people to support and the surrounding land cannot support them";

                                            Engine.log(msg);
                                            Engine.createNotification(msg);
                                        }

                                        zone.policy = 0;
                                    }

                                    zone.numWorkers += addedWorkers;
                                    if (zone.numWorkers < 1 || (zone.id == 'hornCastle' && zone.liege == 'thePsychopath')) {
                                        zone.numWorkers = 1;
                                        if (zone.id === 'hornCastle' && zone.liege === 'thePsychopath') {
                                            zone.policy = 2;
                                        }
                                    }

                                    angular.forEach(zone.tribute, function(amount, itemId) {
                                        if (!zone.resources[itemId]) {
                                            zone.resources[itemId] = 0;
                                        }
                                        if ($rootScope.itemList[itemId]) {
                                            if (isNaN(amount)) {
                                                zone.resources[itemId] = 0;
                                            } else {
                                                zone.resources[itemId] += Math.ceil(amount * zone.numWorkers / 2);
                                            }

                                        } else {
                                            delete zone.tribute[itemId];
                                            delete zone.resources[itemId];
                                        }
                                    });
                                    break;
                                case 2: //military

                                    if (zone.numWorkers > 100 || (zone.id == 'hornCastle' && zone.liege == 'thePsychopath')) {

                                        if (!zone.warriorGrowth) {
                                            console.log("warrior growth broken for ", zone);
                                        }
                                        if (!zone.archerGrowth) {
                                            console.log("archer growth broken for ", zone);
                                        }

                                        var warriorGrowth = 0,
                                            archerGrowth = 0;
                                        if (zone.liege == 'theWarlord') {
                                            warriorGrowth = Math.round(zone.warriorGrowth * 1.5);
                                            archerGrowth = Math.round(zone.archerGrowth * 1.3);
                                        } else if (zone.liege == 'thePrincess') {
                                            warriorGrowth = Math.round(zone.warriorGrowth * 0.6);
                                            archerGrowth = Math.round(zone.archerGrowth * 1.6);
                                        } else if (zone.liege == 'thePsychopath') {
                                            warriorGrowth = Math.round(zone.warriorGrowth * 2);
                                            archerGrowth = Math.round(zone.archerGrowth * 0.5);
                                        } else {
                                            warriorGrowth = zone.warriorGrowth;
                                            archerGrowth = zone.archerGrowth;
                                        }

                                        archerGrowth = $rootScope.fns.randRound(archerGrowth);
                                        warriorGrowth = $rootScope.fns.randRound(warriorGrowth);

                                        if (zone.numWorkers > 1600) {
                                            zone.warriors += warriorGrowth * 3;
                                            zone.archers += archerGrowth * 3;
                                        } else if (zone.numWorkers > 500) {
                                            zone.warriors += warriorGrowth * 2;
                                            zone.archers += archerGrowth * 2;
                                        } else {
                                            zone.warriors += warriorGrowth;
                                            zone.archers += archerGrowth;
                                        }

                                        //console.log(zone.name + " military growth: ", warriorGrowth, archerGrowth);

                                        zone.numWorkers -= Math.round((archerGrowth + warriorGrowth) / 2);
                                        if (zone.numWorkers < 1) {
                                            zone.numWorkers = 1;
                                        }
                                        //zone.numWorkers -= ~~(zone.numWorkers * 0.005 + 1);

                                        if (zone.liege != 'player' && Math.random() < 0.25) {
                                            //25% chance to spend resources on additional units if the liege is not the player

                                            if (zone.resources.gold > 800) {
                                                var addWarriors = Math.floor(zone.resources.gold / (400 + Math.random() * 50));
                                                var addArchers = Math.floor(zone.resources.gold / (400 + Math.random() * 50));
                                                //console.log(zone.name + " spent resources for troops: ", zone.resources.gold, addWarriors, addArchers);
                                                zone.resources.gold = Math.round(Math.random() * 0.1 * zone.resources.gold);
                                                zone.warriors += addWarriors;
                                                zone.archers += addArchers;
                                            }
                                        }

                                        if(zone.liege == zone.originalLiege){
                                            if(zone.warriors > zone.numWorkers * 0.5){
                                                zone.warriors -= 5;
                                            }
                                            if(zone.archers > zone.numWorkers * 0.5){
                                                zone.archres -= 5;
                                            }
                                        }
                                        
                                        zone.warriors = Math.floor(zone.warriors);
                                        zone.archers = Math.floor(zone.archers);
                                        if (zone.liege == 'player') {
                                            $rootScope.fns.updateTotalMilitaryUnits();
                                        }
                                    } else {
                                        //can't do military - change the case
                                        if (zone.liege == 'player') {
                                            var msg = zone.name + " switched from military policy to growth, they have too few workers to support building an army";
                                            Engine.log(msg);
                                            Engine.createNotification(msg);
                                        }
                                        zone.policy = 1;
                                    }

                                    break;
                                case 0: //resource
                                default:
                                    var pool = zone.resources;
                                    for (var itemId in zone.tribute) {
                                        if (!pool[itemId]) {
                                            pool[itemId] = 0;
                                        }
                                        pool[itemId] += Math.round(zone.tribute[itemId] * zone.numWorkers);
                                    }
                                    if (zone.liege == zone.originalLiege) {
                                        //convert resources into gold
                                        var goldVal = Market.getGoldValue(pool);
                                        pool = {
                                            gold: goldVal
                                        };
                                    }


                                    if (zone.numWorkers > zone.targetWorkerNum) {
                                        zone.numWorkers -= Math.floor(Math.random() * 20);
                                    } else {
                                        if (zone.goldProduction > zone.goldDemand) {
                                            zone.numWorkers += Math.floor(Math.random() * 20);
                                        }
                                    }

                                    if (zone.numWorkers < 1) {
                                        zone.numWorkers = 1;
                                    }

                                    break;
                            }


                            if (zone.goldProduction < zone.goldDemand) {
                                var diff = zone.goldDemand - zone.goldProduction;

                                if (zone.goldStore - diff < 0) {
                                    zone.goldStore = 0;

                                    if (!zone.notEnoughgold) {
                                        zone.notEnoughgold = 1;
                                    } else {
                                        zone.notEnoughgold++;

                                        if (zone.notEnoughgold == 2 && zone.liege == 'player') {
                                            var msg = zone.name + " is having a issues with money, we could perhaps send them some money to alleviate the issue, or perhaps change the growth policy to ease their burden";
                                            Engine.log(msg);
                                            Engine.createNotification(msg, 'vassalNotEnoughGold');
                                        }

                                        if (zone.notEnoughgold == 3 && zone.liege == 'player') {
                                            var msg = zone.name + "'s money shortage is critical. Soon they will be seeing people, troops even, abandoning their homes for survival."
                                            Engine.log(msg);
                                            Engine.createNotification(msg, 'vassalNotEnoughGold');
                                        }

                                        if (zone.notEnoughGold > 3) {
                                            //lose worker/soldier
                                            if (zone.liege == 'player') {
                                                var msg = zone.name + " is starting to lose people from the lack of money";
                                                Engine.log(msg);
                                                Engine.createNotification(msg, 'vassalNotEnoughGold');
                                            }

                                            var pctWorker = (zone.numWorkers / 5) / ((zone.numWorkers / 5) + zone.archers + zone.warriors);

                                            if (Math.random() <= pctWorker) {
                                                zone.numWorkers -= Math.floor((Math.random() * zone.numWorkers * zone.notEnoughGold / 40));
                                            } else {
                                                var pctWarrior = zone.warriors / (zone.warriors + zone.archers);
                                                if (Math.random() <= pctWarrior) {
                                                    zone.warriors -= Math.floor(Math.random() * 3 * zone.notEnoughGold);
                                                    if (zone.warriors < 0) {
                                                        zone.warriors = 0;
                                                    }
                                                } else {
                                                    zone.archers -= Math.floor(Math.random() * 3 * zone.notEnoughGold);
                                                    if (zone.archers < 0) {
                                                        zone.archers = 0;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                } else {
                                    zone.goldStore -= diff;
                                    zone.notEnoughGold = 0;
                                }
                            }



                            //resources
                            angular.forEach(zone.resources, function(val, key) {
                                if (isNaN(val)) {
                                    console.log(zone.name, key, zone.numWorkers);
                                }
                            });

                            //revolt
                            if ($rootScope.engine.curStep > $rootScope.revoltMechanicStart) {
                                //calc revolt.
                                if ((zone.id == 'hornCastle' && zone.liege == 'thePsychopath') ||
                                    (zone.id == 'dickinsonLanding' && zone.liege == 'theWarlord') ||
                                    (zone.id == 'castleGrey' && zone.liege == 'thePrincess')) {
                                    //do nothing
                                } else {
                                    if (zone.liege != zone.originalLiege) {
                                        if (!zone.favour) {
                                            zone.favour = {}
                                        }
                                        if (!zone.favour[zone.liege]) {
                                            zone.favour[zone.liege] = 0;
                                        }

                                        zone.favour[zone.liege] -= 2;

                                        if (zone.policy == 1) {
                                            zone.favour[zone.liege] += 1;
                                        }

                                        if (zone.policy == 2) {
                                            zone.favour[zone.liege] -= 4;
                                        }

                                        if (zone.policy == 3) {
                                            zone.favour[zone.liege] -= 2;
                                        }

                                        var unitsAtZone = zone.archers + zone.warriors;

                                        if (unitsAtZone < 5) {
                                            zone.favour[zone.liege] -= 2;
                                        } else if (unitsAtZone < 100) {
                                            zone.favour[zone.liege] -= 1;
                                        } else if (unitsAtZone < 500) {
                                            zone.favour[zone.liege] = zone.favour[zone.liege];
                                        } else if (unitsAtZone < 1000) {
                                            zone.favour[zone.liege] += 1;
                                        } else if (unitsAtZone >= 1000) {
                                            zone.favour[zone.liege] += 2;
                                        }

                                        if (zone.liege == 'thePrincess' && (zone.id == 'winisk' || zone.id == 'burwash' || zone.id == 'corbyville' || zone.id == 'lemieux' || zone.id == 'kitsilano')) {
                                            zone.favour.thePrincess += 2;
                                        }

                                        if (zone.liege == 'theWarlord' && (zone.id == 'dickinsonLanding' || zone.id == 'pointAnne' || zone.id == 'redWater' || zone.id == 'tomiko' || zone.id == 'silverInslet')) {
                                            zone.favour.theWarlord += 2;
                                        }

                                        if (zone.favour[zone.liege] < 5) {
                                            if (zone.liege == 'player') {
                                                Engine.insert(100, 'loadImportantEvent', ['vassalRevolted', zone.id]);
                                                Engine.createNotification('Our vassal, ' + zone.name + ' has revolted');
                                            } else {
                                                /*Engine.insert(1200, 'loadImportantEvent', ['enemyVassalRevolted', {
                                                    zoneid: zone.id,
                                                    formerLiege: zone.liege
                                                }]);*/
                                                var msg = zone.name + ' has revolted against their former liege, ' + $rootScope.itemList[zone.liege].name + ', and retaken control';
                                                Engine.createNotification(msg, 'battle');
                                                Engine.log(msg);
                                            }
                                            zone.liege = zone.originalLiege;
                                            zone.policy = 1;
                                        }

                                        $rootScope.fns.fixFavourLimits(zone);
                                    } else {
                                        //is neutral
                                        var factions = ['theWarlord', 'thePsychopath', 'thePrincess', 'player'];

                                        for (var i = 0; i < factions.length; i++) {
                                            var f = factions[i];
                                            if (!zone.favour[f]) {
                                                zone.favour[f] = 0;
                                            }

                                            if (zone.favour[f] > 0) {
                                                zone.favour[f]--;
                                            } else if (zone.favour[f] < 0) {
                                                zone.favour[f]++;
                                            }
                                        }
                                    }
                                }

                                //make a quest?
                                if (!zone.curQuest && $rootScope.world.home.level >= 2) {
                                    var canMakeQuest = false;
                                    if (zone.liege == 'player') {
                                        canMakeQuest = true;
                                    } else {
                                        for (var i = 0; i < zone.neighbours.length; i++) {
                                            //check if any neighbours belong to the player
                                            var z = $rootScope.itemList[zone.neighbours[i]];
                                            if (z.liege == 'player') {
                                                canMakeQuest = true;
                                            }
                                        }
                                    }

                                    if (canMakeQuest && Math.random() < 1.20) {
                                        //what kind of quest?

                                        //food supplies quest - request supplies in return for favour - can't ask too much or else it's generally not worth it
                                        //                      food will generally be what the player can afford the most to give away
                                        var questTypes = ['soldiers']; //,'soldiers'];

                                        var selection = questTypes[Math.floor(Math.random() * questTypes.length)];

                                        if (selection === 'gold') {
                                            //gold needed!
                                            var curGold = $rootScope.player.gold;
                                            if (curGold >= 108 * 197 * 5) {
                                                var goldNeeded = Math.min(Math.round(Math.random() * curGold) + 108, 108 * 197 * 20);
                                                var quest = {
                                                    from: zone.id,
                                                    type: 'goldSupply',
                                                    title: zone.name + ' requests financial aid of ' + $rootScope.fns.convertCurrency(goldNeeded, true),
                                                    req: {
                                                        gold: goldNeeded
                                                    },
                                                    reward: {
                                                        favour: 50
                                                    },
                                                    description: zone.name + ' is having trouble financially. If you help them, they would be very grateful',
                                                    daysRemaining: 30
                                                }
                                                zone.curQuest = $rootScope.fns.createQuest(quest);

                                            }
                                        } else if (selection === 'food') {

                                            var curFood = $rootScope.world.home.curFood;

                                            var curConsumption = root.world.home.foodConsumptionRates[root.world.home.consumeFoodRate] * root.world.home.curWorkers;

                                            var foodNeeded = Math.round((Math.random() * 30 + 1) * zone.numWorkers) + 100;

                                            if (foodNeeded < curFood && (curFood - foodNeeded) / curConsumption > 30) {
                                                //more than 30 days of food assuming zero creation
                                                var amt = foodNeeded;
                                                var quest = {
                                                    from: zone.id,
                                                    type: 'foodSupply',
                                                    title: zone.name + ' requests ' + amt + ' food',
                                                    req: {
                                                        food: amt
                                                    },
                                                    reward: {
                                                        favour: 50
                                                    },
                                                    description: zone.name + " is running low on food, with little hope of producing enough to make it for much longer. If you can spare some food, we will be very grateful",
                                                    daysRemaining: 30
                                                }

                                                if (zone.favour.player > 50) {
                                                    //ok, likes the player a bit, lets throw in an additional reward of gold
                                                    quest.reward.gold = Math.round(Math.random() * 12000 + 8000);
                                                }

                                                zone.curQuest = $rootScope.fns.createQuest(quest);
                                            }
                                        }


                                        //reinforcement quest - if the player has troops in their capital, this could work - request troops when there is an enemy presence (not the player)
                                        else if (selection == 'soldiers') {
                                            var curSoldiers = $rootScope.itemList.homeZone.warriors + $rootScope.itemList.homeZone.archers;
                                            var hasMilitary = $rootScope.world.militaryCouncil.discovered;
                                            var soldiersHave = (zone.warriors + zone.archers);

                                            if (hasMilitary && zone.liege == zone.originalLiege) {
                                                //request some number of soldiers, and check if player has enough
                                                var soldiersRequested = Math.floor(Math.random() * zone.numWorkers / 8) - soldiersHave;
                                                if (soldiersRequested > 10 && curSoldiers > soldiersRequested) {
                                                    var quest = {
                                                        from: zone.id,
                                                        type: 'reinforcement',
                                                        title: zone.name + ' requests reinforcement of ' + soldiersRequested + ' units',
                                                        req: {
                                                            units: soldiersRequested
                                                        },
                                                        reward: {
                                                            favour: 60
                                                        },
                                                        description: zone.name + " is requesting military units to defend against foreign threat. If you can donate some troops, our defensibility will be improved and we will be very grateful",
                                                        daysRemaining: 30
                                                    };
                                                    if (zone.favour.player > 50) {
                                                        quest.reward.gold = Math.round(Math.random() * 12000 + 10000);
                                                    }
                                                    zone.curQuest = $rootScope.fns.createQuest(quest);
                                                }
                                            }
                                        }

                                        //service quest - receive goods and perform service (i.e. turn iron + coal into steel)
                                        else if (selection == 'service') {

                                        }
                                    }
                                }
                            }
                        }
                        //calculate military rating and economy rating

                        self.calcMilitaryRating(zone.id);
                        self.calcEconomicRating(zone.id);
                    }
                },
                changeZoneLiege: function(zoneId, newLiegeId) {
                    var zone = $rootScope.itemList[zoneId];
                    zone.liege = newLiegeId;

                    //who's the new liege?
                    if (zone.curQuest) {
                        var curQuest;
                        for (var i = 0; i < $rootScope.player.quests.length; i++) {
                            var q = $rootScope.player.quests[i];
                            if (q.id === zone.curQuest) {
                                curQuest = q;
                            }
                        }
                        if (zone.liege == 'player') {
                            if (q.type === 'reinforcement') {
                                var msg = "Quest: " + q.title + " can no longer be completed because you are the new liege of " + zone.name;
                                Engine.log(msg);
                                Engine.createNotification(msg, 'questRemoved');
                                $rootScope.fns.removeQuest(zone.curQuest);

                            }
                        }

                        if (zone.liege != 'player' && zone.liege != zone.originalLiege) {
                            var msg = "Quest: " + q.title + " can no longer be completed because another faction has seized control of " + zone.name;
                            Engine.log(msg);
                            Engine.createNotification(msg, 'questRemoved');
                            $rootScope.fns.removeQuest(zone.curQuest);
                        }
                    }
                },
                gatherTributes: function() {
                    for (var i = 0; i < $rootScope.zones.length; i++) {

                        var zone = $rootScope.zones[i];
                        if (zone && zone.id != 'homeZone') {
                            if (zone.liege == 'player') {
                                //pay up!
                                /*
                            for (var itemId in zone.resources) {
                                if (!tribute[itemId]) {
                                    tribute[itemId] = 0;
                                }
                                tribute[itemId] += ~~(zone.resources[itemId]);
                            }*/
                                console.log('paying tribute: ', zone.resources);
                                angular.forEach(zone.resources, function(val, key) {
                                    if (isNaN(val)) {
                                        console.log(key + ": " + val);
                                    }
                                });
                                Player.insertInventory(zone.resources);
                                Engine.log(zone.name + ' pays you their monthly tribute: ' + $rootScope.fns.listGoods(zone.resources));

                                zone.resources = {};
                            } else {
                                if (zone.liege == 'thePrincess' || zone.liege == 'theWarlord' || zone.liege == 'thePsychopath') {
                                    var character = $rootScope.itemList[zone.liege];
                                    //pay tribute to the ai

                                    var capital = $rootScope.fns.getCapital(zone.liege);

                                    var goldVal = $rootScope.fns.getGoldValue(zone.resources);
                                    capital.resources.gold += Math.round(goldVal);
                                    zone.resources = {};
                                }
                            }
                        }
                    }
                },
                step: function() {
                    var self = this;
                    $rootScope.isNewDay = (Engine.curStep % $rootScope.STEPSPERDAY == 0);
                    $rootScope.isNewNoon = (Engine.curStep % $rootScope.STEPSPERDAY == Math.round($rootScope.STEPSPERDAY / 2));
                    Seasons.step();
                    Home.step();
                    Forest.step();
                    Mine.step();
                    Field.step();
                    Skills.step();
                    Market.step();
                    Techs.step();

                    //process the zones
                    var period = $rootScope.STEPSPERDAY * 5; //defined period as 5 days
                    var stepInPeriod = $rootScope.engine.curStep % period;
                    var dist = Math.ceil(period / $rootScope.zones.length);

                    if ($rootScope.engine.curStep % dist == 0) {
                        if ($rootScope.zones && $rootScope.zones.length > 0) {
                            var zoneIndex = ($rootScope.engine.curStep / dist) % $rootScope.zones.length;
                            var zone = $rootScope.zones[zoneIndex];

                            self.processZone(zone);
                        }
                    }
                },
                init: function() {
                    $rootScope.zonePolicies = [{
                        value: 1,
                        label: "Population Growth - Focus on increasing population of workers at the cost of resource and military generation"
                    }, {
                        value: 2,
                        label: "Military Growth - Focus all resources on building military, leaves little room for growing population"
                    }, {
                        value: 0,
                        label: "Resource Growth - Focus everything on providing the most resources to their liege, stagnates worker and military growth"
                    }]
                    Home.init();
                    Market.init();
                },
                calcMilitaryRating: function(zoneId) {
                    var target = $rootScope.itemList[zoneId];
                    var liege = $rootScope.itemList[target.liege];
                    var baseMilitaryRating = 10;
                    if (!liege) {
                        console.log(liege);
                    }
                    if (target.immunity > 0) {
                        target.militaryRating = 99999999;
                    } else {
                        target.militaryRating = target.warriors * (liege.warriors.strength * 2 + liege.warriors.defense) + target.archers * (liege.archers.strength * 2 + liege.archers.defense) + baseMilitaryRating;
                    }
                },
                calcEconomicRating: function(zoneId) {
                    var target = $rootScope.itemList[zoneId];
                    var liege = $rootScope.itemList[target.liege];

                    if (liege == $rootScope.itemList.player) {
                        target.economicRating = Market.getGoldValue($rootScope.player.inventory) + $rootScope.player.gold;
                    } else {
                        if (!target.resources) {
                            target.resources = {
                                gold: 0
                            }
                        }

                        target.economicRating = Market.getGoldValue(target.resources) + target.numWorkers * 1000;
                    }
                },
                redistributeForces: function(ai, character, capital) {
                    var self = this;
                    //determine minimum number of units needed at each zone to keep it safe from its neighbours
                    var vassals = [];
                    var totalReqMilitaryRating = 0;
                    var totalAvailableTroops = {
                        warriors: 0,
                        archers: 0
                    };
                    var defenseRatio = 0.5;
                    if (Math.random() < character.aggression) {
                        //has a target, redistribute for offense
                        defenseRatio = 0.1;
                        character.wantToAttack = true;
                    }
                    for (var i = 0; i < $rootScope.zones.length; i++) {
                        var zone = $rootScope.zones[i];
                        if (zone.liege == ai) {
                            totalAvailableTroops.warriors += zone.warriors;
                            totalAvailableTroops.archers += zone.archers;
                            zone.warriors = 0;
                            zone.archers = 0;
                            var requiredMilitaryRating = 0;
                            var considered = [];
                            for (var j = 0; j < zone.neighbours.length; j++) {
                                var nZ = $rootScope.itemList[zone.neighbours[j]];
                                if (nZ.liege != ai && (nZ.liege == 'player' || nZ.liege == 'theWarlord' || nZ.liege == 'thePsychopath' || nZ.liege == 'thePrincess')) {
                                    if (considered.indexOf(nZ.liege) < 0) {
                                        //calc military rating
                                        requiredMilitaryRating += $rootScope.fns.getCapital(nZ.liege).militaryRating;
                                        considered.push(nZ.liege);

                                    }
                                }
                            }
                            requiredMilitaryRating += Math.min(120, Math.floor(requiredMilitaryRating * 0.05));
                            totalReqMilitaryRating += requiredMilitaryRating;
                            vassals.push({
                                zone: zone,
                                minRating: requiredMilitaryRating
                            });
                        }
                    }

                    //a.i cheats a little here - summons a handful of additional troops
                    totalAvailableTroops.warriors = Math.round(totalAvailableTroops.warriors * 1.1);
                    totalAvailableTroops.archers = Math.round(totalAvailableTroops.archers * 1.1);

                    var minWarriors, minArchers;
                    //recall to capital minimum
                    if (ai == 'theWarlord') {
                        minWarriors = 300;
                        minArchers = 150;
                    } else if (ai == 'thePrincess') {
                        minWarriors = 100;
                        minArchers = 250;
                    } else if (ai == 'thePsychopath') {
                        minWarriors = 500;
                        minArchers = 50;
                    }

                    if (totalAvailableTroops.warriors >= minWarriors) {
                        capital.warriors += minWarriors;
                        totalAvailableTroops.warriors -= minWarriors;
                    } else {
                        capital.warriors += totalAvailableTroops.warriors;
                        totalAvailableTroops.warriors = 0;
                    }


                    if (totalAvailableTroops.archers >= minArchers) {
                        capital.archers += minArchers;
                        totalAvailableTroops.archers -= minArchers;
                    } else {
                        capital.archers += totalAvailableTroops.archers;
                        totalAvailableTroops.archers = 0;
                    }


                    vassals.sort(function(a, b) {
                        //most demanding first first
                        return b.minRating - a.minRating;
                    });

                    if (totalReqMilitaryRating < 1) {
                        totalReqMilitaryRating = 1;
                    }

                    //determine what percentage of the troops should go to this vassal by calculating its minRating/totalReqMilitaryRating
                    for (var i = 0; i < vassals.length; i++) {
                        var vassal = vassals[i];
                        var wAmt = Math.floor(vassal.minRating * totalAvailableTroops.warriors * defenseRatio / totalReqMilitaryRating + totalAvailableTroops.warriors * defenseRatio * 0.8 / vassals.length);
                        var aAmt = Math.floor(vassal.minRating * totalAvailableTroops.archers * defenseRatio / totalReqMilitaryRating + totalAvailableTroops.archers * defenseRatio * 0.8 / vassals.length);

                        vassal.zone.warriors = wAmt;
                        vassal.zone.archers = aAmt;
                        totalAvailableTroops.warriors -= wAmt;
                        totalAvailableTroops.archers -= aAmt;
                    }



                    //remainder troops go to the capital
                    capital.warriors += totalAvailableTroops.warriors;
                    capital.archers += totalAvailableTroops.archers;

                },
                processAI: function(ai) {
                    var self = this;
                    var character = $rootScope.itemList[ai];
                    if (!character.state) {
                        //character doesn't have a state yet,
                        character.state = 0; //set to default state

                        /*States:
                            0 - default, not particularly useful other than to enter another state
                            1 - growing population
                            2 - growing military
                            3 - growing money/resources
                            4 - prepping to attack (could be learned by spy)
                            5 - prepping to attack (public announcement)
                            6 - attacking
                        */
                    }
                    if (ai == 'theWarlord' || ai == 'thePrincess' || ai == 'thePsychopath') {
                        if (ai == 'theWarlord')
                            var capital = $rootScope.itemList.dickinsonLanding;
                        else if (ai == 'thePrincess')
                            var capital = $rootScope.itemList.castleGrey;
                        else if (ai == 'thePsychopath')
                            var capital = $rootScope.itemList.hornCastle;
                        if (character.state == 7) {
                            //do nothing, character is incapacitated;
                        } else if (character.state == 0) {

                            if (Math.random() < 0.5 && !character.wantToAttack) {
                                //redistribute forces
                                console.log('redistribute forces');
                                self.redistributeForces(ai, character, capital);

                            }


                            //find the target
                            var potentialTargets = self.findNeighboursOf(ai);

                            //determine weakest target
                            if (potentialTargets.length > 0) {

                                if (!capital.militaryRating) {
                                    self.calcMilitaryRating(capital.id);
                                }

                                if (!capital.economicRating) {
                                    self.calcEconomicRating(capital.id);
                                }

                                var backstab = (Math.random() > character.backstab);

                                for (var i = 0; i < potentialTargets.length; i++) {
                                    //remove allies and immune targets
                                    var target = potentialTargets[i];
                                    self.calcMilitaryRating(target.id);
                                    if (character.allies.indexOf(target.liege) >= 0 && !backstab) {
                                        potentialTargets.splice(i, 1);
                                        i--;
                                    }

                                    if (target.immunity > 0) {
                                        potentialTargets.splice(i, 1);
                                        i--;
                                    }
                                }
                                if (potentialTargets.length > 0) {
                                    var weakestTarget = potentialTargets[0];
                                    if (!weakestTarget.militaryRating) {
                                        self.calcMilitaryRating(weakestTarget.id);
                                    }

                                    if (!weakestTarget.economicRating) {
                                        self.calcEconomicRating(weakestTarget.id);
                                    }

                                    for (var i = 1; i < potentialTargets.length; i++) {
                                        var target = potentialTargets[i];
                                        if (target.militaryRating < weakestTarget.militaryRating) {
                                            weakestTarget = target;
                                        }
                                    }

                                    //decisions regarding weakest target
                                    if (capital.militaryRating < weakestTarget.militaryRating * 1.5) {
                                        if (capital.economicRating < weakestTarget.economicRating) {
                                            character.state = 3; //growing resources
                                        } else {
                                            character.state = 2; //growing military
                                        }
                                    } else {
                                        //potential attack
                                        if (Math.random() < character.aggression) {
                                            character.state = 4; //preparing for war
                                            character.nextTarget = weakestTarget.id;
                                        } else {
                                            character.state = 1; //grow population
                                        }
                                    }
                                } else {
                                    character.state = 0;
                                }

                            } else {
                                if (capital.liege == ai) {
                                    console.log(character.name + ' has already taken over everything');
                                } else {
                                    console.log(character.name + ' has already been killed');
                                    character.state = 7;
                                }

                            }

                        } else if (character.state == 1) {
                            //growing population, capital is growing population, if vassal is neighbour of enemy, grow military, else grow population
                            capital.policy = 1;
                            if (Math.random() < 0.3) {
                                //convert resources into more population
                                var goldVal = $rootScope.fns.getGoldValue(capital.resources);
                                capital.resources = {
                                    gold: goldVal
                                };
                            }
                            character.state = 0;

                        } else if (character.state == 2) {
                            //military growth
                            for (var i = 0; i < $rootScope.zones.length; i++) {
                                var zone = $rootScope.zones[i];
                                if (zone.liege == ai) {
                                    if (zone.policy != 2 && Math.random() < 0.5) {
                                        zone.policy = 2;
                                    }
                                }
                            }
                            var factions = ['player', 'thePrincess', 'theWarlord', 'thePsychopath'];

                            var totalUnits = {};

                            for (var i = 0; i < factions.length; i++) {
                                var faction = $rootScope.itemList[factions[i]];
                                var capital = $rootScope.fns.getCapital(factions[i]);
                                if (faction.id != 'player' && faction.state != 7) {
                                    //faction is alive and kicking! lets consider their military
                                    totalUnits[faction.id] = capital.warriors + capital.archers;
                                }
                            }

                            //compare with others
                            var smallest = factions[0];
                            for (var i = 0; i < factions.length; i++) {
                                if (totalUnits[factions[i]]) {
                                    if (totalUnits[factions[i]] < totalUnits[smallest]) {
                                        smallest = factions[i];
                                    }
                                }
                            }

                            //weakest AI bonus
                            if (smallest == ai) {
                                capital.warriors += Math.floor(Math.random() * 15);
                                capital.archers += Math.floor(Math.random() * 10);
                            }

                            capital.policy = 2;
                            character.state = 0;
                        } else if (character.state == 3) {
                            //resource growth
                            capital.policy = 0;

                            character.state = 0;
                        } else if (character.state == 4) {
                            //military starting attack
                            //check if player's spy is available
                            var spyStats = $rootScope.itemList.player.spy;
                            var spies = spyStats.deployed;
                            if (spies) {
                                for (var i = 0; i < spies.length; i++) {
                                    var spy = spies[i];
                                    if (spy.location == capital.id && Math.random() < spyStats.successRate) {
                                        Engine.insert(50, 'warningAIAttacking', [ai]);
                                    }
                                }
                            }
                            character.state = 5;
                        } else if (character.state == 5) {
                            //check if player's spy is available
                            var spyStats = $rootScope.itemList.player.spy;
                            var spies = spyStats.deployed;
                            if (spies) {
                                for (var i = 0; i < spies.length; i++) {
                                    var spy = spies[i];
                                    if (spy.location == capital.id && Math.random() < spyStats.successRate) {
                                        Engine.insert(50, 'dangerAIAttacking', [ai]);
                                    }
                                }
                            }
                            character.state = 6;
                        } else if (character.state == 6) {
                            console.log(character.id + " is attacking " + character.nextTarget);
                            Engine.insert(0, 'AIIsAttacking', [ai]);
                            var nextTarget = $rootScope.itemList[character.nextTarget];
                            if (nextTarget.liege == 'player') {
                                //attacking the player
                                Engine.insert(100, 'startBattle', [ai, nextTarget.id]);
                            } else {
                                //attacking an A.I

                                var dLiege = $rootScope.itemList[nextTarget.liege];
                                var warrResults = Math.max((character.warriors.strength * capital.warriors - (nextTarget.warriors * dLiege.warriors.strength * Math.random() * 0.5 + 0.7)) / (character.warriors.strength), 0);

                                var archResults = Math.max((character.archers.strength * capital.archers - (nextTarget.archers * dLiege.archers.strength * Math.random() * 0.5 + 0.7)) / (character.archers.strength), 0);

                                if (warrResults + archResults > 0) {
                                    //attackers win.
                                    capital.warriors = Math.floor(Math.random() * 1.4 * warrResults);
                                    capital.archers = Math.floor(Math.random() * 1.4 * archResults);

                                    nextTarget.archers = Math.floor(Math.random() * 0.3 * archResults);
                                    nextTarget.warriors = Math.floor(Math.random() * 0.3 * warrResults);

                                    Engine.insert(400, 'takeOver', [character.id, nextTarget.id]);

                                    if (character.id == 'thePsychopath') {
                                        //special treatment! He converts a lot of people into warriors
                                        nextTarget.warriors += Math.floor(nextTarget.numWorkers * Math.random() * 0.7);
                                        nextTarget.numWorkers = 1;
                                    }
                                    character.nextTarget = null;

                                    console.log(character.id + " won ", nextTarget);
                                } else {
                                    capital.warriors = Math.floor(Math.random() * 0.2 * capital.warriors);
                                    capital.archers = Math.floor(Math.random() * 0.2 * capital.archers);

                                    nextTarget.archers = Math.floor(Math.random() * 0.7 * nextTarget.archers);
                                    nextTarget.warriors = Math.floor(Math.random() * 0.7 * nextTarget.warriors);
                                    console.log(character.id + " lost", nextTarget);
                                }

                                self.redistributeForces(ai, character, capital);
                            }

                            character.state = 0;
                            character.wantToAttack = false;
                        }

                        console.log("Processed AI: ", character.id, character.state);
                    }
                },
                findNeighboursOf: function(ai) {
                    var neighbours = [];
                    var owned = [];
                    for (var i = 0; i < $rootScope.zones.length; i++) {
                        var zone = $rootScope.zones[i];

                        if (zone.liege == ai && owned.indexOf(zone) < 0) {
                            owned.push(zone);
                        }
                    }

                    for (var i = 0; i < owned.length; i++) {
                        var zone = owned[i];
                        var neighb = zone.neighbours;
                        for (var j = 0; j < neighb.length; j++) {
                            var n = $rootScope.itemList[neighb[j]];
                            if (n.liege != ai && neighbours.indexOf(n) < 0) {
                                neighbours.push(n);
                            }
                        }
                    }

                    return neighbours;
                }
            };


        }
    ]);
