'use strict';

angular.module('prosperity').controller('MilontitaleCtrl', ['$sce', '$rootScope', '$scope', 'Engine', '$location', 'Home', 'Player', 'Game',
    function($sce, $rootScope, $scope, Engine, $location, Home, Player, Game) {

        $scope.lines = {
            0: {
                text: '$playername$! I am in such pain!',
                speakerId: 'milonti',
                choices: [{
                    go: '0a',
                    text: 'Sorry, I\'ll be back',
                    fn: function() {
                        $scope.story.curLine = '0a';
                        $scope.goHome();
                    }
                }, {
                    go: '1',
                    text: 'What\'s the matter?'
                }],
            },
            '0a': {
                text: 'You\'re back! Can you help me now?',
                speakerId: 'milonti',
                choices: [{
                    go: '0a',
                    text: 'Sorry, not yet',
                    fn: function() {
                        $scope.story.curLine = '0a';
                        $scope.goHome();
                    }
                }, {
                    go: '1',
                    text: 'Yes, what\'s the matter?'
                }]
            },
            1: {
                text: 'It\'s my beloved\'s mother, she won\'t let us be!',
                speakerId: 'milonti',
                choices: [{
                    go: '2',
                    text: 'What did she do?'
                }, {
                    go: '3',
                    text: 'Who is your beloved?'
                }]
            },
            2: {
                text: 'She caught me with Juliet walking hand in hand from the forest. After one look at me, she dragged Juliet away. I tried to stop her, but she attacked me with her walking stick!',
                speakerId: 'milonti',
                choices: [{
                    go: '4',
                    text: 'It is her right'
                }, {
                    go: '7',
                    text: 'That\'s horrible, take me to her right now!'
                }]
            },
            3: {
                text: 'Her name is Juliet, a maiden of such beauty my heart could sing for many moons, oh to spend my life with her!',
                speakerId: 'milonti',
                choices: [{
                    go: '4',
                    text: 'What does her mother have against you?'
                }, {
                    go: '5',
                    text: 'She sounds like a wonderful girl'
                }]
            },
            4: {
                text: 'I don\'t know! She is just a grouch! Please $playername$, help me',
                speakerId: 'milonti',
                choices: [{
                    go: '7',
                    text: 'OK, let\'s go talk with Juliet\'s mother'
                }, {
                    go: '0a',
                    text: 'Not yet, I will be back later',
                    fn: function() {
                        $scope.story.curLine = '0a';
                        $scope.goHome();
                    }
                }]
            },
            5: {
                text: 'Oh most wonderful indeed, I swear to the moon I shall have her one day, and be hers forevermore',
                speakerId: 'milonti',
                choices: [{
                    go: '6',
                    text: 'The moon changes constantly, will your love too?'
                }, {
                    go: '7',
                    text: 'Yup, you\'re hopeless. Let\'s see if her mother can knock some sense into you.'
                }]
            },
            6: {
                text: 'That\'s not what I meant, come now, will you help me or not?',
                speakerId: 'milonti',
                choices: [{
                    go: '4',
                    text: 'All right, I will help. What\'s wrong with her mother?'
                }, {
                    go: '7',
                    text: 'I will, let\'s go now'
                }]
            },
            7: {
                text: 'You again! Have you not learned not to touch my daughter you pervert?',
                speakerId: 'julietsMother',
                choices: [{
                    go: '8',
                    text: 'Milonti? Don\'t just stand there, say something.'
                }, {
                    go: '9',
                    text: 'Ma\'am, calm down, Milonti did nothing wrong, let\'s talk'
                }]
            },
            8: {
                text: '... Juliet and I are in love. You can\'t stop us!',
                speakerId: 'milonti',
                choices: [{
                    go: '9',
                    text: 'What he means is we should talk, he meant no harm.'
                }, {
                    go: '10',
                    text: '*facepalm* Ok, let me take it from here Milonti'
                }]
            },
            9: {
                text: 'This boy has no business with my daughter. All men are exactly the same, just use use use then leave without providing so much as a roof and four walls.',
                speakerId: 'julietsMother',
                choices: [{
                    go: '11',
                    text: 'Why so upset? Milonti is not one of those men.'
                }, {
                    go: '12',
                    text: 'Does Juliet think that of men as well?'
                }]
            },
            10: {
                text: 'Why are you helping this boy? My daughter doesn\'t want anything to do with him!',
                speakerId: 'julietsMother',
                choices: [{
                    go: '12',
                    text: 'Does Juliet really think that?'
                }, {
                    go: '11',
                    text: 'Milonti is a fine young man, why speak so harshly of him?'
                }]
            },
            11: {
                text: '*sigh* Look, Juliet is not your business, and neither is this boy. I must leave soon to scrub the floors of a dirty barn, just so we can have this sad excuse for a shack to sleep in.',
                speakerId: 'julietsMother',
                choices: [{
                    go: '13',
                    text: 'Wait, maybe I can help'
                }, {
                    go: '12',
                    text: 'I won\'t keep you, may I speak with Juliet?'
                }]
            },
            12: {
                text: 'Oh... good day $playername$, and hi Milonti. Sorry about Mother, she\'s had a hard day.',
                speakerId: 'juliet',
                choices: [{
                    go: '14',
                    text: '*restrain Milonti*'
                }, {
                    go: '15',
                    text: '*let Milonti speak*'
                }]
            },
            13: {
                text: 'Help? You hitting on me now? I should have you banished if you weren\'t so damn important. Look here now, I am off to scrub dirt. I expect you to leave - Juliet, lock up!',
                speakerId: 'julietsMother',
                choices: [{
                    go: '12',
                    text: '*wave to Juliet*'
                }, {
                    go: '15',
                    text: '*let Milonti speak to Juliet*'
                }]
            },
            14: {
                text: 'I\'m off to scrub dirt now. Juliet, lock up the house.',
                speakerId: 'julietsMother',
                choices: [{
                    go: '15',
                    text: '*move out of the way*'
                }]
            },
            15: {
                text: 'Juliet, oh I should have fought for you earlier.',
                speakerId: 'milonti',
                choices: [{
                    go: '16',
                    text: '*awkwardly listen to their conversation*'
                }, {
                    go: '17',
                    text: '*try to sneak away*'
                }]
            },
            16: {
                text: 'No, I\'m sorry, I didn\'t know she would act that way. But I need your help, right now!',
                speakerId: 'juliet',
                choices: [{
                    go: '17',
                    text: '*try to sneak away*'
                }, {
                    go: '18',
                    text: '*volunteer to help*'
                }]
            },
            17: {
                text: 'Wait, $playername$, maybe you can help me too! Pretty please?',
                speakerId: 'juliet',
                choices: [{
                    go: '18',
                    text: '(you have no choice, she has puppy eyes)'
                }]
            },
            18: {
                text: 'Remember the brooch, Milonti? I had it on earlier in the forest... I lost it, Milonti! I don\'t know what to do, I was going to sell it so Mother can take a break!',
                speakerId: 'juliet',
                choices: [{
                    go: '19',
                    text: 'Milonti and I can help you find it.'
                }]
            },
            19: {
                text: 'Will you? Thank you so much! It has a silver chain, a ruby center, and surrounded by garnet. I know I had it on in the forest, but we were in town for a while too, gosh I hope no-one stole it!',
                speakerId: 'juliet',
                choices: [{
                    go: '20',
                    text: 'Milonti, lets split up. You look in the forest and I will look around town'
                }]
            },
            20: {
                text: 'Where to look?',
                speakerId: null,
                choices: [{
                    go: '20a',
                    text: 'Town Center'
                }, {
                    go: '20b',
                    text: 'Milonti\'s house'
                }, {
                    go: '20c',
                    text: 'Herbalist Shop'
                }, {
                    go: '20d',
                    text: 'Smiths Corner'
                }, {
                    go: '20e',
                    text: 'Town Garden'
                }, {
                    go: '20f',
                    text: 'The Academy'
                }]
            },
            '20a': {
                text: 'You search high and low in the Town Center, no sign of the brooch, but given how busy it is, could have been stolen!',
                speakerId: null,
                choices: [{
                    go: '20b',
                    text: 'Milonti\'s house'
                }, {
                    go: '20c',
                    text: 'Herbalist Shop'
                }, {
                    go: '20d',
                    text: 'Smiths Corner'
                }, {
                    go: '20e',
                    text: 'Town Garden'
                }, {
                    go: '20f',
                    text: 'The Academy'
                }]
            },
            '20b': {
                text: 'You search around the outside of Milonti\'s house. The door is locked so you couldn\'t look in. No luck.',
                speakerId: null,
                choices: [{
                    go: '20a',
                    text: 'Town Center'
                }, {
                    go: '20c',
                    text: 'Herbalist Shop'
                }, {
                    go: '20d',
                    text: 'Smiths Corner'
                }, {
                    go: '20e',
                    text: 'Town Garden'
                }, {
                    go: '20f',
                    text: 'The Academy'
                }]
            },
            '20c': {
                text: 'You hurriedly searched the herbalist shop among the smells of fine herbs and smelly moulds, but couldn\'t find it',
                speakerId: null,
                choices: [{
                    go: '20a',
                    text: 'Town Center'
                }, {
                    go: '20b',
                    text: 'Milonti\'s house'
                }, {
                    go: '20d',
                    text: 'Smiths Corner'
                }, {
                    go: '20e',
                    text: 'Town Garden'
                }, {
                    go: '20f',
                    text: 'The Academy'
                }]
            },
            '20d': {
                text: 'You look around the corner of the city where the smiths work, there are lots of brooches being crafted, none of which fits the description',
                speakerId: null,
                choices: [{
                    go: '20a',
                    text: 'Town Center'
                }, {
                    go: '20b',
                    text: 'Milonti\'s house'
                }, {
                    go: '20c',
                    text: 'Herbalist Shop'
                }, {
                    go: '20e',
                    text: 'Town Garden'
                }, {
                    go: '20f',
                    text: 'The Academy'
                }]
            },
            '20e': {
                text: 'In the town garden, hidden just out of sight behind a patch of tulips, you find the brooch!',
                speakerId: null,
                choices: [{
                    go: '21',
                    text: 'Return to Juliet\'s house'
                }]
            },
            '20f': {
                text: 'Even among the brightest people, none has seen the brooch, they also suggest you look with a telescope.',
                speakerId: null,
                choices: [{
                    go: '20a',
                    text: 'Town Center'
                }, {
                    go: '20b',
                    text: 'Milonti\'s house'
                }, {
                    go: '20c',
                    text: 'Herbalist Shop'
                }, {
                    go: '20d',
                    text: 'Smiths Corner'
                }, {
                    go: '20e',
                    text: 'Town Garden'
                }]
            },
            21: {
                fn: function() {
                    $rootScope.itemList.juliet.playerOpinion.awe++;
                },
                text: 'You found it! Thank you so much! Milonti isn\'t back yet, would you like to come in and wait a bit?',
                speakerId: 'juliet',
                choices: [{
                    go: '22',
                    text: 'Certainly'
                }, {
                    go: '23',
                    text: 'I should return to my work'
                }]
            },
            22: {
                fn: function() {
                    $rootScope.itemList.juliet.playerOpinion.love++;
                },
                text: 'Sorry about the mess, Mother and I don\'t have much in the ways of maintenance.',
                speakerId: 'juliet',
                choices: [{
                    go: '24',
                    text: 'What happened to your father?'
                }]
            },
            23: {
                text: 'Very well then, thank you again for your help! Farewell! Feel free to come talk to me again whenever!',
                speakerId: 'juliet',
                choices: [{
                    go: '30',
                    text: 'Exit'
                }]
            },
            24: {
                text: 'He left when I was little. Mother said he went on vacation, I asked when he was coming back but she never answered.',
                speakerId: 'juliet',
                choices: [{
                    go: '25',
                    text: 'That must\'ve been hard for you'
                }, {
                    go: '26',
                    text: 'Maybe we should go find him'
                }, {
                    go: '27',
                    text: 'How dare he! I will drag him back here and torture him!'
                }]
            },
            25: {
                text: 'It was, but we manage. Milonti has been trying to help, but well, he\'s not the kind of help Mother needs.',
                speakerId: 'juliet',
                choices: [{
                    go: '28',
                    text: 'What kind of help do you and your Mother need?'
                }]
            },
            26: {
                text: 'My father? Ha! That was years ago, in a different town. I bet he\'s started a new family by now. Sometimes I wonder if he even thinks about us, if he cares that we are so desperate!',
                speakerId: 'juliet',
                choices: [{
                    go: '27',
                    text: 'What a monster! We need to hang him for all the hardships he put you through!'
                }, {
                    go: '29',
                    text: 'Perhaps I can help allieve some of your problems'
                }, {
                    go: '30',
                    text: 'I should go...',
                    fn: function() {
                        $scope.complete();
                    }
                }]
            },
            27: {
                fn: function() {
                    $rootScope.itemList.juliet.playerOpinion.fear++;
                },
                text: 'Oh no no no! I don\'t want that! He couldn\'t have known what leaving us could have done! No, we\'re just in a rough patch, everything will get better eventually...',
                speakerId: 'juliet',
                choices: [{
                    go: '28',
                    text: 'It will, I can help'
                }, {
                    go: '30',
                    text: 'Well, sounds like there is nothing I can do, good bye.',
                    fn: function() {
                        $scope.complete();
                    }
                }]
            },
            28: {
                fn: function() {
                    if ($rootScope.player.gold > 10000) {
                        this.choices.push({
                            go: '31',
                            text: 'It\'s not much, but here\'s 10ag to help',
                            fn: function() {
                                Player.pay({
                                    gold: 1080
                                });
                            }
                        });
                    } else {
                        this.choices.push({
                            go: '29',
                            text: 'I understand, it is tough for everyone right now. Perhaps I can perform some service?'
                        });
                    }
                },
                text: 'We could use more money of course, would be nice if Mother didn\'t have to scrub manure everyday...',
                speakerId: 'juliet',
                choices: [{
                    go: '30',
                    text: 'Don\'t we all, I\'m afraid I can\'t help you. Farewell!'
                }]
            },
            29: {
                text: 'Ha, I sure could use a hug.',
                speakerId: 'juliet',
                choices: [{
                    go: '30',
                    text: 'It\'s... getting late, I should go.',
                    fn: function() {
                        $scope.complete();
                    }
                }, {
                    go: '31',
                    text: '*Give a hug*'
                }]
            },
            30: {
                fn: function() {
                    Engine.insert(1500, 'eventJulietPursuit');
                    $scope.complete();
                }
            },
            31: {
                fn: function() {
                    $rootScope.itemList.juliet.playerOpinion.love++;
                    Engine.insert(1500, 'eventJulietPursuit');
                },
                text: 'Thank you $playername$, that helped. You should go though, Mother will be home soon, she won\'t want guests.',
                speakerId: 'juliet',
                choices: [{
                    go: '30',
                    text: 'See you around',
                    fn: function() {
                        $scope.complete();
                    }
                }]
            }
        };

        $scope.moveto = function(step) {
            //Game.changeSpeed($rootScope.engine.slowRate);
            if (typeof step === 'object') {
                if (step.fn) {
                    step.fn();
                }

                step = step.go;
            }
            $scope.story.curLine = step;
            $scope.curStep = $scope.lines[step];
            if ($scope.curStep) {
                if ($scope.curStep.fn) {
                    $scope.curStep.fn($scope);
                }
                if ($scope.curStep.text) {
                    $scope.lineText = $sce.trustAsHtml($scope.curStep.text.replace(/\$playername\$/g, $rootScope.player.name));
                } else {
                    $scope.lineText = '';
                }

                if ($scope.curStep.speakerId) {
                    $scope.curSpeaker = $rootScope.itemList[$scope.curStep.speakerId];
                } else {
                    $scope.curSpeaker = null;
                }
            } else {
                console.log('error finding line: ' + step);
                console.log($scope.lines);
            }

        }

        $scope.goHome = function() {
            //Game.changeSpeed($rootScope.engine.normalRate);
            Engine.start();
            $location.path('/prosperity/home');
        }

        $scope.complete = function() {
            $rootScope.story.milontiTale.canStart = false;
            $rootScope.story.milontiTale.completed = true;
            $scope.goHome();
            Home.removePerson('milonti');
        }

        $rootScope.$watch('configged', function(configged) {
            if (configged) {
                $scope.story = $rootScope.story.milontiTale;
                if (!$scope.story.curLine) {
                    $scope.story.curLine = 0;
                }
                $scope.moveto($scope.story.curLine);
            }
        });

        Engine.stop();

    }
]);