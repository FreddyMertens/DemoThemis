import re, sys

path = sys.argv[1] if len(sys.argv) > 1 else "hybrid-juror-system.html"
with open(path, encoding="utf-8") as f:
    html = f.read()

# Drop script and style blocks entirely.
html = re.sub(r"<script.*?</script>", " ", html, flags=re.DOTALL | re.IGNORECASE)
html = re.sub(r"<style.*?</style>", " ", html, flags=re.DOTALL | re.IGNORECASE)
# Drop the document head (title/meta are not body prose).
html = re.sub(r"<head.*?</head>", " ", html, flags=re.DOTALL | re.IGNORECASE)
# Strip tags and HTML entities.
text = re.sub(r"<[^>]+>", " ", html)
text = re.sub(r"&[#a-zA-Z0-9]+;", " ", text)

words = re.findall(r"[A-Za-z0-9']+", text)
print(path)
print("visible prose words:", len(words))
