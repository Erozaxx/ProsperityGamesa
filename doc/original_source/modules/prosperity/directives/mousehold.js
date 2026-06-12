'use strict';

angular.module('prosperity')
    .directive('mousehold',
        function() {
            return {
                restrict: 'A',
                scope: {
                    altFn: '@altFn',
                    params: '@params',
                    mousehold: '@mousehold'
                },
                link: function(scope, el, attrs) {
                    var isHolding, intervalId, held = 0;

                    $(el).on('mousedown', function($event) {
                        scope.$event = $event;
                        isHolding = true;
                        intervalId = nextTick(150);

                    });


                    function nextTick(rate) {
                        return window.setTimeout(
                            function() {
                                if (isHolding) {
                                    scope.$parent.$apply(scope.mousehold);
                                    var cont = true;
                                    if (attrs.ngDisabled) {
                                        var disable = scope.$parent.$apply(attrs.ngDisabled);
                                        if (disable) {
                                            cancelInterval();
                                            cont = false;
                                        }
                                    }
                                    if (cont) {
                                        held++;
                                        if (held > 6 && rate > 10) {
                                            intervalId = nextTick(rate - 20);
                                            isHolding = true;
                                        } else {
                                            intervalId = nextTick(rate);
                                            isHolding = true;
                                        }
                                    }

                                }
                            }, rate
                        );
                    }

                    function cancelInterval() {
                        isHolding = false;
                        if (intervalId) {
                            window.clearTimeout(intervalId);
                            held = 0;
                        }
                    }

                    $(el).on('mouseup', function() {
                        cancelInterval();
                    });

                    $(el).on('mouseout', function() {
                        cancelInterval();
                    });

                    scope.$on('$destroy', function() {
                        $(el).off('mouseup', 'mouseout', 'mousedown');
                    });
                }
            }
        }
);