from .mcmc_result import MCMCResult
from .common import classify_plot_style
from structured_plot import Figure, Subplot, plot_action


def cut_significant(column, p_val: float):
    def apply(df):
        lower = int(len(df)*(0.+p_val*0.5))
        upper = int(len(df)*(1.-p_val*0.5))

        sorted = df[column].sort_values()
        return sorted[lower:upper]
    return apply


def plot(
    mcmc: MCMCResult,
    burn_in: int,
    p_val: float,
    bins: dict,
    style={},
    label_map={},
    lim_map={}
):
    data = mcmc.get_sampled()[burn_in:]
    params = mcmc.get_parameter_group()
    n_set = mcmc.len_parameter_set()
    (fig_style, axes_style, plot_style) = classify_plot_style(style)

    figure = Figure()

    for row, param in enumerate(params):
        for i in range(n_set):

            subplot = Subplot(axes_style).add(
                data=data,
                y=cut_significant(f"{param}{i}", p_val),
                ylabel=f"{label_map.get(param, param)} {i+1}",
                ylim=lim_map.get(param, [None, None]),
                plot=[
                    plot_action.hist(
                        bins=bins[param], density=True, color="black", orientation="horizontal")
                ]
            )
            figure.add_subplot(subplot)

    return figure.show(size=fig_style.get("size", (4, 3)), column=n_set)
