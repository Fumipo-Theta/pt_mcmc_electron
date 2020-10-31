const program = require("commander");
const fs = require("fs");
const { ResultResolver, AnalysisResolver, McmcMeta } = require("./lib/common");
const {
    read,
    concat_df,
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

        const {
            model,
            sampleMeltComposition
        } = require(meta.model("../"))(meta.option())

        analysis_dir.make_melt_dir(summary_method)

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
