from docx import Document
from pathlib import Path
path = Path(r'C:\AI\de_original.docx')
doc = Document(path)
start = 57
for idx, para in enumerate(doc.paragraphs):
    if idx < start:
        continue
    text = para.text.strip()
    if not text:
        continue
    style = para.style.name
    print(f"{idx:04d} | {style} | {text}")
