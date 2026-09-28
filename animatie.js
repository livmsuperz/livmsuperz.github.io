import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";


const camera = document.getElementById("camera");
const overlay = document.getElementById("overlay");

const startCameraButton =
    document.getElementById("startCamera");

const restartButton =
    document.getElementById("restart");

const status =
    document.getElementById("status");

const ctx = overlay.getContext("2d");

let stream = null;
let handLandmarker = null;
let detecting = false;


/* =========================
   MEDIAPIPE LADEN
========================= */

async function loadHandTracking() {

    status.textContent =
        "Handherkenning wordt geladen...";

    const vision =
        await FilesetResolver.forVisionTasks(
            "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );

    handLandmarker =
        await HandLandmarker.createFromOptions(
            vision,
            {
                baseOptions: {
                    modelAssetPath:
                        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",

                    delegate: "GPU"
                },

                runningMode: "VIDEO",

                numHands: 2
            }
        );

    status.textContent =
        "Handherkenning klaar!";
}


/* =========================
   CAMERA STARTEN
========================= */

startCameraButton.addEventListener(
    "click",
    async function () {

        try {

            status.textContent =
                "Camera wordt gestart...";

            stream =
                await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });

            camera.srcObject = stream;

            await camera.play();


            /* Canvas goed instellen */

            overlay.width =
                camera.videoWidth;

            overlay.height =
                camera.videoHeight;


            startCameraButton.disabled = true;
            restartButton.disabled = false;


            /* Handherkenning laden */

            await loadHandTracking();


            status.textContent =
                "Steek je handen in beeld.";


            detecting = true;

            detectHands();


        } catch (error) {

            console.error(error);

            status.textContent =
                "Fout: " + error.message;
        }
    }
);


/* =========================
   HANDEN HERKENNEN
========================= */

async function detectHands() {

    if (!detecting) {
        return;
    }


    if (
        camera.readyState >= 2 &&
        handLandmarker
    ) {

        const results =
            handLandmarker.detectForVideo(
                camera,
                performance.now()
            );


        ctx.clearRect(
            0,
            0,
            overlay.width,
            overlay.height
        );


        if (
            results.landmarks &&
            results.landmarks.length > 0
        ) {

            status.textContent =
                "👋 Hand gevonden!";

            drawHands(results.landmarks);

        } else {

            status.textContent =
                "Steek je handen in beeld.";
        }
    }


    requestAnimationFrame(detectHands);
}


/* =========================
   HANDPUNTEN TEKENEN
========================= */

function drawHands(hands) {

    for (const hand of hands) {

        for (const point of hand) {

            const x =
                point.x * overlay.width;

            const y =
                point.y * overlay.height;


            ctx.beginPath();

            ctx.arc(
                x,
                y,
                5,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                "#00ff55";

            ctx.fill();
        }
    }
}


/* =========================
   OPNIEUW
========================= */

restartButton.addEventListener(
    "click",
    function () {

        detecting = false;


        if (stream) {

            stream.getTracks().forEach(
                function (track) {
                    track.stop();
                }
            );

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


        status.textContent =
            "Camera uit.";
    }
);