'use strict';

angular.module('prosperity')
    .directive('sector', ['$rootScope', 'Engine', 'Techs', '$mdDialog',
        function($rootScope, Engine, Techs, $mdDialog) {
            return {
                templateUrl: 'modules/prosperity/templates/sector.html',
                restrict: 'E',
                scope: {
                    sectorid: '@',
                    showtasks: '@',
                    hideunemployed: '@'
                },
                link: function postLink($scope, element) {

                    $scope.watch = $rootScope.$watch('configged', function(configged) {
                        if ($rootScope.configged) {
                            //delete scope.watch; //don't need the watch anymore
                            $scope.sector = $rootScope.itemList[$scope.sectorid];

                            //$scope.sector.cap = Techs.calcCap($scope.sector);
                        }
                    });
                    element.on('$destroy', function() {
                        $scope.watch();
                    });


                    $scope.showTechTree = function(ev) {
                        $mdDialog.show({
                            templateUrl: '/modules/prosperity/templates/techTree.html',
                            controller: function($scope, $mdDialog, _sector) {
                                $scope.sector = _sector
                                $scope.close = function() {
                                    $mdDialog.hide();
                                }
                            },
                            locals: {
                                _sector: $scope.sector
                            },
                            clickOutsideToClose: true,
                            escapeToClose: true,
                            fullscreen: true,
                            targetEvent: ev
                        });

                    }
                }
            };
        }
    ]);
