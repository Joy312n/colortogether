import express from "express";
import path from "path";
import { createServer as createHttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { createServer as createViteServer } from "vite";

interface Player {
  id: string; // Persistent Player ID
  socketId: string; // Current Socket ID
  name: string;
  isHost: boolean;
  finished: boolean;
  finishedData: string | null;
  color: string;
  connected: boolean;
}

interface Action {
  id: string;
  playerId: string;
  type: "brush" | "bucket" | "eraser";
  points?: number[]; // [x1, y1, x2, y2, ...] flat coordinates
  x?: number;        // For bucket fill
  y?: number;        // For bucket fill
  color?: string;
  size?: number;
}

interface Room {
  roomCode: string;
  mode: "live" | "split";
  image: string; // Original base64 line-art
  players: Player[];
  actions: Action[]; // Global drawing actions history
  sessionStarted: boolean;
  hostId: string;
  emptyTimeout?: NodeJS.Timeout;
  hostTransferTimeout?: NodeJS.Timeout;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser with high limits for base64 uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // In-memory rooms database
  const rooms = new Map<string, Room>();

  // Helper to serialize room for sending over socket
  function serializeRoom(room: Room) {
    return {
      roomCode: room.roomCode,
      mode: room.mode,
      image: room.image,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        isHost: p.isHost,
        finished: p.finished,
        finishedData: p.finishedData,
        color: p.color,
        connected: p.connected,
      })),
      actions: room.actions,
      sessionStarted: room.sessionStarted,
      hostId: room.hostId,
    };
  }

  // Helper to manage timeouts for empty rooms and host disconnects
  function manageRoomTimeouts(room: Room, io: SocketServer) {
    const allDisconnected = room.players.every(p => !p.connected);

    if (allDisconnected) {
      if (!room.emptyTimeout) {
        console.log(`Room ${room.roomCode} is completely empty. Starting 10-minute cleanup timer...`);
        room.emptyTimeout = setTimeout(() => {
          console.log(`Room ${room.roomCode} cleanup timer expired. Deleting room.`);
          rooms.delete(room.roomCode);
        }, 10 * 60 * 1000); // 10 minutes
      }
    } else {
      if (room.emptyTimeout) {
        console.log(`Player reconnected to room ${room.roomCode}. Cancelling room cleanup timer.`);
        clearTimeout(room.emptyTimeout);
        room.emptyTimeout = undefined;
      }

      // Check host state
      const host = room.players.find(p => p.isHost);
      const hasConnectedGuests = room.players.some(p => !p.isHost && p.connected);

      if (host && !host.connected && hasConnectedGuests) {
        if (!room.hostTransferTimeout) {
          console.log(`Host of room ${room.roomCode} disconnected. Starting 10-minute host transfer timer...`);
          room.hostTransferTimeout = setTimeout(() => {
            const currentHost = room.players.find(p => p.isHost);
            if (currentHost && !currentHost.connected) {
              const newHost = room.players.find(p => p.connected);
              if (newHost) {
                console.log(`Host of room ${room.roomCode} failed to reconnect in 10 minutes. Transferring host role to ${newHost.name}...`);
                currentHost.isHost = false;
                newHost.isHost = true;
                room.hostId = newHost.id;
                io.to(room.roomCode).emit("room-updated", serializeRoom(room));
              }
            }
          }, 10 * 60 * 1000); // 10 minutes
        }
      } else {
        if (room.hostTransferTimeout) {
          console.log(`Host of room ${room.roomCode} is connected or no guests waiting. Cancelling host transfer timer.`);
          clearTimeout(room.hostTransferTimeout);
          room.hostTransferTimeout = undefined;
        }
      }
    }
  }

  // API endpoint to check room existence (useful for direct invite link joining)
  app.get("/api/rooms/:code", (req, res) => {
    const code = req.params.code.toUpperCase();
    const room = rooms.get(code);
    if (!room) {
      return res.status(404).json({ error: "Room not found" });
    }
    res.json({
      roomCode: room.roomCode,
      mode: room.mode,
      playersCount: room.players.length,
      sessionStarted: room.sessionStarted,
    });
  });

  const httpServer = createHttpServer(app);
  const io = new SocketServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
    maxHttpBufferSize: 1e8, // 100MB for handling large base64 image data easily
  });

  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Create Room
    socket.on("create-room", ({ nickname, image, mode, playerId }) => {
      if (!playerId) {
        socket.emit("join-error", "Invalid player identity.");
        return;
      }

      // Generate a unique 6-character alphanumeric room code
      let roomCode = "";
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing O, 0, I, 1
      do {
        roomCode = "";
        for (let i = 0; i < 6; i++) {
          roomCode += chars.charAt(Math.floor(Math.random() * chars.length));
        }
      } while (rooms.has(roomCode));

      const hostPlayer: Player = {
        id: playerId,
        socketId: socket.id,
        name: nickname,
        isHost: true,
        finished: false,
        finishedData: null,
        color: "#EC4899", // Pink color for P1
        connected: true,
      };

      const newRoom: Room = {
        roomCode,
        mode,
        image,
        players: [hostPlayer],
        actions: [],
        sessionStarted: false,
        hostId: playerId,
      };

      rooms.set(roomCode, newRoom);
      
      socket.data.playerId = playerId;
      socket.data.roomCode = roomCode;
      
      socket.join(roomCode);

      socket.emit("room-created", { roomCode, room: serializeRoom(newRoom) });
      console.log(`Room created: ${roomCode} by ${nickname} in ${mode} mode`);
    });

    // Join Room
    socket.on("join-room", ({ roomCode, nickname, playerId }) => {
      if (!playerId) {
        socket.emit("join-error", "Invalid player identity.");
        return;
      }

      const code = roomCode.toUpperCase();
      const room = rooms.get(code);

      if (!room) {
        socket.emit("join-error", "Room not found. Please verify the code.");
        return;
      }

      // Check if player is already in the room's players list (by playerId or name)
      const existingPlayer = room.players.find(p => p.id === playerId || p.name === nickname);
      
      if (existingPlayer) {
        // Disconnect old socket of this player if present to prevent multiple tabs
        const oldSocketId = existingPlayer.socketId;
        if (oldSocketId && oldSocketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(oldSocketId);
          if (oldSocket) {
            oldSocket.emit("join-error", "Opened in another tab. This session is now inactive.");
            oldSocket.leave(code);
          }
        }

        existingPlayer.id = playerId; // Sync ID
        existingPlayer.socketId = socket.id;
        existingPlayer.connected = true;

        socket.data.playerId = playerId;
        socket.data.roomCode = code;

        socket.join(code);
        manageRoomTimeouts(room, io);

        io.to(code).emit("room-updated", serializeRoom(room));
        socket.emit("join-success", { roomCode: code, room: serializeRoom(room), playerId });
        console.log(`Player ${nickname} re-joined room: ${code}`);
        return;
      }

      if (room.players.length >= 2) {
        socket.emit("join-error", "Room is full. Only 2 players allowed.");
        return;
      }

      const newPlayer: Player = {
        id: playerId,
        socketId: socket.id,
        name: nickname,
        isHost: false,
        finished: false,
        finishedData: null,
        color: "#3B82F6", // Blue color for P2
        connected: true,
      };

      room.players.push(newPlayer);
      
      socket.data.playerId = playerId;
      socket.data.roomCode = code;
      
      socket.join(code);

      manageRoomTimeouts(room, io);

      io.to(code).emit("room-updated", serializeRoom(room));
      socket.emit("join-success", { roomCode: code, room: serializeRoom(room), playerId });
      console.log(`Player ${nickname} joined room: ${code}`);
    });

    // Sync Session (Handles disconnect recovery and page refresh)
    socket.on("sync-session", ({ roomCode, playerId, nickname }) => {
      const code = roomCode.toUpperCase();
      const room = rooms.get(code);

      if (!room) {
        socket.emit("sync-failed", { error: "Room not found or expired." });
        return;
      }

      const player = room.players.find(p => p.id === playerId);
      if (!player) {
        socket.emit("sync-failed", { error: "Session not found in this room." });
        return;
      }

      // Disconnect old socket of this player if present to prevent multiple tabs
      const oldSocketId = player.socketId;
      if (oldSocketId && oldSocketId !== socket.id) {
        const oldSocket = io.sockets.sockets.get(oldSocketId);
        if (oldSocket) {
          oldSocket.emit("join-error", "Opened in another tab. This session is now inactive.");
          oldSocket.leave(code);
        }
      }

      player.socketId = socket.id;
      player.connected = true;

      socket.data.playerId = playerId;
      socket.data.roomCode = code;

      socket.join(code);
      manageRoomTimeouts(room, io);

      console.log(`Player ${player.name} (${playerId}) synced successfully to room ${code}`);

      // Notify other players in the room
      io.to(code).emit("room-updated", serializeRoom(room));

      // Send successful sync confirmation directly to reconnecting player
      socket.emit("sync-success", { 
        roomCode: code, 
        room: serializeRoom(room), 
        playerId 
      });

      // If both players have finished, also re-trigger the completed reveal state for the re-connecting player
      const allFinished = room.players.length === 2 && room.players.every(p => p.finished);
      if (allFinished) {
        const p1 = room.players[0];
        const p2 = room.players[1];
        socket.emit("merge-complete", {
          player1: { name: p1.name, finishedData: p1.finishedData },
          player2: { name: p2.name, finishedData: p2.finishedData },
          mode: room.mode,
          originalImage: room.image
        });
      }
    });

    // Start Session
    socket.on("start-session", ({ roomCode }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);

      if (!room) return;

      const playerId = socket.data.playerId;
      if (room.hostId === playerId) {
        room.sessionStarted = true;
        io.to(code).emit("session-started", serializeRoom(room));
        console.log(`Session started for room: ${code}`);
      }
    });

    // Handle New Action (Brush stroke, Bucket Fill, Eraser)
    socket.on("draw-action", ({ roomCode, action }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);

      if (!room) return;

      const playerId = socket.data.playerId || action.playerId;
      if (!playerId) return;

      // Add player ID to action for attribution
      const actionWithPlayer = { ...action, playerId };
      room.actions.push(actionWithPlayer);

      // In Live mode, sync instantly to other player
      if (room.mode === "live") {
        socket.to(code).emit("draw-action-received", actionWithPlayer);
      }
    });

    // Handle Undo Action
    socket.on("undo-action", ({ roomCode }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);

      if (!room) return;

      const playerId = socket.data.playerId;
      if (!playerId) return;

      // Find last action drawn by this player and remove it
      let removedActionId: string | null = null;
      for (let i = room.actions.length - 1; i >= 0; i--) {
        if (room.actions[i].playerId === playerId) {
          removedActionId = room.actions[i].id;
          room.actions.splice(i, 1);
          break;
        }
      }

      if (removedActionId) {
        if (room.mode === "live") {
          io.to(code).emit("undo-action-received", { playerId, actionId: removedActionId });
        } else {
          socket.emit("undo-action-received", { playerId, actionId: removedActionId });
        }
      }
    });

    // Handle Clear Actions (Clear personal changes)
    socket.on("clear-canvas", ({ roomCode }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);

      if (!room) return;

      const playerId = socket.data.playerId;
      if (!playerId) return;

      // Filter out all actions by this player
      room.actions = room.actions.filter(act => act.playerId !== playerId);

      if (room.mode === "live") {
        io.to(code).emit("canvas-cleared", { playerId });
      } else {
        socket.emit("canvas-cleared", { playerId });
      }
    });

    // Handle Finish Coloring
    socket.on("finish-coloring", ({ roomCode, finishedData }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);

      if (!room) return;

      const playerId = socket.data.playerId;
      if (!playerId) return;

      const player = room.players.find(p => p.id === playerId);
      if (player) {
        player.finished = true;
        player.finishedData = finishedData;
        console.log(`Player ${player.name} finished in room: ${code}`);

        io.to(code).emit("player-finished", { playerId, name: player.name });

        const allFinished = room.players.length === 2 && room.players.every(p => p.finished);
        if (allFinished) {
          const p1 = room.players[0];
          const p2 = room.players[1];

          io.to(code).emit("merge-complete", {
            player1: { name: p1.name, finishedData: p1.finishedData },
            player2: { name: p2.name, finishedData: p2.finishedData },
            mode: room.mode,
            originalImage: room.image
          });
          console.log(`Both players finished! Room merged: ${code}`);
        }
      }
    });

    // Handle Reset Room (Restart coloring)
    socket.on("restart-session", ({ roomCode }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);

      if (room) {
        room.actions = [];
        room.sessionStarted = true;
        room.players.forEach(p => {
          p.finished = false;
          p.finishedData = null;
        });
        io.to(code).emit("session-restarted", serializeRoom(room));
        console.log(`Session restarted for room: ${code}`);
      }
    });

    // Explicit leave room action
    socket.on("leave-room", ({ roomCode, playerId }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return;

      const pId = playerId || socket.data.playerId;
      const playerIndex = room.players.findIndex(p => p.id === pId);
      if (playerIndex !== -1) {
        const leavingPlayer = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        console.log(`Player ${leavingPlayer.name} explicitly left room ${code}`);

        // Clean socket data
        socket.data.roomCode = undefined;
        socket.data.playerId = undefined;
        socket.leave(code);

        // If leaving player was host, transfer host role
        if (leavingPlayer.isHost && room.players.length > 0) {
          room.players[0].isHost = true;
          room.hostId = room.players[0].id;
        }

        io.to(code).emit("room-updated", serializeRoom(room));
        io.to(code).emit("player-left", leavingPlayer.name);

        manageRoomTimeouts(room, io);
      }
    });

    // Close room action (Host only)
    socket.on("close-room", ({ roomCode, playerId }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return;

      const pId = playerId || socket.data.playerId;
      if (room.hostId === pId) {
        io.to(code).emit("room-closed", "The host closed this room.");
        
        // Clean all socket states in this room
        const roomSockets = io.sockets.adapter.rooms.get(code);
        if (roomSockets) {
          for (const sId of roomSockets) {
            const s = io.sockets.sockets.get(sId);
            if (s) {
              s.data.roomCode = undefined;
              s.leave(code);
            }
          }
        }
        
        rooms.delete(code);
        console.log(`Room ${code} explicitly closed by host.`);
      }
    });

    // Handle Socket Disconnect (Temporary)
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);

      for (const [code, room] of rooms.entries()) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          player.connected = false;
          console.log(`Player ${player.name} temporarily disconnected from room: ${code}`);

          io.to(code).emit("room-updated", serializeRoom(room));

          manageRoomTimeouts(room, io);
          break;
        }
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
