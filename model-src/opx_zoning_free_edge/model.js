const model = (_parameters, data, isMCMC = true) => {
    // copy input parameters
    const parameters = [..._parameters];

    const parametersLiquidLine = [];
    const parametersDiffusion = [];
    const last = parameters.length - 1;
    let i = last
    while (i >= 0) {
        let p = parameters.pop();
        parametersLiquidLine.push(getParameterMixing(p, i, option));
        parametersLiquidLine.push(getParameterGrowth(p, i, option));
        parametersDiffusion.push(getParameterDiffusion(p, last - i, option));
        i--;
    }

    const modelParameters = [
        ...parametersLiquidLine,
        ...parametersDiffusion
    ];

    //console.log(modelParameters)

    const modeled = magma.execAction([
        {
            'targetPhase': option.targetPhase,
            'D': option.D0,
            'finalMelt': option.finalMelt,
        },
        ...modelParameters,
        {
            'targetPhase': option.targetPhase,
            'dataPos': data.x
        }
    ])

    return (isMCMC)
        ? modeled
        : magma

}

module.exports = model
