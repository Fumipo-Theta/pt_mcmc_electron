const $ = require("shelljs")
const fs = require("fs")
const path = require("path")

ANALYSIS_DIR = path.join(__dirname, "../../analyzed")
RESULT_DIR = path.join(__dirname, "../../results")

const mkdir = (path) => {
    if (!fs.existsSync(path)) $.mkdir(path)
    if (fs.statSync(path).isDirectory()) return
    $.mkdir(path)
}

const summary_file_name = (num_mc) => `summary_MC-${num_mc}.csv`
const summary_log_name = (num_mc) => `summary_MC-${num_mc}_log.json`

const liquid_line_name = (num_mc) => `liquid_line_MC-${num_mc}.json`

const zoning_name = (num_mc, phase) => `zoning_${phase}_MC-${num_mc}.json`

const match_initial_melt = num_mc => dirent => {
    const pattern = new RegExp(`initial_melt_MC-${num_mc}.*\.csv$`)

    return dirent.name.match(pattern)
}

const match_final_melt = num_mc => dirent => {
    const pattern = new RegExp(`final_melt_MC-${num_mc}.*\.csv$`)
    return dirent.name.match(pattern)
}

class PathResolver {
    constructor(root_dir, subdir) {
        this.path = path.join(root_dir, subdir)
    }

    is_dir() {
        return fs.statSync(this.path).isDirectory()
    }

    resolve() {
        return this.path
    }
}

class ResultResolver {
    constructor(subdir) {
        this.path = new PathResolver(RESULT_DIR, subdir)
    }

    is_dir() {
        return this.path.is_dir()
    }

    resolve() {
        return this.path.resolve()
    }

    list_meta_paths() {
        const dirents = fs.readdirSync(this.resolve(), { withFileTypes: true })
        return dirents.filter(dirent => dirent.name.match(/meta-.*\.json$/))
            .map(dirent => path.join(this.resolve(), dirent.name))
    }

    list_sample_paths(num_mc) {
        const sample_pattern = new RegExp(`sample-${num_mc}-.*\.csv$`)
        const dirents = fs.readdirSync(this.resolve(), { withFileTypes: true })
        return dirents.filter(dirent => dirent.name.match(sample_pattern))
            .map(dirent => path.join(this.resolve(), dirent.name))
    }

}

class AnalysisResolver {
    constructor(subdir) {
        this.path = new PathResolver(ANALYSIS_DIR, subdir)
    }

    is_dir() {
        return this.path.is_dir()
    }

    resolve() {
        return this.path.resolve()
    }

    resolve_summary_path(num_mc) {
        return [
            path.join(this.resolve(), summary_file_name(num_mc)),
            path.join(this.resolve(), summary_log_name(num_mc))
        ]
    }

    resolve_liquid_line(num_mc, summarize_method) {
        return path.join(this.resolve(), `./melt/${summarize_method}/${liquid_line_name(num_mc)}`)
    }

    resolve_zoning(num_mc, summarize_method, phase) {
        return path.join(this.resolve(), `./melt/${summarize_method}/${zoning_name(num_mc, phase)}`)
    }

    make_melt_dir(summarize_method) {
        mkdir(path.join(this.resolve(), "./melt/"))
        mkdir(path.join(this.resolve(), `./melt/${summarize_method}`))
    }

    list_sampled_melt_paths(num_mc, summarize_method) {
        const melt_dir = path.join(this.resolve(), `./melt/${summarize_method}`)

        const dirents = fs.readdirSync(
            melt_dir,
            { withFileTypes: true }
        )

        const initials = dirents
            .filter(match_initial_melt(num_mc))
            .map(dirent => path.join(melt_dir, dirent.name))
        const finals = dirents
            .filter(match_final_melt(num_mc))
            .map(dirent => path.join(melt_dir, dirent.name))

        return [initials, finals]
    }
}

class McmcMeta {
    constructor(meta_path) {
        this.meta = JSON.parse(
            fs.readFileSync(meta_path)
        )
    }

    data() {
        return this.meta.data
    }

    error() {
        return this.meta.error
    }

    model(root) {
        return path.join(root, this.meta.model)
    }

    option() {
        return this.meta.option
    }
}

module.exports = {
    ResultResolver,
    AnalysisResolver,
    McmcMeta
}
