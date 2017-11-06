var userData = null;

function setupSettingsModal() {
    $("#settingsUsername").val(userData.username);
    $("#settingsSoundVolume").val(userData.settingsSoundVolume).change();
    $("#settingsMuteSounds").attr("checked", userData.settingsMuteSounds);
}

$(function () {
    var socket = io({transports: ['websocket'], upgrade: false});

    socket.on('connected', function (sessionData) {
        userData = sessionData.data;
        setupSettingsModal();
    });

    $("#settingsSave").click(function () {
        socket.emit('settingsChanged', {
            username: $("#settingsUsername").val(),
            soundVolume: $("#settingsSoundVolume").val(),
            muteSounds: $("#settingsMuteSounds").is(":checked")
        });
        toastr.success("Settings successfully saved.");
    });
});
