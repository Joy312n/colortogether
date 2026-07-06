import React, { useState, useRef } from "react";
import { Upload, Image as ImageIcon, Zap, ChevronLeft, Layers, Columns } from "lucide-react";
import { TEMPLATES, generateTemplateDataUrl } from "../utils/templates";

export default function CreateRoom({ onNavigateBack, onCreateRoom }) {
  const [mode, setMode] = useState("live"); // "live" | "split"
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [customImage, setCustomImage] = useState(null); // base64
  const [customImageName, setCustomImageName] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG/JPG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      // Create an image to check dimensions and compress slightly if needed
      const img = new Image();
      img.onload = () => {
        const maxDim = 800; // Optimal resolution for fast network transmissions
        let w = img.width;
        let h = img.height;

        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        
        // Ensure image has a white background (very important for multiply blend mode in coloring)
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL("image/png");
        setCustomImage(dataUrl);
        setCustomImageName(file.name);
        setSelectedTemplate(null); // Deselect templates
        setError("");
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const eFake = { target: { files: [file] } };
      handleFileUpload(eFake);
    } else {
      setError("Please drop a valid image file.");
    }
  };

  const handleSubmit = () => {
    let finalImageData = "";

    if (customImage) {
      finalImageData = customImage;
    } else if (selectedTemplate) {
      finalImageData = generateTemplateDataUrl(selectedTemplate, 800, 800);
    } else {
      setError("Please select a template or upload a line-art image.");
      return;
    }

    onCreateRoom({
      mode,
      image: finalImageData,
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-8 md:py-12 w-full">
      {/* Back Button */}
      <button
        onClick={onNavigateBack}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-app-text-muted hover:text-app-text transition-colors mb-4 sm:mb-6 cursor-pointer focus:outline-none focus:underline min-h-[44px] px-2 py-1 rounded-lg hover:bg-app-surface"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Lobby
      </button>

      {/* Page Header */}
      <div className="mb-6 sm:mb-8 md:mb-10 text-center md:text-left">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-sans font-black text-app-text leading-tight">Create Coloring Room</h1>
        <p className="text-app-text-muted mt-1.5 sm:mt-2 text-xs sm:text-sm md:text-base leading-relaxed">
          Configure your shared space, choose an outline image, and setup the multiplayer rules.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Step 1 & 2: Image Selection (Left, spans 2 cols) */}
        <div className="lg:col-span-2 space-y-5 sm:space-y-6">
          {/* Custom Upload Block */}
          <div className="bg-app-surface border border-app-border p-5 sm:p-6 rounded-3xl">
            <h2 className="text-base sm:text-lg font-bold text-app-text mb-3 sm:mb-4 flex items-center gap-2">
              <span className="text-app-primary font-bold text-base sm:text-lg">1.</span>
              Upload Line-Art Outlines
            </h2>
            
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all focus-within:ring-2 focus-within:ring-app-primary/50 ${
                customImage
                  ? "border-emerald-500/50 bg-emerald-500/5"
                  : "border-app-border hover:border-app-text-muted hover:bg-app-surface-hover"
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />
              
              {customImage ? (
                <div className="space-y-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                    <ImageIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-app-text">Custom Line-Art Uploaded</p>
                    <p className="text-[11px] sm:text-xs text-app-text-muted mt-1 max-w-[240px] sm:max-w-xs truncate mx-auto">{customImageName}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomImage(null);
                      setCustomImageName("");
                      setSelectedTemplate(TEMPLATES[0].id);
                    }}
                    className="text-[11px] sm:text-xs text-red-400 hover:text-red-300 underline cursor-pointer inline-block min-h-[36px] py-1 px-2"
                  >
                    Remove Custom Image
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-app-bg text-app-text-muted flex items-center justify-center mx-auto">
                    <Upload className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-bold text-app-text">Click or drag & drop PNG / JPG</p>
                    <p className="text-[11px] sm:text-xs text-app-text-muted mt-1 leading-normal max-w-xs mx-auto">Recommended: Clean black on white outline images</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Templates Library */}
          <div className="bg-app-surface border border-app-border p-5 sm:p-6 rounded-3xl">
            <h2 className="text-base sm:text-lg font-bold text-app-text mb-3 sm:mb-4 flex items-center gap-2">
              <span className="text-app-primary font-bold text-base sm:text-lg">OR</span>
              Select a Built-In Coloring Sheet
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-3.5 sm:gap-4">
              {TEMPLATES.map((tpl) => {
                const isSel = selectedTemplate === tpl.id && !customImage;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplate(tpl.id);
                      setCustomImage(null);
                      setCustomImageName("");
                    }}
                    className={`p-3.5 sm:p-4 rounded-xl border text-left cursor-pointer transition-all min-h-[44px] ${
                      isSel
                        ? "border-app-primary bg-app-primary/5 shadow-md shadow-app-primary/5"
                        : "border-app-border bg-app-bg hover:border-app-text-muted hover:bg-app-surface-hover"
                    }`}
                  >
                    <div className="flex justify-between items-center mb-1 gap-2">
                      <span className="font-bold text-app-text text-xs sm:text-sm truncate">{tpl.name}</span>
                      <span
                        className={`text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          tpl.difficulty === "Easy"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : tpl.difficulty === "Medium"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-red-500/10 text-red-400"
                        }`}
                      >
                        {tpl.difficulty}
                      </span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-app-text-muted opacity-80 line-clamp-1 leading-normal">{tpl.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Step 3: Rules & Create Action (Right Col) */}
        <div className="space-y-6">
          <div className="bg-app-surface border border-app-border p-5 sm:p-6 rounded-3xl space-y-5 sm:space-y-6 flex flex-col justify-between h-full">
            <div className="space-y-4 sm:space-y-6">
              <h2 className="text-base sm:text-lg font-bold text-app-text flex items-center gap-2">
                <span className="text-app-primary font-bold text-base sm:text-lg">2.</span>
                Choose Cooperation Rules
              </h2>

              {/* Mode Selectors */}
              <div className="space-y-3.5 sm:space-y-4">
                {/* Live Mode Selection */}
                <div
                  onClick={() => setMode("live")}
                  className={`p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all flex gap-3 min-h-[44px] ${
                    mode === "live"
                      ? "border-app-primary bg-app-primary/5"
                      : "border-app-border bg-app-bg hover:border-app-text-muted"
                  }`}
                >
                  <div className={`mt-0.5 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    mode === "live" ? "bg-app-primary/20 text-app-primary" : "bg-app-bg text-app-text-muted"
                  }`}>
                    <Layers className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-app-text">Live Collaboration</span>
                      <span className="text-[8px] sm:text-[9px] uppercase font-extrabold tracking-wider bg-app-primary/20 text-app-primary px-1.5 py-0.5 rounded-md font-sans">Simultaneous</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-app-text-muted mt-1 leading-relaxed">
                      Color together on the same canvas simultaneously. Every stroke updates instantly!
                    </p>
                  </div>
                </div>

                {/* Split Mode Selection */}
                <div
                  onClick={() => setMode("split")}
                  className={`p-3.5 sm:p-4 rounded-2xl border cursor-pointer transition-all flex gap-3 min-h-[44px] ${
                    mode === "split"
                      ? "border-app-accent bg-app-accent/5"
                      : "border-app-border bg-app-bg hover:border-app-text-muted"
                  }`}
                >
                  <div className={`mt-0.5 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    mode === "split" ? "bg-app-accent/20 text-app-accent" : "bg-app-bg text-app-text-muted"
                  }`}>
                    <Columns className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-app-text">Split Collaboration</span>
                      <span className="text-[8px] sm:text-[9px] uppercase font-extrabold tracking-wider bg-app-accent/20 text-app-accent px-1.5 py-0.5 rounded-md font-sans">Mystery</span>
                    </div>
                    <p className="text-[11px] sm:text-xs text-app-text-muted mt-1 leading-relaxed">
                      Image divides vertically. P1 colors left, P2 colors right. You only see your side until the grand reveal!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Block */}
            <div className="pt-5 sm:pt-6 border-t border-app-border mt-4 space-y-4">
              <button
                onClick={handleSubmit}
                className="w-full py-3.5 sm:py-4 bg-app-primary hover:bg-app-primary-hover text-white font-bold rounded-xl shadow-lg shadow-app-primary/10 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-app-primary/50 transition-all cursor-pointer flex items-center justify-center gap-2 text-sm sm:text-base min-h-[44px]"
              >
                <Zap className="w-4.5 h-4.5 sm:w-5 sm:h-5 animate-pulse" />
                Launch Room
              </button>

              {error && (
                <p className="text-xs text-red-400 text-center font-medium bg-red-500/10 border border-red-500/10 p-2.5 rounded-xl">
                  {error}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
