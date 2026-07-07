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
  actionId?: string;
  strokeId?: string;
  playerId: string;
  type: "brush" | "bucket" | "eraser";
  tool?: string;
  points?: number[]; // [x1, y1, x2, y2, ...] flat coordinates
  x?: number;        // For bucket fill
  y?: number;        // For bucket fill
  color?: string;
  size?: number;
  brushType?: string;
  opacity?: number;
  softness?: number;
  timestamp?: number; // Server-assigned order of actions
  sequenceNumber?: number;
  status?: string;
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
  undoStacks?: { [playerId: string]: Action[] };
  redoStacks?: { [playerId: string]: Action[] };
  nextSequenceNumber?: number;
  completedActionIds?: Set<string>;
  completedStrokeIds?: Set<string>;
}

function addCompletedAction(room: Room, action: any, playerId: string): Action | null {
  if (!room.nextSequenceNumber) {
    room.nextSequenceNumber = 1;
  }
  if (!room.completedActionIds) {
    room.completedActionIds = new Set<string>();
  }
  if (!room.completedStrokeIds) {
    room.completedStrokeIds = new Set<string>();
  }

  const actionId = action.actionId || action.id;
  const strokeId = action.strokeId;

  // Validate duplicate actionId
  if (actionId && room.completedActionIds.has(actionId)) {
    console.log(`Rejected duplicate actionId: ${actionId}`);
    return null;
  }
  // Validate duplicate strokeId
  if (strokeId && room.completedStrokeIds.has(strokeId)) {
    console.log(`Rejected duplicate strokeId: ${strokeId}`);
    return null;
  }

  const sequenceNumber = room.nextSequenceNumber++;
  const timestamp = action.timestamp || Date.now();

  const finalizedAction: Action = {
    ...action,
    id: actionId,
    actionId,
    playerId,
    timestamp,
    sequenceNumber,
    status: "FINISHED"
  };

  room.actions.push(finalizedAction);

  if (actionId) room.completedActionIds.add(actionId);
  if (strokeId) room.completedStrokeIds.add(strokeId);

  // Store in undo stack
  if (!room.undoStacks) room.undoStacks = {};
  if (!room.undoStacks[playerId]) room.undoStacks[playerId] = [];
  room.undoStacks[playerId].push(finalizedAction);

  // Clear redo history
  if (!room.redoStacks) room.redoStacks = {};
  room.redoStacks[playerId] = [];

  return finalizedAction;
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
  function serializeRoom(room: Room, includeImage: boolean = false) {
    const redoCounts: { [playerId: string]: number } = {};
    if (room.redoStacks) {
      for (const [pId, stack] of Object.entries(room.redoStacks)) {
        redoCounts[pId] = stack.length;
      }
    }
    return {
      roomCode: room.roomCode,
      mode: room.mode,
      ...(includeImage ? { image: room.image } : {}),
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
      redoCounts,
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
                io.to(room.roomCode).emit("host-changed", { hostId: newHost.id });
                io.to(room.roomCode).emit("room-updated", serializeRoom(room, false));
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
        undoStacks: {},
        redoStacks: {},
      };

      rooms.set(roomCode, newRoom);
      
      socket.data.playerId = playerId;
      socket.data.roomCode = roomCode;
      
      socket.join(roomCode);

      socket.emit("room-created", { roomCode, room: serializeRoom(newRoom, true) });
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

        socket.to(code).emit("player-joined", { player: existingPlayer });
        io.to(code).emit("room-updated", serializeRoom(room, false));
        socket.emit("join-success", { roomCode: code, room: serializeRoom(room, true), playerId });
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

      socket.to(code).emit("player-joined", { player: newPlayer });
      io.to(code).emit("room-updated", serializeRoom(room, false));
      socket.emit("join-success", { roomCode: code, room: serializeRoom(room, true), playerId });
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
      socket.to(code).emit("player-joined", { player });
      io.to(code).emit("room-updated", serializeRoom(room, false));

      // Send successful sync confirmation directly to reconnecting player
      socket.emit("sync-success", { 
        roomCode: code, 
        room: serializeRoom(room, true), 
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
        io.to(code).emit("session-started", serializeRoom(room, false));
        console.log(`Session started for room: ${code}`);
      }
    });

    // Handle Stroke Start (Live continuous stroke initialization)
    socket.on("stroke-start", ({ roomCode, strokeId, actionId, tool, brushSettings, points, timestamp }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return;

      const playerId = socket.data.playerId;
      if (!playerId) return;

      // Broadcast to other players in the room
      socket.to(code).emit("stroke-started", {
        playerId,
        strokeId,
        actionId,
        tool,
        brushSettings,
        points,
        timestamp: timestamp || Date.now()
      });
    });

    // Handle Stroke Update (Live continuous stroke progression)
    socket.on("stroke-update", ({ roomCode, strokeId, points }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      if (!code) return;

      const playerId = socket.data.playerId;
      if (!playerId) return;

      // Broadcast to other players in the room
      socket.to(code).compress(false).emit("stroke-updated", {
        playerId,
        strokeId,
        points
      });
    });

    // Handle Stroke End (Finalizing a continuous stroke)
    socket.on("stroke-end", ({ roomCode, strokeId, actionId, tool, brushSettings, points, timestamp }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return;

      const playerId = socket.data.playerId;
      if (!playerId) return;

      // Construct action object
      const actionData = {
        actionId,
        id: actionId,
        strokeId,
        tool,
        type: tool, // backward-compatibility
        points,
        color: brushSettings?.color,
        size: brushSettings?.size,
        brushType: brushSettings?.brushType,
        opacity: brushSettings?.opacity,
        softness: brushSettings?.softness,
        timestamp: timestamp || Date.now()
      };

      const finalizedAction = addCompletedAction(room, actionData, playerId);
      if (finalizedAction) {
        // Broadcast finalized action to everyone in the room (including sender to confirm completion)
        io.to(code).emit("stroke-ended", { playerId, strokeId, action: finalizedAction });
        io.to(code).emit("new-action", { action: finalizedAction });
      }
    });

    // Handle New Action (Brush stroke, Bucket Fill, Eraser - kept for compatibility)
    socket.on("draw-action", ({ roomCode, action }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return;

      const playerId = socket.data.playerId || action.playerId;
      if (!playerId) return;

      const finalizedAction = addCompletedAction(room, action, playerId);
      if (finalizedAction) {
        io.to(code).emit("stroke-ended", { playerId, strokeId: action.strokeId, action: finalizedAction });
        io.to(code).emit("new-action", { action: finalizedAction });
      }
    });

    // Handle Undo Action
    socket.on("undo-action", ({ roomCode }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return;

      const playerId = socket.data.playerId;
      if (!playerId) return;

      if (!room.undoStacks) room.undoStacks = {};
      if (!room.undoStacks[playerId]) room.undoStacks[playerId] = [];

      if (!room.redoStacks) room.redoStacks = {};
      if (!room.redoStacks[playerId]) room.redoStacks[playerId] = [];

      // Find the last action in room.actions made by this player and remove it
      let undoneAction: Action | null = null;
      for (let i = room.actions.length - 1; i >= 0; i--) {
        if (room.actions[i].playerId === playerId) {
          undoneAction = room.actions[i];
          room.actions.splice(i, 1);
          break;
        }
      }

      if (undoneAction) {
        // Push to the player's redoStack
        room.redoStacks[playerId].push(undoneAction);

        // Filter it from local undo stack as well
        room.undoStacks[playerId] = room.undoStacks[playerId].filter(act => act.id !== undoneAction!.id);

        // Remove from completed IDs
        const actionId = undoneAction.actionId || undoneAction.id;
        const strokeId = undoneAction.strokeId;
        if (actionId && room.completedActionIds) room.completedActionIds.delete(actionId);
        if (strokeId && room.completedStrokeIds) room.completedStrokeIds.delete(strokeId);

        console.log(`Player ${playerId} performed UNDO. Redo count: ${room.redoStacks[playerId].length}`);

        // Broadcast lightweight undo event instead of room-updated
        io.to(code).emit("undo-action", { playerId, actionId: undoneAction.id });
      }
    });

    // Handle Redo Action
    socket.on("redo-action", ({ roomCode }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return;

      const playerId = socket.data.playerId;
      if (!playerId) return;

      if (!room.undoStacks) room.undoStacks = {};
      if (!room.undoStacks[playerId]) room.undoStacks[playerId] = [];

      if (!room.redoStacks) room.redoStacks = {};
      if (!room.redoStacks[playerId]) room.redoStacks[playerId] = [];

      const redoneAction = room.redoStacks[playerId].pop();
      if (redoneAction) {
        // Re-add to completed IDs
        const actionId = redoneAction.actionId || redoneAction.id;
        const strokeId = redoneAction.strokeId;
        if (actionId && room.completedActionIds) room.completedActionIds.add(actionId);
        if (strokeId && room.completedStrokeIds) room.completedStrokeIds.add(strokeId);

        // Push back to room.actions and to undo stack
        room.actions.push(redoneAction);
        room.undoStacks[playerId].push(redoneAction);

        // Sort by sequenceNumber to preserve exact original layer order
        room.actions.sort((a, b) => {
          const sA = a.sequenceNumber || 0;
          const sB = b.sequenceNumber || 0;
          return sA - sB;
        });

        console.log(`Player ${playerId} performed REDO. Redo count: ${room.redoStacks[playerId].length}`);

        // Broadcast lightweight redo event instead of room-updated
        io.to(code).emit("redo-action", { playerId, action: redoneAction });
      }
    });

    // Handle Clear Actions (Clear personal changes)
    socket.on("clear-canvas", ({ roomCode }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const room = rooms.get(code);
      if (!room) return;

      const playerId = socket.data.playerId;
      if (!playerId) return;

      // Remove this player's completed actionIds and strokeIds
      if (room.completedActionIds) {
        room.actions.forEach(act => {
          if (act.playerId === playerId) {
            const actId = act.actionId || act.id;
            if (actId) room.completedActionIds!.delete(actId);
            if (act.strokeId) room.completedStrokeIds!.delete(act.strokeId);
          }
        });
      }

      // Filter out all actions by this player
      room.actions = room.actions.filter(act => act.playerId !== playerId);

      // Clear undo and redo stacks for this player since their changes are gone
      if (!room.undoStacks) room.undoStacks = {};
      room.undoStacks[playerId] = [];

      if (!room.redoStacks) room.redoStacks = {};
      room.redoStacks[playerId] = [];

      console.log(`Player ${playerId} cleared their changes.`);

      // Broadcast lightweight clear actions event instead of room-updated
      io.to(code).emit("clear-player-actions", { playerId });
    });

    // Handle Live Painting (batch segments)
    socket.on("paint-live", ({ roomCode, playerId, data }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      if (!code) return;
      // Disable Socket.IO compression for high-frequency live drawing segments
      socket.to(code).compress(false).emit("paint-live-received", { playerId, data });
    });

    // Handle Cursor Movement
    socket.on("cursor-move", ({ roomCode, x, y }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const playerId = socket.data.playerId;
      if (!playerId || !code) return;
      // Disable Socket.IO compression for high-frequency cursor updates
      socket.to(code).compress(false).emit("cursor-moved", { playerId, x, y });
    });

    // Handle Cursor Leaving
    socket.on("cursor-leave", ({ roomCode }) => {
      const code = (roomCode || socket.data.roomCode || "").toUpperCase();
      const playerId = socket.data.playerId;
      if (!playerId || !code) return;
      // Disable Socket.IO compression for cursor leave control packet
      socket.to(code).compress(false).emit("cursor-left", { playerId });
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
        io.to(code).emit("session-restarted", serializeRoom(room, false));
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

        io.to(code).emit("player-left", { playerId: leavingPlayer.id, name: leavingPlayer.name });
        io.to(code).emit("room-updated", serializeRoom(room, false));

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

          io.to(code).emit("player-disconnected", { playerId: player.id });
          io.to(code).emit("room-updated", serializeRoom(room, false));

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
