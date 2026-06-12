'use strict';

angular.module('prosperity').controller('MasonsguildCtrl', ['$scope', '$rootScope', 'Engine', 'Home', 'Player', 'World', '$mdDialog',
    function($scope, $rootScope, Engine, Home, Player, World, $mdDialog) {

        if (World.checkReady()) {
            Player.travel('masonsGuild');
            $scope.projectQueue = $rootScope.world.home.projectQueue;
        }

        $scope.watch = $rootScope.$watchCollection('player.unlockedBuildings', function() {
            $scope.buildingCategories = {};
            if ($rootScope.player) {
                angular.forEach($rootScope.buildings, function(obj, objid) {
                    if (obj.unlocked) {
                        var building = obj;
                        building.canAfford = Player.canAfford(building.cost);
                        var cat = $scope.buildingCategories[building.category];
                        if (cat) {
                            cat.buildings.push(building);
                        } else {
                            $scope.buildingCategories[building.category] = {
                                name: building.category,
                                buildings: [building]
                            };
                        }
                    }

                });
                $scope.sortUnlocked(); //Doesn't seem necessary if we're using filters. In any case, it's not necessary if we're sorting by category regardless.

            }
        });

        $scope.sortUnlocked = function() {
            $scope.unlockedBuildings = [];
            $scope.unlockedMaxedBuildings = [];
            //sorting the unlocked buildings by whether or not more can be created

            for (var i = 0; i < $rootScope.player.unlockedBuildings.length; i++) {
                var buildingId = $rootScope.player.unlockedBuildings[i];
                var building = Home.getBuilding(buildingId);

                if (building.created < building.max) {
                    $scope.unlockedBuildings.push(building);
                } else {
                    $scope.unlockedMaxedBuildings.push(building);
                }
            }

            $scope.unlockedBuildings = $scope.unlockedBuildings.concat($scope.unlockedMaxedBuildings);
            $scope.projectQueue = $rootScope.world.home.projectQueue;
        }

        $scope.removeFromQueue = function(ind) {
            var project = $rootScope.world.home.projectQueue[ind];
            var building = $rootScope.itemList[project.buildingId];
            $rootScope.world.home.projectQueue.splice(ind, 1);
            var cost = $rootScope.itemList[project.buildingId].cost;
            Player.insertInventory(cost);
            //go through the list of projects, update number of instances of this building in queue
            var count = 0;
            for (var i = 0; i < $rootScope.world.home.projectQueue.length; i++) {
                var proj = $rootScope.world.home.projectQueue[i];

                if (proj.buildingId === building.id) {
                    count++;
                }
            }
            building.inQueue = count;
        }

        $scope.showProjectDetails = function($event, project, index) {
            $rootScope.curProject = project;
            Engine.stop('Showing Project Details');

            $mdDialog.show({
                locals: {
                    index: index
                },
                controller: 'BuildingProjectDetailCtrl',
                templateUrl: '/modules/prosperity/templates/buildingProjectCard.html',
                targetEvent: $event
            }).then(function() {
                Engine.start('Closed Project Details');
            }, function() {
                Engine.start('Closed Project Details');
            });
        }

        $scope.$on('$destroy', function() {
            $scope.watch();
        });
    }
]).controller('BuildingProjectDetailCtrl', ['$rootScope', '$scope', '$mdDialog', '$timeout', 'Player', 'index',
    function($rootScope, $scope, $mdDialog, $timeout, Player, index) {
        $scope.project = $rootScope.curProject;

        $scope.project.name = $rootScope.itemList[$rootScope.curProject.buildingId].name;
        $scope.index = index;
        $scope.moveToFront = function() {
            if ($scope.index !== 0) {
                $rootScope.world.home.projectQueue.splice($scope.index, 1);
                $rootScope.world.home.projectQueue.unshift($scope.project);
                $scope.index = 0;
            }
        }

        $scope.hide = function() {
            $mdDialog.hide();
        };
    }
]);
