import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";

const camera = document.getElementById("camera");
const overlay = document.getElementById("overlay");

const startCameraButton = document.getElementById("startCamera");
const restartButton = document.getElementById("restart");
const status = document.getElementById("status");

const poseTitle = document.getElementById("poseTitle");
const progressText = document.getElementById("progressText");

const ctx = overlay.getContext("2d");

let stream = null;
let handLandmarker = null;
let detecting = false;

let currentPose = 1;
let captureTimer = null;

let capturedFrames = [];


// ================================
// MEDIAPIPE LADEN
// ================================

async function loadHandTracking() {

    status.textContent = "Handherkenning laden...";

    const vision = await FilesetResolver.forVisionTasks(
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

    status.textContent = "Handherkenning klaar!";
}


// ================================
// CAMERA STARTEN
// ================================

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

            startCameraButton.disabled = true;

            restartButton.disabled = false;

            await loadHandTracking();

            detecting = true;

            currentPose = 1;

            updatePoseText();

            detectHands();

        } catch (error) {

            console.error(error);

            status.textContent =
                "Fout: " + error.message;
        }
    }
);


// ================================
// HANDEN DETECTEREN
// ================================

function detectHands() {

    if (!detecting) return;

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


// ================================
// TEKST AANPASSEN
// ================================

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


// ================================
// ALLES TEKENEN
// ================================

function drawEverything(results) {

    ctx.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );


    // --------------------------------
    // DOELPOSITIE PER POSE
    // --------------------------------

    let targets = [];


    if (currentPose === 1) {

        // Eén hand onder de kin
        // Eén hand rond ooghoogte

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

        // Handen naast de oren

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

        // Handen naast de kin

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


    // --------------------------------
    // HANDEN OPSPOREN
    // --------------------------------

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


    // --------------------------------
    // HANDPUNTEN TEKENEN
    // --------------------------------

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

        ctx.fillStyle = "#ff00ff";

        ctx.fill();

    }


    // --------------------------------
    // CONTROLEREN OF HANDEN GOED STAAN
    // --------------------------------

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


    // --------------------------------
    // GROENE BOLLETJES
    // --------------------------------

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


    // --------------------------------
    // AUTOMATISCH VASTLEGGEN
    // --------------------------------

    if (
        target1Correct &&
        target2Correct &&
        hands.length >= 2
    ) {

        if (captureTimer === null) {

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


        if (
            currentPose === 1
        ) {

            status.textContent =
                "Zet je vuisten op de groene bolletjes.";

        }


        if (
            currentPose === 2
        ) {

            status.textContent =
                "Houd je handen plat naast je oren.";

        }


        if (
            currentPose === 3
        ) {

            status.textContent =
                "Houd je handen plat naast je kin.";

        }

    }

}


// ================================
// POSE OPSLAAN
// ================================

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


    // Camera spiegelen
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


    // Frame bewaren
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


    // --------------------------------
    // VOLGENDE POSE
    // --------------------------------

    if (currentPose < 3) {

        currentPose++;

        setTimeout(
            () => {

                updatePoseText();

            },
            700
        );

    } else {

        finishPoses();

    }

}


// ================================
// ALLE POSES KLAAR
// ================================

function finishPoses() {

    detecting = false;


    poseTitle.textContent =
        "Klaar! ✨";


    status.textContent =
        "🎉 Alle 3 poses zijn opgeslagen!";


    progressText.textContent =
        "3 / 3";


    document
        .getElementById("animationSection")
        .classList.remove("hidden");


    console.log(
        "Alle frames:",
        capturedFrames
    );

}


// ================================
// GROENE DOELEN
// ================================

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


    ctx.fillStyle =
        correct
            ? "#ffffff"
            : "#00ff55";


    ctx.fill();


    ctx.strokeStyle =
        "white";

    ctx.lineWidth = 3;

    ctx.stroke();

}


// ================================
// OPNIEUW
// ================================

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


        poseTitle.textContent =
            "Pose 1";


        progressText.textContent =
            "0 / 3";


        startCameraButton.disabled =
            false;

        restartButton.disabled =
            true;


        document
            .getElementById("animationSection")
            .classList.add("hidden");


        status.textContent =
            "Camera uit.";

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
// KNOP "ANIMATIE AFSPELEN"
// ========================================

playAnimationButton.addEventListener(
    "click",
    () => {

        if (capturedFrames.length < 3) {

            console.log(
                "Nog niet alle poses zijn opgeslagen."
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
// ANIMATIE STARTEN
// ========================================

function startAnimation() {

    animationCanvas.width =
        700;

    animationCanvas.height =
        500;


    // Muziek starten
    if (music) {

        music.currentTime = 0;

        music.play().catch(error => {

            console.log(
                "Muziek kon niet automatisch starten:",
                error
            );

        });

    }


    let frame = 0;

    const totalFrames = 60;


    function animate() {

        animationCtx.clearRect(
            0,
            0,
            animationCanvas.width,
            animationCanvas.height
        );


        // Achtergrond
        drawAnimationBackground();


        // Welke pose?
        const poseIndex =
            Math.floor(
                frame / 20
            ) % 3;


        const pose =
            capturedFrames[poseIndex];


        // Beweging links -> rechts -> links
        const movement =
            Math.sin(
                frame * 0.08
            ) * 100;


        // Afbeelding tekenen
        animationCtx.save();


        animationCtx.translate(
            animationCanvas.width / 2 +
            movement,
            250
        );


        animationCtx.drawImage(
            pose,
            -250,
            -188,
            500,
            375
        );


        animationCtx.restore();


        // Hartjes
        drawAnimationHearts(frame);


        frame++;


        if (frame < totalFrames) {

            requestAnimationFrame(
                animate
            );

        } else {

            animationRunning = false;

            playAnimationButton.disabled =
                false;

            playAnimationButton.textContent =
                "▶ Animatie opnieuw afspelen";

        }

    }


    animate();

}


// ========================================
// ACHTERGROND
// ========================================

function drawAnimationBackground() {

    const gradient =
        animationCtx.createRadialGradient(
            350,
            250,
            50,
            350,
            250,
            500
        );


    gradient.addColorStop(
        0,
        "#402060"
    );

    gradient.addColorStop(
        1,
        "#090014"
    );


    animationCtx.fillStyle =
        gradient;

    animationCtx.fillRect(
        0,
        0,
        700,
        500
    );


    // Sterren
    animationCtx.fillStyle =
        "white";


    for (
        let i = 0;
        i < 50;
        i++
    ) {

        const x =
            (i * 97) % 700;

        const y =
            (i * 53) % 500;


        animationCtx.beginPath();

        animationCtx.arc(
            x,
            y,
            1.5,
            0,
            Math.PI * 2
        );

        animationCtx.fill();

    }

}


// ========================================
// HARTJES
// ========================================

function drawAnimationHearts(frame) {

    const hearts = [

        {
            x: 100,
            y: 100
        },

        {
            x: 600,
            y: 120
        },

        {
            x: 130,
            y: 380
        },

        {
            x: 570,
            y: 390
        },

        {
            x: 350,
            y: 70
        }

    ];


    for (
        let i = 0;
        i < hearts.length;
        i++
    ) {

        const heart =
            hearts[i];


        const movement =
            Math.sin(
                frame * 0.05 + i
            ) * 15;


        drawHeart(
            heart.x,
            heart.y + movement,
            15
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


    animationCtx.fillStyle =
        "#ff5cba";


    animationCtx.beginPath();


    animationCtx.moveTo(
        0,
        size * 0.8
    );


    animationCtx.bezierCurveTo(
        -size * 1.5,
        -size * 0.2,
        -size * 0.8,
        -size * 1.3,
        0,
        -size * 0.5
    );


    animationCtx.bezierCurveTo(
        size * 0.8,
        -size * 1.3,
        size * 1.5,
        -size * 0.2,
        0,
        size * 0.8
    );


    animationCtx.fill();

    animationCtx.restore();

}