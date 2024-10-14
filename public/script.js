const socket = io();

// Video stream elements
const myVideo = document.getElementById('myVideo');
const peerVideo = document.getElementById('peerVideo');
const screenShare = document.getElementById('screenShare');

let myStream;

// Start video call
document.getElementById('startVideo').addEventListener('click', async () => {
  try {
    myStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    myVideo.srcObject = myStream;

    // Send video stream to the server
    myStream.getTracks().forEach(track => {
      socket.emit('video-stream', track);
    });
  } catch (err) {
    console.error('Error accessing media devices.', err);
  }
});

// Receive video stream from another user
socket.on('video-stream', (track) => {
  const peerStream = new MediaStream([track]);
  peerVideo.srcObject = peerStream;
});

// Share screen
document.getElementById('shareScreen').addEventListener('click', async () => {
  try {
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    screenShare.srcObject = screenStream;

    // Send screen stream to the server
    screenStream.getTracks().forEach(track => {
      socket.emit('screen-stream', track);
    });
  } catch (err) {
    console.error('Error sharing screen.', err);
  }
});

// Receive screen sharing stream from another user
socket.on('screen-stream', (track) => {
  const screenStream = new MediaStream([track]);
  screenShare.srcObject = screenStream;
});
