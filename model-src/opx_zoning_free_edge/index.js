const genMagmaModel = require('./model')

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
 *    composition : {String : Number},
 *    Fe2Ratio : Number
 *  },
 *  P : [Number],
 *  MgN_atRim : Number
 * }
 */
module.exports = option => {

    const { magma, model } = genMagmaModel(option)

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
     * Mg# of the opx before fractional crystallization
     *   must be larger than that after crystallization,
     *   which is assumed to be Mg# before magma mixing.
     *
     * Sum of soichiometry of crystallization of opx and
     *   spinel must be less equal to 1.
     * Sum of fraction of approximating magma mixing
     *  of opx and spinel is assumed to be less equal
     *  to 1.
     */
    const constrain = {
        MgN_beforeCrystallization: (cand, i, parameter) => cand > parameter[i].MgN_beforeMixing,
        MgN_beforeMixing: (cand, i, parameter) => cand < parameter[i].MgN_beforeCrystallization,
        growth_stoichiometry_orthopyroxene: (cand, i, parameter) => (0 < cand && cand + parameter[i].growth_stoichiometry_spinel <= 1),
        growth_stoichiometry_spinel: (cand, i, parameter) => cand + parameter[i].growth_stoichiometry_orthopyroxene <= 1,
        mixing_stoichiometry_orthopyroxene: (cand, i, parameter) => (0 < cand && cand + parameter[i].mixing_stoichiometry_spinel <= 1),
        mixing_stoichiometry_spinel: (cand, i, parameter) => cand + parameter[i].mixing_stoichiometry_orthopyroxene <= 1
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
