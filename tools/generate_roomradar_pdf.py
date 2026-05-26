from pathlib import Path
import textwrap


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "deliverables"
OUTPUT = OUT_DIR / "RoomRadar_BTech_Major_Project_EN.pdf"

PAGE_W = 960
PAGE_H = 540
MARGIN = 54


SLIDES = [
    {
        "title": "RoomRadar",
        "subtitle": "AI-Powered Room Rental and Booking Platform",
        "body": [
            "A full-stack MERN web application for room discovery, landlord listings, secure bookings, real-time chat, admin moderation and AI assistance.",
            "B.Tech Final Year Major Project Presentation",
            "Presented by: [Your Name]    Guided by: [Guide Name]",
            "Department of [Branch] | [College Name] | 2026",
        ],
        "kind": "cover",
    },
    {
        "title": "Presentation Overview",
        "items": [
            "Introduction and Problem Statement",
            "Literature and Technology Review",
            "Proposed Methodology",
            "System Architecture",
            "Implementation and Results",
            "Testing and Evaluation",
            "Conclusion and Future Work",
            "References",
        ],
        "kind": "overview",
    },
    {
        "title": "Introduction and Problem Statement",
        "cards": [
            ("Domain", "RoomRadar belongs to the prop-tech domain and solves room discovery, listing management, booking and communication problems through one digital platform."),
            ("Background", "Students, travellers and working professionals often depend on scattered offline brokers, incomplete listings and slow communication while searching for rental rooms."),
            ("Problem", "The existing process lacks verified room information, fast filtering, transparent booking status, secure document handling and one trusted communication channel."),
            ("Objective", "To build a role-based rental platform where travellers search and book rooms, landlords manage listings, and admins moderate trust and safety workflows."),
        ],
        "kind": "cards",
    },
    {
        "title": "Literature and Technology Review",
        "cards": [
            ("Online Rental Marketplaces", "Digital marketplaces improve reach and convenience, but local rental systems still need stronger verification, filtering and dispute support."),
            ("Geospatial Search", "Location-based search, radius filtering and sorting improve relevance near colleges, offices and preferred areas."),
            ("Real-Time Messaging", "Socket-based chat improves user confidence by enabling direct inquiry handling and booking-related notifications."),
            ("Trust and Safety", "Role-based access, verified listings, reviews, upload validation and admin moderation reduce fraud, spam and disputes."),
        ],
        "kind": "cards",
    },
    {
        "title": "Proposed System / Methodology",
        "steps": [
            ("01", "Requirement Analysis", "Traveller, landlord and admin needs"),
            ("02", "System Design", "Routes, database, APIs and roles"),
            ("03", "MERN Development", "React, Express and MongoDB implementation"),
            ("04", "Integration and Security", "Chat, upload, auth and rate limits"),
            ("05", "Testing and Output", "Build, syntax and flow checks"),
        ],
        "kind": "method",
    },
    {
        "title": "System Architecture",
        "flow": ["UI Layer", "API Layer", "Business Logic", "Database / Storage", "Notifications / AI"],
        "cards": [
            ("Frontend", "React, Vite, Tailwind CSS, Framer Motion"),
            ("Backend", "Node.js, Express.js, JWT authentication"),
            ("Database", "MongoDB with Mongoose schemas"),
            ("Realtime", "Socket.IO chat and notifications"),
            ("Storage", "Multer upload validation and Cloudinary"),
            ("AI Module", "RoomRadar chatbot and smart search assistance"),
        ],
        "kind": "architecture",
    },
    {
        "title": "Implementation and Results",
        "body": [
            "Working modules include traveller search, room details, booking requests, landlord listing management, admin moderation, inbox, chatbot and support tickets.",
        ],
        "metrics": [
            ("3", "Role-Based Portals"),
            ("End-to-End", "Search to Booking Flow"),
            ("Realtime", "Chat and Notifications"),
            ("Verified", "Build and Syntax Checks"),
        ],
        "kind": "results",
    },
    {
        "title": "Testing and Evaluation",
        "rows": [
            ("TC-01: Login and Role Routing", "Correct dashboard opens", "PASS"),
            ("TC-02: Location Search and Filters", "Rooms update by city, radius and filters", "PASS"),
            ("TC-03: Booking Request", "Valid room, ID proof, terms and future date required", "PASS"),
            ("TC-04: Chat and Inquiry", "Inquiry and conversation flow connected", "PASS"),
            ("TC-05: Upload Validation", "Unsafe files rejected by type and size checks", "PASS"),
        ],
        "kind": "testing",
    },
    {
        "title": "Conclusion and Future Work",
        "cards": [
            ("Conclusion", "RoomRadar provides a complete digital rental workflow for room discovery, listing management, booking, chat and support. The platform improves transparency through verified listings, reviews, protected booking steps and admin moderation."),
            ("Future Work", "Deploy on cloud infrastructure, integrate online payment gateway, develop Android/iOS apps, add AI recommendations, multilingual chatbot support and analytics dashboards."),
        ],
        "kind": "two_col",
    },
    {
        "title": "References",
        "items": [
            "React Documentation and Vite Documentation: https://react.dev/ | https://vite.dev/",
            "Express.js Documentation: https://expressjs.com/",
            "MongoDB and Mongoose Documentation: https://www.mongodb.com/docs/ | https://mongoosejs.com/docs/",
            "Socket.IO Documentation: https://socket.io/docs/",
            "Cloudinary Documentation: https://cloudinary.com/documentation",
            "OWASP Web Application Security Guidelines: https://owasp.org/",
        ],
        "kind": "references",
    },
    {
        "title": "Thank You!",
        "subtitle": "Questions and Discussions Welcome",
        "body": [
            "[Your Name] | [email@example.com] | Roll No: [XXXXXX]",
            "Department of [Branch] | [College Name] | 2026",
        ],
        "kind": "thankyou",
    },
]


def esc(value):
    return str(value).replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def rgb(hex_value):
    hex_value = hex_value.strip("#")
    return tuple(int(hex_value[i:i + 2], 16) / 255 for i in (0, 2, 4))


class Page:
    def __init__(self):
        self.ops = []

    def raw(self, op):
        self.ops.append(op)

    def fill(self, color):
        r, g, b = rgb(color)
        self.raw(f"{r:.4f} {g:.4f} {b:.4f} rg")

    def stroke(self, color):
        r, g, b = rgb(color)
        self.raw(f"{r:.4f} {g:.4f} {b:.4f} RG")

    def rect(self, x, y, w, h, color, stroke=None):
        self.fill(color)
        if stroke:
            self.stroke(stroke)
            self.raw(f"{x:.1f} {y:.1f} {w:.1f} {h:.1f} re B")
        else:
            self.raw(f"{x:.1f} {y:.1f} {w:.1f} {h:.1f} re f")

    def line(self, x1, y1, x2, y2, color="#0f766e", width=2):
        self.stroke(color)
        self.raw(f"{width:.1f} w {x1:.1f} {y1:.1f} m {x2:.1f} {y2:.1f} l S")

    def text(self, x, y, text, size=16, bold=False, color="#111827"):
        self.fill(color)
        font = "F2" if bold else "F1"
        self.raw(f"BT /{font} {size:.1f} Tf 1 0 0 1 {x:.1f} {y:.1f} Tm ({esc(text)}) Tj ET")

    def wrapped(self, x, y, text, width, size=15, bold=False, color="#111827", leading=1.25):
        max_chars = max(18, int(width / (size * 0.52)))
        lines = []
        for paragraph in str(text).split("\n"):
            lines.extend(textwrap.wrap(paragraph, max_chars) or [""])
        step = size * leading
        for line in lines:
            self.text(x, y, line, size=size, bold=bold, color=color)
            y -= step
        return y


def draw_background(page, slide_no):
    page.rect(0, 0, PAGE_W, PAGE_H, "#f8fafc")
    page.rect(0, PAGE_H - 68, PAGE_W, 68, "#0f172a")
    page.rect(0, PAGE_H - 72, PAGE_W, 4, "#06b6d4")
    page.text(MARGIN, PAGE_H - 44, "RoomRadar Major Project", size=15, bold=True, color="#ffffff")
    page.text(PAGE_W - 95, PAGE_H - 44, f"{slide_no:02d}", size=15, bold=True, color="#67e8f9")
    page.rect(0, 0, PAGE_W, 22, "#e2e8f0")
    page.text(MARGIN, 7, "AI-Powered Room Rental and Booking Platform", size=9, color="#334155")


def draw_title(page, title):
    page.text(MARGIN, PAGE_H - 118, title, size=30, bold=True, color="#0f172a")
    page.line(MARGIN, PAGE_H - 132, MARGIN + 170, PAGE_H - 132, color="#06b6d4", width=4)


def draw_card(page, x, y, w, h, title, body, accent="#06b6d4"):
    page.rect(x, y, w, h, "#ffffff", stroke="#dbeafe")
    page.rect(x, y + h - 8, w, 8, accent)
    page.text(x + 18, y + h - 34, title, size=16, bold=True, color="#0f172a")
    page.wrapped(x + 18, y + h - 62, body, w - 36, size=12.5, color="#334155")


def render_slide(slide, index):
    page = Page()
    kind = slide["kind"]

    if kind == "cover":
        page.rect(0, 0, PAGE_W, PAGE_H, "#020617")
        page.rect(0, 0, 320, PAGE_H, "#082f49")
        page.rect(320, 0, 8, PAGE_H, "#06b6d4")
        page.text(MARGIN, PAGE_H - 108, "B.TECH FINAL YEAR - MAJOR PROJECT PRESENTATION", size=15, bold=True, color="#67e8f9")
        page.text(MARGIN, PAGE_H - 190, slide["title"], size=54, bold=True, color="#ffffff")
        page.text(MARGIN, PAGE_H - 236, slide["subtitle"], size=24, bold=True, color="#cffafe")
        page.wrapped(MARGIN, PAGE_H - 282, slide["body"][0], 770, size=15, color="#e2e8f0")
        page.rect(MARGIN, 76, 800, 92, "#0f172a", stroke="#334155")
        page.wrapped(MARGIN + 24, 136, "\n".join(slide["body"][1:]), 750, size=13, color="#e2e8f0")
        return page

    if kind == "thankyou":
        page.rect(0, 0, PAGE_W, PAGE_H, "#020617")
        page.rect(0, PAGE_H - 16, PAGE_W, 16, "#06b6d4")
        page.text(MARGIN, PAGE_H - 190, slide["title"], size=58, bold=True, color="#ffffff")
        page.text(MARGIN, PAGE_H - 238, slide["subtitle"], size=25, bold=True, color="#67e8f9")
        page.wrapped(MARGIN, PAGE_H - 310, "\n".join(slide["body"]), 760, size=16, color="#e2e8f0")
        page.rect(MARGIN, 86, 850, 2, "#334155")
        return page

    draw_background(page, index)
    draw_title(page, slide["title"])

    if kind == "overview":
        for i, item in enumerate(slide["items"], 1):
            col = 0 if i <= 4 else 1
            row = (i - 1) % 4
            x = MARGIN + col * 430
            y = PAGE_H - 205 - row * 78
            page.rect(x, y, 370, 56, "#ffffff", stroke="#cbd5e1")
            page.text(x + 18, y + 19, f"{i:02d}", size=17, bold=True, color="#0891b2")
            page.wrapped(x + 70, y + 33, item, 270, size=14, bold=True, color="#0f172a")

    elif kind == "cards":
        for i, (title, body) in enumerate(slide["cards"]):
            x = MARGIN + (i % 2) * 425
            y = PAGE_H - 276 - (i // 2) * 150
            draw_card(page, x, y, 380, 116, title, body, accent="#06b6d4" if i % 2 == 0 else "#f59e0b")

    elif kind == "method":
        for i, (num, title, body) in enumerate(slide["steps"]):
            x = MARGIN + i * 170
            y = PAGE_H - 350
            page.rect(x, y, 142, 166, "#ffffff", stroke="#cbd5e1")
            page.text(x + 18, y + 126, num, size=28, bold=True, color="#0891b2")
            page.wrapped(x + 18, y + 92, title, 110, size=13.5, bold=True, color="#0f172a")
            page.wrapped(x + 18, y + 50, body, 108, size=11.5, color="#475569")
            if i < len(slide["steps"]) - 1:
                page.line(x + 146, y + 82, x + 166, y + 82, color="#94a3b8", width=2)
        page.wrapped(MARGIN, 94, "The methodology follows an iterative full-stack development approach: define modules, implement UI and APIs, connect workflows, harden edge cases and verify production readiness.", 820, size=13, color="#334155")

    elif kind == "architecture":
        x = MARGIN
        y = PAGE_H - 205
        for item in slide["flow"]:
            page.rect(x, y, 150, 48, "#e0f2fe", stroke="#38bdf8")
            page.wrapped(x + 12, y + 29, item, 125, size=12.5, bold=True, color="#0f172a")
            x += 165
            if x < 850:
                page.text(x - 13, y + 17, ">", size=18, bold=True, color="#0891b2")
        for i, (title, body) in enumerate(slide["cards"]):
            cx = MARGIN + (i % 3) * 285
            cy = PAGE_H - 392 - (i // 3) * 92
            draw_card(page, cx, cy, 248, 70, title, body, accent="#22c55e")

    elif kind == "results":
        page.wrapped(MARGIN, PAGE_H - 178, slide["body"][0], 820, size=15, color="#334155")
        for i, (metric, label) in enumerate(slide["metrics"]):
            x = MARGIN + (i % 2) * 420
            y = PAGE_H - 335 - (i // 2) * 120
            page.rect(x, y, 370, 86, "#ffffff", stroke="#cbd5e1")
            page.text(x + 22, y + 47, metric, size=24, bold=True, color="#0891b2")
            page.wrapped(x + 150, y + 50, label, 190, size=14, bold=True, color="#0f172a")
        page.text(MARGIN, 84, "Latest verification: client production build passed and server syntax checks completed without errors.", size=14, bold=True, color="#0f172a")

    elif kind == "testing":
        headers = ["Test Case / Module", "Expected / Actual Output", "Status"]
        widths = [330, 395, 100]
        x0 = MARGIN
        y = PAGE_H - 185
        x = x0
        for header, width in zip(headers, widths):
            page.rect(x, y, width, 42, "#0f172a", stroke="#0f172a")
            page.text(x + 12, y + 15, header, size=12, bold=True, color="#ffffff")
            x += width
        y -= 46
        for test, output, status in slide["rows"]:
            x = x0
            for value, width in zip([test, output, status], widths):
                page.rect(x, y, width, 50, "#ffffff", stroke="#cbd5e1")
                page.wrapped(x + 12, y + 30, value, width - 24, size=11.5, bold=(status == "PASS"), color="#0f172a" if status != "PASS" else "#15803d")
                x += width
            y -= 50

    elif kind == "two_col":
        for i, (title, body) in enumerate(slide["cards"]):
            x = MARGIN + i * 430
            draw_card(page, x, PAGE_H - 405, 382, 220, title, body, accent="#06b6d4" if i == 0 else "#22c55e")

    elif kind == "references":
        y = PAGE_H - 178
        for i, item in enumerate(slide["items"], 1):
            page.text(MARGIN, y, f"[{i}]", size=13, bold=True, color="#0891b2")
            y = page.wrapped(MARGIN + 42, y, item, 780, size=12.5, color="#334155") - 12

    return page


def make_stream(page):
    return "\n".join(page.ops).encode("latin-1", errors="replace")


def write_pdf(pages, output):
    objects = []

    def add(obj):
        objects.append(obj)
        return len(objects)

    catalog_id = add(None)
    pages_id = add(None)
    font_regular_id = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font_bold_id = add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")

    page_ids = []
    content_ids = []
    for page in pages:
        stream = make_stream(page)
        content_id = add(b"<< /Length %d >>\nstream\n" % len(stream) + stream + b"\nendstream")
        page_id = add(None)
        content_ids.append(content_id)
        page_ids.append(page_id)

    objects[catalog_id - 1] = f"<< /Type /Catalog /Pages {pages_id} 0 R >>".encode()
    kids = " ".join(f"{page_id} 0 R" for page_id in page_ids)
    objects[pages_id - 1] = f"<< /Type /Pages /Kids [{kids}] /Count {len(page_ids)} >>".encode()

    for page_id, content_id in zip(page_ids, content_ids):
        objects[page_id - 1] = (
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
            f"/Resources << /Font << /F1 {font_regular_id} 0 R /F2 {font_bold_id} 0 R >> >> "
            f"/Contents {content_id} 0 R >>"
        ).encode()

    pdf = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, obj in enumerate(objects, 1):
        offsets.append(len(pdf))
        pdf.extend(f"{i} 0 obj\n".encode())
        pdf.extend(obj)
        pdf.extend(b"\nendobj\n")

    xref = len(pdf)
    pdf.extend(f"xref\n0 {len(objects) + 1}\n".encode())
    pdf.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        pdf.extend(f"{offset:010d} 00000 n \n".encode())
    pdf.extend(
        f"trailer\n<< /Size {len(objects) + 1} /Root {catalog_id} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )

    output.write_bytes(pdf)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    pages = [render_slide(slide, i + 1) for i, slide in enumerate(SLIDES)]
    write_pdf(pages, OUTPUT)
    print(OUTPUT)


if __name__ == "__main__":
    main()
