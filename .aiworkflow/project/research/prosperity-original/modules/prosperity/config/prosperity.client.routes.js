'use strict';
var app = angular.module('prosperity');
//Setting up route

angular.module('prosperity').config(['$stateProvider', '$urlRouterProvider',
    function($stateProvider, $urlRouterProvider) {
        //console.log('config url routing');
        //$urlRouterProvider.when('', '/'); //alternative
        $urlRouterProvider.when('', '/users/home');
        $urlRouterProvider.when('/', '/users/home');

        //console.log($urlRouterProvider);

        // Prosperity state routing
        $stateProvider
            .state('prosperity', {
                abstract: true,
                url: '/prosperity',
                templateUrl: 'modules/prosperity/index.html',
                controller: 'IndexCtrl'
            })
            .state('prosperity.initializing', {
                //Initializing screen as an intermediary step to set up the user's game before going into the game itself.
                url: '/initializing/:gamesaveId',
                templateUrl: 'modules/prosperity/views/initializing.html',
                controller: 'InitializingCtrl'
            })
            .state('prosperity.devlog', {
                //Devlog, might not actually bother with this.
                url: '/devlog',
                templateUrl: 'modules/prosperity/views/devlog.html',
                controller: 'DevlogCtrl'
            })
            .state('prosperity.forest', {
                url: '/forest',
                templateUrl: 'modules/prosperity/views/forest.html',
                controller: 'ForestCtrl'
            })
            .state('prosperity.home', {
                url: '/home',
                templateUrl: 'modules/prosperity/views/home.html',
                controller: 'HomeCtrl'
            })
            .state('prosperity.mine', {
                url: '/mine',
                templateUrl: 'modules/prosperity/views/mine.html',
                controller: 'MineCtrl'
            })
            .state('prosperity.field', {
                url: '/field',
                templateUrl: 'modules/prosperity/views/field.html',
                controller: 'FieldCtrl'
            })
            .state('prosperity.market', {
                url: '/market',
                templateUrl: 'modules/prosperity/views/market.html',
                controller: 'MarketCtrl'
            })
            .state('prosperity.marketedit', {
                url: '/marketedit',
                templateUrl: 'modules/prosperity/views/marketedit.html',
                controller: 'MarketCtrl'
            })
            .state('prosperity.intro', {
                url: '/intro',
                templateUrl: 'modules/prosperity/views/intro.html',
                controller: 'IntroCtrl'
            })
            .state('prosperity.pub', {
                url: '/pub',
                templateUrl: 'modules/prosperity/views/pub.html',
                controller: 'PubCtrl'
            })
            .state('prosperity.reliquary', {
                url: '/reliquary',
                templateUrl: 'modules/prosperity/views/reliquary.html',
                controller: 'ReliquaryCtrl'
            })
            .state('prosperity.council', {
                url: '/council',
                templateUrl: 'modules/prosperity/views/council.html',
                controller: 'CouncilCtrl'
            })
            .state('prosperity.milontiTale', {
                url: '/milontiTale',
                templateUrl: 'modules/prosperity/views/quest.html',
                controller: 'MilontitaleCtrl'
            })
            .state('prosperity.wall', {
                url: '/wall',
                templateUrl: 'modules/prosperity/views/wall.html',
                controller: 'WallCtrl'
            })
            .state('prosperity.militaryCouncil', {
                url: '/militaryCouncil',
                templateUrl: 'modules/prosperity/views/militarycouncil.html',
                controller: 'MilitarycouncilCtrl'
            })
            .state('prosperity.university', {
                url: '/university',
                templateUrl: 'modules/prosperity/views/university.html',
                controller: 'UniversityCtrl'
            })
            .state('prosperity.masonsGuild', {
                url: '/masonsGuild',
                templateUrl: 'modules/prosperity/views/masonsguild.html',
                controller: 'MasonsguildCtrl'
            });
        // Home state routing

    }
]).config(['$mdThemingProvider',
    function($mdThemingProvider) {
        $mdThemingProvider.theme('default')
            .primaryPalette('light-green', {
                default: '800'
            })
            .accentPalette('brown');

        $mdThemingProvider.definePalette('white', {
            '50': 'ffffff',
            '100': 'f8f8f8',
            '200': 'f2f2f2',
            '300': 'eeeeee',
            '400': 'e8e8e8',
            '500': 'e2e2e2',
            '600': 'dddddd',
            '700': 'd8d8d8',
            '800': 'd2d2d2',
            '900': 'cccccc',
            'A100': 'fefeff',
            'A200': 'fefeff',
            'A400': 'fefeff',
            'A700': 'fefeff'
        });
        $mdThemingProvider.theme('frontpage')
            .primaryPalette('white')
            .accentPalette('green', {
                default: '800'
            })
            .dark()
    }
]);
