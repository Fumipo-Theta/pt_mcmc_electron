from .mcmc_result import MCMCResult
from structured_plot import Figure, Subplot, plot_action


def plot(
    mcmc: MCMCResult,
    burn_in: int,
    bins: int,
    p_val: float=0,
    style={}
):
    data = mcmc.get_sampled()[burn_in:]
    params = mcmc.get_parameter_group()
    n_set = mcmc.len_parameter_set()

    lower = int(len(data)*(0.+p_val*0.5))
    upper = int(len(data)*(1.-p_val*0.5))

    figure = Figure()

    def cut_significant(column):
        def apply(df):
            sorted = df[column].sort_values()
            return sorted[lower:upper]
        return apply

    for param in params:
        for i in range(n_set):
            subplot = Subplot(style).add(
                data=data,
                y=cut_significant(f"{param}{i}"),
                ylabel=f"{param} {i+1}",
                plot=[
                    plot_action.hist(bins=bins, density=True)
                ]
            )
            figure.add_subplot(subplot)

    return figure.show(size=(4, 3), column=n_set)
