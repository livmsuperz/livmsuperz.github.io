const camera = document.getElementById("camera");
const overlay = document.getElementById("overlay");

const startCameraButton = document.getElementById("startCamera");
const restartButton = document.getElementById("restart");
const status = document.getElementById("status");

let stream = null;
let dotsStarted = false;


/* CAMERA STARTEN */

startCameraButton.addEventListener("click", async function () {

    try {

        status.textContent = "Camera wordt gestart...";

        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        camera.srcObject = stream;

        await camera.play();

        startCameraButton.disabled = true;
        restartButton.disabled = false;

        status.textContent =
            "Zet je vuisten op de groene bolletjes.";

        setupOverlay();

    } catch (error) {

        console.error(error);

        status.textContent =
            "Camera kon niet starten: " + error.name;
    }
});


/* CANVAS INSTELLEN */

function setupOverlay() {

    if (camera.videoWidth === 0 || camera.videoHeight === 0) {
        setTimeout(setupOverlay, 100);
        return;
    }

    overlay.width = camera.videoWidth;
    overlay.height = camera.videoHeight;

    if (!dotsStarted) {
        dotsStarted = true;
        drawDots();
    }
}


/* GROENE BOLLETJES */

function drawDots() {

    const ctx = overlay.getContext("2d");

    ctx.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );


    // LINKER BOLLETJE
    drawDot(
        ctx,
        overlay.width * 0.35,
        overlay.height * 0.35
    );


    // RECHTER BOLLETJE
    drawDot(
        ctx,
        overlay.width * 0.65,
        overlay.height * 0.35
    );


    requestAnimationFrame(drawDots);
}


/* ÉÉN BOLLETJE */

function drawDot(ctx, x, y) {

    // Gloed
    ctx.beginPath();

    ctx.arc(
        x,
        y,
        30,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "rgba(0, 255, 80, 0.35)";
    ctx.fill();


    // Groene kern
    ctx.beginPath();

    ctx.arc(
        x,
        y,
        15,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#00ff55";
    ctx.fill();


    // Witte rand
    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.stroke();
}


/* OPNIEUW */

restartButton.addEventListener("click", function () {

    if (stream) {

        stream.getTracks().forEach(function (track) {
            track.stop();
        });

        stream = null;
    }

    camera.srcObject = null;

    const ctx = overlay.getContext("2d");

    ctx.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );

    dotsStarted = false;

    startCameraButton.disabled = false;
    restartButton.disabled = true;

    status.textContent = "Camera uit.";
});