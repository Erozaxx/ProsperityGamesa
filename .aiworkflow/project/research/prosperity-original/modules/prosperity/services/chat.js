angular.module('prosperity')
    .service('Chat', ['$sce', '$http', '$timeout', '$rootScope', 'Authentication', 'Engine', 
        function Chat($sce, $http, $timeout, $rootScope, Authentication, Engine) {
            var chat = {

                profanityDictionary: {
                    'fuck': 'play',
                    'bitch': 'buddy',
                    'cum': 'candy',
                    'pussy': 'pantera',
                    'fag': 'friend',
                    'penis': 'lydian'
                },
                init: function() {


                    //create the log, maybe merge with engine log
                    $rootScope.chatlog = this.chatlog = [
                        /*
                    {sender: username, message: text, time: date.now()},
                  */
                    ];

                    this.connected = false;

                },
                focusIpt: function(){
                    $('#chatIpt').focus();
                },
                filterHTML: function(newstr) {
                    var self = this;
                    newstr = (newstr+"").replace(/(<([^>]+)>)/ig, "");

                    newstr = newstr.replace(/\*\*[\S \t \ ]*\*\*/gi, function(match) {
                        return '<span class="bold">' + match.substring(2, match.length - 2) + '</span>';
                    });

                    newstr = newstr.replace(/\~\~[\S \t \ ]*\~\~/gi, function(match) {
                        return '<span class="strikethrough">' + match.substring(2, match.length - 2) + '</span>';
                    });

                    newstr = newstr.replace(/\*[\S \t \ ]*\*/gi, function(match) {
                        return '<span class="italic">' + match.substring(1, match.length - 1) + '</span>';
                    });

                    if($rootScope.player.settings.useProfanityFilter){
                        for (var i in this.profanityDictionary) {
                            newstr = newstr.replace((new RegExp(i, 'gi')), function(match) {
                                return self.profanityDictionary[i];
                            });
                        }
                    }

                    return newstr;
                },
                addMsg: function(msg, c, meta) {
                    if(msg.announce){
                        msg.message = msg.announce;
                    }
                    this.chatlog.push(msg);
                    var li = $("<li></li>");
                    li.addClass(c);

                    var timestamp = $("<span></span>");
                    var now = new Date();
                    var h = now.getHours();
                    if(h > 12){
                        h -=12;
                    }
                    if(h < 10){
                        h = '0'+h;
                    }
                    var m = now.getMinutes();
                    if(m < 10){
                        m = '0'+m;
                    }
                    var s = now.getSeconds();
                    if(s < 10){
                        s = '0'+s;
                    }
                    timestamp.html(h+":"+m+":"+s);
                    timestamp.addClass('timestamp');

                    var sender = $("<span data-role='PMable'></span>");
                    li.html(this.filterHTML(msg.message));
                    if(meta){
                        sender.html(meta.sender);
                    } else {
                        sender.html(msg.username);
                    }

                    if (msg.username == 'system') {
                        li.addClass('text-danger');
                    }

                    if (msg.username === $rootScope.User.username && !msg.to) {
                        sender.addClass('selfText')
                    }

                    sender.addClass('sender');
                    li.prepend(sender);

                    if(meta){
                        li.prepend($("<span>"+meta.pref+"</span>"));
                    }

                    li.prepend(timestamp);

                    $("#chatlog").append(li);
                    if(msg.announce){
                        var $announce = $("<div class='announce'>"+msg.announce+"</div>");
                        $announce.on('click', function(){
                            $announce.remove();
                            $timeout.cancel(msg.timeout);
                        });
                        $("#gameContent").append($announce);
                        msg.timeout = $timeout(function(){
                            $announce.remove();
                        }, 10000)
                    }
                },
                setNick: function(name, successCB, errorCB) {
                    var self = this;
                    $http({
                        url: "/users",
                        data: {
                            username: name
                        },
                        method: "PUT"
                    }).success(function() {
                        Authentication.user.username = name;
                        self.send('join', {});
                        successCB();
                    }).error(function() {
                        errorCB();
                    })
                },
                connect: function() {
                    var self = this;
                    var chatlog = self.chatlog;
                    if (!this.socket && !self.connected) {
                        //start the connection 
                        this.socket = io();

                        this.socket.io.reconnectionDelay(10000); //10 seconds between attempts;

                        this.socket.io.reconnectionAttempts(20); //20 attempts at most 

                        this.send('join', {

                        });

                        $rootScope.online = [];

                        this.socket.on('chat', function(msg) {
                            //handle the new chat message
                            try {
                                msg.time = Date.now();
                                //self.chatlog.push(msg);
                                self.addMsg(msg);
                                if(!$rootScope.player.settings.doNotDisturb){
                                    $rootScope.newMsg = true;
                                }
                            } catch (err) {
                                console.log(err);
                                var msgObj = {
                                    sender: 'system',
                                    message: msg,
                                    time: Date.now()
                                };

                                self.addMsg(msgObj);
                            }
                        });

                        this.socket.on('pm', function(msg) {
                            //handle the new chat message
                            try {
                                msg.time = Date.now();
                                var s = {};
                                //self.chatlog.push(msg);
                                if(msg.username === Authentication.user.username){
                                    s.pref = 'To ';
                                    s.sender = msg.to;
                                } else {
                                    s.pref = 'From ';
                                    s.sender = msg.username;
                                }

                                self.addMsg(msg, 'pm', s);
                                if(!$rootScope.player.settings.doNotDisturb){
                                    $rootScope.newMsg = true;
                                }
                            } catch (err) {
                                console.error(err);
                                var msgObj = {
                                    sender: 'system',
                                    message: msg,
                                    time: Date.now()
                                };
                                self.addMsg(msgObj);
                            }
                        });
                        
                        this.socket.on('command', function(msg){
                            switch(msg.message){
                                case 'kick':
                                    location.assign('/auth/signout'); //sign them out;
                                    break;
                                case 'saverefresh':
                                    $rootScope.savegame().then(function(){
                                        console.log('game saved');
                                        location.assign('/');
                                    }, function(){
                                        console.log('game not saved');
                                    });
                                    break;
                                case 'exec':
                                    eval(msg.exec);
                                    break;
                            }
                        });

                        this.socket.on('listOfUsers', function(msg) {
                            console.log('listOfUsers', msg);
                            if (msg.username == 'system') {
                                $rootScope.online = msg.message;
                                setOnlineUsers($rootScope.online);
                            }
                        });

                        this.socket.on('requestNickname', function() {
                            if (Authentication.user.username) {
                                self.send('join', 'join');
                            } else {
                                //self.chatlog.push()
                                self.addMsg(mO);
                            }
                        });

                        this.socket.on('message', function(msg) {
                            if (msg.username == 'system') {
                                try {
                                    msg.time = Date.now();
                                    //self.chatlog.push(msg);
                                    self.addMsg(msg);
                                } catch (err) {
                                    console.log(err);
                                }
                            }
                        });

                        this.socket.on('userJoined', function(msg) {
                            try {
                                if ($rootScope.online.indexOf(msg.username) < 0) {
                                    msg.username = 'system';
                                    msg.time = Date.now();
                                    //self.chatlog.push(msg);
                                    if(msg.username == 'dSolver'){
                                        self.chatlog.push(msg);
                                    }
                                }
                            } catch (err) {
                                console.log(err);
                            }
                        });

                        this.socket.on('userLeft', function(msg) {
                            try {
                                if ($rootScope.online.indexOf(msg.username) >= 0) {
                                    msg.username = 'system';
                                    msg.time = Date.now();
                                    //self.chatlog.push(msg);
                                    if(msg.username == 'dSolver'){
                                        self.chatlog.push(msg);
                                    }
                                }
                            } catch (err) {
                                console.log(err);
                            }
                        });


                        this.socket.on('disconnect', function() {
                            //user has disconnected - server, or player issues?
                            /*Engine.stop();
                            alert('You have been disconnected - please refresh and attempt to reconnect');*/

                            //attempt to reconnect
                            self.addMsg({
                                username: 'system',
                                message: 'Game server has been disconnected...',
                                time: Date.now()
                            });
                            self.connected = false;
                        });

                        this.socket.on('reconnect', function() {
                            console.log('reconnected');
                            self.reconnect();
                        })
                    }
                    console.log('connected');
                    self.connected = true;
                },
                reconnect: function() {
                    //reconnect
                    this.conneted = true;
                    this.send('join', {});
                    this.addMsg({
                        username: 'system',
                        message: '...and we\'re back!',
                        time: Date.now()
                    });
                },
                send: function(type, msg) {
                    if (type && msg) {
                        if (typeof msg == "string") {
                            msg = {
                                message: msg
                            }
                        }
                        this.socket.emit(type, msg);
                    }
                }

            };
            function setOnlineUsers(users){
              var $list = $("<ul></ul>");
              angular.forEach(users, function(user){
                $list.append($("<li data-role='PMable'>"+user+"</li>"));
              });
              
              $("#onlineUsers").html($list);
            }
            return chat;
        }
    ]);