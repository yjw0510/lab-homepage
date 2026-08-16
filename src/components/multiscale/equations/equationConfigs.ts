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
      ariaLabel: "Atomic positions are updated until the DFT energy stops decreasing.",
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
      ariaLabel: "An electron-state equation combining motion with attractions from nuclei and other electrons.",
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
      ariaLabel: "Repeated calculation from a trial electron density to an updated density.",
    },
    subs: [
      {
        termId: "rhoOut",
        segments: [
          { latex: "\\rho^{(n+1)}=\\mathcal M\\!\\left(\\rho^{(n)},\\rho_{\\rm out}^{(n)}\\right)" },
        ],
        ariaLabel: "The next input combines the previous density with the newly calculated density.",
      },
    ],
  },

  dftRecipe: {
    main: {
      segments: [
        {
          latex:
            "\\mathcal M_{\\rm DFT}=\\{\\text{electronic model},q,\\text{spin state}\\}",
        },
      ],
      ariaLabel: "A DFT setup records the electronic model, molecular charge, and spin state.",
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
      ariaLabel: "Electron density from filled states and the energy difference between the highest filled and lowest empty orbitals.",
    },
    subs: [],
  },

  referenceRecord: {
    main: {
      segments: [
        { latex: "\\{Z,\\mathbf R\\}", termId: "recordInput" },
        { latex: "\\xrightarrow{\\text{reference calculation}}" },
        { latex: "\\{E,\\mathbf F,(\\boldsymbol\\sigma),\\text{metadata}\\}", termId: "recordOutput" },
      ],
      ariaLabel: "Atomic species and coordinates paired with calculated energy, forces, and source information.",
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
      ariaLabel: "An MLFF obtains total energy by adding the contribution assigned to each atom.",
    },
    subs: [],
  },

  locality: {
    main: {
      segments: [
        { latex: "\\mathcal N_i(r_c)", termId: "neighborhood" },
        { latex: "=\\{j:\\lVert\\mathbf r_{ij}^{\\rm MIC}\\rVert<r_c\\}" },
      ],
      ariaLabel: "The model uses atoms found inside a chosen radius around each center atom.",
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
      ariaLabel: "Moving or rotating the system preserves its energy, and the force directions rotate with it.",
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
      ariaLabel: "Atomic contributions add to the total energy, and changes in that energy produce the force on each atom.",
    },
    subs: [
      {
        termId: "loss",
        segments: [
          { latex: "\\mathcal L=w_E\\lVert\\Delta E\\rVert^2+w_F\\sum_i\\lVert\\Delta\\mathbf F_i\\rVert^2+w_\\sigma\\lVert\\Delta\\boldsymbol\\sigma\\rVert^2" },
        ],
        ariaLabel: "Training error combines differences in energy, forces, and an optional measure of material stress.",
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
      ariaLabel: "Crossing the uncertainty threshold triggers a new quantum calculation before retraining.",
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
      ariaLabel: "Classical molecular energy split into bond shape, short-range, and electrostatic contributions.",
    },
    subs: [
      {
        termId: "Ubond",
        segments: [{ latex: "U_{\\rm bond}=\\sum \\tfrac12k_b(r-r_0)^2" }],
        ariaLabel: "Energy rises when a bond moves away from its reference length.",
      },
      {
        termId: "Uangle",
        segments: [{ latex: "U_{\\rm angle}=\\sum \\tfrac12k_\\theta(\\theta-\\theta_0)^2" }],
        ariaLabel: "Energy rises when a bond angle moves away from its reference value.",
      },
      {
        termId: "Udihedral",
        segments: [{ latex: "U_{\\rm dih}=\\sum k_\\phi[1+\\cos(n\\phi-\\phi_s)]" }],
        ariaLabel: "Energy changes as one part of a molecule rotates around a bond.",
      },
      {
        termId: "UvdW",
        segments: [{ latex: "U_{\\rm vdW}=\\sum_{i<j}4\\epsilon[(\\sigma/r)^{12}-(\\sigma/r)^6]" }],
        ariaLabel: "Nearby atoms repel at very short distance and attract at a longer distance.",
      },
      {
        termId: "UCoul",
        segments: [{ latex: "U_{\\rm pair}=\\sum_{i<j}q_iq_j/(4\\pi\\varepsilon_0r_{ij})" }],
        ariaLabel: "Electrostatic attraction or repulsion between charged atoms.",
      },
    ],
  },

  pbc: {
    main: {
      segments: [
        { latex: "\\mathbf r_i\\mapsto\\mathbf r_i\\bmod\\mathbf L", termId: "pbc" },
        { latex: ",\\qquad\\mathbf r_{ij}^{\\rm MIC}=\\mathbf r_{ij}-\\mathbf L\\,\\mathrm{nint}(\\mathbf r_{ij}/\\mathbf L)" },
      ],
      ariaLabel: "A repeating box wraps atoms across its boundaries and measures the closest repeated separation.",
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
      ariaLabel: "Atomic forces update positions and speeds over one simulation step.",
    },
    subs: [
      {
        termId: "thermostat",
        segments: [{ latex: "\\text{sampling conditions remain controlled during each update}" }],
        ariaLabel: "The trajectory is sampled under controlled conditions.",
      },
    ],
  },

  ensemble: {
    main: {
      segments: [
        { latex: "\\text{prepare}", termId: "minimize" },
        { latex: "\\rightarrow" },
        { latex: "\\text{relax}", termId: "npt" },
        { latex: "\\rightarrow" },
        { latex: "\\text{sample}", termId: "production" },
      ],
      ariaLabel: "A general sequence for preparing, relaxing, and sampling a molecular system.",
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
      ariaLabel: "A rule groups atoms into beads and records which atom-level or experimental results the bead model must reproduce.",
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
      ariaLabel: "A teaching model combines chain shape with smooth interactions between nonbonded beads.",
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
      ariaLabel: "Coarse-grained particle motion combines modeled interactions, drag, and random thermal motion.",
    },
    subs: [],
  },

  rdf: {
    main: {
      segments: [
        { latex: "g(r)", termId: "rdf" },
        { latex: "=\\frac{1}{4\\pi r^2\\rho N}\\left\\langle\\sum_{i\\ne j}\\delta(r-r_{ij}^{\\rm MIC})\\right\\rangle" },
      ],
      ariaLabel: "Average probability of finding another particle at each separation.",
    },
    subs: [],
  },
};
