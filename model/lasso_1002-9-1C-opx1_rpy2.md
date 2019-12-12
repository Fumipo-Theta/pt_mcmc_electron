---
jupyter:
  jupytext:
    text_representation:
      extension: .md
      format_name: markdown
      format_version: '1.1'
      jupytext_version: 1.2.4
  kernelspec:
    display_name: Python 3
    language: python
    name: python3
---

```python
import sys
sys.path.append("../")

```

```python
from tool.fused_lasso import get_MSE, get_edge, get_slope_center, fusedlasso
from tool.define_plot_style import show_zoning_segments as style
from tool.preset_plot import plot_zoning_segment
```

```python
from structured_plot import Figure, Subplot, plot_action
```

```python
__test_seq = [1, 1, 1, 0, 0, 0.5, 1, 1, 1.5, 1.5, 1.5, 1]


slope_centers = list(get_slope_center(__test_seq, 1e-5))

edges = get_edge(__test_seq, 1e-5)


Figure().add_subplot(
    Subplot().add(
        x = range(len(__test_seq)),
        y = __test_seq,
        plot=[
            plot_action.line(fmt="o-")
        ]
    ).add(
        data={"x":edges},
        xpos="x",
        plot=plot_action.vband()
    ).add(
        data={"x":slope_centers},
        xpos="x",
        plot=plot_action.vband(color="red")
    )
).show(size=(8,6))
```

```python
__test_seq = [0,1,1,0,0,0.5,1,1,1.5,1.5,1.5,1]


slope_centers = (get_slope_center(__test_seq, 1e-5))

edges = get_edge(__test_seq, 1e-5)

print(edges)

Figure().add_subplot(
    Subplot().add(
        x = range(len(__test_seq)),
        y = __test_seq,
        plot=[
            plot_action.line(fmt="o-")
        ]
    ).add(
        data={"x":edges},
        xpos="x",
        plot=plot_action.vband()
    ).add(
        data={"x":slope_centers},
        xpos="x",
        plot=plot_action.vband(color="red")
    )
).show(size=(8,6))
```

```python
import pandas as pd
```

```python
df = pd.read_csv("./1002-9-1C-opx1.csv")
```

```python
slope_centers = get_slope_center(fusedlasso(df["Cr2O3"])["beta"], 1e-5, mapping_to=df["x"]*1e6)
print(f"Slope center: {slope_centers}")

Cr2O3=plot_zoning_segment(
    df["x"]*1e6,
    df["Cr2O3"],
    slope_centers,
    style
).add(
    xlabel="Position [μm]",
    ylabel="Cr2O3 [wt%]",
)


Fe_Mg = plot_zoning_segment(
    df["x"]*1e6,
    df["Fe_Mg"],
    slope_centers,
    style
).add(
    xlabel="Position [μm]",
    ylabel="FeO/MgO",
)

Figure().add_subplot(
    Cr2O3,
    Fe_Mg
).show(size=(4, 3), dpi=144, margin=(0,0))
```

```python

```
