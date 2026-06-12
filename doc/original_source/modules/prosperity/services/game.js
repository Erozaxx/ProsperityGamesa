'use strict';

angular.module('prosperity')
    .service('Game', ['$rootScope', '$stateParams', '$q', '$state', '$http', 'Authentication', 'Gamesaves', '$location', '$timeout', 'Player', 'Item', 'Engine',
        'Events', 'World', 'Skills', 'Home', 'Chat',
        function Game($rootScope, $stateParams, $q, $state, $http, Authentication, Gamesaves, $location, $timeout, Player, Item, Engine, Events, World, Skills, Home, Chat) {
            var interval, timeout;
            var isInitialized = false;
            $rootScope.isRunning = false;

            var startTime;

            function run() {
                //startTime = new Date();
                if ($rootScope.engine.state) {
                    Engine.step();
                    World.step();
                    Skills.step();
                    if ($rootScope.engine.autoSave && $rootScope.engine.curStep % ($rootScope.STEPSPERDAY * 10) == 0 && $rootScope.engine.curStep > 0) {
                        game.autoSave();
                    }
                }
                var delay = calcRate();
                //console.log(delay);
                timeout = $timeout(run, delay);

            }

            function calcRate() {
                var rate = $rootScope.engine.speeds[$rootScope.engine.speed].rate;
                if (!startTime) {
                    startTime = new Date();
                    return  rate* 1000;
                } else {
                    var endTime = new Date();
                    var timediff = Math.abs(endTime - startTime);
                    startTime = endTime;
                    var _rate = rate * 1000;
                    return (timediff >= _rate ? 10 : _rate - timediff);
                }
            }

            var game = {
                autoSave: function() {
                    var promise = game.save(true, null, $rootScope.curGameSave); //always save to server now! - this is an autosave
                    $rootScope.isSaving = true;
                    promise.then(function(msg) { // hurray!
                        $timeout(function() {
                            $rootScope.isSaving = false;
                        }, 2000);

                    }, function(errormsg) {
                        console.log(errormsg);
                        $rootScope.saveError = true;
                        $timeout(function() {
                            $rootScope.isSaving = false;
                            $rootScope.saveError = false;
                        }, 2000);
                    });
                },
                setItem: function(key, data) {
                    return localStorage.setItem(key, data);
                },
                getItem: function(key) {
                    return localStorage.getItem(key);
                },
                removeItem: function(key) {
                    return localStorage.removeItem(key);
                },
                reset: function() {
                    window.location.reload();
                },
                start: function(log) {
                    this.removeItem('Prosperity' + $rootScope.version + 'GameOver');
                    this.init();
                    run();
                    $rootScope.isRunning = true;
                    $rootScope.inIntro = false;
                    $rootScope.engine.state = 1;
                    $rootScope.engine.stopped = 0;
                    Engine.start(log);
                    Events.startCheck();
                    $rootScope.musicPlayer.initialize();
                    $rootScope.started = true;
                },
                resume: function() {
                    $rootScope.isRunning = true;
                    Engine.start("Resume game");
                    run();
                },
                stop: function(log) {
                    $rootScope.isRunning = false;
                    Engine.stop(log);
                },
                changeSpeed: function(rate) {
                    Engine.changeSpeed(rate);
                },
                isPaused: function() {
                    return $rootScope.isRunning;
                },
                init: function() {
                    if (!isInitialized) {
                        isInitialized = true;
                        Engine.init();
                        Item.init();
                        Player.init();
                        World.init();
                        Events.init();
                        Chat.init();
                    }
                },
                save: function(callback) {
                    var server = true;
                    var deferred = $q.defer();

                    for (var i in $rootScope.itemList) {
                        var x = jQuery.extend(true, {}, $rootScope.itemList[i]);
                    }
                    var iL = jQuery.extend(true, {}, $rootScope.itemList);
                    var p = jQuery.extend(true, {}, $rootScope.player)
                    var saveObj = {
                        itemList: iL,
                        player: p,
                        //world: $rootScope.world,
                        /*engine: {
                            autoSave: $rootScope.engine.autoSave,
                            curStep: $rootScope.engine.curStep,
                            logs: jQuery.extend(true, {}, $rootScope.engine.logs),
                            speed: $rootScope.engine.speed,
                            schedule: jQuery.extend(true, {}, $rootScope.engine.schedule),
                            startStopLogs: jQuery.extend(true, {}, $rootScope.engine.startStopLogs),
                            useNotification: $rootScope.engine.useNotification
                        },*/
                        engine: jQuery.extend(true, {}, $rootScope.engine),
                        season: jQuery.extend(true, {}, $rootScope.season),
                        nextContractId: $rootScope.nextContractId,
                        //skills: $rootScope.skills,
                        //techs: $rootScope.techs,
                        tutorials: {},
                        importantEvent: {},
                        //zones:$rootScope.zones,
                        battles: jQuery.extend(true, {}, $rootScope.battles),
                        invasions: jQuery.extend(true, {}, $rootScope.invasions),
                        records: jQuery.extend(true, {}, $rootScope.records),
                        distributeMedicine: jQuery.extend(true, {}, $rootScope.distributeMedicine),
                        version: $rootScope.version,
                        story: {},
                        levelUpUI: jQuery.extend(true, {}, $rootScope.levelUpUI)
                    };

                    //saving state of each tutorial
                    angular.forEach($rootScope.tutorials, function(tut, id) {
                        if (tut && typeof tut == 'object' && id != 'curTutorial') {
                            saveObj.tutorials[id] = tut.used;

                            if ($rootScope.tutorials.curTutorial && tut == $rootScope.tutorials.curTutorial) {
                                saveObj.tutorials.curTutorialId = id;
                            }
                        }
                    });

                    //saving the states of each important event
                    angular.forEach($rootScope.importantEvent, function(evt, id) {
                        if (evt && typeof evt == 'object' && id != 'loadQueue')
                            saveObj.importantEvent[id] = evt.used;
                    });

                    if ($rootScope.importantEvent.curEventId) {
                        saveObj.importantEvent.curEventId = $rootScope.importantEvent.curEventId;
                    }

                    angular.forEach($rootScope.story, function(story, id) {
                        saveObj.story[id] = {
                            curLine: story.curLine,
                            canStart: story.canStart,
                            completed: story.completed,
                            started: story.started
                        }
                    });

                    //strip the saveObj stuff that's unnecessary
                    this.cleanSaveObj(saveObj);

                    //for each monthly report number in i and o, round it.
                    angular.forEach(saveObj.itemList.council.monthlyReport, function(rep, ind) {
                        angular.forEach(rep.i, function(amt, itemid) {
                            rep.i[itemid] = Math.round(amt);
                        });
                        angular.forEach(rep.o, function(amt, itemid) {
                            rep.o[itemid] = Math.round(amt);
                        });
                    });

                    var compressed;
                    var lz = LZString.compressToBase64(JSON.stringify(saveObj));
                    compressed = true;
                    //var lz = btoa(JSON.stringify(saveObj));
                    //var lz = JSON.stringify(saveObj);
                    //compressed = false;


                    /*function createLocalSave(gsobj) {
                        gsobj.offlineTimestamp = Date.now();
                        localStorage.setItem('prosperityOfflineSave', JSON.stringify(gsobj));
                        var msg = "Saving to server experienced an error, game progress saved locally for the time being";
                        Engine.log(msg);
                        Engine.createNotification(msg);
                        deferred.reject(errorResponse.data.message);
                    }*/
                    var autoName = $rootScope.world.home.name + ' - Moon ' + $rootScope.season.curMonth + ', ' + $rootScope.season.curYear;


                    console.log('saving to server...', autoName);
                    var gameOverWrite = $rootScope.curGameSave;

                    if (!gameOverWrite) {
                        console.log('new game save of a new game');

                        var gsobj = {
                            name: autoName,
                            data: lz,
                            playerNamed: false,
                            compressed: compressed
                        }
                        gameOverWrite = new Gamesaves(gsobj);

                        gameOverWrite.$save(function(response) {
                            $rootScope.curGameSave = response;
                            deferred.resolve('Game saved');
                        }, function(errorResponse) {
                            //createLocalSave(gsobj);
                        });

                    } else if (gameOverWrite) {

                        gameOverWrite.name = autoName;

                        gameOverWrite.compressed = compressed;
                        gameOverWrite.playerNamed = false;
                        gameOverWrite.data = lz;
                        var gsobj = {
                            name: gameOverWrite.name,
                            data: lz,
                            playerNamed: false,
                            compressed: compressed
                        }
                        gameOverWrite.$update(function(response) {
                            $rootScope.curGameSave = response;
                            deferred.resolve('Game saved');
                        }, function(errorResponse) {
                            //createLocalSave(gsobj);
                        });

                    }
                    return deferred.promise;
                },
                cleanSaveObj: function(saveObj) {
                    var origItemList = JSON.parse(this.getItem('itemlistbk'));

                    function deleteSame(obj, origObj) {
                        angular.forEach(obj, function(val, key) {
                            if (typeof(obj[key]) == 'object' == typeof(origObj[key])) {
                                deleteSame(obj[key], origObj[key])
                            } else {
                                if (typeof(obj[key]) == typeof(origObj[key]) && obj[key] == origObj[key]) {
                                    delete obj[key];
                                }
                            }
                        });
                    }
                    angular.forEach(saveObj.itemList, function(obj, objid) {
                        delete obj.name;
                        delete obj.description;
                        delete obj.fullDescription;
                        delete obj.$$hashKey; // removes all the hashKeys, those should be handled by angular.
                        delete obj.cost;
                        delete obj.products;
                        delete obj.status;
                        delete obj.id;
                        if (obj.type == 'upgrade') {
                            delete obj.level;
                        }
                        if (obj.type == 'job') {
                            delete obj.type2; //for jobs
                        }
                        delete obj.jobs; //for home
                        delete obj.buildings; //for home
                        delete obj.items; //for market
                        delete obj.originalLiege; //for zones
                        delete obj.upgrades; //for jobs
                        delete obj.category; //for buildings, techs
                        delete obj.jobid; //for task
                        delete obj.unlocks; //for anything that might be missing an unlock
                        delete obj.behaviour; //for characters
                        delete obj.requires;
                        delete obj.luxury; //for goods
                        delete obj.decay; //for decayable goods

                        if (obj.type === 'building') {
                            delete obj.effects; //for buildings
                            delete obj.maxProgress;
                            delete obj.max;
                            delete obj.citySpace;
                            delete obj.builders;
                            delete obj.citySpace;
                            delete obj.forestSpace;
                            delete obj.otherSpace;
                            delete obj.riverSpace;
                            delete obj.fieldSpace;
                            delete obj.mineSpace;
                        }

                        delete obj.baseAmt;
                        delete obj.baseDemand;
                        delete obj.baseMaxStep;
                        delete obj.baseProducts;
                        delete obj.baseCost;

                        delete obj.spoilage; //delete the spoilage calculations (so they can be recalculated);
                        delete obj.baseSpoilage;
                        delete obj.products;
                        delete obj.maxStep; //this will be recalculated when the game loads

                        delete obj.coordinates;
                        delete obj.neighbours;
                        delete obj.tribute;
                        delete obj.strength;

                        if (obj.type == 'sector') {
                            delete obj.scale;
                            delete obj.sjobs; //no need to store what jobs belong in the sector
                        }

                        if (objid != 'player') {
                            delete obj.style;
                        }

                        if (objid == 'season') {
                            delete obj.seasonLength;
                        }

                        if (objid == 'market') {
                            delete obj.itemKeys;
                            delete obj.tradableGoods;
                            delete obj.tradedGoods;
                            delete obj.itemKeysLen;

                        }

                        delete obj.type;
                        //deleteSame(obj, origItemList[objid]);
                    });

                    delete saveObj.engine.state;
                    delete saveObj.engine.stopped;
                    delete saveObj.engine.speeds;
                    delete saveObj.engine.speed;
                    delete saveObj.season.stepsPerDay;
                    delete saveObj.season.stepsPerSeason;

                    console.log(saveObj);
                },

                load: function(server, saveid, savestring) {
                    var self = this;
                    if (savestring && $rootScope.User.roles.indexOf("admin") > 0) {
                        //loading a game by its savestring
                        var lz = savestring;

                        self.processLoad(lz, true);
                    } else {
                        //grab it with the Gamesaves service
                        var gamesave = Gamesaves.get({
                            gamesaveId: saveid
                        }, function(gamesave) {
                            console.log('loading gamesave: ' + saveid, gamesave);

                            var lz = gamesave.data;

                            $rootScope.curSaveId = gamesave._id;

                            $rootScope.curGameSave = gamesave;

                            self.processLoad(lz, gamesave.compressed);

                            $rootScope.gamelog.init();
                        });
                    }
                },
                processLoad: function(lz, compressed) {
                    if (lz) {
                        this.init();
                        //compressed = false;
                        try {

                            var saveObj;
                            if (compressed) {
                                lz = LZString.decompressFromBase64(lz);
                            }

                            saveObj = JSON.parse(lz);


                            console.log('saveObj parsed');

                            //this.decompress(saveObj);

                            this.cleanSaveObj(saveObj);

                            //fix up the importantEvents



                            //merging with the $rootScope
                            angular.forEach(saveObj, function(value, key) {
                                if (key != 'importantEvent') {
                                    if (typeof value == 'object') {
                                        $rootScope[key] = jQuery.extend(true, $rootScope[key], value);
                                    } else {
                                        $rootScope[key] = value;
                                    }
                                }
                            });

                            //important event
                            angular.forEach(saveObj.importantEvent, function(used, evtid) {
                                if (evtid != 'curEventId' && (typeof used == 'boolean' || typeof used == 'number')) {
                                    if ($rootScope.importantEvent[evtid]) {
                                        $rootScope.importantEvent[evtid].used = used;
                                    }
                                }
                                //don't have to worry about curEvent because that object will be overwritten anyway
                            });

                            $rootScope.importantEvent.curEvent = null;

                            $rootScope.nextContractId = parseInt($rootScope.nextContractId);

                            this.fixup();

                            $rootScope.linkItemList(); //maybe this
                            //Player.rebuildDiscoveries();

                            $rootScope.checkPlayerDefaults(); //in case there was no defaults for the player

                            //apply all upgrades!
                            angular.forEach($rootScope.upgrades, function(upgrade, id) {
                                //console.log(id);
                                if (upgrade) {
                                    if (upgrade.unlocked) {
                                        if (upgrade.applyUpgrade) {
                                            upgrade.applyUpgrade();
                                        }

                                        if (upgrade.unlocks) {
                                            //for each unlock, if it's a building, make sure it's unlocked
                                            angular.forEach(upgrade.unlocks, function(unlockable) {
                                                var obj = $rootScope.itemList[unlockable];
                                                if (obj) {
                                                    if (obj.type == "building" && !obj.unlocked) {
                                                        Player.unlock(obj.id);
                                                    }
                                                } else {
                                                    console.error("Object " + unlockable + " does not exist");
                                                }
                                            });
                                        }
                                    }
                                }
                            });

                            //if any inventory items are negative, set to 0
                            angular.forEach($rootScope.player.inventory, function(val, key){
                                if(val < 0){
                                    $rootScope.player.inventory[key] = 0;
                                }
                            });

                            //fixup the issue with People

                            angular.forEach($rootScope.world.home.people, function(person) {
                                if (person.fn === 'traderJoeBuildMarketRequest') {
                                    person.fn = 'loadImportantEvent';
                                    person.params = 'traderJoeAgainVisit';
                                }
                            });
                            $rootScope.player.curLocation = 'home';
                            $state.go('prosperity.home');


                            $rootScope.introed = true;
                            $rootScope.storyScreens.intro = false;

                            $rootScope.inLoading = false;
                            this.start("Processed Load");
                            Home.checkSettlementLevel(true);
                            Home.calcAll();
                            Home.fixNaNs();
                            $rootScope.fixImportantEvents();
                        } catch (e) {
                            console.error(e);
                        }

                    } else {
                        console.log("lz is empty? ", lz);

                        $state.go('prosperity.intro');
                    }
                },
                fixup: function() {
                    /*//changing tasks from objects to ids
                    angular.forEach($rootScope.itemList, function(item, ind) {
                        if (item.type == 'job') {
                            var newArr = [];
                            angular.forEach(item.tasks, function(task, index) {
                                if (typeof task == 'object' && task.id) {
                                    newArr.push(task.id);
                                }
                            });
                            item.tasks = newArr;
                        }
                    });

                    $rootScope.world.home.canLevelUp = false; //just.. make it false and have the check run again.
                    Engine.insertToLog('home.canLevelUp false, set in fixup');*/
                    //$rootScope.itemList.house.effects.workers = 5;
                    //$rootScope.itemList.cultivating.preconditions=['notWinter'];
                    $rootScope.updateHomeName(); //set the home name

                    //fixup building totalMade
                    angular.forEach($rootScope.buildings, function(building, buildingid) {
                        if (building.totalMade < building.created) {
                            building.totalMade = building.created
                        }
                    });


                    var curRepairProjs = [];
                    /* angular.forEach($rootScope.world.home.projectQueue, function(proj){
                         if(proj.instId){
                             if(curRepairProjs.indexOf(proj.instId) < 0){
                                 curRepairProjs.push(proj.instId);
                             } else {

                             }
                         }
                     });

                     var i = 0;
                     while(i < $rootScope.world.home.projectQueue.length){
                         var proj = $rootScope.world.home.projectQueue[i];

                         if(proj.instId){
                             if(curRepairProjs.indexOf(proj.instId) < 0){
                                 curRepairProjs.push(proj.instId);
                             } else {
                                 $rootScope.world.home.projectQueue.splice(i, 1);
                                 i--;
                             }
                         }
                         i++;
                     }*/

                    $rootScope.world.home.projectQueue = $rootScope.world.home.projectQueue.filter(function(proj) {
                        if (proj.instId) {
                            if (curRepairProjs.indexOf(proj.instId) < 0) {
                                curRepairProjs.push(proj.instId);
                                return true;
                            } else {
                                return false;
                            }
                        } else {
                            return true;
                        }
                    });

                    angular.forEach($rootScope.world.home.projectQueue, function(proj) {
                        if(!proj.id){
                            proj.id = Math.ceil(Math.random()*1000000);
                        }
                        if (proj.type == 'repair') {
                            var keys = Object.keys(proj.cost);
                            if (keys.length > 1 || keys.length == 1 && keys[0] != 'gold') {
                                proj.cost = {
                                    gold: $rootScope.fns.getGoldValue(proj.cost)
                                }
                            }

                            //make sure the instance is marked as inRepair
                            var building = $rootScope.itemList[proj.buildingId];
                            for (var i = 0; i < building.instances.length; i++) {
                                var _b = building.instances[i];
                                if (_b.id == proj.instId) {
                                    _b.inRepair = true;
                                }
                            }
                        }
                    });

                    if($rootScope.itemList.porcelainTower.created > 0 && (!$rootScope.itemList.university.scholars || $rootScope.itemList.university.scholars.length === 0)){
                        $rootScope.itemList.porcelainTower.onBuild();
                    }
                }
            }

            return game;
        }
    ]);

Object.deepExtend = function(destination, source) {
    for (var property in source) {
        if (source[property] && source[property].constructor &&
            source[property].constructor === Object) {
            destination[property] = destination[property] || {};
            Object.deepExtend(destination[property], source[property]);
        } else {
            destination[property] = source[property];
        }
    }
    return destination;
};
