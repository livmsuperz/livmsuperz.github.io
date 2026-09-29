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

const playAnimationButton =
    document.getElementById("playAnimation");

const animationCanvas =
    document.getElementById("animationCanvas");

const animationCtx =
    animationCanvas.getContext("2d");

const music =
    document.getElementById("music");

let animationRunning = false;


// ========================================
// ANIMATIE AFSPELEN
// ========================================

playAnimationButton.addEventListener(
    "click",
    () => {

        if (capturedFrames.length < 3) {

            console.log(
                "Nog niet alle 3 frames beschikbaar."
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


// ========================================
// HART TEKENEN
// ========================================

function drawHeart(
    x,
    y,
    size,
    alpha = 1
) {

    animationCtx.save();

    animationCtx.globalAlpha = alpha;

    animationCtx.fillStyle = "#ff4fa3";

    animationCtx.beginPath();

    animationCtx.moveTo(
        x,
        y + size * 0.35
    );

    animationCtx.bezierCurveTo(
        x - size * 0.8,
        y - size * 0.1,
        x - size * 0.55,
        y - size * 0.8,
        x,
        y - size * 0.35
    );

    animationCtx.bezierCurveTo(
        x + size * 0.55,
        y - size * 0.8,
        x + size * 0.8,
        y - size * 0.1,
        x,
        y + size * 0.35
    );

    animationCtx.fill();

    animationCtx.restore();
}


// ========================================
// HARTJES ACHTERGROND
// ========================================

function drawHeartBackground() {

    // Donkere roze achtergrond
    animationCtx.fillStyle = "#180018";

    animationCtx.fillRect(
        0,
        0,
        animationCanvas.width,
        animationCanvas.height
    );


    // Kleine en grote hartjes
    for (let i = 0; i < 35; i++) {

        const x =
            (i * 137 + 40) % 700;

        const y =
            (i * 83 + 30) % 500;

        const size =
            7 + ((i * 7) % 18);

        const alpha =
            0.20 + ((i % 4) * 0.10);

        drawHeart(
            x,
            y,
            size,
            alpha
        );

    }
}


// ========================================
// EXTRA HARTJES RONDOM HET FRAME
// ========================================

function drawAnimationHearts(time) {

    const positions = [

        [80, 80, 13],
        [620, 70, 16],
        [100, 420, 11],
        [610, 420, 14],
        [50, 250, 9],
        [650, 250, 10],
        [180, 50, 8],
        [520, 450, 9]

    ];

    for (let i = 0; i < positions.length; i++) {

        const baseX =
            positions[i][0];

        const baseY =
            positions[i][1];

        const size =
            positions[i][2];

        const movement =
            Math.sin(
                time / 20 + i
            ) * 5;

        drawHeart(
            baseX,
            baseY + movement,
            size,
            0.75
        );

    }

}


// ========================================
// ANIMATIE STARTEN
// ========================================

function startAnimation() {

    console.log(
        "ANIMATIE START!"
    );

    // Canvas grootte
    animationCanvas.width = 700;
    animationCanvas.height = 500;

    animationCanvas.style.display =
        "block";


    // Controleren
    if (capturedFrames.length < 3) {

        console.log(
            "Frames ontbreken:",
            capturedFrames.length
        );

        animationRunning = false;

        playAnimationButton.disabled =
            false;

        return;
    }


    console.log(
        "3 frames gevonden!"
    );


    // Muziek starten
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


    // ====================================
    // TIJD
    // ====================================

    const photoDuration = 1000;

    // Frame 1:
    // normaal + spiegelbeeld
    // 4 keer
    const frame1Duration =
        photoDuration * 8;

    // Frame 2 + Frame 3:
    // om en om
    // 4 keer
    const frame23Duration =
        photoDuration * 8;

    const totalDuration =
        frame1Duration +
        frame23Duration;


    let startTime = null;


    // ====================================
    // FRAME TEKENEN
    // ====================================

    function animate(timestamp) {

        if (startTime === null) {

            startTime =
                timestamp;

        }


        const elapsed =
            timestamp - startTime;


        // =================================
        // HARTJES ACHTERGROND
        // =================================

        drawHeartBackground();


        // =================================
        // BEPALEN WELK FRAME
        // =================================

        let currentFrame = null;

        let mirrored = false;


        // ---------------------------------
        // DEEL 1: FRAME 1
        // ---------------------------------

        if (
            elapsed <
            frame1Duration
        ) {

            const block =
                Math.floor(
                    elapsed /
                    photoDuration
                );


            // Frame 1
            currentFrame =
                capturedFrames[0];


            // Om en om normaal/spiegel
            mirrored =
                block % 2 === 1;

        }


        // ---------------------------------
        // DEEL 2: FRAME 2 + 3
        // ---------------------------------

        else {

            const secondPartTime =
                elapsed -
                frame1Duration;


            const block =
                Math.floor(
                    secondPartTime /
                    photoDuration
                );


            // Frame 2, Frame 3,
            // Frame 2, Frame 3...
            if (
                block % 2 === 0
            ) {

                currentFrame =
                    capturedFrames[1];

            } else {

                currentFrame =
                    capturedFrames[2];

            }


            // Frame 2 en 3 NIET spiegelen
            mirrored = false;

        }


        // =================================
        // FOTO TEKENEN
        // =================================

        if (currentFrame) {

            animationCtx.save();


            // Midden van canvas
            animationCtx.translate(
                350,
                250
            );


            // Alleen Frame 1 spiegelen
            if (mirrored) {

                animationCtx.scale(
                    -1,
                    1
                );

            }


            // Frame tekenen
            animationCtx.drawImage(
                currentFrame,
                -250,
                -188,
                500,
                375
            );


            animationCtx.restore();

        }


        // =================================
        // EXTRA HARTJES
        // =================================

        drawAnimationHearts(
            elapsed / 100
        );


        // =================================
        // VOLGENDE FRAME
        // =================================

        if (
            elapsed <
            totalDuration
        ) {

            requestAnimationFrame(
                animate
            );

        } else {

            animationRunning =
                false;

            playAnimationButton.disabled =
                false;

            playAnimationButton.textContent =
                "▶ Animatie opnieuw afspelen";


            console.log(
                "Animatie klaar!"
            );

        }

    }


    // Animatie starten
    requestAnimationFrame(
        animate
    );

}