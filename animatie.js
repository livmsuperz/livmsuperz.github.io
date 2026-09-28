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


/* HANDHERKENNING LADEN */

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


/* CAMERA */

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


/* HANDEN DETECTEREN */

function detectHands() {

    if (!detecting) {
        return;
    }

    if (
        handLandmarker &&
        camera.readyState >= 2
    ) {

        const results =
            handLandmarker.detectForVideo(
                camera,
                performance.now()
            );

        drawEverything(results);
    }

    requestAnimationFrame(detectHands);
}


/* ALLES TEKENEN */

function drawEverything(results) {

    ctx.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );


    /* VASTE DOELBOLLETJES */

    drawTarget(
        overlay.width * 0.35,
        overlay.height * 0.35
    );

    drawTarget(
        overlay.width * 0.65,
        overlay.height * 0.35
    );


    /* HANDEN */

    if (
        results.landmarks &&
        results.landmarks.length > 0
    ) {

        status.textContent =
            "👋 Hand gevonden!";

        for (const hand of results.landmarks) {

            for (const point of hand) {

                const x =
                    point.x * overlay.width;

                const y =
                    point.y * overlay.height;


                ctx.beginPath();

                ctx.arc(
                    x,
                    y,
                    7,
                    0,
                    Math.PI * 2
                );

                ctx.fillStyle = "#ff00ff";

                ctx.fill();
            }
        }

    } else {

        status.textContent =
            "Steek je handen in beeld.";
    }
}


/* DOELBOLLETJE */

function drawTarget(x, y) {

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        30,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "rgba(0, 255, 80, 0.35)";

    ctx.fill();


    ctx.beginPath();

    ctx.arc(
        x,
        y,
        15,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        "#00ff55";

    ctx.fill();


    ctx.strokeStyle = "white";
    ctx.lineWidth = 3;
    ctx.stroke();
}


/* OPNIEUW */

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