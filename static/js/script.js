document.addEventListener('DOMContentLoaded', function() {
    // Firebase Configuration
    const firebaseConfig = {
  apiKey: "AIzaSyBYIfdDCxV2YuHV6GFmSMnvBAl6CYuqcME",
  authDomain: "legislens-42c42.firebaseapp.com",
  projectId: "legislens-42c42",
  storageBucket: "legislens-42c42.firebasestorage.app",
  messagingSenderId: "261250399906",
  appId: "1:261250399906:web:b31f8446ce18762f9f21fb",
  measurementId: "G-R46XFV7W7N"
};

    // Initialize Firebase
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    const auth = firebase.auth();
    const db = firebase.firestore();
    
    // Initialize Google Auth Provider
    const googleProvider = new firebase.auth.GoogleAuthProvider();
    googleProvider.addScope('email');
    googleProvider.addScope('profile');

    // DOM Elements
    const uploadBox = document.getElementById('uploadBox');
    const fileInput = document.getElementById('fileInput');
    const uploadProgress = document.getElementById('uploadProgress');
    const resultsSection = document.getElementById('resultsSection');
    const historySection = document.getElementById('historySection');
    const historyContent = document.getElementById('historyContent');
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

    // Auth Elements
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const userEmail = document.getElementById('userEmail');
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const authModal = document.getElementById('authModal');
    const authForm = document.getElementById('authForm');
    const authTitle = document.getElementById('authTitle');
    const authSubmit = document.getElementById('authSubmit');
    const authSwitchText = document.getElementById('authSwitchText');
    const authSwitchBtn = document.getElementById('authSwitchBtn');
    const closeAuth = document.getElementById('closeAuth');
    const authEmail = document.getElementById('authEmail');
    const authPassword = document.getElementById('authPassword');


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
    let currentUser = null;
    let isSignUp = true;

    // Initialize the application
    function initApplication() {
        initLanguageSelector();
        loadLanguagePreference();
        setupEventListeners();
        setupAuthListeners();
        checkAuthState();
    }

    // Auth State Management
    function checkAuthState() {
        auth.onAuthStateChanged((user) => {
            currentUser = user;
            if (user) {
                showUserMenu(user);
                loadUserHistory();
            } else {
                showAuthButtons();
                hideUserData();
            }
        });
    }

    function showUserMenu(user) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        userEmail.textContent = user.displayName || user.email;
    }

    function showAuthButtons() {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
    }

    function hideUserData() {
        const mainContent = document.getElementById('mainContent');
        if (mainContent) mainContent.style.display = 'none';
        uploadProgress.style.display = 'none';
        exportButton.style.display = 'none';
    }

    // Auth Event Listeners
    function setupAuthListeners() {
        googleSignInBtn.addEventListener('click', signInWithGoogle);
        signInBtn.addEventListener('click', () => openAuthModal(false));
        signUpBtn.addEventListener('click', () => openAuthModal(true));
        signOutBtn.addEventListener('click', signOut);
        closeAuth.addEventListener('click', closeAuthModal);
        authSwitchBtn.addEventListener('click', toggleAuthMode);
        authForm.addEventListener('submit', handleAuthSubmit);
    }

    // Google Sign In
    async function signInWithGoogle() {
        try {
            const result = await auth.signInWithPopup(googleProvider);
            const user = result.user;
            console.log('Google sign in successful:', user);
            closeAuthModal();
        } catch (error) {
            console.error('Google sign in error:', error);
            alert('Google sign in failed: ' + error.message);
        }
    }

    function openAuthModal(isSignUpMode) {
        isSignUp = isSignUpMode;
        authModal.style.display = 'flex';
        authTitle.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        authSubmit.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        authSwitchText.textContent = isSignUp ? 'Already have an account?' : "Don't have an account?";
        authSwitchBtn.textContent = isSignUp ? 'Sign In' : 'Sign Up';
        authForm.reset();
    }

    function closeAuthModal() {
        authModal.style.display = 'none';
    }

    function toggleAuthMode() {
        isSignUp = !isSignUp;
        openAuthModal(isSignUp);
    }

    async function handleAuthSubmit(e) {
        e.preventDefault();
        const email = authEmail.value;
        const password = authPassword.value;

        try {
            if (isSignUp) {
                await auth.createUserWithEmailAndPassword(email, password);
            } else {
                await auth.signInWithEmailAndPassword(email, password);
            }
            closeAuthModal();
        } catch (error) {
            alert(error.message);
        }
    }

    async function signOut() {
        try {
            await auth.signOut();
        } catch (error) {
            alert(error.message);
        }
    }

    // Firestore Functions
    async function saveDocumentToFirestore(documentData) {
        if (!currentUser) return;

        try {
            const docRef = await db.collection('users').doc(currentUser.uid).collection('documents').add({
                ...documentData,
                uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
                userId: currentUser.uid
            });
            return docRef.id;
        } catch (error) {
            console.error('Error saving document:', error);
        }
    }

    async function saveChatMessage(documentId, question, answer) {
        if (!currentUser) return;

        try {
            await db.collection('users').doc(currentUser.uid).collection('documents').doc(documentId).collection('chats').add({
                question,
                answer,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (error) {
            console.error('Error saving chat message:', error);
        }
    }

    async function loadUserHistory() {
        if (!currentUser) return;

        try {
            const snapshot = await db.collection('users').doc(currentUser.uid).collection('documents')
                .orderBy('uploadedAt', 'desc')
                .get();

            if (snapshot.empty) {
                historyContent.innerHTML = '<p style="text-align: center; color: var(--medium-gray); padding: var(--spacing-lg);">No documents yet. Upload your first document to get started!</p>';
                return;
            }

            historyContent.innerHTML = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const historyItem = createHistoryItem(doc.id, data);
                historyContent.appendChild(historyItem);
            });

            const mainContent = document.getElementById('mainContent');
            if (mainContent) mainContent.style.display = 'grid';
        } catch (error) {
            console.error('Error loading history:', error);
        }
    }

    function createHistoryItem(docId, data) {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.dataset.docId = docId;

        const uploadDate = data.uploadedAt ? data.uploadedAt.toDate().toLocaleDateString() : 'Unknown';
        const clauseCount = data.clauses ? data.clauses.length : 0;

        item.innerHTML = `
            <div class="history-item-header">
                <h3 class="history-item-title">${data.fileName || 'Document'}</h3>
                <span class="history-item-date">${uploadDate}</span>
            </div>
            <p class="history-item-summary">${data.summary ? data.summary.substring(0, 150) + '...' : 'No summary available'}</p>
            <div class="history-item-stats">
                <div class="history-stat">
                    <i class="fas fa-list"></i>
                    <span>${clauseCount} clauses</span>
                </div>
                <div class="history-stat">
                    <i class="fas fa-comments"></i>
                    <span>Chat available</span>
                </div>
            </div>
        `;

        item.addEventListener('click', () => loadDocumentFromHistory(docId, data));
        return item;
    }

    async function loadDocumentFromHistory(docId, data) {
        currentDocument = { ...data, id: docId };
        displayDocumentSummary(data.summary);
        displayClauseList(data.clauses);
        const mainContent = document.getElementById('mainContent');
        if (mainContent) mainContent.style.display = 'grid';
        exportButton.style.display = 'block';
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
    async function handleFileUpload(file) {
        if (!currentUser) {
            alert('Please sign in to upload documents');
            return;
        }

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

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            clearInterval(interval);
            progressBar.style.width = '100%';

            // Save to Firestore
            const documentData = {
                ...data,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
            };
            const docId = await saveDocumentToFirestore(documentData);

            setTimeout(() => {
                uploadProgress.style.display = 'none';
                const mainContent = document.getElementById('mainContent');
                if (mainContent) mainContent.style.display = 'grid';
                exportButton.style.display = 'block';

                currentDocument = { ...data, id: docId };
                if (currentLanguage === 'en') {
                    displayDocumentSummary(data.summary);
                    displayClauseList(data.clauses);
                } else {
                    // If not English, translate the new content
                    translateDocumentContent(currentLanguage);
                }
                
                // Reload history to show new document
                loadUserHistory();
            }, 500);
        } catch (error) {
            console.error('Error:', error);
            alert('Error uploading file');
            uploadProgress.style.display = 'none';
        }
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

        if (!currentUser) {
            alert('Please sign in to ask questions');
            return;
        }

        // Translate question to English for processing (if needed)
        let processedQuestion = question;
        if (currentLanguage !== 'en') {
            processedQuestion = await translateText(question, 'en');
        }

        // Add user message to chat (in original language)
        addMessage(question, 'user');
        questionInput.value = '';

        try {
            // Send question to backend (in English)
            const response = await fetch('/ask', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: processedQuestion,
                    language: currentLanguage  // Send current language for answer translation
                })
            });
            const data = await response.json();
            
            addMessage(data.answer, 'bot');
            
            // Save chat message to Firestore
            if (currentDocument && currentDocument.id) {
                await saveChatMessage(currentDocument.id, question, data.answer);
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('Sorry, I encountered an error processing your question.', 'bot');
        }
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