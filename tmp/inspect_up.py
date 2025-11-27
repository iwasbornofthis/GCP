from pathlib import Path
import pandas as pd
path = Path(r"C:\AI\up.csv")
for enc in ("utf-8-sig","utf-8","cp949","euc-kr"):
    try:
        df = pd.read_csv(path, encoding=enc, nrows=1)
        print(enc, df.columns.tolist()[:10])
        break
    except Exception as e:
        print(enc, 'failed', e)
