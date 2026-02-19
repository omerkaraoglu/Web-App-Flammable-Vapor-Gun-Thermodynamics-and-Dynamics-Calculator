# Flammable Vapor Gun Thermodynamics & Dynamics Calculator

A standalone web application for calculating thermodynamics and dynamics of flammable vapor guns (combustion-powered air guns). Enter chamber and barrel parameters, select a fuel, and obtain muzzle velocity, kinetic energy, chamber pressure, efficiency, and related outputs. Runs entirely in the browser—no server or installation required.

---

## Usage

Open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari). No build step or dependencies needed.

---

## Inputs

| Parameter | Unit | Description |
|-----------|------|-------------|
| **Temperature** | °C | Ambient air temperature |
| **Altitude** | m | Altitude above sea level (affects atmospheric pressure) |
| **Chamber volume** | L | Combustion chamber volume |
| **Barrel diameter** | mm | Internal barrel diameter |
| **Barrel length** | mm | Barrel length |
| **Projectile mass** | g | Mass of the projectile |

---

## Outputs

| Output | Unit | Description |
|--------|------|-------------|
| **Muzzle velocity** | m/s | Projectile exit velocity; Mach number shown |
| **Kinetic energy** | J | Projectile kinetic energy at muzzle |
| **Chamber pressure** | MPa | Peak chamber pressure from combustion |
| **Efficiency** | % | Rifle efficiency = kinetic energy / combustion energy × 100 |
| **Time in barrel** | ms | Duration of projectile travel in barrel |
| **Fuel amount** | mL | Liquid fuel volume (Ethanol, Diethyl Ether); HHO displays stoichiometry (2:1) |

---

## Fuels

| Fuel | LEL | UEL | Notes |
|------|-----|-----|-------|
| **Ethanol** | 3.3% | 19% | DIPPR 105 for liquid density |
| **Diethyl Ether** | 1.9% | 36% | DIPPR 105 for liquid density |
| **HHO** | — | — | Oxyhydrogen 2:1 H₂:O₂ stoichiometry |

**Important:** The LEL and UEL limits for Ethanol and Diethyl Ether are from test data of a cylindrical combustion chamber with **50 mm inner diameter**. Results may differ for other chamber geometries.

---

## Interactive Graphs

### Graph 1: Single-variable sweep

- **X axis:** Any input (temperature, altitude, chamber volume, barrel diameter, barrel length, projectile mass)
- **Y axis:** Any output (muzzle velocity, kinetic energy, chamber pressure, efficiency, time in barrel, fuel volume)
- **X range:** Set min and max values for the swept parameter
- **Axes:** 10 tick marks with labeled values
- **Hover:** Move the mouse over the graph to see interpolated values

### Graph 2: Normalized relationships

- **Purpose:** Compare all outputs on one chart while sweeping one or more inputs
- **Vary:** Check “Vary” for inputs to sweep; others use constant values from the main form
- **Ranges:** Set min–max for each varying input
- **Output:** All six outputs normalized to [0, 1] and plotted together

---

## Author

**Ömer Karaoğlu**  
[GitHub](https://github.com/omerkaraoglu) · [LinkedIn](https://www.linkedin.com/in/omer-karaoglu)

© 2026 Ömer Karaoğlu. All rights reserved.

---

## Sources

### Thermodynamics & gun outputs

- [Chemical Properties of Ethanol](https://pubchem.ncbi.nlm.nih.gov/compound/Ethanol#section=Chemical-and-Physical-Properties) – PubChem
- [Solving Equations with SymPy](https://problemsolvingwithpython.com/10-Symbolic-Math/10.06-Solving-Equations/) – Problem Solving with Python
- [LEL & UEL's of Various Fuels](https://www.wermac.org/safety/safety_what_is_lel_and_uel.html) – Wermac
- [Saturated Liquid Density (DIPPR 105)](http://ddbonline.ddbst.de/DIPPR105DensityCalculation/DIPPR105CalculationCGI.exe?component=Ethanol) – DDBST
- [Van der Waals Equation](https://en.wikipedia.org/wiki/Van_der_Waals_equation) – Wikipedia
- [Van der Waals Constants](https://en.wikipedia.org/wiki/Van_der_Waals_constants_(data_page)) – Wikipedia

### Ballistics & trajectory

- **Trajectory model:** 2D point-mass with gravity and quadratic drag; drag force \(F_d = \tfrac{1}{2} \rho C_d A v^2\); Euler integration with fixed time step. \(\rho\) is evaluated at each step (see Air density).  
  [Drag equation](https://en.wikipedia.org/wiki/Drag_equation) – Wikipedia  
  [External ballistics](https://en.wikipedia.org/wiki/External_ballistics) – Wikipedia
- **Atmosphere along path:** At height \(y\) above ground, temperature uses the standard lapse rate \(T(y) = T_0 - \Gamma y\) (\(\Gamma = 0.0065\,\mathrm{K/m}\)); pressure follows \(P(y) = P_0\,(T(y)/T_0)^{gM/(R\Gamma)}\) with \(P_0\) from the barometric formula at ground altitude.  
  [Barometric formula](https://en.wikipedia.org/wiki/Barometric_formula) – Wikipedia
- **Air density (real gas):** At each trajectory point, \(\rho\) is computed from local \(P\) and \(T\) using the Van der Waals equation for air (solve \(P = RT\nu/(1-b\nu) - a\nu^2\) for \(\nu = n/V\), then \(\rho = \nu M_{\mathrm{air}}\)). This gives a density (and effective gas behaviour) at every point instead of a constant ideal-gas \(\rho\).  
  [Van der Waals equation](https://en.wikipedia.org/wiki/Van_der_Waals_equation) – Wikipedia
- **Mach number:** Speed of sound taken as 343 m/s (approximate, for \(C_d\) lookup).
- **Drag coefficients:** \(C_d\) vs Mach from tabulated profiles: **Pellet (GA):** GA-style domed pellet (high drag, strong transonic rise). **Slug (SLG0):** Reference airgun slug; subsonic/transonic from wind-tunnel–style data, supersonic extended.
