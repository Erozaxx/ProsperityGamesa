'use strict';

angular.module('prosperity').filter('translate', ['$rootScope',
    function($rootScope) {
        return function(input) {
            if (input) {
                input = input.replace(/\$playername\$/g, $rootScope.player.name);
                input = input.replace(/\$him\$/g, $rootScope.player.gender == 'male' ? 'him' : 'her');
                input = input.replace(/\$his\$/g, $rootScope.player.gender == 'male' ? 'his' : 'hers');
                input = input.replace(/\$he\$/g, $rootScope.player.gender == 'male' ? 'he' : 'she');
                input = input.replace(/\$man\$/g, $rootScope.player.gender == 'male' ? 'man' : 'woman');

                input = input.replace(/\$profession\$/g, $rootScope.player.profession);
                input = input.replace(/\$season\$/g, $rootScope.season.curSeason);
                input = input.replace(/\$consumeFoodRate\$/g, $rootScope.world.home.foodConsumptionRates[$rootScope.world.home.consumeFoodRate]);
            }

            return input;
        };
    }
]);