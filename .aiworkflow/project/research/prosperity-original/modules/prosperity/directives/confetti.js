'use strict';

window.Confetti = (function() {
    var themes = {
        Winter: [
            [163, 220, 245],
            [219, 241, 250],
            [206, 209, 210],
            [255, 255, 255],
            [218, 238, 245],
            [94, 159, 165],
            [216, 227, 252]
        ],
        Spring: [
            [197, 199, 188],
            [244, 202, 202],
            [249, 157, 157],
            [249, 157, 223],
            [203, 131, 145],
            [209, 255, 248],
            [172, 159, 189],
            [211, 244, 252],
            [253, 255, 186]
        ],
        Summer: [
            [222, 255, 164],
            [188, 231, 115],
            [109, 155, 31],
            [212, 221, 179],
            [197, 215, 91],
            [86, 224, 156]
        ],
        Autumn: [
            [203, 178, 131],
            [240, 185, 85],
            [255, 140, 27],
            [167, 194, 0],
            [100, 43, 26],
            [129, 89, 2],
            [255, 208, 122]
        ]
    }

    function range(a, b) {
        return (b - a) * Math.random() + a;
    }

    var PI_2 = Math.PI * 2;

    window.requestAnimationFrame = (function() {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
            return window.setTimeout(callback, 1000 / 60);
        };
    })();

    function Confetti(theme, r, w, h) {
        this.setColor(theme);
        this.w = w;
        this.h = h;
        this.r = r;
        this.r2 = 2 * this.r;
        this.lastReplaced = 0;
        this.replace();
    }
    Confetti.prototype.setColor = function(theme) {
        if (themes[theme]) {
            var colors = themes[theme];
            this.theme = theme;
            this.style = colors[~~(Math.random() * colors.length)];
            this.rgb = "rgba(" + this.style[0] + "," + this.style[1] + "," + this.style[2];
        }
    }
    Confetti.prototype.replace = function() {
        this.lastReplaced = 0;
        var speed = 0.7;
        this.opacity = 0;
        this.dop = 0.03 * Math.random();
        this.x = range(-this.r2, this.w - this.r2);
        this.y = range(-20, this.h - this.r2);
        this.xmax = this.w - this.r;
        this.ymax = this.h - this.r;
        this.vx = Math.random() * 2 - 1;

        if (this.nextTheme) {
            this.setColor(this.nextTheme);
            this.nextTheme = null;
        }
        return this.vy = speed * this.r + Math.random() * 2 - 1;
    };

    Confetti.prototype.draw = function(context) {
        var _ref;
        this.x += this.vx;
        this.y += this.vy;
        this.opacity += this.dop;
        if (this.opacity > 1) {
            this.opacity = 1;
            this.dop *= -1;
        }
        if (this.opacity < 0 || this.y > this.ymax || this.lastReplaced > 150) {
            this.replace();
        }
        if (!((0 < (_ref = this.x) && _ref < this.xmax))) {
            this.x = (this.x + this.xmax) % this.xmax;
        }

        context.beginPath();
        context.arc(~~this.x, ~~this.y, this.r, 0, PI_2, false);
        context.fillStyle = "" + this.rgb + "," + this.opacity + ")";
        return context.fill();
    };

    return Confetti;

})();


angular.module('prosperity')
    .directive('confetti', ['$rootScope', '$timeout',
        function($rootScope, $timeout) {
            return {
                template: '<canvas></canvas>',
                restrict: 'E',
                replace: true,
                scope: {
                    amount: '@amount',
                    theme: '@',
                    h: '@h'
                },
                controller: ['$rootScope', '$scope',
                    function($rootScope, $scope) {


                        $scope.getColours = function(theme) {
                            return themes[theme];
                        }

                        $scope.step = function() {
                            var c, _i, _len, _results;

                            window.requestAnimationFrame($scope.step);

                            if ($rootScope && $rootScope.player && $scope.context) {
                                if ($rootScope.player.settings.particleAnimations) {
                                    $scope.paused = false;
                                    $scope.context.clearRect(0, 0, $scope.w, $scope.h);
                                    _results = [];
                                    for (_i = 0, _len = $scope.confetti.length; _i < _len; _i++) {
                                        c = $scope.confetti[_i];
                                        _results.push(c.draw($scope.context));
                                    }
                                } else if (!$rootScope.player.settings.particleAnimations && !$scope.paused) {
                                    $scope.context.clearRect(0, 0, $scope.w, $scope.h);
                                    $scope.paused = true;
                                }

                            }
                            return _results;
                        }
                    }

                ],
                link: function postLink(scope, element, attrs) {
                    $(window).on('resize', function() {
                        scope.resizeCanvas();
                    });

                    scope.resizeCanvas = function() {
                        scope.w = element[0].width = $(window).width();
                        element[0].height = scope.h;

                        if (scope.confetti) {
                            for (var i = 0; i < scope.confetti.length; i++) {
                                var c = scope.confetti[i];
                                c.w = scope.w;
                                c.h = scope.h;
                            }
                        }
                    };

                    $rootScope.$watch('configged', function() {
                        if ($rootScope.configged) {
                            scope.confetti = [];
                            var theme = scope.theme || 'Winter'
                            for (var i = 0; i < scope.amount; i++) {
                                var r = ~~$rootScope.fns.range(2, 6);
                                scope.confetti.push(new Confetti(theme, r, scope.w, scope.h));
                            }

                            $timeout(function() {
                                scope.resizeCanvas();
                                scope.canvas = element[0];
                                scope.context = scope.canvas.getContext("2d")
                            }, 0);

                            scope.step();

                            scope.$watch('theme', function(newVal) {
                                if (newVal) {
                                    for (var i = 0; i < scope.confetti.length; i++) {
                                        var c = scope.confetti[i];
                                        c.nextTheme = newVal;
                                    }
                                }
                            });
                        }
                    })

                }
            };
        }
    ]);