/**
 * TODO Change title on page change
 * TODO Add sounds
 * TODO Add posibility to open settings while playing (with ESC key bind)
 */

var userData = null;
var opponent = null;
var countingTimer;
var countingSec;
var countingMins;

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
    var socket = io({transports: ['websocket'], upgrade: false});

    socket.on("connected", function (sessionData) {
        userData = sessionData.data;
    });

    socket.on("startGame", function (game) {
        HoldOn.close();
        clearInterval(countingTimer);

        opponent = game.enemy;

        $("#mainMenu").hide();
        $("#game").show();

        var enemy = $("#enemy");
        enemy.html(game.enemy.username);
        enemy.css('color', game.enemy.color);
    });

    socket.on("enemyLeft", function () {
        $("#game").hide();
        $("#mainMenu").show();

        toastr.error(opponent.username + " has left the game.");
        opponent = null;
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

    $(document).on("click", "button#newGameCancel", function () {
        HoldOn.close();
        clearInterval(countingTimer);
        socket.emit("leaveQue");
    });

    $("#newGameRandom").click(function () {
        var options = {
            theme: "custom",
            content: "<div class='col'>Searching for opponent<div class='searchingTime'><span id='countMins'>00</span>:<span id='countSec'>00</span></div></div>",
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
});