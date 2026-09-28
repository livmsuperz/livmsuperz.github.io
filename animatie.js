const camera = document.getElementById("camera");
const overlay = document.getElementById("overlay");

const startCameraButton = document.getElementById("startCamera");
const restartButton = document.getElementById("restart");

const instruction = document.getElementById("instruction");
const status = document.getElementById("status");

const overlayContext = overlay.getContext("2d");

let stream = null;


/* =========================
   CAMERA STARTEN
   ========================= */

startCameraButton.addEventListener("click", async () => {

    try {

        stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: "user"
            },
            audio: false
        });

        // Camera koppelen aan video
        camera.srcObject = stream;

        camera.muted = true;
        camera.autoplay = true;
        camera.playsInline = true;

        await camera.play();

        instruction.textContent =
            "Camera is aan! Zet je vuisten bij de groene bolletjes.";

        status.textContent =
            "Pose 1: zet je vuisten op de groene bolletjes.";

        startCameraButton.disabled = true;
        restartButton.disabled = false;

        // Wacht tot de camera afmetingen heeft
        if (camera.readyState >= 2) {
            setupOverlay();
        } else {
            camera.addEventListener(
                "loadedmetadata",
                setupOverlay,
                { once: true }
            );
        }

    } catch (error) {

        console.error("Camera fout:", error);

        if (error.name === "NotAllowedError") {

            status.textContent =
                "Camera-toegang is geweigerd. Geef Chrome toestemming voor de camera.";

        } else if (error.name === "NotFoundError") {

            status.textContent =
                "Er is geen camera gevonden.";

        } else {

            status.textContent =
                "Er ging iets mis: " + error.name;
        }
    }
});


/* =========================
   OVERLAY INSTELLEN
   ========================= */

function setupOverlay() {

    overlay.width = camera.videoWidth;
    overlay.height = camera.videoHeight;

    drawPose1();
}


/* =========================
   GROENE BOLLETJES
   ========================= */

function drawPose1() {

    if (!camera.videoWidth || !camera.videoHeight) {
        requestAnimationFrame(drawPose1);
        return;
    }

    overlayContext.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );


    /*
       POSE 1

       Links: ongeveer onder de kin
       Rechts: ongeveer bij de ogen

       Deze waarden kunnen we later
       aanpassen nadat je ze hebt getest.
    */

    const leftX = overlay.width * 0.42;
    const rightX = overlay.width * 0.58;

    const y = overlay.height * 0.35;


    drawGreenDot(leftX, y);
    drawGreenDot(rightX, y);


    requestAnimationFrame(drawPose1);
}


/* =========================
   GROEN BOLLETJE
   ========================= */

function drawGreenDot(x, y) {

    // Buitenste gloed
    overlayContext.beginPath();

    overlayContext.arc(
        x,
        y,
        22,
        0,
        Math.PI * 2
    );

    overlayContext.fillStyle =
        "rgba(50, 255, 100, 0.25)";

    overlayContext.fill();


    // Groene cirkel
    overlayContext.beginPath();

    overlayContext.arc(
        x,
        y,
        10,
        0,
        Math.PI * 2
    );

    overlayContext.fillStyle =
        "#39ff6a";

    overlayContext.fill();

    overlayContext.strokeStyle =
        "white";

    overlayContext.lineWidth = 2;

    overlayContext.stroke();
}


/* =========================
   OPNIEUW
   ========================= */

restartButton.addEventListener("click", () => {

    if (stream) {

        stream.getTracks().forEach(track => {
            track.stop();
        });

        stream = null;
    }

    camera.srcObject = null;

    overlayContext.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );

    startCameraButton.disabled = false;

    restartButton.disabled = true;

    instruction.textContent =
        'Klik op "Camera starten" om te beginnen.';

    status.textContent =
        "Camera uit.";
});