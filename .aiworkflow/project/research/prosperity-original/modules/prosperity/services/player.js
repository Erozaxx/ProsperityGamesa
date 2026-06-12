'use strict';

angular.module('prosperity')
    .service('Player', ['$rootScope', '$timeout', 'Forest', 'Field', 'Mine', 'Techs', 'Engine', '$state',
        function Player($rootScope, $timeout, Forest, Field, Mine, Techs, Engine, $state) {

            function recordConsumption(objid, amount, day) {
                var obj = $rootScope.itemList[objid];
                if (obj) {
                    if (!obj.consumptionHistory) {
                        obj.consumptionHistory = [];
                    }

                    if (!obj.consumptionHistoryDay) {
                        obj.consumptionHistoryDay = day;
                    }

                    if (obj.consumptionHistoryDay != day) {
                        obj.consumptionHistory.unshift(0);
                        if (obj.consumptionHistory.length > 10) {
                            obj.consumptionHistory.pop();
                        }
                        obj.consumptionHistoryDay = day;
                    }

                    obj.consumptionHistory[0] += amount;

                    var s = 0;
                    for (var k in obj.consumptionHistory) {
                        s++;
                    }

                }
            }

            function recordProduction(objid, amount, day) {
                var obj = $rootScope.itemList[objid];
                if (obj) {
                    if (!obj.productionHistory) {
                        obj.productionHistory = [];
                    }

                    if (!obj.productionHistoryDay) {
                        obj.productionHistoryDay = day;
                        obj.productionHistory[0] = 0;
                    }

                    if (obj.productionHistoryDay != day) {
                        obj.productionHistory.unshift(0);
                        if (obj.productionHistory.length > 10) {
                            obj.productionHistory.pop();
                        }
                        obj.productionHistoryDay = day;
                    }
                    if (isNaN(amount)) {
                        console.log(objid, day, 'amount is NaN');

                    } else {
                        obj.productionHistory[0] += amount;
                    }


                }
            }

            // AngularJS will instantiate a singleton by calling "new" on this function
            var player = {
                addToJournal: function(step, entry, chapter) {
                    if (!$rootScope.player.journal) {
                        $rootScope.player.journal = {};
                    }

                    var day = $rootScope.fns.dayFromStep(step);

                    if (!$rootScope.player.journal[day]) {
                        $rootScope.player.journal[day] = [];
                    }
                },
                setName: function(name) {
                    $rootScope.player.name = name;
                },
                count: function(itemId) {
                    if (itemId == 'farmer' || itemId == 'miner' || itemId == 'lumberjack' || itemId == 'hunter' || itemId == 'bum' || itemId == 'apothecary' || itemId == 'tinkerer' || itemId == 'researcher') {
                        return $rootScope.world.home.jobs[itemId].number;
                    } else if (itemId == 'trees') {
                        return $rootScope.world.forest.curTrees;
                    } else if (itemId == 'animals') {
                        return $rootScope.world.forest.curAnimals;
                    } else if (itemId == 'gold') {
                        return $rootScope.player.gold;
                    } else if (itemId == 'ores') {
                        return $rootScope.world.mine.curOres;
                    } else if (itemId == 'fruit' || itemId == 'vegetable' || itemId == 'bread' || itemId == 'cheese' || itemId == 'meat' || itemId == 'fish') {
                        return $rootScope.world.home.foodStore[itemId];
                    } else if (itemId == 'food') {
                        return $rootScope.world.home.curFood;
                    } else if (itemId == 'livestock') {
                        return $rootScope.world.field.curlivestock;
                    } else if (itemId == 'population' || itemId == 'workers') {
                        return $rootScope.world.home.curWorkers || 0;
                    } else if (itemId == 'warehouseCapacity') {
                        return $rootScope.player.maxCapacity;
                    } else if (itemId == 'farmland') {
                        return $rootScope.world.field.maxFarmLand;
                    } else if (itemId == 'citySpace' || itemId == 'forestSpace' || itemId == 'fieldSpace' || itemId == 'mineSpace' || itemId == 'riverSpace' || itemId == 'otherSpace') {
                        return $rootScope.area[itemId] - $rootScope.used[itemId];
                    } else {
                        if ($rootScope.itemList[itemId]) {
                            if ($rootScope.itemList[itemId].type == 'building') {
                                return $rootScope.itemList[itemId].created;
                            } else {
                                return Number($rootScope.player.inventory[itemId]) || 0;
                            }
                        } else {
                            console.log('itemid ' + itemId + ' does not exist');
                            return 0;
                        }

                    }

                },
                pay: function(cost, cause) {
                    var self = this;
                    var costKeys = Object.keys(cost);

                    var curMonthlyReport = $rootScope.world.council.monthlyReports[$rootScope.season.curMonth];
                    if (!curMonthlyReport) {
                        curMonthlyReport = $rootScope.world.council.monthlyReports[$rootScope.season.curMonth] = {
                            i: {},
                            o: {}
                        }
                    }

                    var curDay = Math.floor($rootScope.engine.curStep / $rootScope.STEPSPERDAY);

                    for (var key in cost) {
                        var value = cost[key];
                        var type;
                        if (value != 0) {
                            var item = $rootScope.itemList[key];
                            if (item) {
                                type = item.type;
                            }
                            if (key == 'gold') {
                                $rootScope.player.gold -= value;
                                curMonthlyReport.goldSpent = curMonthlyReport.goldSpent ? curMonthlyReport.goldSpent + value : value;
                                recordConsumption(key, value, curDay);
                            } else if (key == 'trees') {
                                Forest.decreaseTrees(value);
                                curMonthlyReport.treesCut = curMonthlyReport.treesCut ? curMonthlyReport.treesCut + value : value;
                            } else if (key == 'animals') {
                                Forest.decreaseAnimals(value);
                                curMonthlyReport.animalsHunted = curMonthlyReport.animalsHunted ? curMonthlyReport.animalsHunted + value : value;
                            } else if (key == 'farmland') {
                                Field.useFarmLand(value);
                            } else if (key == 'ores') {
                                Mine.decreaseOres(value);
                                curMonthlyReport.oresMined = curMonthlyReport.oresMined ? curMonthlyReport.oresMined + value : value;
                            } else if (key == 'livestock') {
                                Field.decreaselivestock(value);
                                curMonthlyReport.livestockSlaughtered = curMonthlyReport.livestockSlaughtered ? curMonthlyReport.livestockSlaughtered + value : value;
                            } else if (type == 'job') {
                                self.cullWorker(key, value);
                            } else if (key == 'techPt') {
                                Techs.spendPt(value);
                                curMonthlyReport.techPtSpent = curMonthlyReport.techPtSpent ? curMonthlyReport.techPtSpent + value : value;
                            } else if (type == 'food') {
                                $rootScope.world.home.foodStore[key] -= value;
                                $rootScope.world.home.curFood -= value;
                                curMonthlyReport.o[key] = curMonthlyReport.o[key] ? curMonthlyReport.o[key] + value : value;
                                curMonthlyReport.foodConsumed = curMonthlyReport.foodConsumed ? curMonthlyReport.foodConsumed + value : value;

                            } else if (key == 'food') {
                                //split food evenly among the existing food choices.
                                var inv = $rootScope.world.home.foodStore;
                                var foodTypes = [];
                                var curFoodType = '';
                                $rootScope.player.foodVariety = 0; //variety fully eaten

                                for (var k in inv) {
                                    if (!$rootScope.itemList[k].doNotConsume) {
                                        foodTypes.push(k);
                                    }
                                }

                                var baseConsumed = ~~(value / $rootScope.player.foodVariety);

                                var totalFood = value;
                                var consumed = 0;
                                if (totalFood > $rootScope.world.home.curFood) {
                                    //not enough food, so eat what's available.
                                    angular.forEach(foodTypes, function(_type) {
                                        curMonthlyReport.o[_type] = curMonthlyReport.o[_type] ? curMonthlyReport.o[_type] + inv[_type] : inv[_type];
                                        inv[_type] = 0;
                                    });
                                    value = $rootScope.world.home.curFood;
                                    consumed = $rootScope.world.home.curFood;
                                    $rootScope.world.home.curFood = 0;
                                    totalFood = 0;
                                    $rootScope.player.foodVariety = 0; //variety fully eaten
                                    //console.log('Not enough food, ate what was available and called it a day');
                                } else {
                                    //sort the foodTypes by availability
                                    foodTypes.sort(function(a, b) {
                                        return inv[a] - inv[b];
                                    });

                                    for (var i = 0; i < foodTypes.length; i++) {
                                        var foodShare = Math.ceil(totalFood / (foodTypes.length - i));
                                        var t = foodTypes[i];
                                        if (inv[t] / foodShare > 0.75) {
                                            $rootScope.player.foodVariety++; //at least 75% of the people can get a bit of this food
                                        }
                                        if (inv[t] < foodShare) {
                                            curMonthlyReport.o[t] = curMonthlyReport.o[t] ? curMonthlyReport.o[t] + inv[t] : inv[t];
                                            totalFood -= inv[t];
                                            consumed += inv[t];

                                            recordConsumption(t, inv[t], curDay);
                                            inv[t] = 0;
                                        } else {
                                            curMonthlyReport.o[t] = curMonthlyReport.o[t] ? curMonthlyReport.o[t] + foodShare : foodShare;
                                            inv[t] -= foodShare;
                                            consumed += foodShare;
                                            totalFood -= foodShare;
                                            recordConsumption(t, foodShare, curDay);
                                        }
                                    }
                                }

                                $rootScope.world.home.curFood -= consumed;


                                curMonthlyReport.foodConsumed = curMonthlyReport.foodConsumed ? curMonthlyReport.foodConsumed + consumed : consumed;

                                $rootScope.player.foodAte += consumed;

                                var home = $rootScope.world.home;
                                var expectedFoodRate = home.foodConsumptionRates[home.consumeFoodRate] / 2;

                                if (consumed / $rootScope.world.home.curWorkers < expectedFoodRate && home.consumeFoodRate > 2) {
                                    home.consumeFoodRate = 2; //set it back to basic
                                }

                            } else {
                                //remove it from their inventory
                                $rootScope.player.inventory[key] -= value;
                                $rootScope.player.curCapacity -= value;

                                curMonthlyReport.o[key] = curMonthlyReport.o[key] ? curMonthlyReport.o[key] + value : value;

                                recordConsumption(key, value, curDay);
                            }
                        }

                    }

                },
                canAfford: function(cost) {
                    var self = this;
                    var can = true;
                    for (var key in cost) {
                        var value = cost[key];
                        if (key == 'gold') {
                            if (value > $rootScope.player.gold)
                                can = false;
                        } else if (key == 'trees') {
                            if (value > $rootScope.world.forest.curTrees)
                                can = false;
                        } else if (key == 'animals') {
                            if (value > $rootScope.world.forest.curAnimals)
                                can = false;
                        } else if (key == 'ores') {
                            if (value > $rootScope.world.mine.curOres)
                                can = false;
                        } else if (key == 'livestock') {
                            if (value > $rootScope.world.field.curlivestock)
                                can = false;
                        } else if (key == 'farmland') {
                            if (value + $rootScope.world.field.usedFarmLand > $rootScope.world.field.maxFarmLand)
                                can = false;
                        } else if (key == 'researchPt') {
                            if (value > $rootScope.world.academy.curResearchPt) {
                                can = false;
                            }
                        } else if (key == 'techPt') {
                            if (value > $rootScope.player.techPt) {
                                can = false;
                            }
                        } else if (key == 'fruit' || key == 'cheese' || key == 'bread' || key == 'meat' || key == 'vegetable') {
                            if (value > $rootScope.world.home.foodStore[key]) {
                                can = false;
                            }
                        } else if (key == 'food') {
                            if (value > $rootScope.world.home.curFood) {
                                can = false;
                            }
                        } else if (key == 'farmer' || key == 'miner' || key == 'lumberjack' || key == 'hunter' || key == 'bum') {
                            if (value > $rootScope.world.home.jobs[key].number) {
                                can = false;
                            }
                        } else {
                            if (self.count(key) < value) {
                                can = false;
                            }
                        }
                    }
                    return can;
                },
                meetsRequirements: function(req) {
                    var met = true;
                    angular.forEach(req, function(amt, itemId) {
                        var item = $rootScope.itemList[itemId];
                        if (item.type === 'building' && item.created < amt) {
                            met = false;
                        } else if (itemId === 'workers' && $rootScope.world.home.curWorkers < amt) {
                            met = false;
                        }
                    });

                    return met;
                },
                hasCapacityFor: function(goods) {
                    var foodSpace = 0;
                    var stuffSpace = 0;

                    angular.forEach(goods, function(amount, itemid) {
                        var item = $rootScope.itemList[itemid];
                        if (itemid == 'gold') {
                            //don't do anything, gold doesn't take up space
                        } else if (item.type == 'food') {
                            //add to food capacity
                            foodSpace += amount;
                        } else if (item.type == 'goods') {
                            stuffSpace += amount;
                        }
                    });

                    var forStuff = $rootScope.player.curCapacity + stuffSpace <= $rootScope.player.maxCapacity;
                    var forFood = $rootScope.world.home.curFood + foodSpace <= $rootScope.world.home.maxFood;
                    if (foodSpace > 0 && stuffSpace > 0) {
                        return forStuff && forFood;
                    } else if (foodSpace > 0) {
                        return forFood;
                    } else if (stuffSpace > 0) {
                        return forStuff;
                    } else {
                        return true;
                    }
                },
                canStore: function(amount) {
                    return $rootScope.player.curCapacity + amount <= $rootScope.player.maxCapacity;
                },
                hasDiscovered: function(type, itemId) {

                    var item = this.getObject(type, itemId);
                    if (item) {
                        return item.discovered || item.unlocked;
                    } else {
                        return false;
                    }
                },
                getObject: function(type, itemId) {
                    var item = $rootScope.itemList[itemId];

                    if (item) {
                        return item;
                    } else {
                        console.error("itemId does not exist: ", itemId)
                        return null;
                    }
                },
                insertInventory: function(items, source, limited) {
                    var player = $rootScope.player;
                    var itemKeys = Object.keys(items);
                    var curMonthlyReport = $rootScope.world.council.monthlyReports[$rootScope.season.curMonth];
                    if (!curMonthlyReport) {
                        curMonthlyReport = {
                            i: {},
                            o: {}
                        }
                    }

                    var curDay = Math.floor($rootScope.engine.curStep / $rootScope.STEPSPERDAY);

                    for (var i = 0; i < itemKeys.length; i++) {
                        var itemId = itemKeys[i];
                        var amount = items[itemId];

                        if (isNaN(amount)) {
                            console.error('NaN amount being inserted for ' + itemId, source);
                        } else {
                            if (!$rootScope.itemList[itemId]) {
                                console.log('no such item: ' + itemId);
                            } else {
                                var itemType = $rootScope.itemList[itemId].type;
                                if (itemId == 'gold') {
                                    player.gold += amount;
                                    curMonthlyReport.goldEarned = curMonthlyReport.goldEarned ? curMonthlyReport.goldEarned + amount : amount;
                                    recordProduction(itemId, amount, curDay);
                                } else if (itemId == 'crops') {
                                    Field.increaseCrops(amount);
                                } else if (itemId == 'ores') {
                                    Mine.increaseOres(amount);
                                    curMonthlyReport.oresDiscovered = curMonthlyReport.oresDiscovered ? curMonthlyReport.oresDiscovered + amount : amount;
                                } else if (itemId == 'animals') {
                                    Forest.increaseAnimals(amount);
                                    curMonthlyReport.animalsMatured = curMonthlyReport.animalsMatured ? curMonthlyReport.animalsMatured + amount : amount;
                                } else if (itemId == 'trees') {
                                    Forest.increaseTrees(amount);
                                    curMonthlyReport.treesMatured = curMonthlyReport.treesMatured ? curMonthlyReport.treesMatured + amount : amount;
                                } else if (itemId == 'techPt') {
                                    Techs.increasePt(amount);
                                    curMonthlyReport.techPtsEarned = curMonthlyReport.techPtsEarned ? curMonthlyReport.techPtsEarned + amount : amount;
                                } else if (itemId == 'livestock') {
                                    Field.increaselivestock(amount);
                                    curMonthlyReport.livestockReared = curMonthlyReport.livestockReared ? curMonthlyReport.livestockReared + amount : amount;
                                } else if (itemType == 'food') {
                                    var amt = amount;
                                    if (limited)
                                        amt = Math.max(Math.min($rootScope.world.home.maxFood - $rootScope.world.home.curFood, amount), 0);
                                    $rootScope.world.home.curFood += amt;
                                    $rootScope.world.home.foodStore[itemId] += amt;
                                    curMonthlyReport.i[itemId] = curMonthlyReport.i[itemId] ? curMonthlyReport.i[itemId] + amt : amt;
                                    curMonthlyReport.foodProduced = curMonthlyReport.foodProduced ? curMonthlyReport.foodProduced + amt : amt;
                                    recordProduction(itemId, amt, curDay);
                                } else {
                                    if (limited) {
                                        if (player.curCapacity + amount > player.maxCapacity) {
                                            amount = player.maxCapacity - player.curCapacity;
                                            if(amount < 0){
                                                amount = 0;
                                            }
                                        }
                                    }

                                    if (itemType == 'goods') {
                                        player.inventory[itemId] = player.inventory[itemId] ? player.inventory[itemId] + amount : amount;
                                        player.curCapacity += amount;
                                        recordProduction(itemId, amount, curDay);

                                        curMonthlyReport.i[itemId] = curMonthlyReport.i[itemId] ? curMonthlyReport.i[itemId] + amount : amount;

                                        if (player.curCapacity >= player.maxCapacity) {
                                            if (!$rootScope.world.home.warehouseFull) { //no need to constantly remind the player their warehouse is full
                                                Engine.log('The warehouse is full');
                                                $rootScope.world.home.warehouseFull = true;
                                            }
                                        }
                                        if (!$rootScope.itemList[itemId].unlocked) {
                                            this.unlock(itemId);
                                        }
                                    }

                                }
                            }
                        }

                    }

                },
                travel: function(locationId) {
                    if ($rootScope.player.curLocation !== locationId) {
                        if (this.hasDiscovered('location', locationId)) {
                            $rootScope.player.curLocation = locationId;
                            var player = $rootScope.player;
                            if (!$rootScope.world[$rootScope.player.curLocation].visitCount) {
                                $rootScope.world[$rootScope.player.curLocation].visitCount = 1;
                            } else {
                                $rootScope.world[$rootScope.player.curLocation].visitCount++;
                            }

                            switch (locationId) {
                                case 'home':
                                    $timeout(function() {
                                        if ($rootScope.engine.state && !$rootScope.importantEvent.firstVisitToHome.used) {
                                            $rootScope.importantEvent.load('firstVisitToHome');
                                        }
                                    }, 2000);

                                    break;
                                case 'forest':
                                    if (!$rootScope.importantEvent.firstVisitToForest.used) {
                                        $rootScope.importantEvent.load('firstVisitToForest');
                                    }
                                    break;
                                case 'field':
                                    //first visit, Abby time
                                    if (!$rootScope.importantEvent.firstVisitToField.used) {
                                        $rootScope.importantEvent.load('firstVisitToField');
                                    }
                                    break;
                                case 'masonsGuild':
                                    if (!$rootScope.importantEvent.firstVisitToMasonsGuild.used && player.settings.tutorials) {
                                        $rootScope.importantEvent.load('firstVisitToMasonsGuild');
                                    }
                                    break;

                            }

                            $rootScope.curPlaceId = null;
                            $rootScope.curPlaceId = locationId;
                        } else {
                            $state.go('prosperity.home');
                        }

                    }
                },
                updateCapacity: function() {
                    var sum = 0;
                    angular.forEach($rootScope.player.inventory, function(value, key) {
                        if (key !== 'gold') {
                            sum += value;
                        }
                    });
                    $rootScope.player.curCapacity = sum;
                },
                discover: function(type, items) {
                    //this is for the initial discovery of items. note that onDiscover will be called if it exists. It's therefore important to apply this at the end of the config
                    var self = this;
                    if (typeof items === 'string') {
                        items = [items];
                    }
                    self.unlock(items);
                },
                cullWorker: function(job, number, sendAway) {
                    var home = $rootScope.world.home;
                    var jobs = home.jobs;
                    var randJobs = false;
                    if (!number) {
                        number = 1;
                    }
                    if (number > home.curWorkers) {
                        console.error("Trying to cull more workers than exists: " + number + " (" + home.curWorkers + ")");
                        return false;
                    }
                    if (typeof job == 'string') {
                        job = jobs[job];
                    }

                    if (home.infected > 0) {
                        home.infected -= Math.min(home.infected, number);
                    }
                    if (job && job.number >= number) {
                        job.number -= number;

                        if (sendAway) {
                            home.workersAway += number;
                        } else {
                            home.curWorkers -= number;
                        }

                    } else {
                        if (!job) {
                            var jobsAffected = [];

                            var oNum = number;
                            //remove all that we can from bums
                            if (number <= home.jobs.bum.number) {
                                job = home.jobs.bum;
                                job.number -= number;
                                number = 0;
                            } else {
                                if (home.jobs.bum.number > 0) {
                                    number -= home.jobs.bum.number;
                                    home.jobs.bum.number = 0;
                                }

                                while (number > 0) {
                                    var job = $rootScope.fns.randJob(true);
                                    //remove a worker from this task
                                    if (job.number > 0) {
                                        job.number--;
                                        number--;
                                    }

                                }
                            }

                            if (sendAway) {
                                home.workersAway += oNum;
                            } else {
                                home.curWorkers -= oNum;
                            }
                        }

                    }

                    return job;
                },
                bringBack: function(number) {
                    var home = $rootScope.world.home;
                    if (number > 0 && home.workersAway >= number) {
                        home.workersAway -= number;
                        home.jobs.bum.number += number;
                        return true;
                    } else {
                        return false;
                    }
                },
                init: function() {

                    this.unlock(['bum']);

                    this.unlock(['home', 'forest']);

                    this.unlock(['chopWood', 'hunt', 'splitWood', 'forageBerries']);

                    console.log('curStep at Player.init: ', $rootScope.engine.curStep);
                    this.insertInventory({
                        'meat': 600,
                        'vegetable': 380,
                        'bread': 400,
                        'wood': 840,
                        'fur': 320,
                        'gold': 3580,
                        'firewood': 300,
                        'lumber': 28
                    });
                },
                updateAwesomeness: function() {
                    var player = $rootScope.player,
                        home = $rootScope.world.home;
                    if (home.curWorkers < 5) {
                        player.awesomeness = 10;
                    } else {
                        if (!player.showAwesomenessBar) {
                            player.showAwesomenessBar = true;
                        }
                        player.foodAwesomeness = Math.round(player.foodAwesomeness);
                        player.decoAwesomeness = Math.round(player.decoAwesomeness);
                        player.healthAwesomeness = Math.round(player.healthAwesomeness);
                        player.threatAwesomeness = Math.round(player.threatAwesomeness);
                        player.spaceAwesomeness = Math.round(player.spaceAwesomeness);

                        player.awesomeness =
                            Math.round(player.foodAwesomeness +
                                player.decoAwesomeness +
                                player.healthAwesomeness +
                                player.threatAwesomeness +
                                player.spaceAwesomeness +
                                (-$rootScope.itemList.taxCenter.curRate));
                    }

                },
                isUnlocked: function(itemId) {
                    var item = $rootScope.itemList[itemId];
                    if (item) {
                        return item.unlocked;
                    }
                    return false;
                },
                unlock: function(items) {
                    var self = this;
                    if (typeof items === 'string') {
                        items = [items];
                    }
                    angular.forEach(items, function(itemId) {
                        var obj = $rootScope.itemList[itemId];
                        if (!obj) {
                            console.log(itemId + ' not found');
                            //console.log($rootScope.itemList);
                        } else {
                            if (!obj.unlocked && obj.type == 'building') {
                                var msg = "You have unlocked " + obj.name + "! Go find it in the " + obj.category + " tab in the mason's guild";
                                Engine.log(msg);
                                Engine.createNotification(msg, "unlockedBuildings");
                            }
                            obj.unlocked = true;
                            if (obj.type == 'building' && $rootScope.player.unlockedBuildings.indexOf(obj.id) < 0) {
                                $rootScope.player.unlockedBuildings.push(obj.id);
                            }
                            if (obj.type == "goods" && $rootScope.player.unlockedItems.indexOf(obj.id) < 0) {
                                $rootScope.player.unlockedItems.push(obj.id);
                            }

                            if (obj.unlocks) {
                                self.unlock(obj.unlocks);
                            }
                            if (obj.onUnlock) {
                                obj.onUnlock();
                            }
                            if (obj.onDiscover) {
                                obj.onDiscover();
                            }
                        }
                    });
                },
                addVassal: function(zone) {
                    zone.liege = 'player';
                    if (!$rootScope.player.vassals) {
                        $rootScope.player.vassals = [];
                    }
                    $rootScope.player.vassals.push(zone);
                },
                endGame: function(how) {
                    if (how == 'hostileTakeover') {
                        $rootScope.gameOverMsg = 'You have lost your home city in a siege, nobody was spared';
                    } else if (how == 'assassination') {
                        $rootScope.gameOverMsg = 'You were assassinated, in the absence of your leadership, your followers fled to start their lives anew in the wild';
                    }

                    Engine.stop("End Game");

                    //localStorage.setItem('Prosperity' + $rootScope.version + 'GameOver', $rootScope.gameOverMsg);
                    //window.location.reload();
                },
                addQuest: function(quest) {
                    $rootScope.player.quests.push(quest);
                },
                checkQuestProgress: function(quest) {
                    //returns the progress on a quest
                }
            };

            return player;

        }
    ]);
