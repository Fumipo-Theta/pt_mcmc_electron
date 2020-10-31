const len = array => array.length
/**
 * Return an object : {
 *      fractionation_line : {
 *          stage-[n] : {
 *              SiO2 : [],
 *              Al2O3 : [], ...
 *          },
 *          stage-[n-1] : {
 *              SiO2 : [],
 *              Al2O3 : [], ...
 *          },
 *          ...
 *      },
 *      mixing_line : {
 *          stage-[n] : {
 *              SiO2 : [],
 *              Al2O3 : [], ...
 *          },
 *          stage-[n-1] : {
 *              SiO2 : [],
 *              Al2O3 : [], ...
 *          },
 *          ...
 *      }
 * }
 *
 * @param {MagmaSys} magma
 */
const integrateLiquidLine = (magma) => {
    const fracLines = magma.custom.differentiationLineStack;
    const mixLines = magma.custom.mixingLineStack;

    const l_frac = len(fracLines),
        l_mix = len(mixLines)

    const result = {
        fractionation_line: {},
        mixing_line: {}
    }

    fracLines.map((line, i) => {
        result.fractionation_line[`stage-${l_frac - i - 1}`] = line
    })

    mixLines.map((line, i) => {
        result.mixing_line[`stage-${l_mix - i - 1}`] = line
    })

    return result
}


module.exports = integrateLiquidLine
