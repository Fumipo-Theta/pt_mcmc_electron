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
