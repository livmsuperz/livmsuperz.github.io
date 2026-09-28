const camera = document.getElementById("camera");

const startCameraButton = document.getElementById("startCamera");
const restartButton = document.getElementById("restart");

const instruction = document.getElementById("instruction");
const status = document.getElementById("status");

let stream = null;


/* =========================
   CAMERA STARTEN
   ========================= */

startCameraButton.addEventListener("click", async () => {

    try {

        // Vraag alleen om de camera
        stream = await navigator.mediaDevices.getUserMedia({
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


        // Zet de camerastream in het video-element
        camera.srcObject = stream;

        // Zorg ervoor dat de video niet wordt geblokkeerd
        camera.muted = true;
        camera.autoplay = true;
        camera.playsInline = true;


        // Wacht tot de camerabeelden beschikbaar zijn
        camera.onloadedmetadata = async () => {

            try {

                await camera.play();

                instruction.textContent =
                    "Camera is aan! Je zou jezelf nu moeten zien.";

                status.textContent =
                    "Camera werkt 🎥";

                startCameraButton.textContent =
                    "✓ Camera actief";

                startCameraButton.disabled = true;

                restartButton.disabled = false;

            } catch (error) {

                console.error(
                    "Video kon niet worden afgespeeld:",
                    error
                );

                status.textContent =
                    "De camera is gevonden, maar het beeld kon niet worden afgespeeld.";

            }

        };

    } catch (error) {

        console.error(
            "Camera fout:",
            error
        );


        if (error.name === "NotAllowedError") {

            status.textContent =
                "Je hebt geen toestemming gegeven voor de camera. Geef Chrome toestemming en probeer opnieuw.";

        } else if (error.name === "NotFoundError") {

            status.textContent =
                "Er is geen camera gevonden.";

        } else {

            status.textContent =
                "Er ging iets mis met de camera: " + error.name;

        }

    }

});


/* =========================
   OPNIEUW
   ========================= */

restartButton.addEventListener("click", () => {

    // Camera stoppen
    if (stream) {

        stream.getTracks().forEach(track => {
            track.stop();
        });

        stream = null;
    }


    // Video leegmaken
    camera.srcObject = null;


    // Knoppen terugzetten
    startCameraButton.disabled = false;

    startCameraButton.textContent =
        "📷 Camera starten";

    restartButton.disabled = true;


    instruction.textContent =
        'Klik op "Camera starten" om opnieuw te beginnen.';

    status.textContent =
        "Camera uit.";

});