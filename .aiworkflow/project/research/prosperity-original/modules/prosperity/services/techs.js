angular.module('prosperity')
    .service('Techs', ['$rootScope', 'Engine',

        function Techs($rootScope, Engine) {
            // AngularJS will instantiate a singleton by calling "new" on this function
            function addExp(prof, amt) {
                prof.exp += amt;
                if (prof.exp >= prof.levelCap) {
                    prof.exp -= prof.levelCap;
                    prof.level += 1;
                    prof.levelCap = $rootScope.fns.getScholarLevelCap(prof.level);
                }
            }
            $rootScope.$watchCollection('sectors', function() {
                for (var s in $rootScope.sectors) {
                    console.log(s.name, s.curLevel, s.points);
                }
            });
            var techs = {
                increasePt: function(amt) {
                    amt = amt || 1;

                    //amt
                    $rootScope.player.techPt += amt;
                },
                spendPt: function(amt) {
                    if ($rootScope.player.techPt >= amt) {
                        $rootScope.player.techPt -= amt;
                    } else {
                        return false;
                    }
                },
                totalTechPts: function() {
                    //calculate the total number of tech points
                },
                calcCap: function(sector) {
                    return Math.round($rootScope.techBase * Math.pow(sector.scale, sector.curLevel));
                },
                purchasePoint: function(s) {
                    var university = $rootScope.itemList.university;
                    if (university.points > 0) {
                        university.points -= 1;
                        $rootScope.itemList[s].points += 1;
                    }
                },
                step: function() {
                    if ($rootScope.engine.curStep % $rootScope.STEPSPERDAY === 0) {
                        var self = this;
                        //check workers
                        var expPoints = {};
                        angular.forEach($rootScope.sectors, function(sector, sectorid) {
                            expPoints[sectorid] = 0;
                        });
                        angular.forEach($rootScope.world.home.jobs, function(job) {
                            if (job.number > 0) {
                                if (job.category) { //bum has no category
                                    expPoints['sector_' + job.category] += job.number;
                                }
                            }
                        });

                        angular.forEach($rootScope.characters, function(person, id) {
                            if (person.unlocked && person.sector) {
                                expPoints[person.sector] += 2
                            }
                        });


                        var university = $rootScope.itemList.university;
                        var scholarLevels = ['agriculture', 'civil', 'crafts', 'forestry', 'medicine', 'military'];


                        if (university.unlocked) {
                            angular.forEach(university.scholars, function(s) {
                                switch (s.mode) {
                                    case 'general':
                                        for (var i = 0; i < scholarLevels.length; i++) {
                                            var l = s[scholarLevels[i]];
                                            addExp(l, 1);
                                        }

                                        var scale = 360 - s.gen;

                                        var chances = Math.random() * scale;

                                        s.gen++;

                                        if (chances <= 1) {
                                            s.gen = 0;
                                            university.points++;
                                            university.totalPoints++;
                                        }

                                        break;
                                    default:
                                        addExp(s[s.mode], 6);
                                        expPoints['sector_' + s.mode] = Math.round(expPoints['sector_' + s.mode] * (1.25 + 0.1 * s[s.mode].level));
                                        break;
                                }
                            });
                        }


                        angular.forEach(expPoints, function(p, k) {
                            var sector = $rootScope.itemList[k];
                            if (!sector) {
                                console.error('no such sector ', k);
                            } else {
                                if (!sector.exp) {
                                    sector.exp = 0;
                                }
                                if ($rootScope.player.profession == "scholar") {
                                    p = Math.round(p * 1.25);
                                }
                                sector.exp += p;

                                if (!sector.cap) {
                                    sector.cap = self.calcCap(sector);
                                }
                                if (sector.exp >= sector.cap) {
                                    sector.exp -= sector.cap;
                                    if (!sector.points) {
                                        sector.points = 0;
                                    }
                                    sector.points++;
                                    sector.curLevel++;
                                    sector.cap = self.calcCap(sector);
                                    var msg = "New " + sector.name + " Point! (" + sector.points + " unspent)";
                                    Engine.log(msg);
                                    Engine.createNotification(msg, 'tech');
                                }
                            }

                        });


                    }
                }
            }
            return techs;
        }
    ]);
