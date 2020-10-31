const recordProfile = require("./record_profile_with_local_equilibrium")

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
const alongLiquidLine = (magma, ope, result) => {
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
    const pathName = recordProfile(
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

module.exports = alongLiquidLine
