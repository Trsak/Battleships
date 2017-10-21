#!/usr/bin/env nodejs
var express = require('express');
var app = express();
var fs = require('fs');

var ssl_options = {
    key: fs.readFileSync('/etc/letsencrypt/live/psopf.cz/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/psopf.cz/fullchain.pem')
};

var server = require('https').createServer(ssl_options, app);
var port = process.env.PORT || 8080;

var io = require('socket.io')(server);

app.get('/', function (req, res) {
    res.sendFile(__dirname + '/client/index.html');
});

app.use('/', express.static(__dirname + '/client'));

server.listen(port, function () {
    console.log('https server running on port ' + port);
});

var SOCKET_LIST = {};

var count = 0;

io.sockets.on('connection', function (socket) {
    count++;
    io.sockets.emit('newPositions', {
        number: count
    });

    socket.on('disconnect', function () {
        count--;
        io.sockets.emit('newPositions', {
            number: count
        });
    });
});
/*
setInterval(function () {
    var pack = [];
    for (var i in SOCKET_LIST) {
        var socket = SOCKET_LIST[i];
        socket.x++;
        socket.y++;
        pack.push({
            x: socket.x,
            y: socket.y,
            number: socket.number
        });
    }

    for (var i in SOCKET_LIST) {

        var socket = SOCKET_LIST[i];
        socket.emit("newPositions", pack);
    }
}, 1000/25);*/