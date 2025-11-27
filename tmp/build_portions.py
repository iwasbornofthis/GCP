import pandas as pd
import re
from pathlib import Path
path = Path(r"C:\AI\up.csv")
df = pd.read_csv(path, encoding="utf-8-sig", usecols=["식품코드","영양성분함량기준량","식품중량"])

def parse_field(val, default_unit="g"):
    if pd.isna(val):
        return "", "", ""
    raw = str(val).strip()
    if not raw:
        return "", "", ""
    text = raw.replace(" ", "").replace("\r", "").replace("\n", "")
    match = re.match(r"^([0-9]+(?:\.[0-9]+)?)", text)
    if not match:
        return text, "", ""
    number = match.group(1)
    unit = text[match.end():]
    if not unit and default_unit:
        unit = default_unit
    try:
        numeric = float(number)
    except ValueError:
        numeric = ""
    value_text = f"{numeric:g}{unit}" if unit and numeric != "" else (number if numeric == "" else f"{numeric:g}")
    return value_text, unit, numeric

rows = []
for _, row in df.iterrows():
    srv_str, srv_unit, srv_val = parse_field(row["영양성분함량기준량"], default_unit="g")
    prod_str, prod_unit, prod_val = parse_field(row["식품중량"], default_unit=srv_unit or "g")
    rows.append({
        'food_code': row['식품코드'],
        'serving_size_str': srv_str,
        'serving_size_unit': srv_unit,
        'serving_size_value': srv_val if srv_val != "" else "",
        'product_weight_str': prod_str,
        'product_weight_unit': prod_unit,
        'product_weight_value': prod_val if prod_val != "" else ""
    })

out_path = Path(r"C:\AI\tmp\portion_update.csv")
pd.DataFrame(rows).to_csv(out_path, index=False)
print('written', len(rows), 'rows to', out_path)
