import os
import sys
import pathlib
from cli.lib.common import ResultResolver, AnalysisResolver, invalid_result_directory


def _show_help():
    print("""
    python init_analysis [dirname]

    [dirname] is the directory name for analysis in /results/
    """)


def main(argv):
    """
    python init_analysis [dirname]
    """

    if "-h" in argv:
        _show_help()
        return

    subdir_name = argv[0]

    result_dir = ResultResolver(subdir_name)
    analysis_dir = AnalysisResolver(subdir_name)

    if not result_dir.is_dir():
        invalid_result_directory(result_dir)
        return

    analysis_dir.make_dir()
    analysis_dir.make_image_dir()


if __name__ == '__main__':
    main(sys.argv[1:])
