import numpy as np 
import pandas as pd 
import matplotlib.pyplot as plt
from typing import Tuple
from constants import HYPO, GREEN, YELLOW, RED, TOP
from pathlib import Path

from scipy.signal import find_peaks, peak_prominences

def visualize(df: pd.DataFrame) -> None:
    
    len_data = len(df["Timestamp"])
    t = np.arange(0, len_data, 1)
    
    meals = np.where(df["Meal Type"] != 0)[0]
    days = np.arange(0, len_data, 1440) #each tick is a minute, 60 * 24 = 1440 minutes in a day
    
    fig, ax = plt.subplots(2, 1, figsize = (20, 20) )
    
    libre = df["Libre GL"]
    dexcom = df["Dexcom GL"]
    hr = df["HR"]
    
    peaks_lib, prop_lib = find_peaks(libre, prominence = 10)
    peaks_dex, prop_dex = find_peaks(dexcom, prominence = 10)
        
    #plot glucose
    ax[0].plot(t, libre, label = "libre", lw = 3)
    #ax[0].plot(t, hr, label = "hr", alpha = 0.4, linestyle = "--")
    ax[0].plot(t[peaks_lib], libre[peaks_lib], "x", markersize = 10, markeredgewidth=2)
    ax[0].set_title("Libre CGM Measurements")
    ax[0].legend()
    ax[0].set_xlabel("Minutes")
    ax[0].set_ylabel("Blood Glucose Level (mg/dL)")
    ax[0].set_ylim(55, 230)
    
    ax[1].plot(t, dexcom, label = "dexcom", lw = 3)
    #ax[1].plot(t, hr, label = "hr", alpha = 0.4, linestyle = "--")
    ax[1].plot(t[peaks_dex], dexcom[peaks_dex], "x", markersize =10, markeredgewidth=2)
    ax[1].set_title("Dexcom CGM Measurements")
    ax[1].legend()
    ax[1].set_xlabel("Minutes")
    ax[1].set_ylabel("Blood Glucose Level (mg/dL)")

    
    for a in ax:
        a.axhspan(HYPO, GREEN, color = 'blue', alpha = 0.1, )
        a.axhspan(GREEN, YELLOW, color = "green", alpha = 0.1)
        a.axhspan(YELLOW, RED, color = "yellow", alpha = 0.1)
        a.axhspan(RED, TOP, color = 'red', alpha = 0.1)

        for i in meals:
            a.axvline(i, color = "gray")
        
        #for d in days:
            #a.axvline(d, color = "black", lw = 3)
    
    plt.tight_layout()  
    plt.show()

def percent_healthy(df: pd.DataFrame, thresh_low: int = GREEN, thresh_high: int = YELLOW) -> Tuple:
    """Returns percent of indices that are in threshold range

    Args:
        df (pd.DataFrame): input dataframe

    Returns:
        Tuple(float, float): %healthy in (Libre, Dexcom)
    """
    lib = df["Libre GL"]
    dex = df["Dexcom GL"]
    
    ph_libre = np.sum((thresh_low < lib) & (lib < thresh_high)) / len(lib)
    ph_dexcom = np.sum((thresh_low < dex) & (dex < thresh_high)) / len(dex)
    
    return ph_libre, ph_dexcom

## discretize spikes into classes for classificaion
def discretize(sp):
    disc = []
    for spike in sp:
        
        if spike is None:
            disc.append(None)
        elif spike < 50:
            disc.append(0)
        elif spike < 100:
            disc.append(1)
        else:
            disc.append(2)
    return disc

def get_glucose_response(df: pd.DataFrame, unhealthy = False, discrete = False) -> pd.DataFrame:
    meals = df[df["Calories"] != 0].copy(deep=True) #get matrix of just meals and set index columns
    meals["idx"] = meals.index 
    
    libre = df["Libre GL"]
    dexcom = df["Dexcom GL"]
        
    peaks_lib, _ = find_peaks(libre, prominence = 10)
    _, lbase_lib, _ = peak_prominences(libre, peaks=peaks_lib) #just want indices of left value
    
    peaks_dex, _ = find_peaks(dexcom, prominence = 10)
    _, lbase_dex, _ = peak_prominences(dexcom, peaks=peaks_dex)

    
    spikes_lib = []
    spikes_dex = []
    for i in range(len(meals)): #iterate through all the meals
        
        curr_meal_idx = meals.iloc[i,-1]
        next_meal_idx = meals.iloc[i+1, -1] if i+1 < len(meals)-1 else len(df)
        
        #find first prominence after each meal --> LIBRE CGM
        next_peaks_lib = np.ravel(np.where((peaks_lib > curr_meal_idx) & (peaks_lib < next_meal_idx))) #idx #get all peak idxs greater than the location of this meal
        #get first spike and add
        if len(next_peaks_lib) > 0:
            if unhealthy: #just get the postmeal spikes that are in red range
                poss = [idx for idx in next_peaks_lib if libre[peaks_lib[idx]] > RED]
                if len(poss) == 0:
                    spikes_lib.append(None)
                else:
                    next_peak_idx = poss[0]
                    prom = libre[peaks_lib[next_peak_idx]] - libre[lbase_lib[next_peak_idx]] #get just left height
                    spikes_lib.append(prom)
            else:
                next_peak_idx = next_peaks_lib[0] #get next idx
                prom = libre[peaks_lib[next_peak_idx]] - libre[lbase_lib[next_peak_idx]] #get just left height
                spikes_lib.append(prom)
        else: #no next peak
            spikes_lib.append(None)
        
        #find first prominence after each meal --> DEXCOM CGM
        
        next_peaks_dex = np.ravel(np.where((peaks_dex > curr_meal_idx) & (peaks_dex < next_meal_idx)))
        if len(next_peaks_dex) > 0:
            if unhealthy: #just get the postmeal spikes that are in red range
                poss = [idx for idx in next_peaks_dex if dexcom[peaks_dex[idx]] > RED]
                if len(poss) == 0:
                    spikes_dex.append(None)
                else:
                    next_peak_idx = poss[0]
                    prom = dexcom[peaks_dex[next_peak_idx]] - dexcom[lbase_dex[next_peak_idx]]
                    spikes_dex.append(prom)
            else:
                next_peak_idx = next_peaks_dex[0]
                prom = dexcom[peaks_dex[next_peak_idx]] - dexcom[lbase_dex[next_peak_idx]]
                spikes_dex.append(prom)
        else: #no next peak
            spikes_dex.append(None)
    
    #checks

    if discrete:
        spikes_lib = discretize(spikes_lib)
        spikes_dex = discretize(spikes_dex)
        
    #print("lib", spikes_lib)
    #print("dex", spikes_dex)
    
    
    meals["lib_prom"] = spikes_lib #make new columns
    meals["dex_prom"] = spikes_dex #make new columns
    
    meals = meals.dropna(subset=["lib_prom", "dex_prom"]) #remove meals who don't have a corresponding spike
    
    return meals
