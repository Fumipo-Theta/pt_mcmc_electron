
const dfRowToParameters = (df, index) => {
    const p = [];
    const row = Object.entries(df).map(([key, column]) => {
        try {
            var stage = key.match(/[0-9]+$/)[0];
            var parameterName = key.replace(stage, "");
        } catch{
            return []
        }
        return [{
            stage: parseInt(stage),
            parameter: parameterName,
            value: parseFloat(column[index])
        }]
    }).reduce((a, b) => [...a, ...b], [])
    row.map(obj => obj.stage)
        .filter((x, i, self) => self.indexOf(x) === i)
        .map((_, i) => {
            p[i] = {}
        });
    row.map(({ stage, parameter, value }) => {
        p[stage][parameter] = value
    })
    return p;
}

const meltBeforeCrystallization = (df, index, stage, model, data) => {
    const liquidLineStack = model(dfRowToParameters(df, index), data, false).custom.differentiationLineStack
    const l = liquidLineStack.length;
    const liquidLine = liquidLineStack[l - stage - 1];
    const obj = {}
    Object.entries(liquidLine).map(([key, array]) => {
        obj[key] = array[array.length - 1]
    })
    return obj
}

const meltBeforeMixing = (df, index, stage, model, data) => {
    const liquidLineStack = model(dfRowToParameters(df, index), data, false).custom.differentiationLineStack
    const l = liquidLineStack.length;
    const liquidLine = liquidLineStack[l - stage - 1];
    const obj = {}
    Object.entries(liquidLine).map(([key, array]) => {
        obj[key] = array[0]
    })
    return obj
}

/**
 *
 * @param {*} df
 *  DataFrame of model parameters
 * @param {*} model
 * @param {*} data
 * @param {*} directory
 */
const sampleMeltComposition = (df, model, data, directory, num_mc, fs) => {
    const reduceToCsv = (a, b) => a + "," + b
    const ini_path = (stage) => `${directory}initial_melt_MC-${num_mc}_stage-${stage}.csv`;
    const fin_path = (stage) => `${directory}final_melt_MC-${num_mc}_stage-${stage}.csv`;
    const stageLength = Object.keys(df).filter(param => /MgN_beforeCrystallization[0-9]+/.test(param)).length;
    const l = df[Object.keys(df)[0]].length;

    for (let stage = 0; stage < stageLength; stage++) {
        for (let i = 0; i < l; i++) {
            let ini_melt = meltBeforeCrystallization(df, i, stage, model, data);
            let fin_melt = meltBeforeMixing(df, i, stage, model, data)
            if (i === 0) {
                fs.writeFileSync(ini_path(stage), Object.keys(ini_melt).reduce(reduceToCsv) + ",lnP\n")
                fs.writeFileSync(fin_path(stage), Object.keys(fin_melt).reduce(reduceToCsv) + ",lnP\n")
            }
            fs.appendFileSync(ini_path(stage), Object.values(ini_melt).reduce(reduceToCsv) + "," + df.lnP[i] + "\n")
            fs.appendFileSync(fin_path(stage), Object.values(fin_melt).reduce(reduceToCsv) + "," + df.lnP[i] + "\n")
        }
        console.log(`Stage ${stage + 1}/${stageLength} fulfilled.`)

    }
}

module.exports = sampleMeltComposition
