
"""
eGL (estimated Glycemic Load) regression model — Foods 2021 (RTE meals)
----------------------------------------------------------------------
Equation (units in grams per serving):
    eGL = 19.27 + 0.39*AvailCarb - 0.21*Fat - 0.01*(Protein**2) - 0.01*(Fiber**2)
where AvailCarb = TotalCarb - Fiber

Categories (common practice):
    Low (<= 10), Medium (11–19), High (>= 20)

Notes:
  - This is a label-based approximation derived from a specific dataset (ready-to-eat/mixed meals).
  - External validation on market fast foods reported Pearson r ≈ 0.712.
  - Not a medical device. Do not use for dosing decisions.

Sources:
  - Foods (MDPI) 2021;10(11):2626. doi:10.3390/foods10112626
  - Frontiers in Nutrition 2022; Validation on 24 fast-food items.

Usage:
  >>> from egl_model import EGLModel
  >>> model = EGLModel()
  >>> model.predict(carbs_g=45, fiber_g=5, protein_g=12, fat_g=10)
  18.41  # example output
"""
from __future__ import annotations
from dataclasses import dataclass
from typing import Dict, Iterable, Optional
import math

try:
    import pandas as pd
    _HAS_PANDAS = True
except Exception:
    _HAS_PANDAS = False

@dataclass(frozen=True)
class EGLModel:
    intercept: float = 19.27
    beta_avail_carbs: float = 0.39
    beta_fat: float = -0.21
    beta_protein_sq: float = -0.01
    beta_fiber_sq: float = -0.01

    def predict(
        self,
        carbs_g: float,
        fiber_g: float,
        protein_g: float,
        fat_g: float,
        clip_nonnegative: bool = True,
        use_available_carbs: bool = True,
    ) -> float:
        """Compute eGL for a single item.

        Args:
          carbs_g: total carbohydrate (g) per serving (includes fiber on most labels)
          fiber_g: dietary fiber (g) per serving
          protein_g: protein (g) per serving
          fat_g: total fat (g) per serving
          clip_nonnegative: if True, eGL is floored at 0.0
          use_available_carbs: if True (default), uses (carbs - fiber) as carbohydrate
        Returns:
          eGL (float)
        """
        if any(v is None for v in (carbs_g, fiber_g, protein_g, fat_g)):
            raise ValueError("All macro inputs (carbs, fiber, protein, fat) must be provided (g).")

        avail = (carbs_g - fiber_g) if use_available_carbs else carbs_g
        egl = (
            self.intercept
            + self.beta_avail_carbs * avail
            + self.beta_fat * fat_g
            + self.beta_protein_sq * (protein_g ** 2)
            + self.beta_fiber_sq * (fiber_g ** 2)
        )
        if clip_nonnegative:
            egl = max(egl, 0.0)
        return float(egl)

    @staticmethod
    def classify(egl: float) -> str:
        """Return GL category: 'Low', 'Medium', or 'High'."""
        if math.isnan(egl):
            return "NA"
        if egl <= 10:
            return "Low (<=10)"
        elif egl < 20:
            return "Medium (11-19)"
        else:
            return "High (>=20)"

    # --------- Optional Pandas helpers ---------
    def predict_dataframe(
        self,
        df,  # pandas.DataFrame
        colmap: Optional[Dict[str, str]] = None,
        clip_nonnegative: bool = True,
        use_available_carbs: bool = True,
    ):
        """Vectorized prediction on a pandas DataFrame.

        Args:
          df: DataFrame with columns for carbs, fiber, protein, fat (grams)
          colmap: optional mapping of model field names to df columns, e.g.:
                  {"carbs": "TotalCarb_g", "fiber": "Fiber_g",
                   "protein": "Protein_g", "fat": "Fat_g"}
        Returns:
          DataFrame with added columns: 'AvailableCarb_g', 'eGL', 'GL_Category'
        """
        if not _HAS_PANDAS:
            raise RuntimeError("pandas is required for predict_dataframe. Install pandas first.")

        import pandas as pd  # type: ignore

        # Default column mapping
        _map = {
            "carbs": "Carbs_g",
            "fiber": "Fiber_g",
            "protein": "Protein_g",
            "fat": "Fat_g",
        }
        if colmap:
            _map.update(colmap)

        c = df[_map["carbs"]].astype(float)
        fbr = df[_map["fiber"]].astype(float)
        pro = df[_map["protein"]].astype(float)
        fat = df[_map["fat"]].astype(float)

        avail = (c - fbr) if use_available_carbs else c
        egl = (
            self.intercept
            + self.beta_avail_carbs * avail
            + self.beta_fat * fat
            + self.beta_protein_sq * (pro ** 2)
            + self.beta_fiber_sq * (fbr ** 2)
        )
        if clip_nonnegative:
            egl = egl.clip(lower=0.0)

        out = df.copy()
        out["AvailableCarb_g"] = avail
        out["eGL"] = egl
        out["GL_Category"] = out["eGL"].map(self.classify)
        return out


if __name__ == "__main__":
    # Minimal CLI
    import argparse
    parser = argparse.ArgumentParser(description="eGL predictor (Foods 2021 regression)")
    parser.add_argument("--carbs", type=float, help="Total carbohydrate (g) per serving", required=False)
    parser.add_argument("--fiber", type=float, help="Dietary fiber (g) per serving", required=False)
    parser.add_argument("--protein", type=float, help="Protein (g) per serving", required=False)
    parser.add_argument("--fat", type=float, help="Total fat (g) per serving", required=False)
    parser.add_argument("--csv_in", type=str, help="Path to CSV with columns Carbs_g,Fiber_g,Protein_g,Fat_g", required=False)
    parser.add_argument("--csv_out", type=str, help="Path to save CSV with predictions", required=False)
    parser.add_argument("--no_clip", action="store_true", help="Do not floor negative eGL to zero")
    parser.add_argument("--use_total_carbs", action="store_true", help="Use total carbs (do not subtract fiber)")
    args = parser.parse_args()

    model = EGLModel()

    if args.csv_in:
        if not _HAS_PANDAS:
            raise SystemExit("pandas is required for CSV mode. Install pandas and try again.")
        import pandas as pd
        df = pd.read_csv(args.csv_in)
        out = model.predict_dataframe(
            df,
            clip_nonnegative=not args.no_clip,
            use_available_carbs=not args.use_total_carbs
        )
        if args.csv_out:
            out.to_csv(args.csv_out, index=False)
            print(f"Saved: {args.csv_out}")
        else:
            print(out.to_csv(index=False))
    else:
        # Single item mode
        for n, v in {"carbs": args.carbs, "fiber": args.fiber, "protein": args.protein, "fat": args.fat}.items():
            if v is None:
                raise SystemExit("Provide --carbs --fiber --protein --fat OR use --csv_in.")
        egl = model.predict(
            carbs_g=args.carbs,
            fiber_g=args.fiber,
            protein_g=args.protein,
            fat_g=args.fat,
            clip_nonnegative=not args.no_clip,
            use_available_carbs=not args.use_total_carbs
        )
        cat = model.classify(egl)
        print(f"eGL: {egl:.2f} | Category: {cat}")
