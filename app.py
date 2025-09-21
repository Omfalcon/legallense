from flask import Flask, render_template, request, jsonify, session
from flask_cors import CORS
import os
import PyPDF2
import docx
import google.generativeai as genai
from io import BytesIO
import re
from google.cloud import translate_v2 as translate

app = Flask(__name__)
CORS(app)
app.secret_key = os.environ.get('SECRET_KEY') or 'legislens-secret-key'

# Configure Gemini (you'll need to set GEMINI_API_KEY in your environment)
genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

# Initialize translation client
try:
    translate_client = translate.Client()
except Exception as e:
    print(f"Translation client initialization failed: {e}")
    translate_client = None

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


print("GEMINI_API_KEY exists:", bool(os.environ.get('GEMINI_API_KEY')))
print("GOOGLE_APPLICATION_CREDENTIALS exists:", bool(os.environ.get('GOOGLE_APPLICATION_CREDENTIALS')))


def generate_summary(text):
    """Generate a summary of the entire document using Gemini"""
    try:
        # Debug information
        api_key = os.environ.get('GEMINI_API_KEY')
        print(f"GEMINI_API_KEY present: {bool(api_key)}")

        # For demo purposes, use mock data if no API key
        if not api_key:
            demo_msg = "This is a DEMO summary. Please add your GEMINI_API_KEY to get real analysis.\n\n"
            demo_msg += "This rental agreement outlines the terms between John Doe (Tenant) and ABC Properties (Landlord). "
            demo_msg += "Key points include a 12-month lease term, monthly rent of $1500, and a security deposit."
            return demo_msg

        model = genai.GenerativeModel('gemini-2.0-flash')
        prompt = f"""
        Please provide a concise, plain-English summary of this legal document. 
        Focus on the overall purpose, main obligations of each party, and key terms.
        Keep it under 150 words.

        Document text:
        {text[:5000]}  # Reduced length for safety
        """

        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        error_msg = f"Unable to generate summary: {str(e)}"
        print(error_msg)
        return error_msg


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
    """Handle questions about the document with translation support"""
    global document_data

    data = request.json
    question = data.get('question', '')
    target_language = data.get('language', 'en')  # Get target language for answer translation

    if not question:
        return jsonify({"error": "No question provided"}), 400

    if not document_data["full_text"]:
        return jsonify({"error": "No document available for reference"}), 400

    # Answer the question based on the document
    answer = answer_question(question, document_data["full_text"])

    # If a specific language is requested and not English, translate the answer
    if target_language != 'en':
        try:
            # For demo purposes without API key
            if not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') and translate_client is None:
                # Simple word-based translation for demo
                translations = {
                    'hi': {
                        'Based on the document': 'दस्तावेज़ के आधार पर',
                        'termination notice period': 'समाप्ति सूचना अवधि',
                        'payments are due': 'भुगतान देय हैं',
                        'confidential information': 'गोपनीय जानकारी',
                        'liability is limited': 'दायित्व सीमित है',
                        'governing law': 'लागू कानून'
                    },
                    'es': {
                        'Based on the document': 'Según el documento',
                        'termination notice period': 'período de preaviso de terminación',
                        'payments are due': 'los pagos vencen',
                        'confidential information': 'información confidencial',
                        'liability is limited': 'la responsabilidad es limitada',
                        'governing law': 'ley aplicable'
                    },
                    'fr': {
                        'Based on the document': 'Selon le document',
                        'termination notice period': 'délai de préavis de résiliation',
                        'payments are due': 'les paiements sont dus',
                        'confidential information': 'informations confidentielles',
                        'liability is limited': 'la responsabilité est limitée',
                        'governing law': 'droit applicable'
                    }
                }

                # Simple word replacement for demo
                lang_translations = translations.get(target_language, {})
                for eng_phrase, trans_phrase in lang_translations.items():
                    answer = answer.replace(eng_phrase, trans_phrase)
            elif translate_client:
                # Real translation with Google Cloud Translation API
                result = translate_client.translate(answer, target_language=target_language)
                answer = result['translatedText']
        except Exception as e:
            print(f"Answer translation failed: {e}")
            # Continue with English answer if translation fails

    return jsonify({"answer": answer})


@app.route('/translate', methods=['POST'])
def translate_text():
    """Translate text to the target language"""
    data = request.json
    text = data.get('text', '')
    target_language = data.get('language', 'en')

    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        # For demo purposes without API key
        if not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') and translate_client is None:
            # Simple mock translation for demo
            translations = {
                'hi': {
                    'hello': 'नमस्ते',
                    'document': 'दस्तावेज़',
                    'analysis': 'विश्लेषण',
                    'summary': 'सारांश',
                    'risk': 'जोखिम',
                    'clause': 'खंड',
                    'payment': 'भुगतान',
                    'termination': 'समाप्ति',
                    'confidential': 'गोपनीय',
                    'liability': 'दायित्व'
                },
                'es': {
                    'hello': 'hola',
                    'document': 'documento',
                    'analysis': 'análisis',
                    'summary': 'resumen',
                    'risk': 'riesgo',
                    'clause': 'cláusula',
                    'payment': 'pago',
                    'termination': 'terminación',
                    'confidential': 'confidencial',
                    'liability': 'responsabilidad'
                },
                'fr': {
                    'hello': 'bonjour',
                    'document': 'document',
                    'analysis': 'analyse',
                    'summary': 'résumé',
                    'risk': 'risque',
                    'clause': 'clause',
                    'payment': 'paiement',
                    'termination': 'résiliation',
                    'confidential': 'confidentiel',
                    'liability': 'responsabilité'
                }
            }

            # Simple word-based translation for demo
            translated_text = text
            lang_translations = translations.get(target_language, {})
            for eng_word, trans_word in lang_translations.items():
                translated_text = translated_text.replace(eng_word, trans_word)
                translated_text = translated_text.replace(eng_word.capitalize(), trans_word.capitalize())

            return jsonify({"translated_text": translated_text})

        # Real translation with Google Cloud Translation API (without context prefix)
        result = translate_client.translate(text, target_language=target_language)
        return jsonify({"translated_text": result['translatedText']})
    except Exception as e:
        print(f"Translation failed: {e}")
        return jsonify({"translated_text": text})  # Return original text on error


@app.route('/translate_bulk', methods=['POST'])
def translate_bulk():
    """Translate multiple text items to the target language"""
    data = request.json
    texts = data.get('texts', {})
    target_language = data.get('language', 'en')

    if not texts:
        return jsonify({"error": "No texts provided"}), 400

    try:
        # Store language preference in session
        session['current_language'] = target_language

        # For demo purposes without API key
        if not os.environ.get('GOOGLE_APPLICATION_CREDENTIALS') and translate_client is None:
            # Mock translations for demo
            mock_translations = {
                'en': {
                    'documentSummary': 'Document Summary',
                    'clausesHeader': 'Document Clauses',
                    'askQuestion': 'Ask a Question About This Document',
                    'questionPlaceholder': 'Type your question here...',
                    'exportButton': 'Export PDF',
                    'uploadText': 'Drag & drop your PDF or DOCX file here',
                    'browseFiles': 'Browse Files',
                    'processing': 'Processing your document...',
                    'noClauses': 'No clauses detected. Try a different document.',
                    'selectClause': 'Select a clause from the list to see its analysis',
                    'originalText': 'Original Text',
                    'riskLevel': 'Risk Level',
                    'sendButton': 'Send'
                },
                'hi': {
                    'documentSummary': 'दस्तावेज़ सारांश',
                    'clausesHeader': 'दस्तावेज़ खंड',
                    'askQuestion': 'इस दस्तावेज़ के बारे में प्रश्न पूछें',
                    'questionPlaceholder': 'अपना प्रश्न यहाँ टाइप करें...',
                    'exportButton': 'PDF निर्यात करें',
                    'uploadText': 'अपनी PDF या DOCX फ़ाइल यहाँ खींचें और छोड़ें',
                    'browseFiles': 'फ़ाइलें ब्राउज़ करें',
                    'processing': 'आपका दस्तावेज़ प्रसंस्करण किया जा रहा है...',
                    'noClauses': 'कोई खंड नहीं मिला। कृपया कोई अन्य दस्तावेज़ आज़माएं।',
                    'selectClause': 'विश्लेषण देखने के लिए सूची से एक खंड चुनें',
                    'originalText': 'मूल पाठ',
                    'riskLevel': 'जोखिम स्तर',
                    'sendButton': 'भेजें'
                },
                'es': {
                    'documentSummary': 'Resumen del Documento',
                    'clausesHeader': 'Cláusulas del Documento',
                    'askQuestion': 'Hacer una Pregunta Sobre Este Documento',
                    'questionPlaceholder': 'Escribe tu pregunta aquí...',
                    'exportButton': 'Exportar PDF',
                    'uploadText': 'Arrastra y suelta tu archivo PDF o DOCX aquí',
                    'browseFiles': 'Examinar Archivos',
                    'processing': 'Procesando tu documento...',
                    'noClauses': 'No se detectaron cláusulas. Intenta con un documento diferente.',
                    'selectClause': 'Selecciona una cláusula de la lista para ver su análisis',
                    'originalText': 'Texto Original',
                    'riskLevel': 'Nivel de Riesgo',
                    'sendButton': 'Enviar'
                },
                'fr': {
                    'documentSummary': 'Résumé du Document',
                    'clausesHeader': 'Clauses du Document',
                    'askQuestion': 'Poser une Question sur ce Document',
                    'questionPlaceholder': 'Tapez votre question ici...',
                    'exportButton': 'Exporter PDF',
                    'uploadText': 'Glissez-déposez votre fichier PDF or DOCX ici',
                    'browseFiles': 'Parcourir les Fichiers',
                    'processing': 'Traitement de votre document...',
                    'noClauses': 'Aucune clause détectée. Essayez un document différent.',
                    'selectClause': 'Sélectionnez une clause dans la liste pour voir son analyse',
                    'originalText': 'Texte Original',
                    'riskLevel': 'Niveau de Risque',
                    'sendButton': 'Envoyer'
                }
            }

            translated_texts = mock_translations.get(target_language, mock_translations['en'])
            return jsonify({"translated_texts": translated_texts})

        # Real translation with Google Cloud Translation API (without context prefix)
        translated_texts = {}
        for key, text in texts.items():
            if text:  # Only translate non-empty texts
                # Translate without adding context prefix
                result = translate_client.translate(text, target_language=target_language)
                translated_texts[key] = result['translatedText']
            else:
                translated_texts[key] = text

        return jsonify({"translated_texts": translated_texts})
    except Exception as e:
        print(f"Bulk translation failed: {e}")
        return jsonify({"error": f"Bulk translation failed: {str(e)}"}), 500


@app.route('/current_language', methods=['GET'])
def get_current_language():
    return jsonify({"language": session.get('current_language', 'en')})


if __name__ == '__main__':
    # Check if the API key is set
    if not os.environ.get('GEMINI_API_KEY'):
        print("WARNING: GEMINI_API_KEY environment variable is not set!")
        print("The application will use mock data for demonstration.")
    app.run(debug=True)