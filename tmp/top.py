from docx import Document
path = r'C:\AI\de_original.docx'
doc = Document(path)
for idx, para in enumerate(doc.paragraphs[:20]):
    text = para.text
    style = para.style.name
    print(f"{idx:04d} | {style} | {text.encode('unicode_escape').decode()}")
