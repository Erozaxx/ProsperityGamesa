'use strict';

angular.module('prosperity')
    .service('Market', ['$rootScope', '$http', '$location', '$timeout', 'Player', 'Engine', 'Item',
        function Market($rootScope, $http, $location, $timeout, Player, Engine, Item) {
            // AngularJS will instantiate a singleton by calling "new" on this function

            function setDemand(itemId, demand) {
                getItem(itemId).demand = demand;
            }

            function getItem(itemId) {
                return $rootScope.itemList[itemId];
            }

            var market = {
                step: function() {

                    var self = this;
                    //do nothing now
                    /*if ($rootScope.engine.curStep % $rootScope.STEPSPERDAY * 14 == 0) {
                        this.checkCaravan();
                    }*/

                    if ($rootScope.engine.curStep % $rootScope.STEPSPERDAY * 5 == 0) {
                        this.getUpdatedData();
                        this.checkTradableGoods();
                    }
                    /*
                    var tradingHouse = $rootScope.itemList.tradingHouse;
                    if (tradingHouse.unlocked) {
                        if (tradingHouse.orders) {
                            var order, i = 0;
                            while (i < tradingHouse.orders.length) {
                                order = tradingHouse.orders[i];
                                order.curProgress++;
                                if (order.curProgress > order.maxProgress) {
                                    var item = $rootScope.itemList[order.item];
                                    item.ordered = false;

                                    var stuff = {};
                                    stuff[order.item] = order.amt;
                                    if (Player.hasCapacityFor(stuff)) {
                                        Player.insertInventory(stuff);

                                        tradingHouse.orders.splice(i, 1); //remove this order (because it's complete);
                                        i--;
                                    } else {
                                        order.waitForRoom = true;
                                    }
                                }

                                i++;
                            }
                        }
                    }

                    if (Engine.curStep % $rootScope.STEPSPERDAY * tradingHouse.frequency === 0) {
                        //is a new day
                        if (tradingHouse.unlocked) {
                            //items watch, making buy and sell orders
                            if (tradingHouse.orders.length < tradingHouse.curLevel * 6) {
                                angular.forEach($rootScope.player.inventory, function(amt, itemid) {
                                    
                                    var item = $rootScope.itemList[itemid];
                                    if (item.type == "goods" && item.watched && !item.limited) {
                                        if (!item.ordered) {
                                            if (amt && amt < item.minAmt) {
                                                //$rootScope.fns.createBuyOrder({item.id: item.minAmt-amt});
                                                var amount = Math.round(item.minAmt - amt);
                                                var cost = {
                                                    gold: self.buyingPrice(item.id) * amount
                                                }

                                                if (Player.canAfford(cost)) {
                                                    Player.pay(cost);
                                                    tradingHouse.orders.push({
                                                        item: item.id,
                                                        action: 'buy',
                                                        amt: amount,
                                                        maxProgress: (10 - tradingHouse.curLevel) * $rootScope.STEPSPERDAY,
                                                        curProgress: 0
                                                    });

                                                }

                                                item.ordered = true;
                                            } else if (amt && amt > item.maxAmt) {
                                                tradingHouse.orders.push({
                                                    item: item.id,
                                                    action: 'sell',
                                                    amt: Math.round(amt - item.maxAmt),
                                                    maxProgress: (10 - tradingHouse.curLevel) * $rootScope.STEPSPERDAY,
                                                    curProgress: 0
                                                });
                                                item.ordered = true;
                                            }
                                        }
                                    }
                                });
                            }

                        }
                    }*/

                    var caravan = $rootScope.world.home.caravan;

                    if (caravan.sentOut) {
                        caravan.sentOut--;
                        if (caravan.sentOut == 0) {
                            Engine.insert(200, 'caravanReturns');
                        }
                    }
                },
                calcMarketPrice: function(item) {
                    if (!item) {
                        console.log('Item does not exist: ', item);
                        return 0;
                    }
                    if (isNaN(item.basePrice) || item.basePrice < 0 || isNaN(item.available) || item.available < 0 || !item.max) {
                        console.error('Error: item does not have market data:', item);
                       return 0;
                    } else {
                        return Math.round(item.basePrice * Math.pow(1.5 - (Math.min(item.available, item.max) / item.max), 3) * 1000) / 1000;
                    }
                },
                getGoldValue: function(items) {
                    var goldVal = 0;
                    for (var id in items) {
                        var amt = items[id];
                        if (id == 'gold') {
                            goldVal += amt;
                        } else {
                            var item = this.getItem(id);
                            if (!item) {
                                console.error("cannot seem to find item: " + id);
                            }
                            goldVal += this.calcMarketPrice(item) * amt;
                        }
                    }
                    return goldVal;
                },
                init: function() {
                    this.marketObj = $rootScope.marketObj;

                    angular.forEach($rootScope.player.inventory, function(amt, itemid){
                        var item = $rootScope.itemList[itemid];
                        if(item && !item.unlocked){
                            item.unlocked = true;
                        }
                    });
                    this.checkTradableGoods();
                    //this.checkCaravan();
                    $rootScope.fns.calcCaravanCapacity();
                },
                checkTradableGoods: function(){
                    var m = $rootScope.world.market;
                    m.tradedGoods = [];
                    angular.forEach(m.items, function(obj, objid){
                        if(obj.unlocked && !obj.limited){
                            m.tradedGoods.push(obj);
                        }
                    });
                },
                getItem: function(itemId) {
                    return getItem(itemId);
                },
                buyingPrice: function(item) {
                    if (typeof item == 'string') {
                        item = this.getItem(item);
                    }
                    var mod = $rootScope.player.haggleBuy;
                    if ($rootScope.itemList.bookKeeping.unlocked) {
                        mod -= 0.1
                    }
                    if($rootScope.itemList.tradingHouse.unlocked){
                        mod -= 0.1
                    }

                    return Math.round(item.marketPrice * mod * 100) / 100;
                },
                sellingPrice: function(item) {
                    if (typeof item == 'string') {
                        item = this.getItem(item);
                    }
                    var mod = $rootScope.player.haggleSell;
                    if ($rootScope.itemList.bookKeeping.unlocked) {
                        mod += 0.1
                    }
                    if($rootScope.itemList.tradingHouse.unlocked){
                        mod += 0.15
                    }

                    return Math.round(item.marketPrice * mod * 100) / 100;
                },
                setMessage: function(msg) {
                    $rootScope.world.market.message = msg;
                },
                move: function(item, amount) {
                    //adding stuff, note that negative amounts = removing stuff
                    //returns the amount of stuff moved
                    var newAmt = item.amount + amount;
                    if (newAmt > item.maxStock) {
                        amount = item.maxStock - item.amount;
                    }
                    if (newAmt < 0) {
                        amount = item.amount;
                    }

                    item.amount += amount;
                    return Number(amount);
                },
                convertToCurrency: function(input, toString, rounding) {

                    if ($rootScope.player && $rootScope.player.settings.plainCurrency) {
                        var _input = Math.abs(input);
                        if (_input > 1000000000) {
                            return (_input / 1000000000).toFixed(2) + 'b cu';
                        } else if (_input > 1000000) {
                            return (input / 1000000).toFixed(2) + 'm cu';
                        } else if (_input > 1000) {
                            return (input / 1000).toFixed(2) + 'k cu';
                        } else {
                            return input.toFixed(2) + ' cu';
                        }
                    } else {
                        var s = 1;
                        if (input < 0) {
                            s = -1;
                            input = -input;
                        }
                        //curis - base unit, agris - 108 cu, auris - 197 ag, biris - 209 au

                        var bi = Math.floor(input / (108 * 197 * 209));
                        input = input % (108 * 197 * 209);
                        var au = Math.floor(input / (108 * 197));
                        input = input % (108 * 197);
                        var ag = Math.floor(input / 108);
                        input = input % 108;
                        var cu = input;

                        if (rounding !== undefined && typeof rounding !== 'number') {
                            rounding = 2;
                        }

                        if(rounding === undefined){
                            rounding = 0;
                        }

                        if (toString) {
                            return (s < 0 ? '-' : '') + (bi > 0 ? bi + 'bi ' : '') + (au > 0 ? au + 'au ' : '') + (ag > 0  ? ag + 'ag ' : '') + (cu > 0 ? (cu.toFixed(rounding) + 'cu') : '');
                        } else {
                            return {
                                bi: bi * s,
                                au: au * s,
                                ag: ag * s,
                                cu: cu * s
                            }
                        }
                    }

                },
                getUpdatedData: function(callback) {
                    var self = this;
                    //console.log('updating market');
                    $http({
                        url: "/market",
                        method: "GET"
                    }).success(function(data, status, headers, config) {
                        self.marketObj = $rootScope.marketObj = [];
                        for (var itemId in data) {
                            self.marketObj.push(data[itemId]);
                        }

                        for (var i in self.marketObj) {
                            var item = self.marketObj[i];
                            item.added = true;

                            if ($rootScope.itemList[item.itemId]) {
                                var it = $rootScope.itemList[item.itemId];
                                if (!it) {
                                    console.error('itemId: ' + itemId + ' does not exist');
                                } else {
                                    it.basePrice = item.basePrice;
                                    it.available = item.available;
                                    it.max = item.max;
                                    it.marketPrice = self.calcMarketPrice(it);
                                }
                            } else {
                                console.log(item.id + ' does not exist (yet)');
                            }
                        }
                        if (callback) {
                            callback();
                        }
                    }).error(function(data, status, headers, config) {
                        console.log(data);
                        console.log(status);

                        if (status == 401 && data.message == "User is not logged in") {
                            //user not logged in, send them to signin screen
                            $location.path('/signin');
                        }
                    })
                },
                upgradeCaravanSize: function(amt) {

                    $rootScope.world.home.caravan.capacity += amt;
                    if ($rootScope.world.home.caravan.capacity > MAXALLOWED) {
                        $rootScope.world.home.caravan.capacity = MAXALLOWED;
                    }

                    var msg = 'Your caravan capacity has been upgraded to ' + $rootScope.world.home.caravan.capacity;
                    Engine.log(msg);
                    Engine.createNotification(msg);
                },
                addToMarket: function(item) {
                    $http({
                        url: '/market',
                        method: 'POST',
                        data: item
                    }).success(function(data) {
                        item.added = true;
                    }).error(function(data) {
                        console.log(data);
                    });
                },
                deleteFromMarket: function(item) {
                    var self = this;
                    $http({
                        url: '/market/' + item.itemId,
                        method: 'DELETE'
                    }).success(function(data) {
                        console.log(data);
                        self.marketObj.splice(self.marketObj.indexOf(item));
                    }).error(function(data) {
                        console.log(data);
                    });

                },
                updateToMarket: function(item, callback) {
                    var self = this;
                    $http({
                        url: '/market/' + item.itemId,
                        method: 'PUT',
                        data: item
                    }).success(function(data) {
                        console.log(data);
                    }).error(function(data) {
                        console.log(data);
                    });
                },
                //caravan stuff
                sendCaravan: function() {
                    var self = this;
                    var caravan = $rootScope.world.home.caravan;
                    console.log(caravan);
                    caravan.error = '';

                    if (caravan.ready) {
                        //check buy and sell lists
                        var usedBuyCapacity = 0;
                        var buyTotal = 0;
                        for (var itemId in caravan.buy) {
                            buyTotal += self.buyingPrice(itemId) * caravan.buy[itemId];
                            usedBuyCapacity += caravan.buy[itemId];
                        }

                        if (usedBuyCapacity <= caravan.capacity) {
                            //check sell
                            var usedSellCapacity = 0;
                            var sellTotal = 0;
                            for (var itemId in caravan.sell) {
                                sellTotal += self.sellingPrice(itemId) * caravan.sell[itemId];
                                usedSellCapacity += caravan.sell[itemId];
                            }

                            if (usedSellCapacity <= caravan.capacity) {
                                //awesome, check if we can afford it.
                                var expenditures = buyTotal - sellTotal; //net income, -net = expenditures
                                if (expenditures <= $rootScope.player.gold) {
                                    //affordable! - set the recGoods, make deductions, send caravan
                                    caravan.recGoods = jQuery.extend({}, caravan.buy);
                                    Player.pay(caravan.sell); //remove the selling items from inventory

                                    if (expenditures > 0) {
                                        Player.pay({
                                            gold: expenditures
                                        });
                                    } else {
                                        caravan.recGoods.gold = -expenditures;
                                    }

                                    //fees have been paid, we're just sending this to the server now, 
                                    //clearing the buy and sell lists, and setting the caravan ready to false, 
                                    //then inserting an engine event

                                    /*$http({
                                        url: '/sendCaravan',
                                        method: 'POST',
                                        data: {
                                            buy: caravan.buy,
                                            sell: caravan.sell
                                        }
                                    });*/
                                    var speed = caravan.speed;
                                    if($rootScope.itemList.dirtRoad.unlocked){
                                        speed +=1;
                                    }
                                    if($rootScope.itemList.gravelRoad.unlocked){
                                        speed +=2;
                                    }
                                    caravan.maxSteps = $rootScope.STEPSPERDAY * (30 - caravan.speed);
                                    caravan.sentOut = caravan.maxSteps;
                                    caravan.buy = {};
                                    caravan.sell = {};
                                    caravan.ready = false;
                                }
                            }
                        }

                    } else {
                        console.log('caravan not ready yet!');
                        caravan.error = 'caravan not ready yet!';
                    }

                }
            }

            return market;

        }
    ]);
