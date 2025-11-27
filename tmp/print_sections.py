from docx import Document
path = r"C:\AI\de.docx"
doc = Document(path)
for para in doc.paragraphs:
    if para.text.startswith('4.1') or para.text.startswith('4.2') or para.text.startswith('4.3') or para.text.startswith('4.4') or para.text.startswith('5.'):
        print(para.text)
