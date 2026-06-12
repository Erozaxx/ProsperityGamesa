'use strict';

angular.module('prosperity')
    .directive('jobtasks', ['$rootScope', 'Engine', 'Home', '$mdDialog',
        function($rootScope, Engine, Home, $mdDialog) {
            return {
                templateUrl: 'modules/prosperity/templates/jobTasks.html',
                restrict: 'E',
                scope: {
                    jobid: '@',
                    showtasks: '@',
                    hideunemployed: '@'
                },
                link: function postLink(scope, element) {
                    scope.watch = $rootScope.$watch('configged', function(configged) {
                        if ($rootScope.configged) {
                            scope.job = $rootScope.itemList[scope.jobid];

                            //console.log(scope.jobid, scope.job);
                            scope.home = $rootScope.world.home;
                            scope.bum = $rootScope.itemList['bum'];

                            scope.settings = $rootScope.player.settings;
                            scope.fire = function(job, ev) {
                                if(!ev || !ev.shiftKey){
                                    Home.fireJob(job);
                                } else {
                                    scope.setupTask(job, ev);
                                }
                            }

                            scope.assign = function(job, ev) {
                                if(!ev || !ev.shiftKey){
                                    Home.hireJob(job);
                                } else {
                                    scope.setupTask(job, ev);
                                }
                            }

                            scope.setupTask = function(job, ev){
                                Engine.stop();

                                //how many slots are available when accounting for other jobs?
                                var max = scope.job.max;

                                $mdDialog.show({
                                    controller: JobTaskSetWorker,
                                    templateUrl: '/modules/prosperity/templates/jobTaskSetWorkers.html',
                                    parent: angular.element(document.body),
                                    targetEvent: ev,
                                    locals:{
                                        job: job,
                                        slots: max,
                                        availableWorkers: $rootScope.itemList.bum.number
                                    }
                                }).then(function(workerAmt){

                                    var diff = job.number - workerAmt;

                                    if(diff < 0){
                                        for(var i = 0; i < -diff; i++){
                                            Home.hireJob(job);
                                        }
                                    } else if(diff > 0){
                                        for(var i = 0; i < diff; i++){
                                            Home.fireJob(job);
                                        }
                                    }   

                                    Engine.start();
                                }, function(){
                                    Engine.start();
                                });

                                function JobTaskSetWorker($rootScope, $scope, $mdDialog, job, slots, availableWorkers){

                                    $scope.job = job;
                                    $scope.set = function(){
                                        $mdDialog.hide($scope.setup.workerAmt);
                                    }

                                    $scope.cancel = function(){
                                        $mdDialog.cancel();
                                    }

                                    $scope.base = {
                                        workerAmt: job.number || 0,
                                        availableWorkers: availableWorkers,
                                        slots: slots
                                    }

                                    $scope.setup = {
                                        workerAmt: (job.number || 0),
                                        max: Math.min(availableWorkers+job.number, slots),
                                        availableWorkers: availableWorkers,
                                        slots: slots
                                    }

                                    //console.log($scope.base, $scope.setup);

                                    $scope.$watch('setup.workerAmt', function(){
                                        if($scope.setup.workerAmt > $scope.setup.max){
                                            $scope.setup.workerAmt = $scope.setup.max;
                                        } else if($scope.setup.workerAmt < 0){
                                            $scope.setup.workerAmt = 0;
                                        }

                                        var diff = $scope.setup.workerAmt - $scope.base.workerAmt;
                                        $scope.setup.slots = $scope.base.slots - diff;
                                        $scope.setup.availableWorkers = $scope.base.availableWorkers - diff;
                                    });

                                }
                            };

                            scope.assignJob = function(job) {
                                Home.assignJob(job);
                            }
                            scope.fireJob = function(job) {
                                Home.fireJob(job);
                            }

                            scope.showDetail = function(job) {
                                job.showDetail = true;

                                var details ="";

                                if(job.cost){
                                  details += " <br><br> Each batch requires "+ $rootScope.fns.listGoods(job.cost);
                                } 

                                if(!job.lootTable && job.products){
                                    details += ' and produces '+$rootScope.fns.listGoods(job.products);  
                                }

                                if(job.lootTable){
                                    details+="<br><br>Goods likely procured (estimate): <br>";
                                    var stuff = {};

                                    angular.forEach(job.lootTable, function(val, key){
                                        stuff[key] = (Math.round(val[0]*(val[1]+val[2])/2*job.number*10)/10)
                                    });
                                    details += $rootScope.fns.listGoods(stuff);
                                }

                                if (job.number > 0) {
                                    if (job.completionUnits) {
                                        job.expectedTTC = $rootScope.fns.stepsToDays(job.completionUnits / job.number);
                                    } else {
                                        job.expectedTTC = $rootScope.fns.stepsToDays(job.maxSteps);
                                    }

                                    job.expectedTTC = parseFloat(job.expectedTTC).toFixed(2);

                                    var requirements = {};
                                    //console.log(job.lastRealCost, job.nextProducts, job.expectedTTC);
                                    if (job.expectedTTC && !isNaN(job.expectedTTC)) {
                                        details += "<br><br>" + "This batch " + 
                                        ((job.lastRealCost && Object.keys(job.lastRealCost).length > 0) ? 
                                            ("requires: " + $rootScope.fns.listGoods(job.lastRealCost) + ", ") : "") + 
                                        ((job.nextProducts && Object.keys(job.nextProducts).length > 0) ? 
                                            ("will produce " + $rootScope.fns.listGoods(job.nextProducts) + ", ") : "") + 
                                        "takes approximately " + job.expectedTTC + " days";
                                    }

                                }

                                switch(job.id){
                                    case 'rancher':
                                        details += "<br><br> Current Livestock: "+$rootScope.world.field.curlivestock;
                                        break;
                                    case 'lumberjack':
                                    case 'forester':
                                        details += "<br><br> Current Trees: "+Math.floor($rootScope.world.forest.curTrees);
                                        break;
                                    case 'hunter':
                                        details += "<br><br> Current Animals: "+Math.floor($rootScope.world.forest.curAnimals);
                                        break;
                                }

                                scope.description = job.description + details;
                            
                            }

                            scope.toggleDetail = function(job){
                                if(job.showDetail){
                                    job.showDetail = false;
                                } else {
                                    scope.showDetail(job);
                                }
                            }

                            scope.workDetail = false;
                        }
                    });


                    element.on('$destroy', function() {
                        scope.watch();
                    });
                }
            };
        }
    ]);











