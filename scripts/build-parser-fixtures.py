"""Generate controlled parsing fixtures with the bundled reportlab runtime.

These are test inputs, not verified research or seeded product results.
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "apps/worker/tests/fixtures"
OUT.mkdir(parents=True, exist_ok=True)
BODY = [
    "The Transformer uses attention mechanisms [1].",
    "A synthetic system reduces error by 40% [12].",
    "This controlled document tests extraction. It reports no measured verification results.",
]
REFS = ["Vaswani, A. et al. (2017). Attention Is All You Need. NeurIPS. arXiv:1706.03762."]
REFS += [f"Example, A. ({2020+i%3}). Fixture Paper {i:02d}. Test Proceedings." for i in range(2, 12)]
REFS += ["Mehta, A. and Chen, B. (2022). Graph Priors for Recall. Test Proceedings. arXiv:2305.XXXX."]
text = "Citation parsing fixture\n\n" + "\n".join(BODY) + "\n\nReferences\n"
text += "\n".join(f"[{i}] {ref}" for i, ref in enumerate(REFS, 1))
(OUT / "document.txt").write_text(text+"\n")
styles = getSampleStyleSheet()
styles.add(ParagraphStyle("Reference", parent=styles["BodyText"], fontSize=10, leading=14, spaceAfter=9))
doc = SimpleDocTemplate(str(OUT / "document.pdf"), pagesize=A4, rightMargin=48, leftMargin=48, topMargin=48, bottomMargin=48)
story = [Paragraph("Citation parsing fixture", styles["Title"]),
         Paragraph("Controlled test input - not a scientific paper", styles["Italic"]), Spacer(1, 20)]
story += [Paragraph(p, styles["BodyText"]) for p in BODY]
story += [Spacer(1, 18), Paragraph("References", styles["Heading2"])]
story += [Paragraph(f"[{i}] {ref}", styles["Reference"]) for i, ref in enumerate(REFS, 1)]
def footer(canvas, document):
    canvas.setFillColor(colors.HexColor("#6B4A53"))
    canvas.setFont("Helvetica", 9)
    canvas.drawString(48, 26, "VeriCite / parser test fixture")
    canvas.drawRightString(A4[0]-48, 26, str(document.page))
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("Created parser PDF and text: 12 references, linked claims for [1] and [12].")
