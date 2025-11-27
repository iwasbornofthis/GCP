import pandas as pd
path = r"C:\AI\tmp\up_clean.csv"
df = pd.read_csv(path)
print(df[df['food_code']=='D503-197000000-0001'])
