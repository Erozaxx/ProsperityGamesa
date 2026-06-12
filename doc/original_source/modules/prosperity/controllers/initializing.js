'use strict';

angular.module('prosperity').controller('InitializingCtrl', ['$rootScope', '$scope', '$location', 'Config', 'Game', 'Player', '$state', '$stateParams', '$timeout',
    function($rootScope, $scope, $location, Config, Game, Player, $state, $stateParams, $timeout) {

        //sets up the game.

        var params = $stateParams;
        console.log("initializing...");

        $rootScope.initialized = false;

        $rootScope.$watch('configged', function() {
            console.log('$rootScope configged: ', $rootScope.configged);
            if ($rootScope.configged) {

                if (params.gamesaveId) {
                    //load this save
                    $rootScope.inLoading = true;
                    Game.load(true, params.gamesaveId);
                    
                    Game.start();
                    Player.travel('home');
                } else {
                    Game.start();
                    $rootScope.inLoading = false;
                    $rootScope.curSaveId = null; //no curSaveId, need to make one at first save
                    console.log('starting conditions: ', $rootScope.player.profession);
                    if ($rootScope.player && $rootScope.player.profession) {
                        $rootScope.curPlaceId = 'home';
                        $state.go('prosperity.home');
                    } else {
                        $rootScope.introed = true;
                        if ($rootScope.storyScreens.intro) {

                            Game.stop();
                            $rootScope.storyScreens.intro.state = 2;
                            $state.go('prosperity.intro');
                        }
                    }
                }

                $rootScope.initialized = true; //this is the only place that can set this.
            }

        });

    }
]);