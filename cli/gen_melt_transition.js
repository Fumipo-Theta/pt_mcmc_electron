const program = require("commander");
const fs = require("fs");
const { ResultResolver, AnalysisResolver, McmcMeta } = require("./lib/common");
const {
    read,
    concat_df,
    getSummarizedParameters,
} = require("../tool/show-magma-model")


program
    .arguments("<subdirectory>")
    .arguments("<num_mc>")
    .arguments("<summary_method>")
    .action((subdir, num_mc, summary_method) => {
        const result_dir = new ResultResolver(subdir)
        const analysis_dir = new AnalysisResolver(subdir)
        const samples = result_dir.list_sample_paths(num_mc)
        const meta = new McmcMeta(result_dir.list_meta_paths()[0])
        const [summary_path, ..._] = analysis_dir.resolve_summary_path(num_mc)
        const summary = read.csv(summary_path)

        const {
            model,
            parameters,
            sampleMeltComposition
        } = require(meta.model("../"))(meta.option())

        const summarized_params = getSummarizedParameters(
            summary, summary_method, parameters
        )

        const df_parameters = concat_df(
            samples.map(read.csv)
        )

        sampleMeltComposition(
            df_parameters,
            model,
            meta.data(),
            "z:/",
            num_mc,
            fs
        )

    })
    .parse(process.argv)
