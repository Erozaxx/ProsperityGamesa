'use strict';
var loadedGame = '';
angular.module('prosperity').controller('IndexCtrl', ['$rootScope', '$scope', '$http', '$mdDialog', '$timeout', 'Authentication', 'Engine', 'Game', 'World', '$state', 'Player', 'Battle', 'Chat', 'Home',
    function($rootScope, $scope, $http, $mdDialog, $timeout, Authentication, Engine, Game, World, $state, Player, Battle, Chat, Home) {
        $scope.browserMismatch = (navigator.userAgent.indexOf('Chrome') < 0 && navigator.userAgent.indexOf('Safari') < 0);
        //$rootScope.configged = false;
        $scope.start = function() {
            Game.start();
            if (!$rootScope.player.inGame) {
                $state.go('prosperity.home');
            }
        };

        $rootScope.altPressed = false;

        $scope.keydown = function(event) {
            if (event.altKey) {
                console.log(event, 'altPressed true');
                $rootScope.altPressed = true;
            }
        }

        $scope.keyup = function(event) {
            if (event.altKey) {
                console.log(event, 'altPressed false');
                $rootScope.altPressed = false;
            }
        }

        $scope.toggleEngine = function() {
            if ($rootScope.engine.state) {
                Engine.stop();
            } else {
                Engine.start();
            }
        };

        $scope.showTechTree = function(ev, sectorid) {
            $mdDialog.show({
                templateUrl: '/modules/prosperity/templates/techTree.html',
                controller: function($scope, $mdDialog) {
                    $scope.close = function() {
                        $mdDialog.hide();
                    }
                },
                scope: {
                    _sectorid: sectorid
                },
                clickOutsideToClose: true,
                escapeToClose: true,
                fullscreen: true,
                targetEvent: ev
            });
        };

        function checkLoggedIn() {
            var url = '/users/me';
            $http({
                url: url,
                method: "GET"
            }).success(function(user) {
                $rootScope.User = Authentication.user = user;
                $timeout(checkLoggedIn, 120000);
            }).error(function(err) {
                console.log('checkLoggedIn Fail', $scope.failCheck);

                if (!$scope.failCheck) {
                    $scope.failCheck = 1;
                } else {
                    $scope.failCheck++;
                }

                if ($scope.failCheck > 3) {
                    $rootScope.User = Authentication.user = null;
                    $state.go('signin');
                } else {
                    $timeout(function() {
                        checkLoggedIn();
                    }, 3000);
                }

            });
        }

        checkLoggedIn();
        $scope.pause = function(log) {
            Game.stop(log);
        }

        $scope.goto = function(state) {
            $timeout(function() {
                $state.go(state)
            }, 300);
        }

        $scope.save = function() {
            $scope.saving = true;
            $scope.saved = false;

            Game.save(true, null, $rootScope.curGameSave).then(function() {
                //success!
                $scope.saving = false;
                $scope.saved = true;
            }, function() {
                $scope.saving = false;
                $scope.saved = false;
            });
        };

        $scope.resume = function(log) {
            delete $rootScope.serverSaveCode;
            Game.resume(log);
        }

        $scope.load = function() {
            if (!Authentication.user) {
                $state.go('signin');
            } else {
                Game.start('Loaded');
                Game.load(true);
            }
        }

        $scope.explainCurrentSeason = function() {
            $rootScope.importantEvent.load('explain' + $rootScope.season.curSeason);
        }

        $scope.startIntro = function() {
            if (!Authentication.user) {
                $state.go('signin');
            } else {
                $rootScope.introed = true;
                if ($rootScope.storyScreens.intro) {
                    $rootScope.storyScreens.intro.state = 2;
                    $state.go('prosperity.intro');
                    Game.stop('Start Intro');
                }
            }
        }

        $scope.toggleExpand = function(forced) {
            if (forced !== undefined) {
                $scope.expanded = forced;
            } else {
                $scope.expanded = !$scope.expanded;
            }

            $scope.saved = false;

            if (!$scope.expanded) {
                $scope.resume('Expanded ');
            } else {
                $scope.pause('Not Expanded');
            }
        }

        $scope.openSaveAs = function(ev) {
            $rootScope.savename = $rootScope.world.home.name + ' - Moon ' + $rootScope.season.curMonth;

            $scope.saving = false;
            $scope.saved = false;

            $mdDialog.show({
                controller: SaveAsCtrl,
                templateUrl: '/modules/prosperity/templates/saveas.html',
                targetEvent: ev,
            }).then(function() {
                $scope.saved = true;
                $scope.saving = false;
            }, function() {
                $scope.saved = false;
                $scope.saving = false;
            });
        }

        $scope.discardModal = {
            itemId: null,
            amount: 0,
            display: false,
            discard: function() {
                var cost = {};
                cost[this.itemId] = this.amount;
                if (this.amount > 0 && Player.canAfford(cost)) {
                    Player.pay(cost);
                }
                this.close();
            },
            close: function() {
                this.amount = 0;
                this.display = false;
                Engine.start('Closed Discard Modal');
            },
            getMax: function() {
                return Player.count(this.itemId);
            },
            select: function(e, itemId) {
                e.stopPropagation();
                var y = e.pageY;
                var x = e.pageX;

                if (y + 135 > $(window).height()) {
                    y = $(window).height() - 135;
                }

                if (x + 360 > $(window).width()) {
                    x = $(window).width() - 360;
                }
                this.style = {
                    'top': y + 'px',
                    'left': x + 'px'
                };
                this.itemId = itemId;
                this.itemName = $rootScope.itemList[itemId].name;
                this.display = true;
                Engine.stop('Opened Discard Modal');
            }
        }


        $scope.handleClick = function(evt) {
            var elem = angular.element(evt.target);
            var _scope = elem.scope();
            
            if (_scope.item) {
                var _obj = $rootScope.itemList[_scope.item.itemid];


                if (evt.target.className.indexOf("discard") >= 0) {
                    //this is a discard event

                    Engine.stop('Discard modal opened');
                    $mdDialog.show({
                        scope: _scope,
                        controller: function($rootScope, Player, $scope, $mdDialog) {
                            $scope.obj = _obj;
                            console.log($scope);
                            $scope.discard = {
                                amt: 0,
                                max: $scope.item.amt
                            };

                            $scope.closeDialog = function() {
                                $mdDialog.hide();
                            };

                            $scope.confirmDiscard = function() {
                                var cost = {};
                                cost[$scope.obj.id] = $scope.discard.amt;
                                Player.pay(cost);
                                Engine.insertNotificationBar("Discarded " + $scope.discard.amt + " " + $scope.obj.name);

                                $scope.closeDialog();
                            };
                        },
                        templateUrl: 'modules/prosperity/templates/discardDialog.html',
                        clickOutsideToClose: true,
                        targetEvt: evt
                    }).then(function(answer) {
                        Engine.start('Discard modal closed')
                    });
                } else if (evt.target.className.indexOf("inventoryItem") >= 0) {
                    //click to sticky/unsticky
                    _obj.sticky = !_obj.sticky;
                    //updateSticky(_obj.id, _obj.sticky);
                }
            }

        }
        $scope.loadFromServer = function() {
            $scope.iptSaveCode = true;
        };


        /*Battle stuff*/

        $scope.battle = null;
        $rootScope.$watch('curBattle.state', function() {
            //curBattle exists!
            if ($rootScope.curBattle) {
                $scope.battle = $rootScope.curBattle;
                if ($rootScope.curBattle.state == 0) {
                    if ($rootScope.engine.state) {
                        Engine.stop('In Battle'); // stop the main engine
                    }


                    //the current battle display is now shown, and the player has to hit the "start" button

                } else if ($rootScope.curBattle.state == 1) {
                    //battle is ongoing


                } else if ($rootScope.curBattle.state == 2) {
                    //battle is ended, waiting for player to click "close"
                }
            }
        });

        $scope.startBattle = function() {
            if ($scope.battle.state == 0) {
                Battle.startBattle(); //start the battle!
            } else {
                console.log('CurBattle state not 0');
                console.log($scope.battle);
            }
        };

        $scope.closeBattleModal = function() {
            if ($scope.battle.state == 2) {
                delete $rootScope.curBattle;
                Engine.start('Battle Ended'); //start the engine again
            } else {
                console.log('CurBattle state not 2');
                console.log($scope.battle);
            }

        };

        //attacks
        $scope.attacks = Battle.attacks;

        $scope.useAttack = function(units, attack) {
            if ($rootScope.curBattle.state == 1) {
                Battle.attackWith(units, attack, $scope.battle.opponent);
            } else {
                console.log('CurBattle state not 1');
                console.log($scope.battle);
            }
        };

        $scope.getDamage = function(number, strength, multiplier) {
            return Battle.getDamage(number, strength, multiplier);
        };

        $scope.getDamageOf = function(attack) {
            return Battle.getDamageOf(attack);
        };

        $scope.describeSkill = function(attack, unit) {
            Battle.updatePowerOf(attack, unit);
            $rootScope.curBattle.activeDescription = attack;
        };

        $scope.rule = function() {
            var zone = $rootScope.curBattle.zone;

            Engine.insert(10, 'takeOver', ['player', zone.id]);
            //keep soldiers at new places

            zone.archers = Math.floor($rootScope.curBattle.player.archers.number);
            zone.warriors = Math.floor($rootScope.curBattle.player.warriors.number);

            //increase fear for each character
            angular.forEach($rootScope.itemList, function(item, itemId) {
                if (item.type == 'character' && itemId != 'player') {
                    item.playerOpinion.fear++;
                }
            });

            Engine.log('You choose to rule ' + zone.name + ' as a vassal');

            $rootScope.fns.updateTotalMilitaryUnits();
            $scope.closeBattleModal();
        };

        $scope.liberate = function() {
            var cB = $rootScope.curBattle;
            var homeZone = $rootScope.itemList.homeZone;
            var zone = cB.zone;
            Engine.insert(50, 'takeOver', [zone.originalLiege, zone.id, 'player']);

            zone.archers = 0;
            zone.warriors = 0;

            homeZone.warriors += cB.player.warriors.number;
            homeZone.archers += cB.player.archers.number;

            Engine.log('You choose to liberate ' + zone.name + ', they are eternally grateful');

            $rootScope.fns.updateTotalMilitaryUnits();
            $scope.closeBattleModal();
        };
        /*Chat stuff*/


        $scope.chatKey = function(e) {
            if (e.keyCode == 13) {
                //enter key, send message
                if ($scope.chatInput.length > 0) {
                    Chat.send('chat', $scope.chatInput);
                    if ($scope.chatInput.substring(0, 2) === '/w') {
                        var arr = $scope.chatInput.split(' ');
                        arr.splice(2, arr.length - 2);
                        $scope.chatInput = arr.join(' ') + ' ';
                    } else {
                        $scope.chatInput = ''; //clear it
                    }

                }
            }
        };

        $scope.connectToChat = function() {
            if (Authentication.user && !Chat.connected) {
                Chat.connect();
                $rootScope.chatPinned = true;
                $rootScope.connected = true;
            }
        };

        $scope.sendPM = function(username) {
            if (username != Authentication.user.username) {
                Chat.focusIpt();
                $scope.chatInput = '/w ' + username + ' ' + ($scope.chatInput || '');
            }
        };

        $scope.panelClick = function(ev) {
            var target = $(ev.target);
            if (target.is("[data-role=PMable]")) {
                $scope.sendPM(target.text().trim());
            }
        };

        $scope.toggleChatOnly = function() {
            $scope.chatOnly = !$scope.chatOnly;
            if ($scope.chatOnly) {
                $scope.toggleExpand(true);
            } else {

            }
        };

        $scope.setSpeed = function(speed) {
            $rootScope.engine.switchSpeed(speed);
        };

        $scope.curStep = 0;

        $rootScope.$watch('newMsg', function() {
            if ($rootScope.newMsg) {
                $scope.newMsg = $rootScope.newMsg;
                $timeout(function() {
                    $scope.newMsg = false;
                    $rootScope.newMsg = false;
                }, 2000);
            }
        });

        function init() {
            $scope.placeOrder = [
                $rootScope.itemList.home,
                $rootScope.itemList.masonsGuild,
                $rootScope.itemList.militaryCouncil,
                $rootScope.itemList.market,
                $rootScope.itemList.pub,
                $rootScope.itemList.council,
                $rootScope.itemList.university,
                $rootScope.itemList.wall,
                $rootScope.itemList.forest,
                $rootScope.itemList.mine,
                $rootScope.itemList.field,
            ];

            if ($rootScope.player.settings.doNotAutoJoinChat || $scope.attemptedConnect) {
                console.log('I don\'t want to connect to chat automatically or already connected');
            } else {
                $scope.attemptedConnect = true;
                console.log('attempted to connect to chat', $rootScope.player.settings);
                $scope.connectToChat(); //automatically connect them
            }
        }

        function tryInit() {
            if ($rootScope.configged && !$rootScope.inLoading) {
                init();
            } else {
                $timeout(tryInit, 200);
            }
        }


        $scope.randomTipList = [
            "Did you know you can click and hold rather than click the + button over and over?",
            "Fur is important to keep in the Winter, when people get cold and want to bundle up.",
            "Cheapest way to stop disease is to prevent it. If only we knew how.",
            "Having a variety of foods is essential for happiness!",
            "Medicine is pretty amazing stuff, even more amazing is that they don't spoil. What a magical world",
            "Have you donated to dSolver today?",
            "Remember to hug your baby",
            "Subscribe to http://www.reddit.com/r/ProsperityGame",
            "People don't like going hungry, don't let food run out.",
            "Sometimes there's just not enough space for all the drama, pick your friends wisely",
            "Bee stings hurt, bee honey is awesome. I'm sure there's a life lesson in all this",
            "Be awesome to each other on chat",
            "There are more people playing than shows up on chat, because sometimes you just want to be left alone",
            "Builders aren't needed if you have nothing for them to build, don't let them go bored",
            "If a task cannot be completed because it's out of season, the workers assigned to those tasks will quit. silly eh",
            "Rome wasn't built in a day, but don't take forever... you never know what's gonna happen",
            "There will be more features built, so be sure to keep in touch",
            "Having fun? Be sure to tell your friends about the game, if you're very nice, dSolver will give them an account for free!",
            "I love chocolate chip cookies. hint hint",
            "There's some level of action needed to win at battles. Winning is good, it means some casualties can recover",
            "Are Abby's parents still alive? Dun Dun DUNNNNN",
            "Having space for people to live is nice. Having too much space isn't! Then it feels empty",
            "Got suggestions? Please share with everyone one ProsperityGame subreddit!",
            "The ad is probably gonna go away, if there are actually donations to help fund the server",
            "The game is still in development! You are looking at a work in progress of a game close to 80% complete",
            "More content updates and bug fixes, coming soon (TM)",
            "While I'm sure you're capable of hacking the game, it's a lot more fun playing it without hacks",
            "Does it have a dotted underline? You can hover over it for some more information"
        ];

        $scope.getNewRandomTip = function() {
            if (!$scope.nextInd) {
                $scope.nextInd = ~~(Math.random() * $scope.randomTipList.length);
            } else {
                var last = $scope.nextInd;
                while ($scope.nextInd == last) {
                    $scope.nextInd = ~~(Math.random() * $scope.randomTipList.length);
                }
            }

            $scope.randomTip = $scope.randomTipList[$scope.nextInd];

            $timeout(function() {
                $scope.getNewRandomTip();
            }, 30000);
        }

        $scope.toggleSticky = function(ev, itemId) {
            ev.stopPropagation();
            $rootScope.itemList[itemId].sticky = !$rootScope.itemList[itemId].sticky;
        }

        $scope.isSticky = function(itemId) {
            if ($rootScope.itemList) {
                if ($rootScope.itemList[itemId]) {
                    return $rootScope.itemList[itemId].sticky ? 1 : 0;
                } else {
                    console.log('itemId ' + itemId + ' does not exist');
                    return 0;
                }
            }

        }

        $scope.updateInventory = function() {
            if ($rootScope.player && $rootScope.player.inventory) {
                $scope.inventory = $.map($rootScope.player.inventory, function(value, index) {
                    return {
                        itemId: index,
                        amount: value,
                        sticky: $rootScope.itemList[index].sticky ? true : false
                    }
                });

                $scope.inventory.sort(function(a, b) {
                    return a.sticky - b.sticky;
                });
            }

            $timeout(function() {
                $scope.updateInventory();
            }, 300);
        }

        //$scope.updateInventory();


        $scope.stockFood = function(ev, quest) {
            Engine.stop('stock food');
            console.log(quest);
            $scope.quest = quest;

            $scope.stock = {};

            for (var k in $rootScope.world.home.foodStore) {
                $scope.stock[k] = 0;
            }

            $mdDialog.show({
                controller: StockFoodCtrl,
                scope: $scope,
                preserveScope: true,
                templateUrl: '/modules/prosperity/templates/stockFood.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: false
            }).then(function(answer) {
                if ($scope.quest.completed) {
                    //give the reward, create notification, etc.
                    var msg = "Your assistance to " + $rootScope.itemList[$scope.quest.from].name + " has improved your favour with them by " + $scope.quest.reward.favour + ".";

                    Engine.log(msg);
                    Engine.createNotification(msg, 'questCompletion');
                    //remove the quest
                    $rootScope.fns.removeQuest($scope.quest.id);
                    $scope.quest = null;
                }
                Engine.start('end stock food');
            }, function() {
                Engine.start('end stock food');
            });
        };

        $scope.closeStockFood = function() {
            $mdDialog.hide();
        };

        $scope.sendFoodForQuest = function() {
            if ($scope.quest) {
                Player.pay($scope.stock);
                $rootScope.fns.increaseFavour($scope.quest.from, 'player', $scope.quest.reward.favour);
                $scope.quest.completed = true;
                if ($scope.quest.reward.gold) {
                    Player.insertInventory({
                        gold: $scope.quest.reward.gold
                    });
                }
                $scope.stock = {};
            }
        };

        $scope.sendTroops = function(ev, quest) {
            $scope.quest = quest;
            Engine.stop('send troops');
            $scope.troops = {
                archers: 0,
                warriors: 0
            };

            $mdDialog.show({
                controller: SendTroopsCtrl,
                scope: $scope,
                preserveScope: true,
                templateUrl: '/modules/prosperity/templates/sendTroops.html',
                parent: angular.element(document.body),
                targetEvent: ev,
                clickOutsideToClose: false
            }).then(function(answer) {
                if ($scope.quest.completed) {
                    var msg = "Your assistance to " + $rootScope.itemList[$scope.quest.from].name + " has improved your favour with them by " + $scope.quest.reward.favour + ".";
                    Engine.log(msg);
                    Engine.createNotification(msg, 'questCompletion');
                    //remove the quest
                    $rootScope.fns.removeQuest($scope.quest.id);
                    $scope.quest = null;
                }
                Engine.start('end send troops');
            }, function() {
                Engine.start('end send troops');
            });
        }

        $scope.closeSendTroops = function() {
            $mdDialog.hide();
        };

        $scope.sendTroopsForQuest = function() {
            if ($scope.quest) {
                $rootScope.itemList.homeZone.warriors -= $scope.troops.warriors;
                $rootScope.itemList.homeZone.archers -= $scope.troops.archers;

                $rootScope.itemList[$scope.quest.from].warriors += $scope.troops.warriors;
                $rootScope.itemList[$scope.quest.from].archers += $scope.troops.archers;

                $rootScope.fns.increaseFavour($scope.quest.from, 'player', $scope.quest.reward.favour);
                $scope.quest.completed = true;
                if ($scope.quest.reward.gold) {
                    Player.insertInventory({
                        gold: $scope.quest.reward.gold
                    });
                }
                $scope.troops = {
                    archers: 0,
                    warriors: 0
                }
            }
        };

        //$scope.getNewRandomTip();

        $scope.showProjectPane = function(ev) {
            Engine.stop('Opened Project Pane');
            $mdDialog.show({
                controller: function($rootScope, $scope, $mdDialog) {
                    $scope.hide = function() {
                        $mdDialog.hide();
                    }
                },
                templateUrl: '/modules/prosperity/templates/projectPane.html',
                targetEvent: ev,
                clickOutsideToClose: true
            }).then(function() {
                Engine.start('Closed Project Pane');
            }, function() {
                Engine.start('Closed Project Pane');
            });
        }

        tryInit();
    }
]);

function StockFoodCtrl($rootScope, $scope, $mdDialog, Home, Player) {


    $scope.$watchCollection('stock', function() {
        $scope.total = 0;
        for (var k in $scope.stock) {
            if ($scope.stock[k] > $rootScope.world.home.foodStore[k]) {

                $scope.stock[k] = $rootScope.world.home.foodStore[k];
            }
            $scope.total += $scope.stock[k];
        }
    });

    $scope.done = function() {
        $mdDialog.hide();
    }
}

function SendTroopsCtrl($rootScope, $scope, $mdDialog, Home, Player) {

    $scope.$watchCollection('troops', function() {
        $scope.total = $scope.troops.warriors + $scope.troops.archers
    });

    $scope.done = function() {
        $mdDialog.hide();
    }
}
