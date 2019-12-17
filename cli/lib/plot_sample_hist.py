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


def check_last_of(total_len):
    return lambda i: i == total_len-1


def is_first(i):
    return i == 0


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

    is_last_row = check_last_of(len(params))

    for row_i, param in enumerate(params):
        for column_i in range(n_set):

            subplot = Subplot(axes_style).add(
                data=data,
                y=cut_significant(f"{param}{column_i}", p_val),
                ylim=lim_map.get(param, [None, None]),
                plot=[
                    plot_action.hist(
                        bins=bins[param], density=True, color="black", orientation="horizontal")
                ],

                ylabel=f"{label_map.get(param, param)}" if is_first(
                    column_i) else None,
                tick={
                    "labelbottom": True if is_last_row(row_i) else False,
                    "labelleft": True if is_first(column_i) else False,
                    "right": True
                },
                title=f"Stage {column_i + 1}" if is_first(row_i) else None,
            )
            figure.add_subplot(subplot)

    return figure.show(**fig_style, column=n_set)
