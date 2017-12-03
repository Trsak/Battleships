/**
 * TODO Change title on page change
 * TODO Add sounds
 * TODO Add posibility to open settings while playing (with ESC key bind)
 * TODO HOTKEYS
 * TODO SERVER SIDE VERIF
 */

var socket;
var userData = null;
var opponent = null;
var selectedShip = null;
var shipFocus = false;
var shipsLeft = [4, 3, 2, 1];
var shipDirection = 1;

var enemyBattlefield = null;
var ready = false;
var stage;
var shooting = true;

var countingTimer;
var countingSec;
var countingMins;

var countdownTimer;
var countdownSec;
var countdownMins;

function checkForWin() {
    var left = 0;

    for (var x = 0; x < 10; x++) {
        for (var i = 0; i < 10; i++) {
            left += enemyBattlefield[x][i];
        }
    }

    if (left === 0) {
        socket.emit("wonGame", socket.id);
    }
}

function shot(row, col) {
    shooting = false;
    $("#gameInstruction").html("<span style='color: " + opponent.color + ";'>" + opponent.username + "</span> is shooting...");

    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    countdownSec = 31;
    countdownMins = 0;
    updateCountdown();
    countdownTimer = setInterval(updateCountdown, 1000);

    socket.emit("shot", row, col);
}

function readyChange() {
    var btn = $('#readyBtn');

    if (!ready) {
        btn.removeClass("btn-success").addClass("btn-warning");
        btn.html("Unmark as ready");
        ready = true;
        $("#gameInstruction").html("Waiting for your opponent...");
        socket.emit('newServerMessage', 1);
    }
    else {
        btn.removeClass("btn-warning").addClass("btn-success");
        btn.html("Mark as ready");
        ready = false;
        $("#gameInstruction").html("Place your battleships!");
        socket.emit('newServerMessage', 2);
    }
}

function addMessage() {
    var input = $("#msgInput");
    var box = $("#msgBox");
    var message = input.val();
    var dt = new Date();

    box.append("<div class=\"message\"><strong>[" + dt.getHours() + ":" + dt.getMinutes() + "] <span style='color: " + userData.color + ";'>" + userData.username + "</span></strong>: " + message + "</div>");
    input.val('');

    box.scrollTop(box[0].scrollHeight);

    socket.emit('newMessage', message);
}

function getShipDirection(row, col) {

    if (inBattlefield(row - 1, col) && battlefield[row - 1][col] === 1) {
        return 2;
    }

    if (inBattlefield(row + 1, col) && battlefield[row + 1][col] === 1) {
        return 2;
    }

    if (inBattlefield(row, col - 1) && battlefield[row][col - 1] === 1) {
        return 1;
    }

    if (inBattlefield(row, col + 1) && battlefield[row][col + 1] === 1) {
        return 1;
    }

    return 1;
}

function getShip(row, col) {
    var direction = getShipDirection(row, col);
    var parts = [];
    parts.push([row, col]);

    var i;
    var done;

    if (direction === 1) {
        for (i = 1; i <= 10; i++) {
            if (inBattlefield(row, col - i) && battlefield[row][col - i] === 1) {
                parts.push([row, col - i]);
            }
            else {
                break;
            }
        }

        for (i = 1; i <= 10; i++) {
            if (inBattlefield(row, col + i) && battlefield[row][col + i] === 1) {
                parts.push([row, col + i]);
            }
            else {
                break;
            }
        }
    } else {
        for (i = 1; i <= 10; i++) {
            if (inBattlefield(row - i, col) && battlefield[row - i][col] === 1) {
                parts.push([row - i, col]);
            }
            else {
                break;
            }
        }

        for (i = 1; i <= 10; i++) {
            if (inBattlefield(row + i, col) && battlefield[row + i][col] === 1) {
                parts.push([row + i, col]);
            }
            else {
                break;
            }
        }
    }

    return parts;
}

function removeShip(parts) {
    var shipSize = parts.length;


    for (s = 0; s < parts.length; s++) {
        battlefield[parts[s][0]][parts[s][1]] = 0;
    }

    shipsLeft[shipSize - 1] += 1;
    $("#shipsLeft" + shipSize).html(shipsLeft[shipSize - 1]);

    if (shipsLeft[shipSize - 1] === 0) {
        allUsedShip(selectedShip.ship);
        selectedShip = null;
    }

    renewBattlefield();
}

function checkIfAllPlaced() {
    var left = 0;

    for (var i = 0; i < shipsLeft.length; i++) {
        left += shipsLeft[i];
    }

    if (left === 0) {
        $('#readyBtn').prop('disabled', false);
    }
    else {
        $('#readyBtn').prop('disabled', true);
    }
}

function restoreField() {
    if (ready) {
        toastr.error("You can't do changes when marked as ready!");
        return;
    }

    if (selectedShip != null) {
        unselectShip(selectedShip.ship);
    }

    shipsLeft = [4, 3, 2, 1];

    for (var i = 0; i < shipsLeft.length; i++) {
        $("#shipsLeft" + (i + 1)).html(shipsLeft[i]);
    }

    battlefield = [
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    ];

    for (x = 1; x <= 10; x++) {
        for (i = 1; i <= 10; i++) {
            var bf = $("#row" + x + " .col" + i);
            var enemyBf = $("#enemyRow" + x + " .col" + i);

            bf.html("");
            bf.css("background-color", "");
            enemyBf.html("");
            enemyBf.css("background-color", "");
        }
    }

    renewBattlefield();
}

function placeShipsRandomly() {
    if (ready) {
        toastr.error("You can't do changes when marked as ready!");
        return;
    }

    restoreField();
    var ships = [1, 1, 1, 1, 2, 2, 2, 3, 3, 4];
    selectedShip = null;
    var originalDirection = shipDirection;

    while (ships.length > 0) {
        var index = Math.floor(Math.random() * ships.length);
        var randomShip = ships[index];
        ships.splice(index, 1);
        selectedShip = {ship: randomShip};

        var placed = false;
        while (!placed) {
            var col = Math.floor(Math.random() * 10) + 1;
            var row = Math.floor(Math.random() * 10) + 1;
            shipDirection = Math.floor(Math.random() * 2) + 1;

            if (placeShip(row, col)) {
                placed = true;
            }
        }
    }

    shipDirection = originalDirection;
}

function placeShip(col, row) {
    if (selectedShip) {
        if (shipDirection === 1) {
            col = getRealCol(col);
            var done = false;
            var x = selectedShip.ship;

            while (!done) {
                if (canPlaceShip(row, col)) {
                    for (var i = col; i < (col + selectedShip.ship); i++) {
                        $("#row" + row + " .col" + i).css("background-color", "#6e867e");
                        battlefield[row - 1][i - 1] = 1;
                    }
                    shipsLeft[selectedShip.ship - 1] -= 1;
                    $("#shipsLeft" + selectedShip.ship).html(shipsLeft[selectedShip.ship - 1]);

                    if (shipsLeft[selectedShip.ship - 1] === 0) {
                        allUsedShip(selectedShip.ship);
                        selectedShip = null;
                    }

                    checkIfAllPlaced();
                    return true;
                }
                else {
                    col -= 1;

                    if (x === 1) {
                        return false;
                    }

                    --x;
                }
            }
        }
        else {
            row = getRealRow(row);
            var done = false;
            var x = selectedShip.ship;

            while (!done) {
                if (canPlaceShip(row, col)) {
                    for (var i = row; i < (row + selectedShip.ship); i++) {
                        $("#row" + i + " .col" + col).css("background-color", "#6e867e");
                        battlefield[i - 1][col - 1] = 1;
                    }
                    shipsLeft[selectedShip.ship - 1] -= 1;
                    $("#shipsLeft" + selectedShip.ship).html(shipsLeft[selectedShip.ship - 1]);

                    if (shipsLeft[selectedShip.ship - 1] === 0) {
                        allUsedShip(selectedShip.ship);
                        selectedShip = null;
                    }

                    checkIfAllPlaced();
                    return true;
                }
                else {
                    row -= 1;

                    if (x === 1) {
                        return false;
                    }

                    --x;
                }
            }
        }
    }
}

function changeDirection() {
    var directionElement = $('#shipDirection');

    if (shipDirection === 1) {
        shipDirection = 2;
        directionElement.html("<i class=\"fa fa-long-arrow-down\" aria-hidden=\"true\"></i>");
        Tipped.remove('#shipDirection');
        Tipped.create('#shipDirection', function () {
            return "Placing ships vertically";
        }, {
            cache: false
        });
    }
    else {
        shipDirection = 1;
        directionElement.html("<i class=\"fa fa-long-arrow-right\" aria-hidden=\"true\"></i>");
        Tipped.remove('#shipDirection');
        Tipped.create('#shipDirection', function () {
            return "Placing ships horizontally";
        }, {
            cache: false
        });
    }
}

function selectShip(size) {
    if (shipsLeft[size - 1] === 0) {
        selectedShip = null;
    }
    else {
        if (selectedShip != null) {
            unselectShip(selectedShip.ship);
        }

        selectedShip = {ship: size};
        $("#ship" + size + " .shipBlock").each(function () {
            $(this).css("background-color", "#6e867e");
        });
    }
}

function unselectShip(size) {
    $("#ship" + size + " .shipBlock").each(function () {
        $(this).removeAttr('style');
    });
}

function allUsedShip(size) {
    $("#ship" + size + " .shipBlock").each(function () {
        $(this).css("background-color", "#949f86");
    });
}

function renewEnemyBattlefield() {
    for (var row = 0; row < 10; row++) {
        for (var i = 0; i < 10; i++) {
            if (shots[row][i] === 1) {
                $("#enemyRow" + (row + 1) + " .col" + (i + 1)).html("<i class=\"fa fa-times\" aria-hidden=\"true\"></i>");
            }
            else {
                $("#enemyRow" + (row + 1) + " .col" + (i + 1)).html("");
            }
        }
    }
}

function renewBattlefield() {
    for (var row = 0; row < 10; row++) {
        for (var i = 0; i < 10; i++) {
            if (battlefield[row][i] === 1) {
                $("#row" + (row + 1) + " .col" + (i + 1)).css("background-color", "#6e867e");
            }
            else {
                $("#row" + (row + 1) + " .col" + (i + 1)).css("background-color", "#1591c1");
            }
        }
    }

    checkIfAllPlaced();
}

function inBattlefield(row, col) {
    return !(row < 0 || row > 9 || col < 0 || row > 9);
}

function getRealCol(col) {
    if (shipDirection === 1) {
        if (col + selectedShip.ship > 11) {
            return (11 - selectedShip.ship);
        }
    }

    return col;
}

function getRealRow(row) {
    if (shipDirection === 2) {
        if (row + selectedShip.ship > 11) {
            return (11 - selectedShip.ship);
        }
    }

    return row;
}

function canPlaceShip(row, col) {
    var x = row - 1;
    var y = col - 1;
    var i;

    if (shipDirection === 1) {
        if (col + selectedShip.ship > 11) {
            return false;
        }

        if (col < 1) {
            return false;
        }

        if (inBattlefield(x, y - 1)) {
            if (battlefield[x][y - 1] === 1) {
                return false;
            }
        }

        if (inBattlefield(x, y + selectedShip.ship)) {
            if (battlefield[x][y + selectedShip.ship] === 1) {
                return false;
            }
        }

        for (i = y; i < (y + selectedShip.ship); i++) {
            if (inBattlefield(x - 1, i)) {
                if (battlefield[x - 1][i] === 1) {
                    return false;
                }
            }

            if (inBattlefield(x, i)) {
                if (battlefield[x][i] === 1) {
                    return false;
                }
            }

            if (inBattlefield(x + 1, i)) {
                if (battlefield[x + 1][i] === 1) {
                    return false;
                }
            }
        }
    }
    else {
        if (row + selectedShip.ship > 11) {
            return false;
        }

        if (row < 1) {
            return false;
        }

        if (inBattlefield(x - 1, y)) {
            if (battlefield[x - 1][y] === 1) {
                return false;
            }
        }

        if (inBattlefield(x + selectedShip.ship, y)) {
            if (battlefield[x + selectedShip.ship][y] === 1) {
                return false;
            }
        }

        for (i = x; i < (x + selectedShip.ship); i++) {
            if (inBattlefield(i, y - 1)) {
                if (battlefield[i][y - 1] === 1) {
                    return false;
                }
            }

            if (inBattlefield(i, y)) {
                if (battlefield[i][y] === 1) {
                    return false;
                }
            }

            if (inBattlefield(i, y + 1)) {
                if (battlefield[i][y + 1] === 1) {
                    return false;
                }
            }
        }
    }

    return true;
}

function updateCountdown() {
    var secElement = $("#countdownSec");
    var minsElement = $("#countdownMins");
    var countDownElement = $("#countDown");
    if (countdownSec > 5) {
        countDownElement.css('color', '#3c3c3c');
    }

    if (countdownSec === 0) {
        countdownSec = 59;

        if (countdownMins === 0) {

            if (stage === 1) {
                var left = 0;

                for (var i = 0; i < shipsLeft.length; i++) {
                    left += shipsLeft[i];
                }

                if (stage !== 3) {
                    if (left !== 0) {
                        socket.emit("gameError", stage, 0);
                    } else {
                        socket.emit('newServerMessage', 1);
                    }
                }
            }
            else {
                if (stage !== 3) {
                    if (shooting) {
                        socket.emit("gameError", stage, 0);
                    }
                }
            }
        }

        --countdownMins;
    }
    else {
        --countdownSec;
    }

    secElement.text(("0" + countdownSec).slice(-2));
    minsElement.text(("0" + countdownMins).slice(-2));

    if (countdownSec <= 5 && countdownMins === 0) {
        countDownElement.animateCss('pulse');
        countDownElement.css('color', '#ff4b46');
    }
}

function updateCounting() {
    var secElement = $("#countSec");
    var minsElement = $("#countMins");

    if (countingSec === 59) {
        countingSec = 0;
        ++countingMins;
    }
    else {
        ++countingSec;
    }

    secElement.text(("0" + countingSec).slice(-2));
    minsElement.text(("0" + countingMins).slice(-2));
}

$(function () {
    socket = io({transports: ['websocket'], upgrade: false});

    socket.on("connected", function (sessionData) {
        userData = sessionData.data;

        var id = window.location.hash.substr(1);
        if (id) {
            socket.emit("findGame", id);
        }
        location.hash.replace('#', '');
        location.hash = '';
    });

    socket.on("startGame", function (game) {
        if (ready === true) {
            readyChange();
        }

        if (countdownTimer) {
            clearInterval(countdownTimer);
        }

        if (countingTimer) {
            clearInterval(countingTimer);
        }

        if (shipDirection === 2) {
            changeDirection();
        }

        stage = 1;
        enemyBattlefield = null;
        ready = false;
        shooting = true;
        restoreField();

        socket.emit('setOpponent', game.enemy.id);

        HoldOn.close();
        clearInterval(countingTimer);

        opponent = game.enemy;
        shooting = game.starter === socket.id;

        $("#mainMenu").hide();
        $("#enemyBF").hide();
        $("#placingDiv").show();
        $("#game").show();

        var enemy = $("#enemy");
        enemy.html(game.enemy.username);
        enemy.css('color', game.enemy.color);
        $(".battlefield table").css("margin", "");
        $("#gameInstruction").html("Place your battleships!");

        socket.emit('newServerMessage', 0);

        $("#msgBox").empty();

        countdownSec = 0;
        countdownMins = 2;
        countdownTimer = setInterval(updateCountdown, 1000);
    });

    socket.on("readyToPlay", function () {
        renewBattlefield();
        stage = 2;

        if (shooting) {
            shot(null, null);
        }
        socket.emit("placedShips", battlefield);
        $("#placingDiv").hide();
        $("#enemyBF").show();
        $(".battlefield table").css("margin", "0 auto");
    });

    socket.on("shot", function (row, col) {
        shooting = true;
        var instructions = $("#gameInstruction");

        instructions.html("You are shooting!");
        instructions.animateCss('tada');

        if (countdownTimer) {
            clearInterval(countdownTimer);
        }
        countdownSec = 31;
        countdownMins = 0;
        updateCountdown();
        countdownTimer = setInterval(updateCountdown, 1000);

        if (row == null) {
            return;
        }

        var element = $("#row" + row + " .col" + col);
        element.html("<i class=\"fa fa-times\" aria-hidden=\"true\"></i>");
        if (battlefield[row - 1][col - 1] === 1) {
            element.css("background-color", "#ff4b46");
        }
    });

    socket.on("wonGame", function (winner) {
        $("#game").hide();
        $("#mainMenu").show();

        stage = 3;

        var player;
        var color;
        var message;

        if (socket.id === winner) {
            player = userData.username;
            color = userData.color;
            message = "You have won!";

            $("body").prepend("<div class=\"pyro\"><div class=\"before\"></div><div class=\"after\"></div></div>");
        }
        else {
            player = opponent.username;
            color = opponent.color;
            message = "You have been defeated!";
        }

        if (countdownTimer) {
            clearInterval(countdownTimer);
        }

        var options = {
            theme: "custom",
            content: "<div class='col'><div class='h5'>WINNER</div><h1 class='winner'><span style='color: " + color + ";'>" + player + "</span> </h1><div class='h5'>" + message + "</div></div>",
            message: '<button type="button" class="btn btn-secondary" id="endGame">Close</button>',
            backgroundColor: "#bde1fd",
            textColor: "white"
        };

        HoldOn.open(options);
    });

    socket.on("newMessage", function (message) {
        var dt = new Date();
        var box = $("#msgBox");


        box.append("<div class=\"message\"><strong>[" + ("0" + dt.getHours()).slice(-2) + ":" + ("0" + dt.getMinutes()).slice(-2) + "] " +
            "<span style='color: " + opponent.color + ";'>" + opponent.username + "</span></strong>: " + message + "</div>");
        box.scrollTop(box[0].scrollHeight);
    });

    socket.on("newServerMessage", function (message, code) {
        var dt = new Date();
        var box = $("#msgBox");

        switch (code) {
            case 1:
                socket.emit('setOpponentReady', true);
                break;
            case 2:
                socket.emit('setOpponentReady', true);
                break;
        }

        box.append("<div class=\"message\"><strong>[" + ("0" + dt.getHours()).slice(-2) + ":" + ("0" + dt.getMinutes()).slice(-2) + "] " + message + "</div>");
        box.scrollTop(box[0].scrollHeight);
    });

    socket.on("placedShips", function (battlefield) {
        enemyBattlefield = battlefield;
        shots = [
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        ];
    });

    socket.on("gameError", function (message) {
        if (stage === 1 || stage === 2) {
            $("#game").hide();
            $("#mainMenu").show();

            toastr.error(message);
            opponent = null;
        }
    });

    socket.on("enemyLeft", function () {
        if (stage === 1 || stage === 2) {
            $("#game").hide();
            $("#mainMenu").show();

            toastr.error(opponent.username + " has left the game.");
            opponent = null;
        }
    });

    $("#settingsSave").click(function () {
        userData.username = $("#settingsUsername").val();
        userData.settingsSoundVolume = $("#settingsSoundVolume").val();
        userData.settingsMuteSounds = $("#settingsMuteSounds").is(":checked");
        userData.color = $("#settingsColor").val();

        socket.emit('settingsChanged', {
            username: userData.username,
            soundVolume: userData.soundVolume,
            muteSounds: userData.muteSounds,
            color: userData.color
        });
        toastr.success("Settings successfully saved.");
    });

    $("#settingsOpen").click(function () {
        $("#settingsUsername").val(userData.username);
        $("#settingsSoundVolume").val(userData.settingsSoundVolume).change();
        $("#settingsColor").val(userData.color).change();


        var muteSoundsCheckbox = $("#settingsMuteSounds");

        if (userData.settingsMuteSounds) {
            muteSoundsCheckbox.find('span').addClass('checked');
            muteSoundsCheckbox.prop('checked', true);
        }
        else {
            muteSoundsCheckbox.find('span').removeClass('checked');
            muteSoundsCheckbox.prop('checked', false);
        }
    });

    $(document).on("click", "button#cancelPrivate", function () {
        HoldOn.close();
        socket.emit("cancelPrivate");
    });

    $(document).on("click", "button#newGameCancel", function () {
        HoldOn.close();
        if (countingTimer) {
            clearInterval(countingTimer);
            socket.emit("leaveQue");
        }
    });

    $(document).on("click", "button#endGame", function () {
        $(".pyro").remove();
        HoldOn.close();
    });

    $("#newGameFriend").click(function () {
        var url = location.protocol + '//' + location.host + location.pathname + '#';
        var ms = new Date().getTime();
        var id = ms + "" + (Math.floor(Math.random() * 50000) + 1);

        var options = {
            theme: "custom",
            content: "<div class='col sendLink'>Send this link to your friend <input value='" + url + id + "' id='inviteLink' class='form-control' type='text' readonly></div>",
            message: '<button type="button" class="btn btn-primary copy" data-clipboard-target="#inviteLink">Copy link</button> ' +
            '<button id="cancelPrivate" type="button" class="btn btn-secondary">Cancel</button>',
            backgroundColor: "#bde1fd",
            textColor: "white"
        };

        $('.modal').modal('hide');
        HoldOn.open(options);

        Tipped.create('.copy', function () {
            return "Invite link copied!";
        }, {
            cache: false,
            showOn: 'click'
        });

        socket.emit("createGame", id);
    });

    $("#newGameRandom").click(function () {
        var options = {
            theme: "custom",
            content: "<div class='col searchingOpponent'>Searching for opponent<div class='searchingTime'><span id='countMins'>00</span>:<span id='countSec'>00</span></div></div>",
            message: '<button type="button" class="btn btn-secondary" data-dismiss="modal" id="newGameCancel">Cancel searching</button>',
            backgroundColor: "#bde1fd",
            textColor: "white"
        };

        $('.modal').modal('hide');
        HoldOn.open(options);

        countingSec = 0;
        countingMins = 0;
        countingTimer = setInterval(updateCounting, 1000);

        socket.emit("joinQue");
    });

    var field = $(".battlefield td");

    field.hover(function () {
        if (stage === 1) {
            if (!ready) {
                var col = parseInt($(this).attr('class').match(/\d+/));
                var row = parseInt($(this).closest('tr').attr('id').match(/\d+/));

                if (shipFocus) {
                    renewBattlefield();
                    shipFocus = false;
                }

                if (battlefield[row - 1][col - 1] === 1) {
                    var ship = getShip(row - 1, col - 1);
                    for (s = 0; s < ship.length; s++) {
                        $("#row" + (ship[s][0] + 1) + " .col" + (ship[s][1] + 1)).css("background-color", "#86514e");
                    }

                    shipFocus = true;
                }
                else if (selectedShip) {
                    if (shipDirection === 1) {
                        col = getRealCol(col);
                        var done = false;
                        var x = selectedShip.ship;

                        while (!done) {
                            if (canPlaceShip(row, col)) {
                                for (var i = col; i < (col + selectedShip.ship); i++) {
                                    $("#row" + row + " .col" + i).css("background-color", "#6e867e");
                                }

                                done = true;
                            }
                            else {
                                col -= 1;

                                if (x === 1) {
                                    done = true;
                                }

                                --x;
                            }
                        }
                    }
                    else {
                        row = getRealRow(row);
                        var done = false;
                        var x = selectedShip.ship;

                        while (!done) {
                            if (canPlaceShip(row, col)) {
                                for (var i = row; i < (row + selectedShip.ship); i++) {
                                    $("#row" + i + " .col" + col).css("background-color", "#6e867e");
                                }

                                done = true;
                            }
                            else {
                                row -= 1;

                                if (x === 1) {
                                    done = true;
                                }

                                --x;
                            }
                        }
                    }
                }
            }
        }
    });

    field.click(function () {
        if (stage === 1) {
            var row = parseInt($(this).attr('class').match(/\d+/));
            var col = parseInt($(this).closest('tr').attr('id').match(/\d+/));


            if (battlefield[col - 1][row - 1] === 1) {
                if (ready) {
                    toastr.error("You can't do changes when marked as ready!");
                    return;
                }

                removeShip(getShip(col - 1, row - 1));
            }
            else {
                placeShip(row, col);
            }
        } else {
            var id = $(this).parent('tr')[0].id;

            if (id.indexOf("enemyRow") !== -1) {
                var col = parseInt($(this).attr('class').match(/\d+/));
                var row = parseInt($(this).closest('tr').attr('id').match(/\d+/));
                if (shooting) {
                    var colElement = $("#enemyRow" + row + " .col" + col);

                    if (colElement.hasClass("shot")) {
                        return;
                    }

                    colElement.addClass("shot");
                    shots[row - 1][col - 1] = 1;

                    if (enemyBattlefield[row - 1][col - 1] === 1) {
                        colElement.css("background-color", "#ff4b46");
                        enemyBattlefield[row - 1][col - 1] = 0;
                        checkForWin();
                    }

                    colElement.html("<i class=\"fa fa-times\" aria-hidden=\"true\"></i>");
                    shot(row, col);
                }
            }
        }
    });

    $(".btn").mouseup(function () {
        $(this).blur();
    });

    field.mouseout(function () {
        if (stage === 1) {
            if (!ready) {
                if (selectedShip) {
                    renewBattlefield();
                }
            }
        }
    });

    $(".battlefield").mouseout(function () {
        if (stage === 1) {
            renewBattlefield();
        }
    });

    $("#enemyBF").mouseout(function () {
        renewEnemyBattlefield();
    });
});