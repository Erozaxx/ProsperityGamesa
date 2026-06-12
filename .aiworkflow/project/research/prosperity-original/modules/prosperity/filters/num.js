'use strict';

angular.module('prosperity')
    .filter('num', function() {
        return function(input) {
            input = input || 0;
            input = parseFloat(input);
            var log = (parseInt(Math.floor(input)) + '').length - 1;
            //var log = Math.floor(Math.log10(input));

            if (log >= 6) {
                var units = ['M', 'B', 'T', 'Q'];
                var ul = Math.floor(log / 3);

                var unit = units[ul - 2];
                var b = Math.pow(10, log - (log % 3));
                input = Math.floor(input * 100 / b) / 100;
                return input + unit;
            }
            return input;
        };
    });