//Confetti
(function() {
    var COLORS, Confetti, NUM_CONFETTI, PI_2, canvas, confetti, context, drawCircle, i, range, resizeWindow, xpos;

    NUM_CONFETTI = 60;

    COLORS = [
        [85, 71, 106],
        [174, 61, 99],
        [219, 56, 83],
        [244, 92, 68],
        [248, 182, 70]
    ];

    PI_2 = 2 * Math.PI;

    window.w = 0;

    window.h = 0;


    range = function(a, b) {
        return (b - a) * Math.random() + a;
    };

    drawCircle = function(context, x, y, r, style) {
        context.beginPath();
        context.arc(x, y, r, 0, PI_2, false);
        context.fillStyle = style;
        return context.fill();
    };

    window.requestAnimationFrame = (function() {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) {
            return window.setTimeout(callback, 1000 / 60);
        };
    })();

    Confetti = (function() {
        function Confetti(colors) {
            this.setColor(colors);
            this.r = ~~range(2, 6);
            this.r2 = 2 * this.r;
            this.lastReplaced = 0;
            this.replace();
        }
        Confetti.prototype.setColor = function(colors) {
            this.style = colors[~~range(0, 5)];
            this.rgb = "rgba(" + this.style[0] + "," + this.style[1] + "," + this.style[2];
        }
        Confetti.prototype.replace = function() {
            this.lastReplaced = 0;
            var speed = 0.7;
            if (confettiCanvas) {
                speed = confettiCanvas.speed;
            }
            this.opacity = 0;
            this.dop = 0.03 * range(1, 4);
            this.x = range(-this.r2, w - this.r2);
            this.y = range(-20, h - this.r2);
            this.xmax = window.w - this.r;
            this.ymax = window.h - this.r;
            this.vx = range(0, 2) + 8 * (window.confettiCanvas ? window.confettiCanvas.xpos : 0.5) - 5;

            if (this.newColorAtNextReplace) {
                this.newColorAtNextReplace = false;
                this.setColor(window.confettiCanvas.curTheme)
            }
            return this.vy = speed * this.r + range(-1, 1);
        };

        Confetti.prototype.draw = function(context) {
            var _ref;
            this.x += this.vx;
            this.y += this.vy;
            this.opacity += this.dop;
            if (this.opacity > 1) {
                this.opacity = 1;
                this.dop *= -1;
            }
            if (this.opacity < 0 || this.y > this.ymax || this.lastReplaced > 150) {
                this.replace();
            }
            if (!((0 < (_ref = this.x) && _ref < this.xmax))) {
                this.x = (this.x + this.xmax) % this.xmax;
            }
            return drawCircle(context, ~~this.x, ~~this.y, this.r, "" + this.rgb + "," + this.opacity + ")");
        };

        return Confetti;

    })();


    window.confettiCanvas = {
        step: function() {
            var c, _i, _len, _results;
            if (confettiCanvas.stopFlag) {
                confettiCanvas.stopFlag = false; //cancel the stop Flag
            } else {
                window.requestAnimationFrame(confettiCanvas.step);
                confettiCanvas.context.clearRect(0, 0, w, h);
                _results = [];
                for (_i = 0, _len = confettiCanvas.confetti.length; _i < _len; _i++) {
                    c = confettiCanvas.confetti[_i];
                    _results.push(c.draw(confettiCanvas.context));
                }
                return _results;
            }
        },
        stop: function() {
            this.stopFlag = true;
        },
        resizeWindow: function() {
            window.w = confettiCanvas.canvas.width = window.innerWidth;
            return window.h = confettiCanvas.canvas.height = 170;
        },
        changeTheme: function(newTheme) {
            this.curTheme = newTheme;
            for (var i = 0; i < this.confetti.length; i++) {
                this.confetti[i].newColorAtNextReplace = true;
            }
        },
        colors: {
            default: [
                [160, 160, 160],
                [200, 200, 200],
                [220, 220, 220],
                [180, 180, 180],
                [190, 190, 190]
            ],
            Winter: [
                [163, 220, 245],
                [219, 241, 250],
                [206, 209, 210],
                [255, 255, 255],
                [218, 238, 245]
            ],
            Spring: [
                [197, 199, 188],
                [244, 202, 202],
                [249, 157, 157],
                [249, 157, 223],
                [203, 131, 145],
            ],
            Summer: [
                [222, 255, 164],
                [188, 231, 115],
                [109, 155, 31],
                [212, 221, 179],
                [197, 215, 91]
            ],
            Autumn: [
                [203, 178, 131],
                [240, 185, 85],
                [255, 140, 27],
                [167, 194, 0],
                [255, 208, 122]
            ]
        },
        speed: 0.7,
        createConfettis: function(theme) {
            this.confetti = (function() {
                var _i, _results;
                _results = [];
                for (i = _i = 1; 1 <= NUM_CONFETTI ? _i <= NUM_CONFETTI : _i >= NUM_CONFETTI; i = 1 <= NUM_CONFETTI ? ++_i : --_i) {
                    _results.push(new Confetti(theme));
                }
                return _results;
            })();
        },
        init: function(theme) {
            this.canvas = document.getElementById("backgroundCanvas");
            this.context = this.canvas.getContext("2d");
            console.log(this.canvas, this.context);

            window.addEventListener('resize', confettiCanvas.resizeWindow, false);



            setTimeout(confettiCanvas.resizeWindow, 0);

            document.onmousemove = function(e) {
                return confettiCanvas.xpos = e.pageX / (window.w);
            };
            var colors;
            if (!theme) {
                theme = 'default';
            }
            this.curTheme = this.colors[theme];
            this.createConfettis(this.curTheme);
            this.stopFlag = false;
            this.step();
        },
        xpos: 0.5,
        stopFlag: false
    }




}).call(window);