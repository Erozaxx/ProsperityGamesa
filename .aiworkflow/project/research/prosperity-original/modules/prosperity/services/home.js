'use strict';

angular.module('prosperity')
    .service('Home', ['$rootScope', 'Player', 'Engine', 'Techs',
        function Home($rootScope, Player, Engine, Techs) {
            // AngularJS will instantiate a singleton by calling "new" on this function
            var levels = [{
                prefix: 'Camp',
                noun: 'camp',
                bg: 'camp',
                requirements: {
                    //none, this is basic
                    workers: 0,
                },
                rewardString: 'basic buildings: hovel, warehouse, granary, hunting lodge, lumber mill',
                onAchieve: function() {
                    $rootScope.world.home.bg = 'camp';
                    var events = $rootScope.player.events;
                    if (!events.masterBuilder) {
                        events.masterBuilder = 1;
                        Engine.insert($rootScope.STEPSPERDAY * 4, 'eventMasterBuilder');
                    }
                    if (!events.foundField) {
                        events.foundField = 1;
                        Engine.insert($rootScope.STEPSPERDAY * 14, 'eventFoundField');

                    }
                    if ($rootScope.itemList.builderHut.max > 1) {
                        $rootScope.itemList.builderHut.max = 1;
                    }
                    if (!events.firstNotif) {
                        events.firstNotif = true;
                        Engine.insert($rootScope.STEPSPERDAY * 2, 'createNotif', {
                            msg: 'This is a notification, click to dismiss it',
                            icon: 'hint'
                        });
                    }
                    $rootScope.world.home.minWorkers = 0;
                }
            }, {
                prefix: 'Settlement',
                bg: 'settlement',
                noun: 'settlement',
                rewardString: 'better ability to attract potential investors and allies',
                requirements: {
                    workers: 15,
                    townCenter: 1
                },
                onAchieve: function() {
                    $rootScope.world.home.bg = 'settlement';
                    var events = $rootScope.player.events;
                    if (!events.disoverMine) {
                        events.discoverMine = 1;
                        Engine.insert($rootScope.STEPSPERDAY * 30, 'eventMineBuilder');
                    }

                    if (!events.princessBeeKeeper) {
                        events.princessBeeKeeper = 1;
                        Engine.insert(23500, 'eventPrincessBeeKeeper'); //Unlocks the BeeKeeper, who creates wax and food - only active in summer/autumn
                    }
                    if (!$rootScope.importantEvent.townIsSettlement.used) {
                        $rootScope.importantEvent.load('townIsSettlement');
                    }
                    if ($rootScope.itemList.builderHut.max) {
                        delete $rootScope.itemList.builderHut.max;
                    }
                    events.isSettlement = 1;
                },
                unlocks: ['warehouse', 'granary', 'gatherersHut', 'watchTower']
            }, {
                prefix: 'Hamlet',
                bg: 'hamlet',
                noun: 'hamlet',
                rewardString: 'potentially more ways to boost our defenses and improve the wellbeing of our people',
                requirements: {
                    workers: 60,
                    watchTower: 1,
                    miningCamp: 2
                },
                onAchieve: function() {
                    $rootScope.world.home.bg = 'hamlet';

                    var events = $rootScope.player.events;

                    if (!events.discoverCouncil) {
                        events.discoverCouncil = 1;

                        Engine.insert(490, 'loadImportantEvent', ['meetCouncilmanCeres']);
                    }


                    if (!$rootScope.player.events.ximniVisit) {
                        $rootScope.player.events.ximniVisit = 1;
                        Engine.insert(18000, 'eventXimniTrader');
                    }

                    if (events.marbleSeller < 1 || !events.marbleSeller) {
                        events.marbleSeller = 1;
                        Engine.insert(27000, 'eventMarbleSeller');
                    }

                    if (!$rootScope.player.events.traderJoeVisit) {
                        $rootScope.player.events.traderJoeVisit = 1;
                        Engine.insert(17382, 'loadImportantEvent', ['traderJoeFirstVisit']);
                    }

                    if (!$rootScope.player.events.startedMarky) {
                        $rootScope.player.events.startedMarky = 1;
                        Engine.insert(10934, 'loadImportantEvent', ['questForMarky']);
                    }
                    if ($rootScope.itemList.builderHut.max) {
                        delete $rootScope.itemList.builderHut.max;
                    }
                    events.isHamlet = 1;
                },
                unlocks: ['inn', 'garden']
            }, {
                prefix: 'Village',
                bg: 'village',
                noun: 'village',
                rewardString: 'attract more variety of travellers, but also attract potential bandits',
                requirements: {
                    workers: 180,
                    garden: 1,
                    inn: 1
                },
                onAchieve: function() {
                    $rootScope.world.home.bg = 'village';
                    var events = $rootScope.player.events;


                    if (!events.milontiTale) {
                        events.milontiTale = 1;
                        $rootScope.story.milontiTale.canStart = true;
                        Engine.insert(6500, 'eventStory', ['milontiTale']);
                    }

                    if (!events.ximniTale) {
                        events.ximniTale = 1;
                        //$rootScope.story.ximniTale.canStart = true;
                        //Engine.insert(47 * $rootScope.STEPSPERDAY, 'eventStory', ['ximniTale']);

                        Engine.insert(47 * $rootScope.STEPSPERDAY, 'loadImportantEvent', ['ximniTale']);
                    }



                    if (!$rootScope.importantEvent.firstVillage.used) {
                        $rootScope.importantEvent.load('firstVillage');
                    };

                    if (!$rootScope.player.events.startedMarla) {
                        $rootScope.player.events.startedMarla = 1;
                        Engine.insert($rootScope.STEPSPERDAY * 38, 'loadImportantEvent', ['questForMarla']);
                    }

                    if (!events.marbleSeller < 2 || !events.marbleSeller) {
                        events.marbleSeller = 2;
                        Engine.insert(20938, 'eventMarbleSeller');
                    }

                    if (!events.militaryCouncil) {
                        events.militaryCouncil = 1;
                        Engine.insert($rootScope.STEPSPERDAY * 60, 'loadImportantEvent', ['buildMilitaryCouncil']);
                    }
                    events.isVillage = 1;

                },
                unlocks: ['craftsmansGuild', 'cityGuardHQ', 'taxCenter']
            }, {
                prefix: 'Town',
                noun: 'town',
                min: 600,
                bg: 'town',
                requirements: {
                    workers: 600,
                    craftsmansGuild: 1
                },
                rewardString: 'more stability. In addition, we can potentially attract foreign investors who have travelled from another continent',
                onAchieve: function() {
                    $rootScope.world.home.bg = 'town';
                    var events = $rootScope.player.events;
                    if (!events.marbleSeller < 3 || !events.marbleSeller) {
                        events.marbleSeller = 3;
                        Engine.insert(120938, 'eventMarbleSeller');
                    }

                    if (!events.travellingScholars) {
                        events.travellingScholars = 1;
                        Engine.insert($rootScope.STEPSPERDAY * 30, 'loadImportantEvent', ['travellingScholars']);
                    }
                    if ($rootScope.itemList.builderHut.max) {
                        delete $rootScope.itemList.builderHut.max;
                    }

                    if (!events.fishingCommunity) {
                        events.fishingCommunity = true;
                        Engine.insert($rootScope.STEPSPERDAY * 15, 'loadImportantEvent', ['fishingCommunityHelp']);
                    }

                    events.isTown = 1;
                },
                unlocks: ['clockTower']
            }, {
                prefix: 'City',
                noun: 'city',
                bg: 'city',
                requirements: {
                    workers: 3000,
                    porcelainTower: 1,
                    taxCenter: 1,
                    cityGuardHQ: 1,
                    clockTower: 1
                },
                rewardString: 'the ultimate stage of a permanent settlement; becoming a city grants us more influence to compete with other factions, improved military status, and attract even more investors',
                onAchieve: function() {
                    $rootScope.world.home.bg = 'city';
                    var events = $rootScope.player.events;
                    events.isCity = 1;
                }
            }];

            function recordjobExpense(job, expense) {
                if (!job.monthlyExpenditure) {
                    job.monthlyExpenditure = {};
                }

                for (var k in expense) {
                    if (!isNaN(expense[k])) {
                        if (!job.monthlyExpenditure[k]) {
                            job.monthlyExpenditure[k] = expense[k];
                        } else {
                            job.monthlyExpenditure[k] += expense[k];
                        }
                    } else {
                        console.log('error, NaN found in expense', k, job);
                    }
                }
            }

            function recordjobOutput(job, output) {
                if (!job.monthlyOutput) {
                    job.monthlyOutput = {};
                }
                for (var k in output) {
                    if (!isNaN(output[k])) {
                        if (!job.monthlyOutput[k]) {
                            job.monthlyOutput[k] = output[k]
                        } else {
                            job.monthlyOutput[k] += output[k]
                        }
                    } else {
                        console.log('error, NaN found in output', k, job);
                    }
                }
            }

            var home = {
                //the actual build, this is called when a building is complete
                build: function(items) {
                    var self = this;
                    if (typeof(items) == 'string') {
                        items = [items];
                    }

                    for (var i = 0; i < items.length; i++) {
                        var _b = $rootScope.itemList[items[i]];

                        if (_b && _b.type == "building") {
                            var building = _b;

                            var name;

                            if (building.unlocks) {
                                Player.unlock(building.unlocks);
                            }

                            if (building.type == 'building') {
                                if (building.category == "Special") {
                                    name = building.name;
                                } else {
                                    name = $rootScope.fns.genName(building);
                                }
                                building.instances.push({
                                    id: building.id + "_" + building.totalMade,
                                    hp: building.resistance,
                                    name: name,
                                    effects: $.extend({}, building.effects)
                                });
                                building.created++;
                                building.totalMade++;
                            }
                            if (building.onBuild) {
                                building.onBuild();
                            }
                            if (building.effects) {
                                self.effect(building.effects);
                            }

                            $rootScope.itemList.sector_civil.exp += (building.builders * 100);

                            var msg = "Construction of " + building.name + " complete (+" + building.builders * 100 + " Civil Exp)";
                            Engine.log(msg);
                            Engine.createNotification(msg, 'building');
                            /*if ($rootScope.player.settings.alertBuildingComplete) {
                                Engine.createNotification(msg);
                            }*/
                        }
                    }
                },
                destroy: function(itemid) {
                    var self = this;
                    var building = $rootScope.itemList[itemid];
                    if (building.instances.length > 0) {


                        var worst = building.instances[0];
                        for (var j = 1; j < building.instances.length; j++) {
                            var bi = building.instances[j];
                            if (bi.hp < worst.hp) {
                                worst = bi;
                            }
                        }

                        self.destroyBuilding(worst);

                        //is one of these buildings a repair in the project queue? if scope, remove it.
                        /*
                        var destroyed = false;
                        for (var i in $rootScope.world.home.projectQueue) {
                            var project = $rootScope.world.home.projectQueue[i];
                            if (project.buildingId == scope.building.id && project.type == 'repair' && !destroyed) {
                                $rootScope.world.home.projectQueue.splice(i, 1);
                                destroyed = true;
                            }
                        }

                        building.created = building.instances.length;

                        if (building.effects) {
                            self.effect(building.effects);
                        }

                        if (building.overallHP < building.maxHP) {
                            building.overallHP = (0.8 + Math.random() * 0.2) * building.maxHP;
                        }
                        var msg = 'A ' + building.name + ' has collapsed from structural damage';

                        Engine.log(msg);
                        Engine.createNotification(msg);
                        */
                    }

                },
                addFestival: function(name, day, moon) {
                    var self = this;
                    var festivals = $rootScope.world.home.festivals;
                    if (festivals.length < $rootScope.world.home.maxFestivals && festivals.indexOf(festivalObj) < 0) {
                        if (moon < $rootScope.season.curMonth || (moon == $rootScope.season.curMonth && day <= $rootScope.season.curDay)) {
                            //find next year - 

                            while (moon <= $rootScope.season.curMonth) {
                                moon += 12;
                            }

                        }
                        var festivalObj = {
                            name: name,
                            day: day,
                            moon: moon,
                            active: true
                        }

                        festivals.push(festivalObj);
                        self.sortFestivals();
                        return true;
                    } else {
                        console.log('festival already exists or max festivals reached');
                        return false;
                    }
                },
                getFestival: function(moon, day) {
                    for (var i = 0; i < $rootScope.world.home.festivals.length; i++) {
                        var festival = $rootScope.world.home.festivals[i];
                        if (festival.moon == moon && festival.day == day) {
                            return festival;
                        }
                    }
                    return null;
                },
                removeFestival: function(moon, day) {
                    if (moon && day) {
                        var festival = this.getFestival(moon, day);
                        if (festival) {
                            festival.toBeRemoved = true;
                        } else {
                            console.log("no festivals on " + day + ", " + moon);
                        }
                    }
                },
                isFestival: function(moon, day) {
                    var ret = false;
                    var festival = this.getFestival(moon, day);
                    if (festival) {
                        return festival;
                    }
                    return false;
                },
                eatFood: function() {
                    var self = this;
                    var player = $rootScope.player;
                    var home = $rootScope.world.home;

                    var curMonthlyReport = $rootScope.world.council.monthlyReports[$rootScope.season.curMonth] || {
                        i: {},
                        o: {}
                    };

                    //food - food is consumed at the base rate of 6/person/day including player. if food is not availabe, awesomeness goes down
                    var numEaters = home.curWorkers + 2; //player and abby

                    if ($rootScope.itemList.masonMonty.unlocked) {
                        numEaters++;
                    }
                    if ($rootScope.itemList.masonMarky.unlocked) {
                        numEaters++;
                    }
                    if ($rootScope.itemList.masonMarla.unlocked) {
                        numEaters++;
                    }
                    if ($rootScope.itemList.masonMoe.unlocked) {
                        numEaters++;
                    }
                    if ($rootScope.itemList.masonMeow.unlocked) {
                        numEaters++;
                    }

                    var foodReq = {
                        food: (home.foodConsumptionRates[home.consumeFoodRate] * numEaters) / 2 //2 meals a day.
                    };

                    $rootScope.player.dailyConsumables.food = foodReq.food * 2 //2 meals a day

                    if (!Player.canAfford(foodReq)) {
                        player.consecutiveNoFood++;
                        foodReq.food = home.curFood;
                        if (player.consecutiveNoFood > 6) {
                            player.foodAwesomeness = Math.max(-1 * player.consecutiveNoFood, -90);
                        }
                        //first starve, Abby time
                        if (!$rootScope.importantEvent.firstStarve.used) {
                            $rootScope.importantEvent.load('firstStarve');
                        }

                        curMonthlyReport.daysHungry = curMonthlyReport.daysHungry ? curMonthlyReport.daysHungry + 1 : 1;


                    } else {
                        player.foodAwesomeness = Math.ceil($rootScope.player.foodVariety * $rootScope.player.foodVariety / 2) * home.consumeFoodRate;
                        if (player.consecutiveNoFood > 0) {
                            player.consecutiveNoFood -= 2;
                        } else if (player.consecutiveNoFood < 0) {
                            player.consecutiveNoFood = 0;
                        }
                    }
                    Player.pay(foodReq);


                },
                burnWood: function() {
                    var firewoodNeeds = 0;
                    var player = $rootScope.player;
                    var root = $rootScope;
                    var home = root.world.home;
                    if (root.season.curSeason == 'Winter') {
                        firewoodNeeds = Math.floor(0.5 * home.curWorkers);
                    } else if (root.season.curSeason == 'Spring' || root.season.curSeason == 'Autumn') {
                        firewoodNeeds = Math.floor(0.2 * home.curWorkers);
                    }

                    $rootScope.player.dailyConsumables.firewood = firewoodNeeds;

                    if (!Player.canAfford({
                            firewood: firewoodNeeds
                        })) {
                        player.diseaseFromColdChance++;
                    } else {
                        if (player.diseaseFromColdChance >= 3) {
                            player.diseaseFromColdChance -= 3;
                        } else {
                            player.diseaseFromCldChance = 0;
                        }
                        Player.pay({
                            firewood: firewoodNeeds
                        });
                    }

                },
                checkCanLevel: function() {
                    //check requirements towards next level of town
                    var home = $rootScope.world.home;
                    if (!home.canLevelUp) {
                        var nextlevel = levels[home.level + 1];

                        if (nextlevel) {
                            home.nextlevel = nextlevel;
                            if (Player.meetsRequirements(nextlevel.requirements)) {

                                //call the town up event
                                //$rootScope.importantEvent.load('townUp');
                                //home.canLevelUp = true; //set flag to true
                                //Engine.insertToLog('home.canLevelUp now true');

                                //level up the town right away
                                this.levelUp();
                            }
                        }

                    } else {
                        //check if the town crier is in the people's tab
                    }

                },
                generateGoods: function() {
                    var goods = [];

                    var root = $rootScope;
                    var player = root.player;

                    var canMakeMead = root.itemList.brewingMead.unlocked;
                    var canMakeWine = root.itemList.makingWine.unlocked;
                    var canMakeCake = root.itemList.bakingCake.unlocked;
                    var canMakeCandles = root.itemList.makingCandles.unlocked;

                    var hasExoticSpice = (player.inventory.exoticSpices && player.inventory.exoticSpices > home.curWorkers / 4);


                    if (canMakeMead && Math.random() < 0.8) {
                        goods.push("mead");
                    }
                    if (canMakeWine && Math.random() < 0.8) {
                        goods.push("wine");
                    }
                    if (canMakeCake && Math.random() < 0.8) {
                        goods.push("cake");
                    }
                    if (canMakeCandles && Math.random() < 0.8) {
                        goods.push("candle");
                    }

                    if (root.itemList.orchardist.number > 8 && Math.random() < 0.35) {
                        goods.push("fruit");
                    }

                    if (root.itemList.cheeseFarmer.number > 8 && Math.random() < 0.35) {
                        goods.push("cheese");
                    }

                    if (root.itemList.baker.number > 8 && Math.random() < 0.35) {
                        goods.push("bread");
                    }

                    if (root.itemList.butcher.number > 6 && Math.random() < 0.35) {
                        goods.push("meat");
                    }

                    if (root.itemList.vegetableFarmer.number > 8 && Math.random() < 0.35) {
                        goods.push("vegetable");
                    }

                    return goods;
                },
                levelUp: function() {
                    var home = $rootScope.world.home;
                    home.level++;
                    var level = levels[home.level];
                    level.onAchieve();

                    if (level.unlocks) {
                        Player.unlock(level.unlocks);
                    }

                    home.name = level.prefix + ' of ' + home.placeName;

                    $rootScope.fns.calcSpaceAvailable();
                    //get new name

                    try {
                        ga('send', 'event', 'Town Up', level.prefix + ' @ step ' + Math.round($rootScope.engine.curStep / 1000) * 1000);
                    } catch (e) {
                        console.log('google analytics not set up');
                    }

                },
                step: function() {
                    var root = $rootScope;
                    var player = $rootScope.player;
                    var home = $rootScope.world.home;
                    var self = this;
                    var STEPSPERDAY = $rootScope.STEPSPERDAY;
                    var modDay = $rootScope.engine.curStep % STEPSPERDAY;
                    var modQuarterDay = $rootScope.engine.curStep % (STEPSPERDAY / 4);
                    var curDay = Math.floor($rootScope.engine.curStep / STEPSPERDAY);
                    var newDay = (modDay == 0);

                    var newNoon = (modDay == ~~(STEPSPERDAY / 2));

                    var quarterDay = (modQuarterDay == 0);

                    var newMorning = (modDay == ~~(STEPSPERDAY / 4));

                    var newEvening = (modDay == ~~(STEPSPERDAY * 3 / 4));

                    var newMonth = ($rootScope.engine.curStep % (STEPSPERDAY * 30) == 0);
                    var jobKeys = Object.keys(home.jobs);

                    var newYear = ($rootScope.engine.curStep % (STEPSPERDAY * 360) == 0);
                    if (newYear) {
                        //reset mat, retirement counts for the new year.
                        $rootScope.world.home.nat.matThisYear = 0;
                        $rootScope.world.home.nat.retThisYear = 0;
                    }

                    if (newDay) {
                        if (newMonth) {
                            //clear task output and expenditure

                            angular.forEach($rootScope.allTasks, function(task) {
                                if (task.monthlyOutput) {
                                    task.monthlyOutput = {};
                                }
                                if (task.monthlyExpenditure) {
                                    task.monthlyExpenditure = {};
                                }
                            });

                            home.monthlyFinances = [];

                            //spoilage
                            var spoilageCost = {};
                            angular.forEach(home.spoilage, function(pct, itemid) {
                                var amt = ~~(pct * Player.count(itemid));
                                if (amt > 0) {
                                    spoilageCost[itemid] = amt;
                                }
                            });
                            Player.pay(spoilageCost);

                            if (!$rootScope.importantEvent.explainSpoilage.used) {
                                $rootScope.importantEvent.load('explainSpoilage');
                            }

                            //calculate the newest cityPenalty
                            if (home.curWorkers < 100) {
                                player.citySizeAwesomeness = 0;
                            } else {
                                player.citySizeAwesomeness = 15 - Math.floor(Math.sqrt(home.curWorkers / 2000) * 15);
                            }


                            //buildings with monthly recurring costs
                            angular.forEach($rootScope.serviceBuildings, function(building, buildingid) {

                                if (building.setToRun) {
                                    if (Player.canAfford(building.monthlyOperatingCost)) {
                                        Player.pay(building.monthlyOperatingCost);
                                        building.running = true;
                                    } else {
                                        building.running = false;
                                        building.setToRun = false;
                                    }
                                } else {
                                    building.running = false;
                                    building.setToRun = false;
                                }

                            });
                            //Taxes
                            if ($rootScope.itemList.taxCenter.instances.length > 0) {
                                var taxCenter = $rootScope.itemList.taxCenter;
                                taxCenter.curRate = taxCenter.nextRate;
                                var amt = taxCenter.curRate * home.curWorkers * $rootScope.TAXCENTERBASE;
                                Player.insertInventory({
                                    gold: amt
                                });

                                var msg = $rootScope.fns.convertToCurrency(amt, true, true) + " was collected for taxes";
                                Engine.createNotification(msg, 'monthlyFinance');
                                Engine.log(msg);
                                home.monthlyFinances.push({
                                    name: "Taxes",
                                    amount: amt
                                });
                            }

                            //CityGuardHQ
                            if ($rootScope.itemList.cityGuardHQ.instances.length > 0) {
                                var cityGuardHQ = $rootScope.itemList.cityGuardHQ;
                                cityGuardHQ.curBudgetLevel = cityGuardHQ.nextMonthLevel;

                                var amt = cityGuardHQ.budgetLevels[cityGuardHQ.curBudgetLevel].gold * home.curWorkers;
                                if (amt > 0) {
                                    var cost = {
                                        gold: amt
                                    }
                                    if (Player.canAfford(cost)) {
                                        Player.pay(cost);
                                        var msg = $rootScope.fns.convertToCurrency(amt, true, true) + " was paid to run the City Guard";
                                        home.monthlyFinances.push({
                                            name: "City Guard",
                                            amount: -amt
                                        });
                                    } else {
                                        cityGuardHQ.curBudgetLevel = 0;
                                        var msg = "Due to insufficient funds, the City Guards will not be operating this Moon";
                                    }

                                    Engine.log(msg);
                                    Engine.createNotification(msg, 'MonthlyFinance');
                                }
                            }

                            //Inn
                            if ($rootScope.itemList.inn.instances.length > 0) {
                                //we've built an inn!

                                var money = {
                                    gold: Math.round(20 * home.curWorkers * 30 * ((1 + Math.random()) / 10))
                                }

                                Player.insertInventory(money);
                                var msg = "The Inn added " + $rootScope.fns.convertToCurrency(money.gold, true, true) + " to our coffers";
                                home.monthlyFinances.push({
                                    name: "The Inn",
                                    amount: money.gold
                                });
                                Engine.log(msg);
                                Engine.createNotification(msg, 'monthlyFinance');
                            }

                            //Hospital
                            if ($rootScope.itemList.hospital.instances.length > 0) {
                                var hospital = $rootScope.itemList.hospital;
                                hospital.curBudgetLevel = hospital.nextMonthLevel;
                                var amt = hospital.budgetLevels[hospital.curBudgetLevel].gold * home.curWorkers;
                                if (amt > 0) {
                                    var cost = {
                                        gold: amt
                                    }
                                    if (Player.canAfford(cost)) {
                                        Player.pay(cost);
                                        var msg = $rootScope.fns.convertToCurrency(amt, true, true) + " was paid for running the Hospital";
                                        home.monthlyFinances.push({
                                            name: "Hospital",
                                            amount: -amt
                                        });
                                    } else {
                                        hospital.curBudgetLevel = 0;
                                        var msg = "Due to insufficient funds, the Hospital will not be operating this Moon";
                                    }

                                    Engine.log(msg);
                                    Engine.createNotification(msg, 'monthlyFinance');
                                }
                            }

                            //troops
                            $rootScope.fns.updateTotalMilitaryUnits();

                            var amt = $rootScope.player.totWarriors * $rootScope.WARRIORUPKEEP + $rootScope.player.totArchers * $rootScope.ARCHERUPKEEP;

                            if (amt > 0) {
                                var cost = {
                                    gold: amt
                                }
                                if (Player.canAfford(cost)) {
                                    Player.pay(cost);
                                    home.notEnoughMilitaryFunding = false;
                                } else {
                                    home.notEnoughMilitaryFunding = true;
                                }
                            }

                            //Gather Tributes
                            Engine.insert(10, 'gatherTributes');

                            //check if it's the new year
                            if (newYear) {
                                //remove the festivals set to be removed
                                var festivals = $rootScope.world.home.festivals;
                                for (var i = 0; i < festivals.length; i++) {
                                    var festival = festivals[i];
                                    if (festival.toBeRemoved) {
                                        festivals.splice(i, 1);
                                        i--;
                                    }
                                }
                            }
                            //update food
                            var home = $rootScope.world.home;
                            home.curFood = 0;
                            for (var key in home.foodStore) {
                                if (home.foodStore.hasOwnProperty(key)) {
                                    home.curFood += home.foodStore[key];
                                }
                            }

                            //more medicine crates for the council hall maybe

                            if ($rootScope.itemList.socialHealthcare.unlocked) {
                                if (Math.random() < 0.4) {
                                    $rootScope.itemList.socialHealthcare.cratesAvailabile += 1;
                                }
                            }
                            //start new monthly report

                            if (!root.world.council.monthlyReports[root.season.curMonth]) {
                                root.world.council.monthlyReports[root.season.curMonth] = {
                                    i: {},
                                    o: {}
                                };
                            }
                        } //end newMonth

                        if (curDay % 5 === 0) {
                            //collect local taxes
                            if ($rootScope.itemList.taxes.unlocked) {
                                Player.insertInventory({
                                    gold: $rootScope.world.home.curWorkers * $rootScope.itemList.taxes.rate
                                });
                            }
                        }


                        $rootScope.player.dailyConsumables = {};

                        self.eatFood(); //eat food - first meal

                        self.burnWood(); //burn wood for heat

                        self.ageBuildings();

                        if ($rootScope.itemList.taxes.unlocked) {
                            //taxation
                            Player.insertInventory({
                                gold: $rootScope.itemList.taxes.rate * $rootScope.world.home.curWorkers
                            });
                        }

                        if (root.world.field.rodentInfestation > 0) {
                            root.world.field.rodentInfestation--;
                        }

                        if (root.itemList.vegetableFarmer.number > 18) {
                            //chance to start a rodent infestation
                            var chance = 0.001;
                            if (root.season.curSeason == 'Spring') {
                                chance += 0.0003;
                            } else if (root.season.curSeason == 'Summer') {
                                chance += 0.0002;
                            } else if (root.season.curSeason == 'Winter') {
                                chance -= 0.0005;
                            }

                            chance *= root.itemList.vegetableFarm.created; //linearly increase the chance of infestation

                            if (root.itemList.chickenWire.unlocked) {
                                chance /= 3;
                            }

                            if (Math.random() < chance) {
                                root.world.field.rodentInfestation += ~~(Math.random() * 10);
                                Engine.log('Rodents are invading our crops, yield will be lower for a while');
                            }
                        }

                        if ($rootScope.distributeMedicine && $rootScope.distributeMedicine.updateEfficacy) {
                            $rootScope.distributeMedicine.updateEfficacy();
                        }


                        //disease, or rather - the absence of disease
                        //chance of disease depends on # of people - greater population, greater chance of disease.
                        //chance = #workers/10000. If disease starts, there is a counter for number of days a disease stays
                        if ($rootScope.engine.curStep > $rootScope.STEPSPERDAY * 365) {
                            if (!home.diseased) {
                                var chanceToGetSick = (home.curWorkers + player.diseaseFromColdChance * 50) / 20000;

                                if (player.consecutiveNoFood >= 10) {
                                    chanceToGetSick += (player.consecutiveNoFood / 50);
                                }

                                if ($rootScope.itemList.hospital.instances.length > 0) {
                                    chanceToGetSick = chanceToGetSick * 0.3;
                                }
                                //apply hygiene
                                if ($rootScope.itemList.hygiene.unlocked) {
                                    //soap
                                    chanceToGetSick *= 0.9; //reduce by 10%
                                }

                                if (Math.random() < chanceToGetSick) {
                                    home.diseased = true;
                                    home.infected = Math.ceil(Math.random() * Math.min(home.curWorkers / 3, 6));
                                    home.consecutiveDiseased = 0;
                                    var msg = 'Disease! Somebody in your town has a contagious disease, and if not taken care of, can spread';
                                    Engine.log(msg);
                                    Engine.createNotification(msg, 'disease');
                                }
                                player.healthAwesomeness = 5;
                            } else {
                                home.consecutiveDiseased++;

                                if ($rootScope.itemList.hospital.instances.length > 0 && $rootScope.itemList.hospital.curBudgetLevel > 0) {
                                    var medicineNeeded = Math.min(home.infected, $rootScope.player.inventory.medicine, $rootScope.itemList.nurse.number * 10);
                                    if (medicineNeeded > 0) {
                                        $rootScope.distributeMedicine.amount = medicineNeeded;
                                        var msg = $rootScope.distributeMedicine.set();
                                        Engine.log(msg);
                                        Engine.createNotification(msg, 'disease');
                                    }

                                }

                                var chanceToSpread = 0.125;
                                if (home.infected >= home.curWorkers) {
                                    chanceToSpread = 0;
                                    home.infected = home.curWorkers;
                                }
                                if ($rootScope.itemList.hospital.instances.length > 0) {
                                    chanceToSpread = chanceToSpread * 0.3;
                                }
                                if (Math.random() < chanceToSpread) {
                                    //we need a way to limit the spread in huge cities
                                    if (home.infected > 650) {
                                        home.infected = Math.round((Math.random() * 0.6 + 1) * home.infected);
                                    } else {
                                        home.infected = ~~(home.infected * 1.67 + 1);
                                        if (home.infected > (home.curWorkers - home.workersAway)) {
                                            home.infected = home.curWorkers - home.workersAway;
                                        }
                                    }
                                    if (!$rootScope.importantEvent.firstSick.used) {
                                        $rootScope.importantEvent.load('firstSick');
                                    }
                                    Engine.log('The disease has spread to more people, we will need to control the situation before everybody dies');
                                }

                                var chanceToDie = 0.05;
                                if ($rootScope.itemList.balancedDiet.unlocked && $rootScope.player.foodVariety > 3) {
                                    chanceToDie -= (0.05 * 0.25);
                                }

                                var infectedLen = home.infected >> 4;
                                var died = 0;
                                for (var i = 0; i < infectedLen; i++) {
                                    if (Math.random() < chanceToDie) {
                                        //worker dies
                                        home.infected--;
                                        Player.cullWorker();
                                        died++;
                                    }
                                }
                                if (died > 0) {
                                    var msg = died + ' workers has died from disease'
                                    Engine.log(msg);
                                    Engine.createNotification(msg, 'disease')
                                }

                                if (Math.random() < home.consecutiveDiseased * (0.02 + $rootScope.itemList.p_innoculation.running ? 0.01 : 0)) {
                                    if (home.infected < 4) { //natural healing
                                        home.infected = 0;
                                    } else {
                                        home.infected -= Math.ceil(Math.random() * home.infected / 5); //at most remove cure 20% of sick people, at least 1
                                    }
                                }
                                if (home.infected > home.curWorkers) {
                                    home.infected = home.curWorkers;
                                }

                                if (home.infected <= 0) {
                                    home.diseased = false;
                                    home.infected = 0;
                                    var civexpreward = 200 * home.consecutiveDiseased;

                                    home.consecutiveDiseased = 0;

                                    var msg = 'The disease is gone for now, but it may come back. ' + (
                                        civexpreward > 0 ? civexpreward + ' Civil exp has been rewarded for overcoming the epidemic' : '');

                                    $rootScope.itemList.sector_civil.exp += civexpreward;

                                    Engine.log(msg);
                                    //Engine.createNotification(msg);
                                }
                                player.healthAwesomeness = (-35 * home.infected / home.curWorkers | 0);
                            }

                        }


                        player.healthAwesomeness = player.healthAwesomeness +
                            (($rootScope.itemList.balancedDiet.unlocked && $rootScope.player.foodVariety > 3) ? 5 : 0) +
                            (($rootScope.itemList.hospital.instances.length > 0 ? $rootScope.itemList.hospital.budgetLevels[$rootScope.itemList.hospital.curBudgetLevel].health : 0));


                        /* disable building hp
                        //Randomly pick a building?
                        if (!self.buildingList) {
                            self.buildingList = [];
                            angular.forEach($rootScope.itemList, function(item, index) {
                                if (item.type == 'building') {
                                    self.buildingList.push(item);
                                }
                            });
                        }

                        if (Math.random() < 0.5) {
                            var randBuilding = self.buildingList[(Math.random() * self.buildingList.length | 0)];
                            if (randBuilding.created > 0) {
                                randBuilding.overallHP -= Math.random() * randBuilding.created;

                                if (Math.random() < randBuilding.overallHP / randBuilding.maxHP) {
                                    Engine.insert((Math.random() * 800 | 0), 'destroyBuilding', [randBuilding.id]);
                                }
                            }
                        }*/

                        if ($rootScope.itemList.barracks.created < 1) {
                            if ($rootScope.itemList.homeZone.immunity < 100) {
                                $rootScope.itemList.homeZone.immunity = 100;
                            }

                        } else {
                            if ($rootScope.itemList.homeZone.immunity > 0) {
                                $rootScope.itemList.homeZone.immunity--;
                            }
                        }

                        this.calcAttractiveness();
                        //update the awesomeness of the place
                        Player.updateAwesomeness();
                    }

                    if (newMorning) {

                        //count number of people to determine number of dreams dreamt.

                        var dreamsDreamt = home.curWorkers * 4;

                        var curMonthlyReport = root.world.council.monthlyReports[root.season.curMonth] || {
                            i: {},
                            o: {}
                        };

                        curMonthlyReport.dreamsDreamt = curMonthlyReport.dreamsDreamt ? curMonthlyReport.dreamsDreamt + dreamsDreamt : dreamsDreamt;

                        //check for festivals
                        if (home.festivals.length > 0) {
                            for (var i = 0; i < home.festivals.length; i++) {
                                var festival = home.festivals[i];
                                if (festival.moon == root.season.curMonth && festival.day == root.season.curDay) {
                                    if (festival.active) {
                                        if (Player.canAfford(festival.cost)) {
                                            //today's the day!
                                            Player.pay(festival.cost);
                                            if (!home.inFestival) {
                                                home.inFestival = 0;
                                            }
                                            home.inFestival += 20; //20 days of festive spirits
                                            player.events.festivalsSucceded = player.events.festivalsSucceded || 0;
                                            player.events.festivalsSucceded++;
                                            Engine.insert(100, 'loadImportantEvent', ['abbyFestival', festival.name]);
                                        } else {
                                            player.events.festivalsFailed = player.events.festivalsFailed || 0;
                                            player.events.festivalsFailed++;
                                            if (player.events.festivalsFailed < 4) {
                                                Engine.insert(100, 'loadImportantEvent', ['abbyFestivalFailed', festival.name]);
                                            }
                                        }
                                        self.setNextFestival(festival);
                                    }
                                } else if (festival.moon == root.season.curMonth + 2 && festival.day == root.season.curDay) {
                                    //only 2 months away, council has to set the requirements for the festival (the cost)


                                    var weightings = {
                                        mead: {
                                            w: 3,
                                            a: 7
                                        },
                                        wine: {
                                            w: 4,
                                            a: 5
                                        },
                                        cake: {
                                            w: 6,
                                            a: 3
                                        },
                                        candle: {
                                            w: 8,
                                            a: 4
                                        },
                                        fruit: {
                                            w: 6,
                                            a: 74
                                        },
                                        meat: {
                                            w: 6,
                                            a: 74
                                        },
                                        cheese: {
                                            w: 6,
                                            a: 68
                                        },
                                        bread: {
                                            w: 6,
                                            a: 84
                                        },
                                        vegetable: {
                                            w: 6,
                                            a: 84
                                        }
                                    };


                                    var goods = [];
                                    var attempts = 0;
                                    while (goods.length < 2 && attempts < 8) {
                                        attempts++;
                                        goods = self.generateGoods();
                                    }

                                    if (goods.length >= 2) {
                                        //hurray, council has deemed the festival to have stuff
                                        festival.cost = {};
                                        var w = 0;

                                        while (w < home.curWorkers) {
                                            var rand = Math.floor(Math.random() * goods.length);
                                            var good = goods[rand];
                                            if (good && !festival.cost[good]) {
                                                festival.cost[good] = 0;
                                            }
                                            if (weightings[good]) {
                                                festival.cost[good] += weightings[good].a;
                                                w += weightings[good].w;
                                            } else {
                                                console.log('weightings failed for ', good);
                                            }

                                        }

                                        //round out the amounts
                                        angular.forEach(festival.cost, function(amount, itemid) {
                                            festival.cost[itemid] = Math.round(amount / 5) * 5;
                                        });
                                        festival.costSet = true;

                                        Engine.insert(100, 'loadImportantEvent', ['festivalCostSet', {
                                            festivalName: festival.name,
                                            festivalCost: festival.cost
                                        }]);
                                    } else {
                                        //boo, council is cancelling the festival this year, it will be postponed
                                        self.setNextFestival(festival);
                                        Engine.insert(100, 'loadImportantEvent', ['festivalNotOption', festival.name]);
                                        festival.costSet = false;
                                    }

                                }
                            }
                        }

                        //update quests
                        if (player.quests) {
                            for (var i in player.quests) {
                                var quest = player.quests[i];
                                if (quest.daysRemaining == 0) {
                                    $rootScope.fns.removeQuest(quest.id);
                                } else {
                                    quest.daysRemaining--;
                                }
                            }
                        }


                    } //new morning

                    if (newNoon) {
                        var self = this;

                        //anyone coming of age
                        if (home.nat.matThisYear < home.nat.matRate * home.curWorkers && $rootScope.engine.curStep > $rootScope.STEPSPERDAY * 180) {
                            if (Math.random() < home.nat.matRate) {
                                //add a new worker
                                Engine.insert(100, 'comesOfAge');
                            }
                        }

                        if (home.nat.retThisYear < home.nat.retRate * home.curWorkers && $rootScope.engine.curStep > $rootScope.STEPSPERDAY * 360) {
                            if (Math.random() < home.nat.retRate) {
                                //removes a worker
                                Engine.insert(100, 'retirement');
                            }
                        }

                        //crime
                        self.calcCrime();

                        player.threatAwesomeness = Math.round(-home.crime);
                        if (home.crime > 0) {
                            var crimes = ['pettyTheft', 'vandalism', 'arson', 'foodTheft'];

                            for (var _c = 0; _c < home.crime; _c++) {
                                if (Math.random() < 0.01) {
                                    var crime = $rootScope.fns.pickOne(crimes);
                                    switch (crime) {
                                        case 'pettyTheft':
                                            var stoleAmt = Math.min(Math.round(108 + Math.random() * 1000), $rootScope.player.gold);
                                            Player.pay({
                                                gold: stoleAmt
                                            });
                                            Engine.log('A thief stole ' + $rootScope.fns.convertToCurrency(stoleAmt, true, true)) + ' from you';
                                            break;
                                        case 'vandalism':

                                            break;
                                        case 'arson':

                                            break;
                                        case 'foodTheft':

                                            break;
                                    }
                                }
                            }
                        }

                        /*if (home.nat.clothesThisMonth < home.nat.clothesRate * home.curWorkers && $rootScope.engine.curStep > 18000) {
                            if (Math.random() < home.nat.clothesRate) {
                                //remove fur
                                var furCost = {
                                    fur: 10
                                };
                                if (Player.canAfford(furCost)) {
                                    Player.pay(furCost);
                                } else {
                                    Engine.log('10 furs were needed to make a new outfit... guess somebody is going to have to make do with rags');
                                }
                            }
                        }*/

                        //goods buyer contracts
                        var contractsCompleted = $rootScope.player.events.goodsContractsCompleted;


                        var l = Math.min(Math.ceil(contractsCompleted / 10), 4) + 1;
                        for (var i = 0; i <= l; i++) {
                            if (Math.random() < 0.02) {
                                Engine.insert(10, 'eventGoodsBuyer', null, true);
                            }

                            if (Math.random() < 0.02) {
                                Engine.insert(10, 'eventGoodsSeller', null, true);
                            }
                        }

                        //workers with onNewDay
                        angular.forEach($rootScope.world.home.jobs, function(job, jobid) {
                            if (job.onNewDay) {
                                job.onNewDay();
                            }
                        });

                        self.eatFood(); //eat food - second meal


                        self.checkCanLevel();

                    } //new noon

                    if (quarterDay) {
                        //quarter day madness.

                        if (home.level <= 1) {
                            //what kind of threats?

                            //wolf attack
                            if (home.curWorkers > 0) {
                                if (Math.random() < 0.005) {
                                    var targets = ['hunter', 'lumberjack', 'bum', 'splitter', 'lumberMiller', 'builder']
                                    var killed = false,
                                        i = 0;
                                    while (!killed) {
                                        var j = root.itemList[targets[i]];
                                        if (j.number > 0) {
                                            killed = true;
                                            Player.cullWorker(targets[i], 1, false);
                                            var msg = "A " + j.name + " was attacked by a pack of wolves and died";
                                            Engine.log(msg);
                                            Engine.createNotification(msg, "wolfAttack");
                                        }
                                        i++;
                                    }
                                } else if (Math.random() < 0.005) {
                                    var targets = ['lumberMiller', 'hunter', 'splitter', 'builder', 'bum']
                                    var killed = false,
                                        i = 0;
                                }
                            }
                        } else {
                            if (home.level >= 3 && home.curWorkers > 200 && Math.random() < 0.0001 * home.curWorkers / 3) {
                                $rootScope.fns.procAccident();
                            }
                        }
                    }

                    //workers
                    var unemployed = $rootScope.itemList.bum;

                    for (var i = 0; i < jobKeys.length; i++) {
                        var jobid = jobKeys[i];
                        var job = home.jobs[jobid];
                        if (!job.noprocess) {
                            job.busy = true;
                            if (job.number > 0) {
                                if (!job.curStep) {
                                    job.curStep = 0;
                                }
                                if (job.idle) {
                                    job.idle = 0;
                                }
                                if ((job.curStep == 0 && job.curStatus != 3) || (job.curStep == 0 && newDay)) {
                                    job.paid = false;
                                    if (job.preconditions === undefined || $rootScope.evalPreconditions(job.preconditions)) {
                                        if (job.cost) {
                                            var realCost = {};

                                            var numBatches = job.number;

                                            if (!job.type2) {
                                                //what is the largest batch we can afford?
                                                for (var ic in job.cost) {
                                                    var amt = Player.count(ic);
                                                    var batchSize = Math.floor(amt / job.cost[ic]);

                                                    if (batchSize < numBatches) {
                                                        numBatches = batchSize;
                                                    }
                                                }

                                                for (var ic in job.cost) {
                                                    realCost[ic] = job.cost[ic] * numBatches;
                                                }

                                                job.curBatchSize = numBatches;
                                            } else {
                                                realCost = job.cost;
                                                job.curBatchSize = 1;
                                            }

                                            if (Player.canAfford(realCost) && job.curBatchSize > 0) {
                                                Player.pay(realCost);
                                                recordjobExpense(job, realCost);

                                                if (job.id == 'lumberjack') {
                                                    if (!player.treesCut) {
                                                        player.treesCut = 0;
                                                    }
                                                    player.treesCut += realCost.trees;
                                                }

                                                job.paid = true;
                                                job.lastRealCost = realCost;
                                                if (job.type2) {
                                                    job.nextProducts = $.extend({}, job.products);
                                                } else {
                                                    job.nextProducts = {};
                                                    for (var ip in job.products) {
                                                        job.nextProducts[ip] = Math.round(job.products[ip] * job.curBatchSize);
                                                    }

                                                    if (job.id == 'vegetableFarmer') {
                                                        if (root.season.curSeason == 'Winter' && root.itemList.greenhouse.unlocked) {
                                                            for (var ip in job.nextProducts) {
                                                                job.nextProducts[ip] = ~~(job.nextProducts[ip] * 0.75);
                                                            }
                                                        }
                                                        if (root.world.field.rodentInfestation) {
                                                            var modifier = 0.25;
                                                            if (root.itemList.chickenWire.unlocked) {
                                                                modifier = 0.75;
                                                            }
                                                            for (var ip in job.nextProducts) {
                                                                job.nextProducts[ip] = ~~(job.nextProducts[ip] * modifier);
                                                            }
                                                            job.extras = "Rodents are damaging crops, yields are down to " + Math.round(modifier * 100) + "%";
                                                        } else {
                                                            job.extras = null;
                                                        }


                                                    } else if (job.id == 'hunter' && root.world.forest.curAnimals < 1000) {
                                                        if (root.itemList.hunter.number >= 20) {
                                                            if (!root.itemList.hunter.lastRaid) {
                                                                root.itemList.hunter.lastRaid = 1;
                                                            }
                                                            if (Math.random() < 0.001 * root.itemList.hunter.lastRaid && root.itemList.hunter.lastRaid > 40) {
                                                                //trigger a raid
                                                                root.itemList.hunter.lastRaid = 0;
                                                                Engine.insert(200, 'eventhuntingRaid');
                                                                root.world.forest.curAnimals += ~~(root.itemList.hunter.number * 2 * Math.random()); //obfuscate where the animals came from
                                                                job.nextProducts = {}; //clear the products
                                                            } else {
                                                                root.itemList.hunter.lastRaid++;
                                                            }
                                                        }
                                                    } else if (job.id == 'orchardist' && root.itemList.winterBerry.unlocked && root.season.curSeason == 'Winter') {
                                                        for (var i in job.nextProducts) {
                                                            job.nextProducts[i] = ~~(job.nextProducts[i] * 1.5);
                                                        }
                                                    } else if (job.id == 'beeKeeper') {
                                                        if (player.events.enemyOfXimni) {
                                                            for (var ip in job.nextProducts) {
                                                                job.nextProducts[ip] = Math.floor(job.nextProducts[ip] / 2);
                                                            }

                                                            if (Math.random() < 0.01) {
                                                                //1% chance of colony collapse
                                                                Engine.insert(50, 'loadImportantEvent', ['colonyCollapse']);
                                                            }
                                                            if (Math.random() < 0.005 && !$rootScope.itemList.blessingSwarm.unlocked) {
                                                                //0.5% chance of study
                                                                if ($rootScope.itemList.masonMarky.unlocked) {

                                                                }
                                                            }
                                                        }
                                                    } else if (job.id == 'plantTrees') {
                                                        if (!player.treesPlanted) {
                                                            player.treesPlanted = 0;
                                                        }
                                                        player.treesPlanted += job.nextProducts.trees;
                                                    }
                                                }

                                                if (job.id == 'rancher') {
                                                    var multiplier = (1 + Math.sqrt(root.world.field.curlivestock) / (root.itemList.ranch.instances.length * 20));
                                                    job.completionUnits = Math.round(job.maxStep * $rootScope.STEPSPERDAY * job.number * multiplier);

                                                    if (multiplier >= 5 && !player.events.breedinglivestockSlowReminder) {
                                                        player.events.breedinglivestockSlowReminder = 30;
                                                        Engine.createNotification('Breeding livestock is rather inefficient, perhaps there are too many for the breeders to handle.');
                                                        //Engine.insert('loadImportantEvent', 'breedinglivestockSlow');
                                                    } else {
                                                        if (player.events.breedinglivestockSlowReminder > 0)
                                                            player.events.breedinglivestockSlowReminder--;
                                                    }
                                                } else if (job.id == 'hunter') {
                                                    //more animals = less time to hunt
                                                    var numAnimals = Math.max(root.world.forest.curAnimals, 5);
                                                    var multiplier = (5000 / (numAnimals + 250));
                                                    job.completionUnits = Math.round(job.maxStep * $rootScope.STEPSPERDAY * job.number * multiplier);

                                                    if (multiplier > 5 && !player.events.huntingSlowReminder) {
                                                        player.events.huntingSlowReminder = 30;
                                                        Engine.createNotification('Hunting is extraordinarily slow, could it be the forest has far too few animals to hunt?');
                                                        //Engine.insert('loadImportantEvent', 'huntingSlow');
                                                    } else {
                                                        if (player.events.huntingSlowReminder > 0)
                                                            player.events.huntingSlowReminder--;
                                                    }
                                                } else if (job.id == 'lumberjack') {
                                                    var numTrees = Math.max(root.world.forest.curTrees, 5);
                                                    var multiplier = (35000 / (numTrees + 1750));
                                                    job.completionUnits = Math.round(job.maxStep * $rootScope.STEPSPERDAY * job.number * multiplier);

                                                    if (multiplier > 5 && !player.events.cuttingWoodSlowReminder) {
                                                        player.events.cuttingWoodSlowReminder = 30;
                                                        Engine.createNotification('Lumberjacks are taking a surprising amount of time with the logs, could deforestation be the issue?');
                                                        //Engine.insert('loadImportantEvent', 'cuttingWoodSlow');
                                                    } else {
                                                        if (player.events.cuttingWoodSlowReminder > 0)
                                                            player.events.cuttingWoodSlowReminder--;
                                                    }

                                                } else {
                                                    job.completionUnits = job.maxStep * $rootScope.STEPSPERDAY * job.number;
                                                }

                                            } else {
                                                job.paid = false;
                                            }
                                        } else {
                                            job.paid = true;
                                        }
                                        if (job.onStart && job.paid) {
                                            job.onStart();
                                        }
                                    } else {
                                        job.curStatus = 3; //off season
                                        //quit job?
                                        if (home.leaveTaskIfWrongSeason) {
                                            job.number--;
                                            unemployed.number++;
                                        }
                                    }
                                }
                                if (job.paid) {
                                    job.curStatus = 1; //currently working on it
                                    job.busy = true;
                                    if (!job.completionUnits) {
                                        job.completionUnits = job.maxStep * $rootScope.STEPSPERDAY * job.number;
                                    }
                                    if (job.curStep > job.completionUnits) {
                                        var products;

                                        if (job.nextProducts) {
                                            products = job.nextProducts;
                                        } else {
                                            products = {};
                                        }

                                        if (job.lootTable) {
                                            products = $rootScope.fns.procLoot(job.lootTable, job.number);
                                        }

                                        if (Player.hasCapacityFor(products) || job.disregardLimits) {

                                            Player.insertInventory(products, null, true);
                                            recordjobOutput(job, products);
                                            if (job.onComplete) {
                                                job.onComplete();
                                            }
                                            job.curStep = 0;
                                            job.progressPct = 0;
                                            job.paid = false;
                                            job.waitingForSpace = false;
                                        } else {
                                            job.waitingForSpace = true;
                                        }

                                    } else {
                                        job.curStep += home.workerEfficiency * job.number;

                                    }
                                } else {
                                    job.curStatus = 0; //not enough resources to do it
                                    job.busy = false;
                                }
                                if ($rootScope.engine.curStep % 5 == 0) {
                                    job.progressPct = Math.round(job.curStep * 1000 / job.completionUnits) / 10;
                                }

                                if (!job.busy) {
                                    job.busy = false;
                                }
                            } else {
                                job.curStatus = 2; //no workers doing this
                                job.busy = false;

                                if (job.curStep > 0) {
                                    if (job.idle) {
                                        job.idle++;
                                        if (job.idle > 600) {
                                            job.curStep = 0; //reset the job
                                            job.idle = 0;
                                        }
                                    } else {
                                        job.idle = 1;
                                    }
                                }
                            }


                        } else if (job.id == 'builder' && job.number > 0) {
                            if ($rootScope.world.home.projectQueue.length > 0) {
                                job.curStatus = 1;
                                job.progressPct = 100;
                                job.busy = true;
                            } else {
                                job.curStatus = 0;
                                job.progressPct = 0;
                                job.busy = false;
                            }
                        } else if (job.id == 'nurse' && job.number > 0) {
                            job.curStatus = 1;
                            job.progressPct = 100;
                            job.busy = true;
                        }

                    }

                    //progress towards new worker
                    if (home.maxWorkers > 0 || home.curWorkers > 0) {
                        player.curNewWorker += player.awesomeness;
                        if (player.curNewWorker >= player.maxNewWorker) {
                            if (home.curWorkers < home.maxWorkers && !player.blockNewWorker) {
                                this.newWorkers(1);
                                player.curNewWorker = 0;
                            } else {
                                player.curNewWorker = player.maxNewWorker;
                            }
                        }

                        if (player.curNewWorker < -player.maxNewWorker) {
                            if (home.curWorkers > 0) {
                                if (!$rootScope.importantEvent.firstWorkerLeave.used) {
                                    Engine.insert(100, 'loadImportantEvent', ['firstWorkerLeave']);
                                    //$rootScope.importantEvent.load('firstWorkerLeave');
                                }
                                Player.cullWorker(null); //remove a random worker

                                player.curNewWorker = 0;

                            } else {
                                player.curNewWorker = -player.maxNewWorker;
                            }
                        }

                        player.newWorkerProgPct = Math.min(Math.round(Math.abs(player.curNewWorker) * 100 / player.maxNewWorker), 100);

                    }

                    if (newDay && $rootScope.world.home.autoHire) {
                        var hiringQueue = [];

                        angular.forEach($rootScope.world.home.jobs, function(job, jobid) {
                            if (job.maxWorkers && job.number < job.maxWorkers) {
                                hiringQueue.push({
                                    jobid: job.id,
                                    slots: job.maxWorkers - job.number
                                })
                            }
                        });

                        if (hiringQueue.length > 0 && unemployed.number > 0) {
                            var hiringSlots = 0;
                            for (var i = 0; i < hiringQueue.length; i++) {
                                hiringSlots += hiringQueue[i].slots;
                            }
                            var jobs = $rootScope.fns.pickWeightedRand(hiringQueue, 'slots', Math.min(unemployed.number, hiringSlots));

                            for (var t = 0; t < jobs.length; t++) {
                                self.hireJob($rootScope.itemList[jobs[t].jobid], 1);
                            }
                        }


                    }


                    if (home.maxWorkers > 10 && home.curWorkers > 0) {
                        player.spaceAwesomeness = 15 - (Math.abs(home.curWorkers / home.maxWorkers - 0.75) * 40);
                        if (player.spaceAwesomeness < 0 && home.curWorkers <= home.maxWorkers) {
                            player.spaceAwesomeness = 0;
                        }
                    } else if (home.maxWorkers == 0 && home.curWorkers > 0) {
                        player.spaceAwesomeness = -15;
                    } else {
                        player.spaceAwesomeness = 0;
                    }

                    if (home.curWorkers > (home.maxWorkers + 2) && !$rootScope.player.events.firstOverCrowd) {
                        $rootScope.player.events.firstOverCrowd = true;
                        //$rootScope.importantEvent.load('firstOverCrowd');
                        Engine.insert(600, 'loadImportantEvent', ['firstOverCrowd']);
                    }

                    home.minWorkers = levels[$rootScope.world.home.level].min;
                    if (home.curWorkers < home.minWorkers) {
                        player.spaceAwesomeness -= Math.min(-25, (home.minWorkers - home.curWorkers));
                    }
                    player.spaceAwesomeness = Math.round(player.spaceAwesomeness);

                    //contracts
                    if (quarterDay) {
                        var len = home.contractQueue.length;
                        while (len--) {
                            var contract = home.contractQueue[len];
                            contract.curStep += 0.25;
                            contract.pctComplete = Math.round(contract.curStep * 100 / contract.maxStep);
                            contract.unaffordable = [];
                            if (Player.canAfford(contract.cost)) {
                                contract.canComplete = true;
                            } else {
                                contract.canComplete = false;

                                contract.unaffordable = [];
                                angular.forEach(contract.cost, function(amount, itemid) {
                                    var costObj = {};
                                    costObj[itemid] = amount;
                                    if (!Player.canAfford(costObj)) {
                                        contract.unaffordable.push(itemid);
                                    }
                                });
                            }
                            if (contract.curStep > contract.maxStep) {
                                $rootScope.callFn(contract.onExpire, [contract]);
                                home.contractQueue.splice(len, 1);
                            }
                        }
                    }

                    //building progress

                    if ($rootScope.engine.curStep % 3 == 0) {
                        var mason = $rootScope.world.home.mason;

                        var totalBuilders = home.jobs.builder.number + mason.number;

                        home.mason.maxActiveProjects = mason.number;

                        var masonStep = mason.step;
                        if ($rootScope.itemList.masonMultitask.unlocked) {
                            home.mason.maxActiveProjects *= 2;
                            masonStep = masonStep * 2 / 3;
                        }

                        //removing finished buildings from project queue
                        for (var i = 0; i < home.projectQueue.length; i++) {
                            var project = home.projectQueue[i];
                            if (project) {
                                project.worked = false; //turn it off, because we don't know yet.
                                project.notEnoughWorkers = false;
                                project.buildersWorking = 0;

                                var maxProgress = project.maxProgress * $rootScope.STEPSPERDAY * 2;
                                if (i < mason.maxActiveProjects) {

                                    if (project.type == 'repair' && !project.paid) {
                                        if (Player.canAfford(project.cost)) {
                                            Player.pay(project.cost);
                                            project.paid = true;
                                            project.delay = 0;
                                        } else {
                                            if (project.delay) {
                                                project.delay++;
                                            } else {
                                                project.delay = 1;
                                            }
                                        }
                                    } else {
                                        //are there enough builders?
                                        if (project.builders <= totalBuilders) {
                                            project.curProgress += masonStep;
                                            if ($rootScope.itemList.constructionWood2.unlocked) {
                                                project.curProgress += (masonStep * 0.3);
                                            } else if ($rootScope.itemList.constructionWood.unlocked) {
                                                project.curProgress += (masonStep * 0.1);
                                            }

                                            if (project.type === 'repair') {
                                                project.curProgress += (masonStep * 0.2);
                                            }
                                            totalBuilders -= project.builders;
                                            project.worked = true;
                                            project.buildersWorking += project.builders;
                                            project.delay = 0;
                                        } else {
                                            project.notEnoughWorkers = true;
                                            if (project.delay) {
                                                project.delay++;
                                            } else {
                                                project.delay = 1;
                                            }
                                        }
                                    }
                                }

                                if (project.delay && project.delay > $rootScope.STEPSPERDAY / 3) {
                                    //move it to the end
                                    if (home.projectQueue.length > i) {
                                        home.projectQueue.splice(i, 1);
                                        i--;
                                        home.projectQueue.push(project);
                                    }

                                    project.delay = 0;
                                } else {
                                    project.progressPct = Math.round(project.curProgress * 100 / maxProgress);
                                    if (project.curProgress > maxProgress) {

                                        project.inProgress = false;
                                        project.curProgress = 0;
                                        if (project.type != 'repair') {
                                            self.build(project.buildingId);
                                            $rootScope.itemList[project.buildingId].inQueue--;
                                        } else {
                                            //make it require repairs again
                                            var building = $rootScope.itemList[project.buildingId];

                                            //makes the repair
                                            var inst;
                                            for (var ib = 0; ib < building.instances.length; ib++) {
                                                var _b = building.instances[ib];
                                                if (_b.id === project.instId) {
                                                    //correct building to repair
                                                    _b.hp += building.resistance;
                                                    _b.inRepair = false;
                                                }
                                            }

                                        }
                                        //we want to make sure that repair objects are just removed from the queue without triggering an onbuild
                                        home.projectQueue.splice(i, 1);
                                        i--;
                                    }
                                }
                            } else {
                                //null project? remove it for whatever reason it's there.
                                home.projectQueue.splice(i, 1);
                                i--;
                            }

                        }

                        //any leftover workers? Go work on the primary project
                        if (totalBuilders > 0) {
                            var maxBonusBuilder = 3;
                            if ($rootScope.itemList.independentContractors.unlocked) {
                                maxBonusBuilder++;
                            }
                            if ($rootScope.itemList.masonMarla && $rootScope.itemList.masonMarla.status === "Working") {
                                maxBonusBuilder++;
                            }
                            for (var i = 0; i < mason.maxActiveProjects && i < home.projectQueue.length && totalBuilders > 0; i++) {
                                var proj = home.projectQueue[i];
                                if (proj.worked) {
                                    if (totalBuilders <= proj.builders * maxBonusBuilder) {
                                        proj.curProgress += mason.step * totalBuilders * 0.5;
                                        if (proj.type === 'repair') {
                                            proj.curProgress += mason.step * totalBuilders * 0.3;
                                        }
                                        proj.buildersWorking += totalBuilders;
                                        totalBuilders = 0;
                                    } else {
                                        //still would have builders left over after maxing out this project
                                        proj.curProgress += mason.step * proj.builders * maxBonusBuilder * 0.5;
                                        proj.buildersWorking += proj.builders * maxBonusBuilder;
                                        totalBuilders -= proj.builders * maxBonusBuilder;
                                    }
                                }
                            }
                        }
                    }

                    if (newDay) {

                        //calculate worker efficiency

                        //minimum worker
                        home.minWorkerPenalty = (home.curWorkers >= levels[home.level].requirements.worker ? -0.2 : 0);

                        //player wrath or morality - note that positive morality will actually DECREASE efficiency
                        //caveat - we want to limit the effect of morality to at most 0.5, thus dividing by 20 if our scale is -10 to +10;
                        home.leaderMorality = -$rootScope.player.morality / 20;

                        //the entertainment rating = lots of entertainment buildings decrease efficiency, but increases awesomeness. divide by 2 to limit this to 0.5
                        home.entertainmentOffset = -home.entertainmentRating / 2;

                        //good spirits bonus = if awesomeness has been consistently growing (over last 10 days), the good spirits bonus kicks in

                        if (!home.awesomenesshistory) {
                            home.awesomenesshistory = [];
                        }

                        if (home.awesomenesshistory.length >= 10) {
                            home.awesomenesshistory.shift();
                        }

                        home.awesomenesshistory.push(player.awesomeness);

                        if (home.awesomenesshistory.length == 10) {
                            home.goodSpiritsBonus = 0.3;

                            for (var i = 1; i < home.awesomenesshistory.length; i++) {
                                var t = home.awesomenesshistory[i];
                                if (t < home.awesomenesshistory[i - 1]) {
                                    //boo, awesomeness dropped
                                    home.goodSpiritsBonus -= 0.02;
                                    if (home.goodSpiritsBonus < 0) {
                                        home.goodSpiritsBonus = 0;
                                    }
                                }
                            }
                        } else {
                            home.goodSpiritsBonus = 0;
                        }

                        if (home.level > 1) {
                            home.workerMorale = Math.max((player.awesomeness - 20) / 100 + home.entertainmentRating, -0.2); //the smallest it can be at is -0.2
                        } else {
                            home.workerMorale = 0;
                        }

                        //check on the building repair rating

                        var curfew = $rootScope.itemList.curfew;
                        home.workerEfficiency = 1 + home.minWorkerPenalty + home.leaderMorality + home.entertainmentOffset + home.goodSpiritsBonus + home.workerMorale;

                        if (curfew.unlocked && curfew.active) {
                            home.workerEfficiency -= 0.25;
                        }

                        if (home.workerEfficiency < 0.25) {
                            home.workerEfficiency = 0.25;
                        } else if (home.workerEfficiency > 2) {
                            home.workerEfficiency = 2;
                        }

                        if (home.inFestival) {
                            home.inFestival--;
                            player.festivalAwesomeness = 20;
                            if (home.inFestival < 0) {
                                //should never get here
                                home.inFestival = 0;
                            }
                        } else {
                            player.festivalAwesomeness = 0;
                        }
                    }

                },
                setNextFestival: function(festival) {
                    var self = this;
                    festival.cost = {};
                    festival.costSet = false;
                    festival.moon += 12;
                    self.sortFestivals();
                },
                sortFestivals: function() {
                    if ($rootScope.world.home.festivals.length > 1) {
                        $rootScope.world.home.festivals.sort(function(a, b) {
                            if (a.moon == b.moon) {
                                return a.day - b.day;
                            } else {
                                return a.moon - b.moon;
                            }
                        });
                    }
                },
                fireJob: function(job, amount) {
                    if (isNaN(amount)) {
                        amount = 1;
                    }
                    if (amount < 0) {
                        amount = 0;
                    }
                    if (job.number >= amount) {
                        $rootScope.itemList.bum.number += amount;
                        job.number -= amount;
                        return true;
                    }
                    return false;
                },
                hireJob: function(job, amount) {
                    if (isNaN(amount)) {
                        amount = 1;
                    }
                    if (amount < 0) {
                        amount = 0;
                    }

                    if ($rootScope.itemList.bum.number >= amount && job.number + amount <= job.max) {
                        $rootScope.itemList.bum.number -= amount;
                        job.number += amount;
                        return true;
                    }
                    return false;
                },
                synchBuildingInstanceEffects: function() {
                    angular.forEach($rootScope.buildings, function(b) {
                        b.created = b.instances.length;
                        if (b.created > 0) {
                            for (var i = 0; i < b.created; i++) {
                                var inst = b.instances[i];
                                for (var k in b.effects) {
                                    if (!inst.effects[k]) {
                                        inst.effects[k] = b.effects[k];
                                    }
                                }
                                for (var k in inst.effects) {
                                    if (!b.effects[k]) {
                                        delete inst.effects[k];
                                    }
                                }
                            }
                        }
                    });
                },
                calcAll: function() {
                    this.synchBuildingInstanceEffects();
                    this.calcUpgrades();

                    this.calcFoodCapacity();
                    this.calcCapacity();
                    this.calcMaxWorkers();
                    this.calcAttractiveness();
                    this.calcCrime();
                    this.calcDefense();
                    this.calcMaxJobNumbers();
                    $rootScope.fns.calcSpaceAvailable();
                    $rootScope.fns.calcSpaceUsed();
                },
                calcUpgrades: function() {
                    angular.forEach($rootScope.upgrades, function(upgrade, upgradeId) {
                        if (upgrade.unlocked) {
                            //upgrade.onUnlock();
                            if (upgrade.applyUpgrade) {
                                upgrade.applyUpgrade();
                            }
                        }
                    });
                },
                calcMaxJobNumbers: function(jobid) {
                    var jobs = [];
                    if (jobid) {
                        jobs = [jobid];
                    } else {
                        angular.forEach($rootScope.world.home.jobs, function(job) {
                            if (job.id != 'bum') {
                                jobs.push(job.id);
                            }
                        });
                    }

                    var sectorsAffected = [];


                    //reset the max number for a clean calculation
                    angular.forEach(jobs, function(jobid) {
                        var _job = $rootScope.itemList[jobid];
                        if (!_job) {
                            console.log(jobid, "does not exist");
                        }

                        if (_job.category && sectorsAffected.indexOf(_job.category) < 0) {
                            sectorsAffected.push(_job.category);
                        }
                        //how many slots do we start with?
                        switch (jobid) {
                            case 'bum':
                                _job.max = 0;
                                break;
                            case 'builder':
                                _job.max = $rootScope.itemList.masonsGuild.unlocked ? 3 : 0;
                                break;
                            default:
                                _job.max = 0;
                        }
                    });

                    angular.forEach($rootScope.world.home.buildings, function(building, buildingId) {
                        for (var i in jobs) {
                            var jobid = jobs[i];
                            var job = $rootScope.itemList[jobid];
                            if (building.effects && building.effects['max' + jobid]) {
                                for (var j = 0; j < building.instances.length; j++) {
                                    job.max += building.instances[j].effects['max' + jobid];
                                }

                            }
                        }
                    });

                    //check the sectors
                    angular.forEach(sectorsAffected, function(s) {
                        var _sector = $rootScope.itemList['sector_' + s];
                        if (_sector) {
                            _sector.availableJobs = 0;

                            for (var i = 0; i < _sector.sjobs.length; i++) {
                                if (_sector.sjobs[i].max > 0) {
                                    _sector.availableJobs++;
                                }
                            }
                        }
                    });
                },
                calcDefense: function() {
                    var buildingEffects = this.getBuildingEffects('defense');
                    $rootScope.itemList.homeZone.defenseStrength = $rootScope.itemList.homeZone.baseStrength + buildingEffects;
                },
                calcFoodCapacity: function() {
                    var buildingEffects = this.getBuildingEffects('foodCapacity');
                    if ($rootScope.itemList.betterShelving.unlocked) {
                        buildingEffects *= 2;
                    }
                    $rootScope.world.home.maxFood = $rootScope.world.home.baseFoodCapacity + buildingEffects;
                },
                getBuildingEffects: function(effect) {
                    var buildingCount = 0;
                    var buildingEffects = 0;
                    var itemListKeys = Object.keys($rootScope.world.home.buildings);
                    for (var i = 0; i < itemListKeys.length; i++) {
                        var itemid = itemListKeys[i];
                        var item = $rootScope.itemList[itemid];
                        if (item.type == 'building' && item.effects && item.effects[effect]) {
                            for (var j = 0; j < item.instances.length; j++) {
                                if (!item.instances[j].effects[effect]) {
                                    item.instances[j].effects[effect] = building.effects[effect];
                                }
                                buildingEffects += item.instances[j].effects[effect];

                            }
                            buildingCount += item.created;
                        }
                    }

                    if (effect == 'attractiveness' && buildingCount > 0) {
                        if ($rootScope.world.home.curWorkers < 10) {
                            buildingEffects = 5;
                        } else {
                            buildingEffects = Math.max(Math.round(buildingEffects * 5 / ($rootScope.world.home.curWorkers + 1)), -5);
                        }

                    }
                    return buildingEffects;
                },
                getContract: function(contractid) {
                    var contract = null;
                    angular.forEach($rootScope.world.home.contractQueue, function(c, index) {
                        if (c.id == contractid) {
                            contract = c;
                        }
                    });
                    return contract;
                },
                insertPerson: function(characterid, fn, params) {
                    if (!$rootScope.player.showPeopleTab) {
                        $rootScope.player.showPeopleTab = true;
                    }
                    $rootScope.world.home.people[characterid] = {
                        character: $rootScope.itemList[characterid],
                        fn: fn,
                        params: params
                    }
                },
                removePerson: function(characterid) {
                    delete $rootScope.world.home.people[characterid];
                },
                calcCapacity: function() {
                    var buildingEffects = this.getBuildingEffects('capacity');
                    if ($rootScope.itemList.betterShelving.unlocked) {
                        buildingEffects *= 2;
                    }
                    $rootScope.player.curCapacity = 0;
                    angular.forEach($rootScope.player.inventory, function(amt, item) {
                        $rootScope.player.curCapacity += amt;
                    });
                    $rootScope.player.maxCapacity = $rootScope.player.baseCapacity + buildingEffects;
                },
                newWorkers: function(num) {
                    var home = $rootScope.world.home;
                    home.curWorkers += num;
                    home.jobs.bum.number += num;

                    if (home.curWorkers > 100 && $rootScope.itemList.council.unlocked && !$rootScope.itemList.employmentCenter.unlocked) {
                        Player.unlock('employmentCenter');
                        Engine.insert(50, 'explainEmploymentCenter');
                    }
                },
                assignJob: function(job, num) {
                    var hire = false;
                    num = num || 1;
                    if ($rootScope.itemList.bum.number >= num && job.number + num <= job.max) {
                        if (job.hireCost) {
                            var hireCost = {};
                            angular.forEach(job.hireCost, function(value, key) {
                                hireCost[key] = value * num;
                            });
                            if (Player.canAfford(hireCost)) {
                                hire = true;
                                Player.pay(hireCost);
                            } else {
                                hire = false;
                            }
                        } else {
                            hire = true;
                        }
                        if (hire) {
                            job.number += num;

                            var availTasks = [];
                            angular.forEach(job.tasks, function(taskid, ind) {
                                var task = $rootScope.itemList[taskid];
                                if (task.unlocked) {
                                    availTasks.push(task);
                                }
                            });
                            if (availTasks.length > 0) {
                                var distribute = num;

                                while (distribute > 0) {
                                    var rand = Math.round(Math.random() * (availTasks.length - 1));
                                    availTasks[rand].number++;
                                    distribute--;
                                }

                                $rootScope.world.home.jobs.bum.number -= num;
                            }

                        }
                    }

                },
                fixNaNs: function() {
                    //fixing all the NaNs
                    var root = $rootScope,
                        home = root.world.home,
                        player = root.player,
                        inventory = player.inventory,
                        granary = home.foodStore;
                    //gold
                    var awards = {};
                    if (isNaN(player.gold) || player.gold === null) {
                        player.gold = 0;
                        awards.gold = home.level * 10000;
                    }

                    //goods
                    angular.forEach(inventory, function(amt, itemId) {
                        if (root.itemList[itemId]) {
                            if (isNaN(amt)) {
                                inventory[itemId] = 0;
                                awards[amt] = 500;
                            }
                        }

                    });

                    //units
                    angular.forEach(root.zones, function(zone) {
                        if (isNaN(zone.warriors) || zone.warriors === null) {
                            zone.warriors = 0;
                        }

                        if (isNaN(zone.archers) || zone.archers === null) {
                            zone.archers = 0;
                        }

                        if (isNaN(zone.numWorkers) || zone.numWorkers === null) {
                            zone.numWorkers = 0;
                        }
                    });

                    Player.insertInventory(awards);



                },
                /**
                    destroyBuilding: function
                    @param bInst object representing the instance of the building that will be destroyed
                    @returns whether or not the building was destroyed
                **/
                destroyBuilding: function(bInst) {
                    var self = this;
                    var type = bInst.id.split("_")[0];
                    var building = $rootScope.itemList[type];


                    if (building.instances.length > 0) {
                        var i = 0,
                            len = building.instances.length,
                            destroyed = false,
                            next = building.instances[i];

                        while (next && !destroyed) {

                            if (next.id == bInst.id) {
                                building.instances.splice(i, 1);
                                destroyed = true;
                                building.created--;
                                var msg = bInst.name + " has collapsed due to structural damage";
                                //check the projectQueue
                                for (var p = 0; p < $rootScope.world.home.projectQueue.length; p++) {
                                    var proj = $rootScope.world.home.projectQueue[p];
                                    if (proj.type === 'repair' && proj.instId == bInst.id) {
                                        $rootScope.world.home.projectQueue.splice(p, 1);
                                        building.inQueue--;
                                        break;
                                    }
                                }
                                Engine.createNotification(msg, 'building');
                                Engine.log(msg);

                                building.created = building.instances.length;
                                if (building.effects) {
                                    self.effect(building.effects);
                                }
                            }
                            i++;
                            if (i < building.instances.length) {
                                next = building.instances[i];
                            } else {
                                next = null;
                            }
                        }

                        return destroyed;
                    }

                    return false;

                },
                ageBuildings: function() {
                    var self = this;
                    angular.forEach($rootScope.buildings, function(building, buildingid) {
                        for (var i = 0; i < building.instances.length; i++) {
                            var _b = building.instances[i];
                            if (isNaN(_b.hp)) {
                                _b.hp = building.resistance; //reset it because of bug
                            }
                            if ($rootScope.season.curSeason === "Winter") {
                                _b.hp--;
                            }
                            if ((Math.random() + 0.2) > _b.hp / building.resistance) {
                                _b.hp--;
                            }

                            if (_b.hp / building.resistance <= 0.25) {
                                //less than 25% hp, create a repair job

                                if (!_b.inRepair) {
                                    var repairProjCost = jQuery.extend({}, building.cost);
                                    angular.forEach(repairProjCost, function(val, key) {

                                        if (key === 'granite') {
                                            repairProjCost[key] = Math.floor(repairProjCost[key] / 4);
                                            if ($rootScope.itemList.graniteRecycling.unlocked) {
                                                repairProjCost[key] = Math.floor(repairProjCost[key] / 4);
                                            }
                                        } else if (key === 'marble') {
                                            repairProjCost[key] = Math.floor(repairProjCost[key] / 4);
                                            if ($rootScope.itemList.marbleRecycling.unlocked) {
                                                repairProjCost[key] = Math.floor(repairProjCost[key] / 4);
                                            }
                                        }
                                    });
                                    $rootScope.world.home.projectQueue.push({
                                        id: (new Date()).getTime(),
                                        buildingId: building.id,
                                        instId: _b.id,
                                        name: _b.name,
                                        curProgress: 0,
                                        maxProgress: building.maxProgress / 4,
                                        builders: building.builders || 0,
                                        removable: false,
                                        progressPct: 0,
                                        buildersWorking: 0,
                                        type: 'repair',
                                        cost: {
                                            gold: Math.round($rootScope.fns.getGoldValue(repairProjCost) / 4)
                                        }
                                    });
                                    _b.inRepair = true;
                                } else {
                                    if (_b.hp <= 0) {
                                        //destroy the building
                                        self.destroyBuilding(_b);
                                    }
                                }

                            }
                        }
                    });
                },
                earthquake: function() {
                    var self = this;
                    //damage all buildings, some buildings may catch on fire
                    angular.forEach($rootScope.buildings, function(building, buildingid) {
                        for (var i = 0; i < building.instances.length; i++) {
                            var _b = building.instances[i];

                            if (_b.hp / building.resistance > 0.5) {
                                _b.hp -= Math.round(building.resistance * 0.25);
                            } else {
                                _b.hp -= Math.round(building.resistance * 0.5);
                            }

                            var pct = 1 - _b.hp / building.resistance;

                            //hoping for some sort of equation where the less percentage of hp the building has, the more it loses
                            _b.hp -= Math.round(building.resistance * pct * pct);

                            if (_b.hp <= 0) {
                                //building destroyed
                                self.destroyBuilding(_b);
                            }
                        }
                    });
                },
                getBuilding: function(buildingid) {
                    return $rootScope.world.home.buildings[buildingid];
                },
                canBuildMore: function(buildingid) {
                    var building = this.getBuilding(buildingid);
                    return building.created < building.max;
                },
                getUniqueContractId: function() {
                    $rootScope.nextContractId++;
                    return $rootScope.nextContractId;
                },
                insertContract: function(title, cost, rewardString, expiration, onComplete, onExpire, onReject, extras) {
                    if (!$rootScope.player.showContractTab) {
                        $rootScope.player.showContractTab = true;
                    }


                    var contractId = this.getUniqueContractId();
                    if ($rootScope.world.home.contractQueue.length <= $rootScope.world.home.maxContracts) {
                        var contract = {
                            id: contractId,
                            title: title,
                            cost: cost,
                            rewardString: rewardString || '',
                            curStep: 0,
                            maxStep: expiration,
                            canComplete: false,
                            onComplete: onComplete,
                            onExpire: onExpire,
                            onReject: onReject
                        };
                        if (extras) {
                            angular.forEach(extras, function(value, key) {
                                contract[key] = value;
                            });
                        }
                        $rootScope.world.home.contractQueue.push(contract);
                        var contractTitle = 'New Contract: ' + title;
                        Engine.log(contractTitle);
                        Engine.createNotification(contractTitle, 'contract');
                        if (!$rootScope.player.events.firstContractReceived) {
                            $rootScope.player.events.firstContractReceived = true;
                            Engine.insertNotificationBar("You have a new contract! Go to the Home screen and look in the Contracts tab", "hint");
                        }
                    } else {
                        return false;
                    }
                },
                hasContract: function(title) {
                    var queue = $rootScope.world.home.contractQueue
                    for (var i = 0; i < queue.length; i++) {
                        var contract = queue[i];
                        if (contract.title == title) {
                            return true;
                        }
                    }
                    return false;
                },
                completeContract: function(contract) {
                    if (Player.canAfford(contract.cost)) {
                        $rootScope.callFn(contract.onComplete, [contract.id]);
                        this.removeContract(contract);
                    }
                },
                rejectContract: function(contract) {
                    this.removeContract(contract);
                    $rootScope.callFn(contract.onReject, [contract.id]);
                },
                removeContract: function(contract) {

                    for (var i = 0; i < $rootScope.world.home.contractQueue.length; i++) {
                        var c = $rootScope.world.home.contractQueue[i];
                        if (c.id === contract.id) {
                            $rootScope.world.home.contractQueue.splice(i, 1);
                            return;
                        }
                    }
                },
                addTermContract: function(title, partner, outbound, inbound, frequency, termLength) {
                    var contractId = this.getUniqueContractId();
                    var _contract = {
                        id: contractId,
                        title: title,
                        partner: partner,
                        outbound: outbound,
                        inbound: inbound,
                        frequency: frequency,
                        length: termLength
                    }

                    var home = $rootScope.world.home;

                    home.termContracts.push(_contract);


                },
                addHouse: function(type) {
                    //effects have been taken care of by the effects call after onBuild
                    if (type) {
                        if (type === 'hovel' && !$rootScope.importantEvent.firstHovel.used) {
                            $rootScope.importantEvent.load('firstHovel');
                        } else if (type === 'house' && !$rootScope.importantEvent.firstHouse.used) {
                            $rootScope.importantEvent.load('firstHouse');
                        } else if (type === 'mansion' && !$rootScope.importantEvent.firstMansion.used) {
                            $rootScope.importantEvent.load('firstMansion');
                        }
                    }
                },
                effect: function(effects, negative) {
                    var self = this;
                    angular.forEach(effects, function(value, effect) {
                        switch (effect) {
                            case 'capacity':
                                self.calcCapacity();
                                break;
                            case 'foodCapacity':
                                self.calcFoodCapacity();
                                break;
                            case 'workers':
                                self.calcMaxWorkers();
                                break;
                            case 'attractiveness':
                                self.calcAttractiveness();
                                break;
                            case 'crime':
                                self.calcCrime();
                                break;
                            default:
                                if (effect.substr(0, 3) == 'max') {
                                    var jobid = effect.substr(3);
                                    self.calcMaxJobNumbers(jobid);
                                }
                                break;
                        }
                    });
                },
                buildingChanged: function(building) {
                    //calc all the effects
                    var self = this;
                    for (var effect in building.effects) {
                        self.effect(effect);
                    }
                },
                calcMaxWorkers: function() {
                    var buildingEffects = this.getBuildingEffects('workers');
                    $rootScope.world.home.maxWorkers = buildingEffects + $rootScope.world.home.baseWorkers;
                },
                calcEntertainmentRating: function() {
                    var buildingEffects = this.getBuildingEffects('entertainment');
                    var entertainmentRating = buildingEffects / $rootScope.world.home.curWorkers;
                    //Cap the entertainment rating - it can only be positive
                    if (entertainmentRating > 1) {
                        entertainmentRating = 1;
                    }

                    $rootScope.world.home.entertainmentRating = entertainmentRating;
                },
                calcAttractiveness: function() {
                    var buildingEffects = this.getBuildingEffects('attractiveness');
                    $rootScope.player.decoAwesomeness = buildingEffects;
                    if ($rootScope.world.home.hasArts) {
                        $rootScope.player.decoAwesomeness += 10;
                    }

                    $rootScope.player.decoAwesomeness += $rootScope.itemList.garden.created;
                },
                calcCrime: function() {
                    var cityGuardHQ = $rootScope.itemList.cityGuardHQ;
                    var buildingEffects = this.getBuildingEffects('crime');
                    var home = $rootScope.world.home;
                    var numBum = home.jobs.bum.number;
                    var numWorkers = home.curWorkers - numBum;
                    home.crime = buildingEffects + Math.round((Math.max(numWorkers, 100) - 100) / 30) + Math.round((Math.max(numBum, 20) - 20) / 10);
                    if (home.crimeOrgs && home.crimeOrgs.length > 0) {
                        for (var i = 0; i < home.crimeOrgs.length; i++) {
                            home.crime += home.crimeOrgs[i].crime;
                        }
                    }
                    if (cityGuardHQ.instances.length > 0) {
                        home.crime += cityGuardHQ.budgetLevels[cityGuardHQ.curBudgetLevel].crime;
                    }

                    var curfew = $rootScope.itemList.curfew;
                    if (curfew.unlocked && curfew.active) {
                        home.crime -= 15;
                    }

                    if (home.crime < 0) {
                        home.crime = 0;
                    }
                },
                checkSettlementLevel: function(isInit) {
                    var home = $rootScope.world.home;
                    if (!home.level) {
                        home.level = 0;
                    }

                    var numWorkers = home.curWorkers;
                    home.bg = levels[home.level].bg;
                    for (var index = 0; index < levels.length; index++) {
                        var level = levels[index];
                        if (home.level >= index) {
                            $rootScope.updateHomeName();
                            if (isInit) {
                                console.log('Current level: ' + level.prefix);
                                level.onAchieve();
                            }
                            if (level.unlocks) {
                                angular.forEach(level.unlocks, function(arr, key) {
                                    Player.unlock(arr);
                                });
                            }
                        }
                    }
                },
                getLevel: function(level) {
                    return levels[level];
                },
                generateAnnualReports: function(year) {
                    var council = $rootScope.world.council;
                    if (!council.annualReports) {
                        council.annualReports = {};
                    }

                    var aReport = {
                        i: {},
                        o: {}
                    };
                    if ($rootScope.season.curMonth > year * 12 + 12) {
                        for (var i = year * 12; i < year * 12 + 12; i++) {
                            if (council.monthlyReports[i]) {
                                var rep = council.monthlyReports[i];
                            }
                        }
                    }
                },
                init: function() {
                    var root = $rootScope;
                    var events = root.player.events;
                    this.checkSettlementLevel(true);

                    if (!$rootScope.records) {
                        $rootScope.records = [];
                    }

                    //set up monthly reports
                    if (!$rootScope.world.council.monthlyReports) {
                        $rootScope.world.council.monthlyReports = {};
                    }
                    if (!$rootScope.world.council.monthlyReports[$rootScope.season.curMonth]) {
                        $rootScope.world.council.monthlyReports[$rootScope.season.curMonth] = {
                            i: {},
                            o: {}
                        };
                    }

                    if ($rootScope.engine.curStep == 0) {
                        this.build(['warehouse', 'granary']);
                    }

                    this.calcAll();
                    Player.updateAwesomeness();

                }

            };

            return home;
        }
    ]);
