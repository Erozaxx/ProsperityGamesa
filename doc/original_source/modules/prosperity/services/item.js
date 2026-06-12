'use strict';

angular.module('prosperity')
    .service('Item', ['$rootScope',
        function Item($rootScope) {
            var item = {
                getItem: function(itemId) {
                    if ($rootScope.itemList) {
                        return $rootScope.itemList[itemId];
                    } else {
                        return null;
                    }
                },
                addItem: function(id, name, description) {
                    var item = {
                        id: id,
                        name: name,
                        description: description
                    }
                    $rootScope.itemList[id] = item;
                },
                init: function() {

                }

            };

            return item;
        }
    ]);