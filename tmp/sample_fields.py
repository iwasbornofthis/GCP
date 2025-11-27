import pandas as pd
import re
path = r"C:\AI\up.csv"
df = pd.read_csv(path, encoding="utf-8-sig", usecols=["식품코드","영양성분함량기준량","식품중량"])
print('serving examples:', df["영양성분함량기준량"].dropna().head(10).tolist())
print('weight examples:', df["식품중량"].dropna().head(10).tolist())
