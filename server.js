const express = require('express');
const http = require('https');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files
app.use(express.static('public'));

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Listen for video stream events
  socket.on('video-stream', (data) => {
    // Broadcast the video stream to all other clients
    socket.broadcast.emit('video-stream', data);
  });

  // Listen for screen sharing stream events
  socket.on('screen-stream', (data) => {
    // Broadcast the screen stream to all other clients
    socket.broadcast.emit('screen-stream', data);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
