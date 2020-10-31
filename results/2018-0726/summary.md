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
sys.path.append("../../")
from tool.estimate_parameters import MCMCresult

mcmc = MCMCresult()
```

```python
mcmc.readCsv()

```

```python
_ = mcmc.showSampleTransition()
```

```python
_ = mcmc.showSampleHist(1000)
```

```python
mcmc.writeSummary()
```

```python

```
