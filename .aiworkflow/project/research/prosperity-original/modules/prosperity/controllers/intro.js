'use strict';

angular.module('prosperity').controller('IntroCtrl', ['$sce', '$rootScope', '$scope', 'Game', '$state',
    function($sce, $rootScope, $scope, Game, $state) {
        if ($rootScope.player && $rootScope.player.profession) {
            Game.start();
            $rootScope.curPlaceId = 'home';
            $state.go('prosperity.home');
        }

        $scope.query = {
            PlayerName: false
        }

        $scope.lines = {
            0: {
                text: 'You are dizzy, everything hurts, the world is out of focus',
                choices: [{
                    id: 1,
                    text: 'Look around'
                }] //,{id:21, text:'skip'}]
            },
            1: {
                text: 'You are in a small room, on a soft bed. A couple is whispering inaudibly to each other',
                choices: [{
                    id: 2,
                    text: 'Reach out for them'
                }]
            },
            2: {
                text: 'They crouch over you, the woman cradled your head as the man offered you a cup of water, you caught a glimpse of your reflection',
                //choices:[{id:3, text:'Drink'}],
                fn: function(scope) {
                    scope.query.showFaces = true;

                    scope.faceChoices = ['female1', 'female2', 'female3', 'female4', 'female5','female6', 'male1', 'male2', 'male3', 'male4', 'male5', 'male6'];

                    scope.continue = function(face) {
                        $rootScope.player.face = face;
                        $rootScope.itemList.player.style = $rootScope.getFaceStyle(face);
                        if (face.substr(0, 4) == 'male') {
                            $rootScope.player.gender = 'male';
                        } else {
                            $rootScope.player.gender = 'female';
                        }
                        scope.playerObj = $rootScope.itemList.player;
                        scope.playerObj.name = '';
                        scope.moveto(3);
                    }
                }
            },
            3: {
                text: '"I am Ishna, and this is my husband Oakend," said the woman, "What is your name?"',
                fn: function(scope) {
                    scope.query.showFaces = false;
                    scope.query.PlayerName = true;
                },
                choices: [{
                    id: 4,
                    text: 'Answer'
                }]
            },
            4: {
                text: '"Well met, $playername$," replied Ishna. "We brought you here from the stream, looks like you had quite a fall"',
                fn: function(scope) {
                    if ($rootScope.player.name == '') {
                        $rootScope.player.name = 'Nameless';
                        this.text = '"One without a name, no problem Nameless," said Ishna. "We brought you here from the stream, looks like you had quite a fall"';
                    }

                    $rootScope.itemList.player.name = $rootScope.player.name;

                    scope.query.PlayerName = false;
                },
                choices: [{
                    id: 5,
                    text: 'I was being chased by minions of The Warlord'
                }, {
                    id: 6,
                    text: 'I was left to die by an execution squad'
                }, {
                    id: 7,
                    text: 'I slipped and fell'
                }]
            },
            5: {
                text: '"We were wondering why soldiers were patrolling the area," said Oakend. "No worries my friend, we are not with them"',
                choices: [{
                    id: 8,
                    text: 'Where am I?'
                }]
            },
            6: {
                text: '"Couldn\'t even bother to finish the job eh, what did you do?" asked Oakend',
                choices: [{
                    id: 9,
                    text: 'Long story... where am I?'
                }]
            },
            7: {
                text: '"Is that how you got all these gashes eh? Don\'t worry $playername$, we won\'t hurt you." said Oakend',
                choices: [{
                    id: 8,
                    text: 'Where am I?'
                }]
            },
            8: {
                text: '"This is our home, we live in a little community between Altona and Kitsilano, away from warlords and lieges," explained Ishna. She applied some balm on your leg wound.',
                choices: [{
                    id: 10,
                    text: 'What is that?'
                }]
            },
            9: {
                text: '"You\'re in a small autonomous community between Altona and Kitsilano," explained Ishna. "You don\'t look like a woodsman, what was your profession?"',
                choices: [{
                    id: 11,
                    text: 'I was a merchant (Better prices when buying/selling goods)'
                }, {
                    id: 12,
                    text: 'I was a scholar (25% faster level up for workers)'
                }, {
                    id: 13,
                    text: 'I was a commander (Base strength increased by 20%)'
                }, {
                    id: '13a',
                    text: 'I was a mason (Start with an extra mason for making buildings)'
                }]
            },
            10: {
                text: '"Herbs from the forest, I guess you\'re not a woodsman, or you would\'ve known. What is your profession?" inquired Ishna',
                choices: [{
                    id: 11,
                    text: 'I was a merchant (Better prices when buying/selling goods)'
                }, {
                    id: 12,
                    text: 'I was a scholar (25% faster level up for workers)'
                }, {
                    id: 13,
                    text: 'I was a commander (Base strength increased by 20%)'
                }, {
                    id: '13a',
                    text: 'I was a mason (Start with an extra mason for making buildings)'
                }]
            },
            11: {
                text: '"Fine job, none of us are here, we could learn something from you perhaps," said Oakend',
                choices: [{
                    id: 14,
                    text: 'Thank you'
                }],
                fn: function(scope) {
                    scope.player.profession = 'merchant'
                }
            },
            12: {
                text: '"Nice, I wanted to be a scholar too, once upon a time," said Oakend',
                choices: [{
                    id: 14,
                    text: 'It\'s never too late to learn'
                }],
                fn: function(scope) {
                    scope.player.profession = 'scholar'
                }
            },
            13: {
                text: '"Well, if you would like to lead a simpler life, I\'m sure your skillset can come in handy in the woods," said Oakend',
                choices: [{
                    id: 14,
                    text: 'We\'ll see'
                }],
                fn: function(scope) {
                    scope.player.profession = 'commander'
                }
            },
            '13a': {
                text: 'Excellent! We could always use more people who can build things that won\'t fall over in a stiff breeze!" said Oakend',
                choices: [{
                    id: 14,
                    text: 'Glad I will be useful'
                }],
                fn: function(scope) {
                    scope.player.profession = 'mason'
                }
            },
            14: {
                text: 'As the medicine started to take effect, you felt drowsy. As your consciousness slipped, you saw a little girl looking at you with wonder. <br>"Let $him$ sleep, Abby," urged Ishna',
                choices: [{
                    id: 15,
                    text: 'Smile and fall asleep'
                }]
            },
            15: {
                text: 'You woke to the sound of fighting. Ishna was bundling up Abby while Oakend guarded the door.',
                choices: [{
                    id: 16,
                    text: 'Get up and help Oakend'
                }, {
                    id: 17,
                    text: 'Get up and help Ishna'
                }]
            },
            16: {
                text: '"Shhhh," whispered Oakend. "These are the Warlord\'s men, I don\'t know why they\'re so far north, but stay down, you\'re still too injured to fight."',
                choices: [{
                    id: 18,
                    text: 'Stay down'
                }, {
                    id: 17,
                    text: 'Go help Ishna'
                }]
            },
            17: {
                text: '"There is a cellar to the back, its almost impossible to see at night. We will hide there if we have to," said Ishna as she tightly held Abby.',
                choices: [{
                    id: 18,
                    text: 'Stay hidden'
                }]
            },
            18: {
                text: 'You stay hidden. When the door finally broke down, Oakend charged at the attackers. Ishna handed you Abby to help her husband fight off the soldiers, but she too was soon overwhelmed. With their hands cuffed, you saw men in armour throw them onto a cart.',
                choices: [{
                    id: 19,
                    text: 'Sneak out the back'
                }]
            },
            19: {
                text: 'You muffled Abby\'s cries and snuck out the back of the house and down the cellar Ishna mentioned. There, you waited... and eventually the sounds of conflict died out.',
                choices: [{
                    id: 20,
                    text: 'Climb out of the cellar'
                }]
            },
            20: {
                text: 'You saw stacks of smoke from burnt homes. Not a whimper could be heard...<br>Abby held your hand, "Where\'s mom and dad?"',
                choices: [{
                    id: 21,
                    text: 'I don\'t know'
                }]
            },
            21: {
                fn: function(scope) {
                    $rootScope.checkPlayerDefaults();
                    if ($rootScope.player.profession == 'mason') {
                        $rootScope.world.home.mason.number = 1;
                    }
                    if ($rootScope.player.profession == 'merchant') {
                        $rootScope.player.haggleBuy -= 0.1;
                        $rootScope.player.haggleSell += 0.1;
                    }

                    $rootScope.world.home.placeName = $rootScope.player.name;

                    $rootScope.updateHomeName();
                    Game.start();

                    Game.save(true, null, $rootScope.curGameSave);
                    $rootScope.curPlaceId = 'home';
                    $state.go('prosperity.home');
                }
            }
        };

        $scope.getStyle = function(choice) {
            return $rootScope.getFaceStyle(choice);
        }
        $scope.moveto = function(step) {
            if (!step) {
                step = 0;
            }
            $scope.curStep = $scope.lines[step];
            if ($scope.curStep.fn) {
                $scope.curStep.fn($scope);
            }

            if ($scope.curStep.text) {
                $scope.lineText = $rootScope.getParsedText($scope.curStep.text);
            } else {
                $scope.lineText = '';
            }


        }

        $rootScope.$watch('configged', function(configged) {
            if (configged) {
                var intro = $rootScope.storyScreens.intro;
                if (intro) {
                    if (intro.state == 3) {
                        $state.go('prosperity.home');
                    } else if (intro.state == 0) {
                        $state.go('prosperity.intro');
                    } else {
                        if (!intro.curStep) {
                            intro.curStep = 0;
                        }
                        $scope.moveto(intro.curStep);
                    }
                }
            }
        });


    }
]);