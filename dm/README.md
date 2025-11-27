Fun project analyzing the recent [CGMacros Dataset](https://physionet.org/content/cgmacros/1.0.0/). Contained here is:
* exploratory analysis/visualization of CGM data for participants (including markers for meal times, postprandial spikes, healthy/unhealthy ranges)
* simple -> complex modeling attempts to use given markers to predict severity of postprandial spike, including:
    * naive linear regression
    * xgboost regression (+ classification on discretized set)
    * MLP (trained on just meal macros)
    * MLP (trained on meal macros + biomarkers)
    * hybrid LSTM+MLP (trained on past 75 min of CGM data + meal macros + biomarkers)
* current best result: MAE < 29 mg/dL, comparable to existing CGMs' margin

🍩