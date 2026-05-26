from pathlib import Path
import html
import re
import shutil
import tempfile
import zipfile


ROOT = Path(__file__).resolve().parents[1]
TEMPLATE = Path(r"c:\Users\rk636\Desktop\BTech_Major_Project_EN.pptx")
OUT_DIR = ROOT / "deliverables"
OUTPUT = OUT_DIR / "RoomRadar_BTech_Major_Project_EN.pptx"


SLIDE_TEXT = {
    1: [
        "B.TECH FINAL YEAR - MAJOR PROJECT PRESENTATION",
        "RoomRadar: AI-Powered Room Rental and Booking Platform",
        "A full-stack MERN web application for room discovery, landlord listings, secure bookings, real-time chat, admin moderation and AI assistance",
        "Presented by:",
        "[Your Name]",
        "Guided by:",
        "[Guide Name]",
        "Department of [Branch] | [College Name] | 2026",
    ],
    2: [
        "Presentation Overview",
        "01",
        "Introduction and Problem Statement",
        "02",
        "Literature and Technology Review",
        "03",
        "Proposed Methodology",
        "04",
        "System Architecture",
        "05",
        "Implementation and Results",
        "06",
        "Testing and Evaluation",
        "07",
        "Conclusion and Future Work",
        "08",
        "References",
    ],
    3: [
        "01",
        "Introduction",
        "Problem Statement",
        "RoomRadar belongs to the prop-tech domain and solves room discovery, listing management, booking and communication problems through one digital platform.",
        "Background",
        "Students, travellers and working professionals often depend on scattered offline brokers, incomplete listings and slow communication while searching for rental rooms.",
        "Problem Statement",
        "The existing process lacks verified room information, fast filtering, transparent booking status, secure document handling and a single trusted channel for tenant-landlord communication.",
        "Objective",
        "To build a role-based room rental platform where travellers can search and book rooms, landlords can manage listings, and admins can moderate trust and safety workflows.",
        "Motivation",
        "The system reduces manual effort, improves trust, supports faster decision making and provides a premium online rental experience for both tenants and landlords.",
    ],
    4: [
        "02  Literature and Technology Review",
        "Online Rental Marketplace Platforms",
        "Digital marketplaces improve reach and convenience, but local rental systems still need stronger verification, filtering and dispute support.",
        "Geospatial Search and Recommendations",
        "Location-based search, radius filtering and sorting improve relevance when users search rooms near colleges, offices or preferred areas.",
        "Real-time Messaging Systems",
        "Socket-based chat improves user confidence by enabling direct communication, inquiry handling and booking-related notifications.",
        "Trust and Safety Workflows",
        "Role-based access, verified listings, reviews, upload validation and admin moderation reduce fraud, spam and booking disputes.",
    ],
    5: [
        "03  Proposed System / Methodology",
        "1",
        "Requirement",
        "Analysis",
        "Traveller, landlord, admin needs",
        "2",
        "System",
        "Design",
        "Routes, database, APIs, roles",
        "3",
        "MERN",
        "Development",
        "React, Express, MongoDB",
        "4",
        "Integration",
        "and Security",
        "Chat, upload, auth, rate limits",
        "5",
        "Testing",
        "and Output",
        "Build, syntax and flow checks",
        "The methodology follows an iterative full-stack development approach: define modules, implement UI and APIs, connect workflows, harden edge cases and verify production readiness.",
    ],
    6: [
        "04  System Architecture",
        "Traveller, Landlord and Admin interfaces",
        "React + Vite frontend communicates with Express REST APIs and Socket.IO for real-time events.",
        "UI Layer -> API Layer -> Business Logic -> Database/Storage -> Notifications/AI",
        "Tech Stack",
        "Frontend",
        "React, Vite, Tailwind CSS, Framer Motion",
        "Backend",
        "Node.js, Express.js, JWT authentication",
        "Database",
        "MongoDB with Mongoose schemas",
        "Realtime",
        "Socket.IO chat and notifications",
        "Storage",
        "Multer upload validation and Cloudinary",
        "AI Module: RoomRadar chatbot and smart search assistance",
    ],
    7: [
        "05  Implementation and Results",
        "Insert screenshots of Home, Search, Booking, Landlord Dashboard and Admin Panel",
        "Working modules include traveller search, room details, booking requests, landlord listing management, admin moderation, inbox, chatbot and support tickets.",
        "3",
        "Role-Based Portals",
        "End-to-End",
        "Search to Booking Flow",
        "Realtime",
        "Chat and Notifications",
        "Verified",
        "Build and Syntax Checks",
        "The latest client production build passed successfully and server JavaScript syntax checks completed without errors.",
    ],
    8: [
        "06  Testing and Evaluation",
        "Test Case / Module",
        "Expected Output",
        "Actual Output",
        "Status",
        "TC-01: Login and Role Routing",
        "Correct dashboard opens",
        "Traveller, landlord and admin routes protected",
        "PASS",
        "TC-02: Location Search and Filters",
        "Rooms update by city, radius and filters",
        "Search state and query results refreshed",
        "PASS",
        "TC-03: Booking Request",
        "Only valid rooms and dates accepted",
        "Server validates terms, ID proof and future move-in",
        "PASS",
        "TC-04: Chat and Inquiry",
        "Message reaches landlord",
        "Inquiry and conversation flow connected",
        "PASS",
        "TC-05: Upload Validation",
        "Unsafe files rejected",
        "MIME type and size checks applied",
    ],
    9: [
        "07  Conclusion and Future Work",
        "Conclusion",
        "RoomRadar successfully provides a complete digital rental workflow for room discovery, listing management, booking, chat and support.",
        "The platform improves transparency through verified listings, reviews, protected booking steps and admin moderation.",
        "The system is structured with reusable frontend components, REST APIs, MongoDB models and real-time communication.",
        "Recent verification shows the client production build and server syntax checks pass successfully.",
        "Future Work",
        "Deploy the complete system on cloud infrastructure with production monitoring.",
        "Integrate real online payment gateway and automated payout settlement.",
        "Develop Android/iOS mobile apps for faster adoption.",
        "Add advanced AI recommendation, multilingual chatbot support and analytics dashboards.",
    ],
    10: [
        "08  References",
        "[1] React Documentation and Vite Documentation: https://react.dev/ | https://vite.dev/",
        "[2] Express.js Documentation: https://expressjs.com/",
        "[3] MongoDB and Mongoose Documentation: https://www.mongodb.com/docs/ | https://mongoosejs.com/docs/",
        "[4] Socket.IO Documentation: https://socket.io/docs/",
        "[5] Cloudinary Documentation: https://cloudinary.com/documentation",
        "[6] OWASP Web Application Security Guidelines: https://owasp.org/",
    ],
    11: [
        "Thank You!",
        "Questions and Discussions Welcome",
        "[Your Name]",
        " | ",
        "[email@example.com]",
        " | ",
        "Roll No: [XXXXXX]",
        "Department of [Branch] | [College Name] | 2026",
    ],
}


TEXT_RE = re.compile(r"(<a:t[^>]*>)(.*?)(</a:t>)", re.DOTALL)


def replace_slide_text(xml: str, replacements: list[str]) -> str:
    index = 0

    def repl(match: re.Match) -> str:
        nonlocal index
        if index < len(replacements):
            value = replacements[index]
        else:
            value = ""
        index += 1
        return f"{match.group(1)}{html.escape(value)}{match.group(3)}"

    updated = TEXT_RE.sub(repl, xml)
    if index < len(replacements):
        raise ValueError(f"Slide has only {index} text nodes, but {len(replacements)} replacements were provided.")
    return updated


def slide_number(path: str) -> int:
    match = re.search(r"slide(\d+)\.xml$", path)
    return int(match.group(1)) if match else 0


def build_presentation() -> Path:
    if not TEMPLATE.exists():
        raise FileNotFoundError(f"Template not found: {TEMPLATE}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp_output = Path(tmp) / OUTPUT.name
        shutil.copyfile(TEMPLATE, tmp_output)

        with zipfile.ZipFile(TEMPLATE, "r") as source, zipfile.ZipFile(tmp_output, "w", zipfile.ZIP_DEFLATED) as target:
            for item in source.infolist():
                data = source.read(item.filename)
                if item.filename.startswith("ppt/slides/slide") and item.filename.endswith(".xml"):
                    number = slide_number(item.filename)
                    if number in SLIDE_TEXT:
                        xml = data.decode("utf-8")
                        data = replace_slide_text(xml, SLIDE_TEXT[number]).encode("utf-8")
                target.writestr(item, data)

        shutil.copyfile(tmp_output, OUTPUT)
    return OUTPUT


if __name__ == "__main__":
    output = build_presentation()
    print(output)
