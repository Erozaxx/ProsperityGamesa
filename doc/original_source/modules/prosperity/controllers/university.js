'use strict';

angular.module('prosperity').controller('UniversityCtrl', ['$rootScope', '$scope', 'Engine', 'World', 'Skills', 'Player', 'Techs', '$mdDialog',
    function($rootScope, $scope, Engine, World, Skills, Player, Techs, $mdDialog) {
        if (World.checkReady()) {
            Player.travel('university');
        }

        $scope.proficiencies = ['agriculture','civil','crafts','forestry','medicine','military'];

        $scope.purchase = function(type){
            Techs.purchasePoint(type);
        }
    }
]);