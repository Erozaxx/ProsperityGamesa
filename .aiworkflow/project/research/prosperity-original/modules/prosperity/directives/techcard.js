'use strict';

angular.module('prosperity')
    .directive('techCard', ['Techs', 'Player',
        function(Techs, Player) {
            return {
                templateUrl: 'modules/prosperity/templates/techCard.html',
                restrict: 'EA',
                scope: {},
                link: function postLink(scope, element, attrs) {
                    scope.tech = Techs.getTech(attrs.techid);
                    scope.unlock = function() {
                        if (Player.canAfford(scope.tech.cost)) {
                            Player.pay(scope.tech.cost);
                            Player.unlock(scope.tech.id);
                        }
                    }
                }
            };
        }
    ]);