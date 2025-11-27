import pandas as pd
path = r"C:\AI\up.csv"
cols = {
    '식품코드': 'food_code',
    '에너지(kcal)': 'energy_kcal',
    '단백질(g)': 'protein_g',
    '지방(g)': 'fat_g',
    '탄수화물(g)': 'carbohydrate_g',
    '당류(g)': 'sugars_g',
    '식이섬유(g)': 'dietary_fiber_g',
    '나트륨(mg)': 'sodium_mg'
}
df = pd.read_csv(path, encoding='utf-8-sig', usecols=list(cols.keys()))
df = df.rename(columns=cols)
df.to_csv(r"C:\AI\tmp\up_clean.csv", index=False)
print('rows', len(df))
