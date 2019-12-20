/**
 * Return chemical zoning of modeled and not-diffused
 *
 * {
 *      "modeled" : {
 *          "x" : [],
 *          [component A] : [],
 *          [component B] : []
 *      },
 *      "no_diffusion" : {
 *          "x" : [],
 *          [component A] : [],
 *          [component B] : []
 *      },
 * }
 *
 * @param {*} model
 * @param {*} params
 * @param {*} data
 * @param {*} phase
 */
const getChemicalZoning = (model, params, data, phase) => {
    const magma = model(params, data, false)
    const ndProfiles = magma.diffusionProfiles[phase]
    const modeled_profile = model(params, data)
    const result = {
        modeled: {},
        no_diffusion: {}
    }

    const components = Object.keys(modeled_profile)

    components.map(comp => {
        result.modeled[comp] = modeled_profile[comp]
        if (comp === "x") return
        result.no_diffusion[comp] = ndProfiles[comp].notDiffusedProfile.get().c
        result.no_diffusion["x"] = ndProfiles[comp].notDiffusedProfile.get().x
    })

    return result
}

module.exports = getChemicalZoning
