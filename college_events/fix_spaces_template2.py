import re

file_path = r"c:\Users\prati\OneDrive\Desktop\Collage-Event-Management-System-main\college_events\events\templates\events\student_dashboard.html"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix spacing around ==
content = re.sub(r'([a-zA-Z0-9_\.]+)=="([^"]+)"', r'\1 == "\2"', content)

# Fix broken tag wraps like selected{% \n endif %}
content = re.sub(r'selected{%\s*[\r\n]+\s*endif\s*%}', r'selected{% endif %}', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed broken tags and newlines.")
