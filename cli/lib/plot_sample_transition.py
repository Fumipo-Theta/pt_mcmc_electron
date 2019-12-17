from .mcmc_result import MCMCResult
from .common import classify_plot_style
from structured_plot import Figure, Subplot, plot_action


def check_last_of(total_len):
    return lambda i: i == total_len-1


def is_first(i):
    return i == 0


def plot(mcmc: MCMCResult, burn_in: int, style={}, label_map={}, lim_map={}):
    data = mcmc.get_sampled()
    params = mcmc.get_parameter_group()
    n_set = mcmc.len_parameter_set()

    (fig_style, axes_style, plot_style) = classify_plot_style(style)

    figure = Figure()

    transition_line = plot_action.line(color="black")
    fill_burn_in_stage = plot_action.vband(
        xpos=[[0, burn_in]], alpha=0.3, color="gray")

    is_last_row = check_last_of(len(params))

    for row_i, param in enumerate(params):
        for column_i in range(n_set):
            subplot = Subplot(axes_style).add(
                data=data,
                x="index",
                y=f"{param}{column_i}",
                ylim=lim_map.get(param, [None, None]),
                plot=[
                    transition_line,
                    fill_burn_in_stage
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
