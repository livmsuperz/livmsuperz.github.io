import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";


// ========================================
// HTML ELEMENTEN
// ========================================

const camera = document.getElementById("camera");
const overlay = document.getElementById("overlay");

const startCameraButton =
    document.getElementById("startCamera");

const restartButton =
    document.getElementById("restart");

const status =
    document.getElementById("status");

const poseTitle =
    document.getElementById("poseTitle");

const progressText =
    document.getElementById("progressText");

const animationSection =
    document.getElementById("animationSection");

const playAnimationButton =
    document.getElementById("playAnimation");

const animationCanvas =
    document.getElementById("animationCanvas");

const music =
    document.getElementById("music");

const ctx =
    overlay.getContext("2d");

const animationCtx =
    animationCanvas
        ? animationCanvas.getContext("2d")
        : null;


// ========================================
// VARIABELEN
// ========================================

let stream = null;

let handLandmarker = null;

let detecting = false;

let currentPose = 1;

let captureTimer = null;

let capturedFrames = [];

let animationRunning = false;

let animationFrameId = null;


// ========================================
// MEDIAPIPE LADEN
// ========================================

async function loadHandTracking() {

    status.textContent =
        "Handherkenning laden...";

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
                        "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
                },

                runningMode: "VIDEO",

                numHands: 2
            }
        );

    status.textContent =
        "Handherkenning klaar!";
}


// ========================================
// CAMERA STARTEN
// ========================================

startCameraButton.addEventListener(
    "click",
    async () => {

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

            overlay.width =
                camera.videoWidth;

            overlay.height =
                camera.videoHeight;

            startCameraButton.disabled =
                true;

            restartButton.disabled =
                false;

            capturedFrames = [];

            currentPose = 1;

            await loadHandTracking();

            detecting = true;

            updatePoseText();

            detectHands();

        } catch (error) {

            console.error(error);

            status.textContent =
                "Fout: " + error.message;

        }

    }
);


// ========================================
// HANDEN DETECTEREN
// ========================================

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

    requestAnimationFrame(
        detectHands
    );
}


// ========================================
// TEKST
// ========================================

function updatePoseText() {

    poseTitle.textContent =
        "Pose " + currentPose;

    progressText.textContent =
        capturedFrames.length + " / 3";


    if (currentPose === 1) {

        status.textContent =
            "Zet je vuisten op de groene bolletjes.";

    }


    if (currentPose === 2) {

        status.textContent =
            "Houd je handen plat naast je oren.";

    }


    if (currentPose === 3) {

        status.textContent =
            "Houd je handen plat naast je kin.";

    }

}


// ========================================
// ALLES TEKENEN
// ========================================

function drawEverything(results) {

    ctx.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );


    // ====================================
    // GROENE DOELPUNTEN
    // ====================================

    let targets = [];


    if (currentPose === 1) {

        targets = [

            {
                x: overlay.width * 0.42,
                y: overlay.height * 0.58
            },

            {
                x: overlay.width * 0.65,
                y: overlay.height * 0.32
            }

        ];

    }


    if (currentPose === 2) {

        targets = [

            {
                x: overlay.width * 0.28,
                y: overlay.height * 0.35
            },

            {
                x: overlay.width * 0.72,
                y: overlay.height * 0.35
            }

        ];

    }


    if (currentPose === 3) {

        targets = [

            {
                x: overlay.width * 0.38,
                y: overlay.height * 0.65
            },

            {
                x: overlay.width * 0.62,
                y: overlay.height * 0.65
            }

        ];

    }


    // ====================================
    // HANDEN
    // ====================================

    let hands = [];


    if (
        results.landmarks &&
        results.landmarks.length > 0
    ) {

        for (
            const hand of results.landmarks
        ) {

            const palmPoints = [

                hand[0],
                hand[5],
                hand[9],
                hand[13],
                hand[17]

            ];


            let averageX = 0;
            let averageY = 0;


            for (
                const point of palmPoints
            ) {

                averageX += point.x;
                averageY += point.y;

            }


            averageX /=
                palmPoints.length;

            averageY /=
                palmPoints.length;


            hands.push({

                x:
                    averageX *
                    overlay.width,

                y:
                    averageY *
                    overlay.height

            });

        }

    }


    // ====================================
    // HANDPUNTEN
    // ====================================

    for (
        const hand of hands
    ) {

        ctx.beginPath();

        ctx.arc(
            hand.x,
            hand.y,
            12,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "#ff00ff";

        ctx.fill();

    }


    // ====================================
    // AFSTAND
    // ====================================

    let target1Correct = false;
    let target2Correct = false;

    const detectionDistance = 90;


    for (
        const hand of hands
    ) {

        const distance1 =
            Math.hypot(
                hand.x - targets[0].x,
                hand.y - targets[0].y
            );


        const distance2 =
            Math.hypot(
                hand.x - targets[1].x,
                hand.y - targets[1].y
            );


        if (
            distance1 <
            detectionDistance
        ) {

            target1Correct = true;

        }


        if (
            distance2 <
            detectionDistance
        ) {

            target2Correct = true;

        }

    }


    // ====================================
    // GROENE PUNTEN
    // ====================================

    drawTarget(
        targets[0].x,
        targets[0].y,
        target1Correct
    );

    drawTarget(
        targets[1].x,
        targets[1].y,
        target2Correct
    );


    // ====================================
    // AUTOMATISCHE FOTO
    // ====================================

    if (
        target1Correct &&
        target2Correct &&
        hands.length >= 2
    ) {

        if (
            captureTimer === null
        ) {

            status.textContent =
                "🎯 Goed! Blijf even stil...";


            captureTimer =
                setTimeout(
                    () => {

                        captureCurrentPose();

                    },
                    1000
                );

        }

    } else {

        if (
            captureTimer !== null
        ) {

            clearTimeout(
                captureTimer
            );

            captureTimer = null;

        }


        updatePoseText();

    }

}


// ========================================
// GROEN DOELPUNT
// ========================================

function drawTarget(
    x,
    y,
    correct
) {

    ctx.beginPath();

    ctx.arc(
        x,
        y,
        30,
        0,
        Math.PI * 2
    );

    ctx.fillStyle =
        correct
            ? "rgba(0,255,120,0.75)"
            : "rgba(0,255,80,0.35)";

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
        correct
            ? "white"
            : "#00ff55";

    ctx.fill();


    ctx.strokeStyle =
        "white";

    ctx.lineWidth = 3;

    ctx.stroke();

}


// ========================================
// POSE OPSLAAN
// ========================================

function captureCurrentPose() {

    captureTimer = null;


    const frameCanvas =
        document.createElement("canvas");


    frameCanvas.width =
        camera.videoWidth;

    frameCanvas.height =
        camera.videoHeight;


    const frameCtx =
        frameCanvas.getContext("2d");


    // Spiegel de webcamfoto
    frameCtx.translate(
        frameCanvas.width,
        0
    );

    frameCtx.scale(
        -1,
        1
    );


    frameCtx.drawImage(
        camera,
        0,
        0,
        frameCanvas.width,
        frameCanvas.height
    );


    capturedFrames.push(
        frameCanvas
    );


    console.log(
        "Pose opgeslagen:",
        currentPose
    );


    progressText.textContent =
        capturedFrames.length + " / 3";


    status.textContent =
        "📸 Pose " +
        currentPose +
        " opgeslagen!";


    if (
        currentPose < 3
    ) {

        currentPose++;


        setTimeout(
            () => {

                updatePoseText();

            },
            500
        );

    } else {

        finishPoses();

    }

}


// ========================================
// ALLE POSES KLAAR
// ========================================

function finishPoses() {

    detecting = false;


    poseTitle.textContent =
        "Klaar! ✨";


    status.textContent =
        "🎉 Alle 3 poses zijn opgeslagen!";


    progressText.textContent =
        "3 / 3";


    if (animationSection) {

        animationSection.classList.remove(
            "hidden"
        );

    }


    console.log(
        "Alle frames:",
        capturedFrames
    );

}


// ========================================
// OPNIEUW
// ========================================

restartButton.addEventListener(
    "click",
    () => {

        detecting = false;


        if (
            captureTimer !== null
        ) {

            clearTimeout(
                captureTimer
            );

            captureTimer = null;

        }


        if (animationFrameId !== null) {

            cancelAnimationFrame(
                animationFrameId
            );

            animationFrameId = null;

        }


        if (music) {

            music.pause();

            music.currentTime = 0;

        }


        if (stream) {

            stream
                .getTracks()
                .forEach(
                    track =>
                        track.stop()
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


        capturedFrames = [];

        currentPose = 1;

        animationRunning = false;


        poseTitle.textContent =
            "Pose 1";


        progressText.textContent =
            "0 / 3";


        status.textContent =
            "Camera uit.";


        startCameraButton.disabled =
            false;


        restartButton.disabled =
            true;


        if (animationSection) {

            animationSection.classList.add(
                "hidden"
            );

        }


        if (animationCanvas) {

            animationCtx.clearRect(
                0,
                0,
                animationCanvas.width,
                animationCanvas.height
            );

        }


        if (playAnimationButton) {

            playAnimationButton.disabled =
                false;

            playAnimationButton.textContent =
                "▶ Animatie afspelen";

        }

    }
);


// ========================================
// ANIMATIE
// ========================================

if (playAnimationButton) {

    playAnimationButton.addEventListener(
        "click",
        () => {

            if (capturedFrames.length < 3) {

                console.log(
                    "Nog niet alle foto's zijn opgeslagen."
                );

                return;
            }

            if (animationRunning) {
                return;
            }

            animationRunning = true;

            playAnimationButton.disabled = true;

            playAnimationButton.textContent =
                "⏳ Animatie speelt...";

            startAnimation();

        }
    );

}


// ========================================
// ANIMATIE INSTELLINGEN
// ========================================

// Elke foto blijft 1,30 seconde zichtbaar.
const photoDuration = 1300;

// Frame 1 wordt 4 keer gespiegeld.
const frame1Rounds = 4;

// Totale tijd van frame 1:
// 8 stukken × 1,30 seconde
const frame1Duration =
    photoDuration * 8;

// Daarna laten we frame 2 en 3
// steeds om en om zien.
const frame23Rounds = 4;

// 8 stukken × 1,30 seconde
const frame23Duration =
    photoDuration * 8;

// Totale animatieduur
const animationDuration =
    frame1Duration +
    frame23Duration;


// ========================================
// ANIMATIE STARTEN
// ========================================

function startAnimation() {

    console.log(
        "ANIMATIE START!"
    );


    if (
        !animationCanvas ||
        !animationCtx
    ) {

        console.error(
            "animationCanvas ontbreekt."
        );

        animationRunning = false;

        if (playAnimationButton) {

            playAnimationButton.disabled =
                false;

        }

        return;
    }


    animationCanvas.width = 700;
    animationCanvas.height = 500;


    // ====================================
    // MUZIEK
    // ====================================

    if (music) {

        music.currentTime = 0;

        music.play().catch(
            error => {

                console.log(
                    "Muziek kon niet starten:",
                    error
                );

            }
        );

    }


    let startTime = null;


    // ====================================
    // ANIMATIE LOOP
    // ====================================

    function animate(timestamp) {

        if (startTime === null) {

            startTime = timestamp;

        }


        const elapsed =
            timestamp - startTime;


        // ==================================
        // ACHTERGROND
        // ==================================

        drawAnimationBackground();


        let currentFrame = null;

        let mirrored = false;


        // ==================================
        // GEDEELTE 1
        // FRAME 1
        // ==================================

        if (
            elapsed < frame1Duration
        ) {

            // Welk blok van 1,30 seconde?
            const block =
                Math.floor(
                    elapsed /
                    photoDuration
                );


            /*
                block:

                0 = frame 1
                1 = spiegelbeeld
                2 = frame 1
                3 = spiegelbeeld
                4 = frame 1
                5 = spiegelbeeld
                6 = frame 1
                7 = spiegelbeeld
            */


            currentFrame =
                capturedFrames[0];


            mirrored =
                block % 2 === 1;

        }


        // ==================================
        // GEDEELTE 2
        // FRAME 2 + FRAME 3
        // ==================================

        else {

            const secondElapsed =
                elapsed -
                frame1Duration;


            const block =
                Math.floor(
                    secondElapsed /
                    photoDuration
                );


            /*
                block:

                0 = frame 2
                1 = frame 3
                2 = frame 2
                3 = frame 3
                4 = frame 2
                5 = frame 3
                6 = frame 2
                7 = frame 3
            */


            if (
                block % 2 === 0
            ) {

                currentFrame =
                    capturedFrames[1];

            } else {

                currentFrame =
                    capturedFrames[2];

            }


            // Frame 2 en 3 worden
            // NOOIT gespiegeld.
            mirrored = false;

        }


        // ==================================
        // FOTO TEKENEN
        // ==================================

        if (currentFrame) {

            animationCtx.save();


            animationCtx.translate(
                350,
                250
            );


            // Alleen frame 1 kan
            // horizontaal gespiegeld worden.

            if (mirrored) {

                animationCtx.scale(
                    -1,
                    1
                );

            }


            animationCtx.drawImage(
                currentFrame,
                -250,
                -188,
                500,
                375
            );


            animationCtx.restore();

        }


        // ==================================
        // HARTJES
        // ==================================

        drawAnimationHearts(
            elapsed
        );


        // ==================================
        // VOLGENDE FRAME
        // ==================================

        if (
            elapsed <
            animationDuration
        ) {

            animationFrameId =
                requestAnimationFrame(
                    animate
                );

        } else {

            // ==================================
            // ANIMATIE KLAAR
            // ==================================

            animationRunning =
                false;

            animationFrameId =
                null;


            if (music) {

                music.pause();

                music.currentTime =
                    0;

            }


            if (playAnimationButton) {

                playAnimationButton.disabled =
                    false;

                playAnimationButton.textContent =
                    "▶ Animatie opnieuw afspelen";

            }


            console.log(
                "ANIMATIE KLAAR!"
            );

        }

    }


    animationFrameId =
        requestAnimationFrame(
            animate
        );

}


// ========================================
// STERRENACHTERGROND
// ========================================

function drawAnimationBackground() {

    const width =
        animationCanvas.width;

    const height =
        animationCanvas.height;


    animationCtx.fillStyle =
        "#080014";


    animationCtx.fillRect(
        0,
        0,
        width,
        height
    );


    // Sterren

    animationCtx.fillStyle =
        "white";


    for (
        let i = 0;
        i < 100;
        i++
    ) {

        const x =
            (i * 83) % width;

        const y =
            (i * 47) % height;


        const size =
            1 +
            ((i * 17) % 3);


        animationCtx.beginPath();

        animationCtx.arc(
            x,
            y,
            size,
            0,
            Math.PI * 2
        );

        animationCtx.fill();

    }

}


// ========================================
// HARTJES
// ========================================

function drawAnimationHearts(time) {

    const hearts = [

        [80, 90, 20],
        [620, 80, 24],
        [100, 400, 18],
        [600, 400, 22],
        [350, 60, 17],
        [350, 440, 18]

    ];


    for (
        let i = 0;
        i < hearts.length;
        i++
    ) {

        const heart =
            hearts[i];


        const floating =
            Math.sin(
                time * 0.003 +
                i
            ) * 12;


        drawHeart(
            heart[0] + floating,
            heart[1],
            heart[2]
        );

    }


    // Kleine hartjes rond de persoon

    for (
        let i = 0;
        i < 8;
        i++
    ) {

        const angle =
            i *
            Math.PI *
            2 /
            8;


        const radius = 190;


        const x =
            350 +
            Math.cos(angle) *
            radius;


        const y =
            250 +
            Math.sin(angle) *
            radius;


        drawHeart(
            x,
            y,
            10
        );

    }

}


// ========================================
// HART TEKENEN
// ========================================

function drawHeart(
    x,
    y,
    size
) {

    animationCtx.save();


    animationCtx.translate(
        x,
        y
    );


    animationCtx.beginPath();


    animationCtx.moveTo(
        0,
        size * 0.35
    );


    animationCtx.bezierCurveTo(
        -size * 1.1,
        -size * 0.35,
        -size * 0.55,
        -size,
        0,
        -size * 0.35
    );


    animationCtx.bezierCurveTo(
        size * 0.55,
        -size,
        size * 1.1,
        -size * 0.35,
        0,
        size * 0.35
    );


    animationCtx.closePath();


    animationCtx.fillStyle =
        "#ff4fa3";


    animationCtx.shadowColor =
        "#ff4fa3";


    animationCtx.shadowBlur =
        10;


    animationCtx.fill();


    animationCtx.restore();

}


// ========================================
// ESC = ANIMATIE STOPPEN
// ========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            animationRunning
        ) {

            animationRunning =
                false;


            if (
                animationFrameId !== null
            ) {

                cancelAnimationFrame(
                    animationFrameId
                );

                animationFrameId =
                    null;

            }


            if (music) {

                music.pause();

                music.currentTime =
                    0;

            }


            if (
                playAnimationButton
            ) {

                playAnimationButton.disabled =
                    false;

                playAnimationButton.textContent =
                    "▶ Animatie opnieuw afspelen";

            }

        }

    }
);