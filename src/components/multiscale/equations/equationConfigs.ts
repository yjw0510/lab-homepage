// Equation definitions synchronized with the 27-page narrative.

export interface EquationSegment {
  latex: string;
  termId?: string;
}

export interface EquationConfig {
  segments: EquationSegment[];
  ariaLabel: string;
}

export interface SubEquation {
  termId: string;
  segments: EquationSegment[];
  ariaLabel: string;
}

export interface EquationSet {
  main: EquationConfig;
  subs: SubEquation[];
}

export const EQUATIONS: Record<string, EquationSet> = {
  bornOppenheimer: {
    main: {
      segments: [
        { latex: "\\mathbf R^{(0)}\\rightarrow\\mathbf R^{(1)}\\rightarrow\\cdots\\rightarrow\\mathbf R^\\ast" },
        { latex: ",\\qquad" },
        { latex: "E_0\\!\\left(\\mathbf R^{(0)}\\right)>E_0\\!\\left(\\mathbf R^{(1)}\\right)>\\cdots>E_0\\!\\left(\\mathbf R^\\ast\\right)", termId: "E0" },
      ],
      ariaLabel: "Successive geometry updates and the corresponding decrease in DFT energy.",
    },
    subs: [],
  },

  ks: {
    main: {
      segments: [
        { latex: "\\bigl[" },
        { latex: "-\\tfrac12\\nabla^2", termId: "kinetic" },
        { latex: "+" },
        { latex: "V_{\\rm ext}", termId: "Vext" },
        { latex: "+" },
        { latex: "V_{\\rm H}[\\rho]", termId: "Hartree" },
        { latex: "+" },
        { latex: "V_{\\rm xc}[\\rho]", termId: "Vxc" },
        { latex: "\\bigr]\\phi_i=\\epsilon_i\\phi_i" },
      ],
      ariaLabel: "Kohn-Sham Hamiltonian with one kinetic operator and external, Hartree, and exchange-correlation potentials.",
    },
    subs: [],
  },

  scf: {
    main: {
      segments: [
        { latex: "\\rho^{(n)}", termId: "rhoIn" },
        { latex: "\\rightarrow" },
        { latex: "\\hat H_{\\rm KS}[\\rho^{(n)}]", termId: "veff" },
        { latex: "\\rightarrow" },
        { latex: "\\{\\phi_i^{(n)}\\}", termId: "orbitals" },
        { latex: "\\rightarrow" },
        { latex: "\\rho_{\\rm out}^{(n)}", termId: "rhoOut" },
      ],
      ariaLabel: "Self-consistent field cycle from input density through the Kohn-Sham solve to output density.",
    },
    subs: [
      {
        termId: "rhoOut",
        segments: [
          { latex: "\\rho^{(n+1)}=\\mathcal M\\!\\left(\\rho^{(n)},\\rho_{\\rm out}^{(n)}\\right)" },
        ],
        ariaLabel: "A generic SCF update operator combines density history and the current output density.",
      },
    ],
  },

  dftRecipe: {
    main: {
      segments: [
        {
          latex:
            "\\begin{aligned}\\mathcal M_{\\rm DFT}&=\\{E_{\\rm xc},\\mathcal B,q,2S+1\\}\\\\&=\\{\\mathrm{B3LYP},6\\text{-}31\\mathrm G^*,0,1\\}\\end{aligned}",
        },
      ],
      ariaLabel: "The selected DFT model contains the exchange-correlation approximation, basis set, charge, and spin multiplicity.",
    },
    subs: [],
  },

  frontier: {
    main: {
      segments: [
        {
          latex:
            "\\begin{aligned}\\rho(\\mathbf r)&=\\sum_i f_i|\\phi_i(\\mathbf r)|^2\\\\\\Delta_{\\rm KS}&=\\varepsilon_{\\rm LUMO}-\\varepsilon_{\\rm HOMO}\\end{aligned}",
          termId: "rho",
        },
      ],
      ariaLabel: "Electron density from occupied Kohn-Sham orbitals and the method-dependent frontier orbital energy difference.",
    },
    subs: [],
  },

  referenceRecord: {
    main: {
      segments: [
        { latex: "\\{Z,\\mathbf R\\}", termId: "recordInput" },
        { latex: "\\xrightarrow{\\text{reference protocol}}" },
        { latex: "\\{E,\\mathbf F,(\\boldsymbol\\sigma),\\text{metadata}\\}", termId: "recordOutput" },
      ],
      ariaLabel: "Atomic species and coordinates are labeled by a reference protocol with energy, forces, optional stress, and metadata.",
    },
    subs: [],
  },

  mlff: {
    main: {
      segments: [
        { latex: "E_\\theta(\\mathbf R)", termId: "ER" },
        { latex: "=\\sum_i" },
        { latex: "\\varepsilon_i", termId: "Ei" },
        { latex: "(\\mathcal N_i)" },
      ],
      ariaLabel: "A local machine-learned potential sums per-atom energy contributions.",
    },
    subs: [],
  },

  locality: {
    main: {
      segments: [
        { latex: "\\mathcal N_i(r_c)", termId: "neighborhood" },
        { latex: "=\\{j:\\lVert\\mathbf r_{ij}^{\\rm MIC}\\rVert<r_c\\}" },
      ],
      ariaLabel: "The local neighborhood contains periodic minimum-image neighbors inside cutoff radius rc.",
    },
    subs: [],
  },

  symmetry: {
    main: {
      segments: [
        { latex: "E(Q\\mathbf R+\\mathbf t)" , termId: "invariant" },
        { latex: "=E(\\mathbf R),\\qquad" },
        { latex: "\\mathbf F(Q\\mathbf R+\\mathbf t)", termId: "equivariant" },
        { latex: "=Q\\mathbf F(\\mathbf R)" },
      ],
      ariaLabel: "Energy is invariant to rigid transformations while force vectors transform equivariantly.",
    },
    subs: [],
  },

  mlffTraining: {
    main: {
      segments: [
        { latex: "E_\\theta(\\mathbf R)", termId: "ER" },
        { latex: "=\\sum_i" },
        { latex: "\\varepsilon_i", termId: "Ei" },
        { latex: ",\\qquad" },
        { latex: "\\mathbf F_i^\\theta", termId: "Fi" },
        { latex: "=-\\nabla_iE_\\theta" },
      ],
      ariaLabel: "Per-atom contributions sum to the total energy, and the forces are the negative gradient of that same energy.",
    },
    subs: [
      {
        termId: "loss",
        segments: [
          { latex: "\\mathcal L=w_E\\lVert\\Delta E\\rVert^2+w_F\\sum_i\\lVert\\Delta\\mathbf F_i\\rVert^2+w_\\sigma\\lVert\\Delta\\boldsymbol\\sigma\\rVert^2" },
        ],
        ariaLabel: "Weighted training loss over energy, forces, and optional stress.",
      },
    ],
  },

  activeLearning: {
    main: {
      segments: [
        { latex: "\\text{rollout}", termId: "rollout" },
        { latex: "\\rightarrow" },
        { latex: "u(\\mathbf R)>u_*", termId: "uncertainty" },
        { latex: "\\rightarrow" },
        { latex: "\\text{reference query}\\rightarrow\\text{retrain}", termId: "query" },
      ],
      ariaLabel: "Active learning loop from molecular dynamics rollout through an uncertainty trigger to a new reference query and retraining.",
    },
    subs: [],
  },

  classical: {
    main: {
      segments: [
        { latex: "U=" },
        { latex: "U_{\\rm bond}", termId: "Ubond" },
        { latex: "+" },
        { latex: "U_{\\rm angle}", termId: "Uangle" },
        { latex: "+" },
        { latex: "U_{\\rm dih}", termId: "Udihedral" },
        { latex: "+" },
        { latex: "U_{\\rm vdW}", termId: "UvdW" },
        { latex: "+" },
        { latex: "U_{\\rm elec}", termId: "UCoul" },
      ],
      ariaLabel: "Classical molecular potential decomposed into bonded, angular, torsional, van der Waals, and electrostatic terms.",
    },
    subs: [
      {
        termId: "Ubond",
        segments: [{ latex: "U_{\\rm bond}=\\sum \\tfrac12k_b(r-r_0)^2" }],
        ariaLabel: "Harmonic bond stretching potential.",
      },
      {
        termId: "Uangle",
        segments: [{ latex: "U_{\\rm angle}=\\sum \\tfrac12k_\\theta(\\theta-\\theta_0)^2" }],
        ariaLabel: "Harmonic angle bending potential.",
      },
      {
        termId: "Udihedral",
        segments: [{ latex: "U_{\\rm dih}=\\sum k_\\phi[1+\\cos(n\\phi-\\phi_s)]" }],
        ariaLabel: "Periodic torsional potential.",
      },
      {
        termId: "UvdW",
        segments: [{ latex: "U_{\\rm vdW}=\\sum_{i<j}4\\epsilon[(\\sigma/r)^{12}-(\\sigma/r)^6]" }],
        ariaLabel: "Lennard-Jones repulsion and attraction.",
      },
      {
        termId: "UCoul",
        segments: [{ latex: "U_{\\rm pair}=\\sum_{i<j}q_iq_j/(4\\pi\\varepsilon_0r_{ij})" }],
        ariaLabel: "Pair Coulomb kernel used as an explanatory term; periodic simulation uses PME.",
      },
    ],
  },

  pbc: {
    main: {
      segments: [
        { latex: "\\mathbf r_i\\mapsto\\mathbf r_i\\bmod\\mathbf L", termId: "pbc" },
        { latex: ",\\qquad\\mathbf r_{ij}^{\\rm MIC}=\\mathbf r_{ij}-\\mathbf L\\,\\mathrm{nint}(\\mathbf r_{ij}/\\mathbf L)" },
      ],
      ariaLabel: "Periodic coordinate wrapping and the minimum-image displacement.",
    },
    subs: [],
  },

  newton: {
    main: {
      segments: [
        { latex: "m_i\\ddot{\\mathbf r}_i", termId: "newton" },
        { latex: "=-\\nabla_iU" },
        { latex: ",\\qquad" },
        { latex: "(\\mathbf r,\\mathbf v)_n\\xrightarrow{\\Delta t}(\\mathbf r,\\mathbf v)_{n+1}", termId: "integrator" },
      ],
      ariaLabel: "Newtonian acceleration from the potential gradient followed by a finite timestep update.",
    },
    subs: [
      {
        termId: "thermostat",
        segments: [{ latex: "\\text{constraints + Langevin thermostat are applied within the splitting scheme}" }],
        ariaLabel: "Constraints and a Langevin thermostat participate in the actual finite-step update.",
      },
    ],
  },

  ensemble: {
    main: {
      segments: [
        { latex: "\\text{minimize}", termId: "minimize" },
        { latex: "\\rightarrow" },
        { latex: "NPT", termId: "npt" },
        { latex: "\\rightarrow" },
        { latex: "NVT\\;\\text{production}", termId: "production" },
      ],
      ariaLabel: "Preparation sequence from minimization through NPT equilibration to NVT production sampling.",
    },
    subs: [],
  },

  observable: {
    main: {
      segments: [
        { latex: "A_t=A(\\mathbf R_t)", termId: "observable" },
        { latex: ",\\qquad" },
        { latex: "\\langle A\\rangle_T=\\tfrac1T\\int_0^T A_t\\,dt", termId: "average" },
      ],
      ariaLabel: "An observable evaluated on each trajectory frame and averaged over a sampling window.",
    },
    subs: [],
  },

  mapping: {
    main: {
      segments: [
        { latex: "\\mathbf r_I=M_I(\\mathbf R)", termId: "mapping" },
        { latex: ",\\qquad" },
        { latex: "\\mathcal T=\\{p(r),\\langle\\mathbf F\\rangle,F(\\xi),O_{\\rm exp},\\text{state point}\\}", termId: "targets" },
      ],
      ariaLabel: "An atomistic-to-coarse mapping and the set of structural, force, free-energy, experimental, and state-point targets.",
    },
    subs: [],
  },

  cgModel: {
    main: {
      segments: [
        { latex: "U_{\\rm CG}=" },
        { latex: "\\sum_b\\tfrac12k_b(r_b-r_{0,b})^2", termId: "Ubond" },
        { latex: "+" },
        { latex: "\\sum_a\\tfrac12k_a(\\theta-\\theta_0)^2", termId: "Uangle" },
        { latex: "+" },
        { latex: "\\sum_{\\substack{i<j\\\\r_{ij}<r_c}}^{\\prime}A\\exp[-r_{ij}^2/(2\\sigma^2)]", termId: "Ugauss" },
      ],
      ariaLabel: "The active coarse-grained teaching model uses per-bond reference lengths, harmonic angles, and a finite-cutoff Gaussian sum over eligible nonbonded pairs.",
    },
    subs: [],
  },

  langevin: {
    main: {
      segments: [
        { latex: "m_i\\dot{\\mathbf v}_i=" },
        { latex: "-\\nabla_iU_{\\rm CG}", termId: "conservative" },
        { latex: "-\\gamma m_i\\mathbf v_i", termId: "dissipative" },
        { latex: "+\\sqrt{2\\gamma m_i k_BT}\\,\\boldsymbol\\eta_i(t)", termId: "random" },
      ],
      ariaLabel: "Per-particle Langevin equation with conservative, frictional, and random forces.",
    },
    subs: [],
  },

  rdf: {
    main: {
      segments: [
        { latex: "g(r)", termId: "rdf" },
        { latex: "=\\frac{1}{4\\pi r^2\\rho N}\\left\\langle\\sum_{i\\ne j}\\delta(r-r_{ij}^{\\rm MIC})\\right\\rangle" },
      ],
      ariaLabel: "Periodic radial distribution function normalized by the uniform shell population.",
    },
    subs: [],
  },
};
