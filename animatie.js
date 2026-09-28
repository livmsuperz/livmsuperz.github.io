import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";

const camera = document.getElementById("camera");
const overlay = document.getElementById("overlay");

const startCameraButton = document.getElementById("startCamera");
const restartButton = document.getElementById("restart");
const status = document.getElementById("status");

const ctx = overlay.getContext("2d");

let stream = null;
let handLandmarker = null;
let detecting = false;


/* =========================
   HANDHERKENNING
========================= */

async function loadHandTracking() {

    status.textContent = "Handherkenning laden...";

    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
    );

    handLandmarker = await HandLandmarker.createFromOptions(
        vision,
        {
            baseOptions: {
                modelAssetPath:
                    "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
            },

            runningMode: "VIDEO",
            numHands: 2
        }
    );

    status.textContent = "Handherkenning klaar!";
}


/* =========================
   CAMERA STARTEN
========================= */

startCameraButton.addEventListener("click", async () => {

    try {

        status.textContent = "Camera wordt gestart...";

        stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
        });

        camera.srcObject = stream;

        await camera.play();

        overlay.width = camera.videoWidth;
        overlay.height = camera.videoHeight;

        startCameraButton.disabled = true;
        restartButton.disabled = false;

        await loadHandTracking();

        detecting = true;

        detectHands();

    } catch (error) {

        console.error(error);

        status.textContent =
            "Fout: " + error.message;
    }
});


/* =========================
   HANDEN DETECTEREN
========================= */

function detectHands() {

    if (!detecting) {
        return;
    }

    if (handLandmarker && camera.readyState >= 2) {

        const results =
            handLandmarker.detectForVideo(
                camera,
                performance.now()
            );

        drawEverything(results);
    }

    requestAnimationFrame(detectHands);
}


/* =========================
   TEKENEN + CONTROLEREN
========================= */

function drawEverything(results) {

    ctx.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );


    /* De twee doelen */

    const leftTarget = {
        x: overlay.width * 0.35,
        y: overlay.height * 0.35
    };

    const rightTarget = {
        x: overlay.width * 0.65,
        y: overlay.height * 0.35
    };


    let leftCorrect = false;
    let rightCorrect = false;


    /* Doelbolletjes tekenen */

    drawTarget(
        leftTarget.x,
        leftTarget.y,
        false
    );

    drawTarget(
        rightTarget.x,
        rightTarget.y,
        false
    );


    /* Handen */

    if (
        results.landmarks &&
        results.landmarks.length > 0
    ) {

        for (const hand of results.landmarks) {

            /*
             * Landmark 0 = pols.
             * We gebruiken het midden van de hand
             * door enkele belangrijke punten te middelen.
             */

            const palmPoints = [
                hand[0],
                hand[5],
                hand[9],
                hand[13],
                hand[17]
            ];

            let averageX = 0;
            let averageY = 0;

            for (const point of palmPoints) {
                averageX += point.x;
                averageY += point.y;
            }

            averageX /= palmPoints.length;
            averageY /= palmPoints.length;


            const handX =
                averageX * overlay.width;

            const handY =
                averageY * overlay.height;


            /* Handpunt tekenen */

            ctx.beginPath();

            ctx.arc(
                handX,
                handY,
                12,
                0,
                Math.PI * 2
            );

            ctx.fillStyle = "#ff00ff";
            ctx.fill();


            /* Afstand tot linker doel */

            const distanceLeft =
                Math.hypot(
                    handX - leftTarget.x,
                    handY - leftTarget.y
                );


            /* Afstand tot rechter doel */

            const distanceRight =
                Math.hypot(
                    handX - rightTarget.x,
                    handY - rightTarget.y
                );


            /*
             * Als de hand dichtbij genoeg is,
             * is het doel geraakt.
             */

            const detectionDistance = 90;


            if (distanceLeft < detectionDistance) {
                leftCorrect = true;
            }

            if (distanceRight < detectionDistance) {
                rightCorrect = true;
            }
        }
    }


    /* Doelen opnieuw tekenen met juiste status */

    drawTarget(
        leftTarget.x,
        leftTarget.y,
        leftCorrect
    );

    drawTarget(
        rightTarget.x,
        rightTarget.y,
        rightCorrect
    );


    /* Status */

    if (leftCorrect && rightCorrect) {

        status.textContent =
            "🎯 Beide handen staan goed!";

    } else if (leftCorrect || rightCorrect) {

        status.textContent =
            "🟢 Eén hand staat goed!";

    } else {

        status.textContent =
            "Zet je handen op de groene bolletjes.";
    }
}


/* =========================
   DOELBOLLETJE
========================= */

function drawTarget(x, y, correct) {

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        30,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = correct
        ? "rgba(0, 255, 120, 0.75)"
        : "rgba(0, 255, 80, 0.35)";

    ctx.fill();


    ctx.beginPath();

    ctx.arc(
        x,
        y,
        15,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = correct
        ? "#ffffff"
        : "#00ff55";

    ctx.fill();


    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;

    ctx.stroke();
}


/* =========================
   OPNIEUW
========================= */

restartButton.addEventListener("click", () => {

    detecting = false;

    if (stream) {

        stream.getTracks().forEach(track => {
            track.stop();
        });

        stream = null;
    }

    camera.srcObject = null;

    ctx.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );

    startCameraButton.disabled = false;
    restartButton.disabled = true;

    status.textContent = "Camera uit.";
});