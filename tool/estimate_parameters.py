# -*- coding: utf-8 -*-
import os
import json
import numpy as np
import pandas as pd
from scipy.stats import kde
import matplotlib.pyplot as plt

import matplotlib.cm as cm
from matplotlib.colors import LinearSegmentedColormap


def _generate_cmap(colors):
    """自分で定義したカラーマップを返す"""
    values = range(len(colors))

    vmax = np.ceil(np.max(values))
    color_list = []
    for v, c in zip(values, colors):
        color_list.append((v / vmax, c))
    return LinearSegmentedColormap.from_list('custom_cmap', color_list)


def _fileList(dir, func):
    return list(filter(func, os.listdir(dir)))


class MCMCresult:
    def __init__(self, Num_MCMC=0):
        self.Num_MCMC = Num_MCMC
        self.acceptedColor = _generate_cmap(["#bb0000", "#888888", "#0000bb"])

    def readMelt(self, stageNumber, rootDir="./"):
        self.melt = pd.concat(
            list(
                map(pd.read_csv,
                    _fileList(rootDir, lambda file: file.find(
                        "melt_"+str(stageNumber)) >= 0)
                    )
            ),
            ignore_index=True
        )

    def readMeta(self, rootDir="./"):
        metaFile = open(
            _fileList(rootDir, lambda file: file.find("meta-") >= 0).pop())
        self.meta = json.load(metaFile)
        # print(self.meta["acceptedTime"][0])

    def readCsv(self, rootDir="./"):
        Num_MCMC = self.Num_MCMC
        self.csvData = pd.concat(
            list(
                map(pd.read_csv,
                    _fileList(rootDir, lambda file: file.find(
                        "sample-"+str(Num_MCMC)) >= 0)
                    )
            ),
            ignore_index=True
        )

        display(self.csvData.head(5))

        self.readMeta(rootDir)

        self.columnNames = self.csvData.columns

        self.parameterTypes = np.unique(list(
            map(
                lambda s: s[0:len(s)-1],
                filter(
                    lambda s: (not s in ["iteration", "lnP"]),
                    self.columnNames.sort_values()
                )
            )
        ))

        self.dataLen = len(self.csvData)
        print(self.dataLen)

        print(self.parameterTypes)

        self.parameterSetNum = len(self.meta["acceptedTime"][0])
        self.parameterTypeNum = len(self.parameterTypes)

    def showSampleTransition(self, burnIn=0):
        dimX = self.parameterSetNum
        dimY = self.parameterTypeNum
        fig = plt.figure(figsize=(8*dimY, 6*dimX),
                         facecolor="white", edgecolor="black")
        axs = []
        graphNum = 1

        for p, k in zip(self.parameterTypes, range(len(self.parameterTypes))):
            stageNum = 1
            for i in range(0, dimX):

                ax = fig.add_subplot(dimY, dimX, graphNum)
                ax.facecolor = "white"
                ax.plot(self.csvData[burnIn:][p+str(i)], color=self.acceptedColor(
                    self.meta["acceptedTime"][0][i][p]/self.dataLen))
                # ax.set_ylim(paramRange[p])
                if i == 0:
                    ax.set_ylabel(p.replace("_", " "), fontsize=28,
                                  fontfamily="Times New Roman")
                if k == 0:
                    ax.set_title("stage "+str(stageNum),
                                 fontsize=36, fontfamily="Times New Roman")
                ax.tick_params(labelsize=36)
                ax.set_frame_on(True)
                ax.set_ylim([self.meta["option"]["updateCondition"][p]["min"],
                             self.meta["option"]["updateCondition"][p]["max"]])
                graphNum = graphNum + 1
                stageNum = stageNum + 1
                axs.append({
                    "stage": stageNum,
                    "parameter": p,
                    "ax": ax
                })
        plt.tight_layout()
        return axs

    def showSampleHist(self, burnIn=0, p_val=0, bins=40, filterFunc=lambda csv: csv):

        data = filterFunc(self.csvData)

        plt.subplots_adjust(wspace=0.4, hspace=0.6)

        # ヒストグラム
        dimX = self.parameterSetNum
        dimY = self.parameterTypeNum
        fig = plt.figure(figsize=(8*dimY, 6*dimX),
                         facecolor="white", edgecolor="black")

        # 5%信用区間
        lower = int((self.dataLen - burnIn)*(0.+p_val*0.5))
        upper = int((self.dataLen - burnIn)*(1.-p_val*0.5))

        axs = []

        graphNum = 1

        for p, k in zip(self.parameterTypes, range(len(self.parameterTypes))):
            stageNum = 1
            for i in range(0, dimX):
                ax = fig.add_subplot(dimY, dimX, graphNum)
                ax.hist(data[p+str(i)].sort_values()[lower:upper],
                        bins=bins,
                        color=self.acceptedColor(
                            self.meta["acceptedTime"][0][i][p]/self.dataLen),
                        density=True)
                if i == 0:
                    ax.set_ylabel(p.replace("_", " "), fontsize=28,
                                  fontfamily="Times New Roman")
                if k == 0:
                    ax.set_title("stage "+str(stageNum),
                                 fontsize=36, fontfamily="Times New Roman")
                ax.tick_params(labelsize=32)
                # ax.set_xlim(paramRange[p])
                graphNum = graphNum + 1
                stageNum = stageNum + 1
                axs.append({
                    "stage": stageNum,
                    "parameter": p,
                    "ax": ax
                })
        plt.tight_layout()
        return axs

    def showLnP(self, burnIn=0, p_val=0, bins=40):
        lower = int((self.dataLen - burnIn)*(0.+p_val*0.5))
        upper = int((self.dataLen - burnIn)*(1.-p_val*0.5))

        fig = plt.figure(figsize=(18, 6))

        ax1 = fig.add_subplot(1, 2, 1)
        ax1.plot(self.csvData["lnP"][burnIn:])
        ax1.set_title("$\ln P$", fontsize=28)
        ax1.tick_params(labelsize=32)
        ylim = ax1.get_ylim()

        print(ylim)

        ax2 = fig.add_subplot(1, 2, 2)
        ax2.hist(self.csvData["lnP"][burnIn:].sort_values()[lower:upper],
                 bins=bins,
                 orientation="horizontal",
                 )
        ax2.set_ylim(ylim)
        ax2.set_title("$\ln P$", fontsize=28)
        ax2.tick_params(labelsize=32)
        return (ax1, ax2)

    def writeSummary(self, burnIn=0, p_val=0, bins=40, filterFunc=lambda csv: csv):
        data = filterFunc(self.csvData[burnIn:self.dataLen])

        print("data number: ", len(data))

        mean = data.mean()
        me = []

        for v in mean:
            me.append(v)

        std = data.std()
        sd = []

        for v in std:
            sd.append(v)

        md = []

        # 5%信用区間
        lower = int((self.dataLen - burnIn)*(0.+p_val*0.5))
        upper = int((self.dataLen - burnIn)*(1.-p_val*0.5))

        for col in self.columnNames:
            hist = np.histogram(
                data[col].sort_values()[lower:upper],
                bins=bins
            )
            md.append((hist[1][np.argmax(hist[0])] +
                       hist[1][np.argmax(hist[0])+1])*0.5)

        max_P = data[data["lnP"] == np.max(data["lnP"])].values[0]
        mp = []

        for v in max_P:
            mp.append(v)

        df = pd.DataFrame()

        df["parameter"] = self.columnNames
        df["mean"] = me
        df["stdev"] = sd
        df["mode"] = md
        df["max_P"] = mp

        display(df)

        outputPath = f"./computed/summary_MCMC-{self.Num_MCMC}.csv"
        df.to_csv(outputPath)

    def showMeltTransition(self, elementFunc, burnIn=0):
        fig = plt.figure(figsize=(8, 6))
        ax = fig.add_subplot(1, 1, 1)
        ax.plot(elementFunc(self.melt))
        ax.tick_params(labelsize=32)
        return ax

    def showMeltHistogram(self, elementFunc, burnIn=0, p_val=0, bins=40, filterFunc=lambda csv: csv):
        data = filterFunc(self.melt[burnIn:len(self.melt)])
        lower = int((len(self.melt) - burnIn)*(0.+p_val*0.5))
        upper = int((len(self.melt) - burnIn)*(1.-p_val*0.5))

        fig = plt.figure(figsize=(8, 6))
        ax = fig.add_subplot(1, 1, 1)
        ax.hist(elementFunc(data).sort_values()[lower:upper],
                bins=bins,
                density=True)
        ax.tick_params(labelsize=32)

        print("mean", elementFunc(data).sort_values()[lower:upper].mean())
        print("stdev", elementFunc(data).sort_values()[lower:upper].std())
        return ax

    def showMeltKde(self, e1, e2, burnIn=0, nbins=100, filterFunc=lambda csv: csv):
        data = filterFunc(self.melt[burnIn:len(self.melt)])
        x = data[e1]
        y = data[e2]

        k = kde.gaussian_kde([x, y])
        xi, yi = np.mgrid[x.min():x.max():nbins*1j, y.min():y.max():nbins*1j]
        zi = k(np.vstack([xi.flatten(), yi.flatten()]))

        # Make the plot
        fig = plt.figure(figsize=(8, 6))
        ax = fig.add_subplot(1, 1, 1)
        ax.pcolormesh(xi, yi, zi.reshape(xi.shape))
        ax.tick_params(labelsize=32)
        ax.set_xlabel(e1, fontsize=30)
        ax.set_ylabel(e2, fontsize=30)
        return ax
