'use strict';

angular.module('prosperity').controller('ForestCtrl', ['$rootScope', '$scope', '$interval', 'Engine', 'World', 'Skills', 'Player', '$state',
    function($rootScope, $scope, $interval, Engine, World, Skills, Player, $state) {
        console.log($state.current);
        if (World.checkReady()) {
            Player.travel('forest');

            $scope.forestBuildings = [];

            angular.forEach($rootScope.buildings, function(building, buildingid){
            	if(building.forestSpace){
            		$scope.forestBuildings.push(building);
            	}
            });
        }

    }
]);