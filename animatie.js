import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";


// ========================================
// ELEMENTEN UIT HTML
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

const ctx =
    overlay.getContext("2d");


// ========================================
// VARIABELEN
// ========================================

let stream = null;

let handLandmarker = null;

let detecting = false;

let currentPose = 1;

let captureTimer = null;

let capturedFrames = [];


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

            await loadHandTracking();

            detecting = true;

            currentPose = 1;

            capturedFrames = [];

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
// POSE-TEKST
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
    // DOELEN
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
    // HANDEN OPSPOREN
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
    // AFSTAND CONTROLEREN
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
    // GROENE BOLLETJES
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
    // AUTOMATISCH FOTO MAKEN
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


    // Canvas bewaren
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


    // ====================================
    // VOLGENDE POSE
    // ====================================

    if (
        currentPose < 3
    ) {

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


    const animationSection =
        document.getElementById(
            "animationSection"
        );


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
// GROENE DOELEN TEKENEN
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


        const animationSection =
            document.getElementById(
                "animationSection"
            );


        if (animationSection) {

            animationSection.classList.add(
                "hidden"
            );

        }


        // Animatiecanvas leegmaken
        if (animationCanvas) {

            animationCtx.clearRect(
                0,
                0,
                animationCanvas.width,
                animationCanvas.height
            );

        }


        animationRunning = false;


        if (playAnimationButton) {

            playAnimationButton.disabled =
                false;

            playAnimationButton.textContent =
                "▶ Animatie afspelen";

        }


        status.textContent =
            "Camera uit.";

    }
);


// ========================================
// ANIMATIE-ELEMENTEN
// ========================================

const playAnimationButton =
    document.getElementById(
        "playAnimation"
    );

const animationCanvas =
    document.getElementById(
        "animationCanvas"
    );

const animationCtx =
    animationCanvas
        ? animationCanvas.getContext("2d")
        : null;

const music =
    document.getElementById(
        "music"
    );

let animationRunning = false;

let animationFrameId = null;


// ========================================
// ANIMATIEKNOP
// ========================================

if (playAnimationButton) {

    playAnimationButton.addEventListener(
        "click",
        () => {

            if (
                capturedFrames.length < 3
            ) {

                console.log(
                    "Nog niet alle poses zijn opgeslagen."
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

    console.log(
        "ANIMATIE START!"
    );


    if (
        !animationCanvas ||
        !animationCtx
    ) {

        console.error(
            "animationCanvas ontbreekt in animatie.html"
        );

        animationRunning = false;

        if (playAnimationButton) {

            playAnimationButton.disabled =
                false;

        }

        return;

    }


    animationCanvas.width =
        700;

    animationCanvas.height =
        500;

    animationCanvas.style.display =
        "block";


    if (
        capturedFrames.length < 3
    ) {

        console.log(
            "Te weinig frames:",
            capturedFrames.length
        );

        animationRunning = false;

        return;

    }


    console.log(
        "Frames gevonden:",
        capturedFrames.length
    );


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

    const duration =
        12000;


    // ====================================
    // ANIMATIE LOOP
    // ====================================

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
                elapsed / duration,
                1
            );


        // ==================================
        // ACHTERGROND
        // ==================================

        drawAnimationBackground();


        // ==================================
        // POSE KIEZEN
        // ==================================

        let poseIndex;


        if (
            progress < 0.40
        ) {

            poseIndex = 0;

        } else if (
            progress < 0.75
        ) {

            poseIndex = 1;

        } else {

            poseIndex = 2;

        }


        const pose =
            capturedFrames[poseIndex];


        // ==================================
        // LINKS / RECHTS
        // ==================================

        const sideMovement =
            Math.sin(
                progress *
                Math.PI *
                4
            ) * 80;


        // ==================================
        // OP / NEER
        // ==================================

        let verticalMovement = 0;


        // POSE 1 — VUISTEN
        // 4 keer omhoog/omlaag

        if (
            poseIndex === 0
        ) {

            const p =
                progress / 0.40;


            verticalMovement =
                Math.sin(
                    p *
                    Math.PI *
                    8
                ) * 30;

        }


        // POSE 2 — VLAKKE HANDEN
        // 4 keer omhoog/omlaag

        if (
            poseIndex === 1
        ) {

            const p =
                (progress - 0.40) /
                0.35;


            verticalMovement =
                Math.sin(
                    p *
                    Math.PI *
                    8
                ) * 30;

        }


        // POSE 3 — KLEINE BEWEGING

        if (
            poseIndex === 2
        ) {

            const p =
                (progress - 0.75) /
                0.25;


            verticalMovement =
                Math.sin(
                    p *
                    Math.PI *
                    2
                ) * 15;

        }


        // ==================================
        // FOTO TEKENEN
        // ==================================

        if (pose) {

            animationCtx.save();


            animationCtx.translate(
                350 + sideMovement,
                250 + verticalMovement
            );


            // Foto iets kleiner zodat
            // de randen niet buiten beeld gaan

            animationCtx.drawImage(
                pose,
                -250,
                -188,
                500,
                375
            );


            animationCtx.restore();

        } else {

            animationCtx.fillStyle =
                "white";

            animationCtx.font =
                "24px Arial";

            animationCtx.textAlign =
                "center";

            animationCtx.fillText(
                "Geen pose gevonden",
                350,
                250
            );

        }


        // ==================================
        // HARTJES
        // ==================================

        drawAnimationHearts(
            elapsed / 100
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
// ANIMATIE-ACHTERGROND
// ========================================

function drawAnimationBackground() {

    const width =
        animationCanvas.width;

    const height =
        animationCanvas.height;


    // Donkere ruimte

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
        "rgba(255,255,255,0.9)";


    for (
        let i = 0;
        i < 90;
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
// HARTJES TEKENEN
// ========================================

function drawAnimationHearts(time) {

    const width =
        animationCanvas.width;

    const height =
        animationCanvas.height;


    const hearts = [

        {
            x: 90,
            y: 100,
            size: 20,
            speed: 0.8
        },

        {
            x: 610,
            y: 90,
            size: 24,
            speed: 1
        },

        {
            x: 130,
            y: 390,
            size: 18,
            speed: 0.7
        },

        {
            x: 570,
            y: 390,
            size: 22,
            speed: 0.9
        },

        {
            x: 350,
            y: 65,
            size: 16,
            speed: 1.2
        },

        {
            x: 350,
            y: 435,
            size: 19,
            speed: 0.8
        }

    ];


    for (
        const heart of hearts
    ) {

        const movement =
            Math.sin(
                time *
                heart.speed
            ) * 12;


        const pulse =
            1 +
            Math.sin(
                time *
                0.08
            ) * 0.08;


        drawHeart(
            heart.x + movement,
            heart.y,
            heart.size * pulse
        );

    }


    // Kleine hartjes rondom het midden

    for (
        let i = 0;
        i < 8;
        i++
    ) {

        const angle =
            (Math.PI * 2 / 8) *
            i;


        const radius = 190;


        const x =
            width / 2 +
            Math.cos(angle) *
            radius;


        const y =
            height / 2 +
            Math.sin(angle) *
            radius;


        const size =
            10 +
            Math.sin(
                time * 0.1 + i
            ) * 3;


        drawHeart(
            x,
            y,
            size
        );

    }

}


// ========================================
// ÉÉN HART TEKENEN
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
        12;

    animationCtx.fill();


    animationCtx.restore();

}


// ========================================
// ESC-TOETS = ANIMATIE STOPPEN
// ========================================

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            animationRunning
        ) {

            animationRunning = false;


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


            console.log(
                "Animatie gestopt."
            );

        }

    }
);