import zipfile, xml.etree.ElementTree as ET
from pathlib import Path
path = Path(r"C:\AI\de.docx")
with zipfile.ZipFile(path) as zf:
    xml_data = zf.read('word/document.xml')
root = ET.fromstring(xml_data)
ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
for i, para in enumerate(root.findall('.//w:p', ns)):
    texts = [node.text for node in para.findall('.//w:t', ns) if node.text]
    if not texts:
        continue
    text = ''.join(texts)
    print(f"{i:04d}: {text}")
    if i > 400:
        break
