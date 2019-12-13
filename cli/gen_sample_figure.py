import sys
import matplotlib.pyplot as plt
import json

from cli.lib.common import ResultResolver, AnalysisResolver
from cli.lib.mcmc_result import MCMCResult
from cli.lib.plot_sample_transition import plot as plot_transition
from cli.lib.plot_sample_hist import plot as plot_hist


def _help():
    print("""
    Usage

    python gen_sample_figure [subdirectory] [Number of MC]

    [subdirectory] is directory name in results/ for analysis.
    [Number of MC] is the number of Markov Chain to be analyzed.
    """)


def main(argv):

    if "-h" in argv:
        _help()
        return

    (subdir, num_MC) = argv

    result_dir = ResultResolver(subdir)
    analyzed_dir = AnalysisResolver(subdir)

    _, log_name = analyzed_dir.resolve_summary_paths(num_MC)

    mcmc = MCMCResult(result_dir)
    mcmc.read_samples(num_MC)
    with open(log_name) as f:
        log = json.load(f)

    fig, axes = plot_transition(mcmc, log.get("burn_in"))
    plt.savefig(
        analyzed_dir.resolve_image_path("sample_transition", {"n": num_MC})
    )

    fig, axes = plot_hist(mcmc, log.get("burn_in"),
                          log.get("bins"), log.get("p_val"))
    plt.savefig(
        analyzed_dir.resolve_image_path("sample_hist", {"n": num_MC})
    )


if __name__ == "__main__":
    main(sys.argv[1:])
