import json
import re
from pathlib import Path

transcript = Path(
    r"C:\Users\eslam\.cursor\projects\d-completed-Oday-system\agent-transcripts\6df16ee7-8a3c-42fd-888d-f0e5c368bf13\6df16ee7-8a3c-42fd-888d-f0e5c368bf13.jsonl"
)
text = transcript.read_text(encoding="utf-8")

# The first line contains the full user query with both data URIs.
light = re.search(r"const LOGO_LIGHT = '(data:image/png;base64,[^']+)'", text)
black = re.search(r"const LOGO_BLACK = '(data:image/png;base64,[^']+)'", text)

if not light or not black:
    raise SystemExit(f"Could not extract logos. light={bool(light)} black={bool(black)}")

out = Path(r"d:\completed\Oday-system\dashboard\src\assets\logos.js")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(
    "export const LOGO_LIGHT = " + json.dumps(light.group(1)) + ";\n"
    "export const LOGO_BLACK = " + json.dumps(black.group(1)) + ";\n",
    encoding="utf-8",
)
print(f"Wrote {out} ({out.stat().st_size} bytes)")
