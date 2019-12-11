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
 * @param {Object} mcmc_param
 *    @property {Number} MgN_beforeCrystallization
 *    @property {Number} growth_stoichiometry_orthopyroxene
 *    @property {Number} growth_stoichiometry_spinel
 *    @property {Number} mixing_stoichiometry_orthopyroxene
 *    @property {Number} mixing_stoichiometry_spinel
 *    @property {Number} log10_tau
 *
 * @param {int} shpere_idx
 *
 * @param {object} glbl_opt
 *
 * @return {Object}
 */
const mapCrystalGrowthParam = (mcmc_param, sphere_idx, glbl_opt) => {
    return {
        'dF': glbl_opt.dF,
        'targetPhase': glbl_opt.targetPhase,
        'MgN_beforeCrystallization': mcmc_param.MgN_beforeCrystallization,
        'stoichiometry': {
            'olivine': 1 - mcmc_param.growth_stoichiometry_orthopyroxene
                - mcmc_param.growth_stoichiometry_spinel,
            'orthopyroxene': mcmc_param.growth_stoichiometry_orthopyroxene,
            'spinel': mcmc_param.growth_stoichiometry_spinel
        },
        /*'Fe2Ratio': glbl_opt.melt0.Fe2Ratio, include in glbl_opt.melt*/
        'P': glbl_opt.P[sphere_idx]
    }
}

const mapCrystalRimGrowthParam = (mcmc_param, sphere_idx, glbl_opt) => {
    return {
        'dF': glbl_opt.dF,
        'targetPhase': glbl_opt.targetPhase,
        'MgN_beforeMixing': glbl_opt.MgN_atRim,
        'stoichiometry': {
            'olivine': 1 - mcmc_param.mixing_stoichiometry_orthopyroxene
                - mcmc_param.mixing_stoichiometry_spinel,
            'orthopyroxene': mcmc_param.mixing_stoichiometry_orthopyroxene,
            'spinel': mcmc_param.mixing_stoichiometry_spinel
        },
        'P': glbl_opt.P[sphere_idx]
    }
}

const mapMagmaMixingParam = (mcmc_param, sphere_idx, glbl_opt) => {
    return {
        'dF': glbl_opt.dF,
        'targetPhase': glbl_opt.targetPhase,
        'MgN_beforeMixing': mcmc_param.MgN_beforeMixing,
        'stoichiometry': {
            'olivine': 1 - mcmc_param.mixing_stoichiometry_orthopyroxene
                - mcmc_param.mixing_stoichiometry_spinel,
            'orthopyroxene': mcmc_param.mixing_stoichiometry_orthopyroxene,
            'spinel': mcmc_param.mixing_stoichiometry_spinel
        },
        'P': glbl_opt.P[sphere_idx]
    }
}

const mapLatticeDiffusionParam = (mcmc_param, sphere_idx, glbl_opt) => {
    return {
        'targetPhase': glbl_opt.targetPhase,
        'tau': mcmc_param.log10_tau,
        'R': glbl_opt.radius[sphere_idx + 1],
        'Rprev': glbl_opt.radius[sphere_idx],
        'divNum': (sphere_idx + 1) * 10
    }
}

module.exports = {
    mapCrystalGrowthParam,
    mapCrystalRimGrowthParam,
    mapLatticeDiffusionParam,
    mapMagmaMixingParam
}
