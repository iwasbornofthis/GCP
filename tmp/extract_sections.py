from docx import Document
path = r"C:\AI\de.docx"
doc = Document(path)
sections = {4: [], 5: []}
current = None
for para in doc.paragraphs:
    text = para.text.strip()
    if not text:
        continue
    if text.startswith("4."):
        current = 4
    elif text.startswith("5."):
        current = 5
    elif text.startswith("6."):
        current = None
    if current in sections:
        sections[current].append(text)
for key, lines in sections.items():
    print(f"--- Section {key} ---")
    for line in lines:
        print(line)
