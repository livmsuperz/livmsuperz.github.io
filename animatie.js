const camera = document.getElementById("camera");
const startCameraButton = document.getElementById("startCamera");
const restartButton = document.getElementById("restart");
const status = document.getElementById("status");

let stream = null;

startCameraButton.addEventListener("click", async function () {

    console.log("Start-knop werkt!");

    try {

        status.textContent = "Camera wordt gestart...";

        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        camera.srcObject = stream;

        await camera.play();

        status.textContent = "Camera werkt!";

        startCameraButton.disabled = true;
        restartButton.disabled = false;

    } catch (error) {

        console.error("Camera fout:", error);

        status.textContent =
            "Camera kon niet starten: " + error.name;
    }
});


restartButton.addEventListener("click", function () {

    if (stream) {

        stream.getTracks().forEach(function (track) {
            track.stop();
        });

        stream = null;
    }

    camera.srcObject = null;

    startCameraButton.disabled = false;
    restartButton.disabled = true;

    status.textContent = "Camera uit.";
});