var userData = null;
var countingTimer;
var countingSec;
var countingMins;

$(function () {
    var socket = io({transports: ['websocket'], upgrade: false});

    socket.on('connected', function (sessionData) {
        userData = sessionData.data;
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

function updateCounting() {
    var secElement = $("#countSec");
    var minsElement = $("#countMins");

    if (countingSec == 59) {
        countingSec = 0;
        ++countingMins;
    }
    else {
        ++countingSec;
    }

    secElement.text(("0" + countingSec).slice(-2));
    minsElement.text(("0" + countingMins).slice(-2));
}

function cancelSearching() {
    HoldOn.close();
    clearInterval(countingTimer);
}

$("#newGameRandom").click(function () {
    var options = {
        theme: "custom",
        content: "<div class='col'>Searching for an opponent<div class='searchingTime'><span id='countMins'>00</span>:<span id='countSec'>00</span></div></div>",
        message: '<button type="button" class="btn btn-secondary" data-dismiss="modal" onclick="cancelSearching();">Cancel searching</button>',
        backgroundColor: "#bde1fd",
        textColor: "white"
    };

    $('.modal').modal('hide');
    HoldOn.open(options);

    countingSec = 0;
    countingMins = 0;
    countingTimer = setInterval(updateCounting, 1000);
});