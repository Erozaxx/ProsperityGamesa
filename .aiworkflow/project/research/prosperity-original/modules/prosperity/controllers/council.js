'use strict';

angular.module('prosperity').controller('CouncilCtrl', ['$rootScope', '$scope', 'Engine', 'World', 'Player', 'Home', '$mdBottomSheet', '$mdDialog', '$mdToast',
    function($rootScope, $scope, Engine, World, Player, Home, $mdBottomSheet, $mdDialog, $mdToast) {
        if (World.checkReady()) {
            Player.travel('council');
        }

        $scope.toggleDoNotConsume = function(itemid) {
            $rootScope.itemList[itemid].doNotConsume = !$rootScope.itemList[itemid].doNotConsume;
        }

        $scope.setFestival = function() {
            Home.addFestival($scope.newFestival);
        }

        $scope.openCreateFestival = function($event) {
            Engine.stop('Create festival');
            $mdBottomSheet.show({
                templateUrl: '/modules/prosperity/templates/createFestival.html',
                controller: 'CreateFestivalCtrl',
                targetEvent: $event,
            }).then(function() {
                Engine.start('Create Festival Done');
            }, function() {
                Engine.start('Create Festival Done');
            });
        }

        $scope.removeFestival = function(festival) {
            Home.removeFestival(festival.moon, festival.day);
            festival.confirmRemove = false;
        }

        $scope.openReport = function($event, moon) {
            Engine.stop('Open Report');
            $rootScope.viewReport = $rootScope.world.council.monthlyReports[moon];
            $mdDialog.show({
                controller: 'MonthlyReportCtrl',
                templateUrl: '/modules/prosperity/templates/monthlyReport.html',
                targetEvent: $event
            }).then(function() {
                Engine.start('Done Report');
            }, function() {
                Engine.start('Done Report');
            });
        }

        $scope.openExperimentalTaskAssigner = function($event) {
            Engine.stop('Experimental Task Assigner');
            $mdBottomSheet.show({
                templateUrl: '/modules/prosperity/templates/taskAssigner.html',
                controller: 'TaskAssignerCtrl',
                targetEvent: $event
            }).then(function() {
                Engine.start('Done Experimental Task Assigner');
                $mdBottomSheet.hide();
            })
        }

        /*$rootScope.$watchCollection('world.council.monthlyReports', function(newVal) {
            if (newVal) {
                $scope.sortedReports = [];
                for (var key in $rootScope.world.council.monthlyReports) {
                    $rootScope.world.council.monthlyReports[key].moon = key;
                    $scope.sortedReports.push($rootScope.world.council.monthlyReports[key]);
                }

                $scope.sortedReports.sort(function(a, b) {
                    return b.moon - a.moon;
                });
            }

        })*/

        $scope.convertLand = function(from, to, amt) {
            var landManagement = $rootScope.itemList.landManagement;

            if (landManagement.unlocked) {
                var cost = {
                    gold: amt * 108 * 197 * 5 / 500
                }
                $rootScope.fns.calcSpaceAvailable();
                $rootScope.fns.calcSpaceUsed();
                if ($rootScope.area[from + 'Space'] - $rootScope.used[from + 'Space'] >= amt) {
                    //have enough space
                    if (Player.canAfford(cost)) {
                        Player.pay(cost);
                        landManagement.cleared[from + 'Space'] += amt;
                        landManagement.converted[to + 'Space'] += amt;

                        $rootScope.fns.calcSpaceAvailable();
                        var msg = "Converted " + amt + " of " + from + " space to " + to + " space.";
                        Engine.log(msg);
                        Engine.insertNotificationBar(msg, 'hint');
                    }
                }

            }
        };

        $scope.purchaseMedicineCrate = function() {
            if ($rootScope.itemList.socialHealthcare.cratesAvailable > 0) {
                var cost = {
                    gold: $rootScope.itemList.medicine.marketPrice * 100 * 1.05
                };

                if (Player.canAfford(cost)) {
                    Player.pay(cost);
                    Player.insertInventory({
                        medicine: 100
                    });
                    $rootScope.itemList.socialHealthcare.cratesAvailable--;
                }
            }
        };

        $rootScope.$watch('season.curMonth', function(newVal) {
            if (newVal) {
                //new month?
                $scope.maxMonth = newVal;
                $scope.sortedReports = [];
                for (var i = $scope.maxMonth; i >= 1; i--) {
                    $scope.sortedReports.push(i);
                }
            }
        });
    }
]).controller('CreateFestivalCtrl', ['$rootScope', '$scope', 'Player', 'Home', '$mdBottomSheet', '$timeout',
    function($rootScope, $scope, Player, Home, $mdBottomSheet, $timeout) {
        var min = {
            moon: $rootScope.season.curMonth + 2
        }

        if ($rootScope.season.curDay + 2 > 30) {
            min.day = ($rootScope.season.curDay + 2) % 30;
            min.moon++;
        } else {
            min.day = $rootScope.season.curDay + 2;
        }

        $scope.createFestival = {
            name: '',
            day: min.day,
            moon: min.moon,
            set: function() {
                this.day = Math.floor(this.day);
                this.moon = Math.floor(this.moon);
                if (this.moon > $rootScope.season.curMonth + 2 || ($rootScope.season.curMonth + 2 == this.moon && $rootScope.season.curDay + 2 <= this.day)) {
                    if (Home.isFestival(this.moon, this.day)) {
                        this.errMessage = 'Festival cannot occur on the same day as another festival';
                    } else {
                        console.log('creating festival');
                        Home.addFestival(this.name, this.day, this.moon);
                        $mdBottomSheet.hide();
                    }

                } else {
                    this.errMessage = 'The festival must start at least 2 moons away';
                }

                if (this.errMessage) {
                    $timeout(function() {
                        $scope.createFestival.errMessage = '';
                    }, 2000);
                }
            }
        }

        $scope.cancelCreateFestival = function() {
            $mdBottomSheet.hide();
        }
    }
]).controller('MonthlyReportCtrl', ['$rootScope', '$scope', '$mdDialog', '$timeout',
    function($rootScope, $scope, $mdDialog, $timeout) {
        $scope.viewReport = $rootScope.viewReport;

        $scope.foodGoods = ['bread', 'cheese', 'fish', 'fruit', 'meat', 'vegetable'];
        $scope.generalGoods = [];

        angular.forEach($scope.viewReport.i, function(amt, itemid) {
            if ($scope.foodGoods.indexOf(itemid) < 0) {
                $scope.generalGoods.push(itemid);
            }

        });

        angular.forEach($scope.viewReport.o, function(amt, itemid) {
            if ($scope.generalGoods.indexOf(itemid) < 0 && $scope.foodGoods.indexOf(itemid) < 0) {
                $scope.generalGoods.push(itemid);
            }
        });

        $scope.generalGoods.sort();

        $scope.hide = function() {
            $mdDialog.hide();
        };
    }
]).controller('TaskAssignerCtrl', ['$rootScope', '$scope', 'Player', 'Home', '$mdBottomSheet', '$timeout',
    function($rootScope, $scope, Player, Home, $mdBottomSheet, $timeout) {


    }
]);
