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

let pose1Captured = false;
let captureTimer = null;


/* =========================
   HANDHERKENNING LADEN
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

        status.textContent =
            "Pose 1: zet beide handen op de groene bolletjes.";

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
   TEKENEN + POSE CONTROLEREN
========================= */

function drawEverything(results) {

    ctx.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );


    const leftTarget = {
        x: overlay.width * 0.35,
        y: overlay.height * 0.35
    };

    const rightTarget = {
        x: overlay.width * 0.65,
        y: overlay.height * 0.35
    };


    let hands = [];


    if (
        results.landmarks &&
        results.landmarks.length > 0
    ) {

        for (const hand of results.landmarks) {

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


            hands.push({
                x: averageX * overlay.width,
                y: averageY * overlay.height
            });
        }
    }


    /* =========================
       HANDEN TEKENEN
    ========================= */

    for (const hand of hands) {

        ctx.beginPath();

        ctx.arc(
            hand.x,
            hand.y,
            12,
            0,
            Math.PI * 2
        );

        ctx.fillStyle = "#ff00ff";

        ctx.fill();
    }


    /* =========================
       DOELEN
    ========================= */

    let leftCorrect = false;
    let rightCorrect = false;

    const detectionDistance = 90;


    for (const hand of hands) {

        const distanceLeft = Math.hypot(
            hand.x - leftTarget.x,
            hand.y - leftTarget.y
        );

        const distanceRight = Math.hypot(
            hand.x - rightTarget.x,
            hand.y - rightTarget.y
        );


        if (distanceLeft < detectionDistance) {
            leftCorrect = true;
        }

        if (distanceRight < detectionDistance) {
            rightCorrect = true;
        }
    }


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


    /* =========================
       POSE 1 VASTLEGGEN
    ========================= */

    if (
        leftCorrect &&
        rightCorrect &&
        !pose1Captured &&
        hands.length >= 2
    ) {

        if (captureTimer === null) {

            status.textContent =
                "🎯 Goed! Blijf even stil...";

            captureTimer = setTimeout(() => {

                capturePose1();

            }, 1000);
        }

    } else if (
        (!leftCorrect || !rightCorrect) &&
        captureTimer !== null
    ) {

        clearTimeout(captureTimer);

        captureTimer = null;
    }


    /* =========================
       NORMALE STATUS
    ========================= */

    if (!pose1Captured) {

        if (leftCorrect && rightCorrect) {

            status.textContent =
                "🎯 Beide handen goed! Blijf stil...";

        } else if (leftCorrect || rightCorrect) {

            status.textContent =
                "🟢 Eén hand staat goed.";

        } else {

            status.textContent =
                "Zet beide handen op de groene bolletjes.";
        }
    }
}


/* =========================
   POSE 1 OPSLAAN
========================= */

function capturePose1() {

    pose1Captured = true;

    captureTimer = null;


    /* Maak een foto van het camerabeeld */

    const frameCanvas =
        document.createElement("canvas");

    frameCanvas.width =
        camera.videoWidth;

    frameCanvas.height =
        camera.videoHeight;

    const frameCtx =
        frameCanvas.getContext("2d");


    /*
     * Omdat de camera gespiegeld wordt weergegeven,
     * spiegelen we het opgeslagen frame ook.
     */

    frameCtx.translate(
        frameCanvas.width,
        0
    );

    frameCtx.scale(-1, 1);

    frameCtx.drawImage(
        camera,
        0,
        0,
        frameCanvas.width,
        frameCanvas.height
    );


    console.log(
        "Pose 1 opgeslagen!",
        frameCanvas.toDataURL("image/png")
    );


    status.textContent =
        "📸 Pose 1 opgeslagen!";


    /*
     * Voorlopig stoppen we hier.
     * Later gaat dit automatisch naar Pose 2.
     */
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

    if (captureTimer !== null) {
        clearTimeout(captureTimer);
        captureTimer = null;
    }

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

    pose1Captured = false;

    startCameraButton.disabled = false;
    restartButton.disabled = true;

    status.textContent = "Camera uit.";
});