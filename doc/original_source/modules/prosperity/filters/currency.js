'use strict';

angular.module('prosperity').filter('currency', ['Market',
    function(Market) {
        return function(input, round) {
            var input = parseFloat(input);
            if (typeof round !== 'number') {
                round = 0;
            }
            return Market.convertToCurrency(input, true, round);
        };
    }
]);