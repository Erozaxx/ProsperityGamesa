'use strict';

angular.module('prosperity')
    .directive('storyScreen', ['$sce', '$rootScope', '$location', 'Game', 'Engine',
        function($sce, $rootScope, $location, Game, Engine) {
            return {
                templateUrl: 'modules/prosperity/templates/storyScreen.html',
                restrict: 'E',
                scope: {
                    lines: '='
                },
                link: function postLink(scope, element, attrs) {
                    scope.cur = 0;
                    scope.query = {};
                    scope.playername = '';

                    scope.prev = function() {
                        scope.cur--;
                        if (scope.cur < 0) {
                            if ($rootScope.isDev) {
                                scope.cur = scope.lines.length - 1;
                            } else {
                                scope.cur = 0;
                            }

                        }
                        upLine();
                    }
                    scope.next = function() {
                        scope.cur++;
                        if (scope.cur > scope.lines.length - 1) {
                            scope.cur = scope.lines.length - 1;
                        }
                        upLine();
                    }
                    scope.updatePlayerName = function() {
                        $rootScope.player.name = scope.playername;
                    }
                    upLine();

                    function upLine() {
                        var line = scope.lines[scope.cur];
                        scope.text = line;
                        resetLineQueries();
                        if (typeof line == 'object') {
                            var cmd = line.cmd;
                            scope.text = line.text;
                            if (cmd == 'queryPlayerName') {
                                scope.query.playerName = true;
                            } else if (cmd == 'compile') {
                                scope.text = scope.text.replace(/\$playername\$/g, $rootScope.player.name);
                            } else if (cmd == 'startForestTutorial') {
                                $rootScope.startForestTutorial = true;
                            } else if (cmd == 'goto') {
                                close();
                                $location.path(line.place);
                            } else if (cmd == 'startgame') {
                                if ($rootScope.player.name.trim() == '') {
                                    $rootScope.player.name = 'Nameless'
                                }
                                scope.close();
                                Game.start();
                                $location.path('/prosperity/home');
                            } else if (cmd == 'fn') {
                                line.fn(scope);
                            }
                        }
                        scope.line = $sce.trustAsHtml(scope.text);
                    }

                    function resetLineQueries() {
                        scope.query = {};
                    }

                    scope.close = function() {
                        angular.forEach($rootScope.storyScreens, function(value, key) {
                            $rootScope.storyScreens[key] = false;
                        });
                    }
                }
            };
        }
    ]);