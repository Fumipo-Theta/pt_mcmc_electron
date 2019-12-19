const $ = require("shelljs")
const fs = require("fs")
const path = require("path")

ANALYSIS_DIR = path.join(__dirname, "../../analyzed")
RESULT_DIR = path.join(__dirname, "../../results")

const mkdir = (path) => {
    if (fs.statSync(path).isDirectory()) return
    $.mkdir(path)
}

const summary_file_name = (num_mc) => `summary_MC-${num_mc}.csv`
const summary_log_name = (num_mc) => `summary_MC-${num_mc}_log.json`

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
