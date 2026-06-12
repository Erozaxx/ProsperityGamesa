'use strict';

angular.module('prosperity')
    .service('Engine', ['$rootScope', '$timeout',
        function Engine($rootScope, $timeout) {
            $rootScope.gamelog = {
                displayed: false,
                hasNew: false,
                toggle: function(){
                    if(this.displayed){
                        this.displayed = false;
                    } else {
                        this.hasNew = false;
                        this.displayed = true;
                    }
                },
                init: function(){
                    var html = "";
                    for(var i = 0; i < $rootScope.engine.logs.length; i++){
                        html+=("<div>"+$rootScope.engine.logs[i]+"</div>");
                    }
                    $("#gamelog").html(html);
                },
                insert: function(msg){
                    $("#gamelog").prepend($("<div>"+msg+"</div>"));
                    this.hasNew = !this.displayed;
                }
            };
            var engine = {
                clearPastEvents: function() {
                    console.log('clear past events');
                    angular.forEach($rootScope.engine.schedule, function(value, step) {
                        if (step < $rootScope.engine.curStep) {
                            delete $rootScope.engine.schedule[step];
                        }
                    });
                },
                countEvent: function(eventName, param) {
                    var count = 0;
                    var schedule = $rootScope.engine.schedule;
                    var ind;
                    for (var i in $rootScope.engine.schedule) {
                        var evts = schedule[i];
                        for (var j = 0; j < evts.length; j++) {
                            if (evts[j].id == eventName) {
                                if (param) {
                                    if (evts[j].params.indexOf(param) >= 0) {
                                        count++;
                                        console.log('found at ' + i, evts[j].id, evts[j].params);
                                    }
                                } else {
                                    count++;
                                    console.log('found at ' + i, evts[j].id, evts[j].params);
                                }
                            }
                        }
                    }
                    return count;
                },
                getState: function() {
                    return $rootScope.engine.state;
                },
                start: function(log) {
                    $rootScope.engine.stopped--;
                    if ($rootScope.engine.stopped <= 0) {
                        $rootScope.engine.state = 1;
                        $rootScope.engine.stopped = 0;

                    }
                    if (log) {
                        console.log(log);
                        if (!$rootScope.engine.startStopLogs) {
                            $rootScope.engine.startStopLogs = [];
                        }
                        $rootScope.engine.startStopLogs.push("start:" + log);
                    }

                },
                stop: function(log) {
                    $rootScope.engine.state = 0;
                    $rootScope.engine.stopped++;
                    if (log) {
                        console.log(log);
                        if (!$rootScope.engine.startStopLogs) {
                            $rootScope.engine.startStopLogs = [];
                        }
                        $rootScope.engine.startStopLogs.push("stop:" + log);
                    }


                },
                insertToLog: function(log) {
                    if (log) {
                        if (!$rootScope.engine.startStopLogs) {
                            $rootScope.engine.startStopLogs = [];
                        }
                        $rootScope.engine.startStopLogs.push(log);
                    }
                },
                slow: function() {
                    $rootScope.engine.rate = $rootScope.engine.slowRate;
                },
                normal: function() {
                    $rootScope.engine.rate = $rootScope.engine.normalRate;
                },
                insert: function(start, funcId, params, findNextEmpty) {
                    if (start >= 0 && funcId) {
                        var slot;
                        var func = {
                            id: funcId,
                            params: params
                        }
                        start += $rootScope.engine.curStep;
                        if (findNextEmpty) {
                            while ($rootScope.engine.schedule[start]) {
                                start++;
                            }
                        }

                        if (!$rootScope.engine.schedule[start]) {
                            slot = $rootScope.engine.schedule[start] = [];
                        } else {
                            slot = $rootScope.engine.schedule[start];
                        }
                        slot.push(func);

                    }
                },
                once: function(start, funcId) {
                    //insert if not there, else insure it's only there once
                    var func = {
                        id: funcId
                    };

                    var slot = $rootScope.engine.schedule[start];

                    if (!slot) {
                        slot = $rootScope.engine.schedule[start] = [];
                    }
                    //prevent duplicate events on the same slot
                    for (var i = slot.length - 1; i >= 0; i--) {

                        if (slot[i].id == funcId) {
                            slot.splice(i, 1);
                        }
                    }
                    slot.push(func);

                },
                log: function(msg) {
                    var season = $rootScope.season;
                    msg = season.curYear+'-'+season.curMonth+'-'+season.curDay+' '+msg;
                    $rootScope.engine.logs.unshift(msg);
                    $rootScope.gamelog.insert(msg);
                    if ($rootScope.engine.logs.length > $rootScope.engine.maxlogs) {
                        var extras = $rootScope.engine.logs.length - $rootScope.engine.maxlogs;
                        for (var i = 0; i < extras; i++) {
                            $rootScope.engine.logs.pop();
                        }
                    }
                },
                createNotification: function(msg, options) {
                    var self = this;
                    if (window.Notification && $rootScope.engine.useNotification) {
                        var opt = {};
                        if (typeof options == 'string') {
                            opt.type = options;

                            angular.forEach($rootScope.browserNotificationTypes, function(type, typeid){
                                if(options == typeid){
                                    opt.icon = type.icon;
                                }
                            });
                        }

                        var settings = $rootScope.player.settings;

                        if (settings.notifications[opt.type] || !opt.type) {
                            if (Notification.permission === 'granted') {
                                self.makeBrowserNotification(msg, opt);
                            } else if (Notification.permission !== 'denied') {
                                Notification.requestPermission(function(permission) {
                                    if (!('permission' in Notification)) {
                                        Notification.permission = permission;
                                    }
                                    if (permission === 'granted') {
                                        self.makeBrowserNotification(msg, opt)
                                    }
                                });
                            }
                        }


                    }

                },
                makeBrowserNotification: function(msg, opt) {
                    var notification = new Notification(msg, opt);
                    $timeout(function() {
                        notification.close()
                    }, 10000);
                },
                insertNotificationBar: function(msg, opt){
                    var notif = $("<div data-role='notif'><div class='notifIcon'></div><div class='notifContent'></div><span class='fa fa-times notifX'></span></div>");
                    notif.find(".notifIcon").addClass(opt);
                    notif.find(".notifContent").html(msg);
                    $("#notificationBar").append(notif);
                },
                changeSpeed: function(rate) {
                    $rootScope.engine.rate = rate;
                },
                getCurTime: function() {
                    var secNum = $rootScope.engine.curStep * $rootScope.engine.rate;
                    var hours = Math.floor(secNum / 3600);
                    var minutes = Math.floor((secNum - (hours * 3600)) / 60);
                    var seconds = Math.floor(secNum - (hours * 3600) - (minutes * 60));

                    if (hours < 10) {
                        hours = '0' + hours;
                    }
                    if (minutes < 10) {
                        minutes = '0' + minutes;
                    }
                    if (seconds < 10) {
                        seconds = '0' + seconds;
                    }
                    var time = hours + ':' + minutes + ':' + seconds;
                    return time;
                },
                calcTime: function(steps) {
                    return $rootScope.engine.rate * steps;
                },
                step: function() {
                    $rootScope.engine.curStep++;
                    var thisStep = $rootScope.engine.schedule[$rootScope.engine.curStep];
                    if (thisStep) {
                        angular.forEach(thisStep, function(value, key) {
                            if (value) {
                                try {
                                    if (!value.params) {
                                        value.params = null;
                                    }
                                    $rootScope.callFn(value.id, value.params);
                                } catch (err) {
                                    console.error(err, 'callFn failed: ', value.id, value.params);
                                }

                            }
                        });
                        delete $rootScope.engine.schedule[$rootScope.engine.curStep];
                    }

                    if ($rootScope.engine.curStep % 10000 == 0) {
                        //remove older entries
                        this.clearPastEvents();
                    }

                },
                init: function() {
                    if (window.Notification) {
                        Notification.requestPermission(function(permission) {
                            //var notification = new Notification('Thank you, the game will use browser notifications to alert you of important matters');
                        });
                    }

                    $("#notificationBar").on('click', function(e){
                        e.preventDefault();
                        e.stopPropagation();
                        
                        var target = $(e.target).closest("[data-role=notif]");
                        if(target.length > 0){
                            target.fadeOut('normal', function(){
                                target.remove();
                            });
                        }
                    });
                }
            };

            return engine;
        }
    ]);
