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

if (typeof require === "undefined") {
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
}

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
      root.SelfDiffusion,
      root.Diffusion
    );
  }
}(this, function (
  _Liquid,
  _Solid,
  _geothermobarometer,
  _Equilibrate,
  _D,
  _KD,
  _MagmaSystem,
  _InterDiffusion,
  _SelfDiffusion,
  _Diffusion
) {
  const Liquid = (typeof require === 'undefined' && (typeof _Liquid === 'object' || typeof _Liquid === 'function'))
    ? _Liquid
    : require('../../phase/js/liquid');

  const Solid = (typeof require === 'undefined' && (typeof _Solid === 'object' || typeof _Solid === 'function'))
    ? _Solid
    : require('../../phase/js/solid');

  const geothermobarometer = (typeof require === 'undefined' && (typeof _geothermobarometer === 'object' || typeof _geothermobarometer === 'function'))
    ? _geothermobarometer
    : require('../../phase/js/geothermobarometer');


  const Equilibrate = (typeof require === 'undefined' && (typeof _Equilibrate === 'object' || typeof _Equilibrate === 'function'))
    ? _Equilibrate
    : require('../../phase/js/equilibrate');

  const D = (typeof require === 'undefined' && (typeof _D === 'object' || typeof _D === 'function'))
    ? _D
    : require('../../phase/js/partitioning');

  const KD = (typeof require === 'undefined' && (typeof _KD === 'object' || typeof _KD === 'function'))
    ? _KD
    : require('../../phase/js/exchangePartitioning');

  const MagmaSystem = (typeof require === 'undefined' && (typeof _MagmaSystem === 'object' || typeof _MagmaSystem === 'function'))
    ? _MagmaSystem
    : require('../../phase/js/magma-system');

  const InterDiffusion = (typeof require === 'undefined' && (typeof _InterDiffusion === 'object' || typeof _InterDiffusion === 'function'))
    ? _InterDiffusion
    : require('../../diffusion/js/inter-diffusion');

  const SelfDiffusion = (typeof require === 'undefined' && (typeof _SelfDiffusion === 'object' || typeof _SelfDiffusion === 'function'))
    ? _SelfDiffusion
    : require('../../diffusion/js/self-diffusion');

  const Diffusion = (typeof require === 'undefined' && (typeof _Diffusion === 'object' || typeof _Diffusion === 'function'))
    ? _Diffusion
    : require('../../diffusion/js/diffusion');



  /**
   * option : {
   *  targetPhase: String,
   *  D0 :{
   *    orthopyroxene : {
   *      Fe_Mg : {
   *        d0 : Number,
   *        E : Number
   *      },
   *      Cr2O3 : {
   *        d0 : Number,
   *        E : Number
   *      }
   *    }
   *  },
   *  dF : Number,
   *  radius : [Number],
   *  finalMelt : {
   *    composition : {
   *      SiO2 : Number,
   *      ...
   *      H2O : Number
   *    },
   *    Fe2Ratio : Number
   *  },
   *  P : [Number],
   *  MgN_atRim : Number
   * }
   */
  return option => {

    const { thermometer, barometer, oxybarometer } = geothermobarometer;

    /** Utility functions
     * 
     */
    const repeatedArray = n => (array) => Array(n)
      .fill(0)
      .map(_ => [...array])
      .reduce((a, b) => [...a, ...b]);
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
      const { targetPhase, D, finalMelt } = ope;

      magma.setThermodynamicAgent(createPhase());
      magma.phase.melt.setComposition(finalMelt.composition)
        .setFe2Ratio(finalMelt.Fe2Ratio)
        .compensateFe()

      const FeMgDif = new InterDiffusion('FeO', 'MgO', getD(D, targetPhase, 'Fe_Mg'), 'atom')

      const CrDif = new SelfDiffusion('Cr2O3', getD(D, targetPhase, 'Cr2O3'))

      magma.setDiffusionProfile(FeMgDif, targetPhase, 'Fe_Mg');
      magma.setDiffusionProfile(CrDif, targetPhase, 'Cr2O3');
      magma.custom.profileStack = [];
      magma.custom.mixingLineStack = [];
      magma.custom.differentiationLineStack = [];

      return {}
    }


    /** recordLocalEquilibriumCondition
     * Simulate transition of the composition of host melt and involved solid phases
     *   during a reaction of melting or crystallization. 
     * It starts from a condition where the host melt has a specific composition. 
     * In each calculation step of, we calculate composition of solid phases 
     *   by using partitioning coefficient assuming achievement of local equilibrium with host melt.
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

      melt.resetProfile(pathName);

      // repeat until Mg# of targetPhase exceeds targetMgN or F becomes out of range [0,1]
      let limit = 0
      melt.startDifferentiate();
      while (isInRange(F)
        && !isExceed(observedPhase.getMgNumber())
        && !melt.outOfRange
      ) {
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

          // re-equilibrate to check whether exceeding final condition
          solids.map(entry => {
            entry[1].equilibrate('melt', T, P)
          })

          limit++
          if (limit > 100) break;
        }
        //=========================

        // Update total fraction not exceeding final condition
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
      return pathName;

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
        dF,
        targetPhase,
        MgN_beforeMixing,
        stoichiometry,
        P
      } = ope

      magma.setThermodynamicAgent({
        barometer: _ => P
      })

      const pathName = recordLocalEquilibriumCondition(
        magma,
        targetPhase,
        MgN_beforeMixing,
        stoichiometry,
        dF,
        true
      )

      magma.custom.mixingLineStack.push(
        magma.phase.melt.profile[pathName].get()
      )

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
        MgN_beforeCrystallization,
        stoichiometry,
        P
      } = ope;

      magma.setThermodynamicAgent({
        barometer: _ => P
      })

      // 結晶成長を伴うメルト組成変化
      const pathName = recordLocalEquilibriumCondition(
        magma,
        targetPhase,
        MgN_beforeCrystallization,
        stoichiometry,
        dF,
        true
      )
      /**
        * 注目する相のプロファイルをスタックに追加
        */
      magma.custom.profileStack.push(
        magma.phase[targetPhase].profile[pathName].get()
      )

      magma.custom.differentiationLineStack.push(
        magma.phase.melt.profile[pathName].get()
      )
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
      return f => Math.pow(A * (totalMass - f) + Math.pow(initialRadius, 3), 1 / 3)
    }

    const reverseProfile = (profile) => {
      const newProfile = {};
      Object.entries(profile)
        .map(([k, v]) => {
          newProfile[k] = [...v].reverse()
        })
      return newProfile;
    }

    /**
     * Relate composition and radius in the position of the crystal. 
     * 
     * @param {*} magma 
     * @param {*} targetPhase 
     * @param {*} Rini 
     * @param {*} Rfin 
     */
    const getProfileWithRadius = (profile, Rini, Rfin) => {
      const newProfile = Object.assign(profile, {});
      const l = newProfile.F.length;
      newProfile.x = newProfile.F.map(massToRadiusByConstantDensity(Rini, Rfin, newProfile.F[0]));
      return newProfile;
    }

    /**
     * Simulate elemental diffusion in the focused crystal. 
     * The crystal is spherical symmetry. 
     * Diffusion coefficients depends only on temperature as Arrhenius relation. 
     * 
     * In the model, inter diffusivity of Fe and Mg components and self diffusivity of Cr2O3 are 
     *  considered. 
     * During diffusion, the host melt composition is constant and local equilibrium at crystal surface
     *  always established. 
     * 
     * Spatially one dimension diffusion equation is numerically solved by Crank-Nicolson method. 
     * Neumann condition at the center of crystal, and Dericklet condition at the edge. 
     * 
     * The scale of time and temperature for diffusivity is treated as unknown parameter, 'total scale of diffusion'. 
     * The scale is originally introduced by Lasaga (1983) as compressed time. 
     * Total scale of diffusion represent all possible cooling history which yields the same value of compressed time. 
     * 
     * @param {MagmaSystem} magma 
     * @param {*} ope 
     * @param {*} result 
     */
    const operateDiffusion = (magma, ope, result) => {
      const { targetPhase, tau, R, Rprev, divNum } = ope;

      // chemical profileを取得
      const profile = (magma.custom.profileStack.length > 0)
        ? reverseProfile(magma.custom.profileStack.pop())
        : {};

      const section = getProfileWithRadius(profile, Rprev, R)

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
     * Assumed crustal processes are reputation of magma mixing, crystal growth, 
     *   and elemental diffusion in crystals.
     * The time of reputation is the same as number of growth stage of the focused crystal. 
     * 
     * eruptedMelt =>
     * ascend(push profile) -> beforeMixing ->
     * ascend(push profile) -> beforeMixing ->
     * ...->
     * ascend(push profile)
     * => primaryMelt
     * 
     * then 
     * section.push(reverse(profileStack.pop()))
     *  .diffuse()
     *  .push(reverse(profileStack.pop()))
     *  .diffuse()
     *  ...
    */
    const repeat = repeatedArray(option.radius.length - 1);
    /**
     * 噴出マグマから初生マグマまで結晶成長とマグマ混合をさかのぼっていく
     */
    const magmaProcessesSequence = [
      ...repeat([approximateMagmaMixing, growCrystals]),
      ...repeat([operateDiffusion])
    ]

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

    //console.log(magmaProcessesSequence)
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
        ...magmaProcessesSequence
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
     * The chemical composition of grown crystal determined by host melt composition and partitioning coefficients. 
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
    const getParameterGrowth = (p, i, option) => {
      return {
        'dF': option.dF,
        'targetPhase': option.targetPhase,
        'MgN_beforeCrystallization': p.MgN_beforeCrystallization,
        'stoichiometry': {
          'olivine': 1 - p.growth_stoichiometry_orthopyroxene
            - p.growth_stoichiometry_spinel,
          'orthopyroxene': p.growth_stoichiometry_orthopyroxene,
          'spinel': p.growth_stoichiometry_spinel
        },
        /*'Fe2Ratio': option.melt0.Fe2Ratio, include in option.melt*/
        'P': option.P[i]
      }
    }

    const getParameterGrowthRim = (p, i, option) => {
      return {
        'dF': option.dF,
        'targetPhase': option.targetPhase,
        'MgN_beforeMixing': option.MgN_atRim,
        'stoichiometry': {
          'olivine': 1 - p.mixing_stoichiometry_orthopyroxene
            - p.mixing_stoichiometry_spinel,
          'orthopyroxene': p.mixing_stoichiometry_orthopyroxene,
          'spinel': p.mixing_stoichiometry_spinel
        },
        'P': option.P[i]
      }
    }

    const getParameterMixing = (p, i, option) => {
      return {
        'dF': option.dF,
        'targetPhase': option.targetPhase,
        'MgN_beforeMixing': p.MgN_beforeMixing,
        'stoichiometry': {
          'olivine': 1 - p.mixing_stoichiometry_orthopyroxene
            - p.mixing_stoichiometry_spinel,
          'orthopyroxene': p.mixing_stoichiometry_orthopyroxene,
          'spinel': p.mixing_stoichiometry_spinel
        },
        'P': option.P[i]
      }
    }

    const getParameterDiffusion = (p, i, option) => {
      return {
        'targetPhase': option.targetPhase,
        'tau': p.log10_tau,
        'R': option.radius[i + 1],
        'Rprev': option.radius[i],
        'divNum': (i + 1) * 10
      }
    }

    const model = (_parameters, data) => {
      // new
      const parameters = [..._parameters];

      const parametersLiquidLine = [];
      const parametersDiffusion = [];
      const last = parameters.length - 1;
      let i = last
      while (i >= 0) {
        let p = parameters.pop();
        if (i === last) {
          parametersLiquidLine.push(getParameterGrowthRim(p, i, option));
        } else {
          parametersLiquidLine.push(getParameterMixing(p, i, option));
        }
        parametersLiquidLine.push(getParameterGrowth(p, i, option));
        parametersDiffusion.push(getParameterDiffusion(p, last - i, option));
        i--;
      }

      const modelParameters = [
        ...parametersLiquidLine,
        ...parametersDiffusion
      ];

      //console.log(modelParameters)

      return magma.execAction([
        {
          'targetPhase': option.targetPhase,
          'D': option.D0,
          'finalMelt': option.finalMelt,
        },
        ...modelParameters,
        {
          'targetPhase': option.targetPhase,
          'dataPos': data.x
        }
      ])

    }


    /**
     * Initial value of parameters are not important.
     */
    const parameters = Array(option.radius.length - 1).fill(0).map((_) => {
      return {
        'MgN_beforeCrystallization': 85,
        'growth_stoichiometry_orthopyroxene': 0.5,
        'growth_stoichiometry_spinel': 0.05,
        'MgN_beforeMixing': 80,
        'mixing_stoichiometry_orthopyroxene': 0.5,
        'mixing_stoichiometry_spinel': 0.05,
        'log10_tau': 6
      }
    });

    /**
     * In the model, initial and final Mg# of the orthopyroxene phenocryst during crystal growth are unknown parameters. 
     */
    const updateCondition = (option.hasOwnProperty("updateCondition"))
      ? option.updateCondition
      : {
        'MgN_beforeCrystallization': {
          'val': 0.5,
          'max': 93,
          'min': 75
        },
        'growth_stoichiometry_orthopyroxene': {
          'val': 0.05,
          'max': 1,
          'min': 0
        },
        'growth_stoichiometry_spinel': {
          'val': 0.005,
          'max': 0.1,
          'min': 0
        },
        'MgN_beforeMixing': {
          'val': 0.5,
          'max': 93,
          'min': 75
        },
        'mixing_stoichiometry_orthopyroxene': {
          'val': 0.05,
          'max': 1,
          'min': 0
        },
        'mixing_stoichiometry_spinel': {
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

    /**
     * 結晶化前のMg#は結晶化後のMg#, すなわちマグマ混合前のMg#より大きい.
     * 最外部のセクションの結晶化前のMg#は結晶のリムのMg#より大きい.
     * 
     */
    const constrain = {
      MgN_beforeCrystallization: (cand, i, parameter) => (i === parameter.length - 1)
        ? cand > option.MgN_atRim
        : cand > parameter[i].MgN_beforeMixing,
      MgN_beforeMixing: (cand, i, parameter) => (i === parameter.length - 1)
        ? true
        : cand < parameter[i].MgN_beforeCrystallization,
      growth_stoichiometry_orthopyroxene: (cand, i, parameter) => (0 < cand && cand + parameter[i].growth_stoichiometry_orthopyroxene <= 1),
      growth_stoichiometry_spinel: (cand, i, parameter) => cand + parameter[i].growth_stoichiometry_orthopyroxene <= 1,
      mixing_stoichiometry_orthopyroxene: (cand, i, parameter) => (0 < cand && cand + parameter[i].growth_stoichiometry_orthopyroxene <= 1),
      mixing_stoichiometry_spinel: (cand, i, parameter) => cand + parameter[i].growth_stoichiometry_orthopyroxene <= 1
    }

    const mode = "estimator";

    return {
      model,
      parameters,
      updateCondition,
      constrain,
      mode,
      magma
    };
  }
}
))