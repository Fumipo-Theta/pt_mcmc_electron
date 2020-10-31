/**
    *
    * Map array of diffused values to the position from
    *  the center.
    *
    * @param {*} magma
    * @param {*} opt
    */
const mapDiffusedProfileToPosition = (magma, opt) => {
    const diffusion = magma.diffusionProfiles[opt.targetPhase];
    const { dataPos } = opt;

    return Object.entries(diffusion).map(([k, v]) => {
        // データに合わせてxの位置を変形
        v.profile.transformByRadius(dataPos)

        const p = v.profile.get()
        const obj = {}
        obj.x = p.x;
        obj[k] = p.c
        return obj
    }).reduce((a, b) => Object.assign(a, b), {})
}

module.exports = mapDiffusedProfileToPosition
