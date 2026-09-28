const overlay = document.getElementById("overlay");
const overlayContext = overlay.getContext("2d");

function drawPose1() {
    if (!camera.videoWidth || !camera.videoHeight) {
        requestAnimationFrame(drawPose1);
        return;
    }

    // Canvas dezelfde verhouding geven als de camera
    overlay.width = camera.videoWidth;
    overlay.height = camera.videoHeight;

    overlayContext.clearRect(
        0,
        0,
        overlay.width,
        overlay.height
    );

    // Groene bolletjes
    drawGreenDot(
        overlay.width * 0.42,
        overlay.height * 0.35
    );

    drawGreenDot(
        overlay.width * 0.58,
        overlay.height * 0.35
    );

    requestAnimationFrame(drawPose1);
}


function drawGreenDot(x, y) {

    // Gloed
    overlayContext.beginPath();

    overlayContext.arc(
        x,
        y,
        18,
        0,
        Math.PI * 2
    );

    overlayContext.fillStyle = "rgba(80, 255, 120, 0.25)";
    overlayContext.fill();


    // Bolletje
    overlayContext.beginPath();

    overlayContext.arc(
        x,
        y,
        9,
        0,
        Math.PI * 2
    );

    overlayContext.fillStyle = "#39ff6a";

    overlayContext.fill();

    overlayContext.strokeStyle = "white";

    overlayContext.lineWidth = 2;

    overlayContext.stroke();
}


// Start de bolletjes
drawPose1();