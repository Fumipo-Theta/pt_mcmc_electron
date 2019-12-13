from .mcmc_result import MCMCResult
from structured_plot import Figure, Subplot, plot_action

style = {

}


def plot(mcmc: MCMCResult, burn_in: int):
    data = mcmc.get_sampled()
    params = mcmc.get_parameter_group()
    n_set = mcmc.len_parameter_set()

    figure = Figure()

    for param in params:
        for i in range(n_set):
            subplot = Subplot(style).add(
                data=data,
                x="index",
                y=f"{param}{i}",
                ylabel=f"{param} {i+1}",
                plot=[
                    plot_action.line(),
                    plot_action.vband(xpos=burn_in)
                ]
            )
            figure.add_subplot(subplot)

    return figure.show(size=(4, 3), column=n_set)
