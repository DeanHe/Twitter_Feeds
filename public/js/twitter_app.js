var twitterApp = angular.module('twitterApp', []);

twitterApp.controller('TwitterController', function ($scope) {

    $scope.keyword = "";

    $scope.socket;

    $scope.tweets = [];

    $scope.receiveTweet = function (data) {
        if ($scope.tweets.length >= 20) {
            $scope.tweets.pop();
        }
        $scope.tweets.unshift(data);
        $scope.$apply();
    }

    $scope.serverDisconnected = function () {
        console.log("Server disconnected");
    }

    $scope.keywordSearch = function () {
        $scope.setKeyWord($scope.keyword);
        $scope.tweets = [];
    }
    $scope.reset = function () {
        $scope.keyword = "";
        $scope.socket.emit('search_stop');
    }

    $scope.setKeyWord = function (keyword) {
        $scope.socket.emit('search_keyword', keyword);
    }

    $scope.connect = function () {
        $scope.socket = io.connect();
        $scope.socket.on('new_tweet', this.receiveTweet);
        $scope.socket.on('disconnect', this.serverDisconnected);
    }

    $scope.connect();

});