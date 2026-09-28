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

const instruction =
    document.getElementById("instruction");

const status =
    document.getElementById("status");

const overlayContext =
    overlay.getContext("2d");


let stream = null;
let handLandmarker = null;
let lastVideoTime = -1;

let pose1Complete = false;


/* =================================
   MEDIAPIPE LADEN
   ================================= */

async function setupHandTracking() {

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
        "Handherkenning is klaar!";

}


/* =================================
   CAMERA STARTEN
   ================================= */

startCameraButton.addEventListener(
    "click",
    async () => {

        try {

            status.textContent =
                "Camera wordt gestart...";


            await setupHandTracking();


            stream =
                await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "user",
                        width: {
                            ideal: 1280
                        },
                        height: {
                            ideal: 720
                        }
                    },

                    audio: false
                });


            camera.srcObject = stream;

            camera.muted = true;
            camera.autoplay = true;
            camera.playsInline = true;


            await camera.play();


            startCameraButton.disabled = true;

            restartButton.disabled = false;


            instruction.textContent =
                "Pose 1: zet je vuisten bij de groene bolletjes.";

            status.textContent =
                "Zoek de twee groene bolletjes.";


            camera.addEventListener(
                "loadedmetadata",
                () => {

                    overlay.width =
                        camera.videoWidth;

                    overlay.height =
                        camera.videoHeight;

                    detectHands();

                },
                {
                    once: true
                }
            );


        } catch (error) {

            console.error(error);

            status.textContent =
                "Er ging iets mis: " + error.message;

        }

    }
);


/* =================================
   HANDEN HERKENNEN
   ================================= */

async function detectHands() {

    if (
        handLandmarker &&
        camera.readyState >= 2 &&
        camera.currentTime !== lastVideoTime
    ) {

        lastVideoTime =
            camera.currentTime;


        const results =
            handLandmarker.detectForVideo(
                camera,
                performance.now()
            );


        drawPose1(results);
    }


    requestAnimationFrame(detectHands);
}


/* =================================
   POSE 1 TEKENEN
   ================================= */

function drawPose1(results) {

    overlayContext.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );


    /*
        GROENE DOELEN

        Links = vuist onder kin
        Rechts = vuist bij ogen
    */

    const leftTarget = {
        x: overlay.width * 0.42,
        y: overlay.height * 0.35
    };


    const rightTarget = {
        x: overlay.width * 0.58,
        y: overlay.height * 0.35
    };


    drawGreenDot(
        leftTarget.x,
        leftTarget.y
    );


    drawGreenDot(
        rightTarget.x,
        rightTarget.y
    );


    /*
        Handen tekenen
    */

    if (
        results &&
        results.landmarks &&
        results.landmarks.length > 0
    ) {

        for (
            const hand of results.landmarks
        ) {

            drawHand(hand);
        }


        /*
            Controleer de positie
            van de handen.
        */

        checkPose1(
            results.landmarks,
            leftTarget,
            rightTarget
        );
    }

}


/* =================================
   GROEN BOLLETJE
   ================================= */

function drawGreenDot(x, y) {

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


/* =================================
   HAND TEKENEN
   ================================= */

function drawHand(hand) {

    /*
        We tekenen alleen de
        belangrijkste punten.
    */

    for (const point of hand) {

        const x =
            point.x * overlay.width;

        const y =
            point.y * overlay.height;


        overlayContext.beginPath();

        overlayContext.arc(
            x,
            y,
            4,
            0,
            Math.PI * 2
        );

        overlayContext.fillStyle =
            "rgba(255,255,255,0.8)";

        overlayContext.fill();

    }

}


/* =================================
   POSE 1 CONTROLEREN
   ================================= */

function checkPose1(
    hands,
    leftTarget,
    rightTarget
) {

    if (pose1Complete) {
        return;
    }


    if (hands.length < 2) {

        status.textContent =
            "Laat beide handen zien.";

        return;
    }


    /*
        We gebruiken landmark 0:
        de pols.

        Later kunnen we dit veranderen
        naar een betere vuist-detectie.
    */

    const hand1 = hands[0][0];

    const hand2 = hands[1][0];


    const point1 = {
        x: hand1.x * overlay.width,
        y: hand1.y * overlay.height
    };


    const point2 = {
        x: hand2.x * overlay.width,
        y: hand2.y * overlay.height
    };


    const distance1 =
        distance(point1, leftTarget);


    const distance2 =
        distance(point2, rightTarget);


    const distance3 =
        distance(point1, rightTarget);


    const distance4 =
        distance(point2, leftTarget);


    /*
        We accepteren beide
        hand-volgordes.
    */

    const correctOrder =
        distance1 < 100 &&
        distance2 < 100;


    const reversedOrder =
        distance3 < 100 &&
        distance4 < 100;


    if (
        correctOrder ||
        reversedOrder
    ) {

        status.textContent =
            "✓ Pose 1 goed!";


        pose1Complete = true;


        /*
            Voor nu alleen testen.
            De volgende stap maakt
            automatisch de foto.
        */

        setTimeout(() => {

            status.textContent =
                "Pose 1 herkend!";

        }, 500);

    } else {

        status.textContent =
            "Beweeg je handen naar de groene bolletjes.";

    }

}


/* =================================
   AFSTAND BEREKENEN
   ================================= */

function distance(point1, point2) {

    const dx =
        point1.x - point2.x;

    const dy =
        point1.y - point2.y;


    return Math.sqrt(
        dx * dx +
        dy * dy
    );

}


/* =================================
   OPNIEUW
   ================================= */

restartButton.addEventListener(
    "click",
    () => {

        if (stream) {

            stream
                .getTracks()
                .forEach(track => {
                    track.stop();
                });

            stream = null;
        }


        camera.srcObject = null;


        pose1Complete = false;


        overlayContext.clearRect(
            0,
            0,
            overlay.width,
            overlay.height
        );


        startCameraButton.disabled =
            false;

        restartButton.disabled =
            true;


        instruction.textContent =
            'Klik op "Camera starten" om te beginnen.';

        status.textContent =
            "Camera uit.";

    }
);