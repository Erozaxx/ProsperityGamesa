'use strict';

angular.module('prosperity')
    .service('Field', ['$rootScope', 'Engine',
        function Field($rootScope, Engine) {
            // AngularJS will instantiate a singleton by calling "new" on this function
            var field = {
                step: function() {
                    if ($rootScope.engine.curStep % $rootScope.STEPSPERDAY == 0) {
                        //new day
                        var chanceOfRodents = 0.001 * $rootScope.itemList.vegetableFarm.created;
                        if ($rootScope.season.curSeason == 'Winter') {
                            chanceOfRodents /= 3;
                        } else if ($rootScope.season.curSeason == 'Spring') {
                            chanceOfRodents *= 1.5;
                        }

                        if (Math.random() < chanceOfRodents && $rootScope.world.field.rodentInfestation < 30) {
                            if ($rootScope.world.field.rodentInfestation > 0) {
                                /*if(!$rootScope.importantEvent.rodentSituationWorsened.used){
                                    Engine.insert(150, 'loadImportantEvent', 'rodentSituationWorsened');
                                }*/ //not implemented yet
                            } else {
                                if(!$rootScope.importantEvent.rodentSituation.used){
                                    Engine.insert(150, 'loadImportantEvent', 'rodentSituation');
                                }
                                Engine.createNotification('The fields are overrun with rodents, our vegetable crops are threatened');
                            }
                            $rootScope.world.field.rodentInfestation += ~~(Math.random() * 10);
                        }
                    }

                    if($rootScope.world.field.inspectTime > 0){
                        $rootScope.world.field.inspectTime--;
                        if($rootScope.world.field.inspectTime == 0){
                            //find something!
                            var drops = ['iron','coal','fur','gem','steel','sword','armour']
                        }
                    }
                },
                inspectCropCircle: function(){
                    var field = $rootScope.world.field;
                    if(isNaN(field.inspectTime)){
                        field.inspectTime = 0;
                    }

                    if(field.inspectTime == 0){
                        field.inspectTime = $rootScope.STEPSPERDAY;
                    }
                    


                },
                increaselivestock: function(amt) {
                    amt = amt || 0;
                    $rootScope.world.field.curlivestock += amt;
                },
                decreaselivestock: function(amt) {
                    amt = amt || 0;
                    $rootScope.world.field.curlivestock -= amt;
                    if ($rootScope.world.field.curlivestock < 0) {
                        $rootScope.world.field.curlivestock = 0;
                    }
                },
                useFarmLand: function(amt) {
                    $rootScope.world.field.usedFarmLand += amt;
                }
            }
            return field;
        }
    ]);