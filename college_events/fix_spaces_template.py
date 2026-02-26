import re
file_path = r"c:\Users\prati\OneDrive\Desktop\Collage-Event-Management-System-main\college_events\events\templates\events\student_dashboard.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Replace missing spaces around == in Django template tags
content = re.sub(r'{%\s*if\s+([a-zA-Z0-9_\.]+)=="([^"]+)"\s*%}', r'{% if \1 == "\2" %}', content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Fixed syntax errors in student_dashboard.html")
