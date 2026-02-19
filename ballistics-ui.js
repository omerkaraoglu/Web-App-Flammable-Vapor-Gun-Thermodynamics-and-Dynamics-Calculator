/**
 * Ballistics trajectory UI: reads muzzle velocity from main calculator,
 * draws trajectory with red–blue energy gradient, 10% markers, scale objects.
 */
(function () {
  'use strict';

  const R = 8.31432;
  const g = 9.80665;
  const M_air = 0.0289644;
  const p0 = 101325;

  function getBallisticsInputs() {
    const temp = document.getElementById('temperature');
    const alt = document.getElementById('altitude');
    const cv = document.getElementById('chamber_volume');
    const bd = document.getElementById('barrel_diameter');
    const bl = document.getElementById('barrel_length');
    const pm = document.getElementById('projectile_mass');
    const fuel = document.getElementById('fuel');
    const t = temp && temp.value ? parseFloat(temp.value) : 25;
    const a = alt && alt.value ? parseFloat(alt.value) : 100;
    return {
      temperature: t,
      altitude: a,
      chamber_volume: cv ? cv.value : '0.3',
      barrel_diameter: bd ? bd.value : '6.35',
      barrel_length: bl ? bl.value : '1200',
      projectile_mass: pm ? pm.value : '1.3',
      fuel: fuel ? fuel.value : 'ethanol'
    };
  }

  /**
   * Builds getRho(y) for trajectory: real-gas air density at each height y above ground.
   * Uses Ballistics.atmosphereAtHeight(y, T_ground, alt_ground) and Ballistics.densityFromRealGas(P, T).
   */
  function buildGetRho(groundTempK, groundAltitudeM) {
    if (!window.Ballistics || !window.Ballistics.densityFromRealGas || !window.Ballistics.atmosphereAtHeight) {
      return null;
    }
    const T_ground = groundTempK;
    const alt_ground = groundAltitudeM;
    return function (yAboveGround) {
      const atm = window.Ballistics.atmosphereAtHeight(yAboveGround, T_ground, alt_ground);
      return window.Ballistics.densityFromRealGas(atm.P, atm.T);
    };
  }

  function round2(x) { return Math.round(x * 100) / 100; }

  const canvas = document.getElementById('trajectoryCanvas');
  const angleSlider = document.getElementById('traj_angle');
  const angleFineSlider = document.getElementById('traj_angle_fine');
  const angleValue = document.getElementById('traj_angle_value');
  const angleFineValue = document.getElementById('traj_angle_fine_value');
  const angleWrap = document.getElementById('traj_angle_wrap');
  const angleFineWrap = document.getElementById('traj_angle_fine_wrap');
  const launchHeightSlider = document.getElementById('traj_launch_height');
  const launchHeightValue = document.getElementById('traj_launch_height_value');
  const ammoSelect = document.getElementById('traj_ammo');
  const rangeEl = document.getElementById('trajectoryRange');
  const zoomSlider = document.getElementById('traj_zoom');
  const zoomValueEl = document.getElementById('traj_zoom_value');
  const zoomResetBtn = document.getElementById('traj_zoom_reset');
  const zoomWrap = document.getElementById('traj_zoom_wrap');

  const X_MAX_OBJECTS = 3000;
  const ZOOM_MIN = 1;
  const ZOOM_MAX = 10;
  const LOG_ZOOM_STEP = 0.05;

  function getZoom() {
    if (!zoomSlider) return 1;
    const logVal = Math.max(0, Math.min(1, parseFloat(zoomSlider.value) || 0));
    return Math.pow(10, logVal);
  }

  function setZoom(zoomFactor) {
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomFactor));
    const logVal = Math.log10(z);
    if (zoomSlider) zoomSlider.value = logVal;
    updateZoomDisplay();
  }

  function updateZoomDisplay() {
    const z = getZoom();
    if (zoomValueEl) zoomValueEl.textContent = Math.round(z * 100) + '%';
  }

  function setZoomFromWheel(deltaY) {
    const step = deltaY > 0 ? -LOG_ZOOM_STEP : LOG_ZOOM_STEP;
    const logNow = Math.log10(getZoom());
    const logNew = Math.max(0, Math.min(1, logNow + step));
    setZoom(Math.pow(10, logNew));
  }

  function getEffectiveAngle() {
    const coarse = angleSlider ? parseFloat(angleSlider.value) || 0 : 0;
    const fine = angleFineSlider ? parseFloat(angleFineSlider.value) || 0 : 0;
    return Math.max(-90, Math.min(90, coarse + fine));
  }

  function updateAngleDisplay() {
    const a = getEffectiveAngle();
    if (angleValue) angleValue.textContent = (Math.round(a * 10) / 10).toFixed(1);
    if (angleFineValue && angleFineSlider) angleFineValue.textContent = angleFineSlider.value;
  }

  function updateLaunchHeightDisplay() {
    const h = launchHeightSlider ? parseFloat(launchHeightSlider.value) : 1.5;
    if (launchHeightValue) launchHeightValue.textContent = (Math.round(h * 10) / 10).toFixed(1);
  }

  function setAngleFromWheel(deltaY) {
    const a = getEffectiveAngle();
    const step = deltaY > 0 ? -1 : 1;
    const next = Math.max(-90, Math.min(90, a + step));
    const coarse = Math.floor(next);
    const fine = Math.round((next - coarse) * 10) / 10;
    if (angleSlider) angleSlider.value = coarse;
    if (angleFineSlider) angleFineSlider.value = fine;
    updateAngleDisplay();
    runTrajectory();
  }

  function setFineAngleFromWheel(deltaY) {
    if (!angleFineSlider) return;
    const step = deltaY > 0 ? -0.1 : 0.1;
    const current = parseFloat(angleFineSlider.value) || 0;
    const next = Math.max(-5, Math.min(5, Math.round((current + step) * 10) / 10));
    angleFineSlider.value = next;
    updateAngleDisplay();
    runTrajectory();
  }

  function getMuzzleVelocity() {
    const inps = getBallisticsInputs();
    const r = window.calculate && window.calculate(
      inps.fuel,
      String(inps.temperature),
      String(inps.altitude),
      inps.chamber_volume,
      inps.barrel_diameter,
      inps.barrel_length,
      inps.projectile_mass
    );
    return r ? r.muzzleVelocity : 0;
  }

  /** Muzzle velocity (m/s) for a given fuel with current gun parameters. */
  function getMuzzleVelocityForFuel(fuel) {
    const inps = getBallisticsInputs();
    const r = window.calculate && window.calculate(
      fuel,
      String(inps.temperature),
      String(inps.altitude),
      inps.chamber_volume,
      inps.barrel_diameter,
      inps.barrel_length,
      inps.projectile_mass
    );
    return r ? r.muzzleVelocity : 0;
  }

  function runTrajectory() {
    if (!canvas || !window.Ballistics) return;
    const inps = getBallisticsInputs();
    const v0 = getMuzzleVelocity();
    const angle = getEffectiveAngle();
    const ammo = ammoSelect ? ammoSelect.value : 'pellet';
    const massKg = (parseFloat(inps.projectile_mass) || 1.3) / 1000;
    const diameterM = (parseFloat(inps.barrel_diameter) || 6.35) / 1000;
    const groundTempK = (parseFloat(inps.temperature) || 25) + 273.15;
    const groundAltitudeM = parseFloat(inps.altitude) || 100;
    const getRho = buildGetRho(groundTempK, groundAltitudeM);
    var rhoOrGetRho;
    if (getRho) {
      rhoOrGetRho = getRho;
    } else {
      if (typeof window.getEnvironment === 'function') {
        var env = window.getEnvironment(inps.temperature, inps.altitude);
        rhoOrGetRho = env.air_density;
      } else {
        var pressure = p0 * Math.exp(-g * M_air * groundAltitudeM / (R * groundTempK));
        rhoOrGetRho = pressure / ((R / M_air) * groundTempK);
      }
    }
    const launchHeight = launchHeightSlider ? Math.max(0.1, Math.min(10, parseFloat(launchHeightSlider.value) || 1.5)) : 1.5;

    updateAngleDisplay();
    updateLaunchHeightDisplay();

    if (!v0 || v0 <= 0) {
      sizeCanvasToWrap();
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1a1e2a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#8b92a8';
      ctx.font = '14px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Enter gun parameters and get a valid muzzle velocity above.', canvas.width / 2, canvas.height / 2);
      if (rangeEl) rangeEl.textContent = '';
      updateMarkerTable([]);
      return;
    }

    const path = window.Ballistics.computeTrajectory(v0, angle, massKg, diameterM, rhoOrGetRho, ammo, launchHeight);
    const markers = window.Ballistics.energyMarkers(path);

    const range = path.length > 0 ? path[path.length - 1].x : 0;
    const maxY = path.length > 0 ? Math.max.apply(null, path.map(function (p) { return p.y; })) : launchHeight;

    var v0Ethanol = getMuzzleVelocityForFuel('ethanol');
    var E0Ethanol = v0Ethanol > 0 ? 0.5 * massKg * v0Ethanol * v0Ethanol : path[0].E;
    var ERef = 0.5 * E0Ethanol;

    if (rangeEl) rangeEl.textContent = 'Range: ' + round2(range) + ' m';

    updateMarkerTable(markers);
    drawTrajectory(canvas, path, markers, range, maxY, launchHeight, angle, ERef);
  }

  function updateMarkerTable(markers) {
    const tbody = document.querySelector('#trajectoryMarkerTable tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    markers.forEach(function (m) {
      const tr = document.createElement('tr');
      tr.innerHTML = '<td>' + m.percent + '%</td><td>' + round2(m.E) + '</td><td>' + round2(m.v) + '</td>';
      tbody.appendChild(tr);
    });
  }

  function sizeCanvasToWrap() {
    if (!canvas) return;
    const wrap = canvas.parentElement;
    if (!wrap) return;
    const size = Math.min(wrap.clientWidth, wrap.clientHeight) || 600;
    const s = Math.max(100, Math.round(size));
    if (canvas.width !== s || canvas.height !== s) {
      canvas.width = s;
      canvas.height = s;
    }
  }

  function drawTrajectory(canvasEl, path, markers, rangeM, maxYm, launchHeight, angleDeg, ERef) {
    sizeCanvasToWrap();
    const w = canvasEl.width;
    const h = canvasEl.height;
    const ctx = canvasEl.getContext('2d');
    const pad = 44;
    const plotSize = Math.min(w, h) - 2 * pad;
    const padLeft = pad;
    const padTop = pad;
    const plotW = plotSize;
    const plotH = plotSize;

    const rangeSafe = Math.max(rangeM * 1.02, 1);
    const maxYSafe = Math.max(maxYm * 1.15, launchHeight != null ? launchHeight : 0, 1);
    const zoomFactor = getZoom();
    const effectiveRange = rangeSafe / zoomFactor;
    const effectiveMaxY = maxYSafe / zoomFactor;
    var xMaxDisplay;
    var scale;
    if (maxYm > rangeM) {
      scale = plotH / effectiveMaxY;
      xMaxDisplay = plotW / scale;
    } else {
      xMaxDisplay = effectiveRange;
      scale = Math.min(plotW / effectiveRange, plotH / effectiveMaxY);
    }

    const padObj = { left: padLeft, top: padTop, plotH: plotH };
    function toX(x) { return padLeft + x * scale; }
    function toY(y) { return padTop + plotH - y * scale; }

    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(90, 100, 130, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(90, 100, 130, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + plotH);
    ctx.lineTo(padLeft + plotW, padTop + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    drawScaleObjects(ctx, toX, toY, xMaxDisplay, scale, plotW, plotH, padObj);

    const E0 = path[0].E;
    var ref = (ERef != null && ERef > 0) ? ERef : 0.5 * E0;

    for (let i = 0; i < path.length - 1; i++) {
      const p1 = path[i];
      const p2 = path[i + 1];
      const E = p1.E;
      var t;
      if (E >= ref) {
        t = (E0 > ref) ? 0.5 + 0.5 * (E - ref) / (E0 - ref) : 0.5;
      } else {
        t = (ref > 0) ? 0.5 * (E / ref) : 0;
      }
      t = Math.max(0, Math.min(1, t));
      const r = Math.round(255 * t);
      const b = Math.round(255 * (1 - t));
      ctx.strokeStyle = 'rgb(' + r + ',0,' + b + ')';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(toX(p1.x), toY(p1.y));
      ctx.lineTo(toX(p2.x), toY(p2.y));
      ctx.stroke();
    }

    var apex = path.length > 0 ? path[0] : null;
    if (path.length > 1) {
      for (var i = 1; i < path.length; i++) {
        if (path[i].y > apex.y) apex = path[i];
      }
    }
    if (apex) {
      const ax = toX(apex.x);
      const ay = toY(apex.y);
      ctx.fillStyle = '#e0e8f0';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(round2(apex.y) + ' m', ax, ay - 6);
      ctx.textBaseline = 'alphabetic';
    }

    const axisY = padTop + plotH;
    ctx.strokeStyle = 'rgba(90, 100, 130, 0.6)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    markers.forEach(function (m) {
      const px = toX(m.x);
      const py = toY(m.y);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, axisY);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    const labelGap = 14;
    const labelVertical = angleDeg != null && angleDeg < 30;
    const labelText = function (m) { return m.percent + '%'; };
    markers.forEach(function (m) {
      const px = toX(m.x);
      const py = toY(m.y);
      ctx.fillStyle = '#1a1e2a';
      ctx.strokeStyle = '#e0e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(px, py, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#e0e8f0';
      ctx.font = '9px JetBrains Mono, monospace';
      if (labelVertical) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(-Math.PI / 2);
        ctx.translate(labelGap, 4);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(labelText(m), 0, 0);
        ctx.restore();
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(labelText(m), px + labelGap, py + 4);
      }
    });

    ctx.restore();

    ctx.fillStyle = '#e0e8f0';
    ctx.font = '9px JetBrains Mono, monospace';
    markers.forEach(function (m) {
      const px = toX(m.x);
      ctx.save();
      ctx.translate(px, axisY + 14);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(round2(m.x) + ' m', 0, 0);
      ctx.restore();
    });
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('0', padLeft, padTop + plotH + 12);
    ctx.fillText(round2(xMaxDisplay) + ' m', padLeft + xMaxDisplay * scale, padTop + plotH + 12);
    ctx.textAlign = 'right';
    ctx.fillText('0', padLeft - 4, padTop + plotH);
    ctx.textAlign = 'left';
  }

  function generateObjectPositions(start, step, maxM) {
    var out = [];
    for (var x = start; x <= maxM; x += step) out.push(x);
    return out;
  }
  var HUMANS_AT = generateObjectPositions(2, 10, 3000);
  var TREES_AT = generateObjectPositions(5, 12, 3000);
  var BUILDINGS_AT = generateObjectPositions(12, 25, 3000);

  function drawScaleObjects(ctx, toX, toY, xMax, scale, plotW, plotH, pad) {
    const humanH = 1.7;
    const treeH = 5;
    const buildingH = 15;
    const buildingW = 8;
    const y0 = pad.top + plotH;

    function drawHuman(xm) {
      const x = toX(xm);
      const h = humanH * scale;
      const headR = h * 0.12;
      ctx.fillStyle = '#4a5568';
      ctx.beginPath();
      ctx.arc(x, y0 - h * 0.88, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - h * 0.08, y0 - h * 0.75, h * 0.16, h * 0.5);
      ctx.fillRect(x - h * 0.2, y0 - h * 0.25, h * 0.12, h * 0.25);
      ctx.fillRect(x + h * 0.08, y0 - h * 0.25, h * 0.12, h * 0.25);
    }

    function drawTree(xm) {
      const x = toX(xm);
      const h = treeH * scale;
      ctx.fillStyle = '#2d5016';
      ctx.beginPath();
      ctx.ellipse(x, y0 - h * 0.6, h * 0.35, h * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5d4e37';
      ctx.fillRect(x - h * 0.06, y0 - h * 0.2, h * 0.12, h * 0.2);
    }

    function drawBuilding(xm) {
      const x = toX(xm);
      const h = buildingH * scale;
      const w = buildingW * scale;
      const storyH = h / 5;
      ctx.fillStyle = '#3d4659';
      ctx.fillRect(x - w / 2, y0 - h, w, h);
      ctx.strokeStyle = '#2a3142';
      ctx.lineWidth = 1;
      ctx.strokeRect(x - w / 2, y0 - h, w, h);
      for (var s = 0; s < 5; s++) {
        ctx.strokeStyle = '#2a3142';
        ctx.beginPath();
        ctx.moveTo(x - w / 2, y0 - h + (s + 1) * storyH);
        ctx.lineTo(x + w / 2, y0 - h + (s + 1) * storyH);
        ctx.stroke();
        ctx.fillStyle = '#1a1e2a';
        ctx.fillRect(x - w * 0.35, y0 - h + s * storyH + storyH * 0.15, w * 0.25, storyH * 0.6);
        ctx.fillRect(x + w * 0.1, y0 - h + s * storyH + storyH * 0.15, w * 0.25, storyH * 0.6);
      }
    }

    HUMANS_AT.forEach(function (xm) {
      if (xm >= 0 && xm <= xMax) drawHuman(xm);
    });
    TREES_AT.forEach(function (xm) {
      if (xm >= 0 && xm <= xMax) drawTree(xm);
    });
    BUILDINGS_AT.forEach(function (xm) {
      if (xm >= 0 && xm <= xMax) drawBuilding(xm);
    });
  }

  if (angleSlider) {
    angleSlider.addEventListener('input', function () { updateAngleDisplay(); runTrajectory(); });
    angleSlider.addEventListener('change', function () { updateAngleDisplay(); runTrajectory(); });
  }
  if (angleFineSlider) {
    angleFineSlider.addEventListener('input', function () { updateAngleDisplay(); runTrajectory(); });
    angleFineSlider.addEventListener('change', function () { updateAngleDisplay(); runTrajectory(); });
  }
  if (angleWrap) {
    angleWrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      setAngleFromWheel(e.deltaY);
    }, { passive: false });
  }
  if (angleFineWrap) {
    angleFineWrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      e.stopPropagation();
      setFineAngleFromWheel(e.deltaY);
    }, { passive: false });
  }
  if (zoomSlider) {
    zoomSlider.addEventListener('input', function () { updateZoomDisplay(); runTrajectory(); });
    zoomSlider.addEventListener('change', function () { updateZoomDisplay(); runTrajectory(); });
  }
  if (zoomWrap) {
    zoomWrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      setZoomFromWheel(e.deltaY);
      runTrajectory();
    }, { passive: false });
  }
  if (zoomResetBtn) {
    zoomResetBtn.addEventListener('click', function () {
      setZoom(1);
      runTrajectory();
    });
  }
  if (launchHeightSlider) {
    launchHeightSlider.addEventListener('input', function () { updateLaunchHeightDisplay(); runTrajectory(); });
    launchHeightSlider.addEventListener('change', function () { updateLaunchHeightDisplay(); runTrajectory(); });
  }
  if (ammoSelect) ammoSelect.addEventListener('change', runTrajectory);

  const trajInputIds = ['temperature', 'altitude', 'chamber_volume', 'barrel_diameter', 'barrel_length', 'projectile_mass', 'fuel'];
  trajInputIds.forEach(function (id) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', runTrajectory);
      el.addEventListener('change', runTrajectory);
    }
  });

  window.addEventListener('resize', function () { runTrajectory(); });
  updateZoomDisplay();
  setTimeout(runTrajectory, 200);
})();
