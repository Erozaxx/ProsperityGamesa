'use strict';

angular.module('prosperity')
    .service('Seasons', ['$rootScope',
        function Seasons($rootScope) {

            var seasons = {
                step: function() {
                    var Season = $rootScope.season;
                    var STEPSPERDAY = $rootScope.STEPSPERDAY;
                    if ($rootScope.engine.curStep % STEPSPERDAY == 0) {
                        Season.curDay++;
                        if(!Season.curStepInSeason){
                            Season.curStepInSeason = 0;
                        }
                        Season.curStepInSeason++;
                        if (Season.curDay > 30) {
                            Season.curDay = 1;
                            Season.curMonth++;

                            if(Season.curMonth > 12){
                                Season.curMonth = 1;
                                Season.curYear++;
                            }
                        }
                        console.log("curStepInSeason", Season.curStepInSeason);
                        if (Season.curStepInSeason > Season.seasonLength[Season.curSeason]) {
                            this.advance();
                        }
                    }
                },
                advance: function() {
                    var Season = $rootScope.season;
                    switch (Season.curSeason) {
                        case 'Spring':
                            $rootScope.fns.changeSeason(Season.curSeason, 'Summer');
                            break;
                        case 'Summer':
                            $rootScope.fns.changeSeason(Season.curSeason, 'Autumn');
                            break;
                        case 'Autumn':
                            $rootScope.fns.changeSeason(Season.curSeason, 'Winter');
                            break;
                        case 'Winter':
                            $rootScope.fns.changeSeason(Season.curSeason, 'Spring');
                            break;
                    }

                    $rootScope.season.curStepInSeason = 0;
                }
            }

            return seasons;
        }
    ]);