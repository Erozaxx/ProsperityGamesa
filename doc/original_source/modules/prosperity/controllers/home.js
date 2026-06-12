'use strict';

angular.module('prosperity').controller('HomeCtrl', ['$rootScope', '$scope', '$interval', '$timeout', 'Techs', 'Home', 'World', 'Engine', 'Player',
    function($rootScope, $scope, $interval, $timeout, Techs, Home, World, Engine, Player) {

        function tryInit() {
            console.log('tryInit');
            if (World.checkReady()) {
                init();
            } else {
                console.log('not quite ready, try again in 2 seconds...');
                //$scope.tryInitTimeout = $timeout(tryInit, 2000);
            }
        }

        tryInit();

        function init() {
            Player.travel('home');
            $scope.assignJob = function(job) {
                Home.assignJob(job);
            }
            $scope.fireJob = function(job) {
                Home.fireJob(job);
            }

            $scope.bulkAdd = function(job, amt) {
                Home.assignJob(job, amt);
            }

            $scope.bulkFire = function(job, amt) {
                Home.fireJob(job, amt);
            }

            $scope.discardItemDialog = {
                item: null,
                discardAmt: 0,
                max: 0,
                visible: false,
                discard: function() {
                    if ($rootScope.player.removeInventory($scope.discardItemDialog.item, $scope.discardItemDialog.discardAmt)) {
                        Engine.log('You threw away ' + $scope.discardItemDialog.discardAmt + ' ' + $scope.discardItemDialog.item);
                        $scope.discardItemDialog.visible = false;
                    }
                },
                cancel: function() {
                    $scope.discardItemDialog.visible = false;
                }
            };

            $scope.interval = $interval(function() {
                $scope.updateHomeProgress();
                $scope.checkPeople();
            }, 1000);

            $scope.$on('$destroy', function() {
                console.log('destroying home controller');
                $interval.cancel($scope.interval);
                $timeout.cancel($scope.tryInitTimeout);
            });

            $scope.startDialogue = function(characterid) {
                var character = $rootScope.world.home.people[characterid];
                if (character) {
                    $rootScope.fns[character.fn].call();
                }
            };

            $scope.nat = $rootScope.world.home.nat;


            $scope.updatePlaceName = function(placeName) {
                $rootScope.world.home.placeName = placeName;
                $rootScope.updateHomeName();
            };

            $scope.updateHomeProgress = function() {
                //need to update what the current level is, requirements for next level
                $scope.homeCurLevel = Home.getLevel($rootScope.world.home.level);
                $scope.homeNextLevel = Home.getLevel($rootScope.world.home.level + 1);

                $scope.homeCurResourcesTowardsNextLevel = {};
                if ($scope.homeNextLevel) {
                    angular.forEach($scope.homeNextLevel.requirements, function(amt, itemId) {
                        $scope.homeCurResourcesTowardsNextLevel[itemId] = Player.count(itemId);
                    });
                }
            };
            
            $scope.checkPeople = function(){
                $scope.peopleInTab = Object.keys($rootScope.world.home.people).length;
            }

            $scope.home = $rootScope.world.home;

            $scope.updateHomeProgress();
            $scope.checkPeople();
        }
    }
]);