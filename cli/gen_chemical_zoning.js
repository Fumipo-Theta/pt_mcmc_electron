const program = require("commander");
const fs = require("fs");
const { ResultResolver, AnalysisResolver, McmcMeta } = require("./lib/common");
const {
    read,
    concat_df,
    getSummarizedParameters,
    groupEachStage
} = require("../tool/show-magma-model")

program
    .arguments("<subdirectory>")
    .arguments("<num_mc>")
    .arguments("<summary_method>")
    .action((subdir, num_mc, summary_method) => {
        const result_dir = new ResultResolver(subdir)
        const analysis_dir = new AnalysisResolver(subdir)
        const meta = new McmcMeta(result_dir.list_meta_paths()[0])

        const [summary_path, ..._] = analysis_dir.resolve_summary_path(num_mc)
        const summary = read.csv(summary_path)

        const {
            model,
            parameters,
            getChemicalZoning
        } = require(meta.model("../"))(meta.option())

        analysis_dir.make_melt_dir(summary_method)

        const summarizedParameters = getSummarizedParameters(summary, summary_method, parameters);


        const zoning = getChemicalZoning(model, summarizedParameters, meta.data(), "orthopyroxene")

        const zoning_path = analysis_dir.resolve_zoning(num_mc, summary_method, "orthopyroxene")


        fs.writeFileSync(zoning_path, JSON.stringify(zoning))
    })
    .parse(process.argv)
