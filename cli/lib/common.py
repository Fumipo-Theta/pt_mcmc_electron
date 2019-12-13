import os
from pathlib import Path

ANALYSIS_DIR = "./analyzed"
RESULT_DIR = "./results"


def mkdir(path: Path):
    print(path)
    if path.exists():
        return
    path.mkdir()


def summary_file_name(Num_MC):
    return f"summary_MC-{Num_MC}.csv"


def summary_args_name(Num_MC):
    return f"summary_MC-{Num_MC}_log.json"


class PathResolver:
    def __init__(self, result_dir: str, subdir: str):
        self.path = Path(result_dir) / Path(subdir)

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

    def resolve_summary_paths(self, Num_MC) -> tuple:
        return (
            self.resolve() / Path(summary_file_name(Num_MC)),
            self.resolve() / Path(summary_args_name(Num_MC))
        )

    def resolve_image_path(self, imtype: str, ctx={}):
        if imtype is "sample_transition":
            return self.image_dir / Path(f"./sample_transition_MC-{ctx.get('n')}")
        elif imtype is "sample_hist":
            return self.image_dir / Path(f"./sample_hist_MC-{ctx.get('n')}")
        else:
            raise ValueError(f"imtype {imtype} cannot be recognized.")


def invalid_result_directory(path: ResultResolver):
    print(
        f"The result directory {path.resolve()} does not exists.")
