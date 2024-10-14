const express = require('express');
const socketIo = require('socket.io');

const app = express();
const server = require('http').createServer(app);

const io = socketIo(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('signal', (data) => {
        socket.broadcast.emit('signal', data);
    });

    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
