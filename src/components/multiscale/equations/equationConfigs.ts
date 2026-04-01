// Structured equation definitions for all 4 levels.
// Each equation is an array of segments. Segments with a `termId` can be
// targeted by GSAP for highlight animations.

export interface EquationSegment {
  latex: string;
  termId?: string;
}

export interface EquationConfig {
  segments: EquationSegment[];
  ariaLabel: string;
}

// Sub-equations that appear when specific terms are active
export interface SubEquation {
  /** Show this sub-equation when this term is active */
  termId: string;
  segments: EquationSegment[];
  ariaLabel: string;
}

export interface EquationSet {
  main: EquationConfig;
  subs: SubEquation[];
}

export const EQUATIONS: Record<string, EquationSet> = {
  // ─── MESOSCALE: General coarse-grained force decomposition ───
  cg: {
    main: {
      segments: [
        { latex: "\\mathbf{F}_i = \\sum_{j \\neq i}" },
        { latex: "\\mathbf{F}_{ij}^{\\mathrm{nb}}", termId: "Fnb" },
        { latex: "+ \\sum_{\\mathrm{bonds}}" },
        { latex: "\\mathbf{F}_{ij}^{\\mathrm{bond}}", termId: "Fbond" },
        { latex: "+" },
        { latex: "\\mathbf{F}_i^{\\mathrm{thermo}}", termId: "Fthermo" },
      ],
      ariaLabel:
        "Total force on a CG bead equals non-bonded, bonded, and thermostat contributions.",
    },
    subs: [
      {
        termId: "Fnb",
        segments: [
          { latex: "\\mathbf{F}^{\\mathrm{nb}}_{ij}", termId: "Fnb" },
          { latex: "= a_{ij} \\, w(r_{ij}) \\, \\hat{\\mathbf{r}}_{ij}" },
        ],
        ariaLabel: "Non-bonded force: soft repulsion with strength a-ij and weight function w.",
      },
      {
        termId: "Fbond",
        segments: [
          { latex: "V_{\\mathrm{FENE}}(r)", termId: "Fbond" },
          { latex: "= -\\tfrac{1}{2} k b^2 \\ln\\!\\bigl(1 - \\tfrac{r^2}{b^2}\\bigr)" },
        ],
        ariaLabel: "FENE bond potential: nonlinear spring with maximum extension b.",
      },
      {
        termId: "Fthermo",
        segments: [
          { latex: "\\sigma^2 = 2\\gamma\\, k_B T", termId: "Fthermo" },
        ],
        ariaLabel: "Fluctuation-dissipation relation: noise amplitude squared equals two gamma times thermal energy.",
      },
    ],
  },

  // ─── ALL-ATOM: Classical force field ───
  classical: {
    main: {
      segments: [
        { latex: "U =" },
        { latex: "U_{\\mathrm{bond}}", termId: "Ubond" },
        { latex: "+" },
        { latex: "U_{\\mathrm{angle}}", termId: "Uangle" },
        { latex: "+" },
        { latex: "U_{\\mathrm{dih}}", termId: "Udihedral" },
        { latex: "+" },
        { latex: "U_{\\mathrm{vdW}}", termId: "UvdW" },
        { latex: "+" },
        { latex: "U_{\\mathrm{Coul}}", termId: "UCoul" },
      ],
      ariaLabel:
        "Total potential energy equals the sum of bond, angle, dihedral, van der Waals, and Coulombic terms.",
    },
    subs: [
      {
        termId: "Ubond",
        segments: [
          { latex: "U_{\\mathrm{bond}}", termId: "Ubond" },
          { latex: "= \\sum \\frac{1}{2} k_b (r - r_0)^2" },
        ],
        ariaLabel: "Bond potential: harmonic spring with equilibrium distance r0.",
      },
      {
        termId: "Uangle",
        segments: [
          { latex: "U_{\\mathrm{angle}}", termId: "Uangle" },
          { latex: "= \\sum \\frac{1}{2} k_\\theta (\\theta - \\theta_0)^2" },
        ],
        ariaLabel: "Angle potential: harmonic in the bending angle theta.",
      },
      {
        termId: "Udihedral",
        segments: [
          { latex: "U_{\\mathrm{dih}}", termId: "Udihedral" },
          { latex: "= \\sum k_\\phi [1 + \\cos(n\\phi - \\phi_s)]" },
        ],
        ariaLabel: "Dihedral potential: cosine function of the torsion angle.",
      },
      {
        termId: "UvdW",
        segments: [
          { latex: "U_{\\mathrm{vdW}}", termId: "UvdW" },
          { latex: "= \\sum_{i<j} 4\\epsilon \\bigl[(\\tfrac{\\sigma}{r})^{12} - (\\tfrac{\\sigma}{r})^{6}\\bigr]" },
        ],
        ariaLabel: "Lennard-Jones 12-6 potential for van der Waals interactions.",
      },
      {
        termId: "UCoul",
        segments: [
          { latex: "U_{\\mathrm{Coul}}", termId: "UCoul" },
          { latex: "= \\sum_{i<j} \\tfrac{q_i q_j}{4\\pi\\varepsilon_0 r_{ij}}" },
        ],
        ariaLabel: "Coulomb potential for electrostatic interactions.",
      },
    ],
  },

  // ─── MLFF: Per-atom energy decomposition ───
  mlff: {
    main: {
      segments: [
        { latex: "E(\\mathbf{R})", termId: "ER" },
        { latex: "= \\sum_{i=1}^{N}" },
        { latex: "E_i", termId: "Ei" },
        { latex: "(", },
        { latex: "\\mathcal{N}_i", termId: "Ni" },
        { latex: ")" },
      ],
      ariaLabel:
        "Total energy is the sum of per-atom energies, each depending on the local chemical neighborhood.",
    },
    subs: [
      {
        termId: "Fi",
        segments: [
          { latex: "\\mathbf{F}_i", termId: "Fi" },
          { latex: "= -\\frac{\\partial E}{\\partial \\mathbf{R}_i}" },
        ],
        ariaLabel: "Force on atom i is the negative gradient of total energy with respect to position.",
      },
    ],
  },

  // ─── DFT: Kohn-Sham equation ───
  ks: {
    main: {
      segments: [
        { latex: "\\bigl[" },
        { latex: "-\\tfrac{1}{2}\\nabla^2", termId: "kinetic" },
        { latex: "+" },
        { latex: "V_{\\mathrm{ext}}", termId: "Vext" },
        { latex: "+" },
        { latex: "V_{\\mathrm{H}}", termId: "Hartree" },
        { latex: "+" },
        { latex: "V_{\\mathrm{xc}}", termId: "Vxc" },
        { latex: "\\bigr]" },
        { latex: "\\phi_i", termId: "phi" },
        { latex: "= \\epsilon_i \\, \\phi_i" },
      ],
      ariaLabel:
        "Kohn-Sham equation: kinetic plus external plus Hartree plus exchange-correlation potential acting on orbital phi-i equals eigenvalue times phi-i.",
    },
    subs: [
      {
        termId: "rho",
        segments: [
          { latex: "\\rho(\\mathbf{r})", termId: "rho" },
          { latex: "= \\sum_i f_i \\, |\\phi_i(\\mathbf{r})|^2" },
        ],
        ariaLabel: "Electron density is the sum of occupation numbers times orbital densities.",
      },
    ],
  },
};
