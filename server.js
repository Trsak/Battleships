#!/usr/bin/env nodejs
var express = require('express');
var session = require("express-session");
var RedisStore = require("connect-redis")(session);
var redis = require('redis');
var client = redis.createClient();
var app = express();
var fs = require('fs');

var ssl_options = {
    key: fs.readFileSync('/etc/letsencrypt/live/psopf.cz/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/psopf.cz/fullchain.pem')
};

var server = require('https').createServer(ssl_options, app);
var port = process.env.PORT || 8080;
var sio = require("socket.io")(server);
var helpers = require("./helpers");

var sessionMiddleware = session({
    store: new RedisStore({client: client}),
    secret: "xXBattleshipsXx",
    saveUninitialized: false,
    resave: false,
    expires: false
});

sio.use(function (socket, next) {
    sessionMiddleware(socket.request, {}, next);
});

app.use(sessionMiddleware);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('/', express.static(__dirname + '/client'));

var playersTotal = 0;
var playersInQue = [];

sio.sockets.on("connection", function (socket) {
    var socketSession = socket.request.session;
    var opponent = null;

    if (!socketSession.created) {
        ++playersTotal;
        socketSession.created = true;
        socketSession.username = "Player #" + playersTotal;
        socketSession.settingsMuteSounds = true;
        socketSession.settingsSoundVolume = 80;
        socketSession.color = "#5484ed";
        socketSession.save();
    }

    socket.emit('connected', {data: socketSession});

    socket.on('disconnect', function () {
        console.log("dced ");
        if (opponent) console.log(opponent.toString());
        if (playersInQue.indexOf(socket) !== -1) {
            playersInQue.remove(socket);
        }

        if (opponent) {
            opponent.emit("enemyLeft");
            opponent = null;
        }
    });

    socket.on('settingsChanged', function (data) {
        socketSession.username = data.username;
        socketSession.settingsMuteSounds = data.muteSounds;
        socketSession.settingsSoundVolume = data.soundVolume;
        socketSession.color = data.color;
        socketSession.save();
    });

    socket.on('joinQue', function () {
        if (playersInQue.length > 0) {
            opponent = playersInQue[0];
            opponent.opponent = socket;
            
            playersInQue.remove(socket);
            playersInQue.remove(opponent);

            var opponentSession = opponent.request.session;

            opponent.emit("startGame", {
                enemy: {username: socketSession.username, color: socketSession.color},
                phase: 0
            });
            socket.emit("startGame", {
                enemy: {username: opponentSession.username, color: opponentSession.color},
                phase: 0
            });
        }
        else if (playersInQue.indexOf(socket) === -1) {
            playersInQue.push(socket);
        }
    });

    socket.on('leaveQue', function () {
        playersInQue.remove(socket);
    });

    socket.on('leaveQue', function () {
        playersInQue.remove(socket);
    });
});

server.listen(port, function () {
    console.log('Battleships game running on port ' + port);
});