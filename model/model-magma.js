importScripts(
  '../../../phase/js/geochem.js',
  '../../../phase/js/chemical_profile.js',
  '../../../phase/js/phase.js',
  '../../../phase/js/liquid.js',
  '../../../phase/js/solid.js',
  '../../../jslib/matrix/matrix.js',
  '../../../phase/js/equilibrate.js',
  '../../../phase/js/partitioning.js',
  '../../../phase/js/exchangePartitioning.js',
  '../../../phase/js/geothermobarometer.js',
  '../../../phase/js/magma-system.js',
  '../../../jslib/funcTools.js',
  '../../../diffusion/js/diffusion.js',
  '../../../diffusion/js/inter-diffusion.js',
  '../../../diffusion/js/self-diffusion.js'); // SelfDiffusion*/
//console.log(this);

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof exports === 'object') {
    module.exports = factory();
  } else {
    root.Model = factory(
      root.Liquid,
      root.Solid,
      root.geothermobarometer,
      root.Equilibrate,
      root.partitioning,
      root.exchangePartitioning,
      root.MagmaSystem,
      root.InterDiffusion,
      root.SelfDiffusion
    );
  }
}(this, function (
  Liquid,
  Solid,
  geothermobarometer,
  Equilibrate,
  D,
  KD,
  MagmaSystem,
  InterDiffusion,
  SelfDiffusion
) {


  const { thermometer, barometer, oxybarometer } = geothermobarometer;

  const model = option => {
    /**
     * The model returns chemical profile of Fe/Mg and Cr in a orthopyroxene phenocryst.
     * 
     * Consider crustal processes below:
     * 1. Multiple rapid changes of melt composition
     * 2. Crystal growth of
     *  a. Olivine (Si-Mg-Fe-Cr-Ni)
     *  b. Orthopyroxene (Si-Mg-Fe-Al-Ca-Cr-Ni)
     *  c. Spinel (Cr-Ni)
     *  in the host melt
     * 3. Lattice diffusion of
     *  a. Fe-Mg interdiffusion
     *  b. Cr self diffusion
     *  in orthopyroxene
     */

    /** Utility functions
     * 
     */
    const checkInRange = (min, max) => x => (min <= x && x <= max);
    const checkExceed = (target, sign = 1.) => x => (x - target) * sign > 0;
    const checkSame = (target, eps) => x => Math.abs(x - target) < eps;
    const getD = (D, phase, component) => Diffusion.getD(D, phase, component);


    /**
     * Create objects of host melt, olivine, orthopyroxene, and spinel.
     * Register partitioning coefficient (Nernst's and exchange type) to each solid phase.
     * Register equilibrium liquid phase to each solid phase.
     * 
     * @param {}
     * @return {Object}
     *  @property {Array} 
     *    @property {Liquid} melt
     *    @property {Solid} olivine
     *    @property {Solid} orthopyroxene
     *    @property {Solid} spinel
     */
    const createPhase = () => {

      const melt = new Liquid('melt').initialize()

      const olivine = new Solid('olivine')
        .initialize()
        .setKD({
          'Fe_Mg': KD.olivine.Fe_Mg.Beattie1993()
        })
        .setD({
          'Cr2O3': D.olivine.Cr2O3.FreiS2009(),
          'NiO': D.olivine.NiO.NormanS2005(),
          'Al2O3': D.olivine.Al2O3.myCompile(melt),
          'CaO': D.olivine.CaO.myCompile(melt),
          'TiO2': D.olivine.TiO2.dummy()
        })
        .setSolver('melt', Equilibrate.olivine_melt(melt, 'solve'));

      const orthopyroxene = new Solid('orthopyroxene')
        .initialize()
        .setKD({ 'Fe_Mg': KD.orthopyroxene.Fe_Mg.Beattie1993() })
        .setD({
          'Cr2O3': D.orthopyroxene.Cr2O3.FreiS2009(),
          'NiO': D.orthopyroxene.NiO.NormanS2005(),
          'Al2O3': D.orthopyroxene.Al2O3.myCompile(melt),
          'CaO': D.orthopyroxene.CaO.myCompile(melt),
          'TiO2': D.orthopyroxene.TiO2.dummy()
        })
        .setSolver('melt', Equilibrate.opx_melt(melt, 'solve'));

      const spinel = new Solid('spinel')
        .initialize()
        .setD({
          'Cr2O3': D.spinel.Cr2O3.LieS2008(),
          'NiO': D.spinel.NiO.LieS2008()
        })
        .setSolver('melt', Equilibrate.spinel_melt(melt, 'solve'));

      const meltThermometer = (P) => thermometer.Sugawara2000(melt)(P) - thermometer.liquidusDropMG2008(melt)(P);

      return {
        phase: [melt, olivine, orthopyroxene, spinel],
        thermometer: meltThermometer
      }
    }

    /**
     * Create object to simulate lattice diffusion. 
     * 
     * @param {MagmaSystem} magma 
     * @param {*} ope 
     */
    const initialize = (magma, ope) => {
      const { targetPhase, D } = ope;
      const FeMgDif = new InterDiffusion('FeO', 'MgO', getD(D, targetPhase, 'Fe_Mg'), 'atom')

      const CrDif = new SelfDiffusion('Cr2O3', getD(D, targetPhase, 'Cr2O3'))

      magma.setDiffusionProfile(FeMgDif, targetPhase, 'Fe_Mg');
      magma.setDiffusionProfile(CrDif, targetPhase, 'Cr2O3');

      return {}
    }


    /** recordLocalEquilibriumCondition
     * Simulate transition of the composition of host melt and involved solid phases
     *   during a reaction of melting or crystallization. 
     * It starts from a condition where the host melt has a specific composition. 
     * In each calculation step of, we calculate composition of solid phases 
     *   by using partitioning coefficient assuming achivement of local equilibrium with host melt.
     * Then, when crystal growth is considered, small fraction of solid phases are removed from the host melt. 
     * On the other hand, when assimilation of crystal is considered, they are added to the host melt. 
     * In the calculation, we use Mg# of some phase as an extent of progression of the reaction.
     * Until Mg# of the focused phase becomes a given value, the steps are repeated. 
     * 
     * @param {*} magma 
     * @param {*} observedPhaseName 
     * @param {*} targetMgN 
     * @param {*} stoichiometry 
     * @param {*} dF 
     * @param {*} isRecord 
     * 
     * moveCrystalBoundary(
     *  magma,
     *  'orthopyroxene',
     *  91.5,
     *  {olivine : 0.5, orthopyroxene : 0.495, spinel : 0.005},
     *  0.001,
     *  true
     * )
     */
    const recordLocalEquilibriumCondition = (
      magma, observedPhaseName, targetMgN, stoichiometry, dF, isRecord
    ) => {
      const melt = magma.phase.melt;

      const observedPhase = magma.phase[observedPhaseName];
      let { T, P } = magma.getThermodynamicProperty();
      observedPhase.equilibrate('melt', T, P)

      const { sign, pathName } = (observedPhase.getMgNumber() < targetMgN)
        ? { sign: 1., pathName: 'ascend' }
        : { sign: -1., pathName: 'descend' };

      const isExceed = checkExceed(targetMgN, sign);
      const isInRange = checkInRange(-1, 1);
      const isSame = checkSame(targetMgN, 1e-3);
      let F = 0;
      const solids = Object.entries(magma.solids());

      solids.map(([_, phase]) => {
        phase.resetProfile(pathName);
      })

      // repeat until Mg# of targetPhase exceeds targetMgN or F becomes out of range [0,1]
      let limit = 0
      while (isInRange(F) && !isExceed(observedPhase.getMgNumber())) {
        let { T, P } = magma.getThermodynamicProperty();

        // equilibrate & record
        solids.map(entry => {
          entry[1].equilibrate('melt', T, P)
        })
        if (isRecord) {
          solids.map(([name, phase]) => {
            phase.pushProfile(stoichiometry[name] * F, T, P, pathName)
          })
          melt.pushProfile(1 + F * sign, T, P, pathName)
        }

        // change melt as not exceeding final condition
        melt.differentiate(
          solids.map(([name, phase]) => { return { phase: phase, f: stoichiometry[name] } }),
          dF * sign
        )
          .compensateFe()

        // to check whether exceeding final condition
        observedPhase.equilibrate('melt', T, P)

        // While exceeding final condition, 
        //  revert melt composition and add/remove 
        //  smaller fraction of solid again.
        while (isExceed(observedPhase.getMgNumber())) {
          let { T, P } = magma.getThermodynamicProperty();

          // revert change of melt composition
          melt.differentiate(
            solids.map(([name, phase]) => { return { phase: phase, f: stoichiometry[name] } }),
            dF * sign / (1 + dF * sign) * -1
          ).compensateFe()

          // change with smaller fraction
          dF *= 0.5;
          melt.differentiate(
            solids.map(([name, phase]) => { return { phase: phase, f: stoichiometry[name] } }),
            dF * sign
          ).compensateFe()

          // reequilibrate to check whether exceeding final condition
          solids.map(entry => {
            entry[1].equilibrate('melt', T, P)
          })

          limit++
          if (limit > 100) break;
        }
        //=========================

        // Update total fraction not exxceeding final condition
        F += dF;

        if (isSame(observedPhase.getMgNumber())) break;
      }

      // Record final state
      if (isRecord) {
        solids.map(entry => {
          let name = entry[0], phase = entry[1];
          phase.pushProfile(stoichiometry[name] * F, T, P, pathName);
        })
        melt.pushProfile(1 + F * sign, T, P, pathName);
      }

    }




    /** 
     * Approximated simulation of magma mixing. 
     * The exotic melt composition and its mass contribution to the mixture is unknown.
     * 
     * We approximate the mixture composition by assuming 
     *   mixture and erupted melt are on the same liquid line of ascent or that of descent.
     * Therefore, the mixture can be calculated by addition or removing of small fraction of
     *   solid phases repeatedly.
     *  
     * @param {*} magma 
     * @param {*} ope 
     * @param {*} result
     */
    const approximateMagmaMixing = (magma, ope, result) => {
      const {
        initialMelt,
        dF,
        targetPhase,
        ini,
        orthopyroxeneInit,
        spinelInit,
        Pini,
        Fe2Ratio
      } = ope

      /** メルトの初期組成を設定し，ターゲット相の初期Mg#を求める
       * 含水量を考慮した結晶分別を行う
       * したがって，メルト温度に含水量の効果が反映され，net time scale of diffusion
       * にも影響が出る
      */

      /* water, pressureはここでハンドル */
      const water = (ope.hasOwnProperty('water'))
        ? ope.water
        : initialMelt.composition.H2O;

      const stoichiometry = {
        olivine: 1 - orthopyroxeneInit - spinelInit,
        orthopyroxene: orthopyroxeneInit,
        spinel: spinelInit
      }

      // メルト組成を計算
      magma.phase.melt.setComposition(initialMelt.composition)
        .updateComposition({ H2O: water })
        .setFe2Ratio(Fe2Ratio)
        .compensateFe()

      // 圧力計を設定
      magma.setThermodynamicAgent({
        barometer: _ => Pini
      })

      // 初生的なメルト組成を計算
      recordLocalEquilibriumCondition(magma, targetPhase, ini, stoichiometry, dF, true)

      return {}
    }

    /** 
     * Crystals grow in the host melt which is already set composition.
     * Composition of growing part of crystals are calculated by mass balance equation with partitioning coefficients 
     *   by assuming establishment of local equilibrium.
     * Once the part of crystal grows, it no longer has effect on the part of growing crystal after it.
     * Therefore, the condition of crystal growth is Rayleigh fractionation. 
     * 
     * Considered solid phases are: 
     *  1. olivine
     *  2. orthopyroxene
     *  3. spinel
     * Reaction stoichiometry of solid phases are constant. 
     * In this method, stoichiometry of orthopyroxene and spinel are given. 
     * 
     * Crystal grow until Mg# of a given phase reach a specific value. 
     */
    const growCrystals = (magma, ope, result) => {
      const {
        dF,
        targetPhase,
        fin,
        orthopyroxeneInit,
        spinelInit
      } = ope;

      const stoichiometry = {
        olivine: 1 - orthopyroxeneInit - spinelInit,
        orthopyroxene: orthopyroxeneInit,
        spinel: spinelInit
      }

      // 結晶成長を伴うメルト組成変化
      recordLocalEquilibriumCondition(magma, targetPhase, fin, stoichiometry, dF, true)
      return {}
    }

    /**
     * Calculate radius in the crystal by assuming spherical shape and constant density 
     *   from mass fraction at each step of growth. 
     * The initial and final radius are known by line analysis with EPMA. 
     * 
     * @param {*} initialRadius 
     * @param {*} finalRadius 
     * @param {*} totalMass 
     */
    const massToRadiusByConstantDensity = (initialRadius, finalRadius, totalMass) => {
      const A = (Math.pow(finalRadius, 3) - Math.pow(initialRadius, 3)) / totalMass;
      return f => Math.pow(A * f + Math.pow(initialRadius, 3), 1 / 3)
    }

    /**
     * Relate composition and radius in the position of the crystal. 
     * 
     * @param {*} magma 
     * @param {*} targetPhase 
     * @param {*} Rini 
     * @param {*} Rfin 
     */
    const getProfileWithRadius = (magma, targetPhase, Rini, Rfin) => {
      const profile = magma.phase[targetPhase].getProfile('descend');
      const l = profile.F.length;
      profile.x = profile.F.map(massToRadiusByConstantDensity(Rini, Rfin, profile.F[l - 1]));
      return profile;
    }

    /**
     * Simulate elemental diffusion in the focused crystal. 
     * The crystal is spherical symmetry. 
     * Diffusion coefficients depends only on temperature as Arhenius relation. 
     * 
     * In the model, inter diffusivity of Fe and Mg components and self diffusivity of Cr2O3 are 
     *  considered. 
     * During diffusion, the host melt composition is constant and local equilibrium at crystal surface
     *  always established. 
     * 
     * Spatially one dimension diffusion equation is numerycally solved by Crank-Nicolson method. 
     * Neumann condition at the center of crystal, and Dericklet condition at the edge. 
     * 
     * The scale of time and temperature for diffusivity is treated as unknown parameter, 'total scale of diffusion'. 
     * The scale is originally introduced by Lasaga (1983) as compressed time. 
     * Total scale of diffusion represent all possible cooling history which yeild the same value of compressed time. 
     * 
     * @param {MagmaSystem} magma 
     * @param {*} ope 
     * @param {*} result 
     */
    const operateDiffusion = (magma, ope, result) => {
      const { targetPhase, tau, R, Rprev, divNum } = ope;

      // chemical profileを取得
      const section = getProfileWithRadius(magma, targetPhase, Rprev, R)

      const diffusionInSphere = magma.getDiffusionProfile(targetPhase);
      Object.values(diffusionInSphere).map(d => {
        d.appendSection(section)
          .setMaxCompressedTime(tau)
          .divideSpaceEqually(divNum)
          .nondimensionalize()
          .implicitCN()
          .redimensionalize()
      })

      return {}
    }

    /** 
     * Assumed crustal processes are repeatation of magma mixing, crystal growth, 
     *   and elemental diffusion in crystals.
     * The time of repeatation is the same as number of growth satge of the focused crystal. 
    */
    const magmaProcesses = option.radius.map((_, i) => {
      return (i === 0)
        ? []
        : [approximateMagmaMixing, growCrystals, operateDiffusion]
    }).reduce((a, b) => [...a, ...b], [])

    /** 
     * MagmaSystemに登録されたある相の拡散プロファイルを統合し, 
     * モデルオブジェクトの形に整形する
     * 
     * @param {*} magma 
     * @param {*} opt 
     */
    const integrateDiffusedProfile = (magma, opt) => {
      const diffusion = magma.diffusionProfiles[opt.targetPhase];
      const { dataPos } = opt;

      return Object.entries(diffusion).map(([k, v]) => {
        // データに合わせてxの位置を変形
        v.profile.transformByRadius(dataPos)

        const p = v.profile.get()
        const obj = {}
        obj.x = p.x;
        obj[k] = p.c
        return obj
      }).reduce((a, b) => Object.assign(a, b), {})
    }

    //console.log(magmaProcesses)
    /** Create magma system 
     * 
     */
    const magma = new MagmaSystem()
    magma
      .setThermodynamicHandler(
        (magma, opt) => {
          const P = magma.barometer();
          return {
            T: magma.thermometer(P),
            P: P
          }
        }
      )
      .setAction([
        initialize,
        ...magmaProcesses
      ])
      .setFinalAction(
        integrateDiffusedProfile
      )


    /** ================================================
     * The model finally generate chemical profile of orthopyroxene.
     * The host melt is always homogenous. 
     * Therefore, crystal composition represents whole part of the magma system.
     * The crystals are spherical symmetry. 
     * The crystal experiences multiple stages of crystal growth and lattice diffusion.
     * The lattice diffusion progresses after crystal growth terminated in each stage.
     * The chemical composition of grown crystal determined by host melt compositon and partitioning coefficients. 
     * 
     * 
     * @param {Array} parameters
     *  @element {Object}
     *    @property {Number} ini
     *    @property {Number} fin
     *    @property {Number} orthopyroxene_init
     *    @property {Number} spinel_init
     *    @property {Number} tau
     * 
     * @param {Object} data
     *  @property {Array} x
     *  @property {Array} Fe_Mg
     *  @property {Array} Cr2O3
     * 
     * @return {Object}
     *  @property {Array} x
     *  @property {Array} Fe_Mg
     *  @property {Array} Cr2O3
     */
    return (parameters, data) => {
      magma.setThermodynamicAgent(createPhase())

      const modelParameters = parameters.map((p, i) => {
        return [
          {
            'initialMelt': option.melt0,
            'dF': 0.005,
            'targetPhase': 'orthopyroxene',
            'ini': p.ini,
            'orthopyroxeneInit': p.orthopyroxeneInit,
            'spinelInit': p.spinelInit,
            'Fe2Ratio': option.melt0.Fe2Ratio,
            'Pini': option.Pini[i]
          },
          {
            'dF': 0.005,
            'targetPhase': 'orthopyroxene',
            'fin': p.fin,
            'orthopyroxeneInit': p.orthopyroxeneInit,
            'spinelInit': p.spinelInit,
          },
          {
            'targetPhase': 'orthopyroxene',
            'tau': p.log10_tau,
            'R': option.radius[i + 1],
            'Rprev': option.radius[i],
            'divNum': (i + 1) * 10
          }
        ]
      }).reduce((a, b) => [...a, ...b], []);

      //console.log(modelParameters)

      return magma.execAction([
        {
          'targetPhase': 'orthopyroxene',
          'D': option.D0
        },
        ...modelParameters,
        {
          'targetPhase': 'orthopyroxene',
          'dataPos': data.x
        }
      ])

    }
  }

  /**
   * Initial value of parameters are not important.
   */
  const parameters = Array(9).fill(0).map((_, i) => {
    return {
      'ini': 85,
      'fin': 80,
      'orthopyroxeneInit': 0.5,
      'spinelInit': 0.05,
      'log10_tau': 6
    }
  });

  /**
   * In the model, initial and final Mg# of the orthopyroxene phenocryst during crystal growth are unknown parameters. 
   */
  const updateCondition = {
    'ini': {
      'val': 1,
      'max': 93,
      'min': 75
    },
    'fin': {
      'val': 1,
      'max': 93,
      'min': 75
    },
    'orthopyroxeneInit': {
      'val': 0.05,
      'max': 1,
      'min': 0
    },
    'spinelInit': {
      'val': 0.005,
      'max': 0.1,
      'min': 0
    },
    'log10_tau': {
      'val': 0.1,
      'max': 12,
      'min': 0
    }
  }

  const constrain = {
    ini: (cand, i, parameter) => cand > parameter[i].fin,
    fin: (cand, i, parameter) => cand < parameter[i].ini,
    orthopyroxeneInit: (cand, i, parameter) => (0 < cand && cand + parameter[i].spinelInit <= 1),
    spinelInit: (cand, i, parameter) => cand + parameter[i].orthopyroxeneInit <= 1
  }

  return {
    model,
    parameters,
    updateCondition,
    constrain
  };
}
))