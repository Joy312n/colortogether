import React, { useState, useEffect, useRef } from "react";
import { Download, Home, Sparkles, Share2, Palette } from "lucide-react";

export default function ArtworkReveal({ 
  mergedData, 
  onReturnHome 
}) {
  const [compositeUrl, setCompositeUrl] = useState("");
  const [animationStep, setAnimationStep] = useState("init"); // "init" | "sliding" | "locked" | "glow" | "complete"
  const [copiedLink, setCopiedLink] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 800 });
  const canvasRef = useRef(null);

  const { player1, player2, mode, originalImage } = mergedData || {};
  const isSplitMode = mode === "split";

  // Combine layers to a single high-res canvas
  useEffect(() => {
    if (!mergedData) return;

    // Load original image outlines
    const outlineImg = new Image();
    outlineImg.crossOrigin = "anonymous";

    // Load P1 colored half
    const p1Img = new Image();
    p1Img.crossOrigin = "anonymous";

    // Load P2 colored half
    const p2Img = new Image();
    p2Img.crossOrigin = "anonymous";

    let loadedCount = 0;
    const checkAllLoaded = () => {
      loadedCount++;
      if (loadedCount === 3) {
        const w = outlineImg.naturalWidth || 800;
        const h = outlineImg.naturalHeight || 800;
        setDimensions({ width: w, height: h });

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");

        // 1. Fill background white
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);

        // Draw layers in order:
        // A. Painted colors
        ctx.drawImage(p1Img, 0, 0, w, h);
        ctx.drawImage(p2Img, 0, 0, w, h);

        // B. Outlines overlay multiplied on top
        ctx.save();
        ctx.globalCompositeOperation = "multiply";
        ctx.drawImage(outlineImg, 0, 0, w, h);
        ctx.restore();

        // Save composite URL
        setCompositeUrl(canvas.toDataURL("image/png"));

        // Trigger step-based reveal animations
        triggerRevealSequence();
      }
    };

    outlineImg.onload = checkAllLoaded;
    p1Img.onload = checkAllLoaded;
    p2Img.onload = checkAllLoaded;

    outlineImg.src = originalImage;
    p1Img.src = player1.finishedData;
    p2Img.src = player2.finishedData;
  }, [mergedData]);

  const triggerRevealSequence = () => {
    // Reveal timing intervals:
    setTimeout(() => {
      setAnimationStep("sliding"); // Slide left and right halves together
    }, 800);

    setTimeout(() => {
      setAnimationStep("locked"); // Snap them together
    }, 2800);

    setTimeout(() => {
      setAnimationStep("glow"); // Flash congratulations particles
    }, 3200);

    setTimeout(() => {
      setAnimationStep("complete"); // Display download & return home controls
    }, 4500);
  };

  const handleDownload = () => {
    if (!compositeUrl) return;
    const link = document.createElement("a");
    link.download = `ColorTogether_Masterpiece_${Date.now()}.png`;
    link.href = compositeUrl;
    link.click();
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 py-6 sm:py-8 flex flex-col items-center justify-center min-h-[90vh] text-center select-none font-sans overflow-hidden w-full">
      
      {/* Title Header */}
      <div className="mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 text-[10px] sm:text-xs font-bold text-app-primary px-3 py-1 rounded-full bg-app-primary/10 border border-app-primary/20 mb-2 sm:mb-3 animate-bounce">
          <Sparkles className="w-3.5 h-3.5" />
          Co-op Masterpiece Complete!
        </div>
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-sans font-black tracking-tighter text-app-text leading-tight">
          The Grand Reveal
        </h1>
        <p className="text-xs sm:text-sm text-app-text-muted mt-2 max-w-md mx-auto px-2">
          Collaboratively styled by <span className="text-app-primary font-bold">{player1?.name}</span> & <span className="text-app-accent font-bold">{player2?.name}</span>.
        </p>
      </div>

      {/* REVEAL ANIMATION AREA */}
      <div 
        style={{
          aspectRatio: `${dimensions.width} / ${dimensions.height}`,
          width: "100%",
          maxWidth: "420px", // Slightly more screen-friendly for all phones
          height: "auto",
        }}
        className="w-full rounded-3xl bg-app-surface border border-app-border shadow-2xl relative overflow-hidden flex items-center justify-center mb-6 sm:mb-8"
      >
        
        {/* Glow backdrop flashes */}
        {(animationStep === "glow" || animationStep === "complete") && (
          <div className="absolute inset-0 bg-app-primary/15 animate-pulse blur-3xl rounded-full pointer-events-none transition-all duration-1000" />
        )}

        {/* SPLIT MODE SLIDING ANIMATION STAGES */}
        {isSplitMode ? (
          <div className="relative w-full h-full">
            {/* Left Half panel */}
            <div 
              style={{
                backgroundColor: "#FFFFFF",
                backgroundImage: `url(${player1?.finishedData})`,
                backgroundSize: "100% 100%",
                clipPath: "polygon(0 0, 50% 0, 50% 100%, 0 100%)",
                transform: animationStep === "init" 
                  ? "translateX(-150px)" 
                  : animationStep === "sliding"
                  ? "translateX(-40px)"
                  : "translateX(0px)",
                opacity: animationStep === "init" ? 0 : 1,
                transition: "transform 2s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease-out"
              }}
              className="absolute inset-0 w-full h-full"
            />

            {/* Right Half panel */}
            <div 
              style={{
                backgroundColor: "#FFFFFF",
                backgroundImage: `url(${player2?.finishedData})`,
                backgroundSize: "100% 100%",
                clipPath: "polygon(50% 0, 100% 0, 100% 100%, 50% 100%)",
                transform: animationStep === "init" 
                  ? "translateX(150px)" 
                  : animationStep === "sliding"
                  ? "translateX(40px)"
                  : "translateX(0px)",
                opacity: animationStep === "init" ? 0 : 1,
                transition: "transform 2s cubic-bezier(0.25, 1, 0.5, 1), opacity 0.8s ease-out"
              }}
              className="absolute inset-0 w-full h-full"
            />

            {/* Overlay Outlines multiplies on top after sliding snaps */}
            {(animationStep === "locked" || animationStep === "glow" || animationStep === "complete") && (
              <div 
                style={{
                  backgroundImage: `url(${originalImage})`,
                  backgroundSize: "100% 100%",
                  mixBlendMode: "multiply",
                }}
                className="absolute inset-0 w-full h-full pointer-events-none animate-fade-in"
              />
            )}

            {/* Seamless unified composite image overlaying everything once locked/glow/complete to eliminate any rendering gap lines */}
            {(animationStep === "locked" || animationStep === "glow" || animationStep === "complete") && compositeUrl && (
              <img 
                src={compositeUrl} 
                alt="Unified masterpiece"
                className="absolute inset-0 w-full h-full rounded-3xl animate-fade-in object-cover"
              />
            )}
          </div>
        ) : (
          /* LIVE MODE GLOW FADE ANIMATION */
          <div className="relative w-full h-full flex items-center justify-center bg-white rounded-3xl">
            {compositeUrl ? (
              <img 
                src={compositeUrl} 
                alt="Consolidated artwork"
                style={{
                  opacity: animationStep === "init" ? 0 : 1,
                  scale: animationStep === "init" ? "0.95" : "1.0",
                  transition: "all 1.5s cubic-bezier(0.16, 1, 0.3, 1)"
                }}
                className="w-full h-full rounded-3xl"
              />
            ) : (
              <div className="text-app-text-muted text-xs sm:text-sm font-medium animate-pulse">Generating masterpiece...</div>
            )}
          </div>
        )}

        {/* Lock Flash screen shake overlay */}
        {animationStep === "glow" && (
          <div className="absolute inset-0 border-[6px] border-app-primary/30 rounded-3xl animate-ping pointer-events-none" />
        )}
      </div>

      {/* ACTION BLOCK - Displays fully when animation finishes */}
      <div 
        style={{
          opacity: (animationStep === "glow" || animationStep === "complete") ? 1 : 0,
          transform: (animationStep === "glow" || animationStep === "complete") ? "translateY(0)" : "translateY(20px)",
          transition: "all 1s cubic-bezier(0.16, 1, 0.3, 1)"
        }}
        className="w-full max-w-md space-y-4 px-2"
      >
        <div className="bg-app-surface border border-app-border p-4 sm:p-5 rounded-2xl">
          <p className="text-xs sm:text-sm font-bold text-app-text mb-1">✨ Masterpiece Saved Successfully!</p>
          <p className="text-[11px] sm:text-xs text-app-text-muted leading-relaxed">
            Your coloring session actions were processed, merged with outlines, and generated as a high-res printable PNG file.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <button
            onClick={handleDownload}
            className="py-3 sm:py-4 px-2 sm:px-4 bg-app-primary hover:bg-app-primary-hover text-white text-xs sm:text-sm font-bold rounded-xl shadow-lg shadow-app-primary/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-app-primary/50 transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px]"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            Download PNG
          </button>

          <button
            onClick={onReturnHome}
            className="py-3 sm:py-4 px-2 sm:px-4 bg-app-bg hover:bg-app-surface-hover text-app-text border border-app-border hover:border-app-text-muted text-xs sm:text-sm font-bold rounded-xl active:scale-95 focus:outline-none focus:ring-2 focus:ring-app-primary/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 sm:gap-2 min-h-[44px]"
          >
            <Home className="w-4 h-4 sm:w-5 sm:h-5" />
            Return Home
          </button>
        </div>
      </div>
      
    </div>
  );
}
