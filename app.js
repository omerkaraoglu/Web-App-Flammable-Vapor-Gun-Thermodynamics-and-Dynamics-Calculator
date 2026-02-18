(function () {
  const fuelSelect = document.getElementById('fuel');
  const temperature = document.getElementById('temperature');
  const altitude = document.getElementById('altitude');
  const chamber_volume = document.getElementById('chamber_volume');
  const barrel_diameter = document.getElementById('barrel_diameter');
  const barrel_length = document.getElementById('barrel_length');
  const projectile_mass = document.getElementById('projectile_mass');

  const out_velocity = document.getElementById('out_velocity');
  const out_mach = document.getElementById('out_mach');
  const out_energy = document.getElementById('out_energy');
  const out_pressure = document.getElementById('out_pressure');
  const out_efficiency = document.getElementById('out_efficiency');
  const out_time = document.getElementById('out_time');
  const out_fuel = document.getElementById('out_fuel');
  const out_fuel_label = document.getElementById('out_fuel_label');

  function getInputs() {
    return {
      temperature: temperature.value || '25',
      altitude: altitude.value || '0',
      chamber_volume: chamber_volume.value || '2',
      barrel_diameter: barrel_diameter.value || '40',
      barrel_length: barrel_length.value || '1000',
      projectile_mass: projectile_mass.value || '50'
    };
  }

  function round2(x) { return Math.round(x * 100) / 100; }
  function round3(x) { return Math.round(x * 1000) / 1000; }

  let result = null;

  function runCalculation() {
    const fuel = fuelSelect.value;
    const t = temperature.value;
    const alt = altitude.value;
    const cv = chamber_volume.value;
    const bd = barrel_diameter.value;
    const bl = barrel_length.value;
    const pm = projectile_mass.value;

    if (!t || !alt || !cv || !bd || !bl || !pm) {
      out_velocity.textContent = '— m/s';
      out_mach.textContent = '— Mach';
      out_energy.textContent = '— J';
      out_pressure.textContent = '— MPa';
      out_efficiency.textContent = '— %';
      out_time.textContent = '— ms';
      out_fuel.textContent = '—';
      return;
    }

    result = window.calculate(fuel, t, alt, cv, bd, bl, pm);
    if (!result) return;

    out_velocity.textContent = round2(result.muzzleVelocity) + ' m/s';
    out_mach.textContent = 'Mach ' + round2(result.mach);
    out_energy.textContent = round2(result.kineticEnergy_J) + ' J';
    out_pressure.textContent = round3(result.chamberPressure_MPa) + ' MPa';
    out_efficiency.textContent = round2(result.rifleEfficiency_percent) + ' %';
    out_time.textContent = round2(result.timeInBarrel_ms) + ' ms';

    if (result.fuelVolumeMl != null) {
      out_fuel.textContent = round2(result.fuelVolumeMl) + ' mL';
      out_fuel_label.textContent = result.fuelLabel || 'Fuel amount';
    } else {
      out_fuel.textContent = result.fuelLabel || 'HHO (2:1)';
      out_fuel_label.textContent = 'Fuel';
    }
  }

  function updateAll() {
    runCalculation();
    if (typeof runPlot === 'function') runPlot();
    if (typeof runNormPlot === 'function') runNormPlot();
  }

  fuelSelect.addEventListener('change', updateAll);

  [temperature, altitude, chamber_volume, barrel_diameter, barrel_length, projectile_mass].forEach(function (el) {
    el.addEventListener('input', updateAll);
    el.addEventListener('change', updateAll);
  });

  runCalculation();

  // ----- Grafik: 100 nokta, X aralığı, Y çıktı, fare ile + imleci -----
  const plotX = document.getElementById('plot_x');
  const plotY = document.getElementById('plot_y');
  const plotXMin = document.getElementById('plot_x_min');
  const plotXMax = document.getElementById('plot_x_max');
  const plotCanvas = document.getElementById('plotCanvas');
  const plotHint = document.getElementById('plotHint');
  const plotCursorValue = document.getElementById('plotCursorValue');

  let plotState = null;

  function runPlot() {
    const xKey = plotX.value;
    const yKey = plotY.value;
    let xMin = parseFloat(plotXMin.value);
    let xMax = parseFloat(plotXMax.value);
    if (isNaN(xMin) || isNaN(xMax) || xMin >= xMax) {
      plotHint.textContent = 'Enter a valid X range (Min < Max).';
      plotState = null;
      return;
    }
    const base = getInputs();
    const N = 100;
    const points = [];
    for (let i = 0; i < N; i++) {
      const x = xMin + (xMax - xMin) * i / (N - 1);
      const params = { ...base };
      params[xKey] = String(x);
      const r = window.calculate(
        fuelSelect.value,
        params.temperature,
        params.altitude,
        params.chamber_volume,
        params.barrel_diameter,
        params.barrel_length,
        params.projectile_mass
      );
      if (!r) continue;
      let y = r[yKey];
      if (y == null || (typeof y === 'number' && isNaN(y))) y = 0;
      if (yKey === 'chamberPressure_MPa') y = round2(y);
      points.push({ x: x, y: y });
    }
    if (points.length === 0) {
      plotHint.textContent = 'Calculation error; check inputs.';
      plotState = null;
      return;
    }
    plotHint.textContent = '';
    const ys = points.map(function (p) { return p.y; });
    const yMin = Math.min.apply(null, ys);
    const yMax = Math.max.apply(null, ys);
    const yRange = yMax - yMin || 1;
    const yLo = yMin - yRange * 0.05;
    const yHi = yMax + yRange * 0.05;
    const pad = { left: 52, right: 24, top: 20, bottom: 36 };
    const plotW = plotCanvas.width - pad.left - pad.right;
    const plotH = plotCanvas.height - pad.top - pad.bottom;
    plotState = { points, xKey, yKey, xMin, xMax, yLo, yHi, pad, plotW, plotH };
    drawPlot(null);
  }

  function getYAtX(points, xVal) {
    if (points.length === 0) return null;
    if (xVal <= points[0].x) return points[0].y;
    if (xVal >= points[points.length - 1].x) return points[points.length - 1].y;
    for (let i = 0; i < points.length - 1; i++) {
      if (points[i].x <= xVal && xVal <= points[i + 1].x) {
        const t = (xVal - points[i].x) / (points[i + 1].x - points[i].x);
        return points[i].y + t * (points[i + 1].y - points[i].y);
      }
    }
    return points[0].y;
  }

  function drawPlot(cursor) {
    if (!plotState) return;
    const { points, xKey, yKey, xMin, xMax, yLo, yHi, pad, plotW, plotH } = plotState;
    const w = plotCanvas.width;
    const h = plotCanvas.height;
    const ctx = plotCanvas.getContext('2d');
    const ySpan = yHi - yLo || 1;

    function toX(x) { return pad.left + ((x - xMin) / (xMax - xMin)) * plotW; }
    function toY(y) { return pad.top + plotH - ((y - yLo) / ySpan) * plotH; }

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(90, 100, 130, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    var nTicks = 10;
    var tickLen = 4;
    ctx.fillStyle = '#e0e8f0';
    ctx.font = '10px JetBrains Mono, monospace';
    for (var i = 0; i <= nTicks; i++) {
      var t = i / nTicks;
      var xVal = xMin + t * (xMax - xMin);
      var yVal = yLo + t * (yHi - yLo);
      var px = pad.left + t * plotW;
      var py = pad.top + plotH - t * plotH;
      ctx.strokeStyle = 'rgba(90, 100, 130, 0.6)';
      ctx.beginPath();
      ctx.moveTo(px, pad.top + plotH);
      ctx.lineTo(px, pad.top + plotH + tickLen);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pad.left - tickLen, py);
      ctx.lineTo(pad.left, py);
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillText(String(round2(xVal)), px, pad.top + plotH + 14);
      ctx.textAlign = 'right';
      ctx.fillText(String(round2(yVal)), pad.left - 8, py + 4);
    }

    const plotColor = yKey === 'chamberPressure_MPa' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 212, 170, 0.95)';
    ctx.strokeStyle = plotColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(toX(points[0].x), toY(points[0].y));
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(toX(points[i].x), toY(points[i].y));
    }
    ctx.stroke();

    ctx.fillStyle = yKey === 'chamberPressure_MPa' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 212, 170, 0.5)';
    points.forEach(function (p) {
      ctx.beginPath();
      ctx.arc(toX(p.x), toY(p.y), 2, 0, Math.PI * 2);
      ctx.fill();
    });

    if (cursor != null && typeof cursor.x === 'number') {
      const yVal = getYAtX(points, cursor.x);
      if (yVal != null && plotCursorValue) {
        const cx = toX(cursor.x);
        const cy = toY(yVal);
        const size = 10;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx + size, cy);
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx, cy + size);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(0, 212, 170, 1)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx - size, cy);
        ctx.lineTo(cx + size, cy);
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx, cy + size);
        ctx.stroke();
        plotCursorValue.textContent = 'x = ' + round2(cursor.x) + '  →  y = ' + round2(yVal);
        plotCursorValue.style.display = 'block';
      }
    } else if (plotCursorValue) {
      plotCursorValue.style.display = 'none';
    }
  }

  function onPlotMouseMove(e) {
    if (!plotState) return;
    const rect = plotCanvas.getBoundingClientRect();
    const scaleX = plotCanvas.width / rect.width;
    const scaleY = plotCanvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const { xMin, xMax, pad, plotW } = plotState;
    if (mx >= pad.left && mx <= pad.left + plotW) {
      const dataX = xMin + (mx - pad.left) / plotW * (xMax - xMin);
      drawPlot({ x: dataX });
    } else {
      drawPlot(null);
      if (plotCursorValue) plotCursorValue.style.display = 'none';
    }
  }

  function onPlotMouseLeave() {
    drawPlot(null);
    if (plotCursorValue) plotCursorValue.style.display = 'none';
  }

  plotCanvas.addEventListener('mousemove', onPlotMouseMove);
  plotCanvas.addEventListener('mouseleave', onPlotMouseLeave);

  [plotX, plotY, plotXMin, plotXMax].forEach(function (el) {
    if (el) el.addEventListener('change', runPlot);
    if (el) el.addEventListener('input', runPlot);
  });

  setTimeout(runPlot, 50);

  // ----- Normalized relationships: multiple inputs can vary (each with own range), constant = main form -----
  const NORM_INPUT_KEYS = ['temperature', 'altitude', 'chamber_volume', 'barrel_diameter', 'barrel_length', 'projectile_mass'];
  const NORM_INPUT_LABELS = {
    temperature: 'Temperature (°C)',
    altitude: 'Altitude (m)',
    chamber_volume: 'Chamber vol. (L)',
    barrel_diameter: 'Barrel diam. (mm)',
    barrel_length: 'Barrel length (mm)',
    projectile_mass: 'Projectile mass (g)'
  };
  const NORM_OUTPUTS = [
    { key: 'muzzleVelocity', label: 'Muzzle velocity' },
    { key: 'kineticEnergy_J', label: 'Kinetic energy (J)' },
    { key: 'chamberPressure_MPa', label: 'Chamber pressure (MPa)' },
    { key: 'rifleEfficiency_percent', label: 'Efficiency (%)' },
    { key: 'timeInBarrel_ms', label: 'Time in barrel (ms)' },
    { key: 'fuelVolumeMl', label: 'Fuel volume (mL)' }
  ];
  const NORM_COLORS = ['#00d4aa', '#3b82f6', '#ffffff', '#eab308', '#ef4444', '#8b5cf6'];

  const normCanvas = document.getElementById('normCanvas');
  const normHint = document.getElementById('normHint');
  const normCursorInputs = document.getElementById('normCursorInputs');

  function isNormVarying(inputKey) {
    const cb = document.getElementById('norm_var_' + inputKey);
    return cb && cb.checked;
  }

  function getNormRange(inputKey) {
    const minEl = document.getElementById('norm_' + inputKey + '_min');
    const maxEl = document.getElementById('norm_' + inputKey + '_max');
    const min = minEl ? parseFloat(minEl.value) : NaN;
    const max = maxEl ? parseFloat(maxEl.value) : NaN;
    return { min, max };
  }

  function getNormParamsAtT(t) {
    const base = getInputs();
    const params = { ...base };
    NORM_INPUT_KEYS.forEach(function (key) {
      if (isNormVarying(key)) {
        const r = getNormRange(key);
        if (!isNaN(r.min) && !isNaN(r.max)) {
          const v = r.min + t * (r.max - r.min);
          params[key] = String(v);
        }
      }
    });
    return params;
  }

  function validateNormRanges() {
    for (let i = 0; i < NORM_INPUT_KEYS.length; i++) {
      const key = NORM_INPUT_KEYS[i];
      if (!isNormVarying(key)) continue;
      const r = getNormRange(key);
      if (isNaN(r.min) || isNaN(r.max) || r.min >= r.max) return key;
    }
    return null;
  }

  document.querySelectorAll('.norm-var-cb').forEach(function (cb) {
    cb.addEventListener('change', runNormPlot);
  });
  document.querySelectorAll('.norm-range').forEach(function (el) {
    el.addEventListener('input', runNormPlot);
    el.addEventListener('change', runNormPlot);
  });

  let normState = null;

  function runNormPlot() {
    const invalidKey = validateNormRanges();
    if (invalidKey) {
      normHint.textContent = 'For each checked "Vary" input, set Min < Max.';
      normState = null;
      if (normCanvas) normCanvas.getContext('2d').clearRect(0, 0, normCanvas.width, normCanvas.height);
      return;
    }
    const base = getInputs();
    const N = 100;
    const tValues = [];
    const seriesByKey = {};
    NORM_OUTPUTS.forEach(function (o) { seriesByKey[o.key] = []; });

    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const params = getNormParamsAtT(t);
      const r = window.calculate(
        fuelSelect.value,
        params.temperature,
        params.altitude,
        params.chamber_volume,
        params.barrel_diameter,
        params.barrel_length,
        params.projectile_mass
      );
      tValues.push(t);
      NORM_OUTPUTS.forEach(function (o) {
        let v = r && r[o.key];
        if (v == null || (typeof v === 'number' && isNaN(v))) v = 0;
        if (o.key === 'chamberPressure_MPa') v = round2(v);
        seriesByKey[o.key].push(v);
      });
    }

    const normalized = {};
    NORM_OUTPUTS.forEach(function (o) {
      const arr = seriesByKey[o.key];
      const min = Math.min.apply(null, arr);
      const max = Math.max.apply(null, arr);
      const range = max - min || 1;
      normalized[o.key] = arr.map(function (v) { return (v - min) / range; });
    });

    normHint.textContent = '';
    const pad = { left: 52, right: 140, top: 28, bottom: 36 };
    const plotW = normCanvas.width - pad.left - pad.right;
    const plotH = normCanvas.height - pad.top - pad.bottom;
    normState = {
      tValues,
      normalized,
      rawSeries: seriesByKey,
      pad,
      plotW,
      plotH
    };
    drawNormPlot(null);
  }

  function getValAtT(tValues, arr, t) {
    if (!arr || arr.length === 0) return null;
    if (t <= tValues[0]) return arr[0];
    if (t >= tValues[tValues.length - 1]) return arr[arr.length - 1];
    for (let i = 0; i < tValues.length - 1; i++) {
      if (tValues[i] <= t && t <= tValues[i + 1]) {
        const u = (t - tValues[i]) / (tValues[i + 1] - tValues[i]);
        return arr[i] + u * (arr[i + 1] - arr[i]);
      }
    }
    return arr[0];
  }

  const normCursorValue = document.getElementById('normCursorValue');

  function drawNormPlot(cursor) {
    if (!normState || !normCanvas) return;
    const { tValues, normalized, rawSeries, pad, plotW, plotH } = normState;
    const w = normCanvas.width;
    const h = normCanvas.height;
    const ctx = normCanvas.getContext('2d');
    const xMin = 0;
    const xMax = 1;
    const ySpan = 1;

    function toX(t) { return pad.left + (t / (xMax - xMin)) * plotW; }
    function toY(y) { return pad.top + plotH - (y / ySpan) * plotH; }

    ctx.clearRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(90, 100, 130, 0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    ctx.fillStyle = '#e0e8f0';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('0', pad.left - 6, pad.top + plotH + 14);
    ctx.textAlign = 'left';
    ctx.fillText('1', pad.left + plotW + 6, pad.top + plotH + 14);
    ctx.textAlign = 'right';
    ctx.fillText('0', pad.left - 6, pad.top + plotH + 2);
    ctx.fillText('1', pad.left - 6, pad.top - 2);

    NORM_OUTPUTS.forEach(function (o, idx) {
      const color = NORM_COLORS[idx % NORM_COLORS.length];
      const pts = normalized[o.key];
      if (!pts || pts.length === 0) return;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(toX(tValues[0]), toY(pts[0]));
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(toX(tValues[i]), toY(pts[i]));
      }
      ctx.stroke();
    });

    const legendLeft = pad.left + plotW + 12;
    let legendY = pad.top + 8;
    ctx.font = '11px JetBrains Mono, sans-serif';
    ctx.textAlign = 'left';
    NORM_OUTPUTS.forEach(function (o, idx) {
      const color = NORM_COLORS[idx % NORM_COLORS.length];
      ctx.fillStyle = color;
      ctx.fillRect(legendLeft, legendY - 6, 12, 3);
      ctx.fillStyle = '#e0e8f0';
      ctx.fillText(o.label, legendLeft + 16, legendY);
      legendY += 18;
    });

    if (cursor != null && typeof cursor.t === 'number') {
      const t = cursor.t;
      NORM_OUTPUTS.forEach(function (o, idx) {
        const normVal = getValAtT(tValues, normalized[o.key], t);
        if (normVal == null) return;
        const color = NORM_COLORS[idx % NORM_COLORS.length];
        const cx = toX(t);
        const cy = toY(normVal);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });
      if (normCursorInputs) {
        const params = getNormParamsAtT(t);
        const lines = NORM_INPUT_KEYS.map(function (key) {
          const label = NORM_INPUT_LABELS[key];
          const val = params[key];
          const num = parseFloat(val);
          return label + ': ' + (isNaN(num) ? val : round2(num));
        });
        normCursorInputs.style.whiteSpace = 'pre-line';
        normCursorInputs.textContent = lines.join('\n');
        normCursorInputs.style.display = 'block';
      }
      if (normCursorValue && rawSeries) {
        const parts = [];
        NORM_OUTPUTS.forEach(function (o, idx) {
          const v = getValAtT(tValues, rawSeries[o.key], t);
          if (v != null) {
            const color = NORM_COLORS[idx % NORM_COLORS.length];
            parts.push('<span style="color:' + color + '">' + o.label + ': ' + round2(v) + '</span>');
          }
        });
        normCursorValue.innerHTML = parts.join('<br/>');
        normCursorValue.style.display = 'block';
      }
    } else {
      if (normCursorInputs) normCursorInputs.style.display = 'none';
      if (normCursorValue) normCursorValue.style.display = 'none';
    }
  }

  function onNormMouseMove(e) {
    if (!normState) return;
    const rect = normCanvas.getBoundingClientRect();
    const scaleX = normCanvas.width / rect.width;
    const mx = (e.clientX - rect.left) * scaleX;
    const { pad, plotW } = normState;
    if (mx >= pad.left && mx <= pad.left + plotW) {
      const t = (mx - pad.left) / plotW;
      drawNormPlot({ t: t });
    } else {
      drawNormPlot(null);
      if (normCursorInputs) normCursorInputs.style.display = 'none';
      if (normCursorValue) normCursorValue.style.display = 'none';
    }
  }

  function onNormMouseLeave() {
    drawNormPlot(null);
    if (normCursorInputs) normCursorInputs.style.display = 'none';
    if (normCursorValue) normCursorValue.style.display = 'none';
  }

  normCanvas.addEventListener('mousemove', onNormMouseMove);
  normCanvas.addEventListener('mouseleave', onNormMouseLeave);

  setTimeout(runNormPlot, 100);
})();
