from pathlib import Path
import re
text = Path(r"C:\AI\foodscan\src\Home.jsx").read_text()
m = re.search(r"const NUTRIENT_FIELDS = (\[[^\]]+\]);", text, re.S)
print(m.group(1) if m else 'not found')
