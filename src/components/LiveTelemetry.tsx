import { useEffect, useState, useRef } from "react";
import { Telemetry } from "../types";
import { VEHICLE_TEMPLATES, RADIO_STATIONS, VICE_CITY_ZONES } from "../data/mockData";
import { Map, Compass, Radio, Heart, Shield, HelpCircle, Flame, Star, Zap, Gauge } from "lucide-react";

interface LiveTelemetryProps {
  telemetry: Telemetry;
  isOnline: boolean;
  onUpdateTelemetry: (updated: Telemetry) => void;
  onToggleSync: () => void;
}

export default function LiveTelemetry({
  telemetry,
  isOnline,
  onUpdateTelemetry,
  onToggleSync
}: LiveTelemetryProps) {
  const [starHover, setStarHover] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const radarAngle = useRef(0);
  const mapDots = useRef<{ x: number; y: number; label: string; color: string }[]>([
    { x: 120, y: 180, label: "Malibu Club", color: "#ff2a74" },
    { x: 380, y: 100, label: "Planque Port Gellhorn", color: "#00f0ff" },
    { x: 250, y: 320, label: "Serveurs Chiffrés", color: "#00f0ff" },
    { x: 450, y: 220, label: "Verte Feuille Lab", color: "#10b981" }
  ]);

  // Simulation loop for Telemetry data
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(() => {
      // Find template for maximums
      const currentVehicleTemplate = VEHICLE_TEMPLATES.find(
        v => v.name === telemetry.vehicle
      ) || VEHICLE_TEMPLATES[0];

      // Jitter speed, rpm, coordinates
      const targetSpeed = Math.min(
        Math.max(telemetry.speed + (Math.random() * 12 - 5.5), 10),
        250
      );
      
      let newGear = telemetry.gear;
      if (targetSpeed > telemetry.speed && telemetry.rpm > currentVehicleTemplate.rpmMax * 0.8) {
        newGear = Math.min(telemetry.gear + 1, currentVehicleTemplate.gearMax);
      } else if (targetSpeed < telemetry.speed && telemetry.rpm < currentVehicleTemplate.rpmMax * 0.4) {
        newGear = Math.max(telemetry.gear - 1, 1);
      }

      const ratio = targetSpeed / (currentVehicleTemplate.gearMax * 40);
      const targetRpm = Math.min(
        Math.max(
          (ratio * currentVehicleTemplate.rpmMax) + (Math.random() * 400 - 200),
          1000
        ),
        currentVehicleTemplate.rpmMax
      );

      // Random slow motion drift across coordinates
      let newLat = telemetry.latitude + (Math.random() * 2 - 1);
      let newLng = telemetry.longitude + (Math.random() * 2 - 1);
      
      // Keep boundaries in 500x500
      if (newLat < 50) newLat = 50;
      if (newLat > 450) newLat = 450;
      if (newLng < 50) newLng = 50;
      if (newLng > 450) newLng = 450;

      // Random zone transition if near coordinates
      let newZone = telemetry.zone;
      if (Math.random() < 0.05) {
        newZone = VICE_CITY_ZONES[Math.floor(Math.random() * VICE_CITY_ZONES.length)];
      }

      onUpdateTelemetry({
        ...telemetry,
        speed: Math.round(targetSpeed),
        rpm: Math.round(targetRpm),
        gear: newGear,
        latitude: Number(newLat.toFixed(1)),
        longitude: Number(newLng.toFixed(1)),
        zone: newZone
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOnline, telemetry, onUpdateTelemetry]);

  // Canvas radar mapping animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;

    const render = () => {
      // Clear canvas
      ctx.fillStyle = "#0d0e15";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Grid lines
      ctx.strokeStyle = "rgba(0, 240, 255, 0.08)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw concentric radar circles
      ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width * 0.45, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(canvas.width / 2, canvas.height / 2, canvas.width * 0.15, 0, Math.PI * 2);
      ctx.stroke();

      // Draw sweeping radar line
      radarAngle.current = (radarAngle.current + 0.01) % (Math.PI * 2);
      const sweepX = (canvas.width / 2) + Math.cos(radarAngle.current) * (canvas.width * 0.45);
      const sweepY = (canvas.height / 2) + Math.sin(radarAngle.current) * (canvas.width * 0.45);

      // Create sweeping gradient
      const grad = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 10,
        canvas.width / 2, canvas.height / 2, canvas.width * 0.45
      );
      grad.addColorStop(0, "rgba(0, 240, 255, 0.03)");
      grad.addColorStop(1, "rgba(0, 240, 255, 0.12)");

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height / 2);
      ctx.arc(
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.45,
        radarAngle.current - 0.3,
        radarAngle.current
      );
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(canvas.width / 2, canvas.height / 2);
      ctx.lineTo(sweepX, sweepY);
      ctx.stroke();

      // Draw safehouse and properties dots
      mapDots.current.forEach(dot => {
        ctx.fillStyle = dot.color;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing glow for dots
        ctx.strokeStyle = dot.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 6 + Math.sin(Date.now() / 150) * 4, 0, Math.PI * 2);
        ctx.stroke();

        ctx.font = "10px JetBrains Mono";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(dot.label, dot.x + 10, dot.y + 3);
      });

      // Draw Player marker
      // Convert simulated coords (latitude, longitude) to canvas pixels
      // Sim range: 50 to 450 maps to 40 to 460
      const playerX = telemetry.latitude;
      const playerY = telemetry.longitude;

      ctx.fillStyle = "#ff2a74";
      ctx.beginPath();
      ctx.arc(playerX, playerY, 8, 0, Math.PI * 2);
      ctx.fill();

      // Glow effect for player
      ctx.strokeStyle = "rgba(255, 42, 116, 0.5)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(playerX, playerY, 12 + Math.sin(Date.now() / 100) * 3, 0, Math.PI * 2);
      ctx.stroke();

      ctx.font = "bold 11px Space Grotesk";
      ctx.fillStyle = "#ff2a74";
      ctx.fillText("L&J [VÉHICULE]", playerX - 40, playerY - 15);

      animId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animId);
  }, [telemetry]);

  const toggleStars = (rating: number) => {
    onUpdateTelemetry({
      ...telemetry,
      searchLevel: telemetry.searchLevel === rating ? rating - 1 : rating
    });
  };

  const handleManualAction = (field: keyof Telemetry, value: any) => {
    onUpdateTelemetry({
      ...telemetry,
      [field]: value
    });
  };

  const currentVehicleTemplate = VEHICLE_TEMPLATES.find(
    v => v.name === telemetry.vehicle
  ) || VEHICLE_TEMPLATES[0];

  const rpmPercent = (telemetry.rpm / currentVehicleTemplate.rpmMax) * 100;

  return (
    <div className="space-y-6" id="telemetry-module">
      {/* Top connection status header */}
      <div className="flex items-center justify-between p-4 bg-reverb-card border border-reverb-cyan/30 rounded-lg shadow-glow-cyan">
        <div className="flex items-center space-x-3">
          <div className="relative flex h-3 w-3">
            {isOnline ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-reverb-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-reverb-cyan"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-3 w-3 bg-reverb-pink"></span>
            )}
          </div>
          <div>
            <h3 className="text-sm font-mono tracking-wider text-white">
              TÉLÉMÉTRIE DECONEXION / SYNC
            </h3>
            <p className="text-xs text-gray-400 font-mono">
              WebSocket: {isOnline ? "CONNECTÉ (1000ms)" : "HORS LIGNE"}
            </p>
          </div>
        </div>

        <button
          onClick={onToggleSync}
          className={`px-4 py-1.5 rounded text-xs font-mono font-bold tracking-wider uppercase transition-all duration-300 ${
            isOnline
              ? "bg-reverb-pink hover:bg-reverb-pink/80 text-white"
              : "bg-reverb-cyan hover:bg-reverb-cyan/80 text-black shadow-glow-cyan"
          }`}
          id="sync-toggle-btn"
        >
          {isOnline ? "INTERROMPRE SYNC" : "S'ALIGNER AU FLUX"}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Dials & Vehicle Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="p-5 bg-reverb-card border border-reverb-pink/20 rounded-lg space-y-4">
            <div className="flex justify-between items-center border-b border-reverb-pink/10 pb-2">
              <h2 className="font-display font-semibold text-reverb-pink text-base flex items-center gap-2">
                <Gauge className="w-4 h-4" /> COMPTE-TOURS VÉLOCITÉ
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 bg-reverb-pink/10 text-reverb-pink rounded border border-reverb-pink/20">
                SPORT V8
              </span>
            </div>

            {/* Simulated HUD Speed & RPM */}
            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between items-end font-mono mb-1">
                  <span className="text-xs text-gray-400">VITESSE LIVE</span>
                  <span className="text-2xl font-bold font-display text-white">
                    {telemetry.speed} <span className="text-xs text-reverb-cyan">KM/H</span>
                  </span>
                </div>
                <div className="h-2.5 w-full bg-reverb-dark border border-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-reverb-cyan shadow-glow-cyan transition-all duration-300"
                    style={{ width: `${(telemetry.speed / 250) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end font-mono mb-1">
                  <span className="text-xs text-gray-400">RÉGIME MOTEUR</span>
                  <span className="text-sm font-semibold text-reverb-pink">
                    {telemetry.rpm} <span className="text-[10px] text-gray-400">RPM (R{telemetry.gear})</span>
                  </span>
                </div>
                <div className="h-2.5 w-full bg-reverb-dark border border-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full shadow-glow-pink transition-all duration-300 ${
                      rpmPercent > 80 ? "bg-red-500" : "bg-reverb-pink"
                    }`}
                    style={{ width: `${rpmPercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 font-mono text-xs">
                <div className="bg-reverb-dark/60 p-2.5 border border-gray-800 rounded">
                  <span className="text-gray-500 block mb-0.5 text-[10px]">VÉHICULE ACTIF</span>
                  <select
                    value={telemetry.vehicle}
                    onChange={(e) => {
                      const selected = VEHICLE_TEMPLATES.find(v => v.name === e.target.value);
                      if (selected) {
                        handleManualAction("vehicle", selected.name);
                        handleManualAction("rpm", 1000);
                        handleManualAction("gear", 1);
                      }
                    }}
                    className="bg-transparent text-white font-semibold outline-none w-full cursor-pointer focus:text-reverb-cyan"
                  >
                    {VEHICLE_TEMPLATES.map((veh) => (
                      <option key={veh.name} value={veh.name} className="bg-reverb-dark">
                        {veh.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-reverb-dark/60 p-2.5 border border-gray-800 rounded text-right">
                  <span className="text-gray-500 block mb-0.5 text-[10px]">RAPPORTS DE BOÎTE</span>
                  <div className="flex justify-end gap-1 items-center">
                    {[1, 2, 3, 4, 5, 6].map((g) => (
                      <span
                        key={g}
                        className={`w-4 h-4 flex items-center justify-center text-[10px] rounded font-bold ${
                          telemetry.gear === g
                            ? "bg-reverb-cyan text-black"
                            : g > currentVehicleTemplate.gearMax
                            ? "text-gray-700 pointer-events-none line-through"
                            : "text-gray-400 bg-reverb-card"
                        }`}
                      >
                        {g}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* VCPD Alert index */}
          <div className="p-5 bg-reverb-card border border-reverb-cyan/20 rounded-lg space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-display font-semibold text-reverb-cyan text-base flex items-center gap-2">
                <Flame className="w-4 h-4 text-reverb-pink" /> INDICE DE RECHERCHE VCPD
              </h2>
              <span className="text-xs font-mono text-gray-400">ALERT LEVEL</span>
            </div>

            <div className="flex justify-between items-center bg-reverb-dark/80 p-3 rounded border border-gray-800">
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const isActive = star <= telemetry.searchLevel;
                  const isHovered = starHover !== null && star <= starHover;
                  return (
                    <button
                      key={star}
                      onMouseEnter={() => setStarHover(star)}
                      onMouseLeave={() => setStarHover(null)}
                      onClick={() => toggleStars(star)}
                      className="p-1 transition-transform duration-100 hover:scale-125 focus:outline-none"
                    >
                      <Star
                        className={`w-6 h-6 transition-all ${
                          isActive || isHovered
                            ? "fill-reverb-pink text-reverb-pink drop-shadow-[0_0_8px_rgba(255,42,116,0.8)]"
                            : "text-gray-700"
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <div className="text-right font-mono text-xs">
                {telemetry.searchLevel === 0 ? (
                  <span className="text-emerald-500 font-bold">CALME</span>
                ) : telemetry.searchLevel <= 2 ? (
                  <span className="text-amber-500 font-bold">PATROUILLES</span>
                ) : (
                  <span className="text-reverb-pink font-bold animate-pulse">FORCE MAXIMALE</span>
                )}
              </div>
            </div>
          </div>

          {/* Player stats health / armor */}
          <div className="p-5 bg-reverb-card border border-reverb-cyan/10 rounded-lg space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 text-reverb-pink fill-reverb-pink" /> SANTÉ
              </span>
              <span className="text-white font-semibold">{telemetry.health}%</span>
            </div>
            <div className="h-2 w-full bg-reverb-dark rounded-full overflow-hidden">
              <div className="h-full bg-reverb-pink" style={{ width: `${telemetry.health}%` }} />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-gray-400 flex items-center gap-1">
                <Shield className="w-3.5 h-3.5 text-reverb-cyan fill-reverb-cyan" /> GILLET PARE-BALLES
              </span>
              <span className="text-white font-semibold">{telemetry.armor}%</span>
            </div>
            <div className="h-2 w-full bg-reverb-dark rounded-full overflow-hidden">
              <div className="h-full bg-reverb-cyan shadow-glow-cyan" style={{ width: `${telemetry.armor}%` }} />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] border-t border-gray-800 mt-2">
              <div>
                <span className="text-gray-500">MUNITIONS CHOSES</span>
                <span className="block text-white font-bold text-sm mt-0.5">{telemetry.ammo} BALLES</span>
              </div>
              <div className="text-right">
                <span className="text-gray-500">FRÉQUENCE RADIO</span>
                <span className="block text-reverb-cyan font-bold text-[10px] mt-0.5 truncate max-w-[130px]" title={telemetry.activeRadio}>
                  {telemetry.activeRadio}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Center/Right Grid: Tactical Map & GPS Radar */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 bg-reverb-card border border-reverb-cyan/20 rounded-lg space-y-4 flex flex-col h-full">
            <div className="flex justify-between items-center border-b border-reverb-cyan/10 pb-2">
              <h2 className="font-display font-semibold text-reverb-cyan text-base flex items-center gap-2">
                <Map className="w-4 h-4 text-reverb-cyan" /> RADAR GPS TACTIQUE : LE DAEMON DE VICE CITY
              </h2>
              <div className="flex items-center gap-4 text-xs font-mono text-gray-400">
                <span className="flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 animate-spin text-reverb-cyan" /> Lat: {telemetry.latitude}
                </span>
                <span>
                  Lng: {telemetry.longitude}
                </span>
                <span className="text-reverb-pink font-bold">
                  ZONE : {telemetry.zone.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Radar View Canvas */}
            <div className="relative flex-grow flex items-center justify-center bg-reverb-dark border border-gray-800 rounded overflow-hidden p-1">
              <canvas
                ref={canvasRef}
                width={500}
                height={350}
                className="w-full max-w-[500px] aspect-[500/350] rounded bg-reverb-dark"
              />
              <div className="absolute top-4 left-4 bg-reverb-dark/90 p-2.5 rounded border border-reverb-cyan/30 font-mono text-[10px] space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-reverb-pink rounded-full inline-block animate-pulse"></span>
                  <span className="text-white">Votre Trace (Lucia & Jason)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-reverb-cyan rounded-full inline-block"></span>
                  <span className="text-white">Planques Actives</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block"></span>
                  <span className="text-white">Stock prêt au Port</span>
                </div>
              </div>

              {/* Simulation coordinates and sweep indicator */}
              <div className="absolute bottom-4 right-4 bg-reverb-dark/80 px-2 py-1 rounded border border-gray-800 font-mono text-[9px] text-reverb-cyan">
                REVERB SENSORS SWEEPING...
              </div>
            </div>

            {/* Playground controls to manually change telemetry coordinates or trigger events */}
            <div className="bg-reverb-dark/40 p-3 rounded border border-gray-800 font-mono text-xs space-y-2">
              <span className="text-reverb-cyan font-bold block mb-1">PANEL DE CONTRÔLE DE SIMULATION :</span>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    handleManualAction("speed", 210);
                    handleManualAction("rpm", 7800);
                  }}
                  className="bg-reverb-card border border-reverb-pink/30 hover:border-reverb-pink text-reverb-pink px-2.5 py-1.5 rounded transition text-center hover:bg-reverb-pink/10"
                >
                  ⚡ Boost Vitesse (Nitrous)
                </button>
                <button
                  onClick={() => handleManualAction("health", Math.min(telemetry.health + 25, 100))}
                  className="bg-reverb-card border border-emerald-500/30 hover:border-emerald-500 text-emerald-400 px-2.5 py-1.5 rounded transition text-center hover:bg-emerald-500/10"
                >
                  ❤️ Utiliser Trousse de Soin
                </button>
                <button
                  onClick={() => handleManualAction("armor", 100)}
                  className="bg-reverb-card border border-reverb-cyan/30 hover:border-reverb-cyan text-reverb-cyan px-2.5 py-1.5 rounded transition text-center hover:bg-reverb-cyan/10"
                >
                  🛡️ Remplacer Blindage
                </button>
                <select
                  value={telemetry.activeRadio}
                  onChange={(e) => handleManualAction("activeRadio", e.target.value)}
                  className="bg-reverb-card border border-gray-700 text-gray-300 px-2.5 py-1.5 rounded outline-none cursor-pointer hover:border-gray-500 text-center"
                >
                  {RADIO_STATIONS.map(st => (
                    <option key={st} value={st} className="bg-reverb-dark text-white">
                      📻 {st.split(" (")[0]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
