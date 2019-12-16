import json

import sys
from cli.lib.common import ResultResolver, AnalysisResolver
from cli.lib.mcmc_result import MCMCResult


def _help():
    print("""
    Usage

    python gen_summary [subdirectory] [Number of MC] [burn-in] [p-val] [bins]

    [subdirectory] is directory name in results/ for analysis.
    [Number of MC] is the number of Markov Chain to be analyzed.
    """)


def _parse_arg(argv):
    if len(argv) < 2:
        print(f"At least 2 args are requird.")
    elif len(argv) is 2:
        return (*argv, 0, 0, None)
    elif len(argv) is 3:
        return (*argv, 0, None)
    elif len(argv) is 4:
        return (*argv, None)
    elif len(argv) is 5:
        return argv
    else:
        return argv[0:5]


def main(argv):
    if "-h" in argv:
        _help()
        return

    (subdir, num_MC, burn_in, p_val, bins) = _parse_arg(argv)
    result_dir = ResultResolver(subdir)
    analyzed_dir = AnalysisResolver(subdir)

    summary_name, log_name = analyzed_dir.resolve_summary_paths(num_MC)

    mcmc = MCMCResult(result_dir)
    mcmc.read_samples(num_MC)
    summary, args = mcmc.get_sample_summary(
        int(burn_in),  float(p_val), int(bins) if bins is not None else None)

    summary.to_csv(summary_name)

    with open(log_name, "w") as f:
        json.dump(args, f, indent=4)


if __name__ == "__main__":
    main(sys.argv[1:])
