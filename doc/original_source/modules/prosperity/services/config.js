angular.module('prosperity')
    .service('Config', ['$sce', '$timeout', '$location', '$http', '$rootScope', 'World', 'Player', 'Events', 'Engine', 'Home',
        'Forest', 'Field', 'Seasons', 'Mine', 'Market', 'Battle', 'Item', 'Game', 'Techs',
        function Config($sce, $timeout, $location, $http, $rootScope, World, Player, Events, Engine, Home, Forest, Field, Seasons, Mine, Market, Battle, Item, Game, Techs) {

            // this will initialize a bunch of stuff for the game with default values. This is essentially config. and a whole lot of functions.
            var search = $location.search();

            $rootScope.version = '0.9.5'; //versioning as follows: a/b/1 (alpha, beta, 1) . update . patch
            /*** Constants ***/

            $rootScope.STEPSPERDAY = 900;

            $rootScope.configged = false;

            $rootScope.AIMechanicStart = $rootScope.STEPSPERDAY * 90 * 7;

            $rootScope.revoltMechanicStart = $rootScope.STEPSPERDAY * 700;

            $rootScope.TREEMATURETIME = 36;

            $rootScope.TAXCENTERBASE = 22;

            $rootScope.CITYGUARDBASE = 56;

            $rootScope.GOLDCOSTPERARCHER = 108 * 15;

            $rootScope.ARCHERUPKEEP = Math.round(108 * 1.5);

            $rootScope.GOLDCOSTPERWARRIOR = 108 * 10;

            $rootScope.WARRIORUPKEEP = 108;

            $rootScope.BASEENGINERATE = 0.05;

            $rootScope.BASECARAVANCAPACITY = 10000;

            $rootScope.CAUSESOFDEATH = ['had a bad accident and died',
                'ate some bad food and died of food poisoning',
                'has died of dysentery',
                'died peacefully of an unknown reason',
                'got bored and did something stupid, then died',
                'picked a fight with the wrong animal (bear)',
                'picked a fight with the wrong animal (chicken)',
                'picked a fight with the wrong animal (cow)',
                'blacked out while horse riding and stunned to death by wasps',
                'committed suicide after learning he had an uncurable illness',
                'trampled by a herd of deer... so the story goes',
                'assassinated by accident. You got lucky',
                'died of boredom, literally',
                'died from smoking weird herbs picked up in the forest'
            ];

            $rootScope.$on('$stateChangeStart',
                function(event, toState, toParams, fromState, fromParams, options) {
                    // transitionTo() promise will be rejected with 
                    // a 'transition prevented' error
                    console.log(event, toState, toParams, fromState, fromParams, options);
                    if (toState.name === "prosperity.home" && !$rootScope.configged) {
                        event.preventDefault();
                        $state.go('home');
                    }
                });

            //cheats

            $rootScope.isAdmin = function() {
                return $rootScope.User.roles.indexOf("admin") >= 0;
            };

            $rootScope.insertInventory = function(obj) {
                if ($rootScope.isAdmin()) {
                    Player.insertInventory(obj);
                }
            };

            $rootScope.insertFood = function(amt) {
                if ($rootScope.isAdmin()) {
                    Player.insertInventory({
                        meat: amt,
                        vegetable: amt,
                        bread: amt,
                        cheese: amt,
                        fruit: amt,
                        fish: amt
                    });
                }
            };

            $rootScope.addWorker = function(num) {
                if ($rootScope.isAdmin()) {
                    Home.newWorkers(num);
                }
            };

            $rootScope.insertNotificationBar = function(msg, opt) {
                Engine.insertNotificationBar(msg, opt);
            };

            $rootScope.autoSave = function() {
                Game.autoSave();
            };
            /**
                Cheat to build buildings, expecting an object of {buildingid:#}
            **/
            $rootScope.build = function(obj) {
                if ($rootScope.isAdmin()) {
                    for (var i in obj) {
                        for (var j = 0; j < obj[i]; j++) {
                            Home.build(i);
                        }
                    }
                }
            };

            $rootScope.addArmy = function(army) {
                if ($rootScope.isAdmin()) {
                    $rootScope.itemList.homeZone.warriors += army.warriors;
                    $rootScope.itemList.homeZone.archers += army.archers;
                }
            };

            $rootScope.triggerBandit = function(w, a) {
                if ($rootScope.isAdmin()) {
                    var invasion = {
                        warriors: w || 50,
                        archers: a || 30
                    }
                    var bandits = {
                        liege: $rootScope.itemList.bandits,
                        invasion: invasion
                    }

                    Battle.create($rootScope.itemList.homeZone, bandits, $rootScope.itemList.player);
                }
            };

            $rootScope.reset = function() {
                $rootScope.configged = false;
                console.log('configged false');
                $rootScope.itemList = {};


                $rootScope.browserNotificationTypes = {
                    tech: {
                        icon: 'images/icons/potion.png',
                        name: 'Tech'
                    },
                    battle: {
                        icon: 'images/icons/battle_s.png',
                        name: 'Battle'
                    },
                    contract: {
                        icon: 'images/icons/message_s.png',
                        name: 'Contracts'
                    },
                    merchant: {
                        icon: 'images/icons/merchant_s.png',
                        name: 'Merchants'
                    },
                    msg: {
                        icon: 'images/icons/message_s.png',
                        name: 'Messages'
                    },
                    building: {
                        icon: 'images/icons/house_s.png',
                        name: 'Construction'
                    },
                    fire: {
                        icon: 'images/icons/fire_s.png',
                        name: 'Fire'
                    },
                    storyline: {
                        icon: 'images/icons/arrowheart.png',
                        name: 'Storyline'
                    },
                    unlockedBuildings: {
                        icon: 'images/icons/house_s.png',
                        name: 'Building Unlock'
                    },
                    disease: {
                        icon: 'images/icons/potion_red.png',
                        name: 'Diseases'
                    },
                    mine: {
                        icon: 'images/icons/earth.png',
                        name: 'Mining'
                    },
                    monthlyFinance: {
                        icon: 'images/icons/merchant_s.png',
                        name: 'Monthly Finances'
                    }
                };


                var listSources = [
                    "listBuildings",
                    "listFood",
                    "listGoods",
                    "listHint",
                    "listJob",
                    "listmilitaryunit",
                    "listPeople",
                    "listPlace",
                    "listPolicy",
                    "listProfession",
                    "listResource",
                    "listSectors",
                    "listSkill",
                    "listTechs",
                    "listZone",
                    "listRelics"
                ];

                var received = 0;

                for (var i in listSources) {
                    $http.get('modules/prosperity/' + listSources[i] + '.json').success(function(data) {
                        $.extend($rootScope.itemList, data);
                        received++;
                        if (received == listSources.length) {
                            finished();
                        }
                    });
                }


                function finished() {
                    //console.log(data);\
                    localStorage.setItem('itemlistbk', JSON.stringify($rootScope.itemList));
                    $rootScope.battles = []; //array of battle objects

                    buildPlayer();

                    buildImportantEvents();

                    $rootScope.linkItemList();
                    $rootScope.configged = true;

                    console.log('configged true');

                    //console.log('rootScope configged');
                    window.root = $rootScope;
                }
            };

            $rootScope.loadFromServer = function() {
                Game.load(true);
            };

            $rootScope.saveToServer = function() {
                Game.save();
            };

            $rootScope.savegame = function() {
                return Game.save();
            }

            //shuffling an array using knuth Shuffle
            $rootScope.shuffle = function(array) {
                var currentIndex = array.length,
                    temporaryValue, randomIndex;

                // While there remain elements to shuffle...
                while (0 !== currentIndex) {

                    // Pick a remaining element...
                    randomIndex = Math.floor(Math.random() * currentIndex);
                    currentIndex -= 1;

                    // And swap it with the current element.
                    temporaryValue = array[currentIndex];
                    array[currentIndex] = array[randomIndex];
                    array[randomIndex] = temporaryValue;
                }

                return array;
            };

            $rootScope.checkPlayerDefaults = function() {
                if ($rootScope.player.name.trim() === '') {
                    $rootScope.player.name = 'Nameless'
                }

                if (!$rootScope.player.face) {
                    $rootScope.player.face = 'male1';
                    $rootScope.player.gender = 'male';
                }

                $rootScope.itemList.player.name = $rootScope.player.name;

                if (!$rootScope.itemList.player.style) {
                    $rootScope.itemList.player.style = $rootScope.getFaceStyle($rootScope.player.face);
                }

            };

            $rootScope.canAfford = function(cost) {
                return Player.canAfford(cost);
            };

            $rootScope.unlock = function(itemid) {
                return Player.unlock(itemid);
            };

            $rootScope.linkItemList = function() {
                console.log("Linking Item List");

                buildWorld();

                buildTechs();

                buildMarket();

                buildCityBuildings();

                buildJobs();

                buildSkills();

                buildCharacters();

                buildZones();

                buildPolicies();

                buildFood();


                $rootScope.itemList.player.name = $rootScope.player.name;
                //link battle zones
                if (!$rootScope.invasions) {
                    $rootScope.invasions = {}
                }

                if (!$rootScope.smallTribes) {
                    $rootScope.smallTribes = []; //list of small tribes that the player can try to conquer
                }

                if ($rootScope.battles.length > 0) {
                    angular.forEach($rootScope.battles, function(battle, ind) {
                        battle.defenders = $rootScope.itemList[battle.defenders.id];
                        battle.attackers = $rootScope.invasions[battle.attackers.id];
                        battle.place = $rootScope.itemList[battle.place.id];
                    });
                }

                if (!$rootScope.battleCount) {
                    $rootScope.battleCount = 0;
                }

                if (!$rootScope.story) {
                    $rootScope.story = {
                        milontiTale: {
                            curLine: 0,
                            canStart: false,
                            completed: false,
                            started: false,
                            startNPCid: 'milonti',
                            fn: 'startMilontiTale',
                            notification: 'Milonti would like to speak with you'
                        },
                        julietPursuit: {
                            curLine: 0,
                            canStart: false,
                            completed: false,
                            started: false,
                            startNPCid: 'juliet',
                            fn: 'startJulietPursuit',
                            notification: 'Juliet would like to speak with you'
                        }
                    }
                }

                //linking any existing people in the people array to the actual character
                for (var name in $rootScope.world.home.people) {
                    var person = $rootScope.world.home.people[name];
                    if (person.character) {
                        person.character = $rootScope.itemList[person.character.id];
                    }
                    if (person.characterid) {
                        person.character = $rootScope.itemList[person.characterid];
                    }
                }

                if ($rootScope.importantEvent.curEventId) {
                    var ie = $rootScope.importantEvent;
                    ie.load(ie.curEventId);
                }
            }

            function incNum(num1, num2) {
                num1 = num1 || 0;
                num2 = num2 || 0;
                return num1 + num2;
            }

            function buildPlayer() {
                $rootScope.player = {
                    randomTipOn: true, //enable random tips by default
                    inGame: true,
                    curLocation: 'main',
                    name: '',
                    gold: 0,
                    techPt: 0, //tech points
                    inventory: {},
                    baseCapacity: 0,
                    maxCapacity: 4000,
                    curCapacity: 0,
                    unlockedItems: [],
                    unlockedBuildings: [],
                    allies: [],
                    enemies: [],
                    morality: 0, //the morality, scales from neg (wrathful) to pos (just)
                    influence: 0,
                    haggleBuy: 1.35,
                    haggleSell: 0.6,
                    awesomeness: 0,
                    dailyConsumables: {},
                    decoAwesomeness: 0,
                    decoCount: 0,
                    festivalAwesomeness: 0,
                    foodVariety: 1,
                    foodAwesomeness: 0,
                    consecutiveNoFood: 0,
                    diseaseFromColdChance: 0,
                    healthAwesomeness: 0,
                    threatAwesomeness: 0,
                    spaceAwesomeness: 0,
                    curNewWorker: 0,
                    maxNewWorker: 23000,
                    buildStep: 5,
                    hasBuilder: false, //whether or not the player has the builder yet (allows creating buildings)
                    militaryExp: 0, //spent on military upgrades
                    events: {
                        wolfAttacks: 0, //count of how many wolf attacks have happened
                        ximniTradeCount: 0, //count of how many times player has transacted with Ximni
                        explainedLevelUpJob: 0,
                        allyOfXimni: 0, //whether or not we're allied with Ximni
                        allyOfPrincess: 0, //alliance with the princess
                        allyOfPsycho: 0,
                        allyOfWarlord: 0,
                        slayPrincess: 0,
                        slayPsycho: 0,
                        slayWarlord: 0,
                        enemyOfXimni: 0,
                        banditAttacks: 0, //count how many bandit attacks have occurred
                        eternalWinter: 0,
                        goodsContractsCompleted: 0
                    },
                    baseRevival: 0.15,
                    goldSpent: 0,
                    goldEarned: 0,
                    foodAte: 0,
                    foodMade: 0,
                    summary: {
                        totalGoldEarned: 0,
                        totalGoldSpent: 0,
                        maxGold: 0,
                        maxAwesomeness: 0,
                        minAwesomeness: 0,
                        animalsHunted: 0,
                        treesCut: 0,
                        daysPassed: 0,
                        maxPopulation: 0,
                        numPeopleAbandoned: 0,
                        maxWarriors: 0,
                        numDied: 0, //units died
                        numKilled: 0, //units killed
                        numSpouses: 0
                    },
                    settings: {
                        browserNotification: true,
                        autoSave: true,
                        explainSeasons: true,
                        doNotAutoJoinChat: false,
                        tutorials: true,
                        showTimestamp: true,
                        useProfanityFilter: true,
                        showWarehouse: true,
                        showGranary: false,
                        notifications: {},
                        hideWorkerBars: false
                    },
                    landConversions: {
                        fieldSpace: 0,
                        forestSpace: 0
                    },
                    jobLevelUp: [],
                    timeToExpire: -1,
                    quests: [],
                    honour: 0
                }
                $rootScope.notificationNames = {
                    battle: "Battle",
                    building: "Construction",
                    fire: "Disasters",
                    contract: "Contracts",
                    merchant: "Merchants",
                    msg: "Message",
                    storyline: "Story",
                    unlockedBuildings: "Building Unlocks",
                    tech: "Sector Points"
                };
                angular.forEach($rootScope.browserNotificationTypes, function(type, typeid) {
                    $rootScope.player.settings.notifications[typeid] = true; //default allow everything.
                });
            }

            $rootScope.levelUpUI = {
                curlevelUp: null,
                show: function() {
                    var self = this;
                    if ($rootScope.player.jobLevelUp.length > 0 && !self.curlevelUp) {
                        self.curlevelUp = $rootScope.player.jobLevelUp[0];
                        self.curlevelUp.job = $rootScope.itemList[self.curlevelUp.jobid];
                        for (var i = 0; i < self.curlevelUp.choices.length; i++) {
                            self.curlevelUp.choices[i] = $rootScope.itemList[self.curlevelUp.choices[i]];
                        }
                        Engine.stop("levelUpUI Stopped Engine"); //stop the engine!
                    } else {
                        console.log("!?!?!");
                    }
                },
                select: function(choice) {
                    if (this.curlevelUp) {
                        var upgrade = Player.unlock(this.curlevelUp.choices[choice]);
                        $rootScope.player.jobLevelUp.shift(); //remove the top-most level-up

                        this.curlevelUp = null;
                        Engine.start("levelUpUI started engine"); //start the engine again
                        if ($rootScope.player.jobLevelUp.length > 0) {
                            this.show();
                        }
                    }
                },
                selectTP: function() {
                    if (this.curlevelUp) {
                        $rootScope.player.jobLevelUp.shift(); //remove the top-most level-up

                        this.curlevelUp = null;
                        Engine.start("levelUpUI started engine"); //start the engine again
                        Techs.increasePt();
                    }
                }
            }

            $rootScope.maps = ['main', 'home', 'forest', 'mine', 'field', 'market', 'tinkery', 'academy', 'council'];

            function buildMarket() {
                var market = $rootScope.world.market;
                market.items = {};
                market.itemKeys = [];
                Market.init();

                angular.forEach($rootScope.itemList, function(obj, objid) {
                    if (obj.type == 'goods' || obj.type == 'food') {
                        market.items[objid] = obj;
                        market.itemKeys.push(objid);

                        //made up prices
                        obj.basePrice = obj.basePrice || Math.ceil(Math.random() * 1000);
                        obj.max = obj.max || Math.ceil(Math.random() * 300000) + 700000;
                        obj.available = obj.available || Math.ceil(Math.random() * obj.max);
                    }
                });
                market.itemKeysLen = market.itemKeys.length;
                $rootScope.goods = market.items;
            }

            function buildWorld() {
                $rootScope.world = {};
                angular.forEach($rootScope.itemList, function(item, id) {
                    if (item.type == 'place') {
                        $rootScope.world[id] = item;
                        item.bg = item.id;
                        switch (item.id) {
                            case 'home':
                                $rootScope.extendObj(item, {
                                    jobs: {}, //to be filled out by createJob()
                                    unlocked: true,
                                    maxContracts: 4,
                                    strength: 10,
                                    buildings: {},
                                    buildingInstances: [],
                                    people: {}, //list of people the player can talk to.
                                    level: 0, //current level - corresponds to levels in Home service
                                    canLevelUp: false, //can we level up? This flag is set by Home service
                                    crimeOrgs: [], //list of criminal organizations
                                    caravan: {
                                        capacity: 10000, //default
                                        ready: true,
                                        recGoods: {},
                                        buy: {},
                                        sell: {},
                                        sentOut: 0,
                                        speed: 15
                                    },
                                    bonusDies: 0,
                                    mason: {
                                        number: 0,
                                        step: 3,
                                        maxProjectQueue: 15
                                    },
                                    foodStore: {
                                        meat: 0,
                                        vegetable: 0,
                                        fruit: 0,
                                        bread: 0,
                                        cheese: 0,
                                        fish: 0
                                    },
                                    foodConsumptionLimits: { //do not consume if there's less than this many
                                        meat: 0,
                                        vegetable: 0,
                                        fruit: 0,
                                        bread: 0,
                                        cheese: 0,
                                        fish: 0
                                    },
                                    spoilage: {
                                        meat: 0.18,
                                        vegetable: 0.14,
                                        fruit: 0.22,
                                        bread: 0.08,
                                        cheese: 0.08,
                                        fish: 0.23
                                    },
                                    baseSpoilage: {
                                        meat: 0.18,
                                        vegetable: 0.14,
                                        fruit: 0.22,
                                        bread: 0.08,
                                        cheese: 0.10,
                                        fish: 0.23
                                    },
                                    consumeFoodRate: 2, //food consumption rate
                                    curFood: 0,
                                    maxFood: 500,
                                    minWorkers: 0, //what is the minimum number of workers
                                    curWorkers: 0,
                                    workersAway: 0, //number of workers who are away for whatever reason - they take up space but does not consume or do work
                                    maxWorkers: 0,
                                    entertainmentRating: 0,
                                    buildingRepairRating: 0,
                                    minWorkerPenalty: 0,
                                    leaderMorality: 0,
                                    entertainmentOffset: 0,
                                    goodSpiritsBonus: 0,
                                    workerMorale: 0,
                                    workerEfficiency: 1, //the efficiency of the workers, 1 is 100% - controls the work progression
                                    theftLevel: 0,
                                    diseased: false,
                                    infected: 0,
                                    houses: [],
                                    baseFoodCapacity: 0,
                                    baseWorkers: 0,
                                    plagueCount: 0,
                                    nat: {
                                        matRate: 0.04,
                                        matThisYear: 0,
                                        retRate: 0.02,
                                        retThisYear: 0
                                    },
                                    effects: [], //special effects - as an array of ids to the effects
                                    repairProjects: [], //list of repair projects, pay mats when starting
                                    inFestival: 0, //this is a number that gets set when a festival is created
                                    maxFestivals: 5, //max number of festivals 
                                    festivals: [], //list of festivals
                                    quarantine: {
                                        //of job:{task:number} to represent quarantined workers (future minor mechanism)
                                    },
                                    recurringContracts: []
                                });
                                if (!item.contractQueue || item.contractQueue.length === 0) {
                                    item.contractQueue = [];
                                }
                                if (!item.projectQueue || item.projectQueue.length === 0) {
                                    item.projectQueue = [];
                                }
                                $rootScope.world.home.foodConsumptionRates = [0, 6, 10, 16, 24]; //different rates affect awesomeness - none, half, basic, extra, feast
                                break;
                            case 'forest':
                                $rootScope.extendObj(item, {
                                    unlocked: true,
                                    curAnimals: 3864,
                                    curTrees: 27173,
                                    maxTrees: 328327,
                                    animalGrowth: 0,
                                    treeGrowth: 0
                                });
                                if (!item.saplings) {
                                    item.saplings = [];
                                    for (var i = 0; i < $rootScope.TREEMATURETIME; i++) {
                                        item.saplings[i] = Math.round(Math.random() * 400) + 100;
                                    }
                                }
                                if (!item.curTrees) {
                                    item.curTrees = 27173
                                }
                                if (!item.curAnimals) {
                                    item.curAnimals = 3864
                                }
                                break;
                            case 'field':
                                $rootScope.extendObj(item, {
                                    unlocked: false,
                                    curlivestock: 0,
                                    rodentInfestation: 0
                                });
                                break;
                            case 'mine':
                                $rootScope.extendObj(item, {
                                    unlocked: false,
                                    curOres: 20000,
                                    onUnlock: function() {
                                        Engine.insert(300, 'explainMining');
                                        $rootScope.fns.calcSpaceAvailable();
                                    },
                                    damaged: 0,
                                    expandMineCost: {
                                        gold: 25000,
                                        wood: 3000
                                    },
                                    expansionPlaces: [
                                        [0, 0, 0, 0, 0, 0, 0],
                                        [0, 0, 0, 0, 0, 0, 0],
                                        [0, 0, 0, 0, 0, 0, 0],
                                        [0, 0, 0, 1, 0, 0, 0],
                                        [0, 0, 0, 0, 0, 0, 0],
                                        [0, 0, 0, 0, 0, 0, 0],
                                        [0, 0, 0, 0, 0, 0, 0]
                                    ],
                                    expansion: {
                                        curCost: {
                                            gold: 10000,
                                            lumber: 1500
                                        },
                                        curProgress: 0,
                                        maxProgress: 20 //days?
                                    }
                                });
                                break;
                            case 'market':
                                $rootScope.extendObj(item, {
                                    unlocked: false,
                                    items: []
                                });
                                break;
                            case 'wall':
                                $rootScope.extendObj(item, {
                                    defensibility: 0,
                                    autorepair: false,
                                    unlocked: false
                                });
                                break;
                            case 'council':
                                $rootScope.extendObj(item, {
                                    unlocked: false,
                                    monthlyReports: {}
                                });
                                break;
                            case 'pub':
                                $rootScope.extendObj(item, {
                                    unlocked: false,
                                });
                                break;
                            case 'masonsGuild':
                                $rootScope.extendObj(item, {
                                    unlocked: false
                                });
                                item.onUnlock = function() {
                                    Home.calcMaxJobNumbers('builder');
                                }
                                break;
                            case 'militaryCouncil':
                                $rootScope.extendObj(item, {
                                    unlocked: false
                                });
                                break;
                            case 'university':
                                $rootScope.extendObj(item, {
                                    unlocked: false,
                                    scholars: [],
                                    points: 0,
                                    totalPoints: 0,
                                    level: 0
                                });
                                break;
                        }
                    }
                });
            }


            $rootScope.houseTypes = {
                tent: {
                    type: 'tent',
                    effects: {
                        attractiveness: 0,
                        workers: 3
                    }
                },
                hovel: {
                    type: 'hovel',
                    effects: {
                        attractiveness: -1,
                        workers: 3,
                        capacity: 200
                    }
                },
                house: {
                    type: 'house',
                    effects: {
                        attractiveness: 0,
                        workers: 5,
                        capacity: 600
                    }
                },
                mansion: {
                    type: 'mansion',
                    effects: {
                        attractiveness: 4,
                        workers: 6,
                        capacity: 1000
                    }
                },
                manor: {
                    type: 'manor',
                    effects: {
                        attractiveness: 8,
                        workers: 10,
                        capacity: 1400
                    }
                },
                chateau: {
                    type: 'chateau',
                    effects: {
                        attractiveness: 25,
                        workers: 20,
                        capacity: 3000
                    }
                },
                estate: {
                    type: 'estate',
                    effects: {
                        attractiveness: 100,
                        workers: 20,
                        capacity: 10000
                    }
                },
                publichouse: {
                    type: 'publichouse',
                    effects: {
                        attractiveness: -10,
                        workers: 25,
                        capacity: 3000
                    }
                }
            }

            function buildCityBuildings() {
                var buildings = $rootScope.buildings = $rootScope.world.home.buildings;
                $rootScope.essentialBuildings = [
                    'granary', 'warehouse', 'builderHut'
                ];

                $rootScope.serviceBuildings = {};
                var events = $rootScope.player.events;
                var home = $rootScope.world.home;
                angular.forEach($rootScope.itemList, function(obj, objid) {
                    if (obj.type === 'building') {

                        $rootScope.extendObj(obj, {
                            created: 0,
                            totalMade: 0,
                            cost: {},
                            curProgress: 0,
                            maxProgress: obj.maxProgress,
                            unlocked: 0,
                            inProgress: 0,
                            instances: [] //array of building instances {hp: health}, repair when hp < 70%, when hp < 30%, chance of collapse each day.
                        });

                        if (obj.monthlyOperatingCost) {
                            $rootScope.serviceBuildings[objid] = obj;
                        }

                        home.buildings[objid] = obj; //populating the $rootScope.world version

                        switch (objid) {
                            case 'cityGuardHQ':
                                obj.onBuild = function() {
                                    obj.calcMonthlyBudget();
                                    obj.curBudgetLevel = 0;
                                    obj.nextMonthLevel = 0;
                                }
                                obj.calcMonthlyBudget = function() {

                                    var crimeEffect = [0, -25, -40, -51, -58, -61, -65];

                                    obj.budgetLevels = [];

                                    for (var i = 0; i < crimeEffect.length; i++) {
                                        var l = {
                                            gold: $rootScope.CITYGUARDBASE * i,
                                            crime: crimeEffect[i]
                                        };
                                        obj.budgetLevels.push(l);
                                    };
                                }
                                obj.calcMonthlyBudget();
                                break;
                            case 'craftsmansGuild':
                                obj.onBuild = function() {
                                    if ($rootScope.itemList.craftsmansGuild.totalMade == 1) {
                                        $rootScope.itemList.sector_crafts.points += 5;
                                        var msg = "You have been awarded 5 Crafts Points for completing the Craftsman's Guild";
                                        Engine.log(msg);
                                        Engine.createNotification(msg);
                                    }
                                }
                                break;
                            case 'councilHall':
                                obj.onBuild = function() {
                                    Player.unlock('council')
                                }
                                break;
                            case 'merchantExpress':
                                obj.onBuild = function() {
                                    Player.unlock('market')
                                }
                                break;
                            case 'herbalistShop':

                                break;
                            case 'barracks':
                                /*obj.onBuild = function() {
                                    $rootScope.player.hasGeneral = true;
                                    $rootScope.player.hasTroops = true;
                                    Player.unlock('militaryCouncil');
                                }*/
                                break;
                            case 'dam':
                                obj.onBuild = function() {
                                    if (!$rootScope.importantEvent.fishingCommunityHelpSuccess.used) {
                                        $rootScope.importantEvent.load('fishingCommunityHelpSuccess');
                                    }

                                }
                                break;
                            case 'hovel':
                                obj.onBuild = function() {
                                    if (!$rootScope.importantEvent.firstHovel.used) {
                                        $rootScope.importantEvent.load('firstHovel');
                                    }
                                    Home.addHouse('hovel');
                                }
                                break;
                            case 'house':
                                obj.onBuild = function() {
                                    Home.addHouse('house');
                                }
                                break;
                            case 'mansion':
                                obj.onBuild = function() {
                                    Home.addHouse('mansion');
                                }
                                break;
                            case 'manor':
                                obj.onBuild = function() {
                                    Home.addHouse('manor');
                                }
                                break;
                            case 'chateau':
                                obj.onBuild = function() {
                                    Home.addHouse('chateau');
                                }
                                break;
                            case 'estate':
                                obj.onBuild = function() {
                                    Home.addHouse('estate');
                                }
                                break;
                            case 'publichouse':
                                obj.onBuild = function() {
                                    Home.addHouse('publichouse')
                                }
                                break;
                            case 'porcelainTower':
                                obj.onBuild = function() {
                                    Player.unlock('university');
                                    if (obj.totalMade <= 1) {
                                        var msg = "The Porcelain Tower is complete! As a reward you were given 5 Civil Points";
                                        $rootScope.itemList.sector_civil.points += 5;
                                        Engine.log(msg);
                                        Engine.createNotification(msg);
                                    }
                                    $rootScope.itemList.university.scholars = [];
                                    obj.addScholar('oldMan');
                                    if ($rootScope.player.profession === "scholar") {
                                        obj.addScholar('player');
                                    }
                                };
                                obj.addScholar = function(characterid) {
                                    if ($rootScope.itemList[characterid]) {
                                        var exist = $rootScope.itemList.university.scholars.some(function(s) {
                                            return s.character == characterid;
                                        });
                                        var proficiencies = ['agriculture', 'civil', 'crafts', 'forestry', 'medicine', 'military'];
                                        var scholar = {
                                            character: characterid,
                                            level: 1,
                                            mode: 'general', //general mode - all specialities get 1 exp per day
                                            gen: 0,
                                            agriculture: {
                                                level: 1,
                                                exp: 0
                                            },
                                            civil: {
                                                level: 1,
                                                exp: 0
                                            },
                                            crafts: {
                                                level: 1,
                                                exp: 0
                                            },
                                            forestry: {
                                                level: 1,
                                                exp: 0
                                            },
                                            medicine: {
                                                level: 1,
                                                exp: 0
                                            },
                                            military: {
                                                level: 1,
                                                exp: 0
                                            }
                                        }
                                        for (var i = 0; i < 5; i++) {
                                            var randProf = proficiencies[Math.floor(Math.random() * proficiencies.length)];
                                            scholar[randProf].level++;
                                        }
                                        for (var i = 0; i < proficiencies.length; i++) {
                                            scholar[proficiencies[i]].levelCap = $rootScope.fns.getScholarLevelCap(scholar[proficiencies[i]].level);
                                        }
                                        $rootScope.itemList.university.scholars.push(scholar);
                                    }
                                };
                                break;
                            case 'granary':
                                obj.onBuild = function() {
                                    Home.calcFoodCapacity();
                                }
                                break;
                            case 'warehouse':
                                obj.onBuild = function() {
                                    Home.calcCapacity();
                                }
                                break;
                            case 'treasureVault':
                                obj.onBuild = function() {
                                    Home.calcCapacity();
                                }
                                break;
                            case 'hospital':
                                obj.onBuild = function() {
                                    obj.calcMonthlyBudget();
                                    obj.curBudgetLevel = 0;
                                    obj.nextMonthLevel = 0;
                                }
                                obj.calcMonthlyBudget = function() {
                                    var baseAmt = 95;

                                    var healthEffect = [0, 5, 10, 15, 20, 25];

                                    obj.budgetLevels = [];

                                    for (var i = 0; i <= 5; i++) {
                                        var l = {
                                            gold: baseAmt * i,
                                            health: healthEffect[i]
                                        };
                                        obj.budgetLevels.push(l);
                                    };
                                }
                                obj.calcMonthlyBudget();
                                break;
                                break;
                            case 'mineralMuseum':
                                obj.getMonthlyCost = function() {
                                    var wnum = $rootScope.world.home.curWorkers;
                                    return Market.getGoldValue({
                                        iron: wnum,
                                        coal: wnum
                                    });
                                }
                                break;
                            case 'taxCenter':
                                $rootScope.extendObj(obj, {
                                    curRate: 0,
                                    nextRate: 0
                                });
                                obj.onBuild = function() {
                                    obj.curRate = 0;
                                    obj.nextRate = 0;
                                }
                                break;
                        }
                    }
                });

                if (!$rootScope.distributeMedicine) {
                    $rootScope.distributeMedicine = {
                        show: false,
                        amount: 0,
                        efficacy: 0.5,
                        set: function() {
                            var amt = this.amount;
                            if (amt > 0) {
                                var cost = {
                                    medicine: amt
                                };
                                if (Player.canAfford(cost)) {
                                    Player.pay(cost);
                                    var healed = 0;
                                    for (var i = 0; i < amt; i++) {
                                        if (Math.random() < $rootScope.distributeMedicine.efficacy) {
                                            home.infected--;
                                            healed++;
                                        }
                                    }

                                    return amt + " medicines were distributed, " + healed + " workers recovered"
                                } else {
                                    return "You don't have enough medicine"
                                }
                            } else {
                                return null
                            }
                        },
                        setMax: function() {
                            this.amount = Math.min($rootScope.player.inventory.medicine, home.infected)
                        },
                        distribute: function(amt) {
                            this.amount = amt;
                            this.set();
                        },
                        updateEfficacy: function() {
                            this.efficacy = 0.5;
                            if ($rootScope.itemList.hygiene.unlocked) {
                                this.efficacy += 0.05;
                            }
                            if ($rootScope.itemList.apothecary.unlocked) {
                                this.efficacy += 0.1;
                            }
                            if ($rootScope.itemList.specializedMedication.unlocked) {
                                this.efficacy += 0.15;
                            }
                            if ($rootScope.itemList.potentMedication.unlocked) {
                                this.efficacy += 0.15;
                            }
                        }
                    };
                }

            }

            $rootScope.scaleCost = function(cost, pct) {
                angular.forEach(cost, function(amt, itemid) {
                    cost[itemid] = Math.floor(amt * pct);
                });
            };

            $rootScope.season = {
                stepsPerSeason: $rootScope.STEPSPERDAY * 91, //season is about 3 months = 90 days. each day is therefore 300 steps
                stepsPerDay: $rootScope.STEPSPERDAY,
                curSeason: 'Winter',
                curDay: 16,
                curMonth: 12,
                curYear: 922,
                seasonLength: {
                    Spring: 91,
                    Summer: 91,
                    Autumn: 91,
                    Winter: 91
                }
            };

            $rootScope.engine = {
                normalRate: 0.05, //reduced the rate a little bit
                slowRate: 2.8,
                rate: 0.05, //20 steps per second
                curStep: 0,
                //maxStep: 2160000,
                maxStep: 500000000, //~5 years 
                schedule: {},
                logs: ['Welcome to Prosperity the Game', 'Please remember to subscribe to www.reddit.com/r/ProsperityGame'],
                maxlogs: 200,
                useNotification: true,
                autoSave: true,
                stopped: 0, //number of engine.stops stacked, this is so we don't start the engine again while another popup is expecting the engine to have stopped
                countEvent: Engine.countEvent,
                insert: Engine.insert,
                speeds: [{
                    name: "Pause",
                    rate: 0,
                    active: false
                }, {
                    name: "1x",
                    rate: $rootScope.BASEENGINERATE,
                    active: true
                }, {
                    name: "2x",
                    rate: $rootScope.BASEENGINERATE / 2,
                    active: false
                }],
                speed: 1, //1 - normal, 2 - 2x
                switchSpeed: function(newSpeed) {
                    var oldSpeed = $rootScope.engine.speed;
                    if (oldSpeed != newSpeed) {
                        if (newSpeed === 0) {
                            Engine.stop('User decided to pause');
                        } else {
                            if (oldSpeed === 0) {
                                Engine.start('User decided to resume');
                            }
                        }

                        $rootScope.engine.speed = newSpeed;
                        $rootScope.engine.speeds[oldSpeed].active = false;
                        $rootScope.engine.speeds[newSpeed].active = true;
                    }
                }
            };

            if (!$rootScope.nextContractId) {
                $rootScope.nextContractId = 0;
            }

            $rootScope.companies = { //companies that serve people.
                explorer: [{
                    id: 'Explorers',
                    name: 'The Explorers',
                    mapsAvailable: ['field', 'market', 'academy', 'tinkery', 'council']
                }],
                houseBuilder: [{
                    id: 'KuttingKorners',
                    name: 'Kutting Korners',
                    cost: {
                        gold: 2000
                    },
                    type: 'hovel'
                }, {
                    id: 'BrickingBad',
                    name: 'Bricking Bad',
                    cost: {
                        gold: 9000
                    },
                    type: 'house'
                }, {
                    id: 'HonestlyGood',
                    name: 'Honestly Good',
                    cost: {
                        gold: 30000
                    },
                    type: 'mansion'
                }, {
                    id: 'LawyeredUp',
                    name: 'Lawyered Up Conglomeration',
                    cost: {
                        gold: 200000
                    },
                    type: 'manor'
                }],
                mineBuilder: {
                    id: 'StrikeGoldInc',
                    name: 'Strike Gold Inc.',
                    cost: {
                        gold: 10000,
                        wood: 2400
                    }
                }
            };

            function buildJobs() {
                var jobs = $rootScope.world.home.jobs;
                $rootScope.allTasks = {};
                var iL = $rootScope.itemList;
                angular.forEach(iL, function(obj, objid) {
                    if (obj.type === 'job') {
                        $rootScope.extendObj(obj, {
                            number: 0,
                            max: 0,
                            people: []
                        });
                        jobs[objid] = iL[objid];
                        var sector = $rootScope.itemList['sector_' + obj.category];
                        if (sector) {
                            sector.sjobs.push(obj);
                        } else {
                            console.log('invalid sector: ', obj.id, obj.category);
                        }

                    }
                });
                console.log(jobs);
                //building tasks
                angular.forEach(jobs, function(obj, objid) {

                    $rootScope.extendObj(obj, {
                        number: 0,
                        unlocked: false,
                        curStatus: 0
                    });

                    if (!obj.baseMaxStep) {
                        obj.baseMaxStep = obj.maxStep;
                    }

                    if (!obj.baseProducts) {
                        obj.baseProducts = $.extend(true, {}, obj.products);
                    }

                    if (!obj.baseCost) {
                        obj.baseCost = $.extend(true, {}, obj.cost);
                    }

                    if (!obj.maxWorkers) {
                        obj.maxWorkers = 0;
                    }

                    obj.idleIfFull = obj.idleIfFull || false;



                    switch (objid) {
                        case 'lumberjack':
                            break;
                        case 'forester':
                            obj.onComplete = function() {
                                if (Math.random() < obj.number / 5000) {
                                    Player.insertInventory({
                                        herb: 5
                                    });
                                }

                                $rootScope.world.forest.saplings[$rootScope.TREEMATURETIME - 1] += obj.number * 2;
                            }
                            break;
                        case 'miner':
                            obj.onComplete = function() {

                            }
                            obj.onNewDay = function() {
                                var p = obj.number / (4000 + $rootScope.world.mine.curOres);
                                if (iL.miningShafts.unlocked) {
                                    p *= 2;
                                }

                                if (Math.random() < p) {
                                    var amt = Math.ceil(Math.random() * 200) * 50;
                                    Player.insertInventory({
                                        ores: amt
                                    });
                                    var msg = "Your miners have discovered a vein of " + amt + " ores in the mining network"
                                    Engine.log(msg);
                                    Engine.createNotification(msg);
                                }
                            }
                            break;
                    }

                });
            }



            function buildTechs() {
                var iL = $rootScope.itemList;
                $rootScope.techTree = {
                    id: 'techTreeRoot',
                    obj: {},
                    children: []
                };
                $rootScope.sectors = {};

                var baseCost = 1;
                var scale = 1;
                var totalcost = 0;

                $rootScope.techBase = 100;
                $rootScope.techScale = 1.25;

                angular.forEach(iL, function(obj, objid) {
                    if (obj.type == 'sector') {
                        if (!$rootScope.sectors[objid]) {
                            $rootScope.sectors[objid] = obj;
                            obj.sjobs = [];
                        }
                        $rootScope.techTree.children.push({
                            id: obj.id,
                            obj: obj,
                            children: []
                        });
                        if (!obj.cap) {
                            obj.cap = Techs.calcCap(obj);
                        }

                    }
                });

                function addTech(obj) {
                    if (!obj) {
                        console.log('Bad object trying to get added to tech tree');
                        return;
                    } else {
                        var _obj = findInTree(obj.id);
                        if (_obj) {
                            return _obj;
                        }
                        obj = createTechNode(obj);
                    }
                    if (!obj.category) {
                        console.log(obj.id + " doesnt have a category");
                        return;
                    }

                    var sector, iL_sector;

                    for (var i = 0; i < $rootScope.techTree.children.length; i++) {
                        var s = $rootScope.techTree.children[i];
                        if (s.id === 'sector_' + obj.category) {
                            sector = s;
                            iL_sector = $rootScope.itemList[s.id];
                        }
                    }
                    if (!sector) {
                        console.log(obj.id + " category is invalid");
                        return;
                    }
                    if (!sector.children) {
                        sector.children = [];
                    }
                    var parent = sector;
                    if (obj.obj.requires) {
                        //make sure prerequisites are added already
                        if (obj.obj.requires.unlocked) {
                            var prereq_id = obj.obj.requires.unlocked;
                            //console.log("requires", prereq_id);
                            var prereq = findInTree(prereq_id);
                            //console.log(prereq);
                            if (!prereq) {
                                prereq = addTech(iL[prereq_id]);
                            }
                            obj.obj.cost = Math.round(prereq.obj.cost + scale);
                            parent = prereq;
                        } else {
                            obj.obj.cost = baseCost;
                        }
                    } else {
                        obj.obj.cost = baseCost;
                    }
                    totalcost += obj.obj.cost;
                    parent.children.push(obj);
                    return obj;
                }

                function createTechNode(obj) {
                    return {
                        id: obj.id,
                        obj: obj,
                        category: obj.category,
                        children: []
                    }
                }

                function findInTree(objid, node) {

                    //console.log("findInTree:"+objid);
                    if (!node) {
                        node = $rootScope.techTree;
                    }

                    if (node.id === objid) {
                        return node;
                    } else {
                        if (node.children.length === 0) {
                            return null;
                        } else {
                            for (var i in node.children) {
                                var n = findInTree(objid, node.children[i]);
                                if (n) {
                                    return n;
                                }
                            }
                            return null;
                        }

                    }
                }


                //getting the upgrades
                $rootScope.upgrades = {};

                //Nov 13, 2015 - instead of each job getting their own line (which would be ridiculous), each job contributes
                //to a different sector - agriculture, civil, metallurgy, food, military, medicine which in turn
                //has its own upgrade line
                //this also removes the need for "jobs", as each task should now be designated to their own building structure, and
                //contributes to a sector

                angular.forEach(iL, function(obj, objid) {
                    if (obj.type === 'upgrade') {
                        $rootScope.extendObj(obj, {
                            unlocked: false
                        });

                        var node = addTech(obj);

                        $rootScope.upgrades[objid] = obj;

                        var events = $rootScope.player.events;
                        switch (objid) {
                            //General
                            case 'bookKeeping':
                                //unlocks bookKeeping, effect implemented at market.js level
                                break;
                            case 'apiariology':
                                obj.onUnlock = function() {

                                    var msg = 'You have learned beekeeping, create an apiary and send workers to maintain bees to collect honey and wax';
                                    Engine.log(msg);
                                    Engine.createNotification(msg);
                                    Engine.insert(700, 'eventAbbyAsksBees');
                                    //$rootScope.importantEvent.unload();
                                    Engine.insert(200, 'eventUnlockBeeKeeping');
                                }
                                obj.checkRequirements = function() {
                                    return $rootScope.itemList.field.unlocked;
                                }
                                break;
                            case 'thiefDen':
                                obj.onUnlock = function() {
                                    //$rootScope.importantEvent.load('abbyPondersThieves');
                                }
                                break;
                            case 'artOfWar':
                                obj.applyUpgrade = function() {
                                    $rootScope.fns.calcArcherStats();
                                    $rootScope.fns.calcWarriorStats();
                                };
                                break;
                            case 'cometsBlaze':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                };
                                obj.applyUpgrade = function() {
                                    $rootScope.fns.calcArcherStats();
                                    $rootScope.fns.calcWarriorStats();
                                };
                                obj.checkRequirements = function() {
                                    return $rootScope.itemList.cropCircles.unlocked;
                                }
                                break;
                            case 'employmentCenter':
                                obj.onUnlock = function() {
                                    Engine.createNotification('Employment Center has been unlocked, you may now set hiring goals for each job');
                                }
                                break;
                                //Apothecary
                            case 'standardizedCauldron':
                                obj.applyUpgrade = function() {
                                    iL.apothecary.maxStep -= Math.floor(iL.apothecary.baseMaxStep * .1);
                                }
                                obj.checkRequirements = function() {
                                    return $rootScope.itemList.herbalistShop.created > 0;
                                }
                                break;
                            case 'socialHealthcare':
                                //Unlocks the auto-distribute button for when people are sick
                                obj.onUnlock = function() {
                                        Player.unlock('p_socialHealthcare');
                                    }
                                    /*  = {
                                        name: 'Social Healthcare',
                                        description: 'Fund specialists to respond immediately to diseases, which can help stem the disease before it spreads',
                                        running: false,
                                        cost: {
                                            gold: 3
                                        }
                                    }*/
                                obj.checkRequirements = function() {
                                    return $rootScope.itemList.council.unlocked;
                                }
                                break;
                            case 'hygiene':
                                //Diseases are 10% less likely to commute when soap is available for daily consumption
                                break;
                            case 'innoculation':
                                //50% less likely for disease to start (Costs 6 gold per worker per day)
                                obj.onUnlock = function() {
                                    Player.unlock('p_innoculation');
                                }
                                obj.checkRequirements = function() {
                                    return $rootScope.itemList.apothecary.unlocked;
                                }
                                break;
                            case 'fieldHospital':

                                break;
                            case 'venomology':
                                break;
                                //Baker
                            case 'yeastCulture':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.baker.products.bread += Math.floor(iL.baker.baseProducts.bread * 0.15);
                                }
                                break;
                            case 'bakersOven':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.baker.maxStep -= Math.floor(iL.baker.baseMaxStep * 0.1);
                                }
                                break;
                            case 'tastyDelicacy':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function () {
                                    Player.unlock('bakingCake');
                                    Player.unlock('cakery');
                                }
                                break;
                            case 'refrigeration':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    for (var i in $rootScope.world.home.baseSpoilage) {
                                        $rootScope.world.home.spoilage[i] = $rootScope.world.home.baseSpoilage[i] / 2;
                                    }
                                }
                                break;
                            case 'circularSaw':
                                obj.onUnlock = function(){
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function(){
                                    iL.lumberMiller.maxStep -= Math.floor(iL.lumberMiller.baseMaxStep * 0.25);
                                }
                                break;
                            case 'waterTank':

                                break;
                            case 'tastyLoafs':
                                obj.onUnlock = function() {
                                    Home.build('bakery');
                                }
                                break;
                            case 'balancedDiet':
                                //handled by Home.step
                                break;
                                //Bee Keeper
                            case 'littleLights':
                                obj.onUnlock = function() {
                                    Home.build('chandlerWorkshop');
                                }
                                break;
                            case 'localGardens':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                    Player.unlock('garden');
                                }
                                obj.applyUpgrade = function() {
                                    iL.beeKeeper.maxStep -= Math.floor(iL.beeKeeper.baseMaxStep * 0.1);
                                }
                                break;
                            case 'soapMaking':
                                obj.onUnlock = function() {
                                    Player.unlock('soapery');
                                }
                                break;
                            case 'pollinationService':
                                //handled by Forest.step
                                break;
                            case 'waxWork':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();

                                }
                                obj.applyUpgrade = function() {
                                    iL.chandler.maxStep -= Math.floor(iL.chandler.baseMaxStep * 0.1);
                                    iL.soaper.maxStep -= Math.floor(iL.soaper.baseMaxStep * 0.1);
                                }
                                break;
                            case 'bowyerWax':
                                obj.onUnlock = function() {
                                    $rootScope.fns.calcArcherStats();
                                }
                                obj.checkRequirements = function() {
                                    return $rootScope.itemList.fletcherWorkshop.created > 0; //make sure we have at least a fletcher shop
                                }
                                break;
                                //Blacksmith
                            case 'perimeterDefense':
                                obj.onUnlock = function() {
                                    Player.unlock('perimeterTower');
                                }
                                break;
                            case 'blastFurnace':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.metallurgist.products.steel += Math.floor(iL.metallurgist.baseProducts.steel * 0.25);
                                }
                                break;
                            case 'recyclingSteel':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.bladesmith.maxStep -= Math.floor(iL.bladesmith.baseMaxStep * 0.1);
                                    iL.armoursmith.maxStep -= Math.floor(iL.armoursmith.baseMaxStep * 0.1);
                                    iL.metallurgist.maxStep -= Math.floor(iL.metallurgist.baseMaxStep * 0.1);
                                }
                                break;
                            case 'sharpeningBlocks':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.bladesmith.maxStep -= Math.floor(iL.bladesmith.baseMaxStep * 0.15);
                                }
                                break;
                            case 'plateMould':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.armoursmith.maxStep -= Math.floor(iL.armoursmith.baseMaxStep * 0.15);
                                }
                                break;
                            case 'ironTraps':
                                obj.onUnlock = function() {
                                    Player.unlock('makingTraps');
                                }
                                break;
                            case 'specialSteel':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    $rootScope.fns.calcWarriorStats();
                                    $rootScope.fns.calcArcherStats();
                                }
                                break;
                            case 'tempering':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {

                                    $rootScope.fns.calcWarriorStats();
                                    $rootScope.fns.calcArcherStats();
                                }
                                break;
                            case 'plateMail':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    $rootScope.fns.calcWarriorStats();
                                }
                                break;
                                //bowyer
                            case 'bareBodkin':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    $rootScope.fns.calcArcherStats();
                                }
                                break;
                            case 'archerStakes':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    $rootScope.fns.calcArcherStats();
                                }
                                break;
                            case 'yewSpecialization':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.lumberjack.maxStep += Math.floor(iL.lumberjack.baseMaxStep * 0.05);
                                    iL.bowyer.maxStep -= Math.floor(iL.bowyer.baseMaxStep * 0.1);
                                }
                                break;
                                //builder
                            case 'betterShelving':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {

                                    Home.calcCapacity();
                                    Home.calcFoodCapacity();
                                }
                                break;
                                //hunter
                            case 'arrowDynamics':
                                obj.onUnlock = function() {
                                    Home.build('fletcherWorkshop');
                                    Home.build('bowyerWorkshop');
                                }
                                break;
                            case 'huntingDogs':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    $rootScope.fns.calcHuntingSpeed();
                                }
                                break;
                            case 'domesticatedAnimals':
                                obj.onUnlock = function() {
                                    Player.unlock('ranch');
                                    Home.build('ranch');
                                }
                                break;
                            case 'animalReserves':
                                obj.onUnlock = function() {
                                    $rootScope.world.forest.animalGrowth += 70;
                                }
                                break;
                            case 'furHunter':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.hunter.products.fur += iL.hunter.baseProducts.fur * 0.5;
                                }
                                break;
                            case 'huntingSeasons':
                                obj.onUnlock = function() {
                                    if ($rootScope.player.settings.tutorials && !events.explainHuntingSeasons) {
                                        events.explainHuntingSeasons = 1;
                                        Engine.insert(50, 'loadImportantEvent', ['explainhuntingSeasons']);
                                    }
                                }
                                break;
                            case 'carvingTechniques':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.hunter.products.meat += Math.floor(iL.hunter.baseProducts.meat * 0.2);
                                }
                                obj.checkRequirements = function() {
                                    return $rootScope.itemList.furHunter.unlocked;
                                }
                                break;
                                //lumberjack
                            case 'handSaw':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.lumberjack.maxStep -= Math.floor(iL.lumberjack.baseMaxStep * 0.1);
                                }
                                break;
                            case 'fruitTrees':
                                obj.onUnlock = function() {
                                    if ($rootScope.player.settings.tutorials && !events.explainOrchard) {
                                        events.explainOrchard = 1;
                                        Engine.insert(50, 'loadImportantEvent', ['explainOrchard']);
                                    }

                                    Player.unlock('orchard');
                                    Home.build('orchard');
                                }
                                break;
                            case 'forestManagement':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.lumberjack.products.seed = 1;
                                }
                                break;
                            case 'treePlanters':
                                obj.onUnlock = function() {
                                    obj.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    Player.unlock('treeNursery');
                                }
                                break;
                            case 'treeSelection':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.lumberjack.maxStep += Math.floor(iL.lumberjack.baseMaxStep * 0.5);
                                    iL.lumberjack.products.wood += iL.lumberjack.baseProducts.wood;
                                }
                                break;
                            case 'constructionWood':
                                obj.onUnlock = function() {
                                    Home.build('sawMill');
                                }
                                break;
                            case 'constructionWood2':
                                break;
                                //miner
                            case 'metalCraft':
                                obj.onUnlock = function() {
                                    Player.unlock('steelSmelter');
                                    Home.build('steelSmelter');
                                }
                                break;
                            case 'miningTools':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.miner.maxStep -= Math.floor(iL.miner.baseMaxStep * 0.15);
                                }
                                break;
                            case 'coalCarts':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.coalMiner.maxStep -= Math.floor(iL.coalMiner.baseMaxStep * 0.15);
                                }
                                break;
                            case 'miningShafts':
                                break;
                            case 'undergroundVault':
                                obj.onUnlock = function() {
                                    Player.unlock('treasureVault');
                                }
                                break;
                                //orchardist
                            case 'fruitBaskets':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.orchardist.maxStep -= Math.floor(iL.orchardist.baseMaxStep * 0.1);
                                }
                                break;
                            case 'anAppleADay':
                                obj.onUnlock = function() {
                                    Player.unlock('herbalistShop');
                                    Home.build('herbalistShop');
                                }
                                break;
                            case 'fruitSeedCollection':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.orchardist.products.seed = 1;
                                }
                                break;
                            case 'vegetableGrowth':
                                obj.onUnlock = function() {
                                    Player.unlock('vegetableFarm');
                                    Home.build('vegetableFarm');
                                }
                                break;
                            case 'fermentedFruit':
                                obj.onUnlock = function() {
                                    Player.unlock('makingWine');
                                }
                                break;
                            case 'pruningTechniques':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.orchardist.maxStep -= Math.floor(iL.orchardist.baseMaxStep * 0.1);
                                }
                                break;
                            case 'winterBerry':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                    if (!$rootScope.importantEvent.explainWinterBerry.used) {
                                        Engine.insert(50, 'loadImportantEvent', ['explainWinterBerry']);
                                    }
                                }
                                obj.applyUpgrade = function() {
                                    iL.orchardist.preconditions.splice(iL.orchardist.preconditions.indexOf('notWinter'), 1);
                                }
                                break;
                                //rancher
                            case 'cheeseMaking':

                                break;
                            case 'animalHusbandry':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.rancher.maxStep -= Math.floor(iL.rancher.baseMaxStep * 0.1);
                                }
                                break;
                            case 'wheatFields':
                                obj.onUnlock = function() {
                                    Player.unlock(['wheatFarm', 'flourmill']);
                                    Home.build('wheatFarm');
                                    Home.build('flourmill');
                                }
                                break;
                            case 'slaughteringTools':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.butcher.maxStep -= ((iL.butcher.baseMaxStep * .1) | 0);
                                }
                                break;
                            case 'breedingStalls':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.rancher.maxStep -= ((iL.rancher.baseMaxStep * .1) | 0);
                                }
                                break;
                            case 'beastsOfBurden':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.lumberjack.maxStep -= ((iL.lumberjack.baseMaxStep * .05) | 0);
                                    iL.coalMiner.maxStep -= ((iL.coalMiner.baseMaxStep * .05) | 0);
                                    iL.miner.maxStep -= ((iL.miner.baseMaxStep * .05) | 0);
                                }
                                break;
                            case 'skinning':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }

                                obj.applyUpgrade = function() {
                                    iL.butcher.baseProducts.fur = 6;
                                    iL.butcher.products.fur = 6;
                                }
                                break;
                                //vegetable farmer
                            case 'herbology':
                                obj.onUnlock = function() {
                                    Player.unlock('harvestHerbs');
                                }
                                break;
                            case 'gardenSpade':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.vegetableFarmer.maxStep -= ((iL.vegetableFarmer.baseMaxStep * .1) | 0);
                                }
                                break;
                            case 'greenhouse':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.vegetableFarmer.preconditions = [];
                                }
                                break;
                            case 'chickenWire':

                                break;
                            case 'gardenGnomes':

                                break;
                            case 'growthPotions':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.orchardist.maxStep -= ((iL.orchardist.baseMaxStep * .05) | 0);
                                    iL.vegetableFarmer.maxStep -= ((iL.vegetableFarmer.baseMaxStep * .05) | 0);
                                }
                                break;
                            case 'growthPotions2':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.orchardist.maxStep -= ((iL.orchardist.baseMaxStep * .05) | 0);
                                    iL.vegetableFarmer.maxStep -= ((iL.vegetableFarmer.baseMaxStep * .05) | 0);
                                }
                                obj.checkRequirements = function() {
                                    return iL.growthPotions.unlocked;
                                }
                                break;
                                //Wheat Farmer
                            case 'sickles':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.wheatFarmer.maxStep -= Math.floor(iL.wheatFarmer.baseMaxStep * .2);
                                }
                                break;
                            case 'meadMaking':
                                obj.onUnlock = function() {
                                    Home.build('brewery');
                                }
                                break;
                            case 'windmill':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.miller.products.flour += iL.miller.baseProducts.flour;
                                    iL.miller.cost.wheat += iL.miller.baseCost.wheat;
                                }
                                break;
                            case 'harnessTheWind':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.miller.maxStep -= Math.floor(iL.miller.baseMaxStep * .15);
                                }
                            case 'irrigation':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.orchardist.products.fruit += ((iL.orchardist.baseProducts.fruit * .1) | 0);
                                    iL.vegetableFarmer.products.vegetable += ((iL.vegetableFarmer.baseProducts.vegetable * .1) | 0);
                                    iL.wheatFarmer.products.wheat += ((iL.wheatFarmer.baseProducts.wheat * .1) | 0);
                                }
                                break;
                            case 'hayBails':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    iL.rancher.maxStep -= ((iL.rancher.baseMaxStep * .05) | 0);
                                }
                                break;
                            case 'cropCircles':

                                break;
                            case 'fertilizer':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                    if (!$rootScope.importantEvent.abbyGoEww.used) {
                                        $rootScope.importantEvent.load('abbyGoEww');
                                    }
                                }
                                obj.applyUpgrade = function() {
                                    iL.orchardist.products.fruit += ((iL.orchardist.baseProducts.fruit * .25) | 0);
                                    iL.vegetableFarmer.products.vegetable += ((iL.vegetableFarmer.baseProducts.vegetable * .25) | 0);
                                }
                                break;
                            case 'caravanCapacity1':
                            case 'doubleCarriage':
                                obj.onUnlock = function() {
                                    this.applyUpgrade();
                                }
                                obj.applyUpgrade = function() {
                                    $rootScope.fns.calcCaravanCapacity();
                                }
                                break;
                            default:
                                console.log('look into tech: ' + objid);
                                break;
                        }
                    }
                });


                console.log('total cost:', totalcost);
            }

            $rootScope.addSets = function(set1, set2) {
                var ret;
                if (typeof set1 === 'object' && typeof set2 === 'object') {
                    ret = {};
                    angular.forEach(set1, function(val, key) {
                        ret[key] = val;
                    });
                    angular.forEach(set2, function(val, key) {
                        if (!ret[key]) {
                            ret[key] = val;
                        } else {
                            ret[key] = $rootScope.addSets(ret[key], val);
                        }
                    });
                } else if (typeof set1 === 'string' || typeof set2 === 'string') {
                    ret = set1;
                } else {
                    ret = set1 + set2;
                }
                return ret;
            }

            //merge sets - creates a new set
            $rootScope.mergeSets = function(set1, set2) {
                var ret = {};
                angular.forEach(set1, function(val, ind) {
                    ret[ind] = val;
                });

                angular.forEach(set2, function(val, ind) {
                    ret[ind] = val;
                });

                return ret;
            }

            $rootScope.extendObj = function(obj1, obj2) {
                //jQuery.extend(obj1, obj2);

                angular.forEach(obj2, function(val, ind) {
                    if (!obj1[ind]) {
                        obj1[ind] = val;
                    }
                });
            }

            /*//test addSets
    var s1 = {wood:20, food:50, gold:300, jobs:{bum:{number:30}}};
    var s2 = {iron:30, wood:20, gold:1000, jobs:{lumberjack:{number:40},bum:{number:20}}};
    var s3 = $rootScope.addSets(s1, s2);
    console.log(s3);
    */
            $rootScope.multSet = function(set, s, round) {
                var ret;
                if (typeof set === 'object') {
                    ret = {};
                    angular.forEach(set, function(val, key) {
                        ret[key] = val * s;
                        if (round) {
                            ret[key] = Math.round(key);
                        }
                    });
                } else {
                    ret = set * s;
                    if (round) {
                        ret = Math.round(ret);
                    }
                }
                return ret;
            }

            function buildSkills() {
                $rootScope.skills = {
                    items: {}
                };

                angular.forEach($rootScope.itemList, function(obj, objid) {
                    if (obj.type === 'skill') {
                        $rootScope.extendObj(obj, {
                            curStep: 0,
                            maxStep: obj.maxStep
                        });

                        $rootScope.skills.items[objid] = obj;
                    }
                });
            }

            function buildCharacters() {
                $rootScope.characters = {};

                angular.forEach($rootScope.itemList, function(item, itemid) {

                    if (item.type == 'character') {

                        $rootScope.characters[itemid] = item;

                        var bg = 'url(\'images/icons/faces/' + (item.img ? item.img : item.id) + '.jpg\')';

                        if (item.sector == 'sector_military') {
                            item.archers = item.archers || {
                                strength: 10,
                                defense: 10
                            };
                            item.archers.strength = item.archers.strength || 10;
                            item.archers.defense = item.archers.defense || 10;

                            item.warriors = item.warriors || {
                                strength: 15,
                                defense: 15
                            };
                            item.warriors.strength = item.warriors.strength || 10;
                            item.warriors.defense = item.warriors.defense || 10;


                            if (!item.invasionCount) {
                                item.invasionCount = 0;
                            }
                        }

                        if (itemid == 'player') {
                            item.spy = item.spy || {
                                number: 0,
                                max: 5,
                                successRate: 0.5, //likelihood of gathering information against a default target
                                baseDeployCost: 1000, //increases for each successful deployment
                                deployedTimes: 0,
                                deployed: [],
                            };
                            if (!item.allies) {
                                item.allies = [];
                            }
                            item.warriors.cost = $.extend({}, $rootScope.itemList.warrior.baseCost);
                            item.archers.cost = $.extend({}, $rootScope.itemList.archer.baseCost);
                            item.capital = 'homeZone';
                            bg = 'url(\'images/icons/faces/' + $rootScope.player.face + '.jpg\')';
                        } else {
                            if (!item.playerOpinion) {
                                item.playerOpinion = {
                                    love: 0, //likelihood to marry 
                                    awe: 0, //likelihood to give in to requests
                                    fear: 0, //likelihood to give in to threat
                                }
                            }
                            item.playerOpinion.love = item.playerOpinion.love || 0;
                            item.playerOpinion.awe = item.playerOpinion.awe || 0;
                            item.playerOpinion.fear = item.playerOpinion.fear || 0;

                            if (itemid == 'thePrincess') {
                                item.aggression = item.aggression || 0.14;
                                item.backstab = item.backstab || 0.013;
                                item.allies = item.allies || [];
                                item.capital = item.capital || 'castleGrey';
                            } else if (itemid == 'theWarlord') {
                                item.aggression = item.aggression || 0.37;
                                item.backstab = item.backstab || 0.031;
                                item.allies = item.allies || [];
                                item.capital = item.capital || 'dickinsonLanding';
                            } else if (itemid == 'thePsychopath') {
                                item.aggression = item.aggression || 0.49;
                                item.backstab = item.backstab || 0.005;
                                item.allies = item.allies || [];
                                item.capital = item.capital || 'hornCastle';
                            }

                            //special case for masons, if they have a status, then they were already unlocked
                            if (itemid.indexOf('mason') > 0 && item.status) {
                                item.unlocked = true;
                            }
                        }

                        item.style = {
                            'background-image': bg,
                            'background-size': 'cover'
                        }




                    }


                });

            }


            //helpers for handling saves/loads/engine - parameters must be primitive!
            $rootScope.fns = { //big list of function calls - redesigned engine to use this list instead of direct function calls

                /**use equalizeArray to modify an element of the array by amount such that the sum is always 1, or whatever sum is**/
                equalizeArray: function(r, index, amount, sum, round) {
                    if (!sum) {
                        sum = 1;
                    }
                    var subsetSize = sum - (r[index]);
                    for (var i = 0; i < r.length; i++) {
                        if (i != index) {
                            r[i] -= (r[i] * amount / subsetSize);
                            if (round) {
                                r[i] = Math.round(r[i]);
                            }
                        }
                    };
                    r[index] += amount;
                    var total = 0;
                    for (var i = 0; i < r.length; i++) {
                        total += r[i];
                    };
                    var diff = sum - total;
                    if (diff != 0) {
                        var largest = 0;
                        if (index == 0) {
                            largest = 1;
                        }
                        for (var i = 1; i < r.length; i++) {
                            if (r[i] > r[largest]) {
                                largest = i;
                            }
                        };
                        r[largest] += diff;
                    };
                    return r;
                },
                cullWorker: function(job, num, sendAway) {
                    Player.cullWorker(job, num, sendAway);
                },
                randJob: function(onlyIfWorked) {

                    /*var taskKeys = Object.keys($rootScope.allTasks),
                        taskId;
                    if (onlyIfWorked) {
                        var found = false;
                        while (!found) {
                            taskId = taskKeys[Math.floor(Math.random() * taskKeys.length)];
                            if ($rootScope.allTasks[taskId].number > 0) {
                                found = true;
                            }
                        }
                    } else {
                        var taskId = taskKeys[Math.floor(Math.random() * taskKeys.length)];
                    }

                    return $rootScope.allTasks[taskId];*/
                    if ($rootScope.itemList.bum.number > 0) {
                        return $rootScope.itemList.bum;
                    } else {
                        var jobs = $rootScope.shuffle(Object.keys($rootScope.world.home.jobs));

                        var job, found = false,
                            index = 0;
                        do {
                            job = $rootScope.itemList[jobs[index]];
                            if (!onlyIfWorked || (onlyIfWorked && job.number > 0)) {
                                found = true;
                            }
                            index++;
                        } while (!found && index < jobs.length)
                        return job;
                    }
                },
                getTitle: function(gender, level) {
                    if (!gender) {
                        gender = $rootScope.player.gender;
                    }
                    if (!level) {
                        level = $rootScope.world.home.level;
                    }
                    if (gender == 'male') {
                        return ['Master', 'Sire', 'Sire', 'My liege', 'M\'Lord', 'Your Majesty'][level];
                    } else if (gender == 'female') {
                        return ['Ma\'am', 'Madame', 'M\'Lady', 'M\'Lady', 'Your Grace', 'Your Royal Highness'][level];
                    }
                },
                setStatus: function(npcId, status) {
                    var npc = $rootScope.itemList[npcId];
                    if (npc) {
                        npc.status = status;
                    } else {
                        console.log('no character: ' + npcId);
                    }
                },
                getNPC: function(npcId) {
                    var npc = $rootScope.itemList[npcId];
                    if (npc) {
                        npc.unlocked = true;
                    } else {
                        console.log('no character: ' + npcId);
                    }
                },
                range: function(a, b) {
                    return (b - a) * Math.random() + a;
                },
                faint: function() {
                    $("header").hide();
                    $("#gameContent").addClass("faint");
                    Engine.stop("User Fainted");
                },
                unfaint: function() {
                    $("#header").show();
                    $("#gameContent").removeClass("faint");
                    Engine.start("User unfainted");
                },
                randRound: function(n) {
                    var ret = 0;
                    if (n > 0) {
                        var base = Math.floor(n);
                        var r = n - base;
                        if (Math.random() < r) {
                            ret = base + 1;
                        } else {
                            ret = base;
                        }
                    } else if (n < 0) {
                        var base = Math.ceil(n);
                        var r = base - n;
                        if (Math.random() < r) {
                            ret = base + 1;
                        } else {
                            ret = base;
                        }
                    }
                    return ret;
                },
                checkCaravan: function() {
                    Market.checkCaravan();
                },
                count: function(itemId) {
                    return Player.count(itemId);
                },
                pickWeightedRand: function(arr, key, amount) {
                    var keySum = 0;
                    var ret = null;

                    amount = amount || 1;

                    for (var i = 0; i < arr.length; i++) {
                        keySum += arr[i][key]
                    }

                    for (var i = 0; i < amount; i++) {

                        var ind = 0;
                        var item = arr[ind];
                        var rand = Math.random() * keySum - arr[0][key];
                        while (rand > 0) {
                            ind++;

                            item = arr[ind];
                            rand -= arr[ind][key];
                        }

                        if (amount > 1) {
                            if (!ret) {
                                ret = [];
                            }
                            ret.push(item);
                        } else {
                            ret = item;
                        }
                    }

                    return ret;

                },
                raidedByAI: function(ai, demand, workersLeft) {
                    var params = {
                        ai: ai,
                        demand: demand,
                        workersLeft: workersLeft
                    };

                    $rootScope.fns.loadImportantEvent('homeZoneRaided', params);
                },
                showLevelUpUI: function() {
                    $rootScope.levelUpUI.show();
                },
                eventRetaliate: function(ai, zoneId) {
                    $rootScope.events.takeBack(ai, zoneId);
                },
                costOfNthUnit: function(base, n) {
                    return base * (1 + n * 0.002);
                },
                updateTotalMilitaryUnits: function() {
                    var player = $rootScope.itemList.player;
                    player.totWarriors = 0;
                    player.totArchers = 0;
                    angular.forEach($rootScope.zones, function(zone) {
                        if (zone.liege == 'player') {
                            zone.warriors = Math.floor(zone.warriors);
                            zone.archers = Math.floor(zone.archers);
                            player.totWarriors += zone.warriors;
                            player.totArchers += zone.archers;
                        }
                    });
                },
                calcBulkUnitCost: function(n, type) {
                    //calc the bulk cost of n units

                    //get the base cost, then for n, scale cost accordingly
                    var baseCost, numInBase, totalCost;

                    $rootScope.fns.updateTotalMilitaryUnits(); //get the latest cost first

                    //numInBase = $rootScope.itemList.player.totWarriors + $rootScope.itemList.player.totArchers;
                    if (type == "warrior") {
                        //warrior
                        totalCost = $.extend({}, $rootScope.itemList.warrior.baseCost);
                        baseGold = $rootScope.itemList.warrior.baseCost.gold;
                        numInBase = $rootScope.itemList.player.totWarriors
                    } else if (type == "archer") {
                        //archer
                        totalCost = $.extend({}, $rootScope.itemList.archer.baseCost);
                        baseGold = $rootScope.itemList.archer.baseCost.gold;
                        numInBase = $rootScope.itemList.player.totArchers;
                    } else {
                        return false;
                    }

                    for (var item in totalCost) {
                        totalCost[item] = totalCost[item] * n;
                    }
                    //console.log('calcBulkUnitCost:', n, type);
                    var Cnm = $rootScope.fns.costOfNthUnit(baseGold, numInBase + n);
                    var Cn = $rootScope.fns.costOfNthUnit(baseGold, numInBase);
                    var nm = numInBase + n;
                    var n = numInBase;
                    totalCost.gold = (Cnm * nm - Cn * n) / 2;

                    return totalCost;
                },
                takeOver: function(characterId, zoneId, liberation) {
                    var character = $rootScope.itemList[characterId];
                    var zone = $rootScope.itemList[zoneId];
                    var zoneLiege = $rootScope.itemList[zone.liege];
                    var ai, aichar, capital, liberator = false;

                    if (zone.liege == 'thePrincess' || zone.liege == 'theWarlord' || zone.liege == 'thePsychopath') {
                        var c = zoneLiege
                        var ai = zone.liege;
                        if (!c.recentlyLost) {
                            c.recentlyLost = [];
                        }
                        c.recentlyLost.unshift(zone.id);

                        if (c.recentlyLost.length > 4) {
                            c.recentlyLost.pop(); //remove the last one
                        }
                        if (zone.favour) {
                            zone.favour[zone.liege] = -20;
                        }

                        if (c.capital == zoneId) {
                            //is capital of an ai
                            for (var i = 0; i < $rootScope.zones.length; i++) {
                                var z = $rootScope.zones[i];
                                if (z.liege == zone.liege) {
                                    z.liege = z.originalLiege;
                                }
                            }

                            Engine.insert(20, 'loadImportantEvent', zone.liege + 'HasDied');
                        }
                        liberator = true;
                    }

                    if (zone.favour) {
                        if (liberator) {

                            var diffWithLastLiege = zone.favour[character.id] - zone.favour[zone.liege];

                            zone.favour[character.id] += 120 + diffWithLastLiege;
                        } else {
                            zone.favour[character.id] = 120;
                        }
                    }

                    if (!liberation) {
                        World.changeZoneLiege(zone.id, character.id);
                    } else {
                        World.changeZoneLiege(zone.id, zone.originalLiege);
                    }


                    if (ai) {

                        //redistribute forces
                        var aichar = $rootScope.itemList[ai];

                        var capital = $rootScope.fns.getCapital(ai);
                        $rootScope.fns.redistributeForces(ai, aichar, capital);
                    }

                },
                calcArcherStats: function() {
                    var archers = $rootScope.itemList.player.archers;
                    var baseStats = {
                        strength: 8,
                        defense: 3
                    }

                    archers.strength = baseStats.strength;
                    archers.defense = baseStats.defense;
                    if ($rootScope.itemList.bowyerWax.unlocked) {
                        archers.strength += 2;
                    }
                    if ($rootScope.itemList.bareBodkin.unlocked) {
                        archers.strength += 3;
                    }
                    if ($rootScope.itemList.specialSteel.unlocked) {
                        archers.strength += 4;
                    }

                    if ($rootScope.itemList.archerStakes.unlocked) {
                        archers.defense += 3;
                    }

                    if ($rootScope.itemList.artOfWar.unlocked) {
                        archers.defense += 2;
                        archers.strength += 4;
                    }

                    if ($rootScope.itemList.cometsBlaze.unlocked) {
                        archers.strength += 3;
                    }


                    if ($rootScope.itemList.blessingStinger.unlocked) {
                        archers.strength += 2;
                    }

                    if ($rootScope.itemList.blessingSwarm.unlocked) {
                        archers.defense += 2;
                    }

                    if ($rootScope.player.profession == 'commander') {
                        archers.strength += 6;
                        archers.defense += 5;
                    }
                },
                parseEffects: function(effects) {
                    var r = [];

                    for (var e in effects) {
                        var val = effects[e];
                        val = (val > 0 ? '+' : '') + val;

                        r.push($rootScope.fns.parseKeyWord(e) + ": " + val);

                    }

                    return r;
                },
                parseKeyWord: function(e) {
                    if (e === "attractiveness") {
                        return "Attractiveness";
                    } else if (e === "workers") {
                        return "Worker Capacity";
                    } else if (e === "capacity") {
                        return "Warehouse Capacity";
                    } else if (e === "crime") {
                        return "Crime"
                    } else if (e === "foodCapacity") {
                        return "Food Capacity";
                    } else if (e === "income") {
                        return "Monthly Income";
                    } else if (e === "budget") {
                        return "Monthly Cost";
                    } else if (e.substr(0, 3) === "max") {
                        var jobid = e.substr(3);
                        var job = $rootScope.itemList[jobid];
                        if (!job) {
                            console.log("invalid job, ", jobid)
                        } else {
                            return job.name + " slots";
                        }
                    }
                },
                calcWarriorStats: function() {
                    var warriors = $rootScope.itemList.player.warriors;
                    var baseStats = {
                        strength: 10,
                        defense: 7,
                    }

                    warriors.strength = baseStats.strength;
                    warriors.defense = baseStats.defense;

                    if ($rootScope.itemList.specialSteel.unlocked) {
                        warriors.strength += 3;
                        warriors.defense += 2;
                    }

                    if ($rootScope.itemList.plateMail.unlocked) {
                        warriors.defense += 3;
                    }

                    if ($rootScope.itemList.tempering.unlocked) {
                        warriors.strength += 3;
                    }

                    if ($rootScope.itemList.artOfWar.unlocked) {
                        warriors.defense += 2;
                        warriors.strength += 3;
                    }

                    if ($rootScope.itemList.cometsBlaze.unlocked) {
                        warriors.strength += 2;
                    }

                    if ($rootScope.itemList.blessingStinger.unlocked) {
                        warriors.strength += 2;
                    }

                    if ($rootScope.itemList.blessingSwarm.unlocked) {
                        warriors.defense += 2;
                    }

                    if ($rootScope.player.profession == 'commander') {
                        warriors.strength += 5;
                        warriors.defense += 5;
                    }

                },

                calcHuntingSpeed: function() {
                    var hunter = $rootScope.itemList.hunter;
                    hunter.maxStep = hunter.baseMaxStep;
                    if ($rootScope.itemList.huntingDogs.unlocked) {
                        hunter.maxStep -= ((hunter.baseMaxStep * .1) | 0);
                    }
                    if ($rootScope.itemList.huntingSeasons.unlocked && $rootScope.season.curSeason == 'Spring') {
                        hunter.maxStep = hunter.maxStep * 2;
                        //this gets reset when the season changes
                    }
                },
                getCapital: function(ai) {
                    var capital = $rootScope.itemList[$rootScope.itemList[ai].capital];
                    return capital;
                },
                getGoldValue: function(items) {
                    return Market.getGoldValue(items);
                },
                isWinter: function() {
                    return $rootScope.season.curSeason == 'Winter';
                },
                isSpring: function() {
                    return $rootScope.season.curSeason == 'Spring';
                },
                isSummer: function() {
                    return $rootScope.season.curSeason == 'Summer';
                },
                isAutumn: function() {
                    return $rootScope.season.curSeason == 'Summer';
                },
                notWinter: function() {
                    return $rootScope.season.curSeason != 'Winter';
                },
                notSpring: function() {
                    return $rootScope.season.curSeason != 'Spring';
                },
                notSummer: function() {
                    return $rootScope.season.curSeason != 'Summer';
                },
                notAutumn: function() {
                    return $rootScope.season.curSeason != 'Autumn';
                },
                growTrees: function(amt) {
                    Forest.increaseTrees(amt);
                    var player = $rootScope.player;
                    if (!player.treesPlanted) {
                        player.treesPlanted = 0;
                    }
                    player.treesPlanted += amt;
                },
                growCrops: function(amt) {
                    Field.increaseCrops(amt);
                },
                haslivestock: function() {
                    return $rootScope.world.field.curlivestock > 0;
                },
                livestockMinNumCheeseFarmer: function() {
                    return $rootScope.world.field.curlivestock >= $rootScope.itemList.cheeseFarmer.number;
                },
                stepsToDays: function(steps) {
                    return steps / $rootScope.STEPSPERDAY;
                },
                workersReturnFromAltona: function(amount) {
                    var msg = amount + ' workers have returned from Altona, healthy after being treated by Patricia';

                    $rootScope.world.home.workersAway -= amount;
                    $rootScope.world.home.jobs.bum.number += amount;

                    Engine.log(msg);
                    Engine.createNotification(msg);
                },
                eventStory: function(storyid) {
                    var s = $rootScope.story;
                    var cur = s[storyid];
                    if (!cur.completed && !cur.started) {
                        if (!$rootScope.world.home.people[cur.startNPCid] || !$rootScope.world.home.people[cur.startNPCid].fn === cur.fn) {
                            cur.canStart = true;
                            Home.insertPerson(cur.startNPCid, cur.fn);
                            Engine.createNotification(cur.notification, cur.startNPCid);
                        }
                    }
                },
                startMilontiTale: function() {
                    if ($rootScope.story.milontiTale.canStart) {
                        $location.path('/prosperity/milontiTale');
                        $rootScope.story.milontiTale.started = true;
                    }
                },
                eventJulietPursuit: function() {
                    $rootScope.story.julietPursuit.canStart = true;
                    //Home.insertPerson('juliet', 'startJulietPursuit'); //disabled until this feature is complete
                },
                startJulietPursuit: function() {
                    if ($rootScope.story.julietPursuit.canStart) {
                        $location.path('/prosperity/julietPursuit');
                        $rootScope.story.julietPursuit.started = true;
                    }
                },
                comesOfAge: function() {
                    Home.newWorkers(1);
                    $rootScope.world.home.nat.matThisYear++;
                    if (!$rootScope.importantEvent.firstComingOfAge.used) {
                        $rootScope.importantEvent.load('firstComingOfAge');
                    }
                    Engine.log('A child has come of age and ready to work');
                },
                retirement: function() {
                    var ret = Player.cullWorker();
                    $rootScope.world.home.nat.retThisYear++;
                    if (!$rootScope.importantEvent.firstRetirement.used) {
                        $rootScope.importantEvent.load('firstRetirement');
                    }
                    if (ret.id != 'bum') {
                        var msg = 'A ' + ret.name + ' has retired to spend their remaining days with family';
                        Engine.log(msg);

                    } else {
                        Engine.log('An unemployed worker has given up the search for work, is retiring to spend their remaining days with family');
                    }
                },
                killWorkerBecauseReason: function(jobid) {
                    var job = $rootScope.itemList[jobid];
                    if (job && job.number > 0) {
                        Player.cullWorker(jobid, 1, false);
                        var msg = "A " + job.name + " " + $rootScope.CAUSESOFDEATH[Math.floor(Math.random() * $rootScope.CAUSESOFDEATH.length)];
                        Engine.log(msg);
                        Engine.createNotification(msg, 'disease');
                    }

                },
                loadImportantEvent: function(importantEventId, params) {
                    var ie = $rootScope.importantEvent[importantEventId];
                    if (ie) {
                        ie.params = params; //set the params
                        $rootScope.importantEvent.load(importantEventId);
                    } else {
                        console.log('no importantEventId', importantEventId);
                    }
                },
                createNotif: function(params) {
                    Engine.insertNotificationBar(params.msg, params.icon);
                },
                processLoot: function(table, minDrops, maxDrops) {
                    var loot = {};
                    var arr = [];

                    var lootCount = 0;

                    //simple shuffling
                    for (var ind in table) {
                        if (Math.random() < 0.5) {
                            arr.push(table[ind]);
                        } else {
                            arr.shift(table[ind]);
                        }
                    }

                    var drops = ~~(Math.random() * (maxDrops - minDrops)) + minDrops;
                    var cycle = 0;
                    while (lootCount < drops && cycle < 10) {

                        for (var ind in arr) {
                            var item = arr[ind];
                            var key = item[0];
                            var rand = Math.random() - 0.1 * cycle;
                            if (rand < item[1] && !loot[key]) {
                                var variance = item[3];
                                var base = item[2];
                                loot[key] = ~~(Math.random() * (variance * 2)) + (base - variance);
                                lootCount++;
                            }

                        }
                        cycle++;
                    }
                    console.log(loot);
                    return loot;
                },
                eventWarlordCapturesPointAnne: function() {
                    var refugees = {
                        number: 14,
                        provisions: {
                            bread: 604,
                            cheese: 308,
                            fruit: 156,
                            wood: 355,
                            iron: 304,
                            fur: 646,
                            gold: 3891
                        },
                        from: $rootScope.itemList.pointAnne.name,
                        invadedBy: $rootScope.itemList.theWarlord.name
                    }
                    $rootScope.itemList.pointAnne.liege = 'theWarlord';
                    Engine.insert(3500, 'loadImportantEvent', ['refugees', refugees]);
                },
                eventWarlordAttacksRedWater: function() {
                    var refugees = {
                        number: 22,
                        provisions: {
                            bread: 888,
                            cheese: 640,
                            wood: 833,
                            gold: 4811,
                            fur: 899
                        },
                        from: $rootScope.itemList.redWater.name,
                        invadedBy: $rootScope.itemList.theWarlord.name
                    }
                    $rootScope.itemList.redWater.liege = 'theWarlord';
                    Engine.insert(2800, 'loadImportantEvent', ['refugees', refugees]);

                },
                eventWarlordAttacksTomiko: function() {
                    var refugees = {
                        number: 28,
                        provisions: {
                            bread: 778,
                            fish: 940,
                            wood: 333,
                            medicine: 21
                        },
                        from: $rootScope.itemList.tomiko.name,
                        invadedBy: $rootScope.itemList.theWarlord.name
                    }
                    $rootScope.itemList.tomiko.liege = 'theWarlord';
                    Engine.insert(2800, 'loadImportantEvent', ['refugees', refugees]);

                },
                eventWarlordAttacksSilverInslet: function() {
                    var refugees = {
                        number: 38,
                        provisions: {
                            fish: 840,
                            wood: 233,
                            fur: 1223,
                            armour: 33,
                            sword: 33,
                            gold: 6900
                        },
                        from: $rootScope.itemList.silverInslet.name,
                        invadedBy: $rootScope.itemList.theWarlord.name
                    }
                    $rootScope.itemList.silverInslet.liege = 'theWarlord';
                    Engine.insert(2800, 'loadImportantEvent', ['refugees', refugees]);

                },
                eventWarlordAttacksNephton: function() {
                    $rootScope.itemList.nephton.liege = 'theWarlord';
                    var refugees = {
                        number: 74,
                        provisions: {
                            bread: 1204,
                            meat: 980,
                            steel: 1000,
                            fur: 1646,
                            gold: 37891
                        },
                        from: $rootScope.itemList.nephton.name,
                        invadedBy: $rootScope.itemList.theWarlord.name
                    }
                    Engine.insert($rootScope.STEPSPERDAY, 'loadImportantEvent', ['warlordInvadedNephton']);
                    Engine.insert($rootScope.STEPSPERDAY * 14, 'loadImportantEvent', ['refugees', refugees]);
                },
                eventWarlordAttacksHornCastle: function() {
                    $rootScope.itemList.hornCastle.liege = 'thePsychopath';
                    $rootScope.itemList.hornCastle.warriors += $rootScope.itemList.hornCastle.numWorkers;
                    $rootScope.itemList.hornCastle.numWorkers = 1;
                    Engine.insert(1500, 'loadImportantEvent', ['announceThePsychopath']);
                },
                eventPsychoAttacksHighFalls: function() {
                    var refugees = {
                        number: 47,
                        provisions: {
                            bread: 1210,
                            cheese: 730,
                            fur: 338,
                            gold: 19018
                        },
                        from: $rootScope.itemList.highFalls.name,
                        invadedBy: $rootScope.itemList.thePsychopath.name
                    }

                    $rootScope.itemList.highFalls.liege = 'thePsychopath';
                    Engine.insert(1500, 'loadImportantEvent', ['refugees', refugees]);
                },
                eventPrincessCapturesKitsilano: function() {
                    Engine.insert(400, 'loadImportantEvent', ['princessCapturesKitsilano']);
                },
                eventPrincessCapturesAltona: function() {
                    Engine.insert(400, 'loadImportantEvent', ['princessCapturesAltona']);
                },
                eventHuntingRaid: function() {
                    $rootScope.importantEvent.load('huntingRaidNotification');
                },
                eventHuntingRaidReturn: function() {
                    //attacked a tribe;

                    var huntercasualties = ~~(Math.random() * 3);

                    Player.cullWorker($rootScope.itemList.hunter, huntercasualties);


                    //describes what could "drop": item:[% chance dropping, base amount, variance]
                    var lootTable = [
                        ['wood', 0.5, 80, 10],
                        ['fur', 0.5, 60, 5],
                        ['meat', 0.8, 400, 80],
                        ['herb', 0.3, 100, 20],
                        ['medicine', 0.25, 10, 5],
                        ['vegetable', 0.4, 200, 30],
                        ['fruit', 0.2, 400, 60],
                        ['gold', 0.8, 800, 300]
                    ];


                    var loot = $rootScope.fns.processLoot(lootTable, 2, 5); //lootTable, min different items, max diff items

                    Player.insertInventory(loot);
                    var msg = 'Your hunters return from the raid, bringing back ' + $rootScope.fns.listGoods(loot) + '. ';
                    if (huntercasualties > 0) {
                        msg += huntercasualties + ' hunters died during the raid however';
                    } else {
                        msg += 'Your hunters did not sustain any casualties.';
                    }
                    Engine.log(msg);
                },
                eventHuntingOfferReturn: function() {
                    //offer money to the tribe

                    var newPeopleCount = 0;

                    var likelihood = 1;

                    while (likelihood > 0) {
                        var rand = Math.random();
                        if (rand / 2 < likelihood) {
                            Home.newWorkers(1);
                            newPeopleCount++;

                        }

                        likelihood -= rand / 2;
                    }

                    var msg = 'Your hunters return from the raid, bringing back ' + newPeopleCount + ' workers';
                    Engine.log(msg);
                },
                eventMineBuilder: function() {
                    $rootScope.events.mineBuilder();
                },
                eventMineExpander: function() {
                    $rootScope.events.mineExpander();
                },
                eventHouseBuilder: function(company) {
                    $rootScope.events.houseBuilder(company);
                },
                eventGoodsBuyer: function() {
                    $rootScope.events.goodsBuyer();
                },
                eventGoodsSeller: function() {
                    $rootScope.events.goodsSeller();
                },
                eventMarbleSeller: function() {
                    $rootScope.events.marbleSeller();
                },
                eventWanderer: function() {
                    $rootScope.events.wanderer();
                },
                eventFoundField: function() {
                    $rootScope.events.foundField();
                },
                eventNewPeople: function() {
                    $rootScope.events.newPeople();
                },
                eventMasterBuilder: function() {
                    $rootScope.events.masterBuilder();
                },
                eventBanditRaidBegin: function() {
                    var place = $rootScope.itemList.homeZone;

                    var bandits = {
                        liege: 'bandits',
                        name: 'Bandits',
                        warriors: {
                            number: ~~($rootScope.world.home.level.curWorkers / 10 + Math.random() * 10),
                            strength: 10,
                            defense: 5
                        },
                        archers: {
                            number: ~~($rootScope.world.home.level.curWorkers / 30 + Math.random() * 4),
                            strength: 8,
                            defense: 2
                        }
                    }

                    var battle = {
                        zone: place,
                        opponent: bandits,
                        player: null, //to be populated when battle starts
                        status: 0,
                        started: $rootScope.engine.curStep, //good for tracking
                        curStep: 0,
                        timer: null, //the timer promise
                    };
                },
                eventTravellingPhysician: function() {
                    $rootScope.events.travellingPhysician();
                },
                eventUnlockBeeKeeping: function() {
                    $rootScope.importantEvent.load('unlockBeeKeeping');
                },
                eventWolfRaidAttack: function(battleid) {
                    var battle = null;
                    angular.forEach($rootScope.battles, function(b, ind) {
                        if (b.id == battleid) {
                            battle = b;
                        }
                    });
                    if (battle) {
                        Engine.log('Wolves are attacking ' + battle.place.name);
                        Battle.start(battle);
                    } else {
                        console.log('battleid ' + battleid + ' not found in');
                        console.log($rootScope.battles);
                    }
                    $rootScope.events.wolfAttacks++;
                },
                contractGoodsBuyerComplete: function(contractid) {
                    var contract = Home.getContract(contractid);
                    if (contract) {
                        Player.pay(contract.cost);
                        Player.insertInventory(contract.reward);
                        $rootScope.player.events.goodsContractsCompleted++;
                        $rootScope.itemList.sector_civil.exp += Math.min($rootScope.player.events.goodsContractsCompleted * 10, 100);
                    } else {
                        console.log('no such contract: ' + contractid);
                        console.log($rootScope.world.home.contractQueue);
                    }
                },
                contractGoodsSellerComplete: function(contractid) {
                    var contract = Home.getContract(contractid);
                    if (contract) {
                        Player.pay(contract.cost);
                        Player.insertInventory(contract.reward);

                        $rootScope.player.events.goodsContractsCompleted++;
                        $rootScope.itemList.sector_civil.exp += Math.min($rootScope.player.events.goodsContractsCompleted * 10, 100);
                    } else {
                        console.log('no such contract: ' + contractid);
                        console.log($rootScope.world.home.contractQueue);
                    }
                },
                noop: function() {
                    //do nothing
                },
                contractMarbleSellerComplete: function(contractid) {
                    var contract = Home.getContract(contractid);
                    if (contract) {
                        Player.pay(contract.cost);
                        Player.insertInventory(contract.reward);
                        Engine.insert(Math.round(Math.random() * $rootScope.STEPSPERDAY * 50), 'eventMarbleSeller', null, true);
                    }
                },
                contractMarbleSellerExpire: function(contractid) {
                    Engine.insert(Math.round(Math.random() * $rootScope.STEPSPERDAY * 60), 'eventMarbleSeller', null, true);
                },
                contractMarbleSellerReject: function(contractid) {
                    Engine.insert(Math.round(Math.random() * $rootScope.STEPSPERDAY * 50), 'eventMarbleSeller', null, true);
                },
                contractXimniTraderComplete: function(contractid) {
                    var contract = Home.getContract(contractid);
                    if (contract) {
                        Player.pay(contract.cost);
                        Player.insertInventory(contract.reward);
                        $rootScope.player.events.ximniTradeCount++;
                        if ($rootScope.player.events.ximniTradeCount > 10 && !$rootScope.player.events.ximniTale) {

                            //insert Ximni as an NPC, Ximni is no longer trading.
                            $rootScope.player.events.ximniTale = 1;
                            var msg = "Ximni has requested a private audience with you";
                            Engine.log(msg);
                            Engine.createNotification(msg, 'storyline');
                            Home.insertPerson('ximni', 'loadImportantEvent', 'ximniTale');
                        } else {
                            Engine.insert($rootScope.STEPSPERDAY * 15, 'eventXimniTrader', null, true);
                        }

                    } else {
                        console.log('no such contract: ' + contractid);
                        console.log($rootScope.world.home.contractQueue);
                    }
                },
                contractXimniTraderIncomplete: function(contractid) {
                    Engine.insert($rootScope.STEPSPERDAY * 15, 'eventXimniTrader', null, true);
                },
                contractMercenaryComplete: function(contractid) {
                    var contract = Home.getContract(contractid);
                    if (contract) {
                        Player.pay(contract.cost);
                        $rootScope.itemList.homeZone.warriors += contract.warrior;
                        $rootScope.itemList.homeZone.archers += contract.archer;

                    } else {
                        console.log('no such contract: ' + contractid);
                        console.log($rootScope.world.home.contractQueue);
                    }

                    Engine.insert(20000, 'eventMercenariesForHire', null, true);
                },
                contractMercenaryExpire: function(contractid) {
                    Engine.insert(20000, 'eventMercenariesForHire', null, true);
                },
                contractMineBuilderComplete: function(contractid) {
                    var contract = Home.getContract(contractid);
                    if (contract) {
                        Player.pay(contract.cost);
                        Player.unlock(['mine']);
                        $rootScope.fns.calcSpaceAvailable();
                        Home.build('miningCamp');
                    } else {
                        console.log('contract does not exist: ' + contractid);
                    }
                },
                contractMineBuilderExpire: function() {
                    Engine.insert(3000, 'eventMineBuilder');
                },
                contractMineBuilderReject: function() {
                    Engine.insert(3000, 'eventMineBuilder');
                },

                contractMineExpanderComplete: function(contractid) {
                    var contract = Home.getContract(contractid);
                    if (contract) {
                        Player.pay(contract.cost);
                        var amt = Math.max(Math.round(12000 - Math.random() * 8500), 0);

                        var siteSize = Math.round(Math.random() * 200 + 300);

                        Mine.increaseOres(amt);
                        var msg = 'The mine expansion uncovered ' + amt + ' ores for mining. In the process, ' + siteSize + ' units of Field Space was destroyed for the mine';
                        Engine.log(msg);
                        Engine.createNotification(msg);
                        $rootScope.player.landConversions.fieldSpace += siteSize;
                        $rootScope.fns.calcSpaceAvailable();
                        $rootScope.fns.calcSpaceUsed();
                    } else {
                        console.log('contract does not exist: ' + contractid);
                    }
                },
                warehouseFull: function() {
                    Engine.log('The warehouse is full');
                    Engine.insert(1000, 'removeWarehouseFullFlag');
                },
                removeWarehouseFullFlag: function() {
                    $rootScope.world.home.warehouseFull = false;
                },
                eventMercenariesForHire: function() {
                    //kicks off the mercenary hiring.
                    $rootScope.events.mercenaryForHire();
                    $rootScope.player.mercsStarted = true;
                },
                eventPrincessBeeKeeper: function() {
                    if (!$rootScope.importantEvent.eventPrincessBeeKeeper.used) {
                        $rootScope.importantEvent.load('eventPrincessBeeKeeper');
                    }

                },
                eventAbbyAsksBees: function() {
                    if (!$rootScope.importantEvent.beekeepers.used) {
                        $rootScope.importantEvent.load('beekeepers');
                    }
                },
                eventAbbyAsksWinter: function() {
                    if (!$rootScope.importantEvent.firstWinter.used) {
                        $rootScope.importantEvent.load('firstWinter');
                    }
                },
                eventPlague: function() {
                    var home = $rootScope.world.home;
                    home.diseased = true;
                    if (home.infected > 0) {
                        home.infected *= 3;
                        if (home.infected > home.curWorkers) {
                            home.infected = home.curWorkers;
                        }
                    } else {
                        home.infected = Math.floor(home.curWorkers / 2);
                        home.consecutiveDiseased = 0;
                    }
                    var msg = 'The Plague has struck, people are falling ill left and right';
                    Engine.log(msg);
                    Engine.createNotification(msg, 'illness');
                    home.plagueCount++;
                },
                eventXimniTrader: function() {
                    $rootScope.events.ximniTrader();
                },
                collapseBuilding: function(buildingid) {
                    var building = $rootScope.itemList[buildingid];
                    if (building && building.type == 'building') {
                        building.created--;
                        Home.buildingChanged(building);
                    }
                },
                buildingNeedsRepair: function(buildingId) {
                    var building = $rootScope.itemList[buildingId];

                    if (building && building.type === 'building' && building.created > 0) {
                        //add this building to the project queue as a repair item
                        var repairProjCost = jQuery.extend({}, building.cost);
                        angular.forEach(repairProjCost, function(val, key) {
                            if (key === 'granite' && $rootScope.itemList.graniteRecycling.unlocked) {
                                repairProjCost[key] = Math.ceil(val / 24);
                            } else if (key === 'marble' && $rootScope.itemList.marbleRecycling.unlocked) {
                                repairProjCost[key] = Math.ceil(val / 24);
                            } else {
                                repairProjCost[key] = Math.ceil(val / 6);
                            }
                        });
                        $rootScope.world.home.projectQueue.push({
                            buildingId: buildingId,
                            curProgress: 0,
                            maxProgress: building.maxProgress / 8,
                            builders: building.builders || 0,
                            removable: false,
                            progressPct: 0,
                            buildersWorking: 0,
                            type: 'repair',
                            cost: repairProjCost
                        });
                    }
                },
                isMineDamaged: function() {
                    return $rootScope.world.mine.damaged == 0;
                },
                endGame: function(how) {
                    Player.endGame(how);
                },
                triggerImportantEvent: function(eventid) {
                    if (!$rootScope.importantEvent[eventid].used) {
                        $rootScope.importantEvent.load(eventid);
                    }
                },
                destroyBuilding: function(buildingid) {
                    Home.destroy(buildingid);
                },
                pubBuild: function() {
                    Player.unlock('pub');
                },

                listGoods: function(goods) {
                    //returns a string of the goods listed out
                    var items = [];
                    if (goods) {
                        angular.forEach(goods, function(amount, itemId) {
                            if (itemId == 'gold') {
                                items.push(Market.convertToCurrency(amount, true));
                            } else {
                                if ($rootScope.itemList[itemId]) {
                                    items.push(amount + " " + $rootScope.itemList[itemId].name);
                                }
                            }
                        });
                    }

                    if (items.length == 0) {
                        return "absolutely nothing";
                    } else {
                        return items.join(", ");
                    }
                },
                convertToCurrency: function(x, y, z) {
                    return Market.convertToCurrency(x, y, z);
                },
                setCaravanReady: function() {
                    $rootScope.world.home.caravan.ready = true;
                },
                caravanReturns: function() {
                    var caravan = $rootScope.world.home.caravan;
                    //checkCaravan is called when the market is first loaded up *just in case*
                    if (Object.keys(caravan.recGoods).length > 0) {
                        var msg = 'Your caravan has returned, bringing back: ';

                        msg += $rootScope.fns.listGoods(caravan.recGoods);

                        if (Player.hasCapacityFor(caravan.recGoods)) {
                            Player.insertInventory(caravan.recGoods);

                            caravan.ready = true;
                            caravan.waitForUnload = false;

                            caravan.recGoods = {};
                        } else {
                            msg += ' You do not have enough space for your goods, the caravan cannot unload until you have space for everything.'
                            caravan.waitForUnload = true;
                            caravan.ready = false;
                        }

                        Engine.createNotification(msg);
                        Engine.log(msg);

                        $rootScope.world.home.caravan.buy = {};
                        $rootScope.world.home.caravan.sell = {};
                    }

                },
                caravanUnload: function() {
                    var msg = "";
                    var caravan = $rootScope.world.home.caravan;

                    if (Player.hasCapacityFor(caravan.recGoods)) {
                        Player.insertInventory(caravan.recGoods);
                        msg += 'Caravan unloaded successfully, and is ready now';
                        caravan.waitForUnload = false;
                        caravan.ready = true;
                        caravan.recGoods = {};
                    } else {
                        caravan.waitForUnload = true;
                        msg += 'Caravan did not unload, there is not enough space';
                    }
                    caravan.message = msg;
                    Engine.log(msg);
                    Engine.createNotification(msg, 'caravanUnload');
                },
                /*processZone: function(zoneId, period) {
                    World.processZone(zoneId);
                    Engine.insert(period, 'processZone', [zoneId, period]);
                },*/
                processAI: function(ai, period) {
                    World.processAI(ai);
                    Engine.insert(period, 'processAI', [ai, period]);
                },
                gatherTributes: function() {
                    World.gatherTributes();
                    var month = $rootScope.STEPSPERDAY * 30;
                },
                hasField: function() {
                    return $rootScope.world.field.unlocked;
                },
                hasMine: function() {
                    return $rootScope.world.mine.unlocked;
                },
                hasMarket: function() {
                    return $rootScope.world.market.unlocked;
                },
                hasMilitaryCouncil: function() {
                    return $rootScope.world.militaryCouncil.unlocked;
                },
                hasPub: function() {
                    return $rootScope.world.pub.unlocked;
                },
                hasHerbalistShop: function() {
                    return $rootScope.itemList.created > 0;
                },
                redistributeForces: function(ai) {
                    var character = $rootScope.itemList[ai];
                    var capital = $rootScope.fns.getCapital(ai);

                    World.redistributeForces(ai, character, capital);
                },
                warningAIAttacking: function(ai) {
                    $rootScope.importantEvent.warningAIAttacking.params = {
                        attackingAI: ai
                    }
                    $rootScope.importantEvent.load('warningAIAttacking');
                },
                dangerAIAttacking: function(ai) {
                    $rootScope.importantEvent.dangerAIAttacking.params = {
                        attackingAI: ai
                    }
                    $rootScope.importantEvent.load('dangerAIAttacking');
                },
                AIISAttacking: function(ai) {
                    $rootScope.importantEvent.AIISAttacking.params = {
                        attackingAI: ai
                    }
                    $rootScope.importantEvent.load('AIIsAttacking');
                },
                updateMilitaryRating: function(zoneId) {
                    World.calcMilitaryRating(zoneId);
                },
                startBattle: function(ai, target_id) {
                    //this is specifically an AI attacking the player.
                    //the ai will be using forces from their capital.

                    var target = $rootScope.itemList[target_id];

                    $rootScope.attackingAI = ai;
                    var character = $rootScope.itemList[ai];
                    var capital = $rootScope.fns.getCapital(character.id);
                    var invasion = {
                        liege: character,
                        invasion: {
                            archers: capital.archers,
                            warriors: capital.warriors
                        }
                    }

                    //maybe change this up per AI by situation... later

                    capital.warriors = 0;
                    capital.archers = 0;

                    Battle.create(target, invasion);
                },
                banditAttack: function() {
                    var target = $rootScope.itemList.homeZone;
                    if ($rootScope.itemList.fletcherWorkshop.created > 0) {
                        var archerNum = ~~(Math.random() * 25);
                    }

                    var warriorNum = ~~(Math.random() * 25 + 7);

                    var invasion = {
                        liege: 'bandits',
                        invasion: {
                            archers: archerNum,
                            warriors: warriorNum,
                        }
                    }

                    Battle.create(target, invasion);
                },
                toStringT: function(x, n, b) {
                    var s = x.toString(b);
                    if (x % 1 === 0) {
                        return s
                    } else {
                        return s.substr(0, s.indexOf('.') + n + 1);
                    }
                },
                addQuest: function(quest) {
                    Player.addQuest(quest);
                },
                createQuest: function(quest) {
                    quest.id = Home.getUniqueContractId();
                    $rootScope.fns.addQuest(quest);
                    return quest.id;
                },
                removeQuest: function(questid) {
                    var quest;
                    var index;
                    for (var i = 0; i < $rootScope.player.quests.length; i++) {
                        var q = $rootScope.player.quests[i];
                        if (q.id == questid) {
                            quest = q;
                            var index = i;
                        }
                    }
                    if (!isNaN(index)) {
                        $rootScope.player.quests.splice(index, 1);
                        $rootScope.itemList[quest.from].curQuest = null;
                    }
                },
                dayFromStep: function(step) {
                    return Math.ceil(step / $rootScope.STEPSPERDAY);
                },
                moonFromDay: function(day) {
                    return Math.ceil(dayFromStep / 30);
                },
                dateFromDay: function(day) {
                    var m = $rootScope.fns.moonFromDay(day);
                    var d = d - m * 30 + 1
                    return {
                        moon: m,
                        day: d
                    }
                },
                calcCaravanCapacity: function() {
                    var caravan = $rootScope.world.home.caravan;

                    caravan.capacity = $rootScope.BASECARAVANCAPACITY;
                    if ($rootScope.itemList.caravanCapacity1.unlocked) {
                        caravan.capacity *= 1.5;
                    }
                    if ($rootScope.itemList.doubleCarriage.unlocked) {
                        caravan.capacity *= 2;
                    }

                },
                convertSpace: function(spaceType, amt) {
                    $rootScope.player.landConversions[spaceType] += amt;
                    $rootScope.fns.calcSpaceAvailable();
                    $rootScope.fns.calcSpaceUsed();
                },
                calcSpaceAvailable: function() {
                    $rootScope.area = {
                        citySpace: Math.round(140 + Math.pow(2.2, $rootScope.world.home.level) * 700 + ($rootScope.player.events.fishingCommunityHelpSuccess ? 1200 : 0)),
                        fieldSpace: Math.round(450 + Math.pow(2, $rootScope.world.home.level) * 1200),
                        riverSpace: $rootScope.player.events.fishingCommunityHelpSuccess ? $rootScope.world.home.level * 500 + 2000 : 0,
                        forestSpace: Math.round(28000 + Math.pow(1.6, $rootScope.world.home.level) * 5000),
                        mineSpace: $rootScope.itemList.mine.unlocked ? (1000 + $rootScope.world.home.level * 800) : 0,
                        otherSpace: 1200 + $rootScope.world.home.level * 480
                    }

                    if ($rootScope.world.home.level >= 4) {
                        //adjustments specifically for town and above
                        $rootScope.area.citySpace += 3500;
                        $rootScope.area.fieldSpace += 5800;

                        if ($rootScope.world.home.level >= 4 && $rootScope.player.events.landClearance) {
                            $rootScope.area.citySpace += 3000;
                            $rootScope.area.otherSpace += 550;
                            $rootScope.area.fieldSpace += 7000;
                        }

                        if ($rootScope.world.home.level >= 4 && $rootScope.itemList.landManagement.unlocked) {
                            var landManagement = $rootScope.itemList.landManagement;
                            $rootScope.area.citySpace += landManagement.converted.citySpace;
                            $rootScope.area.fieldSpace += landManagement.converted.fieldSpace;
                            $rootScope.area.forestSpace += landManagement.converted.forestSpace;

                            $rootScope.area.citySpace -= landManagement.cleared.citySpace;
                            $rootScope.area.fieldSpace -= landManagement.cleared.fieldSpace;
                            $rootScope.area.forestSpace -= landManagement.cleared.forestSpace;
                        }

                    }


                },
                calcSpaceUsed: function(type) {
                    if (!$rootScope.area) {
                        $rootScope.fns.calcSpaceAvailable();
                    }


                    if (!$rootScope.used) {
                        $rootScope.used = {
                            citySpace: 0,
                            fieldSpace: 0,
                            riverSpace: 0,
                            forestSpace: 0,
                            mineSpace: 0,
                            otherSpace: 0
                        }
                    }

                    if (type) {
                        var spaceTaken = 0;
                        for (var buildingid in root.world.home.buildings) {
                            var building = root.world.home.buildings[buildingid];

                            if (building[type]) {
                                spaceTaken += building.created * building[type];
                            }
                        }

                        if (type === 'forestSpace') {
                            spaceTaken += $rootScope.world.forest.curTrees;
                        }

                        $rootScope.used[type] = Math.round(spaceTaken);
                        return spaceTaken;
                    } else {
                        $rootScope.fns.calcSpaceUsed('citySpace');
                        $rootScope.fns.calcSpaceUsed('forestSpace');
                        $rootScope.fns.calcSpaceUsed('fieldSpace');
                        $rootScope.fns.calcSpaceUsed('mineSpace');
                        $rootScope.fns.calcSpaceUsed('otherSpace');
                        $rootScope.fns.calcSpaceUsed('forestSpace');
                    }
                },
                increaseFavour: function(from, to, amount) {

                    $rootScope.itemList[from].favour[to] += amount;

                    $rootScope.fns.fixFavourLimits($rootScope.itemList[from]);
                },
                fixFavourLimits: function(zone) {
                    for (var i in zone.favour) {
                        if (zone.favour[i] > 300) {
                            zone.favour[i] = 300;
                        } else if (zone.favour[i] < -300) {
                            zone.favour[i] = -300
                        }
                    }
                },
                procLoot: function(lootTable, times) {
                    if (!times) {
                        times = 1;
                    }

                    var loot = {}
                    for (var x = 0; x < times; x++) {
                        for (var id in lootTable) {
                            var s = lootTable[id];
                            if (Math.random() < s[0]) {
                                if (!loot[id]) {
                                    loot[id] = 0;
                                }
                                loot[id] += Math.ceil(Math.random() * (s[2] - s[1]) + s[1]);
                            }
                        }
                    }

                    return loot;
                },
                pickOne: function(arr) {
                    if (arr.length > 0) {
                        return arr[Math.floor(Math.random() * arr.length)]
                    } else {
                        return null;
                    }
                },
                getScholarLevelCap: function(level) {
                    return Math.round(300 * Math.pow(1.25, level));
                },
                nameUsed: function(name) {
                    var found = false;
                    angular.forEach($rootScope.buildings, function(building) {
                        if (building.instances && !found) {
                            for (var i = 0; i < building.instances.length; i++) {
                                var _b = building.instances[i];
                                if (_b.name === name) {
                                    found = true;
                                }
                            }
                        }
                    });
                    return found;
                },
                genName: function(building) {
                    var lnames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Garcia', 'Rodriguez',
                        'Wilson', 'Martinez', 'Anderson', 'Taylor', 'Thomas', 'Hernandez', 'Moore', 'Martin', 'Jackson', 'Thompson',
                        'White', 'Lopez', 'Lee', 'Gonzalez', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Perez', 'Hall', 'Young',
                        'Allen', 'Sanchez', 'Wright', 'King', 'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Ramirez', 'Campbell',
                        'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Torres', 'Parker', 'Collins', 'Edwards',
                        'Stewart', 'Flores', 'Morris', 'Nguyen', 'Murphy', 'Rivera', 'Cook', 'Rogers', 'Morgan', 'Peterson', 'Cooper',
                        'Reed', 'Baily', 'Bell', 'Gomez', 'Kelly', 'Howard', 'Ward', 'Cox', 'Diaz', 'Dong', 'Richardson', 'Wood', 'Watson',
                        'Brooks', 'Bennett', 'Gray', 'James', 'Reyes', 'Cruz', 'Maximus', 'Kitty', 'Pryce', 'Draper', 'Sterling', 'Myers',
                        'Bryers', 'Jordan', 'Letterman', 'Colbert', 'Peters', 'Marshall', 'Mozart', 'Potter', 'Weasely', 'Malfoy', 'Granger',
                        'Lovegood', 'Longbottom', 'Diggory', 'Dursley', 'You Know Who', 'Lannister', 'Stark', 'Bolton', 'Baratheon', 'Umber',
                        'Targaryen', 'Tully', 'Redwyne', 'Florent', 'Marsh', 'Cassel', 'Forrester', 'Brownbarrow', 'Degore', 'Grayson', 'Bagman',
                        'Bagshot', 'Binns', 'Black', 'Burbage', 'Bryce', 'Carrow', 'Cattermole', 'Chang', 'Corner', 'Crabbe', 'Creevey', 'Crouch',
                        'Delacour', 'Diggle', 'Doge', 'Dolohov', 'Dumbledore', 'Bones', 'Boot', 'Edgecombe', 'Figg', 'Finch', 'Finnigan', 'Flint',
                        'Flamel', 'Fletcher', 'Flitwick', 'Fudge', 'Gaunt', 'Goldstein', 'Greyback', 'Grindelwald', 'Hooch', 'Hagrid', 'Hopkirk',
                        'Jorkins', 'Karkaroff', 'Krum', 'Lestrange', 'Lockhart', 'Lupin', 'Macnair', 'Maxime', 'Macmillan', 'McGonagall', 'Moody', 'Ollivander',
                        'Parkinson', 'Patil', 'Pettigrew', 'Peverell', 'Snow', 'Pomfrey', 'Podmore', 'Quirrell', 'Riddle', 'Runcorn', 'Robins', 'Rookwood', 'Scamander',
                        'Scrimgeour', 'Shacklebolt', 'Skeeter', 'Sinistra', 'Shunpike', 'Slughorn', 'Spinnet', 'Sprout', 'Snape', 'Tonks', 'Thicknesse', 'Trelawney',
                        'Vance', 'Umbridge', 'Vane', 'Vector', 'Zabini'
                    ];

                    var adjs = ['Awesome', 'Sturdy', 'Trusty', 'Shabby', 'Alright', 'Fair', 'Rickety', 'Hazardous', 'Crappy', 'Dusty', 'Fancy'];

                    var randname;
                    var tried = 0,
                        total = lnames.length * adjs.length;
                    do {
                        randname = $rootScope.fns.pickOne(lnames) + "'s " + $rootScope.fns.pickOne(adjs) + " " + building.name;
                        tried++;
                    } while ($rootScope.fns.nameUsed(randname) && tried < total);

                    return randname;

                },
                changeSeason: function(lastSeason, curSeason) {
                    var Season = $rootScope.season;
                    Season.curSeason = curSeason;

                    switch (curSeason) {
                        case 'Summer':
                            if ($rootScope.itemList.huntingSeasons.unlocked) {
                                $rootScope.fns.calcHuntingSpeed();
                            }

                            if (!$rootScope.player.settings.doNotExplainSummer) {
                                $rootScope.importantEvent.load('explainSummer');
                            }
                            break;
                        case 'Autumn':
                            if (!$rootScope.player.settings.doNotExplainAutumn) {
                                $rootScope.importantEvent.load('explainAutumn');
                            }

                            break;
                        case 'Winter':
                            if (!$rootScope.player.settings.doNotExplainWinter) {
                                $rootScope.importantEvent.load('explainWinter');
                            }
                            break;
                        case 'Spring':
                            if ($rootScope.itemList.huntingSeasons.unlocked) {
                                $rootScope.fns.calcHuntingSpeed();
                            }

                            if (!$rootScope.player.settings.doNotExplainSpring) {
                                $rootScope.importantEvent.load('explainSpring');
                            }
                            break;
                    }
                },
                procAccident: function() {
                    var _jobs = [];
                    angular.forEach($rootScope.world.home.jobs, function(o) {
                        if (o.number > 0) {
                            _jobs.push(o);
                        }
                    });
                    var _j = _jobs[Math.floor(Math.random() * _jobs.length)];
                    if ($rootScope.itemList.hospital.instances.length > 0 && $rootScope.itemList.nurse.number > 0) {
                        if (Math.random() > $rootScope.itemList.nurse.number * 30 / $rootScope.world.home.curWorkers) {
                            $rootScope.fns.killWorkerBecauseReason(_j.id);
                        }
                    } else {
                        if (Math.random() < 0.5) {
                            $rootScope.fns.killWorkerBecauseReason(_j.id);
                        }
                    }
                }
            }

            $rootScope.callFn = function(fn, params) { //specifically for use with $rootScpe.fns so that the right function is called
                if ($rootScope.fns[fn]) {

                    if (!Array.isArray(params)) {
                        params = [params];
                    }
                    $rootScope.fns[fn].apply($rootScope, params);

                } else {
                    console.log('bad fn or params: ', fn, params);
                }
            }

            $rootScope.recursiveMerge = function(newData, oldObj, overwrite) {
                if (typeof newData == 'object' || typeof newData == 'function') {
                    for (var i in newData) {
                        if (oldObj[i]) {
                            $rootScope.recursiveMerge(newData[i], oldObj[i], overwrite);
                        } else {
                            if (overwrite) {
                                oldObj[i] = newData[i];
                            } else {
                                if (oldObj[i] == undefined) {
                                    oldObj[i] = newData[i];
                                }
                            }
                        }
                    }
                } else {
                    oldObj = newData;
                }
            }

            $rootScope.evalPreconditions = function(precondArr) {
                var ret = true;
                angular.forEach(precondArr, function(fn) {
                    if ($rootScope.fns[fn]) {
                        ret = (ret && $rootScope.fns[fn].call());
                    } else {
                        console.log('fn not present: ' + fn);
                    }

                });
                return ret;
            }

            function buildZones() {

                $rootScope.zones = []; //an array of zones in the world, including the player's town, field, mine, and forest

                angular.forEach($rootScope.itemList, function(item, zoneid) {
                    if (item.type == 'zone') {
                        $rootScope.zones.push(item);
                        if (!item.warriors) {
                            item.warriors = 0;
                        }
                        if (!item.archers) {
                            item.archers = 0;
                        }
                        if (!item.liege) {
                            item.liege = item.originalLiege;
                            if (item.id == 'dickinsonLanding') {
                                item.liege = 'theWarlord'
                            } else if (item.id == 'castleGrey') {
                                item.liege = 'thePrincess'
                            }
                        }
                        if (!item.knownWarriorNum) {
                            item.knownWarriorNum = 'Unknown';
                        }
                        if (!item.knownArcherNum) {
                            item.knownArcherNum = 'Unknown';
                        }

                        if (!item.resources) {
                            item.resources = {}; //pooled resources for tribute to the liege. mostly gold and any special resources
                        }

                        if (!item.favour && zoneid != 'homeZone') {
                            item.favour = {
                                'theWarlord': 0,
                                'thePrincess': 0,
                                'thePsychopath': 0,
                                'player': 0
                            }
                        }

                        //town picture
                        switch (zoneid) {
                            case 'burwash':
                            case 'altona':
                            case 'tomiko':
                            case 'kitsilano':
                                item.img = 'town';
                                item.warriorGrowth = 0.65;
                                item.archerGrowth = 0.3;
                                item.targetWorkerNum = 3000;
                                break;
                            case 'madawaska':
                            case 'redWater':
                                item.warriorGrowth = 0.4;
                                item.archerGrowth = 0.5;
                                item.img = 'town2';
                                item.targetWorkerNum = 2800
                                break;
                            case 'homeZone':
                                if ($rootScope.world.home.level < 3) {
                                    item.img = 'playerVillage';
                                } else {
                                    item.img = 'playerTown';
                                }
                                break;
                            case 'dartmoor':
                            case 'highFalls':
                            case 'stirton':
                            case 'millBridge':
                            case 'corbyville':
                            case 'ruggedRapids':
                            case 'nephton':
                            case 'winisk':
                                item.img = 'playerSettlement';
                                item.warriorGrowth = 0.3;
                                item.archerGrowth = 0.4;
                                item.targetWorkerNum = 980;
                                break;
                            case 'castleGrey':
                                item.img = 'castle';
                                item.warriorGrowth = 3;
                                item.archerGrowth = 4;
                                item.targetWorkerNum = 6000;
                                break;
                            case 'silverInslet':
                            case 'lemieux':
                            case 'falkenburg':
                            case 'pointAnne':
                                item.img = 'keep';
                                item.warriorGrowth = 2;
                                item.archerGrowth = 2;
                                item.targetWorkerNum = 4000;
                                break;
                            case 'hornCastle':
                                item.img = 'fortress';
                                item.warriorGrowth = 6;
                                item.archerGrowth = 0.2;
                                item.targetWorkerNum = 5000;
                                break;
                            case 'dickinsonLanding':
                                item.img = 'citadel';
                                item.warriorGrowth = 4;
                                item.archerGrowth = 3;
                                item.targetWorkerNum = 7000;
                                break;
                        }

                        var bg = 'url(\'images/map/' + (item.img ? item.img : item.id) + '.png\')';
                        item.style = {
                            'background-image': bg,
                            'left': item.coordinates[0],
                            'top': item.coordinates[1]
                        }

                        if (item.policy === undefined || item.policy === null || item.policy < 0 || item.policy > 2) {
                            //town growth policy
                            switch (zoneid) {
                                //towns:
                                case 'burwash':
                                case 'altona':
                                case 'tomiko':
                                    //villages:
                                    item.policy = 1;
                                    break;
                                case 'madawaska':
                                case 'redWater':
                                    item.policy = 2;
                                    break;
                                case 'dartmoor':
                                case 'highFalls':
                                case 'stirton':
                                case 'kitsilano':
                                case 'millBridge':
                                case 'corbyville':
                                case 'ruggedRapids':
                                case 'nephton':
                                case 'winisk':
                                    item.policy = 1;
                                    break;
                                case 'castleGrey':
                                case 'lemieux':
                                case 'falkenburg':
                                case 'pointAnne':
                                case 'silverInslet':
                                case 'hornCastle':
                                case 'dickinsonLanding':
                                    item.policy = 2;
                                    break;
                            }
                        }
                    }
                });

                function addNeighbours(zone1, zones) {
                    if (typeof zone1 == 'string') {
                        zone1 = $rootScope.itemList[zone1];
                    }
                    if (zones.length > 0) {
                        for (var i = 0; i < zones.length; i++) {
                            var zone2 = zones[i];
                            if (typeof zone2 == 'string') {
                                zone2 = $rootScope.itemList[zone2];
                            }
                            if (zone1 && zone2 && zone1.id != zone2.id) {
                                if (!zone1.neighbours) {
                                    zone1.neighbours = [];
                                }
                                if (!zone2.neighbours) {
                                    zone2.neighbours = [];
                                }
                                if (zone1.neighbours.indexOf(zone2.id) < 0) {
                                    zone1.neighbours.push(zone2.id);
                                }
                                if (zone2.neighbours.indexOf(zone1.id) < 0) {
                                    zone2.neighbours.push(zone1.id);
                                }
                            }
                        }
                    }
                }

                var portCities = ['lemieux', 'stirton', 'tomiko', 'silverInslet', 'nephton', 'ruggedRapids', 'redWater'];
                addNeighbours('dickinsonLanding', ['pointAnne']);
                addNeighbours('redWater', ['pointAnne']);
                addNeighbours('tomiko', ['pointAnne']);
                addNeighbours('lemieux', ['corbyville']);
                addNeighbours('castleGrey', ['winisk', 'corbyville']);
                addNeighbours('winisk', ['burwash']);

                addNeighbours('burwash', ['winisk', 'kitsilano']);
                addNeighbours('kitsilano', ['homeZone', 'burwash']);

                addNeighbours('homeZone', ['kitsilano', 'altona', 'madawaska']);
                addNeighbours('altona', ['homeZone', 'dartmoor']);
                addNeighbours('madawaska', ['homeZone', 'millBridge', 'falkenburg']);

                addNeighbours('falkenburg', ['madawaska', 'highFalls', 'hornCastle']);
                addNeighbours('hornCastle', ['falkenburg', 'highFalls']);

                addNeighbours('nephton', ['silverInslet', 'falkenburg']);

                for (var i = 0; i < portCities.length; i++) {
                    addNeighbours(portCities[i], portCities);
                }
            }

            function buildPolicies() {
                $rootScope.policies = [];
                angular.forEach($rootScope.itemList, function(obj, objid) {
                    if (obj.type == 'policy') {
                        obj.running = obj.running || false;
                        $rootScope.policies.push(obj);
                    }
                });
            }

            function buildFood() {
                $rootScope.foods = [];
                angular.forEach($rootScope.itemList, function(obj, objid) {
                    if (obj.type == 'food') {
                        $rootScope.foods.push(obj);
                    }
                });
            }



            function buildObjectives() {
                $rootScope.objectives = {};

                function addObjective(id, obj) {
                    $rootScope.objectives[id] = obj;
                }

                addObjective('collect800wood', {
                    name: 'Collect 800 wood',
                    completion: function() {
                        var pct = $rootScope.player.inventory.wood / 800;
                        return (pct >= 1 ? true : pct);
                    },
                    reward: {
                        forestry_point: 1
                    },
                    active: false,
                    completed: false
                });

                addObjective('store10daysFood', {
                    name: 'Store 10 days worth of food',
                    completion: function() {
                        var pct = $rootScope.world.home.curFood / $rootScope.player.dailyConsumables.food;
                        if (pct >= 10) {
                            return true;
                        } else {
                            return pct / 10;
                        }
                    },
                    reward: {
                        forestry_point: 1
                    }
                });
            }

            //tracks the state a storyscreen is in - 0: not available, 1: available, not yet started, 2: in progress, 3: completed
            $rootScope.storyScreens = {
                intro: {
                    state: 1,
                    curStep: null
                },
                chapter2: {
                    state: 0,
                    curStep: null
                }
            }

            $rootScope.inIntro = true;

            function loadNextImportantEvent(evtName) {
                $rootScope.importantEvent.load(evtName);
            }
            $rootScope.fixImportantEvents = function() {
                var root = $rootScope;
                console.log('event fixup in config');
                //events fixup
                if (root.importantEvent.buildCouncil.used && !root.importantEvent.councilBuilt.used) {
                    var isCouncilBeingBuilt = false;
                    for (var i in root.engine.schedule) {
                        var ev = root.engine.schedule[i][0];
                        if (ev.id === "loadImportantEvent" && ev.params && ev.params.length > 0 && ev.params[0] === "councilBuilt") {
                            isCouncilBeingBuilt = true;
                        }
                    }

                    if (!isCouncilBeingBuilt) {
                        //error!
                        Engine.insert(900, 'loadImportantEvent', ['councilBuilt']);
                    }
                }
            }

            function buildImportantEvents() {
                $rootScope.importantEvent = {
                    curEvent: null,
                    curEventId: null,
                    loadQueue: [],
                    animate: false,
                    blockAnimate: false,
                    load: function(eventid, fromQueue) {
                        if (!$rootScope.importantEvent.curEvent) {
                            if (!fromQueue) {
                                if (!$rootScope.importantEvent.blockAnimate) {
                                    $rootScope.importantEvent.animate = true;
                                }
                                Engine.stop("Loading Important Event " + eventid + ", from queue: " + fromQueue);
                            }

                            $rootScope.importantEvent[eventid].speaker = $rootScope.itemList[$rootScope.importantEvent[eventid].speakerid];
                            var curEvt = $rootScope.importantEvent.curEvent = $rootScope.importantEvent[eventid];
                            curEvt.used = true;
                            $rootScope.importantEvent.curEventId = eventid;
                            for (var i in curEvt.options) {
                                curEvt.options[i].hidden = false;
                            }

                            if (curEvt.fn) {
                                curEvt.fn();
                            }

                            $rootScope.importantEvent.displayedText = curEvt.text();
                            $rootScope.importantEvent.noclick = true;
                            $timeout(function() {
                                $rootScope.importantEvent.noclick = false;
                                $rootScope.importantEvent.animate = false;
                            }, 500);
                        } else {
                            $rootScope.importantEvent.loadQueue.push(eventid);
                        }
                    },
                    unload: function() {
                        $rootScope.importantEvent.curEvent.speaker = null;
                        $rootScope.importantEvent.curEvent = null;
                        $rootScope.importantEvent.curEventId = null;

                        if ($rootScope.importantEvent.loadQueue.length == 0) {
                            Engine.start();
                        } else {
                            var eventId = $rootScope.importantEvent.loadQueue.shift();
                            $rootScope.importantEvent.load(eventId, true);
                        }

                        $rootScope.importantEvent.blockAnimate = true;
                        $timeout(function() {
                            $rootScope.importantEvent.blockAnimate = false;
                        }, 500);
                    },
                    handleOpt: function(opt) {
                        var context = $rootScope.importantEvent.curEvent;
                        $rootScope.importantEvent.unload();
                        if (opt.fn) {
                            opt.fn.call(context);
                        }
                        if (opt.nextDelay) {
                            Engine.insert(opt.nextDelay[0], 'loadImportantEvent', [opt.nextDelay[1]]);
                        }
                        if (opt.next) {
                            $rootScope.importantEvent.load(opt.next);
                        }
                    },
                    sampleEvent: {
                        speakerid: 'juliet',
                        text: function() {
                            return 'Oh hi there stranger, how\'s it going?'
                        },
                        options: [{
                            name: 'Will be even better if you give me a smile',
                            fn: function() {
                                $rootScope.itemList.juliet.playerOpinion.love++;
                                //$rootScope.importantEvent.unload();
                                eval("alert($rootScope.itemList.juliet.name);");
                            }
                        }, {
                            name: 'You talking to me?',
                            next: 'sampleEvent2'
                        }],
                        used: false
                    },
                    sampleEvent2: {
                        speakerid: 'juliet',
                        text: function() {
                            return 'Uhhh... nevermind'
                        },
                        options: [{
                            name: '*walk away*',
                            fn: function() {
                                $rootScope.itemList.juliet.playerOpinion.love--;
                                //$rootScope.importantEvent.unload();
                            }
                        }],
                        used: false
                    },
                    underConstruction: {
                        cssClass: 'danger',
                        speakerid: null,
                        text: function() {
                            return '<h1>Under Construction</h1>' +
                                '<p>Whatever it is that has taken you here, here is a construction site. dSolver is working on it, thank you for your patience</p>';
                        },
                        used: false,
                        options: [{
                            name: 'OK'
                        }]
                    },
                    abbyFestival: {
                        speakerid: 'abby',
                        fn: function() {
                            var replies = [
                                "Today's the day! The annual " + this.params + "! Come onnnnn! People are setting up already!",
                                $rootScope.player.name + "! it's time for " + this.params + "! Let's see what the hustle is about!",
                                "Wheeeeeeeee, festival~ I can't wait! " + this.params + " is going to be soooo fun!"
                            ]

                            $rootScope.importantEvent.abbyFestival.textMsg = replies[Math.floor(Math.random() * replies.length)];

                        },
                        text: function() {
                            return this.textMsg;
                        },
                        used: false,
                        options: [{
                            name: 'Go have fun!'
                        }]
                    },
                    abbyFestivalFailed: {
                        speakerid: 'abby',
                        text: function() {
                            return "Aww, today was supposed to be the " + this.params + " but it looks like it got cancelled... hope next year it'll be good"
                        },
                        used: false,
                        options: [{
                            name: 'Keep your fingers crossed'
                        }]
                    },
                    festivalNotOption: {
                        speakerid: 'townCrier',
                        text: function() {
                            return this.params + " was cancelled. The Council decided we should focus focus our attention to more pressing matters for the time being. They will re-convene about this festival in 12 moons."
                        },
                        used: false,
                        options: [{
                            name: 'Too bad, but they have that right'
                        }]
                    },
                    festivalCostSet: {
                        speakerid: 'councilmanCeres',
                        fn: function() {
                            this.parsedText = $rootScope.player.name + ', The Council has given the go-ahead for ' + this.params.festivalName + ', check in the Council Hall for the bill for the festival. Looks like we\'ll need ' + $rootScope.fns.listGoods(this.params.festivalCost);

                        },
                        text: function() {
                            return this.parsedText
                        },
                        used: false,
                        options: [{
                            name: 'Thank you'
                        }]
                    },
                    vassalRevolted: {
                        fn: function() {
                            this.zone = $rootScope.itemList[this.params];
                            this.speaker = $rootScope.itemList[this.zone.originalLiege];
                            var w = Math.floor(this.zone.warriors * (Math.random() * 0.5 + 0.3));
                            var a = Math.floor(this.zone.archers * (Math.random() * 0.5 + 0.3));

                            this.zone.warriors -= w;
                            this.zone.archers -= a;

                            $rootScope.itemList.homeZone.archers += a;
                            $rootScope.itemList.homeZone.warriors += w;

                            if (this.zone.warriors + this.zone.archers < 20) {
                                //get some units
                                this.zone.warriors = Math.round(Math.random() * this.zone.numWorkers / 10);
                                this.zone.archers = Math.round(Math.random() * this.zone.numWorkers / 10);

                                this.zone.numWorkers -= (this.zone.warriors + this.zone.archers);
                            }
                        },
                        speakerid: 'townCrier',
                        text: function() {
                            return "The people of " + this.zone.name + " have made their demands clear, we will no longer be ruled by you. Perhaps in the future we will be allies again. In total, " + this.zone.archers + " archers and " + this.zone.warriors + " warriors have defected. The rest should have returned to you.";
                        },
                        used: false,
                        options: [{
                            name: 'You will not be shown mercy',
                            fn: function() {
                                //$rootScope.itemList[$rootScope.importantEvent.vassalRevolted.params].favour.player -= 10;
                                this.zone.favour.player -= 10;
                            }
                        }, {
                            name: 'If we will be so lucky'
                        }, {
                            name: 'Lets remain allies, after all, the alternatives are hardly attractive',
                            fn: function() {
                                //$rootScope.itemList[$rootScope.importantEvent.vassalRevolted.params].favour.player += 10;
                                this.zone.favour.player += 10;
                            }
                        }]
                    },
                    enemyVassalRevolted: {
                        speakerid: 'townCrier',
                        text: function() {
                            var zone = $rootScope.itemList[this.params.zoneid];
                            var formerLiege = $rootScope.itemList[this.params.formerLiege];
                            return $rootScope.fns.getTitle($rootScope.player.gender, $rootScope.world.home.level) + ', we have just received news that ' + zone.name + ' revolted against their former liege, ' + formerLiege.name + ' and retaken control.';
                        },
                        used: false,
                        options: [{
                            name: 'Hope they see their folly in joining a faction who doesn\'t care about them'
                        }]
                    },
                    huntingRaidNotification: {
                        cssClass: 'warning',
                        speakerid: 'townCrier',
                        text: function() {
                            return 'We received word from our hunting party that they have located a small tribe of people nearby. They are unsheltered, and have few goods. We can raid them and plunder, or go offer them goods and bring them to us. What will you have us do?'
                        },
                        used: false,
                        options: [{
                            name: 'We attack immediately',
                            cssClass: 'btn-danger',
                            fn: function() {
                                Engine.log('Hunters are sent orders to attack a small tribe');
                            },
                            next: 'huntingRaidAttack'
                        }, {
                            cssClass: 'btn-warning',
                            name: 'We offer them some money, see if they will join us',
                            fn: function() {
                                $rootScope.player.events.raidTribe = $rootScope.player.events.raidTribe || 0;
                                $rootScope.player.events.raidTribe++;
                            },
                            next: 'huntingRaidOffer'
                        }, {
                            name: 'Leave them be, they mean us no harm, and we mean them none',
                            cssClass: 'btn-primary'
                        }],
                        fn: function() {
                            if ($rootScope.player.events.raidTribe > 5) {
                                $rootScope.importantEvent.huntingRaidNotification.options[1].hidden = true;
                            } else {
                                $rootScope.importantEvent.huntingRaidNotification.options[1].hidden = false;
                            }
                        }
                    },
                    huntingRaidAttack: {
                        cssClass: 'danger',
                        speakerid: 'townCrier',
                        used: false,
                        text: function() {
                            if ($rootScope.player.gender == 'male') {
                                var title = "M'lord"
                            } else {
                                var title = "M'lady"
                            }
                            return title + ', the hunters have their orders.'
                        },
                        options: [{
                            name: 'To Victory!',
                            fn: function() {
                                Engine.insert(250, 'eventHuntingRaidReturn');
                            }
                        }]
                    },
                    huntingRaidOffer: {
                        cssClass: 'warning',
                        speakerid: 'townCrier',
                        used: false,
                        fn: function() {

                            if ($rootScope.player.gold > 2000) {
                                this.sparable = Math.round((Math.random() + 0.5) * 1000);
                            } else {
                                this.sparable = 0;
                                $rootScope.importantEvent.huntingRaidOffer.options[0].hidden = true;
                            }

                            var title = $rootScope.fns.getTitle();
                            if ($rootScope.player.sparable > 0) {
                                this.parsedText = "As you command, " + title + ", I think we can spare " + Market.convertToCurrency(this.sparable, true) + "... We have " + Market.convertToCurrency($rootScope.player.gold, true);
                            } else {
                                this.parsedText = title + ", I don't think we can spare much";
                            }
                        },
                        text: function() {
                            return this.parsedText;
                        },
                        options: [{
                            name: "Proceed",
                            cssClass: "btn-success",
                            fn: function() {
                                Engine.insert(250, 'eventHuntingOfferReturn');
                            }
                        }, {
                            name: "On second thought, attack",
                            cssClass: "btn-danger",
                            next: 'huntingRaidAttack'
                        }, {
                            name: "On second thought, leave them be",
                            cssClass: "btn-primary"
                        }]
                    },
                    eventPrincessBeeKeeper: {
                        speakerid: 'princessEmissary',
                        text: function() {
                            return 'The Exiled Princess of The Realm wishes to build an alliance with you. As a sign of good faith, she offers you the skill of bee keeping'
                        },
                        used: false,
                        options: [{
                            cssClass: 'btn-primary',
                            name: 'I accept the alliance',
                            fn: function() {
                                Player.unlock('apiariology');
                                $rootScope.itemList.thePrincess.allies.push('player');
                                $rootScope.itemList.player.allies.push('thePrincess');
                            },
                            next: 'acceptPrincessAlliance'
                        }]
                    },
                    acceptPrincessAlliance: {
                        speakerid: 'princessEmissary',
                        text: function() {
                            return 'Her Grace will be most pleased to hear of your decision! Thank you very much ' + $rootScope.player.name;
                        },
                        fn: function() {
                            $rootScope.player.events.allyOfPrincess = 1;
                            $rootScope.itemList.thePrincess.allies.push('player');
                        },
                        used: false,
                        options: [{
                            name: 'You\'re welcome'
                        }]
                    },
                    explainSpoilage: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Ewwww, the granary has some stinky mold! I guess food rots over time, that\'s why mom said we need to eat what we have and focus on sustainable production over squirreling away food';
                        },
                        used: false,
                        options: [{
                            name: 'Good point'
                        }]
                    },
                    explainEmploymentCenter: {
                        speakerid: 'councilmanCeres',
                        text: function() {
                            return 'Ahh, ' + $rootScope.player.name + ', allow me to introduce the <b>Employment Center</b> part of our Council Hall. Here, you can choose to allow various jobs to hire unemployed personel into various tasks. All you do is set how many people are to be in a particular task and the employment center will try to fill it with a worker if there are currently fewer workers on that task than you set. Of course, job openings are still limited by availability of buildings. It is important to note that we, the council will never fire anyone on your behalf. We can however advise workers to leave when the task they are on is incompatible with the season... you can set that policy on or off with us any time, free of charge!';
                        },
                        used: false,
                        options: [{
                            name: 'Thank you'
                        }]
                    },
                    meetCouncilmanCeres: {
                        speakerid: 'councilmanCeres',
                        text: function() {
                            return 'Greetings ' + $rootScope.player.name + ', my name is Ceres, I was once on the Grand Council of Dickinson Landing before The Warlord overthrew the royal family. Alas, I was away in Madawaska when the coup d\'etat occurred. Having nowhere else to turn to, I seek refuge with you. I bring many skills for managing a growing town, and your town is growing, there is no doubt. Please, let me continue my work as a councilman.';
                        },
                        used: false,
                        options: [{
                            name: 'What will you do as a council officer?',
                            next: 'explainCouncilOffice'
                        }, {
                            name: 'Welcome aboard!',
                            next: 'buildCouncil'
                        }]
                    },
                    explainCouncilOffice: {
                        speakerid: 'councilmanCeres',
                        text: function() {
                            return 'The council would function as a place to keep track of incomes and expenditures, set policies, deal with day-to-day ongoings. The bigger your town, the more reliant on the council you will be. With your permission, I shall use my existing funds to build a small council hall.'
                        },
                        options: [{
                            name: 'Sounds good, let\'s do this',
                            next: 'buildCouncil'
                        }, {
                            name: 'We will decide another time',
                            next: 'ceresInPeopleTab'
                        }]
                    },
                    buildCouncil: {
                        speakerid: 'councilmanCeres',
                        text: function() {
                            return 'Excellent! I will commission a building immediately and tell you when it is ready. It won\'t be long, just a small council hall shall suffice.'
                        },
                        options: [{
                            name: 'OK',
                            nextDelay: [$rootScope.STEPSPERDAY * 15, 'councilBuilt']
                        }],
                    },
                    buildCouncilLater: {
                        speakerid: 'councilmanCeres',
                        fn: function() {
                            //remove Ceres from people tab
                            Home.removePerson('councilmanCeres');
                        },
                        text: function() {
                            return 'Have you decided on building a council hall?'
                        },
                        options: [{
                            name: 'What is a council hall for?',
                            next: 'explainCouncilOffice'
                        }, {
                            name: 'We are ready, lets build it',
                            next: 'buildCouncil'
                        }]
                    },
                    ceresInPeopleTab: {
                        speakerid: 'councilmanCeres',
                        text: function() {
                            return 'Very well, I will be available (in the peoples tab)'
                        },
                        fn: function() {
                            Home.insertPerson('councilmanCeres', 'loadImportantEvent', 'buildCouncilLater');
                        },
                        options: [{
                            name: 'OK'
                        }]
                    },
                    councilBuilt: {
                        speakerid: 'councilmanCeres',
                        fn: function() {
                            $rootScope.fns.getNPC('councilmanCeres');
                            Player.unlock('council');
                        },
                        text: function() {
                            return 'Finally, done! Open! You may visit the council hall now and see all it has to offer!'
                        },
                        options: [{
                            name: 'Awesome!',
                            nextDelay: [200, 'explainCouncil']
                        }]
                    },
                    explainCouncil: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Looks like we\'ve built a Council Hall. I wonder why only old people are loitering around it?';
                        },
                        used: false,
                        options: [{
                            name: 'Don\'t say that, they\'re just helping us make the town better'
                        }]
                    },
                    explainSummer: {
                        cssClass: 'season summer',
                        speakerid: null,
                        text: function() {
                            return '<h1>Summer</h1>' +
                                '<p>There is no time like the summer to get things done. Nearly everything is available to do, and it seems as though there\'s never enough people to complete all the tasks.</p>' +
                                '<p>Work fast however, you are not the only one trying to get ahead while the weather is good</p>'
                        },
                        used: false,
                        options: [{
                            cssClass: 'btn-primary',
                            name: 'Continue'
                        }, {
                            cssClass: 'btn-default',
                            name: 'Do not explain Summer again',
                            fn: function() {
                                $rootScope.player.settings.doNotExplainSummer = true;
                            }
                        }]
                    },
                    explainAutumn: {
                        cssClass: 'season autumn',
                        speakerid: null,
                        text: function() {
                            return '<h1>Autumn</h1>' +
                                '<p>The air is already cooling, now that summer has passed. The time is ripe for harvesting the bounty of the year.</p>' +
                                '<p>Flowers close their bloom, and so must the bees too, everywhere animals are preparing for the winter to come. Are you?</p>'
                        },
                        used: false,
                        options: [{
                            cssClass: 'btn-primary',
                            name: 'Continue'
                        }, {
                            cssClass: 'btn-default',
                            name: 'Do not explain Autumn again',
                            fn: function() {
                                $rootScope.player.settings.doNotExplainAutumn = true;
                            }
                        }]
                    },
                    explainWinter: {
                        cssClass: 'season winter',
                        speakerid: null,
                        text: function() {
                            return '<h1>Winter</h1>' +
                                '<p>The beauty of the winter scene is contrasted by the misfortunes each day as food becomes scarce. Crops fail to grow, except those grown indoors.</p>' +
                                '<p>People are cold and burn extra wood and seek comfort in warmer clothing, for fear that the winter chill brings more than just a lack of food, that the risk of disease just multiplied</p>' +
                                '<p>Activities do not come to a pause, however, as certain work keeps on going to provide for the long winter months ahead, hopeful that spring may come shortly';
                        },
                        used: false,
                        options: [{
                            cssClass: 'btn-primary',
                            name: 'Continue'
                        }, {
                            cssClass: 'btn-default',
                            name: 'Do not explain Winter again',
                            fn: function() {
                                $rootScope.player.settings.doNotExplainWinter = true;
                            }
                        }]
                    },
                    explainSpring: {
                        cssClass: 'season spring',
                        speakerid: null,
                        text: function() {
                            return '<h1>Spring</h1>' +
                                '<p>Fruit is returning to the trees and lots of animals are returning to the forest</p>' +
                                '<p>If you have bee keepers, they will be busy collecting honey</p>'
                        },
                        used: false,
                        options: [{
                            cssClass: 'btn-primary',
                            name: 'Continue'
                        }, {
                            cssClass: 'btn-default',
                            name: 'Do not explain Spring again',
                            fn: function() {
                                $rootScope.player.settings.doNotExplainSpring = true;
                            }
                        }]
                    },
                    explainWheatFields: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return 'Wheat fields are a bit more involved to work with, but beauty of harvest wheat is they keep for a long time, ensuring a stable source of food even when times are hard';
                        },
                        used: false,
                        options: [{
                            name: 'Thanks, Monty'
                        }]
                    },
                    explainMine: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return 'Finally, a mine! Now we can get some iron and coal. Mining ores gets us iron, or coal, depending on who\'s mining it. In general, iron is going to be needed a lot more for buildings, but coal we can use to forge iron into steel for weapons. I suggest we get miners working right away, build more mining camps if necessary. Eventually the mine will run dry, and that is when we will have to expand it, but that\'s not for a while.'
                        },
                        used: false,
                        options: [{
                            name: 'Thanks for explaining'
                        }]
                    },
                    unlockBeeKeeping: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Oooo, we can now create Apiaries, and hire Bee Keepers. Monty says they will collect honey and wax. I only hear bees buzzing around in Spring and Summer though, what do they do in Autumn and Winter I wonder?';
                        },
                        options: [{
                            name: 'Stay warm inside their nests I suppose'
                        }],
                        used: false
                    },
                    rejectPrincessBeeKeeper: {
                        speakerid: 'princessEmissary',
                        text: function() {
                            return 'That is unfortunate. These are dark times and you need all the help you can get. We shall meet again, perhaps.'
                        },
                        options: [{
                            name: 'Perhaps.'
                        }],
                        used: false
                    },
                    explainhuntingSeasons: {
                        speakerid: 'abby',
                        text: function() {
                            return 'The hunters say that by slowing down hunting in the Spring to let animals flourish, there will be more available throughout the year! (Hunting takes twice as long in the Spring, animal populations grow in the forest noticeably faster)'
                        },
                        options: [{
                            name: 'Thank you'
                        }, {
                            name: 'No more tutorials please',
                            fn: function() {
                                $rootScope.player.settings.tutorials = false;
                            }
                        }]
                    },
                    explainOrchard: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return 'Ahhh, most excellent. We have access to orchards now. See the orchard that was created? During Spring, Summer, and Autumn, orchards provide abundant fruit, enough to feed everyone. However, food variety is important to a healthy and happy populace. We will have to continue hunting still'
                        },
                        options: [{
                            name: 'Ok'
                        }, {
                            name: 'No more tutorials please',
                            fn: function() {
                                $rootScope.player.settings.tutorials = false;
                            }
                        }],
                        used: false
                    },
                    masterBuilder: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return 'Greetings ' + $rootScope.player.name + ', I have come to your camp seeking work, I am <b>Monty</b>, a <b>mason</b> by trade. I have worked many years, helping turn hamlets into cities, but I am now being hunted by <b>The Warlord</b>. If you shelter me, you will have my eternal gratitude and my service.'
                        },
                        options: [{
                            name: 'Welcome aboard',
                            next: 'masterBuilder2'
                        }],
                        used: false
                    },
                    masterBuilder2: {
                        speakerid: 'masonMonty',
                        fn: function() {
                            $rootScope.player.hasBuilder = true;
                            $rootScope.world.home.mason.number++;
                            $rootScope.fns.setStatus('masonMonty', 'Working');
                            $rootScope.fns.getNPC('masonMonty');
                            $rootScope.itemList.unlocked = true;
                            Player.unlock(['masonsGuild', 'builderHut']); //unlock the masons guild if they haven't already
                            Player.unlock(['lumberMill', 'huntingLodge', 'hovel', 'firewoodCamp', 'townCenter']);
                        },
                        text: function() {
                            return 'Thank you, you are most kind. I know there are others seeking refuge from <b>The Warlord</b>, they will happily join us, if there is room. We should build some <b>hovels</b>. If you visit the <b>Masons Guild</b> You will find a number of buildings we can start making right away.'
                        },
                        options: [{
                            name: 'Good idea',
                            fn: function() {
                                Engine.insertNotificationBar("Go to the Mason's Guild and make a hovel", 'objective');
                            }
                        }],
                        used: false
                    },
                    firstVisitToMasonsGuild: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return 'Hey!<br><br> I set up this shack as the base of operations for all things related to buildings. <br>You can come any time, and look at what we can build. Over time, we will get new buildings we can build in each of the categories.<br> Now, buildings take time to construct, and resources, but very importantly - we need <b>builders</b> as well as <b>masons</b> for efficiency.<br> Each building plan details how many people it needs to work on something. <br>There\'s also this project queue. Basically, you can queue up a bunch of buildings, if you have the resources, and they will be done in order. You can of course change the order (by dragging and dropping). <br><br>Now, let\'s start building!';
                        },
                        options: [{
                            name: 'Awesome'
                        }],
                        used: false
                    },
                    firstVisitToForest: {
                        speakerid: 'abby',
                        text: function() {
                            return 'My dad used to take me through the forest to <b>cut trees</b> and hunt. I never liked <b>hunting</b> though, poor animals! But, I did plant a seed once and it\'s a sapling now. Please don\'t ever cut it down, it\'s my tree...'
                        },
                        used: false, //the player hasn't done this tutorial yet, set this to true once the tutorial has gone through.
                        options: [{
                            name: 'No problem'
                        }, {
                            name: 'Where\'s your tree? I\'m going to chop it down for firewood',
                            next: 'firstVisitToForest2'
                        }]
                    },
                    firstVisitToForest2: {
                        speakerid: 'abby',
                        text: function() {
                            return 'You... you monster! I\'m never going to tell you! ever ever ever!'
                        },
                        fn: function() {
                            $rootScope.characters.abby.playerOpinion.awe -= 5;
                            $rootScope.characters.abby.playerOpinion.fear += 5;
                            $rootScope.characters.abby.playerOpinion.love -= 5;
                        },
                        used: false,
                        options: [{
                            name: '*laugh manically* (you monster)'
                        }]
                    },
                    firstVisitToHome: {
                        cssClass: 'earlyMorning',
                        speakerid: 'abby',
                        text: function() {
                            return 'We have only a little food... are there more food in the forest we can get? I don\'t like being hungry...'
                        },
                        fn: function() {
                            $rootScope.fns.getNPC('abby');
                        },
                        used: false,
                        options: [{
                            name: 'We\'ll find out'
                        }]
                    },
                    firstVisitToField: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Mom had a little garden by our house where she grew vegetables. <em>Ick!</em> I hate squash! But sometimes it\'s tasty. This looks like a good place for a good garden, full of tastier things! Can we grow sweets? Oh oh, look, berries! Lets pick some and bring them back!'
                        },
                        used: false,
                        options: [{
                            name: 'Interesting...'
                        }]
                    },
                    firstHovel: {
                        cssClass: 'abbyPink',
                        speakerid: 'abby',
                        text: function() {
                            return 'Yay, we have a house! But ' + $rootScope.player.name + ', it\'s not a very pretty house - what if people don\'t like how it looks?'
                        },
                        used: false,
                        options: [{
                            name: 'Good point!'
                        }]
                    },
                    firstHouse: {
                        cssClass: 'abbyPink',
                        speakerid: 'abby',
                        text: function() {
                            return 'This is like our house! I like it. But really, it could be better I suppose, if it were bigger'
                        },
                        used: false,
                        options: [{
                            name: 'Noted'
                        }]
                    },
                    firstMansion: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Ooooh, what a pretty house! I love it, can we move here? hehe'
                        },
                        used: false,
                        options: [{
                            name: 'Maybe!'
                        }]
                    },
                    firstXimniVisit: {
                        speakerid: 'ximni',
                        text: function() {
                            return 'Pssst, you there, yes, you... ' + $rootScope.player.name + ', want to buy some honey? It\'ll only cost ya 1 Agris'
                        },
                        used: false,
                        options: [{
                            name: 'Who are you?',
                            next: 'meetXimni'
                        }, {
                            name: 'What\'s it for?',
                            next: 'explainHoneyGoods'
                        }]
                    },
                    meetXimni: {
                        speakerid: 'ximni',
                        text: function() {
                            return 'People... people don\'t talk to me much... I was known as Ximni, ages ago, as the goddess of the bees.'
                        },
                        used: false,
                        options: [{
                            name: "I've never met a goddess before. Prove it",
                            next: 'meetXimni2'
                        }, {
                            name: 'I don\'t care for who you are, leave and never come back!',
                            next: 'banishXimni'
                        }]
                    },
                    meetXimni2: {
                        speakerid: 'ximni',
                        text: function() {
                            return 'Proof? Ha! Like I\'ll do tricks on command. I\'m a goddess, not a dog. Now, want to buy some honey? Best price you\'ll find, guaranteed! Just <em>1</em> Agris. I see you have ' + Market.convertToCurrency($rootScope.player.gold, true)
                        },
                        used: false,
                        options: [{
                            name: 'Perhaps later',
                            fn: function() {
                                Engine.insert('eventXimniTrader', Math.floor(Math.random() * 10000 + 3000));
                                $rootScope.importantEvent.load('byeXimni');
                            }
                        }, {
                            name: 'Yes',
                            next: 'buyXimniGoods'
                        }, {
                            name: 'What are you peddling again?',
                            next: 'explainHoneyGoods'
                        }]
                    },
                    banishXimni: {
                        cssClass: 'danger',
                        speakerid: 'ximni',
                        text: function() {
                            return 'Bahhh! Curses to your beehives and many stings then! I am gone for good from this wretched land';
                        },
                        used: false,
                        options: [{
                            name: '*Watch as Ximni stumbles out*',
                            fn: function() {
                                $rootScope.player.events.enemyOfXimni = 1;
                            }
                        }]
                    },
                    byeXimni: {
                        speakerid: 'ximni',
                        text: function() {
                            return 'Very well, I shall return at a more convenient time'
                        },
                        fn: function() {
                            Engine.insert(4800, 'eventXimniTrader');
                        },
                        used: false,
                        options: [{
                            name: 'Good bye'
                        }]
                    },
                    explainHoneyGoods: {
                        speakerid: 'ximni',
                        text: function() {
                            return 'Well, honey is a very very sweet substance that is used in many different desserts, and wax here - well, wax can do some amazing things like be a candle, if you have someone who knows how to make them, or perhaps soap - because everyone should know hygiene is important, and oh of course! Honey and wax together makes a fine potion that guarantees eternal youth. Only cost ya 1 Agris. I see you have ' + Market.convertToCurrency($rootScope.player.gold, true);
                        },
                        used: false,
                        options: [{
                            name: 'I will buy some right now',
                            next: 'buyXimniGoods'
                        }, {
                            name: 'I am interested, come back another time?',
                            next: 'byeXimni'
                        }]
                    },
                    buyXimniGoods: {
                        speakerid: 'ximni',
                        fn: function() {
                            Player.pay({
                                gold: 108
                            });
                            Player.insertInventory({
                                honey: 2,
                                wax: 1
                            });
                            Engine.insert(5200, 'eventXimniTrader');
                        },
                        text: function() {
                            return 'Excellent! Here you go kind ' + $rootScope.player.gender == 'male' ? 'sir' : 'm\'am' + ', 2 jars of honey and a box of wax. I will return more later, with more, later. Until then! (1 ag deducted)';
                        },
                        used: false,
                        options: [{
                            name: 'Figure out what to do with the goods'
                        }]
                    },
                    townUp: {
                        speakerid: 'townCrier',
                        fn: function() {
                            $rootScope.fns.getNPC('townCrier');
                            //remove town crier from people tab
                            Home.removePerson('townCrier');

                            var nextLevel = Home.getLevel($rootScope.world.home.level + 1);
                            this.parsedText = $rootScope.fns.getTitle() + ', we have enough workers to declare this place a ' + nextLevel.noun + '. Declaring so would grant us ' + nextLevel.rewardString + ' but, we must maintain a minimum worker population of ' + nextLevel.requirements.workers + ' or else face consequences of an unhappy populace.';

                        },
                        text: function() {
                            return this.parsedText;
                        },
                        used: false,
                        options: [{
                            name: 'Proceed',
                            cssClass: 'btn-primary',
                            fn: function() {
                                //proceed to level up the town
                                Home.levelUp(); //level up Home
                            }
                        }, {
                            name: 'Not yet',
                            next: 'townUpLater'
                        }]
                    },
                    townUpLater: {
                        speakerid: 'townCrier',
                        fn: function() {
                            Home.insertPerson('townCrier', 'loadImportantEvent', 'townUp');
                        },
                        text: function() {
                            return 'No problem, let me know when you are ready (in People tab)';
                        },
                        used: false,
                        options: [{
                            name: 'OK',
                        }]
                    },
                    townIsCamp: {
                        speakerid: 'abby',
                        text: function() {
                            return 'I\'m glad there\'s more people now, things are starting to feel normal again... but I miss my mom and dad'
                        },
                        used: false,
                        options: [{
                            name: 'You\'ll see them again'
                        }]
                    },
                    townIsSettlement: {
                        speakerid: 'abby',
                        text: function() {
                            return 'There are so many people to talk to, I even saw some other children! How wonderful! I wonder what its called when we have even more people?'
                        },
                        used: false,
                        options: [{
                            name: 'A hamlet'
                        }]
                    },
                    firstVillage: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return 'Aye sir, we have quite a few workers now, enough to call ourselves a village, finally. It ain\'t all fun and games, nope. Being bigger attracts attention - bandits, thieves, even rival towns and factions. Best we get working on a military. People come to us because they need help, they give us their strength, we should give them protection. Speaking of growth, we\'ve got some wealthier people amongst us now. With your permission, we can create some higher class housing for those who can afford it, this could help us look more attractive, and lend new business opportunities'
                        },
                        used: false,
                        options: [{
                            name: 'Thanks for the heads up, we should focus on protection first and foremost',
                            fn: function() {
                                //trigger military contracts 
                            }
                        }, {
                            name: 'Thanks for the information, we should focus on building trust with our neighbours and help each other survive',
                            fn: function() {
                                //trigger ambassador
                            }
                        }]
                    },
                    firstStarve: {
                        speakerid: 'abby',
                        text: function() {
                            return $rootScope.player.name + ', I\'m hungry. Can we go hunting for food? Dad never let me go hungry before.'
                        },
                        used: false,
                        options: [{
                            name: 'Got it'
                        }]
                    },
                    firstSick: {
                        cssClass: 'pukey',
                        speakerid: 'abby',
                        text: function() {
                            return $rootScope.player.name + ', I don\'t feel so well. Am I dying? Mom used to make medicine when I get sick.'
                        },
                        used: false,
                        options: [{
                            name: 'You will get better'
                        }]
                    },
                    firstWorkerLeave: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Oh no! We\'re being abandoned! Please do something to bring people back!'
                        },
                        used: false,
                        options: [{
                            name: 'Ok'
                        }]
                    },
                    firstOverCrowd: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Some people don\'t have a roof over their heads, maybe we should let them squeeze with us? Wait no, everyone here has smelly feet. <em>Ew gross!</em>'
                        },
                        used: false,
                        options: [{
                            name: 'I\'ll see what I can do'
                        }]
                    },
                    firstWinter: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Brrrrrr! It\'s getting chilly here... I bet winter is coming, squirrels have been putting away food for the winter, do people have to do it too?'
                        },
                        used: false,
                        options: [{
                            name: 'Usually it\'s a good idea'
                        }]
                    },
                    beekeepers: {
                        speakerid: 'abby',
                        text: function() {
                            return 'An emissary from the Princess stopped by! He gave me a little bit of honey, it is sooo sweet! I love it! Can we make some too please?'
                        },
                        used: false,
                        options: [{
                            name: 'What a sweet-tooth you have!'
                        }]
                    },
                    firstWolfAttack: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Wolves are scary! Why are they attacking us? Don\'t they have enough to eat in the forest?'
                        },
                        used: false,
                        options: [{
                            name: 'They do seem hungry'
                        }]
                    },
                    foundField: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Guess what ' + $rootScope.player.name + '? I found this biiiiiggg field with lots of wild flowers, you really should see it!'
                        },
                        used: false,
                        options: [{
                            name: 'Awesome, we should explore it!'
                        }]
                    },
                    abbyGoEww: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Oh my gosh! You\'re going to collect the poop from animals... and grow FOOD from them?!? Gross!';
                        },
                        used: false,
                        options: [{
                            name: 'Feel free to never eat vegetables again',
                            next: 'abbyGoEww2'
                        }, {
                            name: 'Don\'t worry, we\'ll wash the food very well before eating'
                        }]
                    },
                    abbyGoEww2: {
                        speakerid: 'abby',
                        text: function() {
                            if ($rootScope.itemList.pub.unlocked) {
                                return 'Fine by me! I\'ll just go beg for food at the pub every day from now on!'
                            } else {
                                Engine.insert(1900, 'pubBuild');
                                return 'Hmmphf. One day we will have people who can make tastier things.'
                            }
                        },
                        used: false,
                        options: [{
                            name: 'That hurt :('
                        }]
                    },
                    rodentSituation: {
                        speakerid: 'abby',
                        text: function() {
                            return "Oh dear! There are rats everywhere!"
                        },
                        used: false,
                        options: [{
                            name: 'Die rodents die!',
                            next: 'rodentSituation2'
                        }, {
                            name: '*Give her a club* Have fun!',
                            next: 'rodentSituation2a'
                        }]
                    },
                    rodentSituation2: {
                        speakerid: 'abby',
                        text: function() {
                            return "Mhmmm. They're not cute, like mice, or hamsters, or guinea pigs. Ohh ohh, you know what? I love cats! If you talk to Juliet, I think her family has some!"
                        },
                        options: [{
                            name: "That's a good idea, I will",
                            fn: function() {
                                Home.insertPerson('juliet', 'loadImportantEvent', 'julietFamilyCats');
                            }
                        }]
                    },
                    rodentSituation2a: {
                        speakerid: 'abby',
                        text: function() {
                            return "Silly " + $rootScope.player.name + "... what? Nuh-uh. I'm keeping this club... it's mine now, no take backsies!";
                        },
                        options: [{
                            name: "Silly silly"
                        }]
                    },
                    julietFamilyCats: {
                        speakerid: 'juliet',
                        text: function() {
                            return "Meow? Oh! I'm sorry, I was playing with my cat and I'm still cat brained. What's up?"
                        },
                        options: [{
                            name: "I'm here about your cat",
                            next: 'julietFamilyCats2'
                        }]
                    },
                    julietFamilyCats2: {
                        speakerid: 'juliet',
                        text: function() {
                            return "Oh? Did they do something or..."
                        },
                        options: [{
                            name: "Oh no no, it's not that. You know how sometimes we get rats in the field? And they sometimes threaten crops?",
                            next: 'julietFamilyCats3'
                        }]
                    },
                    julietFamilyCats3: {
                        speakerid: 'juliet',
                        text: function() {
                            return "Yes. I see where you're going with this. What kind of stupid idea is that? This is a house cat!"
                        },
                        options: [{
                            name: "Yes, but - ",
                            next: 'julietFamilyCats4'
                        }]
                    },
                    julietFamilyCats4: {
                        speakerid: 'juliet',
                        text: function() {
                            return "It's a house cat, " + $rootScope.player.name + ", she won't catch that many. Look at her size... one moment. Here puss puss puss puss. Meow? Meow! <br><br> ... <br><br> There you are! Come now, somebody is here to see you! You have visitors! Look!"
                        },
                        options: [{
                            name: "Ahh, ok, I'm convinced. Sorry to bother you",
                            next: 'julietFamilyCats5'
                        }]
                    },
                    julietFamilyCats5: {
                        speakerid: 'juliet',
                        fn: function() {
                            if (!$rootScope.itemList.chickenWire.unlocked) {
                                this.parsedText = "Wait! Wait... look, why not just build some chicken wire? Here, I'll show you our garden. <br><br> ... <br><br> See? If you build it tight enough, it keeps out rats too, at least the bigger ones. ";
                                Player.unlock('chickenWire');
                                var msg = "You have unlocked Chicken Wire from Juliet. This upgrade reduces the chance of rodent infestations and reduces the length of a rodent infestation."
                                Engine.log(msg);
                                Engine.createNotification(msg);
                            } else {
                                this.parsedText = "Yeah, don't worry. Look, I know Abby is smart for her age, but sometimes, it's better to listen to an adult ;)"
                            }

                        },
                        text: function() {
                            return this.parsedText;
                        },
                        options: [{
                            name: "Okay, thanks for the advice! I'll see you around",
                            fn: function() {
                                Home.removePerson('juliet');
                            }
                        }]
                    },
                    openDrunkenMule: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return 'Magnificent! Just beautiful! The town has opened a pub!'
                        },
                        used: false,
                        options: [{
                            name: 'I haven\'t been in a pub in years, race you there!'
                        }]
                    },
                    firstComingOfAge: {
                        speakerid: 'abby',
                        text: function() {
                            return $rootScope.player.name + '! A boy named Tommy is said to have come of age! His father said we have to treat him like an adult now, because he has responsibilities. He\'s so cool! I want to have responsibilities too!'
                        },
                        used: false,
                        options: [{
                            name: 'You will, enjoy being a child for now ;)'
                        }]
                    },
                    firstRetirement: {
                        speakerid: 'abby',
                        text: function() {
                            return 'Old Aberforth says he wants to live out the rest of his days in peace now, away from work. He does look very tired... who will look after him I wonder?'
                        },
                        used: false,
                        options: [{
                            name: 'Aberforth will be taken care of, don\'t you worry - he has a good family'
                        }]
                    },
                    refugees: {
                        speakerid: 'masonMonty',
                        text: function() {
                            var refugees = this.params;
                            var txt = $rootScope.player.name + ', a caravan rolled in. They claim to be refugees from ' + refugees.from + ', after an invasion by ' + refugees.invadedBy + '. There\'s not very many of them here, only ' + refugees.number + ' able workers, and the following provisions: ';
                            txt += $rootScope.fns.listGoods(refugees.provisions);
                            txt += '. If we take them in, we have to house and feed them, but they will do work.';

                            return txt;
                        },
                        used: false,
                        options: [{
                            name: 'They are all welcome!',
                            fn: function() {
                                var refugees = $rootScope.importantEvent.refugees.params;
                                Home.newWorkers(refugees.number);
                                Player.insertInventory(refugees.provisions);
                            }
                        }, {
                            name: 'We have to turn them away',
                            next: 'refugeesTurnedAway'
                        }]
                    },
                    refugeesTurnedAway: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return 'These people will keep looking for a new home I guess, really wish we could have done something.';
                        },
                        used: false,
                        options: [{
                            name: 'We can\'t help them all'
                        }]
                    },
                    buildMilitaryCouncil: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return $rootScope.fns.getTitle() + ', I fear it is time to make the safety of our village a priority... Rumours are going that we\'ve attracted the attention of The Warlord, and he might be coming to "deal" with us when he is finished with the other... bigger towns';
                        },
                        used: false,
                        options: [{
                            name: 'Do it, right now.',
                            next: 'buildMilitaryCouncil2'
                        }]
                    },
                    buildMilitaryCouncil2: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return 'Very well. I know some people in the village have more or less some military experience, we can set up a council to build necessary defenses';
                        },
                        used: false,
                        options: [{
                            name: 'Good idea',
                            fn: function() {
                                Player.unlock('militaryCouncil');
                            }
                        }]
                    },
                    warningAIAttacking: {
                        speakerid: 'townCrier',
                        fn: function() {
                            var character = $rootScope.itemList[this.params.attackingAI];
                            this.parsedText = $rootScope.fns.getTitle() + ', our spies have reported that ' + character.name + ' is planning an attack against ' + character.nextTarget.name + '!';

                        },
                        text: function() {
                            return this.parsedText;
                        },
                        used: false,
                        options: [{
                            name: 'OK',
                        }]
                    },
                    dangerAIAttacking: {
                        speakerid: 'townCrier',
                        fn: function() {
                            var character = $rootScope.itemList[this.params.attackingAI];
                            this.parsedText = $rootScope.fns.getTitle() + ', we have reports of ' + character.name + ' moving military towards ' + character.nextTarget.name + '!';

                        },
                        text: function() {
                            return this.parsedText;
                        },
                        used: false,
                        options: [{
                            name: 'OK',
                        }]
                    },
                    AIIsAttacking: {
                        speakerid: 'townCrier',
                        fn: function() {
                            var character = $rootScope.itemList[this.params.attackingAI];
                            this.parsedText = $rootScope.fns.getTitle() + ', ' + character.name + ' has arrived at ' + character.nextTarget.name + ', the attack is imminent!';

                        },
                        text: function() {
                            return this.parsedText;
                        },
                        used: false,
                        options: [{
                            name: 'OK',
                        }]
                    },
                    banditAttacking: {
                        speakerid: 'townCrier',

                        fn: function() {
                            var tts = ~~(Math.random() * 600 + 300);
                            Engine.insert(tts, 'banditAttack');

                            this.parsedText = $rootScope.fns.getTitle();

                            var texts = [
                                ", bandit activity in the vicinity of the " + Home.getLevel($rootScope.world.home.level).prefix + " has increased, they might launch an attack any moment",
                                ", scouts report a group of bandits marching towards us",
                                ", we have been warned that a group of bandits will be attacking soon!",
                                ", we best prepare, a wave of bandits and n'er-do-wells are on their way here",
                                ", let's get you to safety; a group of bandits are coming"
                            ]

                            this.parsedText += texts[Math.floor(Math.random() * texts.length)];
                        },
                        text: function() {
                            return this.parsedText;
                        },
                        used: false,
                        options: [{
                            name: 'OK',
                        }]
                    },
                    announceThePsychopath: {
                        speakerid: 'townCrier',
                        text: function() {
                            return $rootScope.fns.getTitle() + ', we have received reports that The Warlord has named his Nephew, The Psychopath, the Liege of Horn Castle! This bodes ill for the lands, for it is oft quipped that The Psychopath is a more ruthless ruler than The Warlord himself! We best prepare military as soon as possible, word is he forced every villager, women and children included, into his army or face death.';
                        },
                        used: false,
                        options: [{
                            name: 'What do you suggest?',
                            next: 'recommendDefense'
                        }, {
                            name: 'There is nothing to fear but fear itself'
                        }]
                    },
                    recommendDefense: {
                        speakerid: 'townCrier',
                        text: function() {
                            if ($rootScope.world.home.level >= 2) {
                                if ($rootScope.itemList.militaryCouncil.unlocked) {
                                    if ($rootScope.itemList.homeZone.warriors > 0 || $rootScope.itemList.homeZone.archers > 0) {
                                        return "We should continue developing troops to counter whatever may come our way, maybe befriend neighbouring cities";
                                    } else {
                                        return "We should recruit some troops to fill our barracks"
                                    }
                                } else {
                                    return "We should focus on building a military council start working on acquiring units";
                                }
                            } else {
                                return "We should focus on growing our settlement into a hamlet, the more people on our side, the better chance we have at surviving";
                            }
                        },
                        used: false,
                        options: [{
                            name: 'Thank you for your advice'
                        }]
                    },
                    travellingPhysicianSellMedicine: {
                        speakerid: 'physicianPatricia',
                        fn: function() {
                            this.parsedText = "Hello everybodee!, I'm Patricia, the bestest of travelling physicians. Disease spreading is the most common cause of community collapse. Would you like to purchase some Medicine?";

                            var playerGold = $rootScope.player.gold;
                            this.options[1].hidden = false;
                            this.options[2].hidden = false;
                            this.options[3].hidden = false;
                            if (playerGold < 25 * 108) {
                                this.options[1].hidden = true;
                                this.options[0].name = 'No (You don\'t have enough money)';
                            } else {
                                this.options[0].name = 'No thanks';
                            }
                            if (playerGold < 75 * 108) {
                                this.options[2].hidden = true;
                            }
                            if (playerGold < 125 * 108) {
                                this.options[3].hidden = true;
                            }
                        },
                        text: function() {
                            return this.parsedText;
                        },
                        used: false,
                        options: [{
                            name: 'No',
                            next: 'travellingPhysicianStayHealthy'
                        }, {
                            name: 'Buy 5 Medicine (12ag)',
                            fn: function() {
                                Player.pay({
                                    gold: 12 * 108
                                });
                                Player.insertInventory({
                                    medicine: 5
                                });
                                $rootScope.importantEvent.load('travellingPhysicianStayHealthy');
                            }
                        }, {
                            name: 'Buy 10 Medicine (20ag)',
                            fn: function() {
                                Player.pay({
                                    gold: 20 * 108
                                });
                                Player.insertInventory({
                                    medicine: 10
                                });
                                $rootScope.importantEvent.load('travellingPhysicianStayHealthy');
                            }
                        }, {
                            name: 'Buy 20 Medicine (35ag)',
                            fn: function() {
                                Player.pay({
                                    gold: 35 * 108
                                });
                                Player.insertInventory({
                                    medicine: 20
                                });
                                $rootScope.importantEvent.load('travellingPhysicianStayHealthy');
                            }
                        }]
                    },
                    travellingPhysicianStayHealthy: {
                        speakerid: 'physicianPatricia',
                        fn: function() {
                            Engine.insert(24000 + Math.floor(Math.random() * 18000), 'eventTravellingPhysician');
                        },
                        text: function() {
                            return 'Ok, stay healtheee! ~_^';
                        },
                        options: [{
                            name: 'Will do!'
                        }]
                    },
                    travellingPhysician: {
                        speakerid: 'physicianPatricia',
                        fn: function() {
                            this.parsedText = "Hi, I'm Patricia, a travelling physician. I could sense disease from miles away... okay, I can't, but my pal here can! Good boy!<br><br>";
                            var maxPatients = 6;

                            if ($rootScope.world.home.infected > maxPatients) {
                                this.parsedText = "Looks like you have a few people with contagious diseases. I can't treat them here, but in the neighbouring town, Altona, I can. My carriage can bring up to 6 patients."
                            } else {
                                this.parsedText = "I'd be careful, disease can spread very quickly. How about I take your ill workers with me to Altona for a fortnight? They will return healthy."
                            }

                            var cost = {
                                fur: 230
                            };
                            var player = $rootScope.player;
                            if (player.events.paidPhysicianPatricia) {
                                this.options[1].hidden = false;
                                if (Player.canAfford(cost)) {
                                    this.options[0].hidden = false;
                                    this.options[0].name = "230 fur if I recall, to treat them? Here you go! (you have " + player.inventory.fur + " furs)";
                                } else {
                                    this.options[0].hidden = true;
                                }
                            } else {
                                this.options[0].hidden = true;
                                this.options[1].hidden = true;
                            }
                        },
                        text: function() {
                            return this.parsedText;
                        },
                        used: false,
                        options: [{
                            cssClass: "btn-success",
                            name: '230 fur if I recall, to treat them? Here you go!',
                            next: 'travellingPhysicianAccept'
                        }, {
                            name: 'Sorry, we cannot afford that at the moment...',
                            next: 'travellingPhysicianLeave'
                        }, {
                            name: 'Can you take them? How much would I owe you?',
                            next: 'travellingPhysicianPrice'
                        }, {
                            name: 'No thanks, we will manage',
                            next: 'travellingPhysicianLeave'
                        }]
                    },
                    travellingPhysicianAccept: {
                        speakerid: 'physicianPatricia',
                        fn: function() {
                            var takenAway = Math.min(6, $rootScope.world.home.infected);
                            Player.pay({
                                fur: 230
                            });
                            $rootScope.world.home.infected -= takenAway;
                            Player.cullWorker(null, takenAway, true);
                            Engine.log(takenAway + ' workers have gone with Physician Patricia to Altona for treatment');

                            Engine.insert($rootScope.STEPSPERDAY * 14, 'workersReturnFromAltona', [takenAway]);

                            Engine.insert($rootScope.STEPSPERDAY * 35 + Math.floor(Math.random() * $rootScope.STEPSPERDAY * 12), 'eventTravellingPhysician');

                        },
                        text: function() {
                            return "Thank you, your workers will be back here in a fortnight (14 days)"
                        },
                        used: false,
                        options: [{
                            name: "No, thank you!"
                        }]

                    },
                    travellingPhysicianPrice: {
                        speakerid: 'physicianPatricia',
                        fn: function() {
                            $rootScope.player.events.paidPhysicianPatricia = true;
                            var cost = {
                                fur: 230
                            };
                            if (Player.canAfford(cost)) {
                                this.options[0].hidden = false;
                            } else {
                                this.options[0].hidden = true;
                            }
                        },
                        text: function() {
                            return "Well, I never seem to have enough furs. I would like 230 furs for this service. Don't worry, the cost is the same no matter how many patients come with me. My sole purpose in life is to heal!"
                        },
                        used: false,
                        options: [{
                            cssClass: "btn-success",
                            name: "Yes, we can afford that, please help the ill",
                            next: 'travellingPhysicianAccept'
                        }, {
                            name: "I'm afraid we cannot spare that at the moment",
                            next: 'travellingPhysicianLeave'
                        }]
                    },
                    travellingPhysicianLeave: {
                        speakerid: 'physicianPatricia',
                        fn: function() {
                            Engine.insert($rootScope.STEPSPERDAY * 18, 'eventTravellingPhysician');
                        },
                        text: function() {
                            return "Very well, I will come by occasionally, offer my services if there happen to be sick people";
                        },
                        options: [{
                            name: "See you then"
                        }]
                    },
                    traderJoeFirstVisit: {
                        speakerid: 'traderJoe',
                        fn: function() {
                            var cost = 10 * 108 * 197;

                            if ($rootScope.player.profession == 'merchant') {
                                cost = 5 * 108 * 197;
                            }
                            if ($rootScope.player.gold >= cost) {
                                this.canSetupMarket = true;
                                this.options[0].hidden = false;
                            } else {
                                this.canSetupMarket = false;
                                this.options[0].hidden = true;
                            }

                            this.parsedText = 'Ahoy! ' + $rootScope.player.name + ', I am <em>Joe, the Trader</em>, you may have heard of me... no? I come from a land far away, well, banished from my homeland. Once I was the greatest merchant that ever lived, I commanded fleets of vessels and... fine, I get it, you\'re not buying my story. But, <b>I am a merchant</b> and I have set up markets across multiple villages much like this one.';

                            if ($rootScope.player.profession == 'merchant') {
                                this.parsedText += ' <p>I see you are a merchant as well! that saves some explaining. To join the Merchants Guild, we will only require 5au from you, and you will get your caravan after a few days, which will give you access to the Market and its goods.</p>'
                            } else {
                                this.parsedText += ' <p>I can offer to help you join the Merchants Guild, for a fee of only 10 au, and once you have the money, we can set up a caravan and give you access to The Market - it is said The Market is the gateway to other worlds, for every merchant eventually brings their wares there.</p>'
                            }
                        },
                        text: function() {
                            return this.parsedText;
                        },
                        options: [{
                            name: "I have the money, lets do this",
                            next: 'traderJoeBuildMarket'
                        }, {
                            name: "I can't do this right now",
                            next: 'traderJoeBuildLater'
                        }]
                    },
                    traderJoeAgainVisit: {
                        speakerid: 'traderJoe',
                        fn: function() {
                            Home.removePerson('traderJoe');
                            var cost = 10 * 108 * 197;
                            var cs = "10au";

                            if ($rootScope.player.profession == 'merchant') {
                                cost = 5 * 108 * 197;
                                cs = "5au"
                            }

                            if ($rootScope.player.gold >= cost) {
                                this.parsedText = "Ready to build the Market? You have enough funds, it's only " + cs + ".";
                                this.options[0].hidden = false;
                            } else {
                                this.parsedText = "Looks like you can't afford it quite yet, please come back when you can. it's " + cs + ".";
                                this.options[0].hidden = true;
                            }

                        },
                        text: function() {
                            return this.parsedText;
                        },
                        options: [{
                            name: "Lets do this",
                            next: 'traderJoeBuildMarket'
                        }, {
                            name: "I will be back later",
                            next: 'traderJoeBuildLater'
                        }]
                    },
                    traderJoeBuildLater: {
                        speakerid: 'traderJoe',
                        fn: function() {
                            var cs = "10au";

                            if ($rootScope.player.profession == 'merchant') {
                                cs = "5au"
                            }

                            var responses = [
                                "No problemo, come back when you have the coin, I will be waiting (In People Tab)",
                                "Sure we can discuss this later, see you around amigo (In People Tab)",
                                "Okay, but its a limited time offer, just <b>" + cs + "</b>, you know you can't get this anywhere else!",
                                "I'll be hanging around out here if you don't mind, find me when you're ready (In People Tab)"
                            ]

                            this.parsedText = responses[Math.floor(Math.random() * responses.length)];

                            Home.insertPerson("traderJoe", "loadImportantEvent", "traderJoeAgainVisit");
                        },
                        text: function() {
                            return this.parsedText;
                        },
                        options: [{
                            name: "OK"
                        }]
                    },
                    traderJoeBuildMarket: {
                        speakerid: 'traderJoe',
                        fn: function() {
                            var cost = 10 * 108 * 197;
                            var cs = "10au";

                            if ($rootScope.player.profession == 'merchant') {
                                cost = 5 * 108 * 197;
                                cs = "5au"
                            }

                            Player.pay({
                                gold: cost
                            });

                            Engine.insert($rootScope.STEPSPERDAY * 22, 'loadImportantEvent', ['traderJoeMarketComplete']);
                        },
                        text: function() {
                            return "Great! Thank you for your contributions, I will commission the development right away, it will be done in about 20 days, give or take a few"
                        },
                        options: [{
                            name: "You're welcome!"
                        }]
                    },
                    traderJoeMarketComplete: {
                        speakerid: 'traderJoe',
                        fn: function() {
                            Player.unlock('market');
                        },
                        text: function() {
                            return $rootScope.player.name + "! Grand opening today, please come, The Market is ready, and you can start sending your caravan to buy and sell goods!"
                        },
                        options: [{
                            name: "Awesome, lets see it!"
                        }]
                    },
                    homeZoneRaided: {
                        speakerid: 'seeress',
                        fn: function() {
                            var invaderName = $rootScope.itemList[this.params.ai].name;
                            this.parsedText = 'Well well well, it looks like you were defeated in battle. ' + invaderName + ' attempted to take hold but your people revolted... with a little help. Try to recover now, you won\'t be invaded... for a little while at least'
                            var optiontxt = [
                                'Wait, who are you?',
                                'Thank you... goddess?',
                                'Wait, what do you mean?',
                                '... am I dreaming?',
                                'for how long?',
                                'What should I do?'
                            ];

                            this.options[0].name = optiontxt[Math.floor(Math.random() * optiontxt.length)];
                        },
                        text: function() {
                            return this.parsedText;
                        },
                        options: [{
                            name: "Wait, who are you?"
                        }]
                    },
                    breedinglivestockSlow: {
                        speakerid: 'abby',
                        text: function() {
                            return "I tried chatting with the breeders today, but they are too too busy! They barely have time to raise new calves with all the grown up livestock to manage! Maybe we should cut down on matured livestock? I don't want to hurt the animals though... but... but... I don't know what we can do :("
                        },
                        options: [{
                            name: "We'll think of something... what do you want for dinner?"
                        }]
                    },
                    huntingSlow: {
                        speakerid: 'abby',
                        text: function() {
                            return "I hope the hunting party is OK, they've been gone for a few days now... they didn't used to be away for so long!"
                        },
                        options: [{
                            name: "Animals are scarce, it's harder to find them. I'm sure the hunters are fine though."
                        }]
                    },
                    cuttingWoodSlow: {
                        speakerid: 'abby',
                        text: function() {
                            name: "Wow, I was talking to some of the lumberjacks, do yo know how far they have to drag their felled trees to get them to town? It's ridiculous! I remember when the forest was a lot denser!"
                        },
                        options: [{
                            name: "What do you suggest? Just not cut trees and let the forest replenish itself?"
                        }]
                    },
                    thePrincessHasDied: {
                        speakerid: 'townCrier',
                        text: function() {
                            return "The Princess has died. Castle Grey was sacked, and her other towns have abandoned their allegiance with her. This is a grim day indeed, thus ends the legacy of the Grey Dynasty"
                        },
                        options: [{
                            name: "So say we all"
                        }]
                    },
                    thePsychopathHasDied: {
                        speakerid: 'townCrier',
                        text: function() {
                            return "Good riddance, The Psychopath has finally died. He died as he had lived, in fear. May his death eased his suffering"
                        },
                        options: [{
                            name: "So say we all"
                        }]
                    },
                    theWarlordHasDied: {
                        speakerid: 'townCrier',
                        text: function() {
                            return "The Warlord has died! His stronghold, Dickinson Landing, has been taken. Finally the world can start recovering... one can hope"
                        },
                        options: [{
                            name: "So say we all"
                        }]
                    },
                    questForMarky: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return "Oh, hey, " + $rootScope.player.name + ", I was just thinking... heard something from a travelling merchant, 'bout a guy named Marky they saw in Altona..."
                        },
                        options: [{
                            name: "Do you know him?",
                            next: 'questForMarky2'
                        }]
                    },
                    questForMarky2: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return "Aye, aye you can say that. Haven't seen him for many long years, we used to be close, he and I. We were brothers. But then he swore allegiance to The Princess, back when she lived in Dickinson Landing mind you, and haven't heard from him since The Warlord took over."
                        },
                        options: [{
                            name: "Is there anything we can do to help?",
                            next: 'questForMarky3'
                        }]
                    },
                    questForMarky3: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return "I... I heard he's near, in Dartmoor. With your permission, I would like to go look for him. I'll be gone for ten days at most. He is a wonderful mason, we were both trained by our father. If he joins us, I'm sure he will prove himself valuable."
                        },
                        options: [{
                            name: "Go ahead, find your brother",
                            next: 'questForMarky4'
                        }, {
                            name: "But we need you right now, can it wait?",
                            next: 'questForMarky4a'
                        }]
                    },
                    questForMarky4: {
                        speakerid: 'masonMonty',
                        fn: function() {
                            $rootScope.world.home.mason.number--;
                            Engine.insert(10 * $rootScope.STEPSPERDAY, 'loadImportantEvent', ['welcomeMarky']);
                        },
                        text: function() {
                            return "Thank you! I won't be long, I promise!"
                        },
                        options: [{
                            name: "Good luck"
                        }]
                    },
                    questForMarky4a: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return "I... suppose. Don't put it off too long, and let me know when is a good time"
                        },
                        fn: function() {
                            Home.insertPerson('masonMonty', 'loadImportantEvent', 'questForMarkyResume');
                        },
                        options: [{
                            name: "OK"
                        }]
                    },
                    questForMarkyResume: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return "Am I free to find my brother Marky? who is also a mason I might add, it'll only take me ten days"
                        },
                        fn: function() {
                            Home.removePerson("masonMonty");
                        },
                        options: [{
                            name: "Yes, you may",
                            next: 'questForMarky4'
                        }, {
                            name: "Not yet, sorry",
                            next: 'questForMarky4a'
                        }]
                    },
                    welcomeMarky: {
                        speakerid: 'masonMonty',
                        fn: function() {
                            $rootScope.world.home.mason.number++;
                        },
                        text: function() {
                            return "I'm back! Look who I have with me! " + $rootScope.player.name + ", this is my brother, Marky"
                        },
                        options: [{
                            name: "Nice to meet you",
                            next: 'welcomeMarky2'
                        }]
                    },
                    welcomeMarky2: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "My my, we meet at last. Monty wouldn't stop talking about you, like you're married or something. Anyway, seems like my little brother here is overwhelmed with work!"
                        },
                        options: [{
                            name: "*continue*",
                            next: 'welcomeMarky3'
                        }]
                    },
                    welcomeMarky3: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return "Older brother. I am older, don't you forget that Marky"
                        },
                        options: [{
                            name: "*continue*",
                            next: 'welcomeMarky4'
                        }]
                    },
                    welcomeMarky4: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "Ha! I've been all over the world architecting buildings. I am definitely older than you."
                        },
                        options: [{
                            name: "*continue*",
                            next: 'welcomeMarky5'
                        }]
                    },
                    welcomeMarky5: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return "Travelling is not age! You dimwit, stubborn as always... alright, I'll show you where masons live, don't mind him, " + $rootScope.player.name + ", he's always like this."
                        },
                        fn: function() {
                            $rootScope.world.home.mason.number++;
                            $rootScope.fns.setStatus('masonMarky', 'Working');
                            $rootScope.fns.getNPC('masonMarky');
                        },
                        options: [{
                            name: "*watch them head to the masons guild, confused of their brotherly ways*"
                        }]
                    },
                    questForMarla: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "Got a moment, " + $rootScope.player.name + "? I wanted to talk"
                        },
                        options: [{
                            name: "A little busy at the moment, later?",
                            fn: function() {
                                Home.insertPerson('masonMarky', 'loadImportantEvent', 'questForMarla1a');
                            }
                        }, {
                            name: "Go ahead, what's the matter?",
                            next: 'questForMarla2'
                        }]
                    },
                    questForMarla1a: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "Hey, sorry about earlier, look I got a favour to ask you... don't tell Monty"
                        },
                        fn: function() {
                            Home.removePerson("masonMarky");
                        },
                        options: [{
                            name: "I'm listening",
                            next: 'questForMarla2'
                        }, {
                            name: "Oh... can it wait a bit longer?",
                            fn: function() {
                                Home.insertPerson('masonMarky', 'loadImportantEvent', 'questForMarla1a');
                            }
                        }]
                    },
                    questForMarla2: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "Thank you. I received a note from a friend, Marla, a couple of days ago. It's a miracle the note got to me at all, she sent it over a year ago."
                        },
                        options: [{
                            name: "Who is she?",
                            fn: function() {
                                $rootScope.importantEvent.load('questForMarla3');
                            }
                        }]
                    },
                    questForMarla3: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "Well, we used to be together... long time ago. Many years ago we lived nearby, but then her ambitions grew and we moved to Castle Grey together, she was teaching architecture to the royal family, and... I was a bricklayer. I was in a bad place, you know, it's hard to measure up to a successful wife... I drank, and drank, and drank... I... anyways, I did something horrible one night, so I just left. Haven't seen her for so long, but the note... said she was in Point Anne..."
                        },
                        options: [{
                            name: "Point Anne, that's one of The Warlord's fortresses now",
                            fn: function() {
                                $rootScope.importantEvent.load('questForMarla4');
                            }
                        }, {
                            name: "You weren't a mason?!?",
                            fn: function() {
                                $rootScope.importantEvent.load('questForMarla4a');
                            }
                        }]
                    },
                    questForMarla4: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "Yes, that one. Anyway, she has been working for the Warlord, but... as a slave and prisoner. She reached out to me for help, after all I've done! I can't, I have to help her! Let me go to Point Anne."
                        },
                        options: [{
                            name: "Go quick, Marla needs you",
                            fn: function() {
                                $rootScope.importantEvent.load('questForMarla5a');
                            }
                        }, {
                            name: "That letter is a year old, what if she's somewhere else now?",
                            fn: function() {
                                $rootScope.importantEvent.load('questForMarla5');
                            }
                        }]
                    },
                    questForMarla4a: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "No, no I was not, I was a fool, and a drunk. Don't tell Monty. That doesn't mean I'm not a mason now, I studied after I left her. I wanted to become successful myself. I went to Rugged Rapids, studied the architecture of the riverfolk."
                        },
                        options: [{
                            name: "Rugged Rapids, the fabled village of Heroes",
                            fn: function() {
                                $rootScope.importantEvent.load('questForMarla4');
                            }
                        }]
                    },
                    questForMarla5: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "I.. I need to speak with Monty then. Look, just don't tell him about the stuff that happened in Castle Grey, OK?"
                        },
                        options: [{
                            name: "OK",
                            fn: function() {
                                $rootScope.importantEvent.load('questForMarla7');
                            }
                        }]
                    },
                    questForMarla5a: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "Thank you... I will try to be back"
                        },
                        fn: function() {
                            $rootScope.world.home.mason.number--;
                            Engine.insert(30 * $rootScope.STEPSPERDAY, 'loadImportantEvent', ['questForMarla6']);
                        },
                        options: [{
                            name: "*Wave goodbye*"
                        }]
                    },
                    questForMarla6: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "Hi " + $rootScope.player.name + ", where's Monty? I need to talk with him."
                        },
                        fn: function() {
                            $rootScope.world.home.mason.number++;
                            Engine.insert(40 * $rootScope.STEPSPERDAY, 'loadImportantEvent', ['meetMasonMeow']);
                        },
                        options: [{
                            name: "Welcome back? He's at the Guild",
                            fn: function() {
                                loadNextImportantEvent('questForMarla7');
                            }
                        }]
                    },
                    questForMarla7: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return "Hello " + $rootScope.player.name + ", hello Monty, good to see ya, how did the you know what go?"
                        },
                        options: [{
                            name: "*continue*",
                            fn: function() {
                                loadNextImportantEvent('questForMarla8');
                            }
                        }]
                    },
                    questForMarla8: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "No go, that's why I'm here. " + $rootScope.player.name + " knows about Marla. Remember who delivered the note?"
                        },
                        options: [{
                            name: "*continue*",
                            fn: function() {
                                loadNextImportantEvent('questForMarla9');
                            }
                        }]
                    },
                    questForMarla9: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return "Yeh, tall bloke, dark skin, found you by name. Think somebody called him Strider or some nonsense like that"
                        },
                        options: [{
                            name: "*continue*",
                            fn: function() {
                                loadNextImportantEvent('questForMarla10');
                            }
                        }]
                    },
                    questForMarla10: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "Yes, him. I saw him again today, on the road heading to Madawaska. He had an archmasons pin, Monty. An Archmasons Pin."
                        },
                        options: [{
                            name: "What's that?",
                            fn: function() {
                                loadNextImportantEvent('questForMarla11');
                            }
                        }]
                    },
                    questForMarla11: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return "The... Archmasons Pin is a special pin made for the highest echelons of masons of the old Royal Masons Guild. He seriously had one?"
                        },
                        options: [{
                            name: "He, what? who?",
                            fn: function() {
                                $rootScope.importantEvent.load('questForMarla12');
                            }
                        }]
                    },
                    questForMarla12: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "Yes, I am certain of it. How many mornings have I witnessed Marla putting it on! So I asked him about it, he was given the pin by an old friend a few years ago, Mason Moe, when he went into hiding. I've met Mason Moe before, he used to be well recognized. Look, we find him, he could tell us where Marla is, and he was apparently running a small shop with his wife in rural country of Madawaska."
                        },
                        options: [{
                            name: "Madawaska, a few years ago, do you think he would still be there now?",
                            fn: function() {
                                $rootScope.importantEvent.load('questForMarla13');
                            }
                        }]
                    },
                    questForMarla13: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "It's worth a shot. I'd recognize him in a heartbeat. Madawaska is not too far, I can ask around and report back in ten days, at most."
                        },
                        options: [{
                            name: "I suppose",
                            fn: function() {
                                $rootScope.importantEvent.load('questForMarla14');
                            }
                        }, {
                            name: "Not right now, maybe later?",
                            fn: function() {
                                $rootScope.importantEvent.load('questForMarla14a');
                            }
                        }]
                    },
                    questForMarla14: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "Thank you, I will be back in 10 days!";
                        },
                        fn: function() {
                            $rootScope.world.home.mason.number--;
                            Engine.insert(10 * $rootScope.STEPSPERDAY, 'loadImportantEvent', ['welcomeMoe']);
                        },
                        options: [{
                            name: "Take care!"
                        }]
                    },
                    questForMarla14a: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return "Good advice, I reckon you take it Marky. " + $rootScope.player.name + " will let you know when is a better time to go"
                        },
                        fn: function() {
                            Home.insertPerson('masonMarky', 'loadImportantEvent', 'questForMarla15');
                        },
                        options: [{
                            name: "Thank you"
                        }]
                    },
                    questForMarla15: {
                        speakerid: 'masonMarky',
                        fn: function() {
                            Home.removePerson('masonMarky');
                        },
                        text: function() {
                            return "Madawaska won't take long, I can go right now if you'll let me. We'll find Moe, and track down Marla"
                        },
                        options: [{
                            name: "Sorry, not yet",
                            fn: function() {
                                Home.insertPerson('masonMarky', 'loadImportantEvent', 'questForMarla15');
                            }
                        }, {
                            name: "Yes, you can go now",
                            fn: function() {
                                $rootScope.world.home.mason.number--;
                                $rootScope.fns.setStatus('masonMarky', 'Looking for Mason Moe in Madawaska');
                                Engine.insert(15 * $rootScope.STEPSPERDAY, 'loadImportantEvent', ['welcomeMoe']);
                            }
                        }]
                    },
                    welcomeMoe: {
                        speakerid: 'masonMarky',
                        fn: function() {
                            $rootScope.world.home.mason.number++;
                            $rootScope.fns.setStatus('masonMarky', 'Working');
                        },
                        text: function() {
                            return "Ahoy! " + $rootScope.player.name + ", sorry I've been gone so long!"
                        },
                        options: [{
                            name: "Welcome! Who's your friend?",
                            fn: function() {
                                loadNextImportantEvent('welcomeMoe2');
                            }
                        }]
                    },
                    welcomeMoe2: {
                        speakerid: 'masonMoe',
                        text: function() {
                            return "Greetings. I am Moe. Your friend here was quite persistent on coming out of my peace and quiet life"
                        },
                        options: [{
                            name: "Marky, what have you done?",
                            fn: function() {
                                loadNextImportantEvent("welcomeMoe3");
                            }
                        }, {
                            name: "*hold your tongue*",
                            fn: function() {
                                loadNextImportantEvent("welcomeMoe3");
                            }
                        }]
                    },
                    welcomeMoe3: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "That ain't living, Moe. You used to design magnificent towers and - "
                        },
                        options: [{
                            name: "*continue*",
                            next: 'welcomeMoe4'
                        }]
                    },
                    welcomeMoe4: {
                        speakerid: 'masonMoe',
                        text: function() {
                            return "And now look what they're being used for. Stockades, dungeons. In the hands of The Warlord, everything stronger than pudding is vile. *sigh* but what is done is done, I am here to offer you my services as a mason. With my expertise, we can soon see a city that stands the test of time!"
                        },
                        options: [{
                            name: "Welcome aboard!",
                            next: 'welcomeMoe5'
                        }]
                    },
                    welcomeMoe5: {
                        speakerid: 'masonMoe',
                        fn: function() {
                            $rootScope.world.home.mason.number++;
                            $rootScope.fns.setStatus('masonMoe', 'Working');
                            $rootScope.fns.getNPC('masonMoe');
                            $rootScope.itemList.sector_civil.points += 2;
                            var msg = 'Mason Moe gave you 2 Civil Points';
                            Engine.log(msg);
                            Engine.createNotification(msg);
                        },
                        text: function() {
                            return "Great! Now where's the tavern, I need a drink."
                        },
                        options: [{
                            name: "*End*"
                        }]
                    },
                    travellingScholars: {
                        speakerid: 'oldMan',
                        text: function() {
                            return '*cough* Greetings ' + $rootScope.fns.getTitle() + ', may I ask a favour?';
                        },
                        options: [{
                            name: "Not now",
                            fn: function() {
                                Home.insertPerson('oldScholar', 'loadImportantEvent', 'resumeScholar');
                            }
                        }, {
                            name: "How may I help you?",
                            next: 'travellingScholars2'
                        }]
                    },
                    resumeScholar: {
                        speakerid: 'oldMan',
                        text: function() {
                            return 'Ahhh, the busy one returns. Curiosity got the better of you eh? That\'s fine - curiosity is a good trait'
                        },
                        options: [{
                            name: 'Actually... nevermind',
                            fn: function() {
                                Home.insertPerson('oldScholar', 'loadImportantEvent', 'resumeScholar');
                            }
                        }, {
                            name: 'Yes, I am interested in what you have to say',
                            next: 'travellingScholars2'
                        }]
                    },
                    travellingScholars2: {
                        speakerid: 'oldMan',
                        text: function() {
                            return 'Thank you ' + $rootScope.fns.getTitle() + ', my companions and I have travelled from very very far, across the Great Sea past the mountain ranges to the East. There is a war in my home nation, we are refugees. Rumours from travellers and sailors speak of ' + $rootScope.world.home.name + ' as a place that welcomes knowledge and discovery';
                        },
                        options: [{
                            name: "Indeed that is what we are, you are welcome to stay",
                            next: 'travellingScholars3'
                        }, {
                            name: "You may stay, but this is not a place of knowledge and discovery. We are at war here too!",
                            next: 'travellingScholars3a'
                        }]
                    },
                    travellingScholars3: {
                        speakerid: 'oldMan',
                        fn: function() {
                            this.parsedText = 'You are most generous. My companions and I will stay useful, but we will require lodging.';

                            if ($rootScope.player.gold >= 10 * 108 * 197) {
                                this.parsedText += 'Eventually we would like a place to study built in a fashion similar to our university at home. In exchange we will share with you all that we learn.';
                                Player.unlock('porcelainTower');
                                this.options[0].hidden = false;
                                this.options[1].hidden = true;

                            } else {
                                this.parsedText += 'Feel free to come talk to me whenever... we have much to share, I\'m sure';
                                Home.insertPerson('oldMan', 'loadImportantEvent', 'talkAboutUniversity');
                                this.options[0].hidden = true;
                                this.options[1].hidden = false;
                            }
                        },
                        text: function() {
                            return this.parsedText;
                        },
                        options: [{
                            name: 'What is this university you speak of?',
                            next: 'explainUniversity'
                        }, {
                            name: 'Thank you, I hope our accomodations here are adequate'
                        }]
                    },
                    explainUniversity: {
                        speakerid: 'oldMan',
                        fn: function() {
                            this.parsedText = 'In our home land, we had a tower adorned with art and literature from which we learned from the experiences of the world. Knowledge would come, and we would learn, then teach. This helped our beloved nation to prosper. Before the corruption of course. What a wonder it will be to one day... I know this is a great task to ask of you, but if you let us show you how, we can build a university here that rivals, or even exceeds the expectation of any scholar in the world.'
                        },
                        text: function() {
                            return this.parsedText;
                        },
                        options: [{
                            name: 'That would be great!',
                            fn: function() {
                                Player.unlock('porcelainTower');
                                var msg = 'You have unlocked the Porcelain Tower from the Travelling Scholars';
                                Engine.log(msg);
                                Engine.createNotification(msg);
                            }
                        }]
                    },
                    travellingScholars3a: {
                        speakerid: 'oldMan',
                        fn: function() {
                            Home.insertPerson('oldMan', 'loadImportantEvent', 'talkAboutUniversity');
                        },
                        text: function() {
                            return "I understand. We will be available when you wish to discuss about... something we might find to be mutually beneficial"
                        },
                        options: [{
                            name: "Good bye"
                        }]
                    },
                    talkAboutUniversity: {
                        speakerid: 'oldMan',
                        fn: function() {
                            this.parsedText = 'Hello again, ' + $rootScope.fns.getTitle() + '. ';

                            this.parsedText += 'I am certain you have come to ask about our craft. My companions and I are from beyond the Great Sea, in a foreign land torn by war much like here. It wasn\'t always like so. Our nation was once the center of prosperity. We had built magnificent cities, united millions of people, but our greatest achievement was a Great Library that contained thousands of texts from around the world. We were knowledge seekers.'

                        },
                        text: function() {
                            return this.parsedText
                        },
                        options: [{
                            name: "What happened?",
                            next: 'talkAboutUniversity2'
                        }]
                    },
                    talkAboutUniversity2: {
                        speakerid: 'oldMan',
                        text: function() {
                            return 'War. War changes men. Barbarian invasions and quarrels with our neighbours stretched our forces too thin. Then, merely five years ago, our city fell. The scholars split the scrolls and promised to spread them to everyone with the hope that with knowledge spread, we will prevent one nation from rising above and beyond others.'
                        },
                        options: [{
                            name: 'What would you need from us?',
                            next: 'talkAboutUniversity3'
                        }]
                    },
                    talkAboutUniversity3: {
                        speakerid: 'oldMan',
                        fn: function() {
                            Player.unlock('porcelainTower');
                            Engine.insert(600, 'loadImportantEvent', ['montyTalkAboutUniversity']);
                        },
                        text: function() {
                            return 'We would like to build a building simlar to what we had before, a porcelain tower. You may give this to your mason (a blueprint of the tower). Once complete, we will begin acquiring knowledge from your locals and beyond. Now, I must return to my companions, we have much to organize.'
                        },
                        options: [{
                            name: "Thank you"
                        }]
                    },
                    montyTalkAboutUniversity: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return 'When Marky and I were little, our father used to tell us stories about the fabled Porcelain Tower from the Land East. I can\'t believe that here, now, we have the chance to make it locally. ' + $rootScope.world.home.name + ' will be the center of knowledge and learning for the world!'
                        },
                        options: [{
                            name: "I look forward to that"
                        }]
                    },
                    warlordInvadedNephton: {
                        speakerid: 'masonMonty',
                        text: function() {
                            return 'Grim news, ' + $rootScope.fns.getTitle() + ', we just received news that The Warlord has attacked and taken Nephton. Thousands of people were displaced, we might be expecting some of them in the coming days'
                        },
                        options: [{
                            name: 'We should prepare then'
                        }]
                    },
                    ximniTale: {
                        speakerid: 'ximni',
                        text: function() {
                            return 'Excellent. I need your help, now. errr.. come with me, if you want to live!'
                        },
                        options: [{
                            name: 'Ok...',
                            next: 'ximniTale2'
                        }]
                    },
                    ximniTale2: {
                        speakerid: 'ximni',
                        text: function() {
                            return 'Do you know what this is? It is an altar. I\'ve kept it hidden for over a hundred years'
                        },
                        options: [{
                            name: "What is it for?",
                            next: 'ximniTale3'
                        }]
                    },
                    ximniTale3: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Don't ask questions. I need you to strip down. Naked. Now."
                        },
                        options: [{
                            name: "Hell no",
                            next: 'ximniTale4'
                        }, {
                            name: "I've been waiting for you to say that",
                            next: 'ximniTale4a'
                        }, {
                            name: "Why?",
                            next: 'ximniTale4b'
                        }]
                    },
                    ximniTale4: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Look, just do it. We won't harm you, I promise"
                        },
                        options: [{
                            name: "Excuse me, we?",
                            next: 'ximniTale5'
                        }, {
                            name: "How can I trust you?",
                            next: 'ximniTale5a'
                        }]
                    },
                    ximniTale4a: {
                        speakerid: 'ximni',
                        text: function() {
                            return "I... I... nobody has ever said anything like that to me before. Just do it ok, I'll look away"
                        },
                        options: [{
                            name: "Ha! okay",
                            next: 'ximniTale5b'
                        }]
                    },
                    ximniTale4b: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Tell yourself whatever you need to hear to do it. This is important, and we're almost out of time"
                        },
                        options: [{
                            name: "Fine",
                            next: 'ximniTale5d'
                        }, {
                            name: "Not until you answer my questions. What are we doing here, and why are we doing this?",
                            next: 'ximniTale5e'
                        }]
                    },
                    ximniTale5: {
                        speakerid: 'ximni',
                        text: function() {
                            return "The bees and I. Just... off, now. No more talking, we're almost out of time"
                        },
                        options: [{
                            name: "Fine.",
                            next: 'ximniTale6'
                        }, {
                            name: "I refuse",
                            next: 'ximniTale4b'
                        }]
                    },
                    ximniTale5a: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Let's just say the whole world's balance depends on this happening, right now, right here, before those bees. Are you going to be responsible for the collapse of your colony? Bee reasonable!"
                        },
                        options: [{
                            name: "Alright, lets hurry up",
                            next: 'ximniTale6f'
                        }, {
                            name: "No. I don't care, just no.",
                            next: 'ximniTale6g'
                        }]
                    },
                    ximniTale5b: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Great, now I need you to pour this honey all over your body. Yep, all over. I'll be just a moment, I need to prepare myself too."
                        },
                        options: [{
                            name: "You are into really freaky stuff, you know that?",
                            next: 'ximniTale6b'
                        }, {
                            name: "What's it for?",
                            next: 'ximniTale6c'
                        }]
                    },
                    ximniTale5d: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Thank you, now, pour this honey over your body, and hold this roll of wax"
                        },
                        options: [{
                            name: "That's not what I signed up for",
                            next: 'ximniTale6d'
                        }, {
                            name: "Whatever... (just do it)",
                            next: 'ximniTale6e'
                        }]
                    },
                    ximniTale5e: {
                        speakerid: 'ximni',
                        text: function() {
                            return "You talk too much. Enough time is wasted, we're doing this NOW!"
                        },
                        options: [{
                            name: "(An excruciating pain shoots up your back and into your head, it feels like your body is on fire)",
                            next: 'ximniTale7i'
                        }]
                    },
                    ximniTale6: {
                        speakerid: 'ximni',
                        text: function() {
                            return "That wasn't so hard now was it? Now, pour this honey over your body... oh, don't mind the bees, they know what we're doing"
                        },
                        options: [{
                            name: "*pour the honey, what could possibly go wrong?*",
                            next: 'ximniTale7'
                        }, {
                            name: "That wasn't part of the deal. No no no no no! Plus, I'm allergic! (that's a lie)",
                            next: 'ximniTale7a'
                        }]
                    },
                    ximniTale6b: {
                        speakerid: 'ximni',
                        text: function() {
                            return $rootScope.player.name + ", I have no comment. Just... one moment, okay, done."
                        },
                        options: [{
                            name: "What next?",
                            next: 'ximniTale7b'
                        }]
                    },
                    ximniTale6c: {
                        speakerid: 'ximni',
                        text: function() {
                            return "If I told you, I'll have to kill you. Nah, just maim you a bit. Don't worry I'll explain everything when we're done. Look, see, no harm will come from pouring honey over you"
                        },
                        options: [{
                            name: "Fine",
                            next: 'ximniTale7c'
                        }]
                    },
                    ximniTale6d: {
                        speakerid: 'ximni',
                        text: function() {
                            return "I will literally knock you out and smother you in honey if I have to, hurry up! The bees are getting impatient"
                        },
                        options: [{
                            name: "Okay okay!",
                            next: 'ximniTale7d'
                        }, {
                            name: "Try me",
                            next: 'ximniTale7e'
                        }]
                    },
                    ximniTale6e: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Great, hold still now, I need to put honey on myself too... won't be long"
                        },
                        options: [{
                            name: "*Continue*",
                            next: 'ximniTale7f'
                        }]
                    },
                    ximniTale6f: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Thank you, now pour this honey over yourself. We're almost out of time... quickly...."
                        },
                        options: [{
                            name: "*Continue*",
                            next: 'ximniTale7g'
                        }]
                    },
                    ximniTale6g: {
                        speakerid: 'ximni',
                        text: function() {
                            return "*sigh* I didn't want to do this. But you leave me no choice, the world must go on!"
                        },
                        options: [{
                            name: "*shield your face*",
                            next: 'ximniTale7h'
                        }]
                    },
                    ximniTale7: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Well done, looks good... now give me a moment, I need to do the same... Oh for heaven's sake, avert your eyes, pervert"
                        },
                        options: [{
                            name: "*look away*",
                            next: 'ximniTale8'
                        }, {
                            name: "*sneak a peek anyway*",
                            next: 'ximniTale8a'
                        }]
                    },
                    ximniTale7b: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Bzzz bzz bzzzzzz buzzzz bzz bzzz zzzz bzzzzb zzz!"
                        },
                        options: [{
                            name: "(You feel a tingling sensation)",
                            next: 'ximniTale9b'
                        }]
                    },
                    ximniTale7c: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Bzzz zzzz bzz bzbbb bbbzzzzzb bbbzzzz zzz uzzz bzzz..."
                        },
                        options: [{
                            name: "(You feel a swell of euphoria)",
                            next: 'ximniTale9c'
                        }]
                    },
                    ximniTale7d: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Bzzzz bzzz bzzz bzzz bzzz bzzz bzz bzzz"
                        },
                        options: [{
                            name: "(You feel your body go numb)",
                            next: 'ximniTale9d'
                        }]
                    },
                    ximniTale7e: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Bzzzzzz bzzz bzzzzzzz bzz bzzzzzzz..."
                        },
                        options: [{
                            name: "(You feel yourself losing conscious)",
                            next: "ximniTale9b"
                        }]
                    },
                    ximniTale7f: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Bzzzz bzzzzzz zzzzzz bzzzzzzz bzzzz"
                        },
                        options: [{
                            name: "(You feel oddly joyous)",
                            next: 'ximniTale9c'
                        }]
                    },
                    ximniTale7g: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Bzz BBBBBBbbb zzzzzzzzzz ZZZbbz zbzzzzz"
                        },
                        options: [{
                            name: "(You feel abuzz with curiosity)",
                            next: 'ximniTale9b'
                        }]
                    },
                    ximniTale7h: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Bzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz...."
                        },
                        options: [{
                            name: "(You feel a sharp pain crawl up your leg)",
                            next: 'ximniTale9a'
                        }]
                    },
                    ximniTale8: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Bzzzzz zzzz bzz bzz bzzzz bbbbzzz bbz zzz bzzzzzz"
                        },
                        options: [{
                            name: "(You feel light headed, about to pass out...)",
                            next: 'ximniTale9a'
                        }]
                    },
                    ximniTale8a: {
                        speakerid: 'ximni',
                        text: function() {
                            return "BZZZzzzzz bZZzzzz ZZzzzZZZ..."
                        },
                        options: [{
                            name: "(You tried peeking but your vision goes blurry...)",
                            next: 'ximniTale9d'
                        }]
                    },
                    ximniTale9a: {
                        speakerid: 'ximni',
                        text: function() {
                            return "It is done. I must go now, but before I go, the Great Spirit of Bees have granted you the Blessing of the Stinger"
                        },
                        options: [{
                            name: "What is it?",
                            fn: function() {
                                Player.unlock('blessingStinger')
                            }
                        }]
                    },
                    ximniTale9b: {
                        speakerid: 'ximni',
                        text: function() {
                            return "It's over, the ritual is done. I must leave now, but before I go, the Great Spirit of Bees have granted you the Blessing of the Swarm"
                        },
                        options: [{
                            name: "Blessing of... what?",
                            fn: function() {
                                Player.unlock('blessingSwarm')
                            }
                        }]
                    },
                    ximniTale9c: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Success! The ritual is finished. Go now, I must leave as well. We shall meet again one day. For your service, the Great Spirit of Bees have granted you the Blessing of the Wind"
                        },
                        options: [{
                            name: "Thanks?",
                            fn: function() {
                                Player.unlock('blessingOfWind')
                            }
                        }]
                    },
                    ximniTale9d: {
                        speakerid: 'ximni',
                        text: function() {
                            return "Sweetness! The ritual is done. For your service, the Great Spirit of Bees have given you the Blessing of Honey. Use it wisely, I must leave now."
                        },
                        options: [{
                            name: "What's that supposed to mean?",
                            fn: function() {
                                Player.unlock('blessingOfHoney')
                            }
                        }]
                    },
                    explainSectorLevel: {
                        speakerid: 'system',
                        text: function() {
                            return "When you have workers assigned to jobs, they are gaining collective wisdom for the relevant Sector. Once the Sector levels up, you can spend a Sector Point on an unlockable tech in the Tech Tree"
                        },
                        options: [{
                            name: "Close"
                        }]
                    },
                    mysteriousEvent: {
                        fn: function() {
                            $rootScope.player.events.mysteriousEvent = 1;
                        },
                        speakerid: 'abby',
                        text: function() {
                            return "Did you feel that? That was weird... something seems off..."
                        },
                        options: [{
                            name: "I did feel that, looks like everybody felt it",
                            next: "mysteriousEvent2"
                        }]
                    },
                    mysteriousEvent2: {
                        speakerid: 'abby',
                        text: function() {
                            return "What was it?"
                        },
                        options: [{
                            name: "I don't know... maybe nothing"
                        }]
                    },
                    fishingCommunityHelp: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return $rootScope.fns.getTitle() + ", if you're not too busy, I was just talking with some people passing by the forest. Seems like a neutral fishing community near us are having problems. Seems their river is drying up!";

                        },
                        options: [{
                            name: "Sounds bad, how many people?",
                            next: "fishingCommunityHelp2"
                        }]
                    },
                    fishingCommunityHelp2: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "A hundred, maybe? But I was thinking, we could do something about it. There is a river that flows from the mountains north of us. The land around that area is not very fertile, and the position is indefensible and crawling with wolves."
                        },
                        options: [{
                            name: "Continue",
                            next: "fishingCommunityHelp3"
                        }]
                    },
                    fishingCommunityHelp3: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "I've already spoken to Monty about this, and he agrees it's possible to divert the river to flow through our land and come out by this fishing community"
                        },
                        options: [{
                            name: "Interesting, what can we hope to gain from this?",
                            next: "fishingCommunityHelp4"
                        }]
                    },
                    fishingCommunityHelp4: {
                        speakerid: 'masonMarky',
                        text: function() {
                            return "As if helping a hundred souls isn't worth while? Having access to a river could open all sorts of doors for us - being able to fish is one, and that's just the beginning! I'm sure the fishing folks would be grateful, maybe even let us use their land.";
                        },
                        options: [{
                            name: "That is a good proposition! Let's see the plan you have for diverting the river",
                            fn: function() {
                                Player.unlock('dam');
                            }
                        }]
                    },
                    fishingCommunityHelpSuccess: {
                        speakerid: 'abby',
                        text: function() {
                            return "Wow! The river! It's soooo cool! Monty said he's going to go fishing some time. He also said that the leader of the fishing clan is letting us use their land and they'll even teach me how to fish!"
                        },
                        options: [{
                            name: "That's great! I can't wait to see what you catch",
                            fn: function() {
                                Player.unlock('basicFishing');
                                $rootScope.player.events.fishingCommunityHelpSuccess = true;
                                $rootScope.fns.calcSpaceAvailable();
                            }
                        }]
                    },
                    abbysParents1: {
                        speakerid: 'rangerRenji',
                        text: function() {
                            return "Greetings " + $rootScope.fns.getTitle() + ", I am Renji, of the Seventh Legion of Rangers. I am here by direct orders from The Princess to assess the defensibility of this village"
                        },
                        options: [{
                            name: "What could The Princess possibly want with that information?",
                            next: "abbysParents2"
                        }]
                    },
                    abbysParents2: {
                        speakerid: 'rangerRenji',
                        text: function() {
                            return "To protect trade routes " + $rootScope.fns.getTitle()
                        },
                        options: [{
                            name: "We have no contract with The Princess",
                            next: "abbysParents3"
                        }]
                    },
                    abbysParents3: {
                        speakerid: 'rangerRenji',
                        text: function() {
                            return "Be that as it may, a number of merchants loyal to Her Majesty travels through here"
                        },
                        options: [{
                            name: "And?",
                            next: "abbysParents4"
                        }]
                    },
                    abbysParents4: {
                        speakerid: 'abby',
                        text: function() {
                            return "Uncle Renji? Is that you?!"
                        },
                        options: [{
                            name: "*continue*",
                            next: "abbysParents5"
                        }]
                    },
                    abbysParents5: {
                        speakerid: 'rangerRenji',
                        text: function() {
                            return "Abby! Oh dear lord, you are alive! Here, of course! My sweet child, I had hoped to find you"
                        },
                        options: [{
                            name: "Uncle..?",
                            next: "abbysParents6"
                        }]
                    }
                }
            }

            //list of conditions
            $rootScope.conditions = {
                hasGood: function(itemId) {
                    return $rootScope.player.inventory[itemId] || 0;
                },
                importantEventUsed: function(importantEvent) {
                    return $rootScope.importantEvent[importantEvent].used || false;
                },
                playerEventCount: function(eventId) {
                    return $rootScope.player.events[eventId] || 0;
                },
                taskWorkers: function(taskId) {
                    return $rootScope.itemList[taskId].number;
                }
            }

            $rootScope.checkCondition = function(conditionId, params, expected) {
                if (!Array.isArray(params)) {
                    params = [params];
                }
                return $rootScope.conditions[conditionId].apply(this, params) == expected;
            }

            $rootScope.getParsedText = function(text) {
                var he, him, his;

                if ($rootScope.player.gender == 'male') {
                    he = 'he';
                    him = 'him';
                    his = 'his';
                    lord = 'lord';
                } else {
                    he = 'she';
                    him = 'her';
                    his = 'hers';
                    lord = 'lady';
                }
                return $sce.trustAsHtml(text.replace(/\$playername\$/g, $rootScope.player.name).replace(/\$he\$/g, he).replace(/\$him\$/g, him).replace(/\$his\$/g, his));
            }



            $rootScope.getFaceStyle = function(name) {
                var bg = 'url(\'images/icons/faces/' + name + '.jpg\')';
                return {
                    'background-image': bg,
                }
            }

            $rootScope.updateHomeName = function() {
                $rootScope.world.home.name = (Home.getLevel($rootScope.world.home.level)).prefix + ' of ' + $rootScope.world.home.placeName;
                $rootScope.itemList.homeZone.name = $rootScope.world.home.name;
            }


            window.musicPlayer = $rootScope.musicPlayer = {
                playlist: [{
                    filename: 'Home-Forest.mp3',
                    title: 'Home Forest - Eric Matyas - www.soundimage.org',
                    tags: ['home', 'spring', 'summer', 'autumn', 'winter']
                }, {
                    filename: 'The-Seventy-Seas.mp3',
                    title: 'The Seventy Seas - Eric Matyas - www.soundimage.org',
                    tags: ['summer']
                }, {
                    filename: 'Enchanted-Woods.mp3',
                    title: 'Enchanted Woods - Eric Matyas - www.soundimage.org',
                    tags: ['forest', 'field', 'spring', 'summer', 'autumn']
                }, {
                    filename: 'Introspection.mp3',
                    title: 'Introspection - Eric Matyas - www.soundimage.org',
                    tags: ['university', 'council', 'militaryCouncil']
                }, {
                    filename: 'The-Village.mp3',
                    title: 'The Village - Eric Matyas - www.soundimage.org',
                    tags: ['home', 'council', 'university', 'field']
                }, {
                    filename: 'Tough-Choices.mp3',
                    title: 'Tough Choices - Eric Matyas - www.soundimage.org',
                    tags: ['university', 'council', 'militaryCouncil', 'masonsGuild']
                }, {
                    filename: '96-Blocks.mp3',
                    title: '96 Blocks - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Ancient-Construction.mp3',
                    title: 'Ancient Construction - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Autumn-Changes.mp3',
                    title: 'Autumn Changes - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Awkward-Princess_v001.mp3',
                    title: 'Awkward Princess - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Bustling-Ancient-City.mp3',
                    title: 'Bustling Ancient City - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Cool-Adventure-Intro.mp3',
                    title: 'Cool Adventure Intro - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Forest-Chase.mp3',
                    title: 'Forest Chase - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Happy-Hour.mp3',
                    title: 'Happy Hour - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Icicles.mp3',
                    title: 'Iciciles - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Impossible-Decision.mp3',
                    title: 'Impossible Decision - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Kingdom-of-Lost-Dreams.mp3',
                    title: 'Kingdom of Lost Dreams - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Lost-Meadow.mp3',
                    title: 'Lost Meadow - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Medieval-Halloween.mp3',
                    title: 'Medieval Halloween - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Melt.mp3',
                    title: 'Melt - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Morning-Frost.mp3',
                    title: 'Morning Forest - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Old-World-Vanishing.mp3',
                    title: 'Old World Vanishing - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'On-Things-to-Come.mp3',
                    title: 'On Things to Come - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Sculpture-Garden.mp3',
                    title: 'Sculpture Garden - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Secret-Journey.mp3',
                    title: 'Secret Journey - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Special-Day.mp3',
                    title: 'Special Day - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'SpringThaw.mp3',
                    title: 'Spring Thaw - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Sunrise.mp3',
                    title: 'Sunrise - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'The-Awkward-Princess-Returns.mp3',
                    title: 'The Awkward Princess Returns - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'The-Builders.mp3',
                    title: 'The Builders - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'The-Darkness-Below.mp3',
                    title: 'The Darkness Below - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Walled-City-of-Doom.mp3',
                    title: 'Walled City of Doom - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'Winter-Morning.mp3',
                    title: 'Winter Morning - Eric Matyas - www.soundimage.org'
                }, {
                    filename: 'a-transient-game.mp3',
                    title: 'A Transient Game - mattesar - www.soundcloud.com/mattesarmusic'
                }, {
                    filename: 'las-estrellas.mp3',
                    title: 'Las Estrellas - mattesar - www.soundcloud.com/mattesarmusic'
                }],
                initialized: false,
                index: null,
                playing: false,
                loaded: [],
                played: 0,
                volume: 50,
                shuffle: function() {
                    this.playlist = $rootScope.shuffle(this.playlist);
                },
                load: function(index) {
                    console.log('loading song ', index);
                    if (this.curSong) {
                        this.curSong.pause();
                        delete this.curSong;
                    }
                    this.played++;
                    if (this.played % this.playlist.length === 0) {
                        this.shuffle();
                    }
                    var found = false;
                    var filename = this.playlist[index].filename;
                    var audio = this.curSong = new Audio('/music/' + filename);
                    audio.autoplay = false;
                    audio.loop = false;
                    audio.volume = this.volume / 100;
                    this.currentlyPlaying = this.playlist[index].title;
                },
                play: function() {
                    this.playing = true;
                    var audio = this.curSong;
                    audio.play();
                    audio.addEventListener('ended', function() {
                        console.log('ended, selecting next');
                        musicPlayer.selectNext();
                        musicPlayer.play();
                    });
                },
                pause: function() {
                    this.playing = false;
                    this.curSong.pause();
                },
                resume: function() {
                    this.playing = true;
                    this.curSong.play();
                },
                selectNext: function() {
                    var index = this.played % this.playlist.length;
                    this.load(index);
                },
                toggleMusicEnabled: function() {
                    var mP = $rootScope.musicPlayer;
                    $rootScope.player.settings.musicEnabled = !$rootScope.player.settings.musicEnabled;
                    if ($rootScope.player.settings.musicEnabled) {
                        if (mP.initialized) {
                            if (mP.playing) {
                                mP.curSong.play();
                            }
                        } else {
                            mP.initialize();
                        }
                    } else {
                        if (mP.curSong) {
                            mP.curSong.pause();
                        }
                    }
                },
                initialize: function() {
                    console.log('musicPlayer init');
                    if (!this.initialized && $rootScope.player.settings.musicEnabled) {
                        this.initialized = true;
                        this.shuffle();
                        this.load(0);
                        this.play();
                    }

                }
            };

            $rootScope.$watch('musicPlayer.volume', function() {
                if ($rootScope.musicPlayer.curSong) {
                    $rootScope.musicPlayer.curSong.volume = $rootScope.musicPlayer.volume / 100;
                }
            });

            $rootScope.achievements = {} //to be filled out with createAchievement

            function createAchievement(id, name, description, level) {
                var unlocked = false;

                if ($rootScope.achievements[id]) {
                    unlocked = $rootScope.achievements[id].unlocked;
                }

                $rootScope.achievements[id] = {
                    id: id,
                    name: name,
                    description: description,
                    level: level,
                    unlocked: unlocked
                }
            }

            createAchievement('achieveSettlement', 'Settled Down', 'Your camp has become a settlement through the hard work of you and your people', 0);
            createAchievement('achieveVillage', 'Village Life', 'Your settlement has become a village, complete with thriving economy and sturdy infrastructure', 1);
            createAchievement('achieveTown', 'Town Status', 'Your village has earned a spot on the map thanks to your hard work', 2);
            createAchievement('achieveCity', 'City Builder', 'Not only have you thwarted threats, but have continually improved your town into a city', 3);

            createAchievement('achieveCenturion', 'Centurion', 'You have amassed an army of 100 units', 1);
            createAchievement('achieveCohort', 'Cohort', 'You have amassed an army of 500 units', 2);
            createAchievement('achieveLegion', 'Legion', 'You have amassed an army of 5000 units, go forth and dominate!', 3);

            createAchievement('achieveBenevolence', 'Benevolent Leader', 'You have won the heart and minds of your enemies, acquiring them through non-lethal means', 2);
            createAchievement('achieveFeared', 'Feared Leader', 'Your ruthlessness has opened the doors to many cities without struggle out of respect, or fear, of you', 2);
            createAchievement('achieveMight', 'Mighty Leader', 'Your military prowess has forced your opponents into obedience, and with no alternatives, join your side', 2);

            createAchievement('achieveGoldHoarder', 'Gold Hoarder', 'Careful economic management has amassed you a fortune over 1 million gold', 2);

            createAchievement('achieveLuxury', 'Luxury', 'Manors are for plebs, you moved into a chateau overlooking the city', 3);
            createAchievement('achieveExtravagance', 'Extravagance', 'Being too good for the city, you moved out to the country in your very own Estate', 4);

            createAchievement('achieveUnhygienic', 'Unhygienic', 'Well done, everyone is sick, even the cows', 0);

            createAchievement('achievementSurvivedWinter', 'Survived Winter', 'A year has passed and you have not given up, kudos', 0);


            $rootScope.dialogueUI = {
                display: false, //whether or not the UI is displayed
                curDialogue: null, //id of the current dialogue
                text: '', //the text of the current line
                curSpeakerId: '', //id of the current speaker (for purposes of obtaining the hint for the character)
                curOptions: [] //option objects of the form {text:<text>, go:<line id>}
            };

            //background image preloading

            function preloadImg(name) {
                var img = new Image();
                img.src = 'images/' + name + '.jpg';
            }

            preloadImg('camp');
            preloadImg('city');
            preloadImg('council');
            preloadImg('militaryCouncil');
            preloadImg('field');
            preloadImg('forest');
            preloadImg('market');
            preloadImg('mine');
            preloadImg('university');
            preloadImg('settlement');
            preloadImg('town');
            preloadImg('village');
            preloadImg('spring');
            preloadImg('summer');
            preloadImg('winter');
            preloadImg('autumn');

            $rootScope.reset();
            return {
                default: true
            };

        }
    ]);


function analyzeWatchers() {
    var root = angular.element(document.getElementsByTagName('html'));

    var watchers = [];

    var f = function(element) {
        angular.forEach(['$scope', '$isolateScope'], function(scopeProperty) {
            if (element.data() && element.data().hasOwnProperty(scopeProperty)) {
                angular.forEach(element.data()[scopeProperty].$$watchers, function(watcher) {
                    watchers.push(watcher);
                });
            }
        });

        angular.forEach(element.children(), function(childElement) {
            f(angular.element(childElement));
        });
    };

    f(root);

    // Remove duplicate watchers
    var watchersWithoutDuplicates = [];
    angular.forEach(watchers, function(item) {
        if (watchersWithoutDuplicates.indexOf(item) < 0) {
            watchersWithoutDuplicates.push(item);
        }
    });

    console.log(watchersWithoutDuplicates, watchers.length, watchersWithoutDuplicates.length);
    var exps = {};
    var c = 0;
    angular.forEach(watchers, function(watcher) {
        if (typeof watcher.exp == 'string') {
            exps[watcher.exp] = (exps[watcher.exp] || 0) + 1;
            c++;
        }
    });
    console.log(exps, c);
}

function _getRS() {
    return angular.element(document).scope();
}

function sortJSON(x) {
    var k = Object.keys(x);
    k.sort();
    var out = {};
    for (var i in k) {
        var id = k[i];
        out[id] = x[id];
    }
    return out;
}

function translate() {
    var s = arguments;
    var cur = [1, 108, 197 * 108, 208 * 197 * 108];
    var total = 0;
    for (var i in s) {
        total += s[i] * cur[s.length - 1 - i]
    }
    return total
}
