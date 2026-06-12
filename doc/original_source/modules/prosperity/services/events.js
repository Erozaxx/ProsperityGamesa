'use strict';

angular.module('prosperity')
    .service('Events', ['$rootScope', 'Engine', 'Home', 'Player', 'Market',
        function Events($rootScope, Engine, Home, Player, Market) {

            var events = {
                init: function() {
                    this.setupEvents();

                    $rootScope.initEvents = true;
                },
                startCheck: function() {

                    Engine.clearPastEvents();
                    console.log("curStep: " + $rootScope.engine.curStep);

                    var period = $rootScope.STEPSPERDAY * 5; //5
                    var nextTime = ~~($rootScope.AIMechanicStart);
                    if (nextTime < $rootScope.engine.curStep) {
                        nextTime = 0;
                    } else {
                        nextTime = $rootScope.engine.curStep - nextTime;
                    }
                    Engine.clearPastEvents();
                    if (Engine.countEvent('processAI', 'theWarlord') == 0) {
                        Engine.insert(nextTime + 3000, 'processAI', ['theWarlord', period]);
                    }

                    if (Engine.countEvent('processAI', 'thePrincess') == 0) {
                        Engine.insert(nextTime + 1000, 'processAI', ['thePrincess', period]);
                    }

                    if (Engine.countEvent('processAI', 'thePsychopath') == 0) {
                        Engine.insert(nextTime + 2000, 'processAI', ['thePsychopath', period]);
                    }

                    //Engine.insert(1000, 'eventWanderer');
                    //Engine.insert(30000, 'eventPlague');
                    //Engine.insert(70000, 'eventPlague');
                    var seasonLength = $rootScope.STEPSPERDAY * 90;

                    Engine.once(~~(seasonLength * 1.6), 'eventTravellingPhysician');
                    Engine.once(~~(seasonLength * 4.4), 'eventPlague');
                    Engine.once(~~(seasonLength * 13.78), 'eventPlague');
                    Engine.once(~~(seasonLength * 15.5), 'eventPlague');
                    Engine.once(~~(seasonLength * 22.03), 'eventPlague');
                    Engine.once(~~(seasonLength * 25.42), 'eventPlague');
                    Engine.once(~~(seasonLength * 34.55), 'eventPlague');
                    Engine.once(~~(seasonLength * 49.35), 'eventPlague');
                    Engine.once(~~(seasonLength * 59.55), 'eventPlague');
                    Engine.once(~~(seasonLength * 61.545), 'eventPlague');
                    Engine.once(~~(seasonLength * 73.5), 'eventPlague');
                    Engine.once(~~(seasonLength * 82.45), 'eventPlague');
                    Engine.once(~~(seasonLength * 95.35), 'eventPlague');


                    Engine.once(~~(seasonLength * 2.6), 'eventWarlordCapturesPointAnne');
                    Engine.once(~~(seasonLength * 2.9), 'eventWarlordAttacksRedWater');
                    Engine.once(~~(seasonLength * 3.3), 'eventWarlordAttacksTomiko');
                    Engine.once(~~(seasonLength * 3.7), 'eventWarlordAttacksSilverInslet');
                    Engine.once(~~(seasonLength * 4.2), 'eventWarlordAttacksNephton');
                    Engine.once(~~(seasonLength * 4.8), 'eventWarlordAttacksHornCastle');
                    Engine.once(~~(seasonLength * 5.9), 'eventPsychoAttacksHighFalls');
                    Engine.once(~~(seasonLength * 6.3), 'eventPsychoAttacksFalkenburg_f');
                    Engine.once(~~(seasonLength * 6.6), 'eventWarlordAttacksFalkenburg_s');
                    Engine.once(~~(seasonLength * 1.5), 'eventPrincessCapturesKitsilano');
                    Engine.once(~~(seasonLength * 2.95), 'eventPrincessCapturesAltona');


                },

                setupEvents: function() {
                    //preconfigured events
                    $rootScope.events = {
                        newPeople: function() {
                            if ($rootScope.world.home.curWorkers < $rootScope.world.home.maxWorkers) {
                                Home.newWorkers(2);
                                //Engine.insert(3000, 'eventNewPeople');
                            } else {
                                //Engine.insert(1400, 'eventNewPeople');
                            }
                        },
                        foundField: function() {
                            if (!$rootScope.itemList.field.unlocked) {
                                Player.unlock('field');
                                if (!$rootScope.importantEvent.foundField.used) {
                                    $rootScope.importantEvent.load('foundField');
                                }
                            }
                        },
                        ximniTrader: function() {
                            if ($rootScope.player.gold > 108) {

                                if (!$rootScope.importantEvent.firstXimniVisit.used) {
                                    $rootScope.importantEvent.load('firstXimniVisit');
                                } else {
                                    var title = 'A mysterious woman is offering honey and wax for gold';
                                    var c = Math.min(20, $rootScope.player.events.ximniTradeCount);
                                    var amount = Math.round(Math.pow(1.25, c) * 500);
                                    var honeyAmt = ~~Math.pow(1.25, c) * 30;
                                    var waxAmt = ~~Math.pow(1.25, c) * 80;


                                    var cost = {
                                        gold: amount
                                    };
                                    var reward = {
                                        honey: honeyAmt,
                                        wax: waxAmt
                                    };

                                    var rewardString = $rootScope.fns.listGoods(reward);
                                    var expiration = 20;
                                    Home.insertContract(title, cost, rewardString, expiration, 'contractXimniTraderComplete', 'contractXimniTraderIncomplete', 'contractXimniTraderIncomplete', {
                                        reward: reward
                                    });
                                }
                            } else {
                                Engine.insert(6500 + Math.floor(Math.random() * 1500), 'eventXimniTrader', null, true);
                            }
                        },
                        goodsBuyer: function() {

                            if ($rootScope.player.curCapacity > 0) {
                                var title = 'A travelling trader wishes to purchase goods from you';
                                var cost = {};
                                var total = 0;
                                var reward = {
                                    gold: 0
                                };
                                var breakdown = {};
                                var rewardString = null;


                                var maxItems = 5; //at most, we're going to ask for 5 things
                                var added = 0;
                                while (reward.gold == 0) {
                                    var itemsArray = [];
                                    //shuffle the items
                                    angular.forEach($rootScope.player.inventory, function(amt, itemId) {
                                        if (amt > 100) {
                                            if (Math.random() < 0.5) {
                                                itemsArray.push(itemId);
                                            } else {
                                                itemsArray.unshift(itemId);
                                            }
                                        }

                                    });

                                    var cpi = (1 / 8) - Math.random() / 4 + 1;
                                    var done = false;
                                    for (var i = 0; i < itemsArray.length && !done; i++) {
                                        var itemId = itemsArray[i];
                                        var amt = $rootScope.player.inventory[itemId];
                                        var item = $rootScope.itemList[itemId];


                                        if (!item.limited) {
                                            var amount = Math.round((Math.random() * 0.75 + 0.25) * amt / 5) * 5; //round to 5
                                            if (amount > 0) {
                                                if (amount > 5000) {
                                                    amount = 5000;
                                                }
                                                total += amount;
                                                var item = Market.getItem(itemId);
                                                if (item && added < maxItems) {
                                                    cost[itemId] = amount;
                                                    var goldval = Math.round(cpi * item.basePrice * amount);
                                                    reward.gold += goldval;
                                                    breakdown[itemId] = goldval;
                                                    added++;
                                                    if (Math.random() < 0.2) {
                                                        done = true;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }

                                if (reward.gold > 0) {
                                    var expiration = 50;
                                    Home.insertContract(title, cost, rewardString, expiration, 'contractGoodsBuyerComplete', 'contractGoodsBuyerExpire', 'contractGoodsBuyerReject', {
                                        reward: reward,
                                        breakdown: breakdown,
                                        cpi: cpi
                                    });
                                } else {
                                    console.log('no items of value found');
                                    Engine.insert(34 * $rootScope.STEPSPERDAY, 'eventGoodsBuyer', null, true);
                                }
                            } else {
                                //Engine.insert(18 * $rootScope.STEPSPERDAY, 'eventGoodsBuyer', null, true);
                            }
                        },
                        goodsSeller: function() {
                            var rand = Math.random();
                            var products = {};
                            if (rand < 0.1) {
                                var dailyNeeds = $rootScope.world.home.curWorkers * 10;
                                products = {
                                    bread: Math.floor(dailyNeeds/3),
                                    cheese: Math.floor(dailyNeeds/3),
                                    meat: Math.floor(dailyNeeds/3)
                                }
                            } else if (rand < 0.2) {
                                products = {
                                    iron: 400,
                                    coal: 400
                                }
                            } else if (rand < 0.3) {
                                products = {
                                    wood: 500,
                                    fur: 500
                                }
                            } else if (rand < 0.4) {
                                products = {
                                    herb: 400,
                                    fruit: 400
                                }
                            } else if (rand < 0.5) {
                                products = {
                                    steel: 200,
                                    lumber: 300
                                }
                            } else if (rand < 0.6) {
                                products = {
                                    flour: 500
                                }
                            } else if (rand < 0.7) {
                                products = {
                                    wine: 100
                                }
                            } else if (rand < 0.8) {
                                products = {
                                    homeopathicMedicine: 10
                                }
                            } else if (rand < 0.9) {
                                products = {
                                    wool: 250,
                                    linen: 100
                                }
                            } else {
                                products = {
                                    fish: 500
                                }
                            }

                            var goldcost = {
                                gold: $rootScope.fns.getGoldValue(products) * 1.4
                            }

                            if ($rootScope.player.gold >= goldcost.gold * 0.7) {
                                Home.insertContract("A travelling merchant has some stuff to sell", goldcost, "Stuff this trader has been lugging around", 15, 'contractGoodsSellerComplete', 'noop', 'noop', {
                                    reward: products
                                });
                            }
                        },
                        foodSurplus: function() {
                            var possiblePlaces = [$rootScope.itemList.altona, $rootScope.itemList.madawaska, $rootScope.itemList.kitsilano];
                            var places = [];
                            for (var i = 0; i < possiblePlaces.length; i++) {
                                var place = possiblePlaces[i];

                                if (place.liege != 'thePsychopath' && place.liege != 'theWarlord') {

                                }
                            }
                        },
                        marbleSeller: function() {

                            var amount = ~~((Math.random() * (2000 * $rootScope.world.home.level) + 200) / 10);
                            //scale amount with the level of the home town
                            var cost = {
                                gold: Math.round(amount * 3500 * (Math.random() * 0.6 + 0.6))
                            }
                            var marbleCount = $rootScope.player.inventory.marble || 0;
                            var graniteCount = $rootScope.player.inventory.granite || 0;


                            var chanceOfMarble; //likelihood of getting marble

                            if (marbleCount == graniteCount)
                                chanceOfMarble = 0.5;

                            else
                                chanceOfMarble = (graniteCount - marbleCount) * 0.5 / (marbleCount + graniteCount) + 0.5; //if there's more granite than marble, chance for marble goes up and vice versa

                            if (Math.random() < chanceOfMarble) {
                                var reward = {
                                    marble: amount
                                }
                                var title = 'A foreign caravan carrying Marble rolls into town, the merchant is happy to sell a portion of the wares';

                                var rewardString = amount + ' slabs of Marble, a valuable resource for fancy buildings';

                            } else {
                                var reward = {
                                    granite: amount
                                }
                                var title = 'A foreign caravan carrying Granite rolls into town, the merchant is happy to sell a portion of the wares';

                                var rewardString = amount + ' blocks of Granite, a valuable resource for fancy buildings';

                            }


                            var expiration = 30;

                            Home.insertContract(title, cost, rewardString, expiration, 'contractMarbleSellerComplete', 'contractMarbleSellerExpire', 'contractMarbleSellerReject', {
                                reward: reward
                            });

                        },
                        mercenaryForHire: function() {
                            var amount = ~~(Math.random() * 15) + 5;
                            var archerCount = ~~(Math.random() * amount);

                            var warriorCount = amount - archerCount;
                            var cost = {
                                gold: amount * 2400
                            };

                            var title = amount + ' mercenaries are willing to work for ' + Market.convertToCurrency(cost.gold, true);

                            title += '. They are composed of ' + (archerCount > 0 ? (archerCount + ' archers ') : '') + ((archerCount > 0 && warriorCount > 0) ? 'and ' : '') + (warriorCount > 0 ? (warriorCount + ' warriors') : '');

                            Home.insertContract(title, cost, '', 40, 'contractMercenaryComplete', 'contractMercenaryExpire', 'contractMercenaryExpire', {
                                warrior: warriorCount,
                                archer: archerCount
                            });
                        },
                        houseBuilder: function(company) {
                            var title = company.name + ' offering to build a ' + company.type;
                            var cost = company.cost;
                            var house = $rootScope.itemList[company.type];
                            var rewardString = 'A house (+' + house.effects.workers + ' max population, +' + house.effects.capacity + ' max inventory)';
                            var expiration = 14;
                            Home.insertContract(title, cost, rewardString, expiration, 'contractHouseBuilderComplete', 'contractHouseBuilderExpire', 'contractHouseBuilderReject', {
                                company: company
                            });
                        },
                        mineBuilder: function() {
                            var title = 'Wanna mine?';
                            if (!$rootScope.itemList.mine.unlocked && !Home.hasContract(title)) {
                                var cost = {
                                    wood: 1800
                                };
                                var rewardString = 'A shiney new mine all to yourself';
                                var expiration = 180;
                                Home.insertContract(title, cost, rewardString, expiration, 'contractMineBuilderComplete', 'contractMineBuilderExpire', 'contractMineBuilderReject');
                            }
                        },
                        mineExpander: function() {
                            if ($rootScope.area.fieldSpace > 500) {
                                var title = 'Let me help you expand your mine';
                                var cost = {
                                    gold: $rootScope.fns.getGoldValue({
                                        iron: 4000
                                    })
                                };
                                var rewardString = 'A chance at uncovering new ores. Beware however, some land (up to 500 space) from the Field may be irreversibly damaged by this';

                                var expiration = 30;
                                Home.insertContract(title, cost, rewardString, expiration, 'contractMineExpanderComplete', 'noop', 'noop')
                            }


                        },
                        masterBuilder: function() {
                            if (!$rootScope.importantEvent.masterBuilder.used) {
                                var msg = 'A master mason has taken up residence in your settlement, says he can help create buildings for you';
                                $rootScope.importantEvent.load('masterBuilder');
                                Engine.log(msg);
                            }
                        },
                        startMineExpansion: function() {
                            var msg = 'As the available ores decrease, the miners suggest expanding the mine through digging new tunnels.';
                            Engine.log(msg);
                            Engine.createNotification(msg);
                            $rootScope.player.events.mineExpansion = 1;
                        },
                        takeBack: function(ai, zoneId) {
                            var character = $rootScope.itemList[ai];

                            var zone = $rootScope.itemList[zoneId];

                            var capital = $rootScope.fns.getCapital(character.id);

                            $rootScope.fns.updateMilitaryRating(zoneId);
                            $rootScope.fns.updateMilitaryRating(capital.id);

                            if (capital.militaryRating > zone.militaryRating * 1.5) {

                                $rootScope.fns.startBattle(ai, zoneId); //launch a counter-attack

                            }

                        },
                        travellingPhysician: function() {
                            if ($rootScope.world.home.level < 3) {
                                if ($rootScope.world.home.infected > 0) {
                                    $rootScope.importantEvent.load('travellingPhysician');
                                } else {
                                    if ($rootScope.itemList.herbalistShop.created < 2) {
                                        if (Math.random() < 0.25) {
                                            $rootScope.importantEvent.load('travellingPhysicianSellMedicine');
                                        } else {
                                            Engine.insert(18000 + Math.floor(Math.random() * 18000), 'eventTravellingPhysician');
                                        }
                                    }
                                }
                            }
                        }
                    };


                }

            }
            return events;
        }
    ]);
