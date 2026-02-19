/**
 * Ballistics calculator: trajectory with drag profiles for Pellet (GA) and Slug (SLG0).
 * Drag tables: Cd vs Mach. Trajectory integrated until impact (flat ground).
 */

(function () {
  'use strict';

  const g = 9.80665;
  const c_sound = 343; // m/s approx
  const R = 8.31432;   // J/(mol·K)
  const M_air = 0.0289644; // kg/mol
  const p0 = 101325;   // Pa, sea-level reference

  // Van der Waals constants for air (effective); SI: a Pa·m⁶/mol², b m³/mol
  const a_air = 0.1358;
  const b_air = 3.64e-5;
  const LAPSE_K_PER_M = 0.0065; // standard troposphere lapse rate

  /**
   * Air density (kg/m³) from P, T using Van der Waals (real gas).
   * Solves P = RTν/(1−bν) − aν² for ν = n/V, then ρ = ν·M_air.
   */
  function densityFromRealGas(pressurePa, tempK) {
    const P = pressurePa;
    const T = tempK;
    let nu = P / (R * T); // ideal-gas initial guess
    for (let i = 0; i < 20; i++) {
      const oneMinusBnu = 1 - b_air * nu;
      if (oneMinusBnu <= 0) return P * M_air / (R * T); // fallback ideal
      const f = (R * T * nu) / oneMinusBnu - a_air * nu * nu - P;
      const df = (R * T) / (oneMinusBnu * oneMinusBnu) - 2 * a_air * nu;
      const nuNew = nu - f / df;
      if (nuNew <= 0) nu = nu * 0.5;
      else nu = nuNew;
      if (Math.abs(f) < 1e-6) break;
    }
    return nu * M_air;
  }

  /**
   * P and T at height y (m) above ground. Ground: T_ground (K), altitude (m) ASL.
   * Uses barometric pressure at ground and lapse rate T(y) = T_ground − L·y.
   */
  function atmosphereAtHeight(yAboveGround, groundTempK, groundAltitudeM) {
    const P_ground = p0 * Math.exp(-g * M_air * groundAltitudeM / (R * groundTempK));
    const T = groundTempK - LAPSE_K_PER_M * yAboveGround;
    const T_ground = groundTempK;
    if (T <= 0) {
      return { P: P_ground * 0.5, T: 273.15 };
    }
    const expo = (g * M_air) / (R * LAPSE_K_PER_M);
    const P = P_ground * Math.pow(T / T_ground, expo);
    return { P: P, T: T };
  }

  // SLG0 drag (reference slug / airgun slug) – subsonic/transonic from wind-tunnel data, supersonic extended
  const SLG0_MACH = [0, 0.045, 0.089, 0.134, 0.179, 0.223, 0.268, 0.313, 0.357, 0.402, 0.446, 0.491, 0.536, 0.58, 0.625, 0.67, 0.714, 0.759, 0.804, 0.848, 0.893, 0.938, 0.982, 1.027, 1.15, 1.3, 1.5, 2, 2.5, 3, 4, 5];
  const SLG0_CD = [0.21, 0.205, 0.201, 0.198, 0.195, 0.194, 0.193, 0.194, 0.197, 0.2, 0.204, 0.208, 0.212, 0.217, 0.222, 0.227, 0.234, 0.24, 0.246, 0.252, 0.269, 0.323, 0.453, 0.614, 0.62, 0.61, 0.58, 0.54, 0.52, 0.51, 0.50, 0.495];

  // Pellet (GA): GA-style drag model (domed pellet, high drag, strong transonic rise)
  const PELLET_GA_MACH = [0, 0.2, 0.3, 0.5, 0.7, 0.9, 1, 1.2, 1.5, 2, 3];
  const PELLET_GA_CD = [0.25, 0.21, 0.207, 0.189, 0.202, 0.488, 0.597, 0.649, 0.667, 0.602, 0.521];

  function interpolateCd(mach, machArr, cdArr) {
    if (mach <= machArr[0]) return cdArr[0];
    if (mach >= machArr[machArr.length - 1]) return cdArr[cdArr.length - 1];
    for (let i = 0; i < machArr.length - 1; i++) {
      if (mach >= machArr[i] && mach <= machArr[i + 1]) {
        const t = (mach - machArr[i]) / (machArr[i + 1] - machArr[i]);
        return cdArr[i] + t * (cdArr[i + 1] - cdArr[i]);
      }
    }
    return cdArr[cdArr.length - 1];
  }

  function getDragProfile(ammoType) {
    switch (ammoType) {
      case 'pellet': return { mach: PELLET_GA_MACH, cd: PELLET_GA_CD };
      case 'slug':   return { mach: SLG0_MACH, cd: SLG0_CD };
      default:       return { mach: PELLET_GA_MACH, cd: PELLET_GA_CD };
    }
  }

  function cdAtMach(mach, ammoType) {
    const p = getDragProfile(ammoType);
    return interpolateCd(mach, p.mach, p.cd);
  }

  /**
   * Air density (kg/m³) from pressure and temperature (ISA-style).
   * p in Pa, T in K. rho = p / (R_specific * T)
   */
  function airDensity(pressurePa, tempK) {
    const R_air = 287.05;
    return pressurePa / (R_air * tempK);
  }

  /**
   * Trajectory: flat ground, 2D (x horizontal, y vertical up).
   * rhoOrGetRho: constant rho (kg/m³) or function getRho(y) for density at height y (real gas at each step).
   */
  function computeTrajectory(v0, angleDeg, massKg, diameterM, rhoOrGetRho, ammoType, launchHeightM) {
    const y0 = launchHeightM != null ? launchHeightM : 0;
    const getRho = typeof rhoOrGetRho === 'function' ? rhoOrGetRho : function () { return rhoOrGetRho; };
    const angleRad = (angleDeg * Math.PI) / 180;
    let vx = v0 * Math.cos(angleRad);
    let vy = v0 * Math.sin(angleRad);
    let x = 0;
    let y = y0;
    let t = 0;
    const dt = 0.001;
    const A = Math.PI * (diameterM / 2) * (diameterM / 2);
    const path = [];
    const v0Sq = v0 * v0;
    const E0 = 0.5 * massKg * v0Sq;

    path.push({ x: 0, y: y0, v: v0, E: E0, t: 0 });

    while (y >= 0 && t < 60) {
      const v = Math.sqrt(vx * vx + vy * vy);
      if (v < 0.1) break;
      const rho = getRho(y);
      const mach = v / c_sound;
      const cd = cdAtMach(mach, ammoType);
      const Fdrag = 0.5 * rho * cd * A * v * v;
      const ax = -(Fdrag / massKg) * (vx / v);
      const ay = -g - (Fdrag / massKg) * (vy / v);
      vx += ax * dt;
      vy += ay * dt;
      x += vx * dt;
      y += vy * dt;
      t += dt;
      const vNew = Math.sqrt(vx * vx + vy * vy);
      const E = 0.5 * massKg * vNew * vNew;
      path.push({ x: x, y: y, v: vNew, E: E, t: t });
    }

    return path;
  }

  /**
   * Find points where energy drops to 90%, 80%, ..., 10% of E0 (every 10%).
   * path: array of { x, y, v, E, t }. Returns array of { x, y, v, E, percent }.
   */
  function energyMarkers(path) {
    if (!path.length) return [];
    const E0 = path[0].E;
    const markers = [];
    for (let nextPercent = 90; nextPercent >= 10; nextPercent -= 10) {
      const threshold = (nextPercent / 100) * E0;
      for (let i = 1; i < path.length; i++) {
        if (path[i].E <= threshold) {
          markers.push({
            x: path[i].x,
            y: path[i].y,
            v: path[i].v,
            E: path[i].E,
            percent: nextPercent
          });
          break;
        }
      }
    }
    return markers;
  }

  window.Ballistics = {
    computeTrajectory: computeTrajectory,
    energyMarkers: energyMarkers,
    getDragProfile: getDragProfile,
    cdAtMach: cdAtMach,
    airDensity: airDensity,
    densityFromRealGas: densityFromRealGas,
    atmosphereAtHeight: atmosphereAtHeight,
    c_sound: c_sound
  };
})();
