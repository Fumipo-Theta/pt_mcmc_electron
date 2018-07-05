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

importScripts("../../phase/js/geochem.js");
importScripts("../../phase/js/chemical_profile.js");
importScripts("../../phase/js/phase.js");
importScripts("../../phase/js/liquid.js"); // Liquid
importScripts("../../phase/js/solid.js"); // Solid
importScripts("../../jslib/matrix/matrix.js");
importScripts("../../phase/js/equilibrate.js");//Equilibrate

importScripts("../../phase/js/partitioning.js");//D
importScripts("../../phase/js/exchangePartitioning.js");//KD
importScripts("../../phase/js/geothermobarometer.js"); //geothermobarometer
importScripts("../../phase/js/magma-system.js"); // MagmaSystem

importScripts("../../jslib/funcTools.js")
importScripts("../../diffusion/js/diffusion.js");
importScripts("../../diffusion/js/inter-diffusion.js"); // InterDiffusion
importScripts("../../diffusion/js/self-diffusion.js"); // SelfDiffusion*/
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
  return (option) => {
    const { D0, radius, melt0, Pini } = option;

    const { thermometer, barometer, oxybarometer } = geothermobarometer;

    /** Utility functions
     * 
     */
    const inRange = (min, max) => x => (min <= x && x <= max);
    const compare = (target, sign = 1.) => x => (x - target) * sign > 0;
    const getD = (D, phase, component) => Diffusion.getD(D, phase, component);


    /**
     * create melt, olivine, orthopyroxene, and spinel.
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

      const melt = new Liquid("melt").initialize()

      const olivine = new Solid("olivine")
        .initialize()
        .setKD({
          "Fe_Mg": KD.olivine.Fe_Mg.Beattie1993()
        })
        .setD({
          "Cr2O3": D.olivine.Cr2O3.FreiS2009(),
          "NiO": D.olivine.NiO.NormanS2005(),
          "Al2O3": D.olivine.Al2O3.myCompile(melt),
          "CaO": D.olivine.CaO.myCompile(melt),
          "TiO2": D.olivine.TiO2.dummy()
        })
        .setSolver("melt", Equilibrate.olivine_melt(melt, "solve"));

      const orthopyroxene = new Solid("orthopyroxene")
        .initialize()
        .setKD({ "Fe_Mg": KD.orthopyroxene.Fe_Mg.Beattie1993() })
        .setD({
          "Cr2O3": D.orthopyroxene.Cr2O3.FreiS2009(),
          "NiO": D.orthopyroxene.NiO.NormanS2005(),
          "Al2O3": D.orthopyroxene.Al2O3.myCompile(melt),
          "CaO": D.orthopyroxene.CaO.myCompile(melt),
          "TiO2": D.orthopyroxene.TiO2.dummy()
        })
        .setSolver("melt", Equilibrate.opx_melt(melt, "solve"));

      const spinel = new Solid("spinel")
        .initialize()
        .setD({
          "Cr2O3": D.spinel.Cr2O3.LieS2008(),
          "NiO": D.spinel.NiO.LieS2008()
        })
        .setSolver("melt", Equilibrate.spinel_melt(melt, "solve"));

      const meltThermometer = (P) => thermometer.Sugawara2000(melt)(P) - thermometer.liquidusDropMG2008(melt)(P);

      return {
        phase: [melt, olivine, orthopyroxene, spinel],
        thermometer: meltThermometer
      }
    }

    /**
     * 
     * @param {MagmaSystem} magma 
     * @param {*} ope 
     */
    const initialize = (magma, ope) => {
      const { targetPhase, D } = ope;
      const FeMgDif = new InterDiffusion("FeO", "MgO", getD(D, targetPhase, "Fe_Mg"), "atom")

      const CrDif = new SelfDiffusion("Cr2O3", getD(D, targetPhase, "Cr2O3"))

      magma.setDiffusionProfile(FeMgDif, targetPhase, "Fe_Mg");
      magma.setDiffusionProfile(CrDif, targetPhase, "Cr2O3");

      return {}
    }


    /**
     * Add or remove small mass fraction of solid phases to/from host melt until a target phase gets equilibrium with the melt. 
     * Restore composition of phases at each calculation step.
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
     *  "orthopyroxene",
     *  91.5,
     *  {olivine : 0.5, orthopyroxene : 0.495, spinel : 0.005},
     *  0.001,
     *  true
     * )
     */
    const moveCrystalBoundary = (
      magma, observedPhaseName, targetMgN, stoichiometry, dF, isRecord
    ) => {
      const melt = magma.phase.melt;

      const observedPhase = magma.phase[observedPhaseName];
      let { T, P } = magma.getThermodynamicProperty();
      observedPhase.equilibrate("melt", T, P)

      const sign = (observedPhase.getMgNumber() < targetMgN) ? 1. : -1.;
      const pathName = (observedPhase.getMgNumber() < targetMgN) ? "ascend" : "descend";
      const isOver = compare(targetMgN, sign);
      const isInRange = inRange(-1, 1);
      let F = 0;
      const solids = Object.entries(magma.solids());

      solids.map(([_, phase]) => {
        phase.resetProfile(pathName);
      })

      while (isInRange(F) && !isOver(observedPhase.getMgNumber())) {
        let { T, P } = magma.getThermodynamicProperty();

        solids.map(entry => {
          entry[1].equilibrate("melt", T, P)
        })

        if (isRecord) {
          solids.map(entry => {
            let name = entry[0], phase = entry[1];
            phase.pushProfile(stoichiometry[name] * F, T, P, pathName)
          })
          melt.pushProfile(1 + F * sign, T, P, pathName)

        }


        melt.differentiate(
          solids.map(entry => { return { phase: entry[1], f: stoichiometry[entry[0]] } }),
          dF * sign
        )
          .compensateFe()

        F += dF;
      }
      if (isRecord) {
        solids.map(entry => {
          let name = entry[0], phase = entry[1];
          phase.pushProfile(stoichiometry[name] * F, T, P, pathName);
        })
        melt.pushProfile(1 + F * sign, T, P, pathName);
      }

    }




    /**
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
      const water = (ope.hasOwnProperty("water"))
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
      moveCrystalBoundary(magma, targetPhase, ini, stoichiometry, dF, true)

      return {}
    }

    /**
     * 
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
      moveCrystalBoundary(magma, targetPhase, fin, stoichiometry, dF, true)
      return {}
    }

    const getProfileSection = (magma, targetPhase, Rini, Rfin) => {
      const profile = magma.phase[targetPhase].getProfile("descend");
      const l = profile.F.length;


      const A = (Math.pow(Rfin, 3) - Math.pow(Rini, 3)) / profile.F[l - 1];

      profile.x = profile.F.map(f => Math.pow(A * f + Math.pow(Rini, 3), 1 / 3));


      return profile;
    }

    /**
     * 
     * @param {MagmaSystem} magma 
     * @param {*} ope 
     * @param {*} result 
     */
    const operateDiffusion = (magma, ope, result) => {
      const { targetPhase, tau, R, Rprev, divNum } = ope;

      // chemical profileを取得
      const section = getProfileSection(magma, targetPhase, Rprev, R)

      const diffusion = magma.getDiffusionProfile(targetPhase);
      Object.values(diffusion).map(d => {
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
     * 指定された半径で区切られた化学組成のセクションの数だけ,
     * 結晶成長と結晶内拡散を繰り返す
    */
    const magmaProcesses = radius.map((_, i) => {
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
    magma.setThermodynamicAgent(createPhase())
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

    console.log(magma)

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
    const model = (parameters, data) => {

      const modelParameters = parameters.map((p, i) => {
        return [
          {
            "initialMelt": melt0,
            "dF": 0.005,
            "targetPhase": "orthopyroxene",
            "ini": p.ini,
            "orthopyroxeneInit": p.orthopyroxeneInit,
            "spinelInit": p.spinelInit,
            "Fe2Ratio": melt0.Fe2Ratio,
            "Pini": Pini[i]
          },
          {
            "dF": 0.005,
            "targetPhase": "orthopyroxene",
            "fin": p.fin,
            "orthopyroxeneInit": p.orthopyroxeneInit,
            "spinelInit": p.spinelInit,
          },
          {
            "targetPhase": "orthopyroxene",
            "tau": p.log10_tau,
            "R": radius[i + 1],
            "Rprev": radius[i],
            "divNum": (i + 1) * 10
          }
        ]
      }).reduce((a, b) => [...a, ...b], []);

      //console.log(modelParameters)

      return magma.execAction([
        {
          "targetPhase": "orthopyroxene",
          "D": D0
        },
        ...modelParameters,
        {
          "targetPhase": "orthopyroxene",
          "dataPos": data.x
        }
      ])

    }

    /**
     * Initial value of parameters are not important.
     */
    const parameters = Array(9).fill(0).map((_, i) => {
      return {
        "ini": 85,
        "fin": 80,
        "orthopyroxeneInit": 0.5,
        "spinelInit": 0.05,
        "log10_tau": 6
      }
    });

    /**
     * In the model, initial and final Mg# of the orthopyroxene phenocryst during crystal growth are unknown parameters. 
     */
    const updateCondition = {
      "ini": {
        "val": 1,
        "max": 93,
        "min": 75
      },
      "fin": {
        "val": 1,
        "max": 93,
        "min": 75
      },
      "orthopyroxeneInit": {
        "val": 0.05,
        "max": 1,
        "min": 0
      },
      "spinelInit": {
        "val": 0.005,
        "max": 0.1,
        "min": 0
      },
      "log10_tau": {
        "val": 0.1,
        "max": 12,
        "min": 0
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
}))