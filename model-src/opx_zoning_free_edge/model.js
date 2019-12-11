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

const MagmaSystem = require('../../../phase/src/magma-system');
const { mapCrystalGrowthParam, mapLatticeDiffusionParam, mapMagmaMixingParam } = require("./map_model_parameter")
const { melt, olivine, orthopyroxene, spinel, meltThermometer } = require("./def_phases")

const initMagmaSystem = require("./initialize_magma_system")
const simulateMagmaMixing = require("./approximate_magma_mixing")
const simulateCrystalGrowth = require("./grow_crystals")
const evalDiffusionAfterGrowth = require("./eval_diffusion")
const mapProfileToPosition = require("./map_diffused_profile_to_position")


const getMagmaPT = (magma, opt) => {
    const pressure = magma.barometer();
    const temperature = magma.thermometer(pressure)

    return {
        T: temperature,
        P: pressure
    }
}

/**
 * get index count from the reversal direction
 */
const fromLast = (i, len) => len - i - 1

const repeatedArray = n => (array) => Array(n)
    .fill(0)
    .map(_ => [...array])
    .reduce((a, b) => [...a, ...b]);

/**
 * Construct magma system and model on generating chemical zoning of a target crystal.
 *
 */
const genMagmaModel = (option) => {

    /**
     * Go back the change of host melt from the lava
     *  composition to the primary melt.
     * Trace corresponding chemical zoning of grown shell
     *  of crystals.
     * Evaluate lattice diffusion after growth of each shell.
     * Assumed crustal processes are reputation of magma mixing, crystal growth,
     *   and elemental diffusion in crystals.
     * The time of reputation is the same as number of growth stage of the focused crystal.
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

    const magmaProcessesSequence = [
        ...repeat([simulateMagmaMixing, simulateCrystalGrowth]),
        ...repeat([evalDiffusionAfterGrowth])
    ]

    const magma = new MagmaSystem()
    magma.setThermodynamicHandler(getMagmaPT)
        .setAction([
            initMagmaSystem, ...magmaProcessesSequence
        ])
        .setFinalAction(
            mapProfileToPosition
        )

    const model = (mcmc_parameters, data, isMCMC = true) => {
        // copy input parameters
        const parameters = [...mcmc_parameters].reverse();
        const paramNum = parameters.length

        const restoreLiquidLineParams = parameters.map(
            (p, i) => [
                mapMagmaMixingParam(p, fromLast(i, paramNum), option),
                mapCrystalGrowthParam(p, fromLast(i, paramNum), option)
            ]
        ).flat();

        const execLatticeDiffusionParams = parameters.map(
            (p, i) => mapLatticeDiffusionParam(p, i, option)
        );

        /*
        const last = parameters.length - 1;
        let i = last
        while (i >= 0) {
            let p = parameters.pop();
            parametersLiquidLine.push(getParameterMixing(p, i, option));
            parametersLiquidLine.push(getParameterGrowth(p, i, option));
            parametersDiffusion.push(getParameterDiffusion(p, last - i, option));
            i--;
        }
        */

        const initializeMagmaOpt = {
            'phases': [melt, olivine, orthopyroxene, spinel],
            'thermometer': meltThermometer,
            'targetPhase': option.targetPhase,
            'D': option.D0,
            'finalMelt': option.finalMelt,
        }

        const getProfileOpt = {
            'targetPhase': option.targetPhase,
            'dataPos': data.x
        }

        const modeledProfile = magma.execAction([
            initializeMagmaOpt,
            ...restoreLiquidLineParams,
            ...execLatticeDiffusionParams,
            getProfileOpt
        ])

        return (isMCMC)
            ? modeledProfile
            : magma

    }

    return { magma, model }
}

module.exports = genMagmaModel
