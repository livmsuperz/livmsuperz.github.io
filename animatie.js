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

            if (
                capturedFrames.length < 3
            ) {

                console.log(
                    "Nog niet alle foto's."
                );

                return;

            }


            if (animationRunning) {
                return;
            }


            animationRunning = true;

            playAnimationButton.disabled =
                true;

            playAnimationButton.textContent =
                "⏳ Animatie speelt...";


            startAnimation();

        }
    );

}


// ========================================
// ANIMATIE STARTEN
// ========================================

function startAnimation() {

    animationCanvas.width = 700;
    animationCanvas.height = 500;


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


    const animationDuration =
        10000;


    const photoSwitchSpeed =
        110;


    let startTime = null;


    function animate(timestamp) {

        if (
            startTime === null
        ) {

            startTime =
                timestamp;

        }


        const elapsed =
            timestamp -
            startTime;


        const progress =
            Math.min(
                elapsed /
                animationDuration,
                1
            );


        // ==================================
        // ACHTERGROND
        // ==================================

        drawAnimationBackground();


        // ==================================
        // WELKE POSE?
        // ==================================

        let poseIndex;


        if (
            progress < 0.33
        ) {

            poseIndex = 0;

        } else if (
            progress < 0.66
        ) {

            poseIndex = 1;

        } else {

            poseIndex = 2;

        }


        const pose =
            capturedFrames[poseIndex];


        // ==================================
        // SNEL WISSELEN
        // ==================================

        /*
            Elke 110 milliseconden wisselen
            we tussen:

            normale foto
            gespiegeld
            normale foto
            gespiegeld

            Daardoor lijkt het meer op
            een snelle stop-motion animatie.
        */

        const switchNumber =
            Math.floor(
                elapsed /
                photoSwitchSpeed
            );


        const mirrored =
            switchNumber % 2 === 1;


        // ==================================
        // ARMEN OP / NEER
        // ==================================

        let verticalMovement = 0;


        if (
            poseIndex === 0
        ) {

            const localProgress =
                progress / 0.33;


            verticalMovement =
                Math.sin(
                    localProgress *
                    Math.PI *
                    8
                ) * 28;

        }


        if (
            poseIndex === 1
        ) {

            const localProgress =
                (progress - 0.33) /
                0.33;


            verticalMovement =
                Math.sin(
                    localProgress *
                    Math.PI *
                    8
                ) * 28;

        }


        if (
            poseIndex === 2
        ) {

            const localProgress =
                (progress - 0.66) /
                0.34;


            verticalMovement =
                Math.sin(
                    localProgress *
                    Math.PI *
                    4
                ) * 18;

        }


        // ==================================
        // LINKS → RECHTS → LINKS
        // ==================================

        const sideMovement =
            Math.sin(
                progress *
                Math.PI *
                4
            ) * 90;


        // ==================================
        // FOTO TEKENEN
        // ==================================

        if (pose) {

            animationCtx.save();


            animationCtx.translate(
                350 + sideMovement,
                250 + verticalMovement
            );


            if (mirrored) {

                // Horizontaal spiegelen
                animationCtx.scale(
                    -1,
                    1
                );

            }


            animationCtx.drawImage(
                pose,
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
            progress < 1
        ) {

            animationFrameId =
                requestAnimationFrame(
                    animate
                );

        } else {

            animationRunning =
                false;


            animationFrameId =
                null;


            if (music) {

                music.pause();

                music.currentTime = 0;

            }


            playAnimationButton.disabled =
                false;


            playAnimationButton.textContent =
                "▶ Animatie opnieuw afspelen";


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


    // Hartjes rondom de persoon

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
// ESC = STOP
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