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
    const languageSelector = document.getElementById('languageSelector');
    const translationProgress = document.getElementById('translationProgress');
    const exportButton = document.getElementById('exportButton');


    // Configuration
    const RISK_CONFIG = {
        high: { order: 1, class: 'risk-high' },
        medium: { order: 2, class: 'risk-medium' },
        low: { order: 3, class: 'risk-low' },
        unknown: { order: 4, class: 'risk-unknown' }
    };

    // Language configuration
    const LANGUAGE_CONFIG = {
        'en': { name: 'English', code: 'en', nativeName: 'English' },
        'hi': { name: 'Hindi', code: 'hi', nativeName: 'हिन्दी' },
        'es': { name: 'Spanish', code: 'es', nativeName: 'Español' },
        'fr': { name: 'French', code: 'fr', nativeName: 'Français' },
        'de': { name: 'German', code: 'de', nativeName: 'Deutsch' },
        'pt': { name: 'Portuguese', code: 'pt', nativeName: 'Português' },
        'it': { name: 'Italian', code: 'it', nativeName: 'Italiano' },
        'ja': { name: 'Japanese', code: 'ja', nativeName: '日本語' },
        'zh': { name: 'Chinese', code: 'zh', nativeName: '中文' },
        'ar': { name: 'Arabic', code: 'ar', nativeName: 'العربية' }
    };

    // UI text elements that need translation
    const UI_TEXT_ELEMENTS = {
        // Header
        'appTitle': 'LegisLens',
        'appTagline': 'Your Legal Document Assistant',
        'headerDescription': 'Upload any legal document and get instant, easy-to-understand analysis of important clauses and potential risks',

        // Upload section
        'uploadTitle': 'Get Started',
        'uploadSubtitle': 'Upload your contract, agreement, or any legal document',
        'uploadBoxTitle': 'Drop your document here',
        'uploadBoxText': 'Supports PDF and Word documents',
        'uploadOr': 'or',
        'browseFiles': 'Choose File',
        'secureFeature': 'Secure & Private',
        'fastFeature': 'Instant Analysis',
        'multiLanguageFeature': 'Multi-Language',

        // Processing
        'analyzingTitle': 'Analyzing Your Document',
        'analyzingText': 'We\'re reading through your document and identifying important clauses...',

        // Translation
        'translatingTitle': 'Translating Content',
        'translatingText': 'We\'re translating the interface and document content...',

        // Results section
        'documentSummaryTitle': 'Document Summary',
        'documentSummarySubtitle': 'Here\'s what we found in your document',
        'clausesHeader': 'Important Clauses',
        'clausesSubtitle': 'Click any clause to see details',
        'riskHigh': 'High Risk',
        'riskMedium': 'Medium Risk',
        'riskLow': 'Low Risk',
        'selectClauseTitle': 'Select a Clause',
        'selectClauseText': 'Choose any clause from the list to see a detailed explanation in plain English',
        'explanationTitle': 'What This Means',
        'originalTextTitle': 'Original Text',

        // Q&A section
        'askQuestionTitle': 'Ask Questions',
        'askQuestionSubtitle': 'Have questions? Ask me!',
        'questionPlaceholder': 'Ask about your document...',
        'welcomeMessage': 'Hi! I\'ve analyzed your document. Feel free to ask me questions like:',
        'suggestion1': 'What are the main risks?',
        'suggestion2': 'Can I cancel this agreement?',
        'suggestion3': 'What are my obligations?',

        // Buttons
        'sendButton': 'Send',
        'exportButton': 'Export PDF'
    };

    let currentDocument = null;
    let currentLanguage = 'en';

    // Initialize the application
    function initApplication() {
        initLanguageSelector();
        loadLanguagePreference();
        setupEventListeners();
    }

    // Initialize language selector
    function initLanguageSelector() {
        languageSelector.innerHTML = '';

        Object.entries(LANGUAGE_CONFIG).forEach(([code, lang]) => {
            const option = document.createElement('option');
            option.value = code;
            option.textContent = `${lang.name} (${lang.nativeName})`;
            languageSelector.appendChild(option);
        });

        languageSelector.addEventListener('change', handleLanguageChange);
    }

    // Set up all event listeners
    function setupEventListeners() {
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

        // Handle asking questions
        sendQuestion.addEventListener('click', handleQuestion);
        questionInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleQuestion();
            }
        });
    }

    // Load saved language preference
    async function loadLanguagePreference() {
        try {
            const response = await fetch('/current_language');
            const data = await response.json();
            if (data.language && LANGUAGE_CONFIG[data.language]) {
                languageSelector.value = data.language;
                currentLanguage = data.language;
                if (currentLanguage !== 'en') {
                    await translatePage(currentLanguage);
                }
            }
        } catch (error) {
            console.error('Error loading language preference:', error);
        }
    }

    // Handle language change
    async function handleLanguageChange() {
        const targetLanguage = languageSelector.value;
        currentLanguage = targetLanguage;
        await translatePage(targetLanguage);
    }

    // Translate the entire page
    async function translatePage(targetLanguage) {
        if (targetLanguage === 'en') {
            // If English, reset to original text
            resetToEnglish();
            return;
        }

        translationProgress.style.display = 'block';

        try {
            // Translate UI elements
            await translateUIElements(targetLanguage);

            // Translate document content if available
            if (currentDocument) {
                await translateDocumentContent(targetLanguage);
            }

        } catch (error) {
            console.error('Translation error:', error);
            alert('Translation failed. Please try again.');
        } finally {
            translationProgress.style.display = 'none';
        }
    }

    // Translate UI elements
    async function translateUIElements(targetLanguage) {
        const textsToTranslate = {};

        // Collect all UI texts
        Object.keys(UI_TEXT_ELEMENTS).forEach(key => {
            textsToTranslate[key] = UI_TEXT_ELEMENTS[key];
        });

        try {
            const response = await fetch('/translate_bulk', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    texts: textsToTranslate,
                    language: targetLanguage
                })
            });

            const data = await response.json();

            if (data.translated_texts) {
                updateUIWithTranslations(data.translated_texts);
            }
        } catch (error) {
            console.error('UI translation error:', error);
        }
    }

    exportButton.addEventListener('click', exportToPDF);
    async function exportToPDF() {
    try {
        const response = await fetch('/export_pdf', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.pdf_data) {
            // Convert base64 to blob
            const byteCharacters = atob(data.pdf_data);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'application/pdf' });

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = data.filename || 'legislens_analysis_report.pdf';
            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            // Show success message
            alert('PDF report downloaded successfully!');
        } else {
            throw new Error('PDF generation failed');
        }
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to generate PDF report. Please try again.');
    }
}

    // Update UI with translated texts
    function updateUIWithTranslations(translations) {
        // Update header
        document.querySelector('header h1').textContent = translations.appTitle || UI_TEXT_ELEMENTS.appTitle;
        document.querySelector('.tagline').textContent = translations.appTagline || UI_TEXT_ELEMENTS.appTagline;
        document.querySelector('.header-description').textContent = translations.headerDescription || UI_TEXT_ELEMENTS.headerDescription;

        // Update upload section
        const uploadTitle = document.querySelector('.upload-header h2');
        if (uploadTitle) uploadTitle.innerHTML = `<i class="fas fa-upload"></i> ${translations.uploadTitle || UI_TEXT_ELEMENTS.uploadTitle}`;

        const uploadSubtitle = document.querySelector('.upload-subtitle');
        if (uploadSubtitle) uploadSubtitle.textContent = translations.uploadSubtitle || UI_TEXT_ELEMENTS.uploadSubtitle;

        const uploadBoxTitle = document.querySelector('.upload-content h3');
        if (uploadBoxTitle) uploadBoxTitle.textContent = translations.uploadBoxTitle || UI_TEXT_ELEMENTS.uploadBoxTitle;

        const uploadBoxText = document.querySelector('.upload-text');
        if (uploadBoxText) uploadBoxText.textContent = translations.uploadBoxText || UI_TEXT_ELEMENTS.uploadBoxText;

        const uploadOr = document.querySelector('.upload-divider span');
        if (uploadOr) uploadOr.textContent = translations.uploadOr || UI_TEXT_ELEMENTS.uploadOr;

        const browseBtn = document.querySelector('.upload-box .btn-primary');
        if (browseBtn) browseBtn.innerHTML = `<i class="fas fa-folder-open"></i> ${translations.browseFiles || UI_TEXT_ELEMENTS.browseFiles}`;

        // Update feature items
        const featureItems = document.querySelectorAll('.feature-item span');
        if (featureItems.length >= 3) {
            featureItems[0].textContent = translations.secureFeature || UI_TEXT_ELEMENTS.secureFeature;
            featureItems[1].textContent = translations.fastFeature || UI_TEXT_ELEMENTS.fastFeature;
            featureItems[2].textContent = translations.multiLanguageFeature || UI_TEXT_ELEMENTS.multiLanguageFeature;
        }

        // Update processing text
        const analyzingTitle = document.querySelector('#uploadProgress .progress-content h3');
        if (analyzingTitle) analyzingTitle.textContent = translations.analyzingTitle || UI_TEXT_ELEMENTS.analyzingTitle;

        const analyzingText = document.querySelector('#uploadProgress .progress-content p');
        if (analyzingText) analyzingText.textContent = translations.analyzingText || UI_TEXT_ELEMENTS.analyzingText;

        // Update translation progress text
        const translatingTitle = document.querySelector('#translationProgress .progress-content h3');
        if (translatingTitle) translatingTitle.textContent = translations.translatingTitle || UI_TEXT_ELEMENTS.translatingTitle;

        const translatingText = document.querySelector('#translationProgress .progress-content p');
        if (translatingText) translatingText.textContent = translations.translatingText || UI_TEXT_ELEMENTS.translatingText;

        // Update results section
        const summaryTitle = document.querySelector('.panel-header h2');
        if (summaryTitle) summaryTitle.innerHTML = `<i class="fas fa-file-alt"></i> ${translations.documentSummaryTitle || UI_TEXT_ELEMENTS.documentSummaryTitle}`;

        const summarySubtitle = document.querySelector('.panel-header p');
        if (summarySubtitle) summarySubtitle.textContent = translations.documentSummarySubtitle || UI_TEXT_ELEMENTS.documentSummarySubtitle;

        const clausesHeader = document.querySelector('.sidebar-header h3');
        if (clausesHeader) clausesHeader.innerHTML = `<i class="fas fa-list-ul"></i> ${translations.clausesHeader || UI_TEXT_ELEMENTS.clausesHeader}`;

        const clausesSubtitle = document.querySelector('.sidebar-subtitle');
        if (clausesSubtitle) clausesSubtitle.textContent = translations.clausesSubtitle || UI_TEXT_ELEMENTS.clausesSubtitle;

        // Update risk legend
        const riskItems = document.querySelectorAll('.legend-item span:last-child');
        if (riskItems.length >= 3) {
            riskItems[0].textContent = translations.riskHigh || UI_TEXT_ELEMENTS.riskHigh;
            riskItems[1].textContent = translations.riskMedium || UI_TEXT_ELEMENTS.riskMedium;
            riskItems[2].textContent = translations.riskLow || UI_TEXT_ELEMENTS.riskLow;
        }

        const noSelectionTitle = document.querySelector('.no-selection h3');
        if (noSelectionTitle) noSelectionTitle.textContent = translations.selectClauseTitle || UI_TEXT_ELEMENTS.selectClauseTitle;

        const noSelectionText = document.querySelector('.no-selection p');
        if (noSelectionText) noSelectionText.textContent = translations.selectClauseText || UI_TEXT_ELEMENTS.selectClauseText;

        const explanationTitle = document.querySelector('.clause-explanation h4');
        if (explanationTitle) explanationTitle.innerHTML = `<i class="fas fa-lightbulb"></i> ${translations.explanationTitle || UI_TEXT_ELEMENTS.explanationTitle}`;

        const originalTextTitle = document.querySelector('.original-text h4');
        if (originalTextTitle) originalTextTitle.innerHTML = `<i class="fas fa-quote-left"></i> ${translations.originalTextTitle || UI_TEXT_ELEMENTS.originalTextTitle}`;

        // Update Q&A section
        const qaHeader = document.querySelector('.qa-header h3');
        if (qaHeader) qaHeader.innerHTML = `<i class="fas fa-comments"></i> ${translations.askQuestionTitle || UI_TEXT_ELEMENTS.askQuestionTitle}`;

        const qaSubtitle = document.querySelector('.qa-header p');
        if (qaSubtitle) qaSubtitle.textContent = translations.askQuestionSubtitle || UI_TEXT_ELEMENTS.askQuestionSubtitle;

        const questionInput = document.getElementById('questionInput');
        if (questionInput) questionInput.placeholder = translations.questionPlaceholder || UI_TEXT_ELEMENTS.questionPlaceholder;

        // Update welcome message
        const welcomeMessage = document.querySelector('.welcome-message .message p');
        if (welcomeMessage) {
            welcomeMessage.textContent = translations.welcomeMessage || UI_TEXT_ELEMENTS.welcomeMessage;
        }

        const suggestionItems = document.querySelectorAll('.suggestion-list li');
        if (suggestionItems.length >= 3) {
            suggestionItems[0].textContent = `"${translations.suggestion1 || UI_TEXT_ELEMENTS.suggestion1}"`;
            suggestionItems[1].textContent = `"${translations.suggestion2 || UI_TEXT_ELEMENTS.suggestion2}"`;
            suggestionItems[2].textContent = `"${translations.suggestion3 || UI_TEXT_ELEMENTS.suggestion3}"`;
        }

        // Update buttons
        const sendButton = document.getElementById('sendQuestion');
        if (sendButton) sendButton.innerHTML = `<i class="fas fa-paper-plane"></i>`;

        if (exportButton) exportButton.innerHTML = `<i class="fas fa-download"></i> ${translations.exportButton || UI_TEXT_ELEMENTS.exportButton}`;
    }

    // Reset to English
    function resetToEnglish() {
        updateUIWithTranslations(UI_TEXT_ELEMENTS);

        // Reset document content if available
        if (currentDocument) {
            displayDocumentSummary(currentDocument.summary);
            displayClauseList(currentDocument.clauses);

            // Update current clause view if one is selected
            const selectedClause = document.querySelector('.clause-item.selected');
            if (selectedClause) {
                const clauseId = selectedClause.dataset.id;
                const clause = currentDocument.clauses.find(c => c.id == clauseId);
                if (clause) {
                    displayClauseDetails(clause);
                }
            }
        }
    }

    // Translate document content
    async function translateDocumentContent(targetLanguage) {
        // Translate document summary
        const translatedSummary = await translateText(currentDocument.summary, targetLanguage);
        displayDocumentSummary(translatedSummary);

        // Translate clauses
        const translatedClauses = await Promise.all(
            currentDocument.clauses.map(async clause => ({
                ...clause,
                title: await translateText(clause.title, targetLanguage),
                summary: await translateText(clause.summary, targetLanguage),
                preview: await translateText(clause.preview || generateContentPreview(clause.content), targetLanguage)
            }))
        );

        displayClauseList(translatedClauses);

        // Update current clause view if one is selected
        const selectedClause = document.querySelector('.clause-item.selected');
        if (selectedClause) {
            const clauseId = selectedClause.dataset.id;
            const translatedClause = translatedClauses.find(c => c.id == clauseId);
            if (translatedClause) {
                displayClauseDetails(translatedClause);
            }
        }
    }

    // Single text translation
    async function translateText(text, targetLanguage) {
        if (!text || targetLanguage === 'en') return text;

        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, language: targetLanguage })
            });

            const data = await response.json();
            return data.translated_text || text;
        } catch (error) {
            console.error('Translation error:', error);
            return text;
        }
    }

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
                exportButton.style.display = 'block';

                currentDocument = data;
                if (currentLanguage === 'en') {
                    displayDocumentSummary(data.summary);
                    displayClauseList(data.clauses);
                } else {
                    // If not English, translate the new content
                    translateDocumentContent(currentLanguage);
                }
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
    async function displayClauseDetails(clauseId) {
        // Find the clause in our current document data
        const clause = currentDocument.clauses.find(c => c.id === clauseId);

        if (!clause) {
            console.error('Clause not found:', clauseId);
            return;
        }

        noClauseSelected.style.display = 'none';
        clauseDetail.style.display = 'block';

        // Translate clause content if not in English
        let displayTitle = clause.title;
        let displaySummary = clause.summary;
        let displayContent = clause.content;

        if (currentLanguage !== 'en') {
            try {
                // Translate title, summary, and content
                [displayTitle, displaySummary, displayContent] = await Promise.all([
                    translateText(clause.title, currentLanguage),
                    translateText(clause.summary, currentLanguage),
                    translateText(clause.content, currentLanguage)
                ]);
            } catch (error) {
                console.error('Error translating clause details:', error);
            }
        }

        clauseTitle.textContent = displayTitle || `Clause ${clause.id + 1}`;
        clauseOriginalText.textContent = displayContent;
        clauseSummary.textContent = displaySummary || 'No summary available.';

        // Update risk badge
        const riskLevel = clause.risk || 'unknown';
        riskBadge.textContent = `Risk: ${riskLevel.toUpperCase()}`;
        riskBadge.className = `risk-badge ${RISK_CONFIG[riskLevel].class}`;
    }

    // Handle asking questions
    async function handleQuestion() {
        const question = questionInput.value.trim();
        if (!question) return;

        // Translate question to English for processing (if needed)
        let processedQuestion = question;
        if (currentLanguage !== 'en') {
            processedQuestion = await translateText(question, 'en');
        }

        // Add user message to chat (in original language)
        addMessage(question, 'user');
        questionInput.value = '';

        // Send question to backend (in English)
        fetch('/ask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question: processedQuestion,
                language: currentLanguage  // Send current language for answer translation
            })
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

    // Initialize the application
    initApplication();
});