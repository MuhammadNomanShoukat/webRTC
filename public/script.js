const socket = io();
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const sharedScreen = document.getElementById('sharedScreen'); // For screen sharing
const startScreenShareButton = document.getElementById('startScreenShareButton');
const stopScreenShareButton = document.getElementById('stopScreenShareButton');
const startRecordingButton = document.getElementById('startRecordingButton');
const stopRecordingButton = document.getElementById('stopRecordingButton');
const canvas = document.getElementById('mergeCanvas');
const ctx = canvas.getContext('2d');

let localStream, screenStream, peerConnection, mediaRecorder, recordedChunks = [];
let animationFrameId;

const configuration = {
    iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

// Start streaming local video and remote video
async function startStreaming() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        localVideo.srcObject = localStream;

        peerConnection = new RTCPeerConnection(configuration);

        localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                socket.emit('signal', { 'ice': event.candidate });
            }
        };

        peerConnection.ontrack = event => {
            remoteVideo.srcObject = event.streams[0];
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('signal', { 'sdp': peerConnection.localDescription });
    } catch (error) {
        console.error("Error accessing media devices.", error);
    }
}

// Start Screen Sharing
startScreenShareButton.addEventListener('click', async () => {
    try {
        screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        sharedScreen.srcObject = screenStream;

        screenStream.getTracks().forEach(track => peerConnection.addTrack(track, screenStream));

        startScreenShareButton.disabled = true;
        stopScreenShareButton.disabled = false;
    } catch (error) {
        console.error("Error starting screen sharing", error);
    }
});

// Stop Screen Sharing
stopScreenShareButton.addEventListener('click', () => {
    screenStream.getTracks().forEach(track => track.stop());
    sharedScreen.srcObject = null;

    startScreenShareButton.disabled = false;
    stopScreenShareButton.disabled = true;
});

// Function to start recording all video streams into one frame
startRecordingButton.addEventListener('click', () => {
    const canvasStream = canvas.captureStream();
    const combinedStream = new MediaStream();

    // Add video tracks from canvas (combined video layout)
    canvasStream.getVideoTracks().forEach(track => combinedStream.addTrack(track));

    // Add local and remote audio (both laptops' audio)
    addAudioTracks(localStream, combinedStream);
    addAudioTracks(remoteVideo.srcObject, combinedStream);
    
    // Add shared screen audio if available
    if (screenStream && screenStream.getAudioTracks().length > 0) {
        screenStream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    }

    mediaRecorder = new MediaRecorder(combinedStream);
    mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) {
            recordedChunks.push(event.data);
        }
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'video_call_with_screen_share.webm';
        downloadLink.click();
        recordedChunks = [];
    };

    mediaRecorder.start();
    startRecordingButton.disabled = true;
    stopRecordingButton.disabled = false;

    drawOnCanvas();
});

function addAudioTracks(stream, combinedStream) {
    if (stream && stream.getAudioTracks().length > 0) {
        stream.getAudioTracks().forEach(track => combinedStream.addTrack(track));
    } else {
        console.error('No audio track available.');
    }
}

// Function to stop recording
stopRecordingButton.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        startRecordingButton.disabled = false;
        stopRecordingButton.disabled = true;
        cancelAnimationFrame(animationFrameId);  // Stop the canvas drawing
    }
});

// Function to draw videos on canvas
function drawOnCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw local video (left)
    if (localVideo.srcObject) {
        ctx.drawImage(localVideo, 0, 0, canvas.width / 3, canvas.height / 2);
    }

    // Draw remote video (center)
    if (remoteVideo.srcObject) {
        ctx.drawImage(remoteVideo, canvas.width / 3, 0, canvas.width / 3, canvas.height / 2);
    }

    // Draw shared screen (right)
    if (sharedScreen.srcObject) {
        ctx.drawImage(sharedScreen, 2 * canvas.width / 3, 0, canvas.width / 3, canvas.height / 2);
    }

    animationFrameId = requestAnimationFrame(drawOnCanvas);  // Keep updating canvas
}

// Socket event handling for WebRTC signaling
socket.on('signal', async data => {
    if (data.sdp) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (data.sdp.type === 'offer') {
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            socket.emit('signal', { 'sdp': peerConnection.localDescription });
        }
    } else if (data.ice) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.ice));
    }
});

startStreaming();
