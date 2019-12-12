const InterDiffusion = require('../../../diffusion/src/inter-diffusion');
const SelfDiffusion = require('../../../diffusion/src/self-diffusion');
const Diffusion = require('../../../diffusion/src/diffusion');


const getD = (D, phase, component) => Diffusion.getD(D, phase, component);

/**
     * Create object to simulate lattice diffusion.
     *
     * @param {MagmaSystem} magma
     * @param {Object} ope
     *  @property {Array<Phase>} phases
     *  @property {Function} thermometer
     *  @property {String} targetPhase
     */
const initialize = (magma, ope) => {
    const { phases, thermometer, targetPhase, D, finalMelt } = ope;

    magma.setThermodynamicAgent({
        phase: phases,
        thermometer: thermometer
    });
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


module.exports = initialize
