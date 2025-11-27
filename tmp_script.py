import pymysql
conn = pymysql.connect(host='127.0.0.1', port=3306, user='root', passwd='', db='foodscan', charset='utf8mb4')
cursor = conn.cursor()
cursor.execute('SELECT id, food_code, food_name FROM foods WHERE id IN (5664,579,10919,10885,936,150) ORDER BY FIELD(id,5664,579,10919,10885,936,150)')
rows = cursor.fetchall()
conn.close()
with open(r'C:\ai\candidates.txt', 'w', encoding='utf-8') as f:
    for row in rows:
        f.write(f"{row[0]}\t{row[1]}\t{row[2]}\n")
