'use strict';

angular.module('prosperity')
    .controller('TinkeryCtrl', ['$scope', '$interval', 'World', 'Player', 'Tinkery',
        function($scope, $interval, World, Player, Tinkery) {
            if (World.checkReady()) {
                Player.travel('tinkery');
            }


            $scope.tinkeryTechs = Tinkery.getTechs();

            $interval(function() {
                angular.forEach($scope.tinkeryTechs, function(tech, key) {
                    if (tech.unlocked && Player.canAfford(tech.cost)) {
                        tech.affordable = true;
                    } else {
                        tech.affordable = false;
                    }
                });
            }, 500);

        }
    ]);