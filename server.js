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

var sessionMiddleware = session({
    store: new RedisStore({client: client}),
    secret: "xXBattleshipsXx",
    saveUninitialized: true,
    resave: true
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

sio.sockets.on("connection", function (socket) {
    var socketSession = socket.request.session;

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

    socket.on('settingsChanged', function (data) {
        socketSession.username = data.username;
        socketSession.settingsMuteSounds = data.muteSounds;
        socketSession.settingsSoundVolume = data.soundVolume;
        socketSession.color = data.color;
        socketSession.save();
    });
});

server.listen(port, function () {
    console.log('Battleships game running on port ' + port);
});