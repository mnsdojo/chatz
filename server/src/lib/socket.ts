import { Server, Socket } from "socket.io";
import { prisma } from "./prisma";
import { verifyToken } from "./auth";

const connectedUsers = new Map<string, any>();

const authenticateSocket = (socket: Socket, next: (err?: any) => void) => {
  const token = socket.handshake.auth.token;
  const userId = verifyToken(token);
  if (userId) {
    socket.data.userId = userId;
    next();
  } else {
    next(new Error("Authentication error"));
  }
};

const handleUserConnection = async (socket: Socket, io: Server) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: socket.data.userId },
    });
    if (user) {
      connectedUsers.set(socket.id, user);
      const users = await prisma.user.findMany({
        select: { username: true },
      });
      io.emit(
        "userList",
        users.map((u) => u.username)
      );
    }
  } catch (error) {
    console.error("Error authenticating user:", error);
  }
};

const handleCreateRoom = async (roomName: string, io: Server) => {
  try {
    await prisma.room.create({ data: { name: roomName } });
    const rooms = await prisma.room.findMany({ select: { name: true } });
    io.emit(
      "roomList",
      rooms.map((r) => r.name)
    );
  } catch (error) {
    console.error(`Error creating room: ${error}`);
  }
};

const handleRoomMessage = async (
  socket: Socket,
  room: string,
  message: string,
  io: Server
) => {
  const user = connectedUsers.get(socket.id);
  if (user) {
    try {
      const dbRoom = await prisma.room.findUnique({
        where: { name: room },
      });
      if (dbRoom) {
        await prisma.message.create({
          data: {
            content: message,
            userId: user.id,
            roomId: dbRoom.id,
          },
        });
        io.to(room).emit("roomMessage", {
          room,
          message,
          sender: user.username,
        });
      }
    } catch (error) {
      console.error("Error saving room message:", error);
    }
  }
};

const handlePrivateMessage = async (
  socket: Socket,
  to: string,
  message: string
) => {
  const sender = connectedUsers.get(socket.id);
  if (sender) {
    try {
      const recipient = await prisma.user.findUnique({
        where: { username: to },
      });

      if (recipient) {
        await prisma.message.create({
          data: {
            content: message,
            userId: sender.id,
          },
        });
        socket
          .to(recipient.id)
          .emit("privateMessage", { from: sender.username, message });
      }
    } catch (error) {
      console.error("Error saving private message:", error);
    }
  }
};

export const setupSocket = (io: Server) => {
  io.use(authenticateSocket);

  io.on("connection", (socket) => {
    console.log("A user connected");

    handleUserConnection(socket, io);

    socket.on("disconnect", () => {
      connectedUsers.delete(socket.id);
      console.log("A user disconnected");
    });

    socket.on("createRoom", (roomName) => handleCreateRoom(roomName, io));

    socket.on("joinRoom", (room) => {
      socket.join(room);
      console.log(`User joined room: ${room}`);
    });

    socket.on("leaveRoom", (room) => {
      socket.leave(room);
      console.log(`User left room: ${room}`);
    });

    socket.on("roomMessage", ({ room, message }) =>
      handleRoomMessage(socket, room, message, io)
    );

    socket.on("privateMessage", ({ to, message }) =>
      handlePrivateMessage(socket, to, message)
    );
  });
};
