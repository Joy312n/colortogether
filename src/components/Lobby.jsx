import React, { useState, useEffect } from "react";
import { Palette, Users, Zap, Shield, Sparkles } from "lucide-react";

export default function Lobby({
  nickname,
  setNickname,
  onNavigateToCreate,
  onJoinRoom,
  initialRoomCode,
}) {
  const [roomCodeInput, setRoomCodeInput] = useState(initialRoomCode || "");
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialRoomCode) {
      setRoomCodeInput(initialRoomCode);
    }
  }, [initialRoomCode]);

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("Please set a nickname first!");
      return;
    }
    if (!roomCodeInput.trim() || roomCodeInput.trim().length !== 6) {
      setError("Please enter a valid 6-character room code.");
      return;
    }
    setError("");
    onJoinRoom(roomCodeInput.toUpperCase().trim());
  };

  const handleCreateClick = () => {
    if (!nickname.trim()) {
      setError("Please set a nickname first!");
      return;
    }
    setError("");
    onNavigateToCreate();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10 md:py-16 flex flex-col items-center justify-center min-h-[80vh] w-full">
      {/* Hero Header */}
      <div className="text-center mb-8 sm:mb-12 md:mb-16 w-full">
        <div className="inline-flex items-center gap-2.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-app-primary/10 border border-app-primary/20 text-app-primary mb-4 sm:mb-6 animate-pulse">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="text-xs sm:text-sm font-medium tracking-wide">Real-time Multiplayer Coloring</span>
        </div>
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-sans font-black tracking-tighter bg-gradient-to-r from-app-primary via-app-accent to-app-primary bg-clip-text text-transparent leading-none">
          ColorTogether
        </h1>
        <p className="mt-3 sm:mt-4 text-sm sm:text-base md:text-xl text-app-text-muted max-w-2xl mx-auto font-sans leading-relaxed px-2">
          Unleash your shared creativity! Upload any line-art image and collaboratively bring it to life in real-time with a friend.
        </p>
      </div>

      {/* Main Action Cards Grid */}
      <div className="grid md:grid-cols-2 gap-6 sm:gap-8 w-full max-w-3xl px-1 sm:px-0">
        {/* Left Side: Profile Setup */}
        <div className="bg-app-surface border border-app-border p-5 sm:p-6 md:p-8 rounded-3xl flex flex-col justify-between shadow-2xl">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-app-text flex items-center gap-2 mb-3 sm:mb-4">
              <span className="p-1.5 rounded-lg bg-app-primary/10 text-app-primary">
                <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              1. Setup Your Profile
            </h2>
            <p className="text-xs sm:text-sm text-app-text-muted mb-4 sm:mb-6 leading-relaxed">
              Enter your artist name before creating or joining a collaborative canvas room.
            </p>
            <div className="space-y-1.5 sm:space-y-2">
              <label className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-app-text-muted opacity-80">Artist Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.substring(0, 15))}
                placeholder="Enter your nickname..."
                className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-app-bg border border-app-border rounded-xl text-app-text placeholder-app-text-muted/50 focus:outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary transition-all font-medium text-sm sm:text-base"
              />
            </div>
          </div>

          <div className="mt-6 sm:mt-8">
            <button
              onClick={handleCreateClick}
              className="w-full py-3.5 sm:py-4 bg-app-primary hover:bg-app-primary-hover text-white font-bold rounded-xl shadow-lg shadow-app-primary/20 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-app-primary/50 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
            >
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
              Create Custom Room
            </button>
          </div>
        </div>

        {/* Right Side: Join Existing Room */}
        <div className="bg-app-surface border border-app-border p-5 sm:p-6 md:p-8 rounded-3xl shadow-2xl flex flex-col justify-between">
          <form onSubmit={handleJoinSubmit} className="flex flex-col h-full justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-app-text flex items-center gap-2 mb-3 sm:mb-4">
                <span className="p-1.5 rounded-lg bg-app-accent/10 text-app-accent">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                2. Join Room
              </h2>
              <p className="text-xs sm:text-sm text-app-text-muted mb-4 sm:mb-6 leading-relaxed">
                Have a 6-character code from a partner? Enter it below to join their active session.
              </p>
              <div className="space-y-1.5 sm:space-y-2">
                <label className="text-[10px] sm:text-xs font-semibold tracking-wider uppercase text-app-text-muted opacity-80">Room Code</label>
                <input
                  type="text"
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value.substring(0, 6))}
                  placeholder="e.g. AB12CD"
                  className="w-full px-3 sm:px-4 py-2.5 sm:py-3 bg-app-bg border border-app-border rounded-xl text-app-text placeholder-app-text-muted/50 focus:outline-none focus:border-app-accent focus:ring-1 focus:ring-app-accent transition-all font-mono font-bold text-base sm:text-lg tracking-widest text-center uppercase"
                />
              </div>
            </div>

            <div className="mt-6 sm:mt-8">
              <button
                type="submit"
                className="w-full py-3.5 sm:py-4 bg-app-surface hover:bg-app-surface-hover text-app-text font-bold rounded-xl border border-app-border hover:border-app-text-muted active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-app-primary/30 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
              >
                Join with Code
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Global Error Display */}
      {error && (
        <div className="mt-6 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm font-medium animate-fade-in">
          {error}
        </div>
      )}

      {/* Value Pillars */}
      <div className="grid sm:grid-cols-3 gap-6 w-full max-w-3xl mt-12 sm:mt-16 md:mt-24 border-t border-app-border pt-8 sm:pt-12 px-1 sm:px-0">
        <div className="flex flex-col items-center text-center p-3 sm:p-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-app-primary/10 flex items-center justify-center text-app-primary mb-2 sm:mb-3">
            <Zap className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <h3 className="font-bold text-app-text text-xs sm:text-sm mb-1">Instant Realtime Sync</h3>
          <p className="text-[11px] sm:text-xs text-app-text-muted opacity-80 max-w-[200px] leading-relaxed">
            Every brush stroke synchronizes instantly using optimized low-latency WebSocket protocols.
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-3 sm:p-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-app-accent/10 flex items-center justify-center text-app-accent mb-2 sm:mb-3">
            <Users className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <h3 className="font-bold text-app-text text-xs sm:text-sm mb-1">Two Exclusive Modes</h3>
          <p className="text-[11px] sm:text-xs text-app-text-muted opacity-80 max-w-[200px] leading-relaxed">
            Color side-by-side simultaneously in Live Mode, or keep works secret in Split Mode.
          </p>
        </div>
        <div className="flex flex-col items-center text-center p-3 sm:p-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-app-primary/10 flex items-center justify-center text-app-primary mb-2 sm:mb-3">
            <Shield className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <h3 className="font-bold text-app-text text-xs sm:text-sm mb-1">Interactive Reveal</h3>
          <p className="text-[11px] sm:text-xs text-app-text-muted opacity-80 max-w-[200px] leading-relaxed">
            Once both artists finish, both halves combine with a beautiful merge reveal animation!
          </p>
        </div>
      </div>
    </div>
  );
}
