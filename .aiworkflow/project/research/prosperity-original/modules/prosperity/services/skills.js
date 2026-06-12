'use strict';

angular.module('prosperity')
    .service('Skills', ['$rootScope', 'Engine', 'Player',
        function Skills($rootScope, Engine, Player) {
            // AngularJS will instantiate a singleton by calling "new" on this function

            var skills = {

                step: function() {
                    var self = this;
                    angular.forEach($rootScope.skills.items, function(item, key) {
                        if (item.progressing) {
                            item.curStep++;
                            item.progPct = Math.min(Math.round(item.curStep*100/item.maxStep), 100);
                            if (item.curStep > item.maxStep) {
                                if (item.onFull) {
                                    item.onFull();
                                }

                                if (item.products) {
                                    Player.insertInventory(item.products);
                                }
                                self.reset(item.id);
                            }
                        }
                    });
                },
                reset: function(skillId) {
                    var skill = $rootScope.itemList[skillId];
                    if (skill) {
                        skill.progressing = false;
                        skill.curStep = 0;
                        skill.progPct = 0;
                    }

                },
                get: function(skillId) {
                    return $rootScope.itemList[skillId];
                },
                start: function(skillId) {
                    if (Engine.getState()) {
                        var skill = $rootScope.skills.items[skillId];
                        if (!skill.progressing && Player.hasDiscovered('skill', skillId) && (!skill.cost || Player.canAfford(skill.cost))) {
                            skill.progressing = true;
                            if (skill.onStart) {
                                skill.onStart();
                            }
                            if (skill.cost) {
                                Player.pay(skill.cost);
                            }
                        }
                    }
                }
            };

            return skills;
        }
    ]);