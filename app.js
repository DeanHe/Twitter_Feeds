var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var ejsEngine = require("ejs-mate");
var socket_io = require("socket.io");
var mongoose = require('mongoose');
var TwitterModel = require('./twitter_model.js');

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
    var env = require('./env.js');
}
// MongoDB connection
mongoose.connect(process.env['MONGO_CONNECTION']);
var DB_MAX = 20;
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
    // for storing latest tweets
    var tweetsArray = [];
    // initial the beginning twitter wall from mongodb
    TwitterModel.find().sort({ timestamp_ms: 1 }).exec(function (err, data) {
        for (var i in data) {
            var tweet = data[i];
            socket.emit('new_tweet', tweet);
        }
    });
    // listen on io event
    socket.on('search_keyword', function (keyword) {
        twit.stream('statuses/filter', { track: keyword }, function (stream) {
            if (twitter_stream)
                twitter_stream.destroy();

            stream.on('data', function (tweet) {
                if (tweetsArray.length >= DB_MAX) {
                    tweetsArray.pop();
                }
                tweetsArray.unshift(tweet);
                socket.emit('new_tweet', tweet);
            });

            stream.on('error', function (error) {
                throw error;
            });

            twitter_stream = stream;

        });

    });
    socket.on('search_stop', function () {
        if (twitter_stream) {
            twitter_stream.destroy();
        }
    });

    socket.on('disconnect', function () {
        if (twitter_stream) {
            twitter_stream.destroy();
            //save last search result to mongodb
            var entries = [];
            for (var i in tweetsArray) {
                var tweet = tweetsArray[i];
                var entry = new TwitterModel({
                    text: tweet.text,
                    timestamp_ms: tweet.timestamp_ms,
                    user: {
                        name: tweet.user.name,
                        screen_name: tweet.user.screen_name,
                        profile_image_url: tweet.user.profile_image_url
                    }
                });
                entries.push(entry);
            }
            TwitterModel.collection.insert(entries, function (err, docs) {
                if (err) {
                    console.log(err);
                    return;
                }
                TwitterModel.find({}).select('_id').sort({ timestamp_ms: -1 }).limit(DB_MAX)
                    .exec(function (err, docs) {
                        var ids = docs.map(function (doc) { return doc._id; });
                        TwitterModel.remove({ _id: { $nin: ids } }, function (err) { });
                    });
            });
        }
    });
});
module.exports = app;
