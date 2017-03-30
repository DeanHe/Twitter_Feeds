var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ejsEngine = require("ejs-mate");
var socket_io = require("socket.io");

var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();
// Socket.io
var io = socket_io();
app.io = io;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine("ejs", ejsEngine);
app.set("view engine", "ejs");

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(require('stylus').middleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function (err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
// If undefined in our process load our local file
if (!process.env.CONSUMER_KEY) {
    var env = require('./env.js')
}
// twitter API
var Twitter = require('twitter');
var twit = new Twitter({
    consumer_key: process.env.CONSUMER_KEY,
    consumer_secret: process.env.CONSUMER_SECRET,
    access_token_key: process.env.ACCESS_TOKEN_KEY,
    access_token_secret: process.env.ACCESS_TOKEN_SECRET
});
// socket.io events
io.on('connection', function (socket) {
    var twitter_stream = null;
    socket.on('search_keyword', function (keyword) {

        twit.stream('statuses/filter', { track: keyword }, function (stream) {
            if (twitter_stream)
                twitter_stream.destroy();

            stream.on('data', function (tweet) {
                socket.emit('new_tweet', tweet);
            });

            stream.on('error', function (error) {
                throw error;
            });

            twitter_stream = stream;

        });

    });
    socket.on('search_stop', function () {
        if (twitter_stream)
            twitter_stream.destroy();
    });

    socket.on('disconnect', function () {
        if (twitter_stream)
            twitter_stream.destroy();
    });
});
module.exports = app;
