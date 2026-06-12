'use strict';

angular.module('prosperity')
    .directive('dprogressbar', ['$timeout',
        function($timeout) {
            return {
                templateUrl: 'modules/prosperity/templates/progressbar.html',
                restrict: 'E',
                scope: {
                    text: '@',
                    dprogress: '=',
                    colour: '@',
                    update: '@'
                },
                link: function postLink(scope, element, attrs) {

                    console.log('dprogressbar', scope);
                    var timeoutspeed = 100;
                    switch (scope.update) {
                        case '30':
                            timeoutspeed = 30;
                            break;
                        case '100':
                            timeoutspeed = 100;
                            break;
                        case '500':
                            timeoutspeed = 500;
                            break;
                        case '1000':
                            timeoutspeed = 1000;
                            break;
                    }

                    var progress = function() {
                        if (!scope.oldval) {
                            scope.oldval = scope.dprogress;
                        }
                        var newval = scope.dprogress;
                        if (!isNaN(newval)) {
                            var bar = element.find("[data-role=progress]");
                            if(newval == 0){
                                bar.addClass("noTransition");
                            } else {
                                bar.removeClass("noTransition");
                            }
                            bar.css({
                                transform: "translateX(" + newval + "%)",
                                MozTransform: "translateX(" + newval + "%)",
                                WebkitTransform: "translateX(" + newval + "%)",
                                msTransform: "translateX(" + newval + "%)"
                            });

                            
                            scope.oldval = newval;
                        }


                        scope.timeout = $timeout(progress, timeoutspeed);
                    }

                    progress();

                    /*element.on('$destroy', function() {

                        $timeout.cancel(scope.timeout);
                    });*/
                },

            };
        }
    ]);
