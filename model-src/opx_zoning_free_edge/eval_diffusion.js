/**
 * Calculate radius in the crystal by assuming spherical shape and constant density
 *   from mass fraction at each step of growth.
 * The initial and final radius are known by line analysis with EPMA.
 *
 * @param {*} initialRadius
 * @param {*} finalRadius
 * @param {*} totalMass
 */
const massToRadiusByConstantDensity = (initialRadius, finalRadius, totalMass) => {
    const A = (Math.pow(finalRadius, 3) - Math.pow(initialRadius, 3)) / totalMass;
    return f => Math.pow(A * (totalMass - f) + Math.pow(initialRadius, 3), 1 / 3)
}

const reverseProfile = (profile) => {
    const newProfile = {};
    Object.entries(profile)
        .map(([k, v]) => {
            newProfile[k] = [...v].reverse()
        })
    return newProfile;
}

/**
 * Relate composition and radius in the position of the crystal.
 *
 * @param {*} magma
 * @param {*} targetPhase
 * @param {*} Rini
 * @param {*} Rfin
 */
const getProfileWithRadius = (profile, Rini, Rfin) => {
    const newProfile = Object.assign(profile, {});
    const l = newProfile.F.length;
    newProfile.x = newProfile.F.map(massToRadiusByConstantDensity(Rini, Rfin, newProfile.F[0]));
    return newProfile;
}

/**
 * Simulate elemental diffusion in the focused crystal.
 * The crystal is spherical symmetry.
 * Diffusion coefficients depends only on temperature as Arrhenius relation.
 *
 * In the model, inter diffusivity of Fe and Mg components and self diffusivity of Cr2O3 are
 *  considered.
 * During diffusion, the host melt composition is constant and local equilibrium at crystal surface
 *  always established.
 *
 * Spatially one dimension diffusion equation is numerically solved by Crank-Nicolson method.
 * Neumann condition at the center of crystal, and Dericklet condition at the edge.
 *
 * The scale of time and temperature for diffusivity is treated as unknown parameter, 'total scale of diffusion'.
 * The scale is originally introduced by Lasaga (1983) as compressed time.
 * Total scale of diffusion represent all possible cooling history which yields the same value of compressed time.
 *
 * @param {MagmaSystem} magma
 * @param {*} ope
 * @param {*} result
 */
const evalDiffusion = (magma, ope, result) => {
    const { targetPhase, tau, R, Rprev, divNum } = ope;

    // chemical profileを取得
    const profile = (magma.custom.profileStack.length > 0)
        ? reverseProfile(magma.custom.profileStack.pop())
        : {};

    const section = getProfileWithRadius(profile, Rprev, R)

    const diffusionInSphere = magma.getDiffusionProfile(targetPhase);
    Object.values(diffusionInSphere).map(d => {
        d.appendSection(section)
            .setMaxCompressedTime(tau)
            .divideSpaceEqually(divNum)
            .nondimensionalize()
            .implicitCN()
            .redimensionalize()
    })

    return {}
}

module.exports = evalDiffusion
