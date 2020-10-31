import os
import re
import json
from pathlib import Path

ANALYSIS_DIR = "./analyzed"
RESULT_DIR = "./results"


def mkdir(path: Path):
    if path.exists():
        print(f"{path} exists.")
        return
    path.mkdir()


def summary_file_name(num_mc):
    return f"summary_MC-{num_mc}.csv"


def summary_log_name(num_mc):
    return f"summary_MC-{num_mc}_log.json"


def liquid_line_name(num_mc):
    return f"liquid_line_MC-{num_mc}.json"


def zoning_name(num_mc, phase):
    return f"zoning_{phase}_MC-{num_mc}.json"


def initial_melt_pattern(num_mc):
    return f"initial_melt_MC-{num_mc}*.csv"


def final_melt_pattern(num_mc):
    return f"final_melt_MC-{num_mc}*.csv"


class PathResolver:
    def __init__(self, root_dir: str, subdir: str):
        self.path = Path(root_dir) / Path(subdir)

    def is_dir(self) -> bool:
        return self.path.is_dir()

    def resolve(self) -> Path:
        return self.path.resolve()


class ResultResolver:
    """
    results/
        meta-*datetime*.json
        meta-*datetime*.json
        sample-0-*datetime*.csv
        sample-0-*datetime*.csv
        sample-1-*datetime*.csv
    """

    def __init__(self, subdir: str):
        self.path = PathResolver(RESULT_DIR, subdir)

    def is_dir(self) -> bool:
        return self.path.is_dir()

    def resolve(self) -> Path:
        return self.path.resolve()

    def exists(self) -> bool:
        return self.path.is_dir()

    def list_meta_paths(self):
        return list(self.resolve().glob("./meta-*.json"))

    def list_sample_paths(self, num_MC: int):
        return list(self.resolve().glob(f"./sample-{num_MC}-*.csv"))


class AnalysisResolver:
    """
    analysis/
        [subdir]/
            image/
                **.png
            summary_MC-0.csv
    """

    def __init__(self, subdir: str):
        self.path = PathResolver(ANALYSIS_DIR, subdir)
        self.image_dir = self.resolve() / Path("image/")

    def is_dir(self) -> bool:
        return self.path.is_dir()

    def resolve(self) -> Path:
        return self.path.resolve()

    def make_dir(self):
        mkdir(self.resolve())

    def make_image_dir(self):
        mkdir(self.image_dir)

    def resolve_summary_paths(self, num_mc) -> tuple:
        return (
            self.resolve() / Path(summary_file_name(num_mc)),
            self.resolve() / Path(summary_log_name(num_mc))
        )

    def resolve_image_path(self, imtype: str, ctx={}):
        if imtype is "sample_transition":
            return self.image_dir / Path(f"./sample_transition_MC-{ctx.get('n')}")
        elif imtype is "sample_hist":
            return self.image_dir / Path(f"./sample_hist_MC-{ctx.get('n')}")
        else:
            raise ValueError(f"imtype {imtype} cannot be recognized.")

    def resolve_liquid_line(self, num_mc, summarize_method):
        return self.resolve() / Path(f"./melt/{summarize_method}/{liquid_line_name(num_mc)}")

    def resolve_zoning(self, num_mc, summarize_method, phase):
        return self.resolve() / Path(f"./melt/{summarize_method}/{zoning_name(num_mc, phase)}")

    def make_melt_dir(self, summarize_method):
        mkdir(self.resolve() / Path("./melt/"))
        mkdir(self.resolve() / Path(f"./melt/{summarize_method}"))

    def list_sampled_melt_paths(self, num_mc, summarize_method):
        """
        Returns
        -------
        (
            initial_melt_paths: List[Path],
            final_melt_paths: List[Path]
        )
        """
        return(
            list((self.resolve() /
                  Path(f"./melt/{summarize_method}")).glob(initial_melt_pattern(num_mc))),
            list((self.resolve() /
                  Path(f"./melt/{summarize_method}")).glob(final_melt_pattern(num_mc))),
        )


class McmcMeta:
    def __init__(self, meta_path):
        with open(meta_path) as f:
            self.meta = json.load(f)

    def data(self):
        return self.meta.get("data")

    def error(self):
        return self.meta.get("error")

    def option(self):
        return self.meta.get("option")


def invalid_result_directory(path: ResultResolver):
    print(
        f"The result directory {path.resolve()} does not exists.")


def classify_plot_style(style):
    fig_style = style.get("fig_style", {})
    axes_style = style.get("axes_style", {})
    plot_style = style.get("plot_style", {})
    return (fig_style, axes_style, plot_style)
