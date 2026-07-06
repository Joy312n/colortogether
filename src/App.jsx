import React, { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { Palette, Sparkles, LogOut, RefreshCw, AlertTriangle, ShieldCheck } from "lucide-react";

import Lobby from "./components/Lobby";
import CreateRoom from "./components/CreateRoom";
import RoomLobby from "./components/RoomLobby";
import ColoringCanvas from "./components/ColoringCanvas";
import ArtworkReveal from "./components/ArtworkReveal";
import ThemeSelector from "./components/ThemeSelector";

export default function App() {
  const [nickname, setNickname] = useState(() => {
    return localStorage.getItem("colortogether_name") || "";
  });
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState(() => {
    let id = localStorage.getItem("colortogether_player_id");
    if (!id) {
      id = "p_" + Math.random().toString(36).substring(2, 11) + "_" + Date.now();
      localStorage.setItem("colortogether_player_id", id);
    }
    return id;
  });
  const [screen, setScreen] = useState("LOBBY"); // "LOBBY" | "CREATE" | "ROOM_LOBBY" | "GAME" | "REVEAL"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [inviteRoomCode, setInviteRoomCode] = useState("");
  const [mergedData, setMergedData] = useState(null);
  const [connStatus, setConnStatus] = useState("disconnected"); // "connected" | "disconnected" | "connecting"

  const socketRef = useRef(null);

  // Parse invite links or room codes from the URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get("room");
    if (roomParam && roomParam.length === 6) {
      const code = roomParam.toUpperCase();
      setInviteRoomCode(code);
      // Clean up URL query parameters so reloading doesn't loop join attempts
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Save nickname updates to local storage
  useEffect(() => {
    localStorage.setItem("colortogether_name", nickname);
  }, [nickname]);

  // Connect and initialize Socket.IO Client
  useEffect(() => {
    setConnStatus("connecting");
    // Connect to the same port hosting the express app
    const socket = io(window.location.origin, {
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected to server:", socket.id);
      setConnStatus("connected");

      // Attempt automatic session recovery/sync if we have saved details
      const savedRoomCode = localStorage.getItem("colortogether_room_code");
      const savedPlayerId = localStorage.getItem("colortogether_player_id") || playerId;
      const savedName = localStorage.getItem("colortogether_name") || nickname;

      if (savedRoomCode && savedPlayerId) {
        socket.emit("sync-session", {
          roomCode: savedRoomCode,
          playerId: savedPlayerId,
          nickname: savedName
        });
      }
    });

    socket.on("disconnect", () => {
      console.log("Disconnected from server");
      setConnStatus("disconnected");
    });

    // Socket: Sync Success (handles refresh or reconnection)
    socket.on("sync-success", ({ roomCode, room: syncedRoom, playerId: sid }) => {
      setLoading(false);
      setRoom(syncedRoom);
      setPlayerId(sid);
      localStorage.setItem("colortogether_room_code", roomCode);
      
      if (syncedRoom.sessionStarted) {
        setScreen("GAME");
      } else {
        setScreen("ROOM_LOBBY");
      }
    });

    // Socket: Sync Failed
    socket.on("sync-failed", ({ error: errMsg }) => {
      setLoading(false);
      localStorage.removeItem("colortogether_room_code");
      setRoom(null);
      // Only set error if we are actively in a game/room screen
      if (screen !== "LOBBY") {
        setError(errMsg);
        setScreen("LOBBY");
      }
    });

    // Socket: Room Closed by Host
    socket.on("room-closed", (message) => {
      setLoading(false);
      localStorage.removeItem("colortogether_room_code");
      setRoom(null);
      setMergedData(null);
      setError(message || "The room was closed by the host.");
      setScreen("LOBBY");
    });

    // Socket: Partner left the room
    socket.on("player-left", (partnerName) => {
      setError(`Your creative partner (${partnerName}) has left the room.`);
    });

    // Socket: Room Created Successful
    socket.on("room-created", ({ roomCode, room: newRoom }) => {
      setLoading(false);
      setRoom(newRoom);
      localStorage.setItem("colortogether_room_code", roomCode);
      setScreen("ROOM_LOBBY");
    });

    // Socket: Joined Success
    socket.on("join-success", ({ roomCode, room: joinedRoom, playerId: sid }) => {
      setLoading(false);
      setRoom(joinedRoom);
      setPlayerId(sid);
      localStorage.setItem("colortogether_room_code", roomCode);
      
      if (joinedRoom.sessionStarted) {
        setScreen("GAME");
      } else {
        setScreen("ROOM_LOBBY");
      }
    });

    // Socket: General Join Errors
    socket.on("join-error", (message) => {
      setLoading(false);
      setError(message);
      setScreen("LOBBY");
    });

    // Socket: Lobby state updated
    socket.on("room-updated", (updatedRoom) => {
      setRoom(updatedRoom);
    });

    // Socket: Game Session Started
    socket.on("session-started", (startedRoom) => {
      setRoom(startedRoom);
      setScreen("GAME");
    });

    // Socket: Masterpieces merged successfully
    socket.on("merge-complete", (data) => {
      setMergedData(data);
      setScreen("REVEAL");
    });

    return () => {
      socket.disconnect();
    };
  }, [screen, playerId, nickname]);

  // Action: Create Room
  const handleCreateRoom = ({ mode, image }) => {
    if (!nickname.trim()) return;
    setLoading(true);
    socketRef.current?.emit("create-room", {
      nickname: nickname.trim(),
      image,
      mode,
      playerId,
    });
  };

  // Action: Join Room
  const handleJoinRoom = (roomCode) => {
    if (!nickname.trim()) return;
    setLoading(true);
    setError("");
    socketRef.current?.emit("join-room", {
      roomCode: roomCode.toUpperCase().trim(),
      nickname: nickname.trim(),
      playerId,
    });
  };

  // Action: Start Game (Host only)
  const handleStartSession = () => {
    if (!room) return;
    socketRef.current?.emit("start-session", { roomCode: room.roomCode });
  };

  // Action: Finish Coloring
  const handleFinishColoring = (finishedCanvasData) => {
    if (!room) return;
    socketRef.current?.emit("finish-coloring", {
      roomCode: room.roomCode,
      finishedData: finishedCanvasData,
    });
  };

  // Action: Leave active room explicitly
  const handleLeaveRoom = () => {
    const savedRoomCode = localStorage.getItem("colortogether_room_code");
    if (savedRoomCode) {
      socketRef.current?.emit("leave-room", { roomCode: savedRoomCode, playerId });
    }
    localStorage.removeItem("colortogether_room_code");
    setRoom(null);
    setMergedData(null);
    setScreen("LOBBY");
  };

  // Action: Close room explicitly (Host only)
  const handleCloseRoom = () => {
    const savedRoomCode = localStorage.getItem("colortogether_room_code");
    if (savedRoomCode) {
      socketRef.current?.emit("close-room", { roomCode: savedRoomCode, playerId });
    }
    localStorage.removeItem("colortogether_room_code");
    setRoom(null);
    setMergedData(null);
    setScreen("LOBBY");
  };

  // Action: Return to home from reveal screen
  const handleReturnHome = () => {
    localStorage.removeItem("colortogether_room_code");
    setRoom(null);
    setMergedData(null);
    setScreen("LOBBY");
  };

  return (
    <div className="min-h-screen bg-app-bg text-app-text flex flex-col justify-between">
      
      {/* Top Navigation Bar */}
      <header className="border-b border-app-border bg-app-surface/80 backdrop-blur-md sticky top-0 z-50 px-3 py-3 sm:px-6 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer shrink-0" onClick={handleReturnHome}>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-app-primary via-app-accent to-app-primary flex items-center justify-center shadow-lg shadow-app-primary/20 shrink-0">
              <Palette className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <span className="font-sans font-black text-base sm:text-xl tracking-tight bg-gradient-to-r from-app-primary to-app-accent bg-clip-text text-transparent">
                ColorTogether
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-widest text-app-text-muted block -mt-1 pl-0.5">Co-Op Painting</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {/* Theme Selector Dropdown and mode toggle */}
            <ThemeSelector />

            {/* Connection dot */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-app-surface border border-app-border text-xs font-semibold">
              <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0 ${
                connStatus === "connected" 
                  ? "bg-emerald-400 shadow-[0_0_8px_#34D399]" 
                  : connStatus === "connecting"
                  ? "bg-amber-400 animate-pulse"
                  : "bg-red-400"
              }`} />
              <span className="text-[9px] text-app-text-muted uppercase tracking-wider hidden sm:inline shrink-0">
                {connStatus === "connected" ? "Live Connected" : connStatus === "connecting" ? "Syncing..." : "Offline"}
              </span>
            </div>

            {/* Exit/lobby escape */}
            {screen !== "LOBBY" && screen !== "CREATE" && screen !== "REVEAL" && (
              <button
                onClick={handleLeaveRoom}
                className="p-1.5 sm:p-2 bg-app-surface hover:bg-app-surface-hover border border-app-border text-app-text-muted hover:text-app-text rounded-xl transition-all flex items-center gap-1 cursor-pointer text-xs font-semibold shrink-0 min-h-[32px] sm:min-h-[38px]"
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Exit Room</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Primary Routing Body */}
      <main className="flex-1 w-full flex items-center justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center space-y-4 py-20">
            <div className="w-12 h-12 border-4 border-app-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-semibold text-app-text-muted">Loading your creative canvas...</p>
          </div>
        ) : (
          <>
            {screen === "LOBBY" && (
              <Lobby
                nickname={nickname}
                setNickname={setNickname}
                onNavigateToCreate={() => setScreen("CREATE")}
                onJoinRoom={handleJoinRoom}
                initialRoomCode={inviteRoomCode}
              />
            )}

            {screen === "CREATE" && (
              <CreateRoom
                onNavigateBack={() => setScreen("LOBBY")}
                onCreateRoom={handleCreateRoom}
              />
            )}

            {screen === "ROOM_LOBBY" && (
              <RoomLobby
                room={room}
                playerId={playerId}
                onStartSession={handleStartSession}
                onLeave={handleLeaveRoom}
                onCloseRoom={handleCloseRoom}
              />
            )}

            {screen === "GAME" && (
              <ColoringCanvas
                room={room}
                playerId={playerId}
                socket={socketRef.current}
                onFinishColoring={handleFinishColoring}
              />
            )}

            {screen === "REVEAL" && (
              <ArtworkReveal
                mergedData={mergedData}
                onReturnHome={handleReturnHome}
              />
            )}
          </>
        )}
      </main>

      {/* Global Bottom Toast Notification Area */}
      {error && (
        <div className="fixed bottom-6 right-6 max-w-sm bg-app-surface border border-red-500/30 p-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-fade-in z-[100]">
          <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-400 shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-app-text">System Alert</h4>
            <p className="text-xs text-app-text-muted mt-1 leading-relaxed">{error}</p>
            <button 
              onClick={() => setError("")}
              className="text-[10px] text-red-400 hover:text-red-300 font-bold tracking-wider mt-2 block uppercase cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Clean Minimalist Footer */}
      <footer className="border-t border-app-border bg-app-surface px-6 py-4 text-center">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 text-app-text-muted opacity-80 text-[11px] font-medium font-mono">
          <p>© 2026 ColorTogether Studio. Realtime Canvas Synergy.</p>
          <p className="flex items-center gap-1.5 justify-center text-app-text-muted">
            <ShieldCheck className="w-3.5 h-3.5 text-app-primary" />
            No accounts required • Persistent local artist tags active
          </p>
        </div>
      </footer>

    </div>
  );
}
