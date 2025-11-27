from docx import Document
from pathlib import Path
path = Path(r'C:\AI\de_original.docx')
doc = Document(path)
for idx, para in enumerate(doc.paragraphs):
    if para.style.name.startswith('Heading'):
        print(f"{idx:04d} | {para.style.name} | {para.text.encode('unicode_escape').decode()}")
