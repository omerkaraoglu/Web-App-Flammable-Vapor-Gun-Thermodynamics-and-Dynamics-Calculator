# Flammable Vapor Gun Thermodynamics & Dynamics Calculator

A standalone web application for calculating thermodynamics and dynamics of flammable vapor guns (combustion-powered air guns). Enter chamber and barrel parameters, select a fuel, and obtain muzzle velocity, kinetic energy, chamber pressure, efficiency, and related outputs. Runs entirely in the browser—no server or installation required.

---

## Usage

Open `index.html` in a modern web browser (Chrome, Firefox, Edge, Safari). No build step or dependencies needed. Uses KaTeX for equation rendering and external fonts via CDN.

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

## Models and Equations

| Model | Purpose |
|-------|---------|
| **Barometric** | Atmospheric pressure vs altitude: \( p = p_0 \exp(-gM(h-h_0)/(RT)) \) |
| **Van der Waals** | Real gas behavior; solved numerically (Newton–Raphson) for mole count |
| **DIPPR 105** | Saturated liquid density vs temperature |
| **LEL/UEL** | Fuel partial pressure = \( P_{\text{atm}} \times (\text{LEL} + \text{UEL}) / 200 \) |
| **Combustion energy** | \( \Delta H_{\text{comb}} \) from enthalpy of formation |
| **Chamber pressure** | \( P_{\text{chamber}} = E_{\text{comb}} / V_{\text{chamber}} \) |
| **Net force** | \( F = A \cdot \Delta P - F_{\text{frict}} \) (includes friction) |
| **Acceleration / velocity** | \( a = F_{\text{net}} / m_{\text{total}} \); \( v^2 = 2aL \) |
| **Kinetic energy / efficiency** | \( E_k = \tfrac{1}{2}mv^2 \); \( \eta = E_k / E_{\text{comb}} \times 100\% \) |

**Friction:** Coefficient of friction (COF) = 0.5192971331; friction force = \( mg\mu \).

**Force model:** Uses average of initial and muzzle pressure for net acceleration.

---

## File Structure

```
├── index.html    # Main page
├── styles.css    # Styling
├── app.js        # UI, graphs, event handling
├── calculator.js # Calculation logic (Van der Waals, DIPPR, motion)
├── assets/       # rifle.png, projectile.png
└── README.md     # This file
```

---

## Author

**Ömer Karaoğlu**  
[GitHub](https://github.com/omerkaraoglu) · [LinkedIn](https://www.linkedin.com/in/omer-karaoglu)

© 2026 Ömer Karaoğlu. All rights reserved.

---

## Sources

- [Chemical Properties of Ethanol](https://pubchem.ncbi.nlm.nih.gov/compound/Ethanol#section=Chemical-and-Physical-Properties) – PubChem
- [Solving Equations with SymPy](https://problemsolvingwithpython.com/10-Symbolic-Math/10.06-Solving-Equations/) – Problem Solving with Python
- [LEL & UEL's of Various Fuels](https://www.wermac.org/safety/safety_what_is_lel_and_uel.html) – Wermac
- [Saturated Liquid Density (DIPPR 105)](http://ddbonline.ddbst.de/DIPPR105DensityCalculation/DIPPR105CalculationCGI.exe?component=Ethanol) – DDBST
- [Van der Waals Equation](https://en.wikipedia.org/wiki/Van_der_Waals_equation) – Wikipedia
- [Van der Waals Constants](https://en.wikipedia.org/wiki/Van_der_Waals_constants_(data_page)) – Wikipedia
