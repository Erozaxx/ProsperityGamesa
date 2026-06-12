'use strict';

angular.module('prosperity').controller('MainCtrl', ['$rootScope', '$scope', 'Player', 'Game', '$location',
    function($rootScope, $scope, Player, Game, $location) {
        var params = $location.search();
        if (params.r) {
            // reload the page
            window.location.reload();
        }
        $rootScope.$watch('configged', function() {
            if ($rootScope.configged) {
                Player.travel('main');

                if ($rootScope.storyScreens.intro.state == 1 || $rootScope.storyScreens.intro.state == 2) {
                    $location.path('/prosperity/intro');
                }

                $scope.start = function() {
                    Game.start();
                    $location.path('/prosperity/home');
                }
            }
        });


    }
]);