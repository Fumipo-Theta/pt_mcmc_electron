from .mcmc_result import MCMCResult
from .common import classify_plot_style
from structured_plot import Figure, Subplot, plot_action


def plot(mcmc: MCMCResult, burn_in: int, style={}, label_map={}, lim_map={}):
    data = mcmc.get_sampled()
    params = mcmc.get_parameter_group()
    n_set = mcmc.len_parameter_set()

    (fig_style, axes_style, plot_style) = classify_plot_style(style)

    figure = Figure()

    transition_line = plot_action.line(color="black")
    fill_burn_in_stage = plot_action.vband(
        xpos=[[0, burn_in]], alpha=0.3, color="gray")

    for row, param in enumerate(params):
        for i in range(n_set):
            subplot = Subplot(axes_style).add(
                data=data,
                x="index",
                y=f"{param}{i}",
                ylabel=f"{label_map.get(param, param)} {i+1}",
                ylim=lim_map.get(param, [None, None]),
                plot=[
                    transition_line,
                    fill_burn_in_stage
                ]
            )
            figure.add_subplot(subplot)

    return figure.show(**fig_style, column=n_set)
