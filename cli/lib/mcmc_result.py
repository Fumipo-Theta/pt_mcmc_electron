import datetime
import json
import numpy as np
import pandas as pd
from .common import ResultResolver


def _get_parameter_group(params):
    return np.unique(list(map(
        lambda name: name[0:-1],
        filter(
            lambda s: (not s in ["iteration", "lnP"]),
            params
        )
    )))


class MCMCResult:
    def __init__(self, resolver: ResultResolver):
        self.resolver = resolver
        self.sampled: pd.DataFrame = None
        self.meta = None

    def read_samples(self, num_MC: int):
        self.sampled = pd.concat(
            list(map(pd.read_csv, self.resolver.list_sample_paths(num_MC))),
            ignore_index=True
        )
        with open(self.resolver.list_meta_paths()[0]) as f:
            self.meta = json.load(f)

    def get_parameter_group(self):
        return _get_parameter_group(self.sampled.columns)

    def len_parameter_set(self):
        return len(self.meta["acceptedTime"][0])

    def get_sampled(self)->pd.DataFrame:
        return self.sampled

    def get_sample_summary(self, burn_in: int, bins: int, p_val=0):
        data: pd.DataFrame = self.sampled[burn_in:]
        print(f"Write summary by")
        print(f"burn-in: {burn_in}")
        print(f"bins for mode: {bins}")
        print(f"p value for mode: {p_val}")
        print(
            f"Data length: {len(self.sampled)} - {burn_in}(burn-in) = {len(data)}")

        call_args = {
            "timestamp": str(datetime.datetime.now()),
            "burn_in": burn_in,
            "bins": bins,
            "p_val": p_val
        }

        mode = []

        # 5%信用区間
        lower = int(len(data)*(0.+p_val*0.5))
        upper = int(len(data)*(1.-p_val*0.5))

        for col in data.columns:
            hist = np.histogram(
                data[col].sort_values()[lower:upper],
                bins=bins
            )
            mode.append((hist[1][np.argmax(hist[0])] +
                         hist[1][np.argmax(hist[0])+1])*0.5)

        max_P = data[data["lnP"] == np.max(data["lnP"])].values[0]

        res = pd.DataFrame({
            "parameter": data.columns,
            "mean": data.mean().values,
            "stdev": data.std().values,
            "median": data.median().values,
            "mode": mode,
            "max_P": max_P
        })

        return (res, call_args)
