'use strict';

angular.module('prosperity')
    .service('Rand', function Rand() {
        // AngularJS will instantiate a singleton by calling "new" on this function
        var rand, head;

        function buildList() {
            rand = {};
            head = rand;

            for (var i = 0; i < 100; i++) {

                if (i > 0) {
                    rand.next = {};
                    rand = rand.next;
                }
                rand.val = ~~ (Math.random() * 100);
            }

            return head;
        }

        return {
            next: function() {
                var ret = head.val;
                if (head.next) {
                    head = head.next;
                } else {
                    head = buildList();
                }
            }

        }




    });