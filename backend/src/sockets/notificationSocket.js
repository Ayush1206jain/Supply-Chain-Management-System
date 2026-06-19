const { Server } = require("socket.io");
const { verifyAccessToken } = require("../utils/jwt");

// Map of userId → Set of socket IDs
const userSockets = new Map();

let io = null;

function initSocketServer(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Middleware: authenticate socket connection with JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error("No token provided"));
    }
    try {
      const decoded = verifyAccessToken(token);
      socket.userId = decoded.sub;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    console.log(`Socket connected: user=${userId} socket=${socket.id}`);

    // Track this socket under the user's ID
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    // Join a room named after the userId
    socket.join(`user:${userId}`);

    // Admin joins a special room for broadcast notifications
    if (socket.userRole === "admin") {
      socket.join("admins");
    }

    socket.on("disconnect", () => {
      const sockets = userSockets.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSockets.delete(userId);
      }
      console.log(`Socket disconnected: user=${userId} socket=${socket.id}`);
    });
  });

  console.log("Socket.io server initialized");
  return io;
}

// Send notification to a specific user (all their tabs)
function notifyUser(userId, event, payload) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}

// Broadcast to all connected admins
function notifyAdmins(event, payload) {
  if (!io) return;
  io.to("admins").emit(event, payload);
}

// Broadcast to ALL connected users
function broadcastAll(event, payload) {
  if (!io) return;
  io.emit(event, payload);
}

function getIO() {
  return io;
}

module.exports = {
  initSocketServer,
  notifyUser,
  notifyAdmins,
  broadcastAll,
  getIO,
};
