'use strict';

angular.module('prosperity')
    .directive('skillBtn', ['$rootScope', 'Player', 'Skills', 'Item',
        function($rootScope, Player, Skills, Item) {
            return {
                templateUrl: 'modules/prosperity/templates/skillBtn.html',
                restrict: 'AE',
                replace: true,
                scope: {
                    skillid: '@'
                }, //we want an isolated scope
                link: function(scope, element, attrs) {
                    scope.watch = $rootScope.$watch('configged', function(configged) {
                        if ($rootScope.configged && !scope.inited) {
                            //delete scope.watch; //don't need the watch anymore
                            scope.init();

                            //$scope.sector.cap = Techs.calcCap($scope.sector);
                        }
                    });
                    element.on('$destroy', function() {
                        scope.watch();
                    });

                    scope.init = function() {
                        scope.inited = true;
                        scope.skill = Skills.get(scope.skillid);
                        scope.hasSkill = Player.hasDiscovered('skill', scope.skillid);
                        scope.showDescription = false;
                        scope.startSkill = function() {
                            Skills.start(scope.skillid);
                        }

                        scope.toggleDescription = function() {
                            scope.showDescription = !scope.showDescription;
                        }
                    }


                }
            };
        }
    ]);
