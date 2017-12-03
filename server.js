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
    saveUninitialized: true,
    resave: true,
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
var privateGames = [];

sio.sockets.on("connection", function (socket) {
    var socketSession = socket.request.session;
    var createdPrivate = false;
    var opponent = null;
    var gameInfo;
    resetGame();

    if (!socketSession.created) {
        ++playersTotal;
        socketSession.created = true;
        socketSession.username = "Player #" + playersTotal;
        socketSession.settingsMuteSounds = true;
        socketSession.settingsSoundVolume = 80;
        socketSession.color = "#5484ed";
        socketSession.save();
    }
    else {
        if (opponent) {
            sio.to(opponent).emit("enemyLeft");
            opponent = null;
        }

        if (createdPrivate) {
            cancelPrivateGame();
            createdPrivate = false;
        }
    }

    socket.emit('connected', {data: socketSession});

    socket.on('disconnect', function () {
        if (playersInQue.indexOf(socket.id) !== -1) {
            playersInQue.remove(socket.id);
        }

        if (opponent) {
            sio.to(opponent).emit("enemyLeft");
            opponent = null;
        }

        if (createdPrivate) {
            cancelPrivateGame();
            createdPrivate = false;
        }
    });

    socket.on('settingsChanged', function (data) {
        socketSession.username = data.username;
        socketSession.settingsMuteSounds = data.muteSounds;
        socketSession.settingsSoundVolume = data.soundVolume;
        socketSession.color = data.color;
        socketSession.save();
    });

    socket.on('createGame', function (id) {
        privateGames.push({player: socket.id, id: id});
        createdPrivate = true;
    });

    socket.on('cancelPrivate', function () {
        cancelPrivateGame();
    });

    socket.on('findGame', function (id) {
        resetGame();

        for (i = 0; i < privateGames.length; i++) {
            if (privateGames[i].id === id) {
                var opponent = privateGames[i].player;
                privateGames.splice(i, 1);


                var opponentSession = sio.sockets.connected[opponent].request.session;

                sio.to(opponent).emit("startGame", {
                    enemy: {id: socket.id, username: socketSession.username, color: socketSession.color},
                    starter: (gameInfo.start === 1 ? socket.id : sio.sockets.connected[opponent].id)
                });

                socket.emit("startGame", {
                    enemy: {
                        id: sio.sockets.connected[opponent].id,
                        username: opponentSession.username,
                        color: opponentSession.color
                    },
                    starter: (gameInfo.start === 1 ? socket.id : sio.sockets.connected[opponent].id)
                });
                return;
            }
        }

        socket.emit("gameError", "Game #" + id + " not found!");
    });

    socket.on('newMessage', function (message) {
        sio.to(opponent).emit("newMessage", message);
    });

    socket.on('newServerMessage', function (code) {
        var message;

        switch (code) {
            case 0:
                message = "<span style='color: " + socketSession.color + ";'>" + socketSession.username + "</span> has joined the game!";
                break;
            case 1:
                message = "<span style='color: " + socketSession.color + ";'>" + socketSession.username + "</span> has been marked as ready!";
                gameInfo.ready = true;
                break;
            case 2:
                message = "<span style='color: " + socketSession.color + ";'>" + socketSession.username + "</span> has been marked as unready!";
                gameInfo.ready = false;
                break;
        }

        sio.to(opponent).emit("newServerMessage", message, code);
    });

    socket.on('shot', function (row, col) {
        sio.to(opponent).emit("shot", row, col);
    });

    socket.on('setOpponent', function (id) {
        opponent = id;
    });

    socket.on('setOpponentReady', function (state) {
        gameInfo.opponentReady = state;
        readyToStart();
    });

    socket.on('joinQue', function () {
        resetGame();

        if (playersInQue.length > 0) {
            opponent = playersInQue[0];

            playersInQue.remove(socket);
            playersInQue.remove(opponent);

            var opponentSession = sio.sockets.connected[opponent].request.session;

            sio.to(opponent).emit("startGame", {
                enemy: {id: socket.id, username: socketSession.username, color: socketSession.color},
                starter: (gameInfo.start === 1 ? socket.id : sio.sockets.connected[opponent].id)
            });

            socket.emit("startGame", {
                enemy: {
                    id: sio.sockets.connected[opponent].id,
                    username: opponentSession.username,
                    color: opponentSession.color
                },
                starter: (gameInfo.start === 1 ? socket.id : sio.sockets.connected[opponent].id)
            });
        }
        else if (playersInQue.indexOf(socket.id) === -1) {
            playersInQue.push(socket.id);
        }
    });

    socket.on('leaveQue', function () {
        playersInQue.remove(socket.id);
    });

    socket.on('leaveQue', function () {
        playersInQue.remove(socket.id);
    });

    socket.on('placedShips', function (battlefield) {
        socket.emit("newServerMessage", "Game has started!", 0);
        sio.to(opponent).emit("placedShips", battlefield);
    });

    socket.on('wonGame', function (winner) {
        socket.emit("wonGame", winner);
        sio.to(opponent).emit("wonGame", winner);
    });

    socket.on('gameError', function (stage, error) {
        resetGame();

        var message;
        var messageOpponent;

        switch (error) {
            case 0:
                if (stage === 1) {
                    message = "You didn't place all the ships ships in time!";
                    messageOpponent = socketSession.username + " didn't place all the ships in time!";
                } else if (stage === 2) {
                    message = "You didn't shoot in time!";
                    messageOpponent = socketSession.username + " didn't shoot in time!";
                }
                break;
        }

        sio.to(opponent).emit("gameError", messageOpponent);
        socket.emit("gameError", message);
    });

    function resetGame() {
        gameInfo = {ready: false, opponentReady: false, start: (1 + Math.floor(Math.random() * 2))};
    }

    function cancelPrivateGame() {
        for (i = 0; i < privateGames.length; i++) {
            if (privateGames[i].player === socket.id) {
                privateGames.splice(i, 1);
                createdPrivate = false;
                return;
            }
        }
    }

    function readyToStart() {
        if (gameInfo.ready === true && gameInfo.opponentReady === true) {
            socket.emit("readyToPlay");
            sio.to(opponent).emit("readyToPlay");
        }
    }
});


server.listen(port, function () {
    console.log('Battleships game running on port ' + port);
});