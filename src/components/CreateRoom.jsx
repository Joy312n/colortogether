import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Image as ImageIcon, 
  Zap, 
  ChevronLeft, 
  Layers, 
  Columns, 
  Search, 
  Heart, 
  Star, 
  Sparkles, 
  Clock, 
  AlertCircle, 
  Check 
} from "lucide-react";
import { TEMPLATES, generateTemplateDataUrl, getTemplateThumbnailUrl } from "../utils/templates";

export default function CreateRoom({ onNavigateBack, onCreateRoom }) {
  const [mode, setMode] = useState("live"); // "live" | "split"
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0].id);
  const [customImage, setCustomImage] = useState(null); // base64
  const [customImageName, setCustomImageName] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef(null);

  // Advanced template states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("template_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [recentlyUsed, setRecentlyUsed] = useState(() => {
    try {
      const saved = localStorage.getItem("template_recent");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [featuredTemplates, setFeaturedTemplates] = useState([]);

  useEffect(() => {
    // Select 5 random curated templates from TEMPLATES on page load
    const shuffled = [...TEMPLATES].sort(() => 0.5 - Math.random());
    setFeaturedTemplates(shuffled.slice(0, 5));
  }, []);

  const toggleFavorite = (e, tplId) => {
    e.stopPropagation();
    setFavorites(prev => {
      let next;
      if (prev.includes(tplId)) {
        next = prev.filter(id => id !== tplId);
      } else {
        next = [...prev, tplId];
      }
      try {
        localStorage.setItem("template_favorites", JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  const addToRecentlyUsed = (tplId) => {
    setRecentlyUsed(prev => {
      const filtered = prev.filter(id => id !== tplId);
      const next = [tplId, ...filtered].slice(0, 8);
      try {
        localStorage.setItem("template_recent", JSON.stringify(next));
      } catch (err) {}
      return next;
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG/JPG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 800;
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
        
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL("image/png");
        setCustomImage(dataUrl);
        setCustomImageName(file.name);
        setSelectedTemplate(null);
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
      addToRecentlyUsed(selectedTemplate);
    } else {
      setError("Please select a template or upload a line-art image.");
      return;
    }

    onCreateRoom({
      mode,
      image: finalImageData,
    });
  };

  const categories = [
    "All", "Nature", "Animals", "Fantasy", "Sci-Fi", 
    "Cute", "Holidays", "Culture", "Vehicles", "Food", "Patterns"
  ];

  const filteredTemplates = TEMPLATES.filter(tpl => {
    const matchesCategory = selectedCategory === "All" || tpl.category === selectedCategory;
    const matchesSearch = tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getDifficultyBadge = (difficulty) => {
    switch(difficulty) {
      case "Beginner":
        return <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">🟢 Beginner</span>;
      case "Easy":
        return <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20 shrink-0">🔵 Easy</span>;
      case "Medium":
        return <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">🟡 Medium</span>;
      case "Advanced":
        return <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">🟠 Advanced</span>;
      case "Expert":
      default:
        return <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 shrink-0">🔴 Expert</span>;
    }
  };

  const renderCard = (tpl, isFeatured = false) => {
    const isSel = selectedTemplate === tpl.id && !customImage;
    const isFav = favorites.includes(tpl.id);
    
    return (
      <div
        key={tpl.id}
        onClick={() => {
          setSelectedTemplate(tpl.id);
          setCustomImage(null);
          setCustomImageName("");
          addToRecentlyUsed(tpl.id);
        }}
        className={`group relative p-3 rounded-2xl border text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-app-primary/5 flex flex-col justify-between ${
          isSel
            ? "border-app-primary bg-app-primary/5 ring-1 ring-app-primary shadow-md"
            : "border-app-border bg-app-bg/50 hover:border-app-text-muted hover:bg-app-surface-hover"
        }`}
      >
        {/* Thumbnail Box */}
        <div className="relative w-full aspect-square bg-white rounded-xl border border-app-border/40 p-2 overflow-hidden flex items-center justify-center shrink-0">
          <img
            src={getTemplateThumbnailUrl(tpl.id, 160, 160)}
            alt={tpl.name}
            loading="lazy"
            className="max-w-full max-h-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
          
          {/* Checkmark Indicator */}
          {isSel && (
            <div className="absolute top-2 right-2 bg-app-primary text-white p-1 rounded-full shadow-md z-10 scale-90 sm:scale-100">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          )}

          {/* Favorite Heart Button */}
          <button
            type="button"
            onClick={(e) => toggleFavorite(e, tpl.id)}
            className="absolute top-2 left-2 p-1.5 rounded-full bg-app-bg/80 hover:bg-app-bg border border-app-border/30 text-app-text hover:text-red-500 shadow-sm z-10 transition-colors cursor-pointer"
          >
            <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-red-500 text-red-500" : "text-app-text-muted"}`} />
          </button>
        </div>

        {/* Details */}
        <div className="mt-2.5 flex-1 flex flex-col justify-between min-w-0">
          <div>
            <div className="flex justify-between items-start gap-1 mb-1 min-w-0">
              <span className="font-bold text-app-text text-xs sm:text-sm truncate leading-tight flex-1">{tpl.name}</span>
            </div>
            <p className="text-[11px] sm:text-xs text-app-text-muted opacity-80 line-clamp-1 leading-normal mb-1">{tpl.description}</p>
          </div>
          <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-app-border/5">
            {getDifficultyBadge(tpl.difficulty)}
            {isFeatured && (
              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-amber-400/10 text-amber-400 uppercase tracking-wider scale-90">Featured</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-2 w-full lg:h-[calc(100vh-150px)] lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden">
      {/* Back Button */}
      <button
        onClick={onNavigateBack}
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-app-text-muted hover:text-app-text transition-colors mb-2 cursor-pointer focus:outline-none focus:underline min-h-[36px] px-2 py-0.5 rounded-lg hover:bg-app-surface shrink-0"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Lobby
      </button>

      {/* Page Header */}
      <div className="mb-3 text-center md:text-left shrink-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-sans font-black text-app-text leading-tight">Create Coloring Room</h1>
        <p className="text-app-text-muted mt-0.5 text-xs sm:text-sm leading-relaxed">
          Configure your shared space, choose an outline image, and setup the multiplayer rules.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-5 sm:gap-6 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
        {/* Left Side (spans 2 cols): Built-In Templates Library (Full Height!) */}
        <div className="lg:col-span-2 lg:h-full lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden">
          <div className="bg-app-surface border border-app-border p-4 sm:p-5 rounded-3xl space-y-4 lg:h-full lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden">
            {/* Library Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-app-border pb-3 shrink-0">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-app-text flex items-center gap-2">
                  <span className="text-app-primary font-bold text-sm sm:text-base">1.</span>
                  Select a Built-In Coloring Sheet
                </h2>
                <p className="text-[11px] text-app-text-muted">Choose from 70+ beautiful templates with various difficulties</p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-app-text-muted/60" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-app-bg border border-app-border rounded-xl text-xs text-app-text focus:outline-none focus:border-app-primary focus:ring-1 focus:ring-app-primary transition-all placeholder-app-text-muted/50"
                />
              </div>
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-none -mx-1 px-1 flex-wrap shrink-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all border shrink-0 cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-app-primary text-white border-app-primary shadow-sm shadow-app-primary/10"
                      : "bg-app-bg text-app-text-muted border-app-border hover:border-app-text-muted hover:text-app-text"
                  }`}
                >
                  {cat === "Cute" ? "🧸 Cute" : 
                   cat === "Nature" ? "🌸 Nature" : 
                   cat === "Animals" ? "🐱 Animals" : 
                   cat === "Fantasy" ? "🏰 Fantasy" : 
                   cat === "Sci-Fi" ? "🚀 Sci-Fi" : 
                   cat === "Holidays" ? "🎄 Holidays" : 
                   cat === "Culture" ? "🕌 Culture" : 
                   cat === "Vehicles" ? "🏎 Vehicles" : 
                   cat === "Food" ? "🍕 Food" : 
                   cat === "Patterns" ? "✨ Patterns" : cat}
                </button>
              ))}
            </div>

            {/* Scrollable grid container for the list of sheets */}
            <div className="lg:flex-1 lg:overflow-y-auto pr-1 space-y-4 custom-scrollbar min-h-0">
              
              {/* 1. Featured Section */}
              {selectedCategory === "All" && searchQuery === "" && featuredTemplates.length > 0 && (
                <div className="border-b border-app-border/10 pb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-app-text-muted mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    Featured Templates
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {featuredTemplates.map(tpl => renderCard(tpl, true))}
                  </div>
                </div>
              )}

              {/* 2. Recently Used Section */}
              {recentlyUsed.length > 0 && (
                <div className="border-b border-app-border/10 pb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-app-text-muted mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-app-primary" />
                    Recently Used
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {recentlyUsed
                      .map(id => TEMPLATES.find(t => t.id === id))
                      .filter(Boolean)
                      .slice(0, 8)
                      .map(tpl => renderCard(tpl))}
                  </div>
                </div>
              )}

              {/* 3. Favorites Section */}
              {favorites.length > 0 && (
                <div className="border-b border-app-border/10 pb-4">
                  <h3 className="text-[10px] font-black uppercase tracking-wider text-app-text-muted mb-2 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-red-400 fill-red-400" />
                    My Favorites ({favorites.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {favorites
                      .map(id => TEMPLATES.find(t => t.id === id))
                      .filter(Boolean)
                      .map(tpl => renderCard(tpl))}
                  </div>
                </div>
              )}

              {/* 4. Filtered / Search Results Grid */}
              <div>
                <h3 className="text-[10px] font-black uppercase tracking-wider text-app-text-muted mb-2">
                  {selectedCategory === "All" && searchQuery === "" ? "All Sheets" : "Gallery Sheets"} ({filteredTemplates.length})
                </h3>
                
                {filteredTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8 px-4 border border-dashed border-app-border rounded-2xl bg-app-bg/20">
                    <div className="w-10 h-10 rounded-full bg-app-border/30 flex items-center justify-center text-app-text-muted mb-2">
                      <Search className="w-4.5 h-4.5" />
                    </div>
                    <p className="text-xs font-bold text-app-text">No templates found.</p>
                    <p className="text-[11px] text-app-text-muted mt-1">Try another keyword or category filter.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredTemplates.map(tpl => renderCard(tpl))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Right Column (spans 1 col): Upload + Rules + Launch */}
        <div className="lg:h-full lg:flex lg:flex-col lg:min-h-0 lg:overflow-hidden">
          <div className="bg-app-surface border border-app-border p-4 sm:p-5 rounded-3xl flex flex-col justify-between lg:h-full lg:min-h-0 space-y-4">
            
            {/* Scrollable configurations area if height gets small */}
            <div className="space-y-4 lg:overflow-y-auto pr-1 flex-1 min-h-0 custom-scrollbar">
              
              {/* Custom Upload Block */}
              <div className="border border-app-border bg-app-bg/30 p-3.5 rounded-2xl">
                <h2 className="text-xs sm:text-sm font-bold text-app-text mb-2 flex items-center gap-2">
                  <span className="text-app-primary font-bold text-xs sm:text-sm">OR:</span>
                  Upload Custom Line-Art
                </h2>
                
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-3 sm:p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all focus-within:ring-2 focus-within:ring-app-primary/50 ${
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
                    <div className="space-y-1.5">
                      <div className="w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                        <ImageIcon className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-app-text">Custom Image Selected</p>
                        <p className="text-[10px] text-app-text-muted max-w-[180px] truncate mx-auto">{customImageName}</p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCustomImage(null);
                          setCustomImageName("");
                          setSelectedTemplate(TEMPLATES[0].id);
                        }}
                        className="text-[10px] text-red-400 hover:text-red-300 underline cursor-pointer inline-block py-0.5 px-2"
                      >
                        Remove Image
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="w-7 h-7 rounded-full bg-app-bg text-app-text-muted flex items-center justify-center mx-auto">
                        <Upload className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-app-text">Click or drag & drop PNG/JPG</p>
                        <p className="text-[9px] sm:text-[10px] text-app-text-muted leading-tight max-w-[180px] mx-auto">Recommended: Clear black and white outlines</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Cooperation Rules Selection */}
              <div className="space-y-2.5">
                <h2 className="text-xs sm:text-sm font-bold text-app-text flex items-center gap-2">
                  <span className="text-app-primary font-bold text-xs sm:text-sm">2.</span>
                  Cooperation Rules
                </h2>

                {/* Mode Selectors */}
                <div className="space-y-2.5">
                  {/* Live Mode Selection */}
                  <div
                    onClick={() => setMode("live")}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex gap-3 min-h-[44px] ${
                      mode === "live"
                        ? "border-app-primary bg-app-primary/5"
                        : "border-app-border bg-app-bg hover:border-app-text-muted"
                    }`}
                  >
                    <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      mode === "live" ? "bg-app-primary/20 text-app-primary" : "bg-app-bg text-app-text-muted"
                    }`}>
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[11px] sm:text-xs text-app-text">Live Collaboration</span>
                        <span className="text-[7px] sm:text-[8px] uppercase font-extrabold tracking-wider bg-app-primary/20 text-app-primary px-1.5 py-0.5 rounded font-sans">Simultaneous</span>
                      </div>
                      <p className="text-[10px] text-app-text-muted mt-0.5 leading-relaxed">
                        Color together on the same canvas simultaneously. Every stroke updates instantly!
                      </p>
                    </div>
                  </div>

                  {/* Split Mode Selection */}
                  <div
                    onClick={() => setMode("split")}
                    className={`p-3 rounded-2xl border cursor-pointer transition-all flex gap-3 min-h-[44px] ${
                      mode === "split"
                        ? "border-app-accent bg-app-accent/5"
                        : "border-app-border bg-app-bg hover:border-app-text-muted"
                    }`}
                  >
                    <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      mode === "split" ? "bg-app-accent/20 text-app-accent" : "bg-app-bg text-app-text-muted"
                    }`}>
                      <Columns className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-[11px] sm:text-xs text-app-text">Split Collaboration</span>
                        <span className="text-[7px] sm:text-[8px] uppercase font-extrabold tracking-wider bg-app-accent/20 text-app-accent px-1.5 py-0.5 rounded font-sans">Mystery</span>
                      </div>
                      <p className="text-[10px] text-app-text-muted mt-0.5 leading-relaxed">
                        Image divides vertically. P1 left, P2 right. Real secret reveal!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Block */}
            <div className="pt-3 border-t border-app-border mt-auto shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full py-3 bg-app-primary hover:bg-app-primary-hover text-white font-bold rounded-xl shadow-lg shadow-app-primary/10 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-app-primary/50 transition-all cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm min-h-[44px]"
              >
                <Zap className="w-4 h-4 animate-pulse" />
                Launch Room
              </button>

              {error && (
                <p className="text-[11px] text-red-400 text-center font-medium bg-red-500/10 border border-red-500/10 p-2 rounded-xl mt-2">
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
