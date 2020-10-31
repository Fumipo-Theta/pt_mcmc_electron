from structured_plot import Figure, Subplot, plot_action
from tool.fused_lasso import get_MSE, get_edge, get_slope_center, fusedlasso


def plot_zoning_segment(
        xs,
        ys,
        slope_center_xs,
        context={}):

    lasso_res = fusedlasso(ys)

    fitted_ys = lasso_res["beta"]

    print(f"lambda: {lasso_res['lambda.1se']}")
    print(f"MSE: {get_MSE(ys,fitted_ys)}")

    base = Subplot(context.get("axes_style", {}))

    data_points = dict(
        data={"x": xs, "y": ys},
        x="x",
        y="y",
        plot=plot_action.scatter(context["artists"].get("data_point"))
    )

    fitted_line = dict(
        data={"x": xs, "y": fitted_ys},
        x="x",
        y="y",
        plot=plot_action.line(context["artists"].get("estimated_line"))
    )

    segment_boundary = dict(
        data={"x": slope_center_xs},
        xpos="x",
        plot=plot_action.vband(context["artists"].get("segment_boundary"))
    )

    return base.add(
        **data_points
    ).add(
        **fitted_line
    ).add(
        **segment_boundary
    )
