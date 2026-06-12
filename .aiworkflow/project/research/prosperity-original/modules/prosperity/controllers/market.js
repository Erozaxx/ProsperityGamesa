angular.module('prosperity').controller('MarketCtrl', ['$rootScope', '$http', '$interval', '$scope', 'Authentication', 'World', 'Player', 'Market',
    function($rootScope, $http, $interval, $scope, Authentication, World, Player, Market) {
        var user = Authentication.user;

        if (user && user.roles.indexOf('admin') >= 0) {
            //admin, show the market create/update panel

            $scope.editable = true;

            $scope.addToMarketObj = function(itemid) {
                if (!itemid) {
                    itemid = 'itemId';
                }
                $rootScope.marketObj.push({
                    itemId: itemid,
                    basePrice: 1,
                    available: 0,
                    max: 100000000,
                    added: false
                });
            }

            $scope.addToMarket = function(item) {
                Market.addToMarket(item);
            }

            $scope.updateToMarket = function(item) {
                Market.updateToMarket(item);
            }


            $scope.deleteFromMarket = function(item) {

                Market.deleteFromMarket(item);
            }

            $scope.processPasted = function() {
                var marketJSON = $scope.pastedJSON;
                var m = JSON.parse(marketJSON);
                $rootScope.marketObj = m;
            }

            function findInMarket(itemid) {
                console.log(itemid, $rootScope.marketObj.length);
                for (var i = 0; i < $rootScope.marketObj.length; i++) {
                    var item = $rootScope.marketObj[i];
                    if (item.itemId == itemid) {
                        return true;
                    }
                }
                return false;
            }

            $scope.lookForUnadded = function() {
                angular.forEach($rootScope.itemList, function(item, itemid) {
                    if ((item.type == 'goods' || item.type == 'food') && !findInMarket(itemid)) {
                        $scope.addToMarketObj(itemid);
                    }
                });
            }
        }



        if (World.checkReady()) {
            Player.travel('market');

            $scope.predicate = 'name';
            $scope.getBuyingPrice = function(itemid) {
                return Market.getBuying
            }
            function getPositionForPopup(event){
                var t = event.clientY;
                var l = event.clientX;

                if(t+180 > window.innerHeight){
                    t = window.innerHeight - 180;
                }
                if(l + 350 > window.innerWidth){
                    l = window.innerWidth - 350;
                }
                return {
                    top: t + 'px',
                    left: l + 'px'
                };
            }
            $scope.sellUI = {
                show: false,
                amount: 0,
                cancel: function() {
                    $scope.overlay.show = false;
                    this.show = false;
                },
                display: function(item, event) {
                    this.show = true;
                    this.item = item;
                    this.amount = 0;
                    $scope.overlay.show = true;
                    

                    $scope.overlay.positionStyle = getPositionForPopup(event);

                    this.maxSell = this.getMax();
                    $scope.buyUI.show = false;
                    Market.setMessage('');
                },
                total: function() {
                    if (this.item) {
                        return Math.round(Market.sellingPrice(this.item) * this.amount);
                    }
                },
                confirm: function() {
                    if ($rootScope.world.home.caravan.ready && this.amount > 0) {
                        $rootScope.world.home.caravan.sell[this.item.id] = this.amount;
                        this.cancel();
                    }
                },
                getMax: function() {
                    //calculate the max we can buy - it should be the minimum between remaining caravan capacity, and player's inventory
                    var remainCapacity = $rootScope.world.home.caravan.capacity;

                    for (var i in $rootScope.world.home.caravan.sell) {
                        remainCapacity -= $rootScope.world.home.caravan.sell[i];
                    }

                    return Math.min(remainCapacity, Player.count(this.item.id));

                },
                maxSell: 0,
                updateAmount: function() {
                    this.amount = Math.min(Number(this.amount), this.maxSell);
                    if (!this.amount || this.amount < 0) {
                        this.amount = 0;
                    }
                },
                item: null
            }

            $scope.buyUI = {
                show: false,
                amount: 0,
                cancel: function() {
                    $scope.overlay.show = false;
                    this.show = false;
                },
                display: function(item, event) {
                    this.show = true;
                    this.item = item;
                    this.amount = 0;
                    $scope.overlay.show = true;
                    
                    $scope.overlay.positionStyle = getPositionForPopup(event);

                    this.maxBuy = this.getMax('buy');
                    $scope.sellUI.show = false;
                    Market.setMessage(null);
                },
                total: function() {
                    if (this.item) {
                        return Math.round(Market.buyingPrice(this.item) * this.amount);
                    }
                },
                confirm: function() {
                    if ($rootScope.world.home.caravan.ready && this.amount > 0) {
                        $rootScope.world.home.caravan.buy[this.item.id] = this.amount;
                        this.cancel();
                    }

                },
                getMax: function() {
                    //calculate the max we can buy - it should be the minimum between remaining caravan capacity, and player's inventory
                    var remainCapacity = $rootScope.world.home.caravan.capacity;
                    for (var i in $rootScope.world.home.caravan.buy) {
                        remainCapacity -= $rootScope.world.home.caravan.buy[i];
                    }

                    return Math.min(remainCapacity, ~~ (Player.count('gold') / $scope.buyingPrice(this.item)));
                },
                maxBuy: 0,
                updateAmount: function() {
                    this.amount = Math.min(Number(this.amount), this.maxBuy);
                    if (!this.amount || this.amount < 0) {
                        this.amount = 0;
                    }
                },
                item: null
            }

            $scope.sendCaravan = function() {
                Market.sendCaravan();
            }

            $scope.marketPrice = function(item) {
                if (item) {
                    return item.marketPrice;
                } else {
                    return 0;
                }

            }

            $scope.overlay = {
                show: false,
                positionStyle: {
                    top: '0px',
                    left: '0px'
                }
            }

            $scope.buyingPrice = function(item) {
                if (item) {
                    return Market.buyingPrice(item);
                } else {
                    return 0;
                }

            }

            $scope.sellingPrice = function(item) {
                if (item) {
                    return Market.sellingPrice(item);
                } else {
                    return 0;
                }

            }

            $scope.removeFromBuy = function(itemid) {
                delete $rootScope.world.home.caravan.buy[itemid];
            }

            $scope.removeFromSell = function(itemid) {
                delete $rootScope.world.home.caravan.sell[itemid];
            }

            $scope.canAfford = function() {
                //check if the player can sell everything and that the net cost is affordable
                var caravan = $rootScope.world.home.caravan;
                if (Player.canAfford(caravan.sell) && -(caravan.buyTotal + caravan.sellTotal) <= $rootScope.player.gold) {
                    return true;
                } else {
                    return false;
                }
            }

            $scope.unload = function() {
                $rootScope.world.home.caravan.message = ''
                if ($rootScope.world.home.caravan.waitForUnload) {
                    $rootScope.fns.caravanUnload();
                }
            }

            var DEFAULTSIZE = 10000;
            var SCALE = 1.03;
            var INC = 100;
            var MAXALLOWED = 50000;

            $scope.maxAffordable = function(a, n) {
                //a = amount of money, n = current capacity
                return Math.min(Math.floor(INC * (Math.log((a / DEFAULTSIZE + Math.pow(SCALE, n / INC)) / Math.pow(SCALE, n / INC)) / Math.log(SCALE))), MAXALLOWED - n);
            }

            $scope.costOfExpansion = function(amount, base) {
                return Math.floor(DEFAULTSIZE * (Math.pow(SCALE, (base + amount) / INC) - Math.pow(SCALE, base / INC)));
            }

            var curCapacity = $rootScope.world.home.caravan.capacity;
            var money = $rootScope.player.gold;
            var m = $scope.maxAffordable(money, curCapacity);

            $scope.maxCapacity = m;

            $scope.buyMore = {};

            $scope.maxCapacityAffordable = function() {
                var curCapacity = $rootScope.world.home.caravan.capacity;
                var money = $rootScope.player.gold;
                $scope.maxCapacity = $scope.buyMore.amount = $scope.maxAffordable(money, curCapacity);
            }

            $scope.confirmCapacityPurchase = function() {
                var caravan = $rootScope.world.home.caravan;
                var cost = {
                    gold: $scope.costOfExpansion($scope.buyMore.amount, caravan.capacity)
                };
                if (Player.canAfford(cost) && $scope.buyMore.amount + caravan.capacity <= MAXALLOWED) {
                    Player.pay(cost);
                    Market.upgradeCaravanSize($scope.buyMore.amount);
                    $scope.buyMore.amount = 0;
                }
            }

            $scope.buyMore.amount = 0;

            $scope.$watch('buyMore.amount', function(newVal) {
                console.log('newVal: ' + newVal);
                $scope.buyCapacityCost = $scope.costOfExpansion(newVal, $rootScope.world.home.caravan.capacity);
            }, true);


            $rootScope.$watchCollection('world.home.caravan.buy', function() {
                var caravan = $rootScope.world.home.caravan;
                //update buySpaceLeft
                caravan.buySpaceLeft = caravan.capacity;
                caravan.buyTotal = 0;
                angular.forEach(caravan.buy, function(value, key) {
                    if (value < 0) {
                        caravan.buy[key] = 0;
                    } else {
                        caravan.buySpaceLeft -= value;
                        caravan.buyTotal += value * Market.buyingPrice(key);
                    }

                });

                caravan.netTotal = caravan.sellTotal - caravan.buyTotal;
            });

            $rootScope.$watchCollection('world.home.caravan.sell', function() {
                var caravan = $rootScope.world.home.caravan;
                //update sellSpaceLeft

                caravan.sellSpaceLeft = caravan.capacity;
                caravan.sellTotal = 0;
                angular.forEach(caravan.sell, function(value, key) {
                    if (value < 0) {
                        caravan.sell[key] = 0;
                    } else {
                        caravan.sellSpaceLeft -= value;
                        caravan.sellTotal += value * Market.sellingPrice(key);
                    }

                });

                caravan.netTotal = caravan.sellTotal - caravan.buyTotal;
            });

        }

    }
]);