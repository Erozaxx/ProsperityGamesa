'use strict';

angular.module('prosperity').controller('AcademyCtrl', ['$rootScope', '$scope', 'World', 'Player', 'Academy', '$interval',
    function($rootScope, $scope, World, Player, Academy, $interval) {
        if (World.checkReady()) {
            Player.travel('academy');
        }

        $scope.academyTechs = Academy.getTechs();

        $interval(function() {
            angular.forEach($scope.academyTechs, function(tech, key) {
                if (tech.unlocked && Player.canAfford(tech.cost)) {
                    tech.affordable = true;
                } else {
                    tech.affordable = false;
                }
            });
        }, 500);

    }
]);