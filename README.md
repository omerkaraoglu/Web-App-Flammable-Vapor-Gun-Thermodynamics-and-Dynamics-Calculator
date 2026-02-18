# Flammable Vapor Gun Thermodynamics & Dynamics Calculator

A web application for calculating thermodynamics and dynamics of flammable vapor guns. Enter chamber and barrel parameters, choose a fuel (Ethanol, Diethyl Ether, or HHO), and get muzzle velocity, kinetic energy, chamber pressure, efficiency, and more.

## Usage

Open `index.html` in a web browser. No server or installation required.

## Features

- **Inputs:** Temperature, altitude, chamber volume, barrel diameter, barrel length, projectile mass
- **Fuels:** Ethanol, Diethyl Ether, HHO (oxyhydrogen)
- **Outputs:** Muzzle velocity, kinetic energy, chamber pressure, rifle efficiency, time in barrel
- **Interactive graphs:** Plot any input vs any output with adjustable ranges
- **Normalized relationships:** Compare all outputs on one chart while sweeping inputs

## Models Used

- **Barometric equation** for atmospheric pressure vs altitude
- **Van der Waals equation** for real gas behavior
- **DIPPR 105** for saturated liquid density
- **LEL/UEL** (Lower/Upper Explosive Limit) for fuel-air mixture

## Sources

- [Chemical Properties of Ethanol](https://pubchem.ncbi.nlm.nih.gov/compound/Ethanol#section=Chemical-and-Physical-Properties)
- [Solving Equations with SymPy](https://problemsolvingwithpython.com/10-Symbolic-Math/10.06-Solving-Equations/)
- [LEL & UEL's of Various Fuels](https://www.wermac.org/safety/safety_what_is_lel_and_uel.html)
- [Saturated Liquid Density (DIPPR 105)](http://ddbonline.ddbst.de/DIPPR105DensityCalculation/DIPPR105CalculationCGI.exe?component=Ethanol)
- [Van der Waals Equation](https://en.wikipedia.org/wiki/Van_der_Waals_equation)
- [Van der Waals Constants](https://en.wikipedia.org/wiki/Van_der_Waals_constants_(data_page))
