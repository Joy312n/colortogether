import React, { useState } from "react";
import { Copy, Check, Users, Sparkles, LogOut, ArrowRight } from "lucide-react";

export default function RoomLobby({ room, playerId, onStartSession, onLeave, onCloseRoom }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const p1 = room?.players[0];
  const p2 = room?.players[1];

  const isHost = p1?.id === playerId;
  const bothPlayersJoined = room?.players.length === 2;

  const inviteUrl = `${window.location.origin}/?room=${room?.roomCode}`;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room?.roomCode || "");
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-8 flex flex-col justify-center min-h-[80vh] w-full">
      {/* Lobby Card */}
      <div className="bg-app-surface border border-app-border p-4 sm:p-6 md:p-10 rounded-3xl shadow-2xl relative overflow-hidden">
        
        {/* Glow effect */}
        <div className="absolute top-0 right-1/4 w-40 h-40 bg-app-primary/10 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-app-accent/10 blur-[100px] rounded-full pointer-events-none" />

        {/* Lobby Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-app-border">
          <div>
            <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-app-primary px-2.5 py-1 rounded-md bg-app-primary/10 border border-app-primary/20 mb-1.5 sm:mb-2">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              Lobby Active
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-app-text leading-tight">Co-op Coloring Room</h1>
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            {isHost && (
              <button
                onClick={onCloseRoom}
                className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[38px]"
                title="Permanently close the room for everyone"
              >
                Close Room
              </button>
            )}
            <button
              onClick={onLeave}
              className="inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 text-xs font-bold text-app-text-muted hover:text-app-text px-3 py-2 rounded-lg bg-app-surface hover:bg-app-surface-hover border border-app-border cursor-pointer transition-colors focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[38px]"
            >
              <LogOut className="w-3.5 h-3.5" />
              Leave Room
            </button>
          </div>
        </div>

        {/* Sharing options */}
        <div className="grid md:grid-cols-2 gap-5 sm:gap-6 mb-6 sm:mb-8">
          {/* Room Code Card */}
          <div className="bg-app-bg border border-app-border p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-app-text-muted">Room Code</span>
              <div className="text-2xl sm:text-3xl font-mono font-black text-app-text tracking-widest mt-1 mb-1.5">
                {room?.roomCode}
              </div>
              <p className="text-[11px] sm:text-xs text-app-text-muted leading-relaxed">
                Give this 6-character code to your friend to join this exact canvas space.
              </p>
            </div>
            <button
              onClick={copyRoomCode}
              className="mt-4 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-app-border hover:border-app-text-muted bg-app-surface hover:bg-app-surface-hover text-xs sm:text-sm font-semibold text-app-text-muted hover:text-app-text cursor-pointer transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-app-primary/30 min-h-[44px]"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Code Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-app-text-muted" />
                  Copy Room Code
                </>
              )}
            </button>
          </div>

          {/* Shareable Invite Link Card */}
          <div className="bg-app-bg border border-app-border p-4 sm:p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-app-text-muted">Quick Invite URL</span>
              <div className="text-xs sm:text-sm font-mono truncate text-app-accent mt-1.5 mb-1.5 bg-app-accent/10 border border-app-accent/20 p-2 rounded-lg max-w-full">
                {inviteUrl}
              </div>
              <p className="text-[11px] sm:text-xs text-app-text-muted leading-relaxed">
                A shareable hyperlink that auto-inputs the code and joins instantly.
              </p>
            </div>
            <button
              onClick={copyInviteLink}
              className="mt-4 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-app-accent/30 bg-app-accent/10 hover:bg-app-accent/20 text-xs sm:text-sm font-semibold text-app-accent hover:text-app-accent cursor-pointer transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-app-accent/30 min-h-[44px]"
            >
              {copiedLink ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  Link Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-app-accent" />
                  Copy Invite Link
                </>
              )}
            </button>
          </div>
        </div>

        {/* Players setup */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-xs sm:text-sm font-bold tracking-wider uppercase text-app-text-muted mb-3 sm:mb-4 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-app-primary" />
            Players Connected ({room?.players.length}/2)
          </h3>

          <div className="grid sm:grid-cols-2 gap-3.5 sm:gap-4">
            {/* Player 1 Slot (Host) */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-app-bg border border-app-primary/10 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-app-primary/20 border border-app-primary/40 text-app-primary font-extrabold flex items-center justify-center text-xs sm:text-sm shadow-md shadow-app-primary/5 shrink-0">
                  P1
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-app-text text-xs sm:text-sm truncate">{p1?.name}</div>
                  <div className="text-[9px] sm:text-[10px] uppercase font-bold text-app-primary tracking-wider truncate">Host • Painter Left</div>
                </div>
              </div>
              {p1?.connected !== false ? (
                <div className="flex items-center gap-1.5 px-2 py-0.5 sm:py-1 bg-emerald-500/10 border border-emerald-500/20 text-[9px] sm:text-[10px] font-bold text-emerald-400 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Active
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2 py-0.5 sm:py-1 bg-amber-500/10 border border-amber-500/25 text-[9px] sm:text-[10px] font-bold text-amber-400 rounded-full shrink-0 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                  Offline
                </div>
              )}
            </div>

            {/* Player 2 Slot (Guest) */}
            {p2 ? (
              <div className="p-3.5 sm:p-4 rounded-2xl bg-app-bg border border-app-accent/10 flex items-center justify-between animate-fade-in">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-app-accent/20 border border-app-accent/40 text-app-accent font-extrabold flex items-center justify-center text-xs sm:text-sm shadow-md shadow-app-accent/5 shrink-0">
                    P2
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-app-text text-xs sm:text-sm truncate">{p2?.name}</div>
                    <div className="text-[9px] sm:text-[10px] uppercase font-bold text-app-accent tracking-wider truncate">Guest • Painter Right</div>
                  </div>
                </div>
                {p2?.connected !== false ? (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 sm:py-1 bg-emerald-500/10 border border-emerald-500/20 text-[9px] sm:text-[10px] font-bold text-emerald-400 rounded-full shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Active
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 sm:py-1 bg-amber-500/10 border border-amber-500/25 text-[9px] sm:text-[10px] font-bold text-amber-400 rounded-full shrink-0 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    Offline
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3.5 sm:p-4 rounded-2xl border border-dashed border-app-border bg-app-bg/50 flex items-center justify-center h-[62px] sm:h-[68px] group">
                <div className="flex items-center gap-2 text-app-text-muted group-hover:text-app-text transition-colors">
                  <span className="w-2 h-2 rounded-full bg-app-primary/60 animate-ping" />
                  <span className="text-sm font-medium tracking-wide">Waiting for partner...</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Panel */}
        <div className="border-t border-app-border pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <div className="text-xs text-app-text-muted font-semibold uppercase tracking-wider">Selected Mode</div>
              <div className="text-sm font-bold text-app-text mt-1">
                {room?.mode === "live" ? "Live Co-op (Simultaneous Canvas)" : "Split Mystery (Secret Halves)"}
              </div>
            </div>

            {isHost ? (
              <button
                onClick={onStartSession}
                disabled={!bothPlayersJoined}
                className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-app-primary/50 ${
                  bothPlayersJoined
                    ? "bg-app-primary hover:bg-app-primary-hover text-white shadow-app-primary/10 active:scale-95"
                    : "bg-app-surface text-app-text-muted border border-app-border cursor-not-allowed opacity-50"
                }`}
              >
                Start Coloring
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="px-5 py-3 rounded-xl bg-app-accent/10 border border-app-accent/20 text-app-accent text-xs font-semibold flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-app-accent animate-pulse" />
                Waiting for host to start coloring...
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
