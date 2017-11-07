var userData = null;

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
