---
jupyter:
  jupytext:
    text_representation:
      extension: .md
      format_name: markdown
      format_version: '1.1'
      jupytext_version: 1.2.4
  kernelspec:
    display_name: Javascript (Node.js)
    language: javascript
    name: javascript
---

# Visualize estimated parameters

```javascript
const {
    ls,
    read,
    concat_df,
    fetchData,
    getSummarizedParameters,
    groupEachStage,
    palette,
    integratedLiquidLine,
    Plotly,
    sampleMeltComposition
} = require("./show-magma-model")

const funcTools = require("../../jslib/funcTools")
const fs = require("fs")
const spread = funcTools.spread;

var fontMaker = (fontSize) => {
    return {
        family: 'sans-serif',
        size: fontSize,
        color: '#000'
    }
}

var middiumSize = {
    width : 800,
    height : 600
}

var largeSize = {
    width : 1000,
    height : 750
}

var legend= (normalOrder = true) => {
    return {
        legend: {
            traceorder : (normalOrder)? "normal" : "reversed" ,
            font: fontMaker(20)
        }
    }
    
}


var axis = (direction,title,range) => {
    const obj = {}
    obj[direction+"axis"] = {
        title : title, 
        titlefont:fontMaker(24),
        tickfont : fontMaker(18)
    };
    if (range !== undefined) obj[direction+"axis"].range = range;
    return obj
}
```

<!-- #region -->
Directory

```
/diffusion
/phase
/ptmcmc
    /model
    /tool
    /result
    
```
<!-- #endregion -->

```javascript
var resultPath = "../results/2018-0726/"

var dataPath = "../model/"
var lavaPath = "../../phase/data/lava_compositions_mafic_NEshikoku.csv"
var opxPath = "../../phase/data/opx_zoning_compile.csv"
```

```javascript
var {
    meta,
    data,
    error,
    option,
    summary
} = fetchData(resultPath,dataPath)

var {
      model,
      parameters,
      updateCondition,
      constrain,
      magma
    } = require("../"+meta.model)(option)

var cmap = palette("tol-rainbow", parameters.length)

var lava = read.csv(lavaPath)
var opx = read.csv(opxPath)


```

```javascript
var summarizedParameters = getSummarizedParameters(summary, "mean", parameters);
var parametersEachStage = groupEachStage(summarizedParameters)

console.table(Object.entries(summarizedParameters[0]))
```

```javascript
Plotly([
    {
        y : funcTools.zipWith((x,y)=>1-x-y)
            (parametersEachStage.growth_stoichiometry_orthopyroxene)
            (parametersEachStage.growth_stoichiometry_spinel),
        name : "Olivine",
        type:"bar"
    },
    {
        y : parametersEachStage.growth_stoichiometry_orthopyroxene,
        name : "Orthopyroxene",
        type:"bar"
    },
    {
        y : parametersEachStage.growth_stoichiometry_spinel,
        name : "Spinel",
        type:"bar"
    }
],
spread(
    middiumSize,
    legend(),
    axis("x", "Stage number"),
    axis("y", "Stoichiometry", [0,1]),
    {
        barmode: "stack",
        title : "Stoichiometry in crystal growth",
        font : fontMaker(24)
    }
))
```

```javascript
Plotly([
    {
        y : funcTools.zipWith((x,y)=>1-x-y)
            (parametersEachStage.mixing_stoichiometry_orthopyroxene)
            (parametersEachStage.mixing_stoichiometry_spinel),
        name : "Olivine",
        type:"bar"
    },
    {
        y : parametersEachStage.mixing_stoichiometry_orthopyroxene,
        name : "Orthopyroxene",
        type : "bar"
    },
    {
        y : parametersEachStage.mixing_stoichiometry_spinel,
        name : "Spinel",
        type : "bar"
    }
],
spread(
    middiumSize,
    legend(),
    axis("x", "Stage number"),
    axis("y", "Mass fraction", [0,1]),
    {
        barmode: "stack",
        title : "Mass fraction in approximating mixing",
        font : fontMaker(24)
    }
)
)

```

```javascript
Plotly([
    {
        y : parametersEachStage.log10_tau
    }
],
spread(
    middiumSize,
    legend(),
    axis("x", "Stage number"),
    axis("y", "log10 net time scale of diffusion"),
    {
        title : ""
    }
)
)
```

## Modeled chemical profile

```javascript
var modeled = model(summarizedParameters,data)
var ndProfiles = magma.diffusionProfiles.orthopyroxene;
```

```javascript


var ndFe_Mg = ndProfiles.Fe_Mg.notDiffusedProfile.get()

Plotly([
    {
        x : ndFe_Mg.x,
        y : ndFe_Mg.c.map(v=>100/(1+v)),
        name : "Model: original",
        line : {
            dash : "dash"
        }
    },
    {
        x : modeled.x,
        y : modeled.Fe_Mg.map(v=>100/(1+v)),
        name : "Model: diffused"
    },
     
    {
        x : data.x,
        y : data.Fe_Mg.map(v=>100/(1+parseFloat(v))),
        mode : "markers",
        name : "Observed",
        marker : {
            color : "black"
        }
    }

],
spread(
    middiumSize,
    legend(),
    axis("x","Radius"),
    axis("y","Mg#")
)
)
```

```javascript
var modeled = model(summarizedParameters,data)
var ndProfiles = magma.diffusionProfiles.orthopyroxene;

var ndFe_Mg = ndProfiles.Fe_Mg.notDiffusedProfile.get()

Plotly([
    {
        x : ndFe_Mg.x,
        y : ndFe_Mg.c,
        name : "Model: original",
        line : {
            dash : "dash"
        }
    },
    {
        x : modeled.x,
        y : modeled.Fe_Mg,
        name : "Model: diffused"
    },
     
    {
        x : data.x,
        y : data.Fe_Mg,
        mode : "markers",
        name : "Observed",
        marker : {
            color : "black"
        }
    }

],
spread(
    middiumSize,
    legend(),
    axis("x","Radius"),
    axis("y","Fe/Mg")
))
```

```javascript
ndProfiles
```

```javascript
var ndCr2O3 = ndProfiles.Cr2O3.notDiffusedProfile.get()

Plotly([
    {
        x : ndCr2O3.x,
        y : ndCr2O3.c,
        name : "Model: original",
        line : {
            dash : "dash"
        }
    },
    {
        x : modeled.x,
        y : modeled.Cr2O3,
        name : "Model: diffused"
    },
    {
        x : data.x,
        y : data.Cr2O3,
        mode : "markers",
        name : "Observed",
        marker : {
            color : "black"
        }
    }

],
spread(
    middiumSize,
    legend(),
    axis("x","Radius"),
    axis("y","Cr2O3")
))
```

```javascript
Plotly(
    [
        {
            x : opx.Fe_Mg.map(v=>100/(1+parseFloat(v))),
            y : opx.Cr2O3,
            name : "Opx",
            mode : "markers",
            marker : {
                color : "black",
                size : 2
            }
        },
        {
            x : modeled.Fe_Mg.map(v=>100/(1+v)),
            y : modeled.Cr2O3,
            name : "Model: diffused"
        },
        /*{
            x : ndFe_Mg.c.map(v=>100/(1+v)),
            y : ndCr2O3.c,
            name : "Model: original"
        },*/
    ],
    spread(
        middiumSize,
        axis("x","Mg#",[60,95]),
        axis("y","Cr2O3",[0,0.5])
    )
)
```

## Trace of the host melt composition

```javascript

var liquidLine = integratedLiquidLine(magma,cmap)

//console.log(liquidLine("SiO2","MgO"))

```

```javascript

Plotly(
    [
        ...liquidLine("SiO2","MgO"),
        {
            x : lava.SiO2,
            y : lava.MgO,
            mode : "markers",
            marker: {
                color : "black"
            },
            name : "Lavas"
        }
    ],
    spread(
        largeSize,
        legend(false),
        axis("x","SiO2"),
        axis("y","MgO")
    )      
)

```

```javascript
Plotly(
    [
        ...liquidLine("SiO2","Cr2O3"),
        {
            x : lava.SiO2,
            y : lava.Cr2O3,
            mode : "markers",
            marker: {
                color : "black"
            },
            name : "Lavas"
        }
    ],
    spread(
        largeSize,
        legend(false),
        axis("x","SiO2"),
        axis("y","Cr2O3")
    )
)

```

```javascript

Plotly(
    [
        ...liquidLine("SiO2","Al2O3"),
        {
            x : lava.SiO2,
            y : lava.Al2O3,
            mode : "markers",
            marker: {
                color : "black"
            },
            name : "Lavas"
        }
    ],
spread(
    largeSize,
    legend(false),
    axis("x","SiO2"),
    axis("y","Al2O3")
)      
)
```

## Write samled melt compositions

```javascript

var parametersPath = ls(resultPath)(path=>file=>fs.statSync(path + file).isFile() && /^sample.*\.csv$/.test(file))
var df_parameters = concat_df(
    parametersPath.files.filter(file => /^sample-0.*\.csv$/.test(file)).map(file=>{
        return read.csv(parametersPath.directory+file)
    })
)


```

```javascript
sampleMeltComposition(df_parameters,model,data,"z:/")
```

## Write out profiles

```javascript
const path = require("path")

```

```javascript
var writeJSON=(obj, dir, name) => {
    fs.writeFileSync(path.join(dir,name), JSON.stringify(obj, null, 2))
}

var join_opx_profile=(diffusion_profile_root)=>{
    const o = {diffused:{}, no_diffused:{}}
    o.diffused={
        Fe_Mg : diffusion_profile_root.Fe_Mg.profile,
        Cr2O3 : diffusion_profile_root.Cr2O3.profile
    }
    o.no_diffused = {
        Fe_Mg : diffusion_profile_root.Fe_Mg.notDiffusedProfile,
        Cr2O3 : diffusion_profile_root.Cr2O3.notDiffusedProfile
    }
    return o
}
```

```javascript
var profileDir = path.join(resultPath,"/computed/profiles/")

if (!fs.existsSync(profileDir)){
    fs.mkdirSync(path.join(resultPath,"/computed/"))
    fs.mkdirSync(path.join(resultPath,"/computed/profiles/"))
}

writeJSON(
    join_opx_profile(magma.diffusionProfiles.orthopyroxene),
    profileDir,
    "opx_profile.json"
)
```

```javascript
writeJSON(
    magma.custom.mixingLineStack,
    profileDir,
    "magma_mixing_lines.json"
)

writeJSON(
    magma.custom.differentiationLineStack,
    profileDir,
    "liquid_lines.json"
)
```

```javascript

```
