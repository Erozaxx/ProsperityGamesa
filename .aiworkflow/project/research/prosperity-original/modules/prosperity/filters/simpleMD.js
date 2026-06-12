'use strict';

angular.module('prosperity').filter('simpleMD', function($sce) {
    return function(newstr) {

        newstr = newstr.replace(/(<([^>]+)>)/ig, "");

        newstr = newstr.replace(/\*\*[\S \t \ ]*\*\*/gi, function(match) {
            return '<span class="bold">' + match.substring(2, match.length - 2) + '</span>';
        });

        newstr = newstr.replace(/\~\~[\S \t \ ]*\~\~/gi, function(match) {
            return '<span class="strikethrough">' + match.substring(2, match.length - 2) + '</span>';
        });

        newstr = newstr.replace(/\*[\S \t \ ]*\*/gi, function(match) {
            return '<span class="italic">' + match.substring(1, match.length - 1) + '</span>';
        });

        return $sce.trustAsHtml(newstr);
    };
});