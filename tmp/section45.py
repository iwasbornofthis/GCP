from docx import Document
path = r"C:\AI\de.docx"
doc = Document(path)
flag = False
for para in doc.paragraphs:
    if para.text.startswith('4. ') or para.text.startswith('5. '):
        flag = True
    elif para.text.startswith('6.'):
        flag = False
    if flag:
        print(para.style.name, '|', para.text)
