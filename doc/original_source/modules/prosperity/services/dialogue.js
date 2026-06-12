'use strict';

angular.module('prosperity')
    .service('Dialogue', ['$rootScope',
        function Dialogue($rootScope) {
            // AngularJS will instantiate a singleton by calling "new" on this function

            var dialogue = {
                openDialogue: function(dialogueId) {
                    var ui = $rootScope.dialogueUI;
                    ui.curDialogue = dialogueId;
                    var line = this.list[ui.curDialogue].lines[this.list[ui.curDialogue].curLine];
                    ui.curLineText = line.text;
                    ui.curSpeakerId = line.speakerId;
                    ui.curOptions = line.options;
                },
                init: function() {
                    this.list = $rootScope.dialogueList;
                    if (this.list.length == 0) {
                        buildDialogues();
                    }
                }
            }




            //creating dialogues
            function createDialogue(id) {
                dialogue.list[id] = {
                    id: id,
                    curLine: 0,
                    lines: {},
                    addLine: function(id, text, optionsArr, fn) {
                        this.lines[id] = {
                            id: id,
                            text: text,
                            options: optionsArr,
                            fn: fn
                        }
                    }
                }
            }

            function addLine(id, text, optionsArr) {

            }

            function buildDialogues() {
                $rootScope.dialogueList = {
                    //Milonti's Quest
                    //Starts off with the player talking with Milonti
                    milontiDialogue1: {
                        id: 'milontiDialogue1',
                        curLine: 0,
                    }



                }
            }
            return dialogue;

        }
    ]);