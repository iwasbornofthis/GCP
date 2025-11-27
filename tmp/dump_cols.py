from pathlib import Path
import pandas as pd
path = Path(r"C:\AI\up.csv")
df = pd.read_csv(path, encoding="utf-8-sig", nrows=1)
with open(r"C:\AI\tmp\up_columns.txt","w", encoding="utf-8") as f:
    for idx, col in enumerate(df.columns):
        f.write(f"{idx}: {col}\n")
