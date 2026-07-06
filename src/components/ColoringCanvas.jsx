import React, { useState, useEffect, useRef } from "react";
import { 
  Paintbrush, 
  PaintBucket, 
  Eraser, 
  Undo2, 
  RotateCcw, 
  CheckSquare, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Hand,
  CheckCircle,
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { drawBrushPoints, floodFill, hexToRgb } from "../utils/canvasHelpers";
import { useTheme } from "./ThemeContext";

// 12 Premium Designer Colors
const PALETTE = [
  "#F43F5E", "#EC4899", "#D946EF", "#8B5CF6", 
  "#3B82F6", "#06B6D4", "#10B981", "#84CC16", 
  "#EAB308", "#F97316", "#EF4444", "#0F172A"
];

export default function ColoringCanvas({ 
  room, 
  playerId, 
  socket, 
  onFinishColoring 
}) {
  const { activeTheme, mode } = useTheme();
  const [activeTool, setActiveTool] = useState("brush"); // "brush" | "bucket" | "eraser" | "pan"
  const [brushColor, setBrushColor] = useState("#EC4899");
  const [brushSize, setBrushSize] = useState(12);
  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [partnerStatus, setPartnerStatus] = useState("");
  const [isFinishedLocal, setIsFinishedLocal] = useState(false);

  const paintCanvasRef = useRef(null); // Offline drawing canvas
  const outlineCanvasRef = useRef(null); // Outline reference canvas
  const visibleCanvasRef = useRef(null); // On-screen composite canvas
  const outlineImageRef = useRef(null); // Cached Image element for outlines
  const isDrawingRef = useRef(false);
  const currentStrokePointsRef = useRef([]); // [x1, y1, x2, y2, ...]
  const localActionIdRef = useRef(0); // For unique local action IDs

  const [dimensions, setDimensions] = useState({ width: 800, height: 800 });
  const [loadedImage, setLoadedImage] = useState(null);
  const { width, height } = dimensions;

  // Identify Player slots
  const p1 = room?.players[0];
  const p2 = room?.players[1];
  const isP1 = p1?.id === playerId;
  const myPlayer = isP1 ? p1 : p2;
  const partnerPlayer = isP1 ? p2 : p1;

  // Enforce Split Mode region boundaries
  const isSplitMode = room?.mode === "split";
  const myXMin = isSplitMode ? (isP1 ? 0 : width / 2) : 0;
  const myXMax = isSplitMode ? (isP1 ? width / 2 : width) : width;

  // Initialize and load the line-art image dimensions
  useEffect(() => {
    if (!room?.image) {
      setLoadedImage(null);
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      outlineImageRef.current = img;
      setLoadedImage(img);
      const imgWidth = img.naturalWidth || 800;
      const imgHeight = img.naturalHeight || 800;
      setDimensions({ width: imgWidth, height: imgHeight });
    };
    img.src = room.image;
  }, [room?.image]);

  // Handle actual drawing on the offline canvases once dimensions and image are matched
  useEffect(() => {
    if (!loadedImage) return;

    // Draw outlines to outline reference canvas
    const outlineCanvas = outlineCanvasRef.current;
    if (outlineCanvas) {
      const octx = outlineCanvas.getContext("2d");
      octx.fillStyle = "#FFFFFF";
      octx.fillRect(0, 0, width, height);
      octx.drawImage(loadedImage, 0, 0, width, height);
    }

    // Initialize transparent white paint canvas
    const paintCanvas = paintCanvasRef.current;
    if (paintCanvas) {
      const pctx = paintCanvas.getContext("2d");
      pctx.clearRect(0, 0, width, height);
    }

    rebuildCanvasFromHistory();
  }, [loadedImage, width, height, room?.actions]);

  // Handle incoming Socket events for drawing synchronization
  useEffect(() => {
    if (!socket) return;

    // Receive live drawing segments (low latency brush motion)
    const handleLivePaint = ({ playerId: senderId, segment }) => {
      if (senderId === playerId) return;
      
      const paintCanvas = paintCanvasRef.current;
      if (!paintCanvas) return;
      const pctx = paintCanvas.getContext("2d");

      // In split mode, don't show the other player's painting live
      if (isSplitMode) return;

      const { x0, y0, x1, y1, color, size, isEraser } = segment;
      drawBrushPoints(pctx, [x0, y0, x1, y1], color, size, isEraser);
      redrawComposite();
    };

    // Receive committed drawing actions (actions pushed to room history)
    const handleDrawAction = (action) => {
      if (action.playerId === playerId) return;

      // In split mode, committed actions from partner are also ignored until finish
      if (isSplitMode) return;

      // Ensure the action is added to our local room.actions array so that undo or clear doesn't lose it
      const alreadyExists = room.actions.some(act => act.id === action.id);
      if (!alreadyExists) {
        room.actions.push(action);
      }

      const paintCanvas = paintCanvasRef.current;
      if (!paintCanvas) return;
      const pctx = paintCanvas.getContext("2d");

      if (action.type === "brush" || action.type === "eraser") {
        drawBrushPoints(pctx, action.points, action.color, action.size, action.type === "eraser");
      } else if (action.type === "bucket") {
        const outlineCanvas = outlineCanvasRef.current;
        if (outlineCanvas) {
          const octx = outlineCanvas.getContext("2d");
          const outlineImageData = octx.getImageData(0, 0, width, height);
          floodFill(
            paintCanvas, 
            action.x, 
            action.y, 
            hexToRgb(action.color), 
            outlineImageData,
            0, // For remote, they have full width access unless in split mode (which isn't broadcasted anyway)
            width
          );
        }
      }
      redrawComposite();
    };

    // Receive Undo Action
    const handleUndoAction = (data) => {
      if (data && data.actionId) {
        room.actions = room.actions.filter(act => act.id !== data.actionId);
      }
      // Re-fetch room actions and redraw entire canvas layer from history
      rebuildCanvasFromHistory();
    };

    // Receive Canvas Clear
    const handleCanvasCleared = (data) => {
      if (data && data.playerId) {
        room.actions = room.actions.filter(act => act.playerId !== data.playerId);
      }
      rebuildCanvasFromHistory();
    };

    // Receive Partner Finished status
    const handlePartnerFinished = ({ playerId: finishedId, name }) => {
      if (finishedId !== playerId) {
        setPartnerStatus(`${name} is finished! Waiting for you...`);
      }
    };

    socket.on("draw-action-received", handleDrawAction);
    socket.on("paint-live-received", handleLivePaint);
    socket.on("undo-action-received", handleUndoAction);
    socket.on("canvas-cleared", handleCanvasCleared);
    socket.on("player-finished", handlePartnerFinished);

    return () => {
      socket.off("draw-action-received", handleDrawAction);
      socket.off("paint-live-received", handleLivePaint);
      socket.off("undo-action-received", handleUndoAction);
      socket.off("canvas-cleared", handleCanvasCleared);
      socket.off("player-finished", handlePartnerFinished);
    };
  }, [socket, playerId, room?.mode]);

  // Ensure the composite canvas is redrawn when theme or mode changes
  useEffect(() => {
    redrawComposite();
  }, [activeTheme, mode, width, height]);

  // Redraws the composite on-screen canvas (Colors Layer + Outlines Layer multiplied on top)
  const redrawComposite = () => {
    const visibleCanvas = visibleCanvasRef.current;
    const paintCanvas = paintCanvasRef.current;
    const outlineCanvas = outlineCanvasRef.current;

    if (!visibleCanvas || !paintCanvas || !outlineCanvas) return;

    const ctx = visibleCanvas.getContext("2d");
    
    // 1. Fill with solid white background on the visible composite canvas
    // This is critical so that 'multiply' blend mode has an opaque surface to blend against,
    // otherwise the black outlines multiply with transparent pixels and become transparent/invisible.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // 2. Draw paint layers (the colors)
    ctx.drawImage(paintCanvas, 0, 0);

    // 3. Draw original line art with "multiply" composition (so black outlines stay on top)
    ctx.save();
    ctx.globalCompositeOperation = "multiply";
    ctx.drawImage(outlineCanvas, 0, 0);
    ctx.restore();

    // 4. Render visual boundaries for Split mode
    if (isSplitMode) {
      ctx.save();
      // Draw split divider line
      ctx.strokeStyle = "rgba(139, 92, 246, 0.4)";
      ctx.lineWidth = 4;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      // Mask/darken the other player's half to keep focus clear
      ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
      ctx.beginPath();
      if (isP1) {
        ctx.rect(width / 2, 0, width / 2, height);
      } else {
        ctx.rect(0, 0, width / 2, height);
      }
      ctx.fill();

      // Draw padlock overlay on other half
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.textAlign = "center";
      const lockX = isP1 ? width * 0.75 : width * 0.25;
      ctx.fillText("🔒 PARTNER'S HALF", lockX, height / 2);
      ctx.restore();
    }
  };

  // Re-render the offline paint canvas based on actions history
  const rebuildCanvasFromHistory = () => {
    const paintCanvas = paintCanvasRef.current;
    const outlineCanvas = outlineCanvasRef.current;
    if (!paintCanvas || !outlineCanvas) return;

    const pctx = paintCanvas.getContext("2d");
    pctx.clearRect(0, 0, width, height);

    const octx = outlineCanvas.getContext("2d");
    const outlineImageData = octx.getImageData(0, 0, width, height);

    // Filter relevant actions for Split Mode
    const relevantActions = room.actions.filter(action => {
      if (isSplitMode) {
        // Only render our own actions
        return action.playerId === playerId;
      }
      return true; // Live mode renders all
    });

    // Replay all actions
    relevantActions.forEach(action => {
      if (action.type === "brush" || action.type === "eraser") {
        drawBrushPoints(pctx, action.points, action.color, action.size, action.type === "eraser");
      } else if (action.type === "bucket") {
        floodFill(
          paintCanvas, 
          action.x, 
          action.y, 
          hexToRgb(action.color), 
          outlineImageData,
          myXMin,
          myXMax
        );
      }
    });

    redrawComposite();
  };

  // Maps mouse/touch pointer to canvas coordinates
  const getCanvasCoords = (e) => {
    const visibleCanvas = visibleCanvasRef.current;
    if (!visibleCanvas) return { x: 0, y: 0 };

    const rect = visibleCanvas.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (width / rect.width));
    const y = Math.round((e.clientY - rect.top) * (height / rect.height));

    return { x, y };
  };

  // Pointer Down handler
  const handlePointerDown = (e) => {
    // If pan tool or right click, pan instead of drawing
    if (activeTool === "pan" || e.button === 1 || e.button === 2) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    if (isFinishedLocal) return;

    const { x, y } = getCanvasCoords(e);

    // Restrict drawing to own side in split mode
    if (isSplitMode && (x < myXMin || x > myXMax)) {
      return;
    }

    if (activeTool === "brush" || activeTool === "eraser") {
      isDrawingRef.current = true;
      currentStrokePointsRef.current = [x, y];

      // Draw single point locally
      const paintCanvas = paintCanvasRef.current;
      const pctx = paintCanvas.getContext("2d");
      
      pctx.save();
      // Apply split region clipping locally
      if (isSplitMode) {
        pctx.beginPath();
        pctx.rect(myXMin, 0, myXMax - myXMin, height);
        pctx.clip();
      }

      drawBrushPoints(
        pctx, 
        [x, y, x, y], 
        brushColor, 
        brushSize, 
        activeTool === "eraser"
      );
      pctx.restore();
      redrawComposite();

      // Emit live starting point
      socket.emit("paint-live", {
        roomCode: room.roomCode,
        playerId,
        segment: {
          x0: x, y0: y, x1: x, y1: y,
          color: brushColor,
          size: brushSize,
          isEraser: activeTool === "eraser"
        }
      });
    } else if (activeTool === "bucket") {
      const paintCanvas = paintCanvasRef.current;
      const outlineCanvas = outlineCanvasRef.current;
      if (!paintCanvas || !outlineCanvas) return;

      const octx = outlineCanvas.getContext("2d");
      const outlineImageData = octx.getImageData(0, 0, width, height);

      // Perform local fill
      const result = floodFill(
        paintCanvas, 
        x, 
        y, 
        hexToRgb(brushColor), 
        outlineImageData,
        myXMin,
        myXMax
      );

      if (result) {
        redrawComposite();

        // Emit Committed Action
        const actionId = `${playerId}-${Date.now()}-${localActionIdRef.current++}`;
        const newAction = {
          id: actionId,
          type: "bucket",
          x,
          y,
          color: brushColor
        };
        // Add to local history instantly for consistency
        room.actions.push({ ...newAction, playerId });

        socket.emit("draw-action", {
          roomCode: room.roomCode,
          action: newAction
        });
      }
    }
  };

  // Pointer Move handler
  const handlePointerMove = (e) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
      return;
    }

    if (!isDrawingRef.current || isFinishedLocal) return;

    const { x, y } = getCanvasCoords(e);

    // Bound drawing within our half in Split Mode
    let boundX = x;
    if (isSplitMode) {
      if (isP1) {
        boundX = Math.min(width / 2 - 2, Math.max(0, x));
      } else {
        boundX = Math.min(width, Math.max(width / 2 + 2, x));
      }
    }

    const points = currentStrokePointsRef.current;
    const x0 = points[points.length - 2];
    const y0 = points[points.length - 1];

    points.push(boundX, y);

    // Draw locally
    const paintCanvas = paintCanvasRef.current;
    const pctx = paintCanvas.getContext("2d");

    pctx.save();
    // Clip locally in split mode
    if (isSplitMode) {
      pctx.beginPath();
      pctx.rect(myXMin, 0, myXMax - myXMin, height);
      pctx.clip();
    }

    drawBrushPoints(
      pctx, 
      [x0, y0, boundX, y], 
      brushColor, 
      brushSize, 
      activeTool === "eraser"
    );
    pctx.restore();
    redrawComposite();

    // Broadcast segment live
    socket.emit("paint-live", {
      roomCode: room.roomCode,
      playerId,
      segment: {
        x0, y0, x1: boundX, y1: y,
        color: brushColor,
        size: brushSize,
        isEraser: activeTool === "eraser"
      }
    });
  };

  // Pointer Up handler
  const handlePointerUp = () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    // Commit full stroke action
    if (currentStrokePointsRef.current.length >= 2) {
      const actionId = `${playerId}-${Date.now()}-${localActionIdRef.current++}`;
      const newAction = {
        id: actionId,
        type: activeTool === "eraser" ? "eraser" : "brush",
        points: [...currentStrokePointsRef.current],
        color: activeTool === "eraser" ? null : brushColor,
        size: brushSize
      };

      // Add locally for instant sync
      room.actions.push({ ...newAction, playerId });

      socket.emit("draw-action", {
        roomCode: room.roomCode,
        action: newAction
      });
    }

    currentStrokePointsRef.current = [];
  };

  // Undo triggers
  const handleUndo = () => {
    if (isFinishedLocal) return;
    socket.emit("undo-action", { roomCode: room.roomCode });
    
    // Optimistic update
    let undoneId = null;
    for (let i = room.actions.length - 1; i >= 0; i--) {
      if (room.actions[i].playerId === playerId) {
        undoneId = room.actions[i].id;
        room.actions.splice(i, 1);
        break;
      }
    }
    if (undoneId) {
      rebuildCanvasFromHistory();
    }
  };

  // Clear Personal Changes
  const handleClear = () => {
    if (isFinishedLocal) return;
    if (confirm("Are you sure you want to clear all your colored changes on this canvas?")) {
      socket.emit("clear-canvas", { roomCode: room.roomCode });
      room.actions = room.actions.filter(act => act.playerId !== playerId);
      rebuildCanvasFromHistory();
    }
  };

  // Zoom Operations
  const handleZoom = (factor) => {
    setZoom(prev => Math.min(4.0, Math.max(0.6, prev * factor)));
  };

  const resetPanAndZoom = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
  };

  // Finish button clicked
  const handleFinish = () => {
    if (isFinishedLocal) return;
    
    setIsFinishedLocal(true);
    setPartnerStatus("Waiting for your partner...");

    // Extract our specific colored layer (either left half, right half, or full depending on mode)
    const paintCanvas = paintCanvasRef.current;
    if (!paintCanvas) return;

    // Create a temporary canvas of the same size to isolate our colors
    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = width;
    exportCanvas.height = height;
    const exCtx = exportCanvas.getContext("2d");

    // Copy paint canvas
    exCtx.drawImage(paintCanvas, 0, 0);

    // If split mode, we must make sure we only export our assigned half, other half transparent
    if (isSplitMode) {
      exCtx.save();
      exCtx.globalCompositeOperation = "destination-in";
      exCtx.fillStyle = "#000000";
      exCtx.beginPath();
      exCtx.rect(myXMin, 0, myXMax - myXMin, height);
      exCtx.fill();
      exCtx.restore();
    }

    const dataUrl = exportCanvas.toDataURL("image/png");
    onFinishColoring(dataUrl);
  };

  return (
    <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-80px)] w-full gap-4 p-3 sm:p-4 font-sans select-none overflow-y-auto lg:overflow-hidden">
      
      {/* LEFT SIDE: Active Canvas Area */}
      <div className="flex-1 bg-app-bg border border-app-border rounded-3xl relative flex items-center justify-center overflow-hidden h-[50vh] sm:h-[60vh] lg:h-full min-h-[320px]">
        
        {/* Invisible caches for canvases */}
        <canvas ref={paintCanvasRef} width={width} height={height} className="hidden" />
        <canvas ref={outlineCanvasRef} width={width} height={height} className="hidden" />

        {/* Outer Workspace Grid/Pan board */}
        <div 
          className="absolute inset-0 cursor-crosshair overflow-hidden flex items-center justify-center"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
        >
          {/* Hardware-accelerated Transform Wrapper */}
          <div 
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isPanning ? "none" : "transform 0.1s ease-out"
            }}
            className="shadow-2xl rounded-2xl overflow-hidden bg-white relative select-none"
          >
            {/* The main combined visual canvas */}
            <canvas 
              ref={visibleCanvasRef} 
              width={width} 
              height={height}
              className="block select-none"
              style={
                width >= height ? {
                  width: "min(70vh, 70vw, 650px)",
                  height: `calc(min(70vh, 70vw, 650px) * ${height / width})`,
                } : {
                  height: "min(70vh, 70vw, 650px)",
                  width: `calc(min(70vh, 70vw, 650px) * ${width / height})`,
                }
              }
            />
          </div>
        </div>

        {/* FLOATING ACTION TOOLBARS OVER CANVAS */}
        {/* Top Header Panel */}
        <div className="absolute top-3 left-3 right-3 sm:top-4 sm:left-4 sm:right-4 flex justify-between items-center bg-app-surface/90 backdrop-blur-md px-3.5 py-2.5 sm:px-5 sm:py-3 rounded-2xl border border-app-border/60 pointer-events-auto shadow-md">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] sm:text-xs text-app-text-muted font-medium">Co-op: </span>
              <span className="text-xs sm:text-sm font-bold text-app-text uppercase tracking-wider font-mono">
                {room?.roomCode}
              </span>
            </div>
            <span className="text-app-border text-xs">|</span>
            <span className="text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 sm:px-2 rounded bg-app-accent/10 text-app-accent shrink-0">
              {room?.mode === "live" ? "Live" : "Split"}
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-app-text flex items-center gap-1">
                <span className="inline-block w-2 h-2 rounded-full bg-app-primary" />
                {myPlayer?.name} (You)
              </p>
              {partnerPlayer && (
                <p className="text-[10px] text-app-text-muted font-medium mt-0.5 flex items-center justify-end gap-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${partnerPlayer.finished ? "bg-emerald-400" : "bg-app-accent"}`} />
                  {partnerPlayer?.name} {partnerPlayer.finished ? "✓ Done" : "Coloring..."}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Floating Zoom Controls bottom right */}
        <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex flex-col gap-1.5 bg-app-surface/90 backdrop-blur-md p-1.5 rounded-xl border border-app-border/60 pointer-events-auto shadow-md">
          <button 
            onClick={() => handleZoom(1.2)} 
            className="p-2 text-app-text-muted hover:text-app-text rounded-lg hover:bg-app-surface-hover cursor-pointer transition-colors focus:outline-none min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button 
            onClick={() => handleZoom(0.8)} 
            className="p-2 text-app-text-muted hover:text-app-text rounded-lg hover:bg-app-surface-hover cursor-pointer transition-colors focus:outline-none min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button 
            onClick={resetPanAndZoom} 
            className="p-2 text-app-text-muted hover:text-app-text rounded-lg hover:bg-app-surface-hover cursor-pointer transition-colors focus:outline-none min-w-[36px] min-h-[36px] flex items-center justify-center"
            title="Reset Pan/Zoom"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Status indicator bottom left */}
        {partnerStatus && (
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-app-accent/10 border border-app-accent/20 text-app-accent rounded-xl text-[11px] sm:text-xs font-semibold shadow-lg animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-app-accent animate-ping" />
            {partnerStatus}
          </div>
        )}

        {/* Temporary partner disconnection overlay notice */}
        {partnerPlayer && partnerPlayer.connected === false && (
          <div className="absolute top-18 left-3 right-3 sm:top-20 sm:left-4 sm:right-4 z-20 flex items-center justify-center bg-amber-500/15 border border-amber-500/35 text-amber-400 py-2.5 px-4 rounded-xl text-xs font-bold shadow-lg animate-pulse gap-2 pointer-events-auto">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            Your partner ({partnerPlayer.name}) disconnected. Waiting for them to reconnect...
          </div>
        )}
      </div>

      {/* RIGHT SIDE: Interactive Painter Toolbar */}
      <div className="w-full lg:w-80 bg-app-surface border border-app-border p-4 sm:p-5 rounded-3xl flex flex-col justify-between shrink-0 h-auto lg:h-full overflow-y-auto">
        
        {/* Core Controls */}
        <div className="space-y-5 sm:space-y-6">
          
          {/* Tool selectors */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2.5">Choose Tool</h3>
            <div className="grid grid-cols-4 gap-2">
              <button
                onClick={() => setActiveTool("brush")}
                disabled={isFinishedLocal}
                className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[44px] ${
                  activeTool === "brush"
                    ? "border-app-primary bg-app-primary/10 text-app-primary shadow-md shadow-app-primary/5"
                    : "border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text disabled:opacity-50"
                }`}
                title="Paint Brush"
              >
                <Paintbrush className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                <span className="text-[10px] font-bold font-sans">Brush</span>
              </button>

              <button
                onClick={() => setActiveTool("bucket")}
                disabled={isFinishedLocal}
                className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[44px] ${
                  activeTool === "bucket"
                    ? "border-app-primary bg-app-primary/10 text-app-primary shadow-md shadow-app-primary/5"
                    : "border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text disabled:opacity-50"
                }`}
                title="Bucket Fill"
              >
                <PaintBucket className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                <span className="text-[10px] font-bold font-sans">Fill</span>
              </button>

              <button
                onClick={() => setActiveTool("eraser")}
                disabled={isFinishedLocal}
                className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[44px] ${
                  activeTool === "eraser"
                    ? "border-app-primary bg-app-primary/10 text-app-primary shadow-md shadow-app-primary/5"
                    : "border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text disabled:opacity-50"
                }`}
                title="Eraser"
              >
                <Eraser className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                <span className="text-[10px] font-bold font-sans">Eraser</span>
              </button>

              <button
                onClick={() => setActiveTool("pan")}
                className={`p-2.5 sm:p-3 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[44px] ${
                  activeTool === "pan"
                    ? "border-app-primary bg-app-primary/10 text-app-primary shadow-md shadow-app-primary/5"
                    : "border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text"
                }`}
                title="Pan Canvas"
              >
                <Hand className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                <span className="text-[10px] font-bold font-sans">Pan</span>
              </button>
            </div>
          </div>

          {/* Color Presets */}
          <div>
            <div className="flex justify-between items-center mb-2.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted font-sans">Palette</h3>
              
              {/* Custom hex indicator/picker */}
              <div className="flex items-center gap-1.5 bg-app-bg p-1 rounded-lg border border-app-border">
                <input 
                  type="color" 
                  value={brushColor} 
                  onChange={(e) => setBrushColor(e.target.value)}
                  disabled={isFinishedLocal}
                  className="w-5 h-5 border-0 rounded cursor-pointer bg-transparent disabled:opacity-50"
                />
                <span className="text-[10px] font-mono font-bold text-app-text-muted uppercase pr-1">
                  {brushColor}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {PALETTE.map((color) => {
                const isSel = brushColor.toLowerCase() === color.toLowerCase() && activeTool !== "eraser";
                return (
                  <button
                    key={color}
                    onClick={() => {
                      setBrushColor(color);
                      if (activeTool === "eraser" || activeTool === "pan") {
                        setActiveTool("brush");
                      }
                    }}
                    disabled={isFinishedLocal}
                    style={{ backgroundColor: color }}
                    className={`h-9 w-full rounded-xl cursor-pointer transition-all relative focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[36px] ${
                      isSel 
                        ? "scale-105 ring-2 ring-app-primary ring-offset-2 ring-offset-app-bg" 
                        : "hover:scale-102"
                    } disabled:opacity-50`}
                  />
                );
              })}
            </div>
          </div>

          {/* Brush Size Slider */}
          {(activeTool === "brush" || activeTool === "eraser") && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-app-text-muted font-sans">Brush Size</h3>
                <span className="text-xs font-mono font-bold text-app-primary">{brushSize}px</span>
              </div>
              <input
                type="range"
                min="3"
                max="40"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                disabled={isFinishedLocal}
                className="w-full accent-app-primary bg-app-bg h-2 rounded-lg cursor-pointer min-h-[32px]"
              />
              
              {/* Size indicator ball */}
              <div className="h-10 w-full rounded-xl bg-app-bg border border-app-border flex items-center justify-center">
                <div 
                  style={{ 
                    width: `${brushSize}px`, 
                    height: `${brushSize}px`,
                    backgroundColor: activeTool === "eraser" ? "#ffffff" : brushColor 
                  }} 
                  className={`rounded-full shadow-inner ${activeTool === "eraser" ? "border border-app-text-muted border-dashed" : ""}`}
                />
              </div>
            </div>
          )}

          {/* Canvas Operations: Undo, Clear */}
          <div className="grid grid-cols-2 gap-2.5 pt-4 border-t border-app-border">
            <button
              onClick={handleUndo}
              disabled={isFinishedLocal}
              className="py-2.5 px-3 rounded-xl border border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-app-primary/30 min-h-[44px]"
            >
              <Undo2 className="w-3.5 h-3.5" />
              Undo
            </button>
            <button
              onClick={handleClear}
              disabled={isFinishedLocal}
              className="py-2.5 px-3 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-red-500/30 min-h-[44px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear All
            </button>
          </div>
        </div>

        {/* Bottom Submission Panel */}
        <div className="pt-5 sm:pt-6 border-t border-app-border mt-5 sm:mt-6">
          <button
            onClick={handleFinish}
            disabled={isFinishedLocal}
            className={`w-full py-3.5 sm:py-4 rounded-xl font-bold transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[48px] ${
              isFinishedLocal
                ? "bg-app-surface text-app-text-muted border border-app-border cursor-not-allowed opacity-50"
                : "bg-app-primary hover:bg-app-primary-hover text-white shadow-app-primary/15"
            }`}
          >
            {isFinishedLocal ? (
              <>
                <CheckCircle className="w-5 h-5 text-emerald-400 animate-pulse" />
                Submitted! Waiting...
              </>
            ) : (
              <>
                <CheckSquare className="w-5 h-5" />
                Finish Artwork
              </>
            )}
          </button>
          
          <p className="text-[10px] text-app-text-muted text-center mt-3 leading-relaxed flex items-center justify-center gap-1">
            <AlertCircle className="w-3 h-3 text-app-text-muted opacity-80" />
            Both artists must finish to merge and reveal the final artwork.
          </p>
        </div>

      </div>
    </div>
  );
}
