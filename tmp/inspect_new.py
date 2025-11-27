from docx import Document
path = r"C:\AI\de.docx"
doc = Document(path)
for idx, para in enumerate(doc.paragraphs):
    if para.style.name.startswith('Heading'):
        print(f"{idx:04d} | {para.style.name} | {para.text}")
