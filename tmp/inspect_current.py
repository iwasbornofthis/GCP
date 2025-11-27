from docx import Document

doc = Document(r'C:\AI\de.docx')
for idx, para in enumerate(doc.paragraphs):
    if para.style.name.startswith('Heading'):
        print(f"{idx:04d} | {para.style.name} | {para.text}")
