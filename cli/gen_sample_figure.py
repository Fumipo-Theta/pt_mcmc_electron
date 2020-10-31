import sys
import matplotlib.pyplot as plt
import json

from cli.lib.common import ResultResolver, AnalysisResolver
from cli.lib.mcmc_result import MCMCResult
from cli.lib.plot_sample_transition import plot as plot_transition
from cli.lib.plot_sample_hist import plot as plot_hist

from cli.preset.plot_param_publish import graph_style, label_map


def _help():
    print("""
    Usage

    python gen_sample_figure [sub directory] [Number of MC]

    [sub directory] is directory name in results/ for analysis.
    [Number of MC] is the number of Markov Chain to be analyzed.

    You must execute gen_summary command because this require
      an information of burn-in, bins, and p-value in summarizing.
    """)


def _parse_arg(argv):
    if len(argv) < 2:
        raise ValueError("At least 2 args are required.")
    elif len(argv) is 2:
        return (*argv,)


def expand(_range: list, ratio: float) -> list:
    _min = _range[0]
    _max = _range[1]
    diff = (_max - _min) * ratio * 0.5

    return [_min-diff, _max+diff]


def get_lim(meta, param_group, expand_ratio):
    update_condition = meta["option"]["updateCondition"][param_group]
    _min = update_condition["min"]
    _max = update_condition["max"]
    return expand([_min, _max], expand_ratio)


def gen_lim_map(mcmc):
    param_groups = mcmc.get_parameter_group()
    lim_map = {}

    for param_group in param_groups:
        lim_map[param_group] = get_lim(mcmc.meta, param_group, 0.05)

    return lim_map


def main(argv):

    if "-h" in argv:
        _help()
        return

    (subdir, num_MC) = _parse_arg(argv)

    result_dir = ResultResolver(subdir)
    analyzed_dir = AnalysisResolver(subdir)

    _, log_path = analyzed_dir.resolve_summary_paths(num_MC)

    mcmc = MCMCResult(result_dir)
    mcmc.read_samples(num_MC)

    lim_map = gen_lim_map(mcmc)

    with open(log_path) as f:
        log = json.load(f)

    fig, axes = plot_transition(
        mcmc, log["burn_in"], graph_style, label_map, lim_map)
    plt.savefig(
        analyzed_dir.resolve_image_path("sample_transition", {"n": num_MC})
    )

    fig, axes = plot_hist(mcmc, log["burn_in"],
                          log["p_val"], log["bins"], graph_style, label_map, lim_map)
    plt.savefig(
        analyzed_dir.resolve_image_path("sample_hist", {"n": num_MC})
    )


if __name__ == "__main__":
    main(sys.argv[1:])
