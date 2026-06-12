'use strict';

angular.module('prosperity').controller('FieldCtrl', ['$rootScope', '$scope', '$timeout', 'Player', 'World', 'Field',
    function($rootScope, $scope, $timeout, Player, World, Field) {
        if (World.checkReady()) {
            Player.travel('field');
            $scope.orchard = $rootScope.itemList.orchard;
            $scope.wheatFarm = $rootScope.itemList.wheatFarm;
            $scope.vegetableFarm = $rootScope.itemList.vegetableFarm;
            $scope.ranch = $rootScope.itemList.ranch;
            $scope.beeFarm = $rootScope.itemList.beeFarm;


            $scope.inspectCropCircle = function(){
                if($rootScope.itemList.cropCircles.unlocked){
                    Field.inspectCropCircle();
                }
            }

            $scope.fieldBuildings = [];
            $scope.nothingToShow = true;
            angular.forEach($rootScope.buildings, function(building, buildingid){
                if(building.fieldSpace > 0){
                    if(building.unlocked){
                        $scope.nothingToShow = false;
                    }
                    $scope.fieldBuildings.push(building);
                }
            });
            
        }
    }
]);