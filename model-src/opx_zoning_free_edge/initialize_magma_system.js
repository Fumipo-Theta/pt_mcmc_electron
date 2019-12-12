const InterDiffusion = require('../../../diffusion/src/inter-diffusion');
const SelfDiffusion = require('../../../diffusion/src/self-diffusion');
const Diffusion = require('../../../diffusion/src/diffusion');
const Liquid = require('../../../phase/src/liquid')

/**
 * Initialize magma system condition.
 *  1. Register Phase instances and thermometer, barometer, and oxybarometer etc.
 *  2. Set initial composition of the liquid phase.
 *  3. Register Diffusion instances to the target phase.
 *  4. Prepare custum slots for recording profiles.
 *
 * @param {MagmaSystem} magma
 * @param {Object} options
 *  @property {Object} systemComponents
 *     @property {Array<Phase>} phase
 *     @property? {Function} thermometer
 *  @property {Function} thermometer
 *  @property {String} targetPhase
 *  @property {Object} Diffusion
 *  @property {Object} finalMelt
 */
const initialize = (magma, options) => {
    const { systemComponents, targetPhase, D, finalMelt } = options;

    magma.setThermodynamicAgent(systemComponents);

    if (! magma.phase.melt instanceof Liquid) {
        throw new Error("Must set a Liquid phase which name is 'melt'")
    }

    magma.phase.melt.setComposition(finalMelt.composition)
    if (finalMelt.hasOwnProperty("Fe2Ratio")) {
        magma.phase.melt.setFe2Ratio(finalMelt.Fe2Ratio)
            .compensateFe()
    }

    const FeMgDif = new InterDiffusion('FeO', 'MgO', Diffusion.getD(D, targetPhase, 'Fe_Mg'), 'atom')
    const CrDif = new SelfDiffusion('Cr2O3', Diffusion.getD(D, targetPhase, 'Cr2O3'))

    magma.setDiffusionProfile(FeMgDif, targetPhase, 'Fe_Mg');
    magma.setDiffusionProfile(CrDif, targetPhase, 'Cr2O3');
    magma.custom.profileStack = [];
    magma.custom.mixingLineStack = [];
    magma.custom.differentiationLineStack = [];

    return {}
}


module.exports = initialize
