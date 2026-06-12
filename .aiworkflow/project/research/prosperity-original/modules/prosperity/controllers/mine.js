'use strict';

angular.module('prosperity').controller('MineCtrl', ['$rootScope', '$scope', 'World', 'Player', '$interval',
    function($rootScope, $scope, World, Player, $interval) {
        if (World.checkReady()) {
            Player.travel('mine');
        }

        $scope.expandMining = function() {
            $rootScope.world.mine.curOres += 10000;
            var cost = $rootScope.world.mine.expandMineCost;
            if (Player.canAfford(cost)) {
                Player.pay(cost);
                $rootScope.world.mine.curOres += 10000;
                angular.forEach($rootScope.world.mine.expandMineCost, function(amt, itemId) {
                    $rootScope.world.mine.expandMineCost[itemId] = ~~ ($rootScope.world.mine.expandMineCost[itemId] * 1.5);
                });

            }
        }

        $scope.mineBuildings = [];
        angular.forEach($rootScope.buildings, function(building, buildingid){
            if(building.mineSpace > 0){
                $scope.mineBuildings.push(building);
            }
        });
    }
]);