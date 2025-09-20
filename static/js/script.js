document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');
    const uploadProgress = document.getElementById('uploadProgress');
    const resultsSection = document.getElementById('resultsSection');
    const documentSummary = document.getElementById('documentSummary');
    const clauseList = document.getElementById('clauseList');
    const noClauseSelected = document.getElementById('noClauseSelected');
    const clauseDetail = document.getElementById('clauseDetail');
    const clauseTitle = document.getElementById('clauseTitle');
    const riskBadge = document.getElementById('riskBadge');
    const clauseSummary = document.getElementById('clauseSummary');
    const clauseOriginalText = document.getElementById('clauseOriginalText');
    const chatMessages = document.getElementById('chatMessages');
    const questionInput = document.getElementById('questionInput');
    const sendQuestion = document.getElementById('sendQuestion');

    // Configuration
    const RISK_CONFIG = {
        high: { order: 1, class: 'risk-high' },
        medium: { order: 2, class: 'risk-medium' },
        low: { order: 3, class: 'risk-low' },
        unknown: { order: 4, class: 'risk-unknown' }
    };

    let currentDocument = null;

    // Drag and drop functionality
    uploadBox.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadBox.style.backgroundColor = 'rgba(52, 152, 219, 0.1)';
    });

    uploadBox.addEventListener('dragleave', function() {
        uploadBox.style.backgroundColor = '';
    });

    uploadBox.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadBox.style.backgroundColor = '';

        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', function() {
        if (fileInput.files.length) {
            handleFileUpload(fileInput.files[0]);
        }
    });

    // Handle file upload
    function handleFileUpload(file) {
        if (!file.type.includes('pdf') && !file.type.includes('word')) {
            alert('Please upload a PDF or DOCX file');
            return;
        }

        uploadProgress.style.display = 'block';
        const progressBar = uploadProgress.querySelector('.progress');

        // Simulate progress for demo purposes
        let width = 0;
        const interval = setInterval(() => {
            if (width >= 100) {
                clearInterval(interval);
            } else {
                width += 5;
                progressBar.style.width = width + '%';
            }
        }, 100);

        const formData = new FormData();
        formData.append('file', file);

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            clearInterval(interval);
            progressBar.style.width = '100%';

            setTimeout(() => {
                uploadProgress.style.display = 'none';
                resultsSection.style.display = 'block';

                currentDocument = data;
                displayDocumentSummary(data.summary);
                displayClauseList(data.clauses);
            }, 500);
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error uploading file');
            uploadProgress.style.display = 'none';
        });
    }

    // Display document summary
    function displayDocumentSummary(summary) {
        documentSummary.textContent = summary;
    }

    // Display list of clauses with immediate risk assessment
    function displayClauseList(clauses) {
        clauseList.innerHTML = '';

        if (clauses.length === 0) {
            clauseList.innerHTML = '<div class="no-clauses">No clauses detected. Try a different document.</div>';
            return;
        }

        // Sort clauses by risk level (high to low)
        const sortedClauses = sortClausesByRisk(clauses);

        sortedClauses.forEach(clause => {
            const clauseItem = createClauseElement(clause);
            clauseList.appendChild(clauseItem);
        });
    }

    // Create DOM element for a clause
    function createClauseElement(clause) {
        const clauseItem = document.createElement('div');
        const riskLevel = clause.risk || 'unknown';

        clauseItem.className = `clause-item ${RISK_CONFIG[riskLevel].class}`;
        clauseItem.dataset.id = clause.id;

        // Create HTML structure for the clause item
        clauseItem.innerHTML = `
            <div class="clause-header">
                <div class="clause-title">
                    <span class="risk-indicator"></span>
                    ${clause.title || `Clause ${clause.id + 1}`}
                </div>
                <div class="risk-label risk-label-${riskLevel}">
                    ${riskLevel.toUpperCase()}
                </div>
            </div>
            <div class="clause-preview">
                ${clause.preview || generateContentPreview(clause.content) || 'Click to view details...'}
            </div>
        `;

        clauseItem.addEventListener('click', () => handleClauseSelection(clause.id));
        return clauseItem;
    }

    // Sort clauses by risk level (high to low)
    function sortClausesByRisk(clauses) {
        return [...clauses].sort((a, b) => {
            const aRisk = a.risk || 'unknown';
            const bRisk = b.risk || 'unknown';
            return RISK_CONFIG[aRisk].order - RISK_CONFIG[bRisk].order;
        });
    }

    // Generate preview text from content
    function generateContentPreview(content) {
        if (!content) return '';

        const cleanContent = content.replace(/\s+/g, ' ').trim();
        const sentences = cleanContent.split('.');
        const firstMeaningfulSentence = sentences.find(s => s.length > 20) || sentences[0];

        if (firstMeaningfulSentence.length > 100) {
            return firstMeaningfulSentence.substring(0, 97) + '...';
        }

        return firstMeaningfulSentence + (cleanContent.length > firstMeaningfulSentence.length ? '...' : '');
    }

    // Handle clause selection
    function handleClauseSelection(clauseId) {
        // Remove selection from all clauses
        document.querySelectorAll('.clause-item').forEach(item => {
            item.classList.remove('selected');
        });

        // Add selection to clicked clause
        const selectedClause = document.querySelector(`.clause-item[data-id="${clauseId}"]`);
        if (selectedClause) {
            selectedClause.classList.add('selected');
        }

        // Display clause details
        displayClauseDetails(clauseId);
    }

    // Display detailed clause view
    function displayClauseDetails(clauseId) {
        // Find the clause in our current document data
        const clause = currentDocument.clauses.find(c => c.id === clauseId);

        if (!clause) {
            console.error('Clause not found:', clauseId);
            return;
        }

        noClauseSelected.style.display = 'none';
        clauseDetail.style.display = 'block';

        clauseTitle.textContent = clause.title || `Clause ${clause.id + 1}`;
        clauseOriginalText.textContent = clause.content;
        clauseSummary.textContent = clause.summary || 'No summary available.';

        // Update risk badge
        const riskLevel = clause.risk || 'unknown';
        riskBadge.textContent = `Risk: ${riskLevel.toUpperCase()}`;
        riskBadge.className = `risk-badge ${RISK_CONFIG[riskLevel].class}`;
    }

    // Handle asking questions
    sendQuestion.addEventListener('click', handleQuestion);
    questionInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleQuestion();
        }
    });

    function handleQuestion() {
        const question = questionInput.value.trim();
        if (!question) return;

        // Add user message to chat
        addMessage(question, 'user');
        questionInput.value = '';

        // Send question to backend
        fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ question: question })
        })
        .then(response => response.json())
        .then(data => {
            addMessage(data.answer, 'bot');
        })
        .catch(error => {
            console.error('Error:', error);
            addMessage('Sorry, I encountered an error processing your question.', 'bot');
        });
    }

    function addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.textContent = text;

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
});