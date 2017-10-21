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
    console.log('Battleships game running on port ' + port);
});

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