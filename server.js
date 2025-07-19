const express=require('express');
const bodyParser=require('body-parser');
const {Server}=require('socket.io');
const PORT = process.env.PORT || 8000;

const io=new Server({
    cors:true
});
const app=express();
app.use(bodyParser.json());
const emailToSocketMapping=new Map();
const socketToemailMapping=new Map();
io.on('connection', (socket) => {
    socket.on('join-room', (data) => {
    const { roomId, email } = data;
    console.log('User', email, 'joined', roomId);

    emailToSocketMapping.set(email, socket.id);
    socketToemailMapping.set(socket.id, email);

    socket.join(roomId);

    const clientsInRoom = Array.from(io.sockets.adapter.rooms.get(roomId) || [])
        .filter(id => id !== socket.id) 
        .map(id => socketToemailMapping.get(id));

    socket.emit('joined-room', { roomId, existingUsers: clientsInRoom });

    socket.broadcast.to(roomId).emit('user-joined', { email });
});


    socket.on('call-user', (data) => {
        const { email, offer } = data;
        const fromEmail = socketToemailMapping.get(socket.id);
        const socketId = emailToSocketMapping.get(email);

        if (socketId && fromEmail) {
            socket.to(socketId).emit('incoming-call', { from: fromEmail, offer });
        }
    });
    socket.on('ice-candidate', ({ email, candidate }) => {
    const socketId = emailToSocketMapping.get(email);
    if (socketId) {
        socket.to(socketId).emit('ice-candidate', { candidate });
    }
});


    socket.on('answer-call', (data) => {
        const { email, answer } = data;
        const socketId = emailToSocketMapping.get(email);

        if (socketId) {
            socket.to(socketId).emit('call-answered', { answer });
        } 
    });

    socket.on('disconnect', () => {
        const email = socketToemailMapping.get(socket.id);
        if (email) {
            emailToSocketMapping.delete(email);
            socketToemailMapping.delete(socket.id);
            console.log('User', email, 'disconnected');
        }
    });
    socket.on('call-accepted',(data)=>{
        const {email,ans}=data;
        const socketId=emailToSocketMapping.get(email);
        socket.to(socketId).emit('call-accepted',{ans});
    })
});
app.listen(PORT, '0.0.0.0', () => {
    console.log("Server running on port 8000");
});
io.listen(8001)