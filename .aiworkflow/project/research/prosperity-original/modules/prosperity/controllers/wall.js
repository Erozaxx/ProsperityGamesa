'use strict';

angular.module('prosperity')
    .controller('WallCtrl', ['$scope', '$rootScope', 'World', 'Player',
        function($scope, $rootScope, World, Player) {
            if (World.checkReady()) {
                Player.travel('wall');
            }
        }
    ]);