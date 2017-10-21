$(function () {
    var socket = io({transports: ['websocket'], upgrade: false});

    socket.on('newPositions', function (data) {
        $('#online').html(data.number);
    });
});