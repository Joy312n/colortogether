import React, { useState, useEffect, useRef } from "react";
import { 
  Paintbrush, 
  PaintBucket, 
  Eraser, 
  Undo2, 
  Redo2,
  RotateCcw, 
  CheckSquare, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Hand,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Pipette,
  Heart,
  ChevronDown,
  ChevronUp,
  Sliders,
  Palette,
  Search
} from "lucide-react";
import { drawBrushPoints, floodFill, hexToRgb, simplifyPath } from "../utils/canvasHelpers";
import { useTheme } from "./ThemeContext";

// 12 Premium Designer Colors
const PALETTE = [
  "#F43F5E", "#EC4899", "#D946EF", "#8B5CF6", 
  "#3B82F6", "#06B6D4", "#10B981", "#84CC16", 
  "#EAB308", "#F97316", "#EF4444", "#0F172A"
];

const PRESET_PALETTES = {
  "Reds": ["#FF8A8A", "#FF5C5C", "#FF2E2E", "#D60000", "#800000"],
  "Oranges": ["#FFD08A", "#FFAE5C", "#FF8C2E", "#D66200", "#803B00"],
  "Yellows": ["#FFF48A", "#FFE95C", "#FFDE2E", "#D6B500", "#806D00"],
  "Greens": ["#B2FF8A", "#8CFF5C", "#66FF2E", "#42D600", "#278000"],
  "Teals": ["#8AFFEC", "#5CFFD9", "#2EFFC7", "#00D69F", "#00805F"],
  "Blues": ["#8AD4FF", "#5CB7FF", "#2E9AFF", "#0070D6", "#004380"],
  "Purples": ["#C08AFF", "#A15CFF", "#822EFF", "#5A00D6", "#360080"],
  "Pinks": ["#FF8AE1", "#FF5CD1", "#FF2EC1", "#D60093", "#800058"],
  "Browns": ["#D7B19D", "#C08A70", "#A66342", "#864525", "#522510"],
  "Grays": ["#F1F5F9", "#CBD5E1", "#94A3B8", "#475569", "#0F172A"],
  "Black & White": ["#FFFFFF", "#E2E8F0", "#64748B", "#1E293B", "#000000"],
  "Pastel Colors": ["#FFB7B2", "#FFDAC1", "#E2F0CB", "#B5EAD7", "#C7CEEA"],
  "Neon Colors": ["#39FF14", "#FF073A", "#0FF0FC", "#BC13FE", "#FF007F"],
  "Earth Tones": ["#2C5E3B", "#A9BA9D", "#E2D4B7", "#B87D4B", "#6E473B"],
  "Skin Tones": ["#F9D3B5", "#F3C096", "#E3A374", "#D18855", "#9B643D"]
};

// Color conversion helper for HSV / RGB representation
function hexToHsv(hex) {
  let [r, g, b] = hexToRgb(hex);
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, v = max;
  const d = max - min;
  s = max === 0 ? 0 : d / max;
  if (max === min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), v: Math.round(v * 100) };
}

function hsvToHex(h, s, v) {
  h /= 360; s /= 100; v /= 100;
  let r, g, b;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
  }
  const toHex = x => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

function rgbToHex(r, g, b) {
  const clamp = x => Math.min(255, Math.max(0, Math.round(x)));
  const toHex = x => {
    const hex = clamp(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

export default function ColoringCanvas({ 
  room, 
  playerId, 
  socket, 
  onFinishColoring 
}) {
  const { activeTheme, mode } = useTheme();
  const [activeTool, setActiveTool] = useState("brush"); // "brush" | "bucket" | "eraser" | "pan" | "eyedropper"
  const [brushColor, setBrushColor] = useState("#EC4899");
  const [brushSize, setBrushSize] = useState(12);
  const [brushType, setBrushType] = useState("hard"); // "hard" | "soft" | "marker" | "pencil" | "airbrush"
  const [brushOpacity, setBrushOpacity] = useState(100); // 0-100
  const [brushSoftness, setBrushSoftness] = useState(0); // 0-100

  // Collapsible state controls - "brushSettings" | "colorLibrary" | "advancedPicker" | null
  // All accordion sections collapsed by default except the currently active one (initialized to null)
  const [activeAccordion, setActiveAccordion] = useState(null);
  const [paletteSearchQuery, setPaletteSearchQuery] = useState("");

  const toggleAccordion = (section) => {
    setActiveAccordion(prev => prev === section ? null : section);
  };

  // Recent and favorite colors
  const [recentColors, setRecentColors] = useState(() => {
    try {
      const saved = localStorage.getItem("recent_colors");
      return saved ? JSON.parse(saved) : ["#F43F5E", "#EC4899", "#D946EF", "#8B5CF6", "#3B82F6", "#06B6D4", "#10B981", "#84CC16", "#EAB308", "#F97316", "#EF4444", "#0F172A"].slice(0, 12);
    } catch {
      return ["#F43F5E", "#EC4899", "#D946EF", "#8B5CF6", "#3B82F6", "#06B6D4", "#10B981", "#84CC16", "#EAB308", "#F97316", "#EF4444", "#0F172A"].slice(0, 12);
    }
  });

  const [favoriteColors, setFavoriteColors] = useState(() => {
    try {
      const saved = localStorage.getItem("favorite_colors");
      return saved ? JSON.parse(saved) : ["#FFB7B2", "#FFDAC1", "#E2F0CB", "#B5EAD7", "#C7CEEA"];
    } catch {
      return ["#FFB7B2", "#FFDAC1", "#E2F0CB", "#B5EAD7", "#C7CEEA"];
    }
  });

  const addToRecentColors = (color) => {
    if (!color) return;
    setRecentColors(prev => {
      const filtered = prev.filter(c => c.toLowerCase() !== color.toLowerCase());
      const next = [color, ...filtered].slice(0, 12);
      try {
        localStorage.setItem("recent_colors", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const toggleFavoriteColor = (color) => {
    if (!color) return;
    setFavoriteColors(prev => {
      let next;
      if (prev.some(c => c.toLowerCase() === color.toLowerCase())) {
        next = prev.filter(c => c.toLowerCase() !== color.toLowerCase());
      } else {
        next = [...prev, color];
      }
      try {
        localStorage.setItem("favorite_colors", JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

  const [hexInputText, setHexInputText] = useState(brushColor);
  useEffect(() => {
    setHexInputText(brushColor);
  }, [brushColor]);

  const [activePaletteGroup, setActivePaletteGroup] = useState("Pastel Colors");

  const handleBrushTypeChange = (type) => {
    setBrushType(type);
    if (type === "hard") {
      setBrushSoftness(0);
      setBrushOpacity(100);
    } else if (type === "soft") {
      setBrushSoftness(75);
      setBrushOpacity(100);
    } else if (type === "marker") {
      setBrushSoftness(0);
      setBrushOpacity(50);
    } else if (type === "pencil") {
      setBrushSoftness(15);
      setBrushOpacity(35);
    } else if (type === "airbrush") {
      setBrushSoftness(100);
      setBrushOpacity(15);
    }
  };

  const handleColorSelect = (color) => {
    setBrushColor(color);
    addToRecentColors(color);
    if (activeTool === "eraser" || activeTool === "pan" || activeTool === "eyedropper") {
      setActiveTool("brush");
    }
  };

  const handleHsvChange = (channel, value) => {
    const currentHsv = hexToHsv(brushColor);
    const newHsv = { ...currentHsv, [channel]: value };
    const newHex = hsvToHex(newHsv.h, newHsv.s, newHsv.v);
    handleColorSelect(newHex);
  };

  const handleRgbChange = (channel, value) => {
    let [r, g, b] = hexToRgb(brushColor);
    const val = Math.min(255, Math.max(0, parseInt(value, 10) || 0));
    if (channel === 'r') r = val;
    else if (channel === 'g') g = val;
    else if (channel === 'b') b = val;
    const newHex = rgbToHex(r, g, b);
    handleColorSelect(newHex);
  };

  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  const triggerNativeEyedropper = async () => {
    if (!hasEyeDropper) {
      setActiveTool("eyedropper");
      return;
    }
    try {
      const eyeDropper = new window.EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        handleColorSelect(result.sRGBHex);
      }
    } catch (err) {
      console.log("Eyedropper closed or failed", err);
    }
  };

  const [zoom, setZoom] = useState(1.0);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [partnerStatus, setPartnerStatus] = useState("");
  const [isFinishedLocal, setIsFinishedLocal] = useState(false);

  // Advanced Canvas Interaction variables
  const workspaceRef = useRef(null);
  const activePointersRef = useRef(new Map());
  const initialPinchDistanceRef = useRef(0);
  const initialPinchZoomRef = useRef(1);
  const initialPinchMidpointRef = useRef({ x: 0, y: 0 });
  const initialPanOffsetRef = useRef({ x: 0, y: 0 });
  const isMultiTouchingRef = useRef(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isRightClickPanning, setIsRightClickPanning] = useState(false);

  // iOS-specific Touch Gesture State Machine refs
  const iosStateRef = useRef("IDLE"); // "IDLE" | "DRAWING" | "GESTURING"
  const iosActiveTouchesRef = useRef(new Map()); // Key: touch.identifier -> { clientX, clientY }
  const iosInitialDistanceRef = useRef(0);
  const iosInitialZoomRef = useRef(1);
  const iosInitialMidpointRef = useRef({ x: 0, y: 0 });
  const iosInitialPanOffsetRef = useRef({ x: 0, y: 0 });
  const iosNeedsResetRef = useRef(false);

  const paintCanvasRef = useRef(null); // Offline drawing canvas
  const paintWithLiveCanvasRef = useRef(null); // Offline drawing canvas with live segments merged
  const activeLiveStrokesRef = useRef({}); // Active live strokes per player
  const lastActionCountRef = useRef(0); // For keeping track of previous action count
  const outlineCanvasRef = useRef(null); // Outline reference canvas
  const visibleCanvasRef = useRef(null); // On-screen composite canvas
  const outlineImageRef = useRef(null); // Cached Image element for outlines
  const isDrawingRef = useRef(false);
  const currentStrokePointsRef = useRef([]); // [x1, y1, x2, y2, ...]
  const livePaintBufferRef = useRef([]); // For batching paint-live segments
  const localActionIdRef = useRef(0); // For unique local action IDs
  const lastCursorEmitRef = useRef(0); // For throttling cursor position emissions
  const [partnerCursor, setPartnerCursor] = useState(null); // { x, y, trail: [{x, y, id}] }

  const [dimensions, setDimensions] = useState({ width: 800, height: 800 });
  const [loadedImage, setLoadedImage] = useState(null);
  const { width, height } = dimensions;

  // Identify Player slots
  const p1 = room?.players[0];
  const p2 = room?.players[1];
  const isP1 = p1?.id === playerId;
  const myPlayer = isP1 ? p1 : p2;
  const partnerPlayer = isP1 ? p2 : p1;

  const hasMyActions = room?.actions?.some(act => act.playerId === playerId) || false;
  const myRedoCount = room?.redoCounts?.[playerId] || 0;

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

    // Clean up active live strokes for players who have committed actions!
    const prevCount = lastActionCountRef.current;
    const currentActions = room?.actions || [];
    if (currentActions.length > prevCount) {
      const addedActions = currentActions.slice(prevCount);
      addedActions.forEach(action => {
        if (action.playerId) {
          delete activeLiveStrokesRef.current[action.playerId];
        }
      });
    }
    lastActionCountRef.current = currentActions.length;

    rebuildCanvasFromHistory();
  }, [loadedImage, width, height, room?.actions]);

  // Handle incoming Socket events for drawing synchronization
  useEffect(() => {
    if (!socket) return;

    // Receive live drawing segments (low latency brush motion)
    const handleLivePaint = ({ playerId: senderId, segment, data }) => {
      if (senderId === playerId) return;
      
      // In split mode, don't show the other player's painting live
      if (isSplitMode) return;

      const segments = data || (segment ? [segment] : []);
      if (segments.length === 0) return;

      if (!activeLiveStrokesRef.current[senderId]) {
        const firstSeg = segments[0];
        activeLiveStrokesRef.current[senderId] = {
          points: [firstSeg.x0, firstSeg.y0],
          color: firstSeg.color,
          size: firstSeg.size,
          isEraser: firstSeg.isEraser,
          brushType: firstSeg.brushType || "hard",
          opacity: firstSeg.opacity !== undefined ? firstSeg.opacity : 100,
          softness: firstSeg.softness !== undefined ? firstSeg.softness : 0
        };
      }

      segments.forEach(seg => {
        activeLiveStrokesRef.current[senderId].points.push(seg.x1, seg.y1);
      });

      redrawComposite();
    };

    // Receive Partner Finished status
    const handlePartnerFinished = ({ playerId: finishedId, name }) => {
      if (finishedId !== playerId) {
        setPartnerStatus(`${name} is finished! Waiting for you...`);
      }
    };

    // Receive other player's cursor position
    const handleCursorMoved = (data) => {
      if (data.playerId === playerId) return;
      setPartnerCursor(prev => {
        const now = Date.now();
        let currentTrail = prev ? prev.trail : [];
        if (prev) {
          // Append previous point to trail before moving
          currentTrail = [...currentTrail, { x: prev.x, y: prev.y, id: now }];
        }
        if (currentTrail.length > 8) {
          currentTrail = currentTrail.slice(-8);
        }
        return {
          x: data.x,
          y: data.y,
          trail: currentTrail,
          lastUpdate: now
        };
      });
    };

    // Receive other player's cursor leave
    const handleCursorLeft = (data) => {
      if (data.playerId === playerId) return;
      setPartnerCursor(null);
    };

    socket.on("paint-live-received", handleLivePaint);
    socket.on("player-finished", handlePartnerFinished);
    socket.on("cursor-moved", handleCursorMoved);
    socket.on("cursor-left", handleCursorLeft);

    return () => {
      socket.off("paint-live-received", handleLivePaint);
      socket.off("player-finished", handlePartnerFinished);
      socket.off("cursor-moved", handleCursorMoved);
      socket.off("cursor-left", handleCursorLeft);
    };
  }, [socket, playerId, room?.mode]);

  // Periodic flusher for batched real-time paint segments (30 FPS)
  useEffect(() => {
    if (!socket || !room) return;

    const intervalId = setInterval(() => {
      const buffer = livePaintBufferRef.current;
      if (buffer.length === 0) return;

      socket.emit("paint-live", {
        roomCode: room.roomCode,
        playerId,
        data: buffer
      });

      livePaintBufferRef.current = [];
    }, 33); // ~30 FPS

    return () => clearInterval(intervalId);
  }, [socket, room, playerId]);

  // Ensure the composite canvas is redrawn when theme or mode changes
  useEffect(() => {
    redrawComposite();
  }, [activeTheme, mode, width, height]);

  // Redraws the composite on-screen canvas (Colors Layer + Outlines Layer multiplied on top)
  const redrawComposite = () => {
    const visibleCanvas = visibleCanvasRef.current;
    const paintCanvas = paintCanvasRef.current;
    const paintWithLiveCanvas = paintWithLiveCanvasRef.current;
    const outlineCanvas = outlineCanvasRef.current;

    if (!visibleCanvas || !paintCanvas || !paintWithLiveCanvas || !outlineCanvas) return;

    const ctx = visibleCanvas.getContext("2d");
    
    // 1. Prepare paintWithLiveCanvas with committed actions + active live strokes
    const plctx = paintWithLiveCanvas.getContext("2d");
    plctx.clearRect(0, 0, width, height);
    
    // Draw committed actions
    plctx.drawImage(paintCanvas, 0, 0);

    // Draw active live strokes
    Object.keys(activeLiveStrokesRef.current).forEach(pId => {
      const stroke = activeLiveStrokesRef.current[pId];
      if (!stroke || stroke.points.length < 2) return;

      plctx.save();
      if (isSplitMode) {
        const playerIsP1 = room?.players[0]?.id === pId;
        const xMin = playerIsP1 ? 0 : width / 2;
        const xMax = playerIsP1 ? width / 2 : width;
        plctx.beginPath();
        plctx.rect(xMin, 0, xMax - xMin, height);
        plctx.clip();
      }

      drawBrushPoints(
        plctx,
        stroke.points,
        stroke.color,
        stroke.size,
        stroke.isEraser,
        stroke.brushType,
        stroke.opacity,
        stroke.softness
      );
      plctx.restore();
    });

    // 2. Fill with solid white background on the visible composite canvas
    // This is critical so that 'multiply' blend mode has an opaque surface to blend against,
    // otherwise the black outlines multiply with transparent pixels and become transparent/invisible.
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);

    // 3. Draw combined paint layer onto the visible composite canvas
    ctx.drawImage(paintWithLiveCanvas, 0, 0);

    // 4. Draw original line art with "multiply" composition (so black outlines stay on top)
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
        drawBrushPoints(pctx, action.points, action.color, action.size, action.type === "eraser", action.brushType, action.opacity, action.softness);
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

  // Keep panOffset within bounds to prevent losing the canvas
  const clampPanOffset = (x, y, currentZoom, workspaceRect) => {
    if (!workspaceRect) return { x, y };
    const visibleCanvas = visibleCanvasRef.current;
    if (!visibleCanvas) return { x, y };

    const canvasW = visibleCanvas.clientWidth || 650;
    const canvasH = visibleCanvas.clientHeight || 650;

    const scaledW = canvasW * currentZoom;
    const scaledH = canvasH * currentZoom;

    // Provide soft boundaries: at least 60px of the canvas must remain in view inside the workspace
    const limitX = Math.max(100, workspaceRect.width / 2 + scaledW / 2 - 60);
    const limitY = Math.max(100, workspaceRect.height / 2 + scaledH / 2 - 60);

    return {
      x: Math.min(limitX, Math.max(-limitX, x)),
      y: Math.min(limitY, Math.max(-limitY, y))
    };
  };

  // Listen for Spacebar for temporary Pan mode
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space") {
        if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") {
          return;
        }
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };

    const handleBlur = () => {
      setIsSpacePressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  // Listen for Mouse Wheel Zoom and prevent touch scrolling over the canvas container
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const handleWheel = (e) => {
      e.preventDefault();
      
      const zoomIntensity = e.ctrlKey ? 0.04 : 0.08;
      const factor = e.deltaY < 0 ? (1 + zoomIntensity) : (1 - zoomIntensity);

      const clientX = e.clientX;
      const clientY = e.clientY;

      setZoom(currentZoom => {
        const newZoom = Math.min(16.0, Math.max(0.1, currentZoom * factor));
        
        setPanOffset(currentPan => {
          const workspaceRect = workspace.getBoundingClientRect();
          const workspaceCenterX = workspaceRect.left + workspaceRect.width / 2;
          const workspaceCenterY = workspaceRect.top + workspaceRect.height / 2;
          const relativeX = clientX - workspaceCenterX;
          const relativeY = clientY - workspaceCenterY;
          
          const f = 1 - newZoom / currentZoom;
          const nextX = currentPan.x + (relativeX - currentPan.x) * f;
          const nextY = currentPan.y + (relativeY - currentPan.y) * f;
          
          return clampPanOffset(nextX, nextY, newZoom, workspaceRect);
        });

        return newZoom;
      });
    };

    // Explicitly prevent touchmove from moving the parent page or pull-to-refresh
    const handleTouchMove = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }
    };

    workspace.addEventListener("wheel", handleWheel, { passive: false });
    workspace.addEventListener("touchmove", handleTouchMove, { passive: false });

    return () => {
      workspace.removeEventListener("wheel", handleWheel);
      workspace.removeEventListener("touchmove", handleTouchMove);
    };
  }, [zoom]);

  // Pointer Down handler
  const handlePointerDown = (e) => {
    const isIOSWebKit = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
    if (isIOSWebKit) return;

    // Acquire pointer capture to ensure we receive moves/up even when leaving window
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch (err) {}

    // Store active pointer location
    activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

    // 1. Two-finger Pinch gesture start
    if (activePointersRef.current.size >= 2) {
      isMultiTouchingRef.current = true;
      
      // Cancel active drawing stroke instantly to avoid messy touch-down lines
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        currentStrokePointsRef.current = [];
        delete activeLiveStrokesRef.current[playerId];
        rebuildCanvasFromHistory();
      }

      setIsPanning(true);

      const pointers = Array.from(activePointersRef.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];
      
      const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      initialPinchDistanceRef.current = dist || 1;
      initialPinchZoomRef.current = zoom;
      
      const midX = (p1.clientX + p2.clientX) / 2;
      const midY = (p1.clientY + p2.clientY) / 2;
      initialPinchMidpointRef.current = { x: midX, y: midY };
      initialPanOffsetRef.current = { ...panOffset };
      return;
    }

    // 2. Space pan, Middle pan, Right click pan, or Active Pan tool
    const isRightClick = e.button === 2;
    const isMiddleClick = e.button === 1;
    const isPanMode = activeTool === "pan" || isSpacePressed || isRightClick || isMiddleClick;

    if (isPanMode) {
      setIsPanning(true);
      if (isRightClick) {
        setIsRightClickPanning(true);
      }
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
      return;
    }

    // 3. Eyedropper Color Pick
    if (activeTool === "eyedropper") {
      const paintCanvas = paintCanvasRef.current;
      if (paintCanvas) {
        const pctx = paintCanvas.getContext("2d");
        const { x, y } = getCanvasCoords(e);
        try {
          const pixel = pctx.getImageData(x, y, 1, 1).data;
          if (pixel[3] > 0) {
            const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
            handleColorSelect(hex);
          } else {
            handleColorSelect("#FFFFFF");
          }
        } catch (err) {
          console.error("Eyedropper failed", err);
        }
      }
      return;
    }

    if (isFinishedLocal) return;

    // 4. Normal Draw Touch Down
    const { x, y } = getCanvasCoords(e);

    // Restrict drawing to own side in split mode
    if (isSplitMode && (x < myXMin || x > myXMax)) {
      return;
    }

    if (activeTool === "brush" || activeTool === "eraser") {
      isDrawingRef.current = true;
      currentStrokePointsRef.current = [x, y];

      activeLiveStrokesRef.current[playerId] = {
        points: [x, y],
        color: brushColor,
        size: brushSize,
        isEraser: activeTool === "eraser",
        brushType,
        opacity: brushOpacity,
        softness: brushSoftness
      };

      redrawComposite();

      // Emit live starting point
      socket.emit("paint-live", {
        roomCode: room.roomCode,
        playerId,
        segment: {
          x0: x, y0: y, x1: x, y1: y,
          color: brushColor,
          size: brushSize,
          isEraser: activeTool === "eraser",
          brushType,
          opacity: brushOpacity,
          softness: brushSoftness
        }
      });
    } else if (activeTool === "bucket") {
      const paintCanvas = paintCanvasRef.current;
      const outlineCanvas = outlineCanvasRef.current;
      if (!paintCanvas || !outlineCanvas) return;

      const octx = outlineCanvas.getContext("2d");
      const outlineImageData = octx.getImageData(0, 0, width, height);

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

        const actionId = `${playerId}-${Date.now()}-${localActionIdRef.current++}`;
        const newAction = {
          id: actionId,
          type: "bucket",
          x,
          y,
          color: brushColor
        };
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
    const isIOSWebKit = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
    if (isIOSWebKit) return;

    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
    }

    // 1. Two-finger pinch zooming & panning
    if (activePointersRef.current.size >= 2) {
      const pointers = Array.from(activePointersRef.current.values());
      const p1 = pointers[0];
      const p2 = pointers[1];
      
      const dist = Math.hypot(p1.clientX - p2.clientX, p1.clientY - p2.clientY);
      const scaleFactor = dist / (initialPinchDistanceRef.current || 1);
      const targetZoom = initialPinchZoomRef.current * scaleFactor;
      const newZoom = Math.min(16.0, Math.max(0.1, targetZoom));

      // Compute gesture center midpoint
      const midX = (p1.clientX + p2.clientX) / 2;
      const midY = (p1.clientY + p2.clientY) / 2;

      const workspace = workspaceRef.current;
      if (workspace) {
        const workspaceRect = workspace.getBoundingClientRect();
        const workspaceCenterX = workspaceRect.left + workspaceRect.width / 2;
        const workspaceCenterY = workspaceRect.top + workspaceRect.height / 2;
        
        // Offset relative to center of workspace
        const relativeX = initialPinchMidpointRef.current.x - workspaceCenterX;
        const relativeY = initialPinchMidpointRef.current.y - workspaceCenterY;
        const f = 1 - newZoom / initialPinchZoomRef.current;
        
        const zoomPanX = initialPanOffsetRef.current.x + (relativeX - initialPanOffsetRef.current.x) * f;
        const zoomPanY = initialPanOffsetRef.current.y + (relativeY - initialPanOffsetRef.current.y) * f;

        // Midpoint translation displacement
        const translationX = midX - initialPinchMidpointRef.current.x;
        const translationY = midY - initialPinchMidpointRef.current.y;

        const nextX = zoomPanX + translationX;
        const nextY = zoomPanY + translationY;

        setPanOffset(clampPanOffset(nextX, nextY, newZoom, workspaceRect));
      }

      setZoom(newZoom);
      return;
    }

    // 2. Drag Panning
    if (isPanning) {
      const nextX = e.clientX - panStart.x;
      const nextY = e.clientY - panStart.y;
      
      const workspace = workspaceRef.current;
      if (workspace) {
        const workspaceRect = workspace.getBoundingClientRect();
        setPanOffset(clampPanOffset(nextX, nextY, zoom, workspaceRect));
      }
      return;
    }

    // 3. Emit cursor moves to remote players
    if (!isFinishedLocal && socket && room && activePointersRef.current.size === 1 && !isMultiTouchingRef.current) {
      const { x, y } = getCanvasCoords(e);
      if (x >= 0 && x <= width && y >= 0 && y <= height) {
        const now = Date.now();
        if (now - lastCursorEmitRef.current > 40) {
          socket.emit("cursor-move", {
            roomCode: room.roomCode,
            x,
            y
          });
          lastCursorEmitRef.current = now;
        }
      } else {
        socket.emit("cursor-leave", { roomCode: room.roomCode });
      }
    }

    // 4. Normal Drawing Pointer Move
    if (!isDrawingRef.current || isFinishedLocal || activePointersRef.current.size !== 1 || isMultiTouchingRef.current) return;

    const { x, y } = getCanvasCoords(e);

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

    if (activeLiveStrokesRef.current[playerId]) {
      activeLiveStrokesRef.current[playerId].points.push(boundX, y);
    }

    redrawComposite();

    livePaintBufferRef.current.push({
      x0, y0, x1: boundX, y1: y,
      color: brushColor,
      size: brushSize,
      isEraser: activeTool === "eraser",
      brushType,
      opacity: brushOpacity,
      softness: brushSoftness
    });
  };

  // Pointer Up handler
  const handlePointerUp = (e) => {
    const isIOSWebKit = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
    if (isIOSWebKit) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (err) {}

    activePointersRef.current.delete(e.pointerId);

    // End panning or handle multi-touch release transitions
    if (activePointersRef.current.size === 0) {
      isMultiTouchingRef.current = false;
      setIsPanning(false);
      setIsRightClickPanning(false);
    } else if (activePointersRef.current.size === 1) {
      const remainingPointer = Array.from(activePointersRef.current.values())[0];
      setPanStart({ x: remainingPointer.clientX - panOffset.x, y: remainingPointer.clientY - panOffset.y });
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    if (currentStrokePointsRef.current.length >= 2) {
      const simplified = simplifyPath(currentStrokePointsRef.current, 1.2);
      const actionId = `${playerId}-${Date.now()}-${localActionIdRef.current++}`;
      const newAction = {
        id: actionId,
        type: activeTool === "eraser" ? "eraser" : "brush",
        points: simplified,
        color: activeTool === "eraser" ? null : brushColor,
        size: brushSize,
        brushType: activeTool === "eraser" ? "hard" : brushType,
        opacity: activeTool === "eraser" ? 100 : brushOpacity,
        softness: activeTool === "eraser" ? 0 : brushSoftness
      };

      room.actions.push({ ...newAction, playerId });

      socket.emit("draw-action", {
        roomCode: room.roomCode,
        action: newAction
      });
    }

    currentStrokePointsRef.current = [];
    delete activeLiveStrokesRef.current[playerId];
    rebuildCanvasFromHistory();
  };

  // Pointer Leave handler
  const handlePointerLeave = (e) => {
    const isIOSWebKit = typeof navigator !== 'undefined' && (
      /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
    if (isIOSWebKit) return;

    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size === 0) {
      isMultiTouchingRef.current = false;
      setIsRightClickPanning(false);
      
      if (isDrawingRef.current) {
        handlePointerUp(e);
      }
      
      if (!isFinishedLocal && socket && room) {
        socket.emit("cursor-leave", { roomCode: room.roomCode });
      }
    }
  };

  // Dedicated iOS Touch Event fallback mapping for WebKit to prevent scrolling, bouncing, zooming, and double-tap zoom
  useEffect(() => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    const isIOSWebKit = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (!isIOSWebKit) return;

    const handleTouchStart = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }

      // Update active touches
      for (let i = 0; i < e.targetTouches.length; i++) {
        const touch = e.targetTouches[i];
        iosActiveTouchesRef.current.set(touch.identifier, { clientX: touch.clientX, clientY: touch.clientY });
      }

      const numFingers = e.targetTouches.length;

      if (numFingers === 1) {
        if (iosNeedsResetRef.current) {
          return;
        }

        if (iosStateRef.current === "IDLE") {
          iosStateRef.current = "DRAWING";

          const touch = e.targetTouches[0];
          const { x, y } = getCanvasCoords({ clientX: touch.clientX, clientY: touch.clientY });

          if (!isFinishedLocal) {
            if (activeTool === "eyedropper") {
              const paintCanvas = paintCanvasRef.current;
              if (paintCanvas) {
                const pctx = paintCanvas.getContext("2d");
                try {
                  const pixel = pctx.getImageData(x, y, 1, 1).data;
                  if (pixel[3] > 0) {
                    const hex = rgbToHex(pixel[0], pixel[1], pixel[2]);
                    handleColorSelect(hex);
                  } else {
                    handleColorSelect("#FFFFFF");
                  }
                } catch (err) {}
              }
            } else if (activeTool === "brush" || activeTool === "eraser") {
              isDrawingRef.current = true;
              currentStrokePointsRef.current = [x, y];

              activeLiveStrokesRef.current[playerId] = {
                points: [x, y],
                color: brushColor,
                size: brushSize,
                isEraser: activeTool === "eraser",
                brushType,
                opacity: brushOpacity,
                softness: brushSoftness
              };

              redrawComposite();

              livePaintBufferRef.current.push({
                x0: x, y0: y, x1: x, y1: y,
                color: brushColor,
                size: brushSize,
                isEraser: activeTool === "eraser",
                brushType,
                opacity: brushOpacity,
                softness: brushSoftness
              });
            } else if (activeTool === "bucket") {
              const paintCanvas = paintCanvasRef.current;
              const outlineCanvas = outlineCanvasRef.current;
              if (paintCanvas && outlineCanvas) {
                const octx = outlineCanvas.getContext("2d");
                const outlineImageData = octx.getImageData(0, 0, width, height);

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

                  const actionId = `${playerId}-${Date.now()}-${localActionIdRef.current++}`;
                  const newAction = {
                    id: actionId,
                    type: "bucket",
                    x,
                    y,
                    color: brushColor
                  };
                  room.actions.push({ ...newAction, playerId });

                  socket.emit("draw-action", {
                    roomCode: room.roomCode,
                    action: newAction
                  });
                }
              }
            }
          }
        }
      } else if (numFingers >= 2) {
        // Multi-touch gestures started. Stop drawing!
        if (iosStateRef.current === "DRAWING") {
          if (isDrawingRef.current) {
            isDrawingRef.current = false;
            currentStrokePointsRef.current = [];
            delete activeLiveStrokesRef.current[playerId];
            rebuildCanvasFromHistory();
          }
        }

        iosStateRef.current = "GESTURING";
        iosNeedsResetRef.current = true;

        setIsPanning(true);

        const touch1 = e.targetTouches[0];
        const touch2 = e.targetTouches[1];

        const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        iosInitialDistanceRef.current = dist || 1;
        iosInitialZoomRef.current = zoom;

        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;
        iosInitialMidpointRef.current = { x: midX, y: midY };
        iosInitialPanOffsetRef.current = { ...panOffset };
      }
    };

    const handleTouchMove = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }

      // Update active touches
      for (let i = 0; i < e.targetTouches.length; i++) {
        const touch = e.targetTouches[i];
        iosActiveTouchesRef.current.set(touch.identifier, { clientX: touch.clientX, clientY: touch.clientY });
      }

      if (iosStateRef.current === "DRAWING") {
        if (!isDrawingRef.current || isFinishedLocal || e.targetTouches.length !== 1) return;

        const touch = e.targetTouches[0];
        const { x, y } = getCanvasCoords({ clientX: touch.clientX, clientY: touch.clientY });

        let boundX = x;
        if (isSplitMode) {
          if (isP1) {
            boundX = Math.min(width / 2 - 2, Math.max(0, x));
          } else {
            boundX = Math.min(width, Math.max(width / 2 + 2, x));
          }
        }

        const points = currentStrokePointsRef.current;
        if (points.length < 2) return;
        const x0 = points[points.length - 2];
        const y0 = points[points.length - 1];

        points.push(boundX, y);

        if (activeLiveStrokesRef.current[playerId]) {
          activeLiveStrokesRef.current[playerId].points.push(boundX, y);
        }

        redrawComposite();

        livePaintBufferRef.current.push({
          x0, y0, x1: boundX, y1: y,
          color: brushColor,
          size: brushSize,
          isEraser: activeTool === "eraser",
          brushType,
          opacity: brushOpacity,
          softness: brushSoftness
        });

        // Emit cursor moves
        if (socket && room) {
          const now = Date.now();
          if (now - lastCursorEmitRef.current > 40) {
            socket.emit("cursor-move", {
              roomCode: room.roomCode,
              x,
              y
            });
            lastCursorEmitRef.current = now;
          }
        }
      } else if (iosStateRef.current === "GESTURING") {
        if (e.targetTouches.length < 2) return;

        const touch1 = e.targetTouches[0];
        const touch2 = e.targetTouches[1];

        const dist = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
        const scaleFactor = dist / (iosInitialDistanceRef.current || 1);
        const targetZoom = iosInitialZoomRef.current * scaleFactor;
        const newZoom = Math.min(16.0, Math.max(0.1, targetZoom));

        const midX = (touch1.clientX + touch2.clientX) / 2;
        const midY = (touch1.clientY + touch2.clientY) / 2;

        const workspace = workspaceRef.current;
        if (workspace) {
          const workspaceRect = workspace.getBoundingClientRect();
          const workspaceCenterX = workspaceRect.left + workspaceRect.width / 2;
          const workspaceCenterY = workspaceRect.top + workspaceRect.height / 2;

          const relativeX = iosInitialMidpointRef.current.x - workspaceCenterX;
          const relativeY = iosInitialMidpointRef.current.y - workspaceCenterY;
          const f = 1 - newZoom / iosInitialZoomRef.current;

          const zoomPanX = iosInitialPanOffsetRef.current.x + (relativeX - iosInitialPanOffsetRef.current.x) * f;
          const zoomPanY = iosInitialPanOffsetRef.current.y + (relativeY - iosInitialPanOffsetRef.current.y) * f;

          const translationX = midX - iosInitialMidpointRef.current.x;
          const translationY = midY - iosInitialMidpointRef.current.y;

          const nextX = zoomPanX + translationX;
          const nextY = zoomPanY + translationY;

          setPanOffset(clampPanOffset(nextX, nextY, newZoom, workspaceRect));
        }

        setZoom(newZoom);
      }
    };

    const handleTouchEnd = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }

      // Remove lifted touches from active touches
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        iosActiveTouchesRef.current.delete(touch.identifier);
      }

      if (e.targetTouches.length === 0) {
        if (iosStateRef.current === "DRAWING") {
          if (isDrawingRef.current) {
            isDrawingRef.current = false;
            if (currentStrokePointsRef.current.length >= 2) {
              const simplified = simplifyPath(currentStrokePointsRef.current, 1.2);
              const actionId = `${playerId}-${Date.now()}-${localActionIdRef.current++}`;
              const newAction = {
                id: actionId,
                type: activeTool === "eraser" ? "eraser" : "brush",
                points: simplified,
                color: activeTool === "eraser" ? null : brushColor,
                size: brushSize,
                brushType: activeTool === "eraser" ? "hard" : brushType,
                opacity: activeTool === "eraser" ? 100 : brushOpacity,
                softness: activeTool === "eraser" ? 0 : brushSoftness
              };

              room.actions.push({ ...newAction, playerId });

              socket.emit("draw-action", {
                roomCode: room.roomCode,
                action: newAction
              });
            }
            currentStrokePointsRef.current = [];
            delete activeLiveStrokesRef.current[playerId];
            rebuildCanvasFromHistory();
          }
        } else if (iosStateRef.current === "GESTURING") {
          setIsPanning(false);
        }

        iosStateRef.current = "IDLE";
        iosNeedsResetRef.current = false;
      } else {
        if (iosStateRef.current === "GESTURING") {
          if (e.targetTouches.length < 2) {
            setIsPanning(false);
          }
        }
      }
    };

    const handleTouchCancel = (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        iosActiveTouchesRef.current.delete(touch.identifier);
      }

      if (e.targetTouches.length === 0) {
        if (iosStateRef.current === "DRAWING") {
          isDrawingRef.current = false;
          currentStrokePointsRef.current = [];
          delete activeLiveStrokesRef.current[playerId];
          rebuildCanvasFromHistory();
        } else if (iosStateRef.current === "GESTURING") {
          setIsPanning(false);
        }
        iosStateRef.current = "IDLE";
        iosNeedsResetRef.current = false;
      }
    };

    workspace.addEventListener("touchstart", handleTouchStart, { passive: false });
    workspace.addEventListener("touchmove", handleTouchMove, { passive: false });
    workspace.addEventListener("touchend", handleTouchEnd, { passive: false });
    workspace.addEventListener("touchcancel", handleTouchCancel, { passive: false });

    return () => {
      workspace.removeEventListener("touchstart", handleTouchStart);
      workspace.removeEventListener("touchmove", handleTouchMove);
      workspace.removeEventListener("touchend", handleTouchEnd);
      workspace.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [
    activeTool,
    isSpacePressed,
    isFinishedLocal,
    brushColor,
    brushSize,
    brushType,
    brushOpacity,
    brushSoftness,
    zoom,
    panOffset,
    isPanning,
    panStart,
    room,
    playerId,
    socket,
    dimensions,
    loadedImage,
    isSplitMode,
  ]);


  // Undo triggers
  const handleUndo = () => {
    if (isFinishedLocal) return;
    socket.emit("undo-action", { roomCode: room.roomCode });
  };

  // Redo triggers
  const handleRedo = () => {
    if (isFinishedLocal) return;
    socket.emit("redo-action", { roomCode: room.roomCode });
  };

  // Clear Personal Changes
  const handleClear = () => {
    if (isFinishedLocal) return;
    if (confirm("Are you sure you want to clear all your colored changes on this canvas?")) {
      socket.emit("clear-canvas", { roomCode: room.roomCode });
    }
  };

  // Zoom Operations
  const handleZoom = (factor) => {
    setZoom(currentZoom => {
      const newZoom = Math.min(16.0, Math.max(0.1, currentZoom * factor));
      // Centered on workspace center
      const workspace = workspaceRef.current;
      if (workspace) {
        const workspaceRect = workspace.getBoundingClientRect();
        const relativeX = 0;
        const relativeY = 0;
        const f = 1 - newZoom / currentZoom;
        
        setPanOffset(currentPan => {
          const nextX = currentPan.x + (relativeX - currentPan.x) * f;
          const nextY = currentPan.y + (relativeY - currentPan.y) * f;
          return clampPanOffset(nextX, nextY, newZoom, workspaceRect);
        });
      }
      return newZoom;
    });
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
        <canvas ref={paintWithLiveCanvasRef} width={width} height={height} className="hidden" />
        <canvas ref={outlineCanvasRef} width={width} height={height} className="hidden" />

        {/* Outer Workspace Grid/Pan board */}
        <div 
          ref={workspaceRef}
          className={`absolute inset-0 overflow-hidden flex items-center justify-center ios-canvas-container ${
            activeTool === "pan" || isSpacePressed || isRightClickPanning
              ? (isPanning ? "cursor-grabbing" : "cursor-grab")
              : "cursor-crosshair"
          }`}
          style={{ touchAction: "none" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
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
              className="block select-none ios-canvas-container"
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

            {/* Other Player Cursor & Trailing Effect */}
            {partnerCursor && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-30">
                {/* Render trailing dots with decreasing opacity */}
                {partnerCursor.trail.map((pt, idx) => {
                  const opacity = ((idx + 1) / (partnerCursor.trail.length + 1)) * 0.45;
                  const scale = ((idx + 1) / (partnerCursor.trail.length + 1)) * 0.9 + 0.1;
                  return (
                    <div
                      key={pt.id + "-" + idx}
                      style={{
                        left: `${(pt.x / width) * 100}%`,
                        top: `${(pt.y / height) * 100}%`,
                        backgroundColor: partnerPlayer?.color || "#3B82F6",
                        opacity: opacity,
                        transform: `translate(-50%, -50%) scale(${scale})`,
                        boxShadow: `0 0 4px ${partnerPlayer?.color || "#3B82F6"}`,
                      }}
                      className="absolute w-3 h-3 rounded-full pointer-events-none transition-all duration-100 ease-out"
                    />
                  );
                })}

                {/* Main Cursor Marker */}
                <div
                  style={{
                    left: `${(partnerCursor.x / width) * 100}%`,
                    top: `${(partnerCursor.y / height) * 100}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                  className="absolute pointer-events-none z-40"
                >
                  {/* Outer glowing ring */}
                  <div 
                    style={{ borderColor: partnerPlayer?.color || "#3B82F6" }} 
                    className="w-5 h-5 rounded-full border-2 absolute -left-2.5 -top-2.5 animate-ping opacity-75"
                  />
                  {/* Solid inner cursor circle */}
                  <div 
                    style={{ 
                      backgroundColor: partnerPlayer?.color || "#3B82F6",
                      boxShadow: `0 0 8px ${partnerPlayer?.color || "#3B82F6"}`
                    }}
                    className="w-3.5 h-3.5 rounded-full border border-white relative"
                  />
                  {/* Floating Username Label above cursor */}
                  <div 
                    style={{ backgroundColor: partnerPlayer?.color || "#3B82F6" }}
                    className="absolute left-4 top-0 -translate-y-1/2 px-1.5 py-0.5 rounded text-[10px] text-white font-bold whitespace-nowrap shadow-md select-none border border-white/20"
                  >
                    {partnerPlayer?.name || "Partner"}
                  </div>
                </div>
              </div>
            )}
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

          <div className="text-[10px] font-bold text-app-text-muted font-mono text-center select-none py-0.5 border-t border-b border-app-border/40 my-0.5">
            {Math.round(zoom * 100)}%
          </div>

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
        <div className="space-y-4">
          
          {/* Always Visible Core Actions: Undo, Redo, Eraser Toggle */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <button
                id="btn-undo-top"
                onClick={handleUndo}
                disabled={isFinishedLocal || !hasMyActions}
                className="py-2 px-3 rounded-xl border border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-app-primary/30 min-h-[40px]"
                title="Undo last action"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Undo</span>
              </button>
              
              <button
                id="btn-redo-top"
                onClick={handleRedo}
                disabled={isFinishedLocal || myRedoCount === 0}
                className="py-2 px-3 rounded-xl border border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text transition-all text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-app-primary/30 min-h-[40px]"
                title="Redo undone action"
              >
                <Redo2 className="w-3.5 h-3.5" />
                <span className="text-[11px]">Redo</span>
              </button>

              <button
                onClick={() => setActiveTool(prev => prev === "eraser" ? "brush" : "eraser")}
                disabled={isFinishedLocal}
                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[40px] ${
                  activeTool === "eraser"
                    ? "border-app-primary bg-app-primary/10 text-app-primary shadow-sm font-bold"
                    : "border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text disabled:opacity-50"
                }`}
                title="Eraser Toggle"
              >
                <Eraser className="w-3.5 h-3.5" />
                <span className="text-[11px]">Eraser</span>
              </button>
            </div>

            {/* Quick Tool Selector Grid for other tools (Brush, Fill, Pan, Pick) */}
            <div className="grid grid-cols-4 gap-1.5 border-t border-app-border/40 pt-2.5">
              <button
                onClick={() => setActiveTool("brush")}
                disabled={isFinishedLocal}
                className={`py-1.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[42px] ${
                  activeTool === "brush"
                    ? "border-app-primary bg-app-primary/10 text-app-primary shadow-sm"
                    : "border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text disabled:opacity-50"
                }`}
                title="Paint Brush"
              >
                <Paintbrush className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold font-sans">Brush</span>
              </button>

              <button
                onClick={() => setActiveTool("bucket")}
                disabled={isFinishedLocal}
                className={`py-1.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[42px] ${
                  activeTool === "bucket"
                    ? "border-app-primary bg-app-primary/10 text-app-primary shadow-sm"
                    : "border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text disabled:opacity-50"
                }`}
                title="Bucket Fill"
              >
                <PaintBucket className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold font-sans">Fill</span>
              </button>

              <button
                onClick={() => setActiveTool("pan")}
                className={`py-1.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[42px] ${
                  activeTool === "pan"
                    ? "border-app-primary bg-app-primary/10 text-app-primary shadow-sm"
                    : "border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text"
                }`}
                title="Pan Canvas"
              >
                <Hand className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold font-sans">Pan</span>
              </button>

              <button
                onClick={triggerNativeEyedropper}
                disabled={isFinishedLocal}
                className={`py-1.5 px-2 rounded-xl border flex flex-col items-center justify-center gap-1 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[42px] ${
                  activeTool === "eyedropper"
                    ? "border-app-primary bg-app-primary/10 text-app-primary shadow-sm"
                    : "border-app-border bg-app-bg text-app-text-muted hover:border-app-text-muted hover:text-app-text disabled:opacity-50"
                }`}
                title="Eyedropper"
              >
                <Pipette className="w-3.5 h-3.5" />
                <span className="text-[9px] font-bold font-sans">Pick</span>
              </button>
            </div>
          </div>

          {/* Current Color Indicator and Bookmark Action */}
          <div className="flex items-center justify-between bg-app-bg p-2 rounded-xl border border-app-border/60">
            <div className="flex items-center gap-2">
              <div 
                style={{ backgroundColor: brushColor }} 
                className="w-7 h-7 rounded-lg border border-app-border/80 shadow-sm shrink-0"
              />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-app-text uppercase font-mono">
                  {brushColor}
                </span>
                <span className="text-[8px] text-app-text-muted font-sans font-medium uppercase tracking-wider">
                  Current Color
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => toggleFavoriteColor(brushColor)}
                disabled={isFinishedLocal}
                className="p-1.5 rounded-lg border border-app-border bg-app-bg text-app-text-muted hover:text-pink-500 hover:border-pink-500/30 transition-all cursor-pointer"
                title="Favorite active color"
              >
                <Heart className={`w-3.5 h-3.5 ${favoriteColors.some(c => c.toLowerCase() === brushColor.toLowerCase()) ? "fill-pink-500 text-pink-500" : ""}`} />
              </button>
              
              <button
                onClick={() => toggleAccordion("colorLibrary")}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  activeAccordion === "colorLibrary"
                    ? "border-app-primary bg-app-primary/10 text-app-primary"
                    : "border-app-border bg-app-bg text-app-text-muted hover:text-app-text"
                }`}
                title="Open Color Library"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Always Visible Brush Controls: Brush Type and Brush Size */}
          <div className="space-y-3 bg-app-bg/10 p-2.5 rounded-2xl border border-app-border/30">
            {/* Brush Type Button Group */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-app-text-muted block">Brush Type</span>
              <div className="grid grid-cols-5 gap-1">
                {["hard", "soft", "marker", "pencil", "airbrush"].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleBrushTypeChange(type)}
                    className={`py-1 rounded-lg text-[9px] font-bold uppercase transition-all border ${
                      brushType === type
                        ? "bg-app-primary text-white border-app-primary shadow-sm"
                        : "bg-app-bg text-app-text-muted border-app-border hover:border-app-text-muted hover:text-app-text"
                    }`}
                  >
                    {type === "hard" ? "Round" : type === "soft" ? "Soft" : type === "marker" ? "Mark" : type === "pencil" ? "Pen" : "Spray"}
                  </button>
                ))}
              </div>
            </div>

            {/* Brush Size Slider (Slimmer) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] font-bold uppercase text-app-text-muted">
                <span>Brush Size</span>
                <span className="text-app-primary font-mono">{brushSize}px</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  disabled={isFinishedLocal}
                  className="w-full accent-app-primary bg-app-bg h-1 rounded-lg cursor-pointer min-h-[16px]"
                />
              </div>
            </div>
          </div>

          {/* --- ACCORDION SECTIONS (Only one is open at a time; all collapsed by default) --- */}
          
          {/* SECTION 1: Brush Settings (Opacity, Softness, Live Preview) */}
          <div className="border border-app-border/40 rounded-2xl overflow-hidden bg-app-bg/10">
            <div
              onClick={() => toggleAccordion("brushSettings")}
              className="flex justify-between items-center p-2.5 cursor-pointer select-none hover:bg-app-bg/20 transition-all"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-app-primary" />
                <span className="text-xs font-bold text-app-text uppercase tracking-wider font-sans">Brush Settings</span>
              </div>
              <div className="flex items-center gap-1.5">
                {activeAccordion !== "brushSettings" && (
                  <span className="text-[9px] font-mono text-app-text-muted">
                    O:{brushOpacity}% • S:{brushSoftness}%
                  </span>
                )}
                {activeAccordion === "brushSettings" ? <ChevronUp className="w-3.5 h-3.5 text-app-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-app-text-muted" />}
              </div>
            </div>

            {activeAccordion === "brushSettings" && (
              <div className="p-3 border-t border-app-border/30 bg-app-bg/5 space-y-3.5 animate-fade-in">
                {/* Opacity Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-app-text-muted">
                    <span>Opacity</span>
                    <span className="text-app-primary font-mono">{brushOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={brushOpacity}
                    onChange={(e) => setBrushOpacity(parseInt(e.target.value))}
                    disabled={isFinishedLocal}
                    className="w-full accent-app-primary bg-app-bg h-1 rounded-lg cursor-pointer min-h-[20px]"
                  />
                </div>

                {/* Softness Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-bold uppercase text-app-text-muted">
                    <span>Softness / Feather</span>
                    <span className="text-app-primary font-mono">{brushSoftness}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={brushSoftness}
                    onChange={(e) => setBrushSoftness(parseInt(e.target.value))}
                    disabled={isFinishedLocal}
                    className="w-full accent-app-primary bg-app-bg h-1 rounded-lg cursor-pointer min-h-[20px]"
                  />
                </div>

                {/* High Fidelity Live Circle Preview */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-app-text-muted block">Live Stroke Preview</span>
                  <div 
                    style={{ 
                      backgroundImage: "conic-gradient(#f1f5f9 25%, #ffffff 0 50%, #f1f5f9 0 75%, #ffffff 0)", 
                      backgroundSize: "12px 12px" 
                    }}
                    className="h-16 w-full rounded-xl border border-app-border flex items-center justify-center relative overflow-hidden"
                  >
                    <div 
                      style={{ 
                        width: `${Math.min(60, brushSize)}px`, 
                        height: `${Math.min(60, brushSize)}px`,
                        backgroundColor: activeTool === "eraser" ? "#ffffff" : brushColor,
                        opacity: brushOpacity / 100,
                        filter: brushSoftness > 0 ? `blur(${brushSoftness * 0.1}px)` : "none"
                      }} 
                      className={`rounded-full shadow-md ${activeTool === "eraser" ? "border border-app-text-muted border-dashed" : ""}`}
                    />
                    <span className="absolute bottom-1 right-2 text-[8px] font-mono text-app-text-muted/60">
                      {brushSize}px • {brushOpacity}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: Color Library (Searchable Palette Groups & Favorites) */}
          <div className="border border-app-border/40 rounded-2xl overflow-hidden bg-app-bg/10">
            <div
              onClick={() => toggleAccordion("colorLibrary")}
              className="flex justify-between items-center p-2.5 cursor-pointer select-none hover:bg-app-bg/20 transition-all"
            >
              <div className="flex items-center gap-2">
                <Palette className="w-3.5 h-3.5 text-app-primary" />
                <span className="text-xs font-bold text-app-text uppercase tracking-wider font-sans">Color Library</span>
              </div>
              <div className="flex items-center gap-1.5">
                {activeAccordion !== "colorLibrary" && (
                  <span className="text-[9px] font-bold bg-app-primary/15 text-app-primary px-1.5 py-0.5 rounded capitalize">
                    {activePaletteGroup}
                  </span>
                )}
                {activeAccordion === "colorLibrary" ? <ChevronUp className="w-3.5 h-3.5 text-app-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-app-text-muted" />}
              </div>
            </div>

            {activeAccordion === "colorLibrary" && (
              <div className="p-3 border-t border-app-border/30 bg-app-bg/5 space-y-3.5 animate-fade-in">
                
                {/* Searchable Palette Dropdown Header */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-app-text-muted" />
                    <input
                      type="text"
                      placeholder="Search palette groups..."
                      value={paletteSearchQuery}
                      onChange={(e) => {
                        const query = e.target.value;
                        setPaletteSearchQuery(query);
                        const matched = Object.keys(PRESET_PALETTES).filter(g => g.toLowerCase().includes(query.toLowerCase()));
                        if (matched.length > 0 && !matched.includes(activePaletteGroup)) {
                          setActivePaletteGroup(matched[0]);
                        }
                      }}
                      className="w-full bg-app-bg text-[11px] pl-8 pr-2.5 py-1.5 rounded-lg border border-app-border outline-none focus:border-app-primary"
                    />
                  </div>

                  {/* Filtered drop-down select list */}
                  <select
                    value={activePaletteGroup}
                    onChange={(e) => setActivePaletteGroup(e.target.value)}
                    className="w-full bg-app-bg text-app-text border border-app-border rounded-lg px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-app-primary/50 cursor-pointer"
                  >
                    {Object.keys(PRESET_PALETTES)
                      .filter(groupName => groupName.toLowerCase().includes(paletteSearchQuery.toLowerCase()))
                      .map(groupName => (
                        <option key={groupName} value={groupName}>
                          {groupName}
                        </option>
                    ))}
                    {Object.keys(PRESET_PALETTES).filter(groupName => groupName.toLowerCase().includes(paletteSearchQuery.toLowerCase())).length === 0 && (
                      <option disabled>No matching palettes</option>
                    )}
                  </select>
                </div>

                {/* Colors Grid for selected Palette Group */}
                <div className="grid grid-cols-5 gap-1">
                  {(PRESET_PALETTES[activePaletteGroup] || []).map((color) => {
                    const isSel = brushColor.toLowerCase() === color.toLowerCase() && activeTool !== "eraser";
                    return (
                      <button
                        key={color}
                        onClick={() => handleColorSelect(color)}
                        disabled={isFinishedLocal}
                        style={{ backgroundColor: color }}
                        className={`h-7 w-full rounded-lg cursor-pointer transition-all relative focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[28px] ${
                          isSel 
                            ? "scale-108 ring-2 ring-app-primary ring-offset-1 ring-offset-app-bg" 
                            : "hover:scale-103"
                        } disabled:opacity-50`}
                        title={color}
                      />
                    );
                  })}
                </div>

                {/* Favorites Subsection */}
                <div className="border-t border-app-border/30 pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase text-app-text-muted flex items-center gap-1">
                      <Heart className="w-3 h-3 text-pink-500 fill-pink-500" />
                      Bookmarks
                    </span>
                    <span className="text-[8px] bg-pink-500/10 text-pink-500 px-1 py-0.25 rounded font-bold">
                      {favoriteColors.length} saved
                    </span>
                  </div>

                  {favoriteColors.length === 0 ? (
                    <p className="text-[9px] text-app-text-muted italic text-center py-1 bg-app-bg/25 rounded-lg">
                      Heart a color to bookmark it here!
                    </p>
                  ) : (
                    <div className="grid grid-cols-6 gap-1">
                      {favoriteColors.map((color) => {
                        const isSel = brushColor.toLowerCase() === color.toLowerCase() && activeTool !== "eraser";
                        return (
                          <button
                            key={color}
                            onClick={() => handleColorSelect(color)}
                            disabled={isFinishedLocal}
                            style={{ backgroundColor: color }}
                            className={`h-6 w-full rounded-md cursor-pointer transition-all relative focus:outline-none focus:ring-2 focus:ring-pink-500/50 min-h-[24px] ${
                              isSel 
                                ? "scale-108 ring-2 ring-pink-500 ring-offset-1 ring-offset-app-bg" 
                                : "hover:scale-103"
                            } disabled:opacity-50`}
                            title={color}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}
          </div>

          {/* SECTION 3: Advanced Color Picker (HSV, RGB, HEX) */}
          <div className="border border-app-border/40 rounded-2xl overflow-hidden bg-app-bg/10">
            <div
              onClick={() => toggleAccordion("advancedPicker")}
              className="flex justify-between items-center p-2.5 cursor-pointer select-none hover:bg-app-bg/20 transition-all"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-app-primary" />
                <span className="text-xs font-bold text-app-text uppercase tracking-wider font-sans">Advanced Picker</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-app-text-muted transition-transform ${activeAccordion === "advancedPicker" ? "rotate-180" : ""}`} />
            </div>

            {activeAccordion === "advancedPicker" && (
              <div className="p-3 border-t border-app-border/30 bg-app-bg/5 space-y-3 animate-fade-in">
                {/* Custom HSV Sliders */}
                <div className="space-y-2.5">
                  {/* Hue Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold uppercase text-app-text-muted">
                      <span>Hue (H)</span>
                      <span>{hexToHsv(brushColor).h}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={hexToHsv(brushColor).h}
                      onChange={(e) => handleHsvChange('h', parseInt(e.target.value))}
                      disabled={isFinishedLocal}
                      style={{
                        background: "linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
                      }}
                      className="w-full h-2 rounded-lg cursor-pointer appearance-none outline-none accent-white min-h-[16px]"
                    />
                  </div>

                  {/* Saturation Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold uppercase text-app-text-muted">
                      <span>Saturation (S)</span>
                      <span>{hexToHsv(brushColor).s}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={hexToHsv(brushColor).s}
                      onChange={(e) => handleHsvChange('s', parseInt(e.target.value))}
                      disabled={isFinishedLocal}
                      style={{
                        background: `linear-gradient(to right, #ffffff, ${hsvToHex(hexToHsv(brushColor).h, 100, 100)})`
                      }}
                      className="w-full h-2 rounded-lg cursor-pointer appearance-none outline-none accent-white min-h-[16px]"
                    />
                  </div>

                  {/* Value / Brightness Slider */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[9px] font-bold uppercase text-app-text-muted">
                      <span>Value / Brightness (V)</span>
                      <span>{hexToHsv(brushColor).v}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={hexToHsv(brushColor).v}
                      onChange={(e) => handleHsvChange('v', parseInt(e.target.value))}
                      disabled={isFinishedLocal}
                      style={{
                        background: `linear-gradient(to right, #000000, ${hsvToHex(hexToHsv(brushColor).h, hexToHsv(brushColor).s, 100)})`
                      }}
                      className="w-full h-2 rounded-lg cursor-pointer appearance-none outline-none accent-white min-h-[16px]"
                    />
                  </div>
                </div>

                {/* Text input formats: HEX / RGB side-by-side */}
                <div className="space-y-2 pt-2.5 border-t border-app-border/40">
                  {/* HEX Input */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-app-text-muted min-w-[28px]">HEX</span>
                    <div className="flex-1 flex items-center gap-1 bg-app-bg p-1 rounded-lg border border-app-border focus-within:border-app-primary">
                      <input 
                        type="color" 
                        value={brushColor} 
                        onChange={(e) => handleColorSelect(e.target.value)}
                        disabled={isFinishedLocal}
                        className="w-5 h-5 border-0 rounded cursor-pointer bg-transparent shrink-0"
                      />
                      <input
                        type="text"
                        value={hexInputText}
                        onChange={(e) => {
                          setHexInputText(e.target.value);
                          if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                            handleColorSelect(e.target.value);
                          }
                        }}
                        disabled={isFinishedLocal}
                        placeholder="#000000"
                        className="w-full bg-transparent border-0 outline-none text-[11px] font-mono font-bold text-app-text uppercase select-text"
                      />
                    </div>
                  </div>

                  {/* Compact RGB Fields */}
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-app-text-muted min-w-[28px]">RGB</span>
                    <div className="flex-1 grid grid-cols-3 gap-1">
                      {['r', 'g', 'b'].map((channel, idx) => {
                        const rgbVal = idx === 0 ? hexToRgb(brushColor)[0] : idx === 1 ? hexToRgb(brushColor)[1] : hexToRgb(brushColor)[2];
                        return (
                          <div key={channel} className="flex items-center bg-app-bg px-1.5 py-0.5 rounded-lg border border-app-border">
                            <span className="text-[8px] font-mono font-bold text-app-text-muted mr-1 capitalize">{channel}</span>
                            <input
                              type="number"
                              min="0"
                              max="255"
                              value={rgbVal}
                              onChange={(e) => handleRgbChange(channel, e.target.value)}
                              disabled={isFinishedLocal}
                              className="w-full bg-transparent border-0 outline-none text-[10px] font-mono text-center text-app-text font-bold"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>

          {/* Secondary Low-Profile Canvas Operations (Reset) */}
          <div className="pt-2 border-t border-app-border/20">
            <button
              id="btn-clear-changes"
              onClick={handleClear}
              disabled={isFinishedLocal || !hasMyActions}
              className="w-full py-2 px-3 rounded-xl border border-red-500/10 bg-red-500/5 text-red-400 hover:bg-red-500/10 transition-all text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none"
            >
              <RotateCcw className="w-3 h-3" />
              Reset My Canvas Edits
            </button>
          </div>

        </div>

        {/* Bottom Submission Panel */}
        <div className="pt-4 border-t border-app-border mt-4">
          <button
            onClick={handleFinish}
            disabled={isFinishedLocal}
            className={`w-full py-3 sm:py-3.5 rounded-xl font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer focus:outline-none focus:ring-2 focus:ring-app-primary/50 min-h-[44px] ${
              isFinishedLocal
                ? "bg-app-surface text-app-text-muted border border-app-border cursor-not-allowed opacity-50"
                : "bg-app-primary hover:bg-app-primary-hover text-white shadow-app-primary/15"
            }`}
          >
            {isFinishedLocal ? (
              <>
                <CheckCircle className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
                Submitted! Waiting...
              </>
            ) : (
              <>
                <CheckSquare className="w-4.5 h-4.5" />
                Finish Artwork
              </>
            )}
          </button>
          
          <p className="text-[10px] text-app-text-muted text-center mt-2 leading-relaxed flex items-center justify-center gap-1">
            <AlertCircle className="w-3 h-3 text-app-text-muted opacity-80 shrink-0" />
            Both artists must finish to merge and reveal.
          </p>
        </div>
      </div>
    </div>
  );
}
