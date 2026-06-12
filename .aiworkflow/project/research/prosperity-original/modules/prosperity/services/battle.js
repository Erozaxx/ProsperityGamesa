'use strict';

angular.module('prosperity')
    .service('Battle', ['$rootScope', 'Player', 'Item', '$interval', 'Home', 'Engine',

        function Battle($rootScope, Player, Item, $interval, Home, Engine) {
            // AngularJS will instantiate a singleton by calling "new" on this function
            var tick = 30; //ms per tick

            function compareNum(a, b) {
                return a - b;
            }

            var battle = {
                ATTACKING: 'Attacking',
                DEFENDING: 'Defending',
                getZoneById: function(id) {
                    var ret = $rootScope.itemList[id];
                    if (ret && ret.type == 'zone') {
                        return ret;
                    } else {
                        return null;
                    }
                },
                getZonesByLiege: function(liegeId) {
                    var ret = [];
                    if ($rootScope.zones) {
                        for (var i = 0; i < $rootScope.zones.length; i++) {
                            if ($rootScope.zones[i].liege == liegeId) {
                                ret.push($rootScope.zones[i]);
                            }
                        }
                    } else {
                        $rootScope.zones = [];
                        angular.forEach($rootScope.itemList, function(obj, objid) {
                            if (obj.type == 'zone') {
                                $rootScope.zones.push($rootScope.itemList[objid]);
                                if (obj.liege == liegeId) {
                                    ret.push($rootScope.itemList[objid]);
                                }
                            }
                        });
                    }
                    return ret;
                },

                /*
                 * @param attackers - an object representing attackers, will have a name and number. In case of the player, name is 'player'
                 * at this point, we have already filled out the player and opponent stats, the actual curBattle is ready to be populated
                 * we don't know what the purpose of the fight is, unless it's a bandit raid.
                 * bandits want to raid for supplies from the player
                 * Princess/Psycho/Warlord wants to take the city
                 */
                create: function(zone, opponent, player) {
                    if (!$rootScope.curBattle) {
                        /*opponent information:
                            liege: the liege
                            warrior: {
                                number:
                                strength:
                                cd: //time between attacks
                            }
                            archer:{
                                number:
                                strength:
                                cd: //time between attacks
                            }
                            action: //Attacking or Defending
                            reaction: //speed of reactions
                        */

                        if (typeof opponent == 'String') {
                            opponent = {
                                liege: $rootScope.itemList[opponent],
                                archers: {},
                                warriors: {}
                            }
                        }

                        if (player == $rootScope.itemList.player || !player) {
                            //blegh, create a new obj. also, there should always be a player! ais don't fight each other for real, they just duke it out with RNGs

                            player = {
                                liege: $rootScope.itemList.player,
                                archers: {},
                                warriors: {}
                            }
                        }
                        $rootScope.curBattle = {
                            zone: zone,
                            opponent: opponent, //
                            player: player,
                            state: 0,
                            started: $rootScope.engine.curStep, //good for tracking
                            curStep: 0,
                            timer: null, //the timer promise
                            battleLog: [], //the battle log
                        };

                        player.archers = {
                            number: ~~player.archers.number || 0,
                            strength: player.liege.archers.strength,
                            defense: player.liege.archers.defense,
                            cd: 0,
                            cdPct: 100,
                            lastMaxCD: 100,
                            casualties: 0,
                            liege: $rootScope.itemList.player,
                            critChance: 0.1+($rootScope.itemList.blessingOfWind.unlocked ? 0.1 : 0)
                        };
                        player.warriors = {
                            number: ~~player.warriors.number || 0,
                            strength: player.liege.warriors.strength,
                            defense: player.liege.warriors.defense,
                            cd: 0,
                            cdPct: 100,
                            lastMaxCD: 100,
                            casualties: 0,
                            liege: $rootScope.itemList.player,
                            critChance: 0.1+($rootScope.itemList.blessingOfWind.unlocked ? 0.1 : 0)
                        };

                        opponent.warriors = {
                            strength: opponent.liege.warriors.strength,
                            defense: opponent.liege.warriors.defense,
                            cd: 0,
                            casualties: 0,
                            liege: opponent.liege,
                            critChance: 0.1
                        }

                        opponent.archers = {
                            strength: opponent.liege.archers.strength,
                            defense: opponent.liege.archers.defense,
                            cd: 0,
                            casualties: 0,
                            liege: opponent.liege,
                            critChance: 0.1
                        }

                        //setting up the player's archers and warriors
                        if (zone.liege == 'player') {
                            player.action = this.DEFENDING;
                            opponent.action = this.ATTACKING;
                            player.archers.number = ~~zone.archers;
                            player.warriors.number = ~~zone.warriors;

                            opponent.warriors.number = ~~opponent.invasion.warriors;
                            opponent.archers.number = ~~opponent.invasion.archers;

                        } else {
                            player.action = this.ATTACKING;
                            opponent.action = this.DEFENDING;

                            //player archer warrior counts are already set

                            opponent.archers.number = ~~zone.archers;
                            opponent.warriors.number = ~~zone.warriors;
                        }

                        //setting up some variables for ease
                        player.archers.liege = player.liege;
                        player.archers.type = 'archers';
                        player.warriors.liege = player.liege;
                        player.warriors.type = 'warriors';

                        opponent.archers.liege = opponent.liege;
                        opponent.archers.type = 'archers';
                        opponent.warriors.liege = opponent.liege;
                        opponent.warriors.type = 'warriors';

                        player.number = player.archers.number + player.warriors.number;
                        opponent.number = opponent.archers.number + opponent.warriors.number;

                        opponent.reaction = opponent.reaction || 60;

                        //create a starting summary
                        $rootScope.curBattle.startingSummary = {
                            attacking: (zone.liege == 'player' ? opponent : player),
                            defending: (zone.liege == 'player' ? player : opponent)

                        }

                        player.archers.startingNumber = player.archers.number;
                        player.warriors.startingNumber = player.warriors.number;

                        opponent.archers.startingNumber = opponent.archers.number;
                        opponent.warriors.startingNumber = opponent.warriors.number;

                        //add bonuses for wall and towers
                    } else {
                        console.log('error, a battle already exists: ' + $rootScope.curBattle);
                    }
                },
                delete: function() {
                    delete $rootScope.curBattle;
                },
                startBattle: function() {
                    var self = this;
                    if ($rootScope.curBattle) {
                        var cB = $rootScope.curBattle;

                        cB.state = 1;

                        cB.endSummary = {
                            winner: null,
                            p_archers: {
                                kills: 0,
                                casualties: 0
                            },
                            p_warriors: {
                                kills: 0,
                                casualties: 0
                            },
                            o_archers: {
                                kills: 0,
                                casualties: 0
                            },
                            o_warriors: {
                                kills: 0,
                                casualties: 0
                            }
                        };
                        $rootScope.curBattle.timer = $interval(function() {
                            //the fight loop
                            var zone = cB.zone;
                            var player = cB.player;
                            var opponent = cB.opponent;


                            if (cB.curStep % 80 == 30) {
                                //check for enemies
                                if (player.number == 0 || opponent.number == 0) {
                                    self.end();
                                }
                            }


                            if (player.warriors.cd > 0) {
                                player.warriors.cd--;
                                player.warriors.cdPct = 100 - ~~(player.warriors.cd * 100 / player.warriors.lastMaxCD);
                            }

                            if (player.archers.cd > 0) {
                                player.archers.cd--;
                                player.archers.cdPct = 100 - ~~(player.archers.cd * 100 / player.archers.lastMaxCD)
                            }

                            player.warriors.army = player.archers.army = player;

                            opponent.warriors.army = opponent.archers.army = opponent;

                            /*
                            //process the availability of wall and towers
                            var archers;
                            if (zone.liege == 'player') {
                                //player defending
                                archers = player.archers;
                            } else {
                                archers = opponent.archers;
                            }*/



                            //The A.I
                            var target = player;
                            if (opponent.warriors.number > 0) {
                                if (cB.curStep == opponent.reaction) { //first attack
                                    self.attackWith(opponent.warriors, self.attacks.warriors[0], target);
                                } else if (cB.curStep > opponent.reaction && opponent.warriors.cd == 0) {
                                    self.attackWith(opponent.warriors, self.attacks.warriors[0], target);
                                }

                                opponent.warriors.cd--;
                                if (opponent.warriors.cd < 0) {
                                    opponent.warriors.cd = 0;
                                }
                            }

                            if (opponent.archers.number > 0) {
                                if (cB.curStep == opponent.reaction + 20) {
                                    self.attackWith(opponent.archers, self.attacks.archers[0], target);
                                } else if (cB.curStep > opponent.reaction + 20 && opponent.archers.cd == 0) {
                                    self.attackWith(opponent.archers, self.attacks.archers[0], target);
                                }

                                opponent.archers.cd--;
                                if (opponent.archers.cd < 0) {
                                    opponent.archers.cd = 0;
                                }
                            }

                            cB.curStep++;
                        }, tick);
                    }

                },
                end: function() {
                    var self = this;
                    if ($rootScope.curBattle) {
                        var cB = $rootScope.curBattle;
                        $interval.cancel($rootScope.curBattle.timer);
                        //let's grab some stats for the summary:
                        cB.winner = cB.player.number > 0 ? cB.player : cB.opponent;
                        cB.loser = cB.player.number > 0 ? cB.opponent : cB.player;
                        cB.endSummary.winner = cB.winner.liege;

                        cB.state = 2;

                        //reviving troops
                        cB.player.revivedWarriors = Math.floor(cB.endSummary.p_warriors.casualties * ($rootScope.player.baseRevival + ($rootScope.itemList.fieldHospital.unlocked ? 0.15 : 0) + ($rootScope.itemList.blessingOfHoney.unlocked ? 0.1 : 0)));
                        cB.player.revivedArchers = Math.floor(cB.endSummary.p_archers.casualties * ($rootScope.player.baseRevival + ($rootScope.itemList.fieldHospital.unlocked ? 0.15 : 0) + ($rootScope.itemList.blessingOfHoney.unlocked ? 0.1 : 0)));
                        cB.player.warriors.number += cB.player.revivedWarriors;
                        cB.player.archers.number += cB.player.revivedArchers;

                        //recovery stats for the AI
                        cB.opponent.revivedArchers = ~~ (cB.endSummary.o_archers.casualties * Math.random() / 4); //revives a random amount of archers
                        cB.opponent.revivedWarriors = ~~ (cB.endSummary.o_warriors.casualties * Math.random() / 4);

                        cB.opponent.warriors.number += cB.opponent.revivedWarriors;
                        cB.opponent.archers.number += cB.opponent.revivedArchers;


                        if (cB.winner == cB.player) {
                            if (cB.player.action == self.ATTACKING) {
                                //player successfully attacked a town
                            } else {
                                //player successfully defended a town
                                cB.zone.archers = Math.floor(cB.player.archers.number);
                                cB.zone.warriors = Math.floor(cB.player.warriors.number);

                                if (cB.opponent.liege.id == 'bandits') {
                                    //bandits dropped stuff
                                    cB.loot = {
                                        gold: cB.endSummary.o_warriors.casualties * 40 + cB.endSummary.o_archers.casualties * 60,
                                        sword: ~~(cB.endSummary.o_warriors.casualties * 0.25),
                                        armour: ~~(cB.endSummary.o_warriors.casualties * 0.25),
                                        longbow: ~~(cB.endSummary.o_archers.casualties * 0.25)
                                    };

                                    var msg = 'You drove away the bandits, after the battle they dropped: ';
                                    for (var itemid in cB.loot) {
                                        msg += cB.loot[itemid] + ' ' + $rootScope.itemList[itemid].name + ' ';
                                    }
                                    Engine.log(msg);
                                    Player.insertInventory(cB.loot);
                                }
                            }

                        } else {
                            if (cB.player.action == self.ATTACKING) {
                                //player failed an attack
                                cB.player.warriors.number = 0;
                                cB.player.archers.number = 0;
                                $rootScope.itemList.homeZone.warriors += Math.floor(cB.player.warriors.number);
                                $rootScope.itemList.homeZone.archers += Math.floor(cB.player.archers.number);

                                cB.zone.warriors = cB.opponent.warriors.number;
                                cB.zone.archers = cB.opponent.archers.number;

                            } else {
                                //player failed to defend a town
                                if (cB.zone.id == 'homeZone') {
                                    //uh oh, defending home failed. what do we lose?
                                    cB.zone.archers = 0;
                                    cB.zone.warriors = 0;
                                    if (cB.opponent.liege.id == 'bandits') {
                                        //bandits, we lose resources and some workers
                                        var enemiesAlive = cB.opponent.warriors.number + cB.opponent.archers.number;
                                        cB.demand = {
                                            gold: Math.min(enemiesAlive * 5400, $rootScope.player.gold),
                                            armour: Math.min(enemiesAlive * 2, $rootScope.player.inventory.armour),
                                            sword: Math.min(enemiesAlive * 2, $rootScope.player.inventory.sword),
                                            longbow: Math.min(enemiesAlive * 2, $rootScope.player.inventory.longbow),
                                            quiver: Math.min(enemiesAlive * 6, $rootScope.player.inventory.quiver)
                                        };

                                        for (var i in cB.demand) {
                                            if (cB.demand[i] == 0) {
                                                delete cB.demand[i];
                                            }
                                        }

                                        if (cB.demand) {
                                            Player.pay(cB.demand);
                                            var msg = 'The bandits raided you and left with ';
                                            for (var itemid in cB.demand) {
                                                var amount = cB.demand[itemid];
                                                msg += (amount + ' ' + $rootScope.itemList[itemid].name + ' ');
                                            }
                                            self.log(msg);
                                            Engine.log(msg);
                                        } else {
                                            var msg = 'You lost the battle but the bandits did not take any resources'
                                            self.log(msg);
                                            Engine.log(msg);
                                        }

                                    } else {
                                        //damn, got attacked by an A.I, town gets razed

                                        //seriously, we need to know where to move the units back to, ai needs a capital, or a get capital
                                        var capital = $rootScope.fns.getCapital(cB.opponent.liege.id);
                                        capital.archers += cB.opponent.archers.number;
                                        capital.warriors += cB.opponent.warriors.number;

                                        var demand = {};
                                        var inv = $rootScope.player.inventory;
                                        var granary = $rootScope.world.home.foodStore;
                                        demand.gold = ~~ ($rootScope.player.gold / 2);

                                        angular.forEach(inv, function(amount, itemId) {
                                            if (Math.random() < 0.3) {
                                                demand[itemId] = ~~ (amount / 3);
                                            }
                                        });

                                        Player.pay(demand);
                                        var left = ~~ ($rootScope.world.home.curWorkers / 4);
                                        for (var i = 0; i < left; i++) {
                                            Player.cullWorker(null, 1);
                                        }

                                        $rootScope.itemList.homeZone.immunity = 210;
                                        Engine.insert(20, 'raidedByAI', [cB.opponent.liege.id, demand, left]);
                                    }

                                } else {
                                    //lose the vassal
                                    cB.zone.warriors = cB.opponent.warriors.number;
                                    cB.zone.archers = cB.opponent.archers.number;
                                    $rootScope.fns.takeOver(cB.opponent.liege.id, cB.zone.id);
                                }

                            }
                        }
                    }
                },
                log: function(msg, nameClass) {
                    $rootScope.curBattle.battleLog.unshift([msg, nameClass]);
                },
                getDamage: function(number, strength, multiplier, critChance) {
                    return Math.ceil(Math.max(Math.sqrt(number), number / 10) * strength * multiplier * (Math.random() < (critChance || 0) ? 1.5 : 1));
                },
                getDamageOf: function() {
                    var self = this;
                    var ret = 0;
                    angular.forEach(self.attacks, function(attackList, unit) {
                        for (var i = 0; i < attackList.length && !ret; i++) {
                            if (attackList[i].id === attackId) {
                                if ($rootScope.curBattle) {
                                    var _u = $rootScope.curBattle.player[unit];
                                    ret = self.getDamage(_u.number, _u.strength, attackList[i].multiplier);
                                }
                            }
                        }
                    });
                    return ret;
                },
                updatePowerOf: function(attack, unit) {
                    var self = this;
                    var _u = $rootScope.curBattle.player[unit];
                    attack.power = self.getDamage(_u.number, _u.strength, attack.multiplier);
                },
                attackWith: function(units, attack, target) {
                    var self = this;
                    var cB = $rootScope.curBattle;
                    var zone = $rootScope.curBattle.zone;
                    units.lastAttack = attack;
                    var canUse = false;

                    if (units.number > 0) {
                        if (units.cd == 0) {
                            //continue
                            canUse = true;
                            units.cd = attack.cd;
                            units.lastMaxCD = attack.cd;
                            if (units.type == 'archers' && $rootScope.itemList.thumbRing.unlocked) {
                                //we have thumbrings, archers attack 10% faster
                                units.cd = ~~ (0.9 * units.cd);
                            }
                        }

                        if (attack.focus.length > 0 && canUse) {
                            //is an attack
                            var focus = target[attack.focus[0]];
                            var strength = units.strength;

                            var damage = self.getDamage(units.number, strength, attack.multiplier);
                            var i = 0;
                            while (damage > 0 && focus) {
                                if (focus.number > 0) {
                                    var defense;
                                    var defenseCount = Math.sqrt(Math.min(focus.number, units.number)) / 2;
                                    if (defenseCount > 5) {
                                        defense = Math.ceil(focus.defense);
                                    } else {
                                        defense = Math.ceil(focus.defense * defenseCount);
                                    }

                                    if (focus.type == 'warriors' && focus.lastAttack && focus.lastAttack.id == 'shieldWall' && focus.cd > 0) {
                                        defense *= 2; //double defense for using shield wall
                                    }
                                    var dmg = Math.floor(damage / defense); //units killed
                                    var d0 = focus.number * defense; // the amount of effort it would've taken

                                    console.log(units.liege.id, damage, defense, dmg);
                                    damage -= d0; //reduce the effort from total damage

                                    if (dmg >= focus.number) {
                                        dmg = focus.number; //units killed is limited to units available
                                        target.number -= dmg;
                                        focus.number -= dmg;
                                        focus.casualties += dmg;
                                    } else {
                                        damage = 0;
                                        focus.number -= dmg;
                                        target.number -= dmg;
                                        focus.casualties += dmg;
                                    }

                                    if (units.liege.id == 'player') {
                                        if (units.type == 'archers') {
                                            cB.endSummary.p_archers.kills += dmg;
                                        } else if (units.type == 'warriors') {
                                            cB.endSummary.p_warriors.kills += dmg;
                                        }
                                    } else {
                                        if (units.type == 'archers') {
                                            cB.endSummary.o_archers.kills += dmg;
                                        } else if (units.type == 'warriors') {
                                            cB.endSummary.o_warriors.kills += dmg;
                                        }
                                    }

                                    if (target.liege.id == 'player') {
                                        if (attack.focus[i] == 'warriors') {
                                            cB.endSummary.p_warriors.casualties += dmg;
                                        } else if (attack.focus[i] == 'archers') {
                                            cB.endSummary.p_archers.casualties += dmg;
                                        }
                                    } else {
                                        if (attack.focus[i] == 'warriors') {
                                            cB.endSummary.o_warriors.casualties += dmg;
                                        } else if (attack.focus[i] == 'archers') {
                                            cB.endSummary.o_archers.casualties += dmg;
                                        }
                                    }

                                    var msg = (units.liege.id == 'player' ? 'Your troops' : (units.liege.name)) + ' incapacitated ' + dmg + ' ' + attack.focus[i] + ' with ' + attack.name;
                                    self.log(msg, target.liege.id);
                                }
                                i++;
                                focus = target[attack.focus[i]];
                            }

                            if (target.number <= 0) {
                                //no more enemies
                                //console.log(target);
                                //self.end();
                            }
                        } else if (attack.focus.length == 0 && canUse) {


                            if (attack.id == 'retreat') {
                                //retreat from the field
                                //check if warriors and archers are both cd == 0

                            } else if (attack.id == 'rally') {
                                //recover some fallen troops
                                var recovered = ~~ (units.casualties * 0.25);
                                console.log('recovering casualties', recovered);
                            } else {
                                self.log(attack.name + ' used');
                            }
                        } else {
                            //cd not 0
                            self.log('Your ' + units.type + ' are on cooldown: ' + units.cd * tick / 1000)
                        }
                    } else {
                        self.log('No units to use this attack');
                    }

                },
                //list of attacks
                attacks: {
                    warriors: [{
                        id: 'charge',
                        name: 'Charge',
                        multiplier: 1,
                        cd: 80,
                        description: 'Charge at the enemy, targeting warriors first, then archers',
                        focus: ['warriors', 'archers'],
                        icon: ' icon-crossed-swords'
                    }, {
                        id: 'shieldWall',
                        name: 'Shield Wall',
                        multiplier: 0,
                        cd: 150,
                        description: 'Renders warriors impervious to arrows. Reflects 50% of incoming damage from enemy warriors',
                        focus: [],
                        icon: 'icon-arrows-shield'
                    }, {
                        id: 'flank',
                        name: 'Flank',
                        multiplier: 1.8,
                        cd: 180,
                        description: 'Divide your troops and attack from 2 sides, focusing on the enemy\'s flank',
                        focus: ['archers', 'warriors'],
                        icon: 'icon-rally-the-troops'
                    }],
                    archers: [{
                        id: 'volley',
                        name: 'Volley',
                        multiplier: 0.7,
                        cd: 120,
                        description: 'Volley arrows at enemy archers, shoot at enemy warriors if there are no archers to kill',
                        focus: ['archers', 'warriors'],
                        icon: 'icon-arrow-flights'
                    }, {
                        id: 'fireArrows',
                        name: 'Fire Arrows',
                        multiplier: 1.5,
                        cd: 220,
                        description: 'Light up arrows with fire to deal devastating damage, targets enemy archers first',
                        focus: ['archers', 'warriors'],
                        icon: 'icon-energy-arrow'
                    }]
                }
            }
            return battle;
        }
    ]);