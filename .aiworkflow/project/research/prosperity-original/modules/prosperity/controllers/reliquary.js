'use strict';

angular.module('prosperity').controller('ReliquaryCtrl', ['$rootScope', '$scope', 'World', 'Player', '$interval',
    function($rootScope, $scope, World, Player, Academy, $interval) {
        if (World.checkReady()) {
            Player.travel('reliquary');
        }
    }
]);