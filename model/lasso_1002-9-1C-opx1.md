---
jupyter:
  jupytext:
    text_representation:
      extension: .md
      format_name: markdown
      format_version: '1.1'
      jupytext_version: 1.2.4
  kernelspec:
    display_name: R
    language: R
    name: ir
---

<!-- #region -->
## fusedLASSO によるセクション区切りの判定

Cr2O3プロファイルについて,
1次元fusedLASSOにおいて, 1seルールのもとk-fold 交差検証で得られた正則化係数のもとでフィッティングをおこなう.
そのとき$\beta_i = \beta_{i+1}$, すなわちフィッティング結果の曲線が平坦な部分(プラトー)を同一のセクションとみなす.

セクション区切りはプラトーと次のプラトーをつなぐスロープ部の, 中間点の位置とする.

The method to detect the border of growth section of chemical profile. 



## 測定値の誤差

上記の交差検証時に得られたパラメータと, 実測値のmean sum of square error を各点の標準誤差とする. 

<!-- #endregion -->

```R
library(genlasso)
library(dplyr)
library(tidyr)
library(broom)
library(purrr)

options(repr.plot.width=8, repr.plot.height=6)

# 所与のデータ(ys)に関数(func)を適用しつつ, データysそのものを返す関数
tee <- function(ys,func){
    func(ys)
    return (ys)
}

getColumn <- function(df,columnName){
    return(df[columnName])
}

getMSE <- function(observed,modeled){
    n <- length(observed)
    sum <- 0
    for (i in 1:n){
        sum <- sum + (observed[i]-modeled[i])**2
    }
    return(sqrt(sum/n))
}

print(getMSE(c(1,2,3),c(0,0,0)) == sqrt((1+4+9)/3))

getEdgeOfFlat<-function(beta,eps=1e-5){
    
    n <- length(beta)
    i_edge <- c()
    wasFlat <- FALSE
    for (i in 1:(n-1)){
        if (abs(beta[i] - beta[i+1]) < eps){
            if (! wasFlat){
                i_edge <- append(i_edge,c(i))
                wasFlat <- TRUE
            }
        }else{
            if (wasFlat){
                i_edge <- append(i_edge,c(i))
                wasFlat <- FALSE
            }
        }
    }
    
    return(i_edge)
}

# 原点側がプラトーであるとして, スロープの中点を求める
getSlopeCenter<- function(x,i_edge){
    center <- c()
    n <- length(i_edge)
    last <- length(x)
    
    center <- append(center,c(0.5*(x[1]+x[i_edge[1]])))
    
    for (i in seq(2,n-1,2)){
        center <- append(center,c(0.5*(x[i_edge[i]]+x[i_edge[i+1]])))
    }

    center <- append(center,c(0.5*(x[i_edge[n]]+x[last])))
    return (center)
}


# i 1 2 3   4 5   6   7   8  9   10  11    12
# x 0 1 2   3 4   5   6   7  8   9   10    11
# b 1 1 1 | 0 0 | 0.5|1   1|1.5 1.5 1.5 | 1
#   _   _   _ _        _  _   _    _   _
#  0     2.5       5.5                  10.5 
i_edge <- getEdgeOfFlat(c(1,1,1,0,0,0.5,1,1,1.5,1.5,1.5,1))
print(i_edge == c(1,3,4,5,7,8,9,11))
slopeCenter <- getSlopeCenter(c(0,1,2,3,4,5,6,7,8,9,10,11),i_edge)
print(slopeCenter == c(0,2.5,5,7.5,10.5))

plot(c(0,1,2,3,4,5,6,7,8,9,10,11),c(1,1,1,0,0,0.5,1,1,1.5,1.5,1.5,1))
lines(c(0,1,2,3,4,5,6,7,8,9,10,11),c(1,1,1,0,0,0.5,1,1,1.5,1.5,1.5,1))
```

```R
df <- read.csv("./1002-9-1C-opx1.csv")
```

```R

df %>%
    .$Cr2O3 -> y

df %>% 
    .$x -> x

lambda <- 0.05


y %>%
    fusedlasso1d %>%
    cv.trendfilter %>%
    tee(function(cv){
        print(cv$lambda.1se)
        print(cv$se[cv$i.1se])
        y %>%
            fusedlasso1d %>%
            coef(lambda=cv$lambda.1se) %>%
            tee(function(coef){
                print("slope center")
                print(getEdgeOfFlat(coef$beta))
                #print(coef$beta)
                print(getSlopeCenter(x,getEdgeOfFlat(coef$beta)))
                print("MSE")
                print(getMSE(coef$beta,y))
                plot(x, y)
                lines(x, coef$beta)
            }) %>% invisible
            #plot(,x=radius, lambda=cv$lambda.1se) %>%
            #invisible
    }) %>%
    invisible
```

```R
df %>%
    .$Cr2O3 -> y

df %>% 
    .$x -> x

lambda <- 0.05


y %>%
    fusedlasso1d %>%
    cv.trendfilter %>%
    tee(function(cv){
        print(cv$lambda.1se)
        print(cv$se[cv$i.1se])
        y %>%
            fusedlasso1d %>%
            coef(lambda=cv$lambda.1se*2) %>%
            tee(function(coef){
                print("slope center")
                print(getEdgeOfFlat(coef$beta))
                #print(coef$beta)
                print(getSlopeCenter(x,getEdgeOfFlat(coef$beta)))
                print("MSE")
                print(getMSE(coef$beta,y))
                plot(x, y)
                lines(x, coef$beta)
            }) %>% invisible
            #plot(,x=radius, lambda=cv$lambda.1se) %>%
            #invisible
    }) %>%
    invisible
```

```R
df %>%
    .$NiO -> y

df %>% 
    .$x -> x

lambda <- 0.05


y %>%
    fusedlasso1d %>%
    cv.trendfilter %>%
    tee(function(cv){
        print(cv$lambda.1se)
        print(cv$se[cv$i.1se])
        y %>%
            fusedlasso1d %>%
            coef(lambda=cv$lambda.1se) %>%
            tee(function(coef){
                print("slope center")
                print(getEdgeOfFlat(coef$beta))
                #print(coef$beta)
                print(getSlopeCenter(x,getEdgeOfFlat(coef$beta)))
                print("MSE")
                print(getMSE(coef$beta,y))
                plot(x, y)
                lines(x, coef$beta)
            }) %>% invisible
            #plot(,x=radius, lambda=cv$lambda.1se) %>%
            #invisible
    }) %>%
    invisible
```

```R
df %>%
    .$Fe_Mg-> y

df %>% 
    .$x -> x

lambda <- 0.05


y %>%
    fusedlasso1d %>%
    cv.trendfilter %>%
    tee(function(cv){
        print(cv$lambda.1se)
        print(cv$se[cv$i.1se])
        y %>%
            fusedlasso1d %>%
            coef(lambda=cv$lambda.1se) %>%
            tee(function(coef){
                print("slope center")
                print(getEdgeOfFlat(coef$beta))
                #print(coef$beta)
                print(getSlopeCenter(x,getEdgeOfFlat(coef$beta)))
                print("MSE")
                print(getMSE(coef$beta,y))
                plot(x, y)
                lines(x, coef$beta)
            }) %>% invisible
            #plot(,x=radius, lambda=cv$lambda.1se) %>%
            #invisible
    }) %>%
    invisible
```

```R
df %>%
    .$Cr2O3 -> y

df %>% 
    .$x -> x

y %>%
    trendfilter(ord=1) %>%
    cv.trendfilter %>%
    tee(function(cv){
        print(cv$lambda.1se)
        print(cv$se[cv$i.1se])
        y %>%
            trendfilter(ord=1) %>%
            coef(lambda=cv$lambda.1se) %>%
            tee(function(coef){
                print("MSE")
                print(getMSE(coef$beta,y))
                plot(x, y)
                lines(x, coef$beta)
            }) %>% invisible
            #plot(,x=radius, lambda=cv$lambda.1se) %>%
            #invisible
    }) %>%
    invisible

```

```R
df %>%
    .$NiO -> y

df %>% 
    .$x -> x

y %>%
    trendfilter(ord=1) %>%
    cv.trendfilter %>%
    tee(function(cv){
        print(cv$lambda.1se)
        print(cv$se[cv$i.1se])
        y %>%
            trendfilter(ord=1) %>%
            coef(lambda=cv$lambda.1se) %>%
            tee(function(coef){
                print("MSE")
                print(getMSE(coef$beta,y))
                plot(x, y)
                lines(x, coef$beta)
            }) %>% invisible
            #plot(,x=radius, lambda=cv$lambda.1se) %>%
            #invisible
    }) %>%
    invisible
```

```R
df %>%
    .$Fe_Mg -> y

df %>% 
    .$x -> x

y %>%
    trendfilter(ord=1) %>%
    cv.trendfilter %>%
    tee(function(cv){
        print(cv$lambda.1se)
        print(cv$se[cv$i.1se])
        y %>%
            trendfilter(ord=1) %>%
            coef(lambda=cv$lambda.1se) %>%
            tee(function(coef){
                print("MSE")
                print(getMSE(coef$beta,y))
                plot(x, y)
                lines(x, coef$beta)
            }) %>% invisible
            #plot(,x=radius, lambda=cv$lambda.1se) %>%
            #invisible
    }) %>%
    invisible
```
