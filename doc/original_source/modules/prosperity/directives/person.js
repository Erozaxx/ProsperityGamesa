'use strict';

angular.module('prosperity')
    .directive('person', ['$rootScope',
        function($rootScope) {
            return {
                templateUrl: 'modules/prosperity/templates/person.html',
                restrict: 'E',
                scope: {
                    character: '='
                },
                link: function postLink(scope, element, attrs) {

                }
            };
        }
    ]);