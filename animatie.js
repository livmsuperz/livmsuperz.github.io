import {
    HandLandmarker,
    FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.mjs";


// =====================================================
// ELEMENTEN UIT HTML
// =====================================================

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


// =====================================================
// CANVAS
// =====================================================

const ctx =
    overlay.getContext("2d");

const animationCtx =
    animationCanvas.getContext("2d");


// =====================================================
// VARIABELEN
// =====================================================

let stream = null;
let handLandmarker = null;
let detecting = false;
let currentPose = 1;
let captureTimer = null;
let capturedFrames = [];
let animationRunning = false;


// =====================================================
// MEDIAPIPE LADEN
// =====================================================

async function loadHandTracking() {

    status.textContent =
        "Handherkenning laden...";

    try {

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

    } catch (error) {

        console.error(error);

        status.textContent =
            "Handherkenning kon niet laden.";

        throw error;
    }
}


// =====================================================
// CAMERA STARTEN
// =====================================================

startCameraButton.addEventListener(
    "click",
    async () => {

        try {

            status.textContent =
                "Camera wordt gestart...";

            if (
                !navigator.mediaDevices ||
                !navigator.mediaDevices.getUserMedia
            ) {

                status.textContent =
                    "Je browser ondersteunt geen camera.";

                return;
            }

            stream =
                await navigator.mediaDevices.getUserMedia({

                    video: {

                        width: {
                            ideal: 1280
                        },

                        height: {
                            ideal: 720
                        }

                    },

                    audio: false
                });

            camera.srcObject =
                stream;

            await camera.play();

            if (
                camera.videoWidth === 0 ||
                camera.videoHeight === 0
            ) {

                await new Promise(
                    resolve => {

                        camera.onloadedmetadata =
                            () => resolve();

                    }
                );
            }

            overlay.width =
                camera.videoWidth;

            overlay.height =
                camera.videoHeight;

            startCameraButton.disabled =
                true;

            restartButton.disabled =
                false;

            await loadHandTracking();

            currentPose = 1;

            capturedFrames = [];

            detecting = true;

            updatePoseText();

            detectHands();

        } catch (error) {

            console.error(
                "Camera fout:",
                error
            );

            if (
                error.name ===
                "NotAllowedError"
            ) {

                status.textContent =
                    "Je moet toestemming geven voor de camera.";

            } else if (
                error.name ===
                "NotFoundError"
            ) {

                status.textContent =
                    "Er is geen camera gevonden.";

            } else {

                status.textContent =
                    "Camera fout: " +
                    error.message;
            }
        }
    }
);


// =====================================================
// HANDEN DETECTEREN
// =====================================================

function detectHands() {

    if (!detecting) {
        return;
    }

    if (
        handLandmarker &&
        camera.readyState >= 2
    ) {

        try {

            const results =
                handLandmarker.detectForVideo(
                    camera,
                    performance.now()
                );

            drawEverything(results);

        } catch (error) {

            console.error(
                "Handdetectie fout:",
                error
            );
        }
    }

    requestAnimationFrame(
        detectHands
    );
}


// =====================================================
// TEKST AANPASSEN
// =====================================================

function updatePoseText() {

    poseTitle.textContent =
        "Pose " + currentPose;

    progressText.textContent =
        capturedFrames.length +
        " / 3";

    if (currentPose === 1) {

        status.textContent =
            "Zet je vuisten op de groene bolletjes.";

    } else if (currentPose === 2) {

        status.textContent =
            "Houd je handen plat naast je oren.";

    } else if (currentPose === 3) {

        status.textContent =
            "Houd je handen plat naast je kin.";

    }
}


// =====================================================
// ALLES TEKENEN
// =====================================================

function drawEverything(results) {

    ctx.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );

    let targets = [];


    // =================================================
    // POSE 1
    // =================================================

    if (currentPose === 1) {

        targets = [

            {
                x:
                    overlay.width * 0.42,

                y:
                    overlay.height * 0.58
            },

            {
                x:
                    overlay.width * 0.65,

                y:
                    overlay.height * 0.32
            }

        ];
    }


    // =================================================
    // POSE 2
    // =================================================

    if (currentPose === 2) {

        targets = [

            {
                x:
                    overlay.width * 0.28,

                y:
                    overlay.height * 0.35
            },

            {
                x:
                    overlay.width * 0.72,

                y:
                    overlay.height * 0.35
            }

        ];
    }


    // =================================================
    // POSE 3
    // =================================================

    if (currentPose === 3) {

        targets = [

            {
                x:
                    overlay.width * 0.38,

                y:
                    overlay.height * 0.65
            },

            {
                x:
                    overlay.width * 0.62,

                y:
                    overlay.height * 0.65
            }

        ];
    }


    // =================================================
    // HANDEN UIT MEDIAPIPE HALEN
    // =================================================

    let hands = [];

    if (
        results &&
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

                averageX +=
                    point.x;

                averageY +=
                    point.y;
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


    // =================================================
    // HANDPUNTEN
    // =================================================

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


    // =================================================
    // CONTROLEREN
    // =================================================

    let target1Correct =
        false;

    let target2Correct =
        false;

    const detectionDistance =
        90;

    for (
        const hand of hands
    ) {

        const distance1 =
            Math.hypot(

                hand.x -
                targets[0].x,

                hand.y -
                targets[0].y

            );

        const distance2 =
            Math.hypot(

                hand.x -
                targets[1].x,

                hand.y -
                targets[1].y

            );

        if (
            distance1 <
            detectionDistance
        ) {

            target1Correct =
                true;
        }

        if (
            distance2 <
            detectionDistance
        ) {

            target2Correct =
                true;
        }
    }


    // =================================================
    // GROENE BOLLETJES
    // =================================================

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


    // =================================================
    // AUTOMATISCH FOTO MAKEN
    // =================================================

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

            captureTimer =
                null;
        }

        updatePoseText();
    }
}


// =====================================================
// GROEN DOEL TEKENEN
// =====================================================

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
            ? "#ffffff"
            : "#00ff55";

    ctx.fill();

    ctx.strokeStyle =
        "white";

    ctx.lineWidth =
        3;

    ctx.stroke();
}


// =====================================================
// POSE OPSLAAN
// =====================================================

function captureCurrentPose() {

    captureTimer =
        null;

    const frameCanvas =
        document.createElement(
            "canvas"
        );

    frameCanvas.width =
        camera.videoWidth;

    frameCanvas.height =
        camera.videoHeight;

    const frameCtx =
        frameCanvas.getContext(
            "2d"
        );


    // Camera horizontaal spiegelen
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
        capturedFrames.length +
        " / 3";

    status.textContent =
        "📸 Pose " +
        currentPose +
        " opgeslagen!";


    // =================================================
    // VOLGENDE POSE
    // =================================================

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


// =====================================================
// ALLE POSES KLAAR
// =====================================================

function finishPoses() {

    detecting =
        false;

    poseTitle.textContent =
        "Klaar! ✨";

    status.textContent =
        "🎉 Alle 3 poses zijn opgeslagen!";

    progressText.textContent =
        "3 / 3";

    animationSection
        .classList
        .remove("hidden");

    console.log(
        "Alle frames:",
        capturedFrames
    );
}


// =====================================================
// OPNIEUW BEGINNEN
// =====================================================

restartButton.addEventListener(
    "click",
    () => {

        detecting =
            false;

        if (
            captureTimer !== null
        ) {

            clearTimeout(
                captureTimer
            );

            captureTimer =
                null;
        }


        // Camera stoppen
        if (stream) {

            stream
                .getTracks()
                .forEach(
                    track => {
                        track.stop();
                    }
                );

            stream =
                null;
        }

        camera.srcObject =
            null;


        // Overlay wissen
        ctx.clearRect(
            0,
            0,
            overlay.width,
            overlay.height
        );


        // Frames wissen
        capturedFrames =
            [];

        currentPose =
            1;


        // Tekst resetten
        poseTitle.textContent =
            "Pose 1";

        progressText.textContent =
            "0 / 3";

        status.textContent =
            "Camera uit.";


        // Knoppen
        startCameraButton.disabled =
            false;

        restartButton.disabled =
            true;


        // Animatie verbergen
        animationSection
            .classList
            .add("hidden");


        // Animatie stoppen
        animationRunning =
            false;

        playAnimationButton.disabled =
            false;

        playAnimationButton.textContent =
            "▶ Animatie afspelen";


        // Canvas wissen
        animationCtx.clearRect(
            0,
            0,
            animationCanvas.width,
            animationCanvas.height
        );


        // Muziek stoppen
        if (music) {

            music.pause();

            music.currentTime =
                0;
        }

    }
);


// =====================================================
// ANIMATIE KNOP
// =====================================================

playAnimationButton.addEventListener(
    "click",
    () => {

        if (
            capturedFrames.length < 3
        ) {

            console.log(
                "Nog niet alle frames."
            );

            return;
        }

        if (
            animationRunning
        ) {

            return;
        }

        animationRunning =
            true;

        playAnimationButton.disabled =
            true;

        playAnimationButton.textContent =
            "⏳ Animatie speelt...";

        startAnimation();
    }
);


// =====================================================
// HART TEKENEN
// =====================================================

function drawHeart(
    x,
    y,
    size,
    alpha = 1
) {

    animationCtx.save();

    animationCtx.globalAlpha =
        alpha;

    animationCtx.fillStyle =
        "#ff4fa3";

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


// =====================================================
// HARTJES ACHTERGROND
// =====================================================

function drawHeartBackground() {

    animationCtx.fillStyle =
        "#180018";

    animationCtx.fillRect(

        0,
        0,

        animationCanvas.width,
        animationCanvas.height

    );

    for (
        let i = 0;
        i < 35;
        i++
    ) {

        const x =
            (i * 137 + 40) %
            700;

        const y =
            (i * 83 + 30) %
            500;

        const size =
            7 +
            ((i * 7) % 18);

        const alpha =
            0.20 +
            ((i % 4) * 0.10);

        drawHeart(
            x,
            y,
            size,
            alpha
        );
    }
}


// =====================================================
// EXTRA HARTJES
// =====================================================

function drawAnimationHearts(
    time
) {

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

    for (
        let i = 0;
        i < positions.length;
        i++
    ) {

        const x =
            positions[i][0];

        const y =
            positions[i][1];

        const size =
            positions[i][2];

        const movement =
            Math.sin(
                time / 20 + i
            ) * 5;

        drawHeart(
            x,
            y + movement,
            size,
            0.75
        );
    }
}


// =====================================================
// ANIMATIE STARTEN
// =====================================================

function startAnimation() {

    console.log(
        "ANIMATIE START!"
    );


    // =================================================
    // CANVAS
    // =================================================

    animationCanvas.width =
        700;

    animationCanvas.height =
        500;

    animationCanvas.style.display =
        "block";


    // =================================================
    // CONTROLEREN
    // =================================================

    if (
        capturedFrames.length < 3
    ) {

        console.log(
            "Frames ontbreken."
        );

        animationRunning =
            false;

        playAnimationButton.disabled =
            false;

        return;
    }


    // =================================================
    // MUZIEK
    // =================================================

    if (music) {

        music.currentTime =
            0;

        music.play().catch(
            error => {

                console.log(
                    "Muziek kon niet starten:",
                    error
                );

            }
        );
    }


    // =================================================
    // TIJD
    // =================================================

    const photoDuration =
        1000;

    // PRECIES 8 SECONDEN
    const totalDuration =
        8000;

    let startTime =
        null;


    // =================================================
    // ANIMATIE LOOP
    // =================================================

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


        // =================================================
        // HARTJES ACHTERGROND
        // =================================================

        drawHeartBackground();


        // =================================================
        // BLOK BEPALEN
        // =================================================

        const block =
            Math.floor(
                elapsed /
                photoDuration
            );


        // =================================================
        // FRAME KIEZEN
        // =================================================

        let currentFrame =
            null;

        let mirrored =
            false;


        // -------------------------------------------------
        // BLOK 0 = FRAME 1
        // BLOK 1 = FRAME 1 GESPIEGELD
        // BLOK 2 = FRAME 1
        // BLOK 3 = FRAME 1 GESPIEGELD
        // -------------------------------------------------

        if (
            block === 0
        ) {

            currentFrame =
                capturedFrames[0];

            mirrored =
                false;

        } else if (
            block === 1
        ) {

            currentFrame =
                capturedFrames[0];

            mirrored =
                true;

        } else if (
            block === 2
        ) {

            currentFrame =
                capturedFrames[0];

            mirrored =
                false;

        } else if (
            block === 3
        ) {

            currentFrame =
                capturedFrames[0];

            mirrored =
                true;

        }


        // -------------------------------------------------
        // BLOK 4 = FRAME 2
        // BLOK 5 = FRAME 3
        // BLOK 6 = FRAME 2
        // BLOK 7 = FRAME 3
        // -------------------------------------------------

        else if (
            block === 4
        ) {

            currentFrame =
                capturedFrames[1];

            mirrored =
                false;

        } else if (
            block === 5
        ) {

            currentFrame =
                capturedFrames[2];

            mirrored =
                false;

        } else if (
            block === 6
        ) {

            currentFrame =
                capturedFrames[1];

            mirrored =
                false;

        } else if (
            block === 7
        ) {

            currentFrame =
                capturedFrames[2];

            mirrored =
                false;

        }


        // =================================================
        // FRAME TEKENEN
        // =================================================

        if (
            currentFrame
        ) {

            animationCtx.save();


            // Midden van canvas
            animationCtx.translate(
                350,
                250
            );


            // Alleen Frame 1 spiegelen
            if (
                mirrored
            ) {

                animationCtx.scale(
                    -1,
                    1
                );
            }


            // Foto tekenen
            animationCtx.drawImage(

                currentFrame,

                -250,
                -188,

                500,
                375

            );

            animationCtx.restore();
        }


        // =================================================
        // EXTRA HARTJES
        // =================================================

        drawAnimationHearts(
            elapsed / 100
        );


        // =================================================
        // DOORGAAN OF STOPPEN
        // =================================================

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


            // Muziek stoppen
            if (music) {

                music.pause();

                music.currentTime =
                    0;
            }

            console.log(
                "Animatie klaar na precies 8 seconden!"
            );
        }
    }


    // =================================================
    // ANIMATIE STARTEN
    // =================================================

    requestAnimationFrame(
        animate
    );
}