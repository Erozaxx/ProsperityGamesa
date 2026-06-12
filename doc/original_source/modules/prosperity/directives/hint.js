'use strict';

angular.module('prosperity')
    .directive('hint', ['$rootScope', '$timeout', '$compile', 'Engine', 'World', 'Skills', 'Techs', 'Player', 'Market', '$mdDialog',
        function($rootScope, $timeout, $compile, Engine, World, Skills, Techs, Player, Market, $mdDialog) {
            return {
                templateUrl: 'modules/prosperity/templates/hintLink.html',
                restrict: 'E',
                scope: {
                    amount: '@amount',
                    type: '=type',
                    id: '@objid',
                    icon: '@icon',
                    canafford: '@canafford'
                },
                link: function postLink(scope, element) {
                    function handleDestroy(){
                        scope.destroyTimeout = window.setTimeout(function(){
                            if(scope.elem){
                                scope.elem.fadeOut(300, function(){
                                    if(scope.elem){
                                        scope.elem.remove();
                                    }
                                    scope.elem = null;
                                });
                            }
                            scope.destroyTimeout = null;
                        }, 200);
                        
                    }
                    function setup() {
                        if ($rootScope.configged) {
                            var item = $rootScope.itemList[scope.id];
                            var type = scope.type || 'item';
                            if (item) {
                                scope.hintText = item.name || item.title;
                                scope.description = item.description;
                                scope.show = false;
                                scope.testAffordability = function() {
                                    //test it
                                    var thisObj = {};
                                    thisObj[item.id] = scope.amount;
                                    if (!Player.canAfford(thisObj)) {
                                        scope.unaffordable = true;
                                    } else {
                                        scope.unaffordable = false;
                                    }
                                    scope.testAffordabilityInterval = $timeout(scope.testAffordability, 5000);
                                }
                                if (item.id == 'gold' && scope.amount != null) {
                                    scope.title = Market.convertToCurrency(scope.amount, true);
                                } else {
                                    scope.title = (scope.amount ? scope.amount+" " : "") + scope.hintText;
                                }
                                if (scope.canafford) {
                                    scope.testAffordability();
                                }
                                $(element).on('mouseenter', function(event) {
                                    if (type == 'item') {
                                        scope.count = ' [' + Math.round(Player.count(item.id)) + '] ';
                                        var amount = scope.amount;
                                        if (item.id == 'gold') {
                                            var currency = Market.convertToCurrency(Player.count('gold'), true);
                                            scope.count = '[' + currency + ']';
                                        }

                                        if (item.id == 'food') {
                                            var inv = $rootScope.world.home.foodStore;
                                            scope.varietyBonus = $rootScope.player.foodVariety * 5;
                                            scope.moralityBonus = $rootScope.player.foodVariety * $rootScope.player.foodVariety / 3;

                                            scope.description = item.description.replace(/\$consumeFoodRate\$/g, $rootScope.world.home.foodConsumptionRates[$rootScope.world.home.consumeFoodRate]);
                                            scope.description += '<br>' +
                                                'Meat: ' + inv.meat + '<br>' +
                                                'Vegetable: ' + inv.vegetable + '<br>' +
                                                'Fruit: ' + inv.fruit + '<br>' +
                                                'Cheese: ' + inv.cheese + '<br>' +
                                                'Bread: ' + inv.bread + '<br>' +
                                                'Fish: ' + inv.fish + '<br>' +
                                                'Variety Bonus Awesomeness:' + scope.varietyBonus + '<br>';
                                        }
                                    }

                                    if(scope.destroyTimeout){
                                        window.clearTimeout(scope.destroyTimeout);
                                    } else {
                                        scope.elem = $("<div></div>");
                                        scope.elem.addClass('popupDescription');

                                        scope.elem.html(scope.description);
                                        if(scope.count){
                                            scope.elem.append($("<span style='color:#085;display:block;'>"+scope.count+"</span>"));
                                        }
                                        $("body").append(scope.elem);

                                        scope.elem.css({
                                            top: event.clientY,
                                            left: event.clientX
                                        });

                                        scope.elem.on('mouseenter', function(ev){
                                            ev.stopPropagation();
                                            if(scope.destroyTimeout){
                                                window.clearTimeout(scope.destroyTimeout);
                                            }
                                        });

                                        scope.elem.on('mouseleave', function(ev){
                                            ev.stopPropagation();
                                            handleDestroy();
                                        });
                                    }
                                    
                                });
                                $(element).on('mouseleave', function(event) {
                                    handleDestroy();
                                });

                                $(element).on('click', function(event) {
                                    if (item.fullDescription) {
                                        Engine.stop();
                                        $mdDialog.show({
                                            controller: 'fullDescriptionCtrl',
                                            targetEvent: event,
                                            template: '<md-dialog><md-content>' + item.fullDescription + '</md-content><div class="md-actions"><md-button ng-click="close()">OK</md-button></md-dialog>'
                                        }).then(function() {
                                            Engine.start();
                                        }, function() {
                                            Engine.start();
                                        });
                                    }
                                });
                            }

                            element.on('$destroy', function() {
                                $(element).off('mouseenter');
                                $(element).off('mouseleave');
                                $(element).off('click');
                                if(scope.elem){
                                    scope.elem.remove();
                                }
                                if (scope.canafford) {
                                    $timeout.cancel(scope.testAffordabilityInterval);
                                }
                            });
                        } else {
                            $timeout(setup, 1000);
                        }
                    }
                    setup();
                }
            };
        }
    ]).controller('fullDescriptionCtrl', ['$rootScope', '$scope', '$mdDialog',
        function($rootScope, $scope, $mdDialog) {
            $scope.close = function() {
                $mdDialog.cancel();
            }
        }
    ]);