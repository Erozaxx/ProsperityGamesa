'use strict';

angular.module('prosperity')
    .directive('contractCard', ['$rootScope', 'Home',
        function($rootScope, Home) {
            return {
                templateUrl: 'modules/prosperity/templates/contractCard.html',
                restrict: 'AE',
                replace: true,
                scope:{
                    contractid: '='
                },
                link: function postLink(scope, element) {
                    scope.$watch('contractid', function(){
                        scope.contract = Home.getContract(scope.contractid);

                        scope.listCost = $rootScope.fns.listGoods(scope.contract.cost);

                        scope.listReward = $rootScope.fns.listGoods(scope.contract.reward);
                    });
                    
                    scope.completeContract = function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        Home.completeContract(scope.contract);
                    }

                    scope.rejectContract = function(e) {

                        e.preventDefault();
                        e.stopPropagation();
                        Home.rejectContract(scope.contract);
                    }

                }
            };
        }
    ]);