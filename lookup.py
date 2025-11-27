import csv
rows = {}
with open(r'C:\ai\ms.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        rows[row['식품코드']] = row
codes = ['D202-120000000-3348','D202-082000000-0059','D302-132000000-0001','D302-080250000-0001','D202-090000000-0025','D105-216300000-0001']
for code in codes:
    r = rows.get(code)
    if r:
        print(code, r['식품명'])
    else:
        print(code, 'not found')
