/**
 * Flammable vapor gun calculator – same logic as Python (ethanol, diethyl ether, HHO).
 * Van der Waals equation solved numerically (Newton-Raphson).
 */

const R = 8.31432;           // J/(mol*K)
const g = 9.80665;           // m/s²
const M_air = 0.0289644;     // kg/mol
const p0 = 101325;           // Pa
const COF = 0.5192971331;

function solveVanDerWaals(P, V, T, a, b, maxIter = 50) {
  // (P + a*n²/V²)(V/n - b) = R*T  =>  solve for n
  const idealN = (P * V) / (R * T);
  let n = Math.max(idealN, 1e-10);
  for (let i = 0; i < maxIter; i++) {
    const n2 = n * n;
    const V2 = V * V;
    const f = (P + (a * n2) / V2) * (V / n - b) - R * T;
    const df = (2 * a * n / V2) * (V / n - b) + (P + (a * n2) / V2) * (-V / n2);
    const nNew = n - f / df;
    if (nNew <= 0) n = n / 2;
    else n = nNew;
    if (Math.abs(f) < 1e-6) break;
  }
  return n;
}

function getEnvironment(temperatureC, altitude) {
  const temperature = temperatureC + 273.15;
  const pressure = p0 * Math.exp(-g * M_air * altitude / (R * temperature));
  const air_density = pressure / ((R / M_air) * temperature);
  return { temperature, pressure, air_density };
}

function calcEthanol(env, chamberVolumeL, barrelDiameterMm, barrelLengthMm, projectileMassG) {
  const chamberVolume = chamberVolumeL;
  const volumeM3 = chamberVolume / 1000;

  const o2_P = env.pressure * 0.2095;
  const o2_V = volumeM3;
  const o2_a = 1.382, o2_b = 0.03186;
  const n_o2 = solveVanDerWaals(o2_P, o2_V, env.temperature, o2_a, o2_b);

  const LEL = 3.3, UEL = 19;
  const fuel_P = env.pressure * ((LEL + UEL) / 2) / 100;
  const fuel_a = 12.18, fuel_b = 0.08407;
  const n_fuel = solveVanDerWaals(fuel_P, o2_V, env.temperature, fuel_a, fuel_b);

  const DIPPR = { A: 99.3974, B: 0.310729, C: 513.18, D: 0.305143 };
  const fuel_density = (DIPPR.A / Math.pow(DIPPR.B, 1 + Math.pow(1 - env.temperature / DIPPR.C, DIPPR.D))) / 1000;
  const molar_mass = 0.04607;
  const fuel_mass_kg = molar_mass * n_fuel;
  const fuel_volume_L = fuel_mass_kg / fuel_density;

  const used_fuel = n_o2 / 6;
  const products = used_fuel * 5;
  const co2 = products * 2 / 5, h2o = products * 3 / 5;
  const dH_ethanol = -234.8, dH_co2 = -393.5, dH_h2o = -241.8;
  const combustion_energy = (dH_ethanol * used_fuel) - (dH_co2 * co2) - (dH_h2o * h2o);

  return runBarrelAndMotion(
    env, chamberVolumeL, barrelDiameterMm, barrelLengthMm, projectileMassG,
    combustion_energy,
    { fuelMassG: fuel_mass_kg * 1000, fuelVolumeMl: fuel_volume_L * 1000, fuelLabel: 'Ethanol (mL)' }
  );
}

function calcDiethylEther(env, chamberVolumeL, barrelDiameterMm, barrelLengthMm, projectileMassG) {
  const volumeM3 = chamberVolumeL / 1000;

  const o2_P = env.pressure * 0.2095;
  const o2_V = volumeM3;
  const n_o2 = solveVanDerWaals(o2_P, o2_V, env.temperature, 1.382, 0.03186);

  const LEL = 1.9, UEL = 36;
  const fuel_P = env.pressure * ((LEL + UEL) / 2) / 100;
  const n_fuel = solveVanDerWaals(fuel_P, o2_V, env.temperature, 17.61, 0.1344);

  const DIPPR = { A: 70.6361, B: 0.26782, C: 466.578, D: 0.28243 };
  const fuel_density = (DIPPR.A / Math.pow(DIPPR.B, 1 + Math.pow(1 - env.temperature / DIPPR.C, DIPPR.D))) / 1000;
  const molar_mass = 0.04607;
  const fuel_mass_kg = molar_mass * n_fuel;
  const fuel_volume_L = fuel_mass_kg / fuel_density;

  const used_fuel = n_o2 / 6;
  const products = used_fuel * 9;
  const co2 = products * 4 / 9, h2o = products * 5 / 9;
  const dH_ether = -252.7, dH_co2 = -393.5, dH_h2o = -241.8;
  const combustion_energy = (dH_ether * used_fuel) - (dH_co2 * co2) - (dH_h2o * h2o);

  return runBarrelAndMotion(
    env, chamberVolumeL, barrelDiameterMm, barrelLengthMm, projectileMassG,
    combustion_energy,
    { fuelMassG: fuel_mass_kg * 1000, fuelVolumeMl: fuel_volume_L * 1000, fuelLabel: 'Diethyl ether (mL)' }
  );
}

function calcHHO(env, chamberVolumeL, barrelDiameterMm, barrelLengthMm, projectileMassG) {
  const volumeM3 = chamberVolumeL / 1000;

  const o2_P = env.pressure / 3;
  const o2_V = volumeM3;
  const n_o2 = solveVanDerWaals(o2_P, o2_V, env.temperature, 1.382, 0.03186);

  const n_h2 = n_o2 * 2;
  const used_h2 = n_o2 * 2;
  const h2o = used_h2;
  const dH_h2 = 0, dH_h2o = -241.8;
  const combustion_energy = (dH_h2 * used_h2) - (dH_h2o * h2o);

  return runBarrelAndMotion(
    env, chamberVolumeL, barrelDiameterMm, barrelLengthMm, projectileMassG,
    combustion_energy,
    { fuelMassG: null, fuelVolumeMl: null, fuelLabel: 'HHO (2:1)' }
  );
}

function runBarrelAndMotion(env, chamberVolumeL, barrelDiameterMm, barrelLengthMm, projectileMassG, combustion_energy, fuelInfo) {
  const chamberPressure_MPa = combustion_energy / chamberVolumeL;
  const netPressure_MPa = chamberPressure_MPa - env.pressure / 1e6;

  const radiusMm = barrelDiameterMm / 2;
  const areaMm2 = Math.PI * radiusMm * radiusMm;
  const volumeL = (areaMm2 * barrelLengthMm) / 1e6;
  const totalVolumeL = chamberVolumeL + volumeL;
  const muzzlePressure_MPa = (chamberPressure_MPa / (totalVolumeL / chamberVolumeL)) - (env.pressure / 1e6);
  const massOfAir_kg = env.air_density * (volumeL / 1000);

  const initialForce = areaMm2 * netPressure_MPa;
  const muzzleForce = areaMm2 * muzzlePressure_MPa;
  const averageForce = (initialForce + muzzleForce) / 2;
  const frictionForce = (projectileMassG / 1000) * g * COF;
  const netForce = averageForce - frictionForce;

  const projectileMassKg = projectileMassG / 1000;
  const acceleration = netForce / (projectileMassKg + massOfAir_kg);
  const barrelLengthM = barrelLengthMm / 1000;
  const muzzleVelocity = Math.sqrt(2 * acceleration * barrelLengthM);
  const kineticEnergy = 0.5 * projectileMassKg * muzzleVelocity * muzzleVelocity;
  const timeInBarrel_s = muzzleVelocity / acceleration;
  const rifleEfficiency = (kineticEnergy / (combustion_energy * 1000)) * 100;

  return {
    atmosphericPressure_Pa: env.pressure,
    chamberPressure_MPa,
    netPressure_MPa,
    muzzleVelocity,
    mach: muzzleVelocity / 343,
    kineticEnergy_J: kineticEnergy,
    timeInBarrel_ms: timeInBarrel_s * 1000,
    rifleEfficiency_percent: rifleEfficiency,
    initialForce_N: initialForce,
    muzzleForce_N: muzzleForce,
    averageForce_N: averageForce,
    frictionForce_N: frictionForce,
    netForce_N: netForce,
    acceleration_ms2: acceleration,
    combustion_energy_kJ: combustion_energy,
    ...fuelInfo
  };
}

function calculate(fuel, temperatureC, altitude, chamberVolumeL, barrelDiameterMm, barrelLengthMm, projectileMassG) {
  const env = getEnvironment(parseFloat(temperatureC), parseFloat(altitude));
  const cVol = parseFloat(chamberVolumeL);
  const bD = parseFloat(barrelDiameterMm);
  const bL = parseFloat(barrelLengthMm);
  const pM = parseFloat(projectileMassG);

  if (fuel === 'ethanol') return calcEthanol(env, cVol, bD, bL, pM);
  if (fuel === 'diethyl_ether') return calcDiethylEther(env, cVol, bD, bL, pM);
  if (fuel === 'HHO') return calcHHO(env, cVol, bD, bL, pM);
  return null;
}
