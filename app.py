from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import os
import PyPDF2
import docx
import google.generativeai as genai
from io import BytesIO
import re

app = Flask(__name__)
CORS(app)

# Configure Gemini (you'll need to set GEMINI_API_KEY in your environment)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Store processed documents in memory (for demo purposes)
document_data = {"clauses": [], "full_text": "", "summary": ""}


def extract_text_from_file(file):
    """Extract text from uploaded PDF or DOCX file"""
    text = ""
    try:
        if file.filename.endswith('.pdf'):
            pdf_reader = PyPDF2.PdfReader(file)
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        elif file.filename.endswith('.docx'):
            doc = docx.Document(file)
            for para in doc.paragraphs:
                text += para.text + "\n"
        else:
            return None
        return text
    except Exception as e:
        print(f"Error extracting text: {str(e)}")
        return None


def extract_title_from_header(header):
    """Extract a clean title from a section header"""
    # Remove excessive whitespace
    header = ' '.join(header.split())

    # Remove common prefixes and clean up
    patterns = [
        r'^(ARTICLE|SECTION|CLAUSE|§|[\dIVX]+\.)\s*',
        r'^\s*[\dIVX]+\s*[-–]\s*',
        r'^\s*\([a-zA-Z]\)\s*'
    ]

    for pattern in patterns:
        header = re.sub(pattern, '', header, flags=re.IGNORECASE)

    # Limit length and ensure it's not empty
    if not header or header.isspace():
        return "Untitled Clause"

    if len(header) > 60:
        return header[:57] + '...'

    return header


def split_into_clauses(text):
    """Improved algorithm to split legal text into clauses with meaningful titles"""
    clauses = []

    # First, try to find sections based on common legal patterns
    patterns = [
        r'(\n\s*(ARTICLE|ARTICLE\s+\d+)[^\n]*\n)',
        r'(\n\s*(SECTION|SECTION\s+[\d\.]+)[^\n]*\n)',
        r'(\n\s*(CLAUSE|CLAUSE\s+[\d\.]+)[^\n]*\n)',
        r'(\n\s*§\s*[\d\.]+[^\n]*\n)',
        r'(\n\s*[\dIVX]+\.\s+[A-Z][^\n]*\n)',
    ]

    # Try each pattern until we find a good split
    for pattern in patterns:
        sections = re.split(pattern, text)
        if len(sections) > 3:  # If we found reasonable splits
            for i in range(1, len(sections), 3):
                if i + 2 < len(sections):
                    clause_header = sections[i].strip()
                    clause_content = sections[i + 2].strip()

                    if len(clause_content) > 50:  # Ensure it's a meaningful clause
                        title = extract_title_from_header(clause_header)
                        preview = clause_content[:150].replace('\n', ' ') + '...' if len(
                            clause_content) > 150 else clause_content

                        clauses.append({
                            "id": len(clauses),
                            "title": title,
                            "content": clause_content,
                            "preview": preview,
                            "summary": "",
                            "risk": "unknown"
                        })
            if clauses:  # If we found clauses with this pattern, break
                break

    # If no sections found with patterns, try a different approach
    if len(clauses) < 2:
        clauses = []  # Reset
        # Split by double newlines and look for potential headings
        sections = re.split(r'\n\s*\n', text)
        for i, section in enumerate(sections):
            section = section.strip()
            if len(section) > 100:
                # Check if the first line looks like a heading
                lines = section.split('\n')
                first_line = lines[0].strip()

                # Heuristic: Heading-like lines are usually short and often in title case or all caps
                is_heading = (len(first_line) < 80 and
                              (first_line.isupper() or
                               (len(first_line.split()) < 8 and first_line.istitle())))

                if is_heading and len(lines) > 1:
                    title = first_line
                    content = '\n'.join(lines[1:])
                else:
                    title = f"Clause {i + 1}"
                    content = section

                preview = content[:150].replace('\n', ' ') + '...' if len(content) > 150 else content

                clauses.append({
                    "id": i,
                    "title": title,
                    "content": content,
                    "preview": preview,
                    "summary": "",
                    "risk": "unknown"
                })

    return clauses


def generate_summary(text):
    """Generate a summary of the entire document using Gemini"""
    try:
        # For demo purposes, use mock data if no API key
        if not os.environ.get('GEMINI_API_KEY'):
            return "This rental agreement outlines the terms between John Doe (Tenant) and ABC Properties (Landlord) for the property at 123 Main St. Key points include a 12-month lease term, monthly rent of $1500, and a security deposit of one month's rent."

        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Please provide a concise, plain-English summary of this legal document. 
        Focus on the overall purpose, main obligations of each party, and key terms.
        Keep it under 150 words.

        Document text:
        {text[:10000]}  # Limit text length for the prompt
        """

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"Unable to generate summary: {str(e)}"


def analyze_clause(clause_text):
    """Analyze a clause and return summary and risk assessment"""
    try:
        # For demo purposes, use mock data if no API key
        if not os.environ.get('GEMINI_API_KEY'):
            summaries = [
                "This clause outlines the payment terms and schedule.",
                "This section describes the termination conditions for the agreement.",
                "This clause specifies the confidentiality obligations of both parties.",
                "This section covers the intellectual property rights and ownership.",
                "This clause outlines the limitations of liability for both parties."
            ]

            risks = ["low", "medium", "high"]

            # Return a random summary and risk for demo
            import random
            return random.choice(summaries), random.choice(risks)

        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        You are a legal expert explaining complex documents to everyday people.

        Please analyze this legal clause and provide:
        1. A very simple 1-2 sentence plain English summary.
        2. A risk assessment: "low", "medium", or "high". 
           Consider it "high" if it contains unusual terms, heavily favors one party, 
           or removes standard protections.

        Clause: {clause_text[:2000]}  # Limit text length

        Respond in this exact format:
        SUMMARY: [your summary here]
        RISK: [low/medium/high]
        """

        response = model.generate_content(prompt)
        response_text = response.text

        # Parse the response
        summary = ""
        risk_level = "unknown"

        if "SUMMARY:" in response_text and "RISK:" in response_text:
            parts = response_text.split("RISK:")
            summary_part = parts[0].replace("SUMMARY:", "").strip()
            risk_part = parts[1].strip().lower()

            summary = summary_part
            if "low" in risk_part:
                risk_level = "low"
            elif "medium" in risk_part:
                risk_level = "medium"
            elif "high" in risk_part:
                risk_level = "high"

        return summary, risk_level

    except Exception as e:
        return f"Analysis failed: {str(e)}", "unknown"


def answer_question(question, context):
    """Answer a question about the document"""
    try:
        # For demo purposes, use mock data if no API key
        if not os.environ.get('GEMINI_API_KEY'):
            answers = [
                "Based on the document, the termination notice period is 30 days.",
                "The document specifies that payments are due within 15 days of invoice.",
                "According to section 4.2, confidential information must be protected for 3 years after termination.",
                "The liability is limited to the amount paid under this agreement.",
                "The governing law specified in the document is the state of California."
            ]

            import random
            return random.choice(answers)

        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Based on the following legal document, please answer the user's question.
        Provide a clear, concise response in plain English.
        If the answer cannot be found in the document, say so.

        Legal document:
        {context[:8000]}

        User's question: {question}

        Answer:
        """

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"I'm sorry, I couldn't process your question: {str(e)}"


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/upload', methods=['POST'])
def upload_file():
    """Handle file upload and processing"""
    global document_data

    if 'file' not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400

    # Extract text from the file
    text = extract_text_from_file(file)
    if text is None:
        return jsonify({"error": "Failed to extract text from file"}), 400

    # Store the full text
    document_data["full_text"] = text

    # Generate overall summary
    document_data["summary"] = generate_summary(text)

    # Split into clauses
    clauses = split_into_clauses(text)

    # Analyze all clauses immediately
    analyzed_clauses = []
    for clause in clauses:
        summary, risk = analyze_clause(clause["content"])
        clause["summary"] = summary
        clause["risk"] = risk
        analyzed_clauses.append(clause)

    document_data["clauses"] = analyzed_clauses

    return jsonify({
        "message": "File uploaded successfully",
        "summary": document_data["summary"],
        "clauses": analyzed_clauses
    })

@app.route('/analyze_clause/<int:clause_id>', methods=['GET'])
def analyze_clause_route(clause_id):
    """Analyze a specific clause"""
    global document_data

    if clause_id < 0 or clause_id >= len(document_data["clauses"]):
        return jsonify({"error": "Invalid clause ID"}), 404

    clause = document_data["clauses"][clause_id]

    # If we haven't analyzed this clause yet, do it now
    if not clause.get("summary") or clause.get("risk") == "unknown":
        summary, risk = analyze_clause(clause["content"])
        clause["summary"] = summary
        clause["risk"] = risk
        document_data["clauses"][clause_id] = clause

    return jsonify(clause)


@app.route('/ask', methods=['POST'])
def ask_question():
    """Handle questions about the document"""
    global document_data

    data = request.json
    question = data.get('question', '')

    if not question:
        return jsonify({"error": "No question provided"}), 400

    if not document_data["full_text"]:
        return jsonify({"error": "No document available for reference"}), 400

    # Answer the question based on the document
    answer = answer_question(question, document_data["full_text"])

    return jsonify({"answer": answer})


if __name__ == '__main__':
    # Check if the API key is set
    if not os.environ.get('GEMINI_API_KEY'):
        print("WARNING: GEMINI_API_KEY environment variable is not set!")
        print("The application will use mock data for demonstration.")

    app.run(debug=True)