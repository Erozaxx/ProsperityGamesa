'use strict';

angular.module('prosperity')
    .service('Mine', ['$rootScope', 'Engine',
        function Mine($rootScope, Engine) {
            // AngularJS will instantiate a singleton by calling "new" on this function
            var mine = {
                step: function() {
                    if ($rootScope.engine.curStep % $rootScope.STEPSPERDAY == 0) {
                        if ($rootScope.world.mine.curOres < 300) {

                            if (Math.random() < 0.1) {
                                Engine.insert(10, 'eventMineExpander', null, true);
                            }

                        }
                    }
                },
                increaseOres: function(amt) {
                    $rootScope.world.mine.curOres += amt;
                },
                decreaseOres: function(amt) {
                    if ($rootScope.world.mine.curOres >= amt) {
                        $rootScope.world.mine.curOres -= amt;
                    } else {
                        $rootScope.world.mine.curOres = 0;
                    }

                }
            }

            return mine;
        }
    ]);
