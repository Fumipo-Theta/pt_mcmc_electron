const recordCondition = require("./record_local_equilibrium")

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

    const pathName = recordCondition(
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

module.exports = approximateMagmaMixing
