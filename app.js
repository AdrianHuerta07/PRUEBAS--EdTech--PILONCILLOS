// ==========================================================================
// 1. CONFIGURACIÓN E IMPORTACIÓN DE FIREBASE (Módulos Web Oficiales)
// ==========================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    signOut, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDUDb2K_2NjX7sW5xfi51wtOSHKg_oI6Rw",
  authDomain: "flashcards-81501.firebaseapp.com",
  projectId: "flashcards-81501",
  storageBucket: "flashcards-81501.firebasestorage.app",
  messagingSenderId: "327444607564",
  appId: "1:327444607564:web:c9c55dbe994d69a4b03ae9",
  measurementId: "G-N0ZTSLN8NQ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ==========================================================================
// 2. REFERENCIAS AL DOM
// ==========================================================================
const loginScreen  = document.getElementById('login-screen');
const googleLoginBtn = document.getElementById('google-login-btn');
const loginError   = document.getElementById('login-error');
const errorText    = document.getElementById('error-text');
const logoutBtn    = document.getElementById('logout-btn');

// Vistas
const studyView    = document.getElementById('study-view');
const quizView     = document.getElementById('quiz-view');
const resultsView  = document.getElementById('results-view');

// Inputs y Generación
const dataInput    = document.getElementById('data-input');
const loadCardsBtn = document.getElementById('load-cards-btn');
const cardsGrid    = document.getElementById('cards-grid');
const cardCounter  = document.getElementById('card-counter');

// Quiz / Práctica
const goQuizBtn        = document.getElementById('go-quiz-btn');
const practiceQuestion = document.getElementById('practice-question');
const mcGrid           = document.getElementById('mc-grid');
const quizFeedback     = document.getElementById('quiz-feedback');
const quizProgress     = document.getElementById('quiz-progress');
const quizNextBtn      = document.getElementById('quiz-next-btn');
const quizSkipBtn      = document.getElementById('quiz-skip-btn');

// Resultados
const scorePercent = document.getElementById('score-percent');
const ringFill     = document.getElementById('ring-fill');
const statCorrect  = document.getElementById('stat-correct');
const statWrong    = document.getElementById('stat-wrong');
const statSkipped  = document.getElementById('stat-skipped');
const historyList  = document.getElementById('history-list');
const restartBtn   = document.getElementById('restart-btn');

// ==========================================================================
// 3. MÓDULO DE ACCESIBILIDAD POR VOZ (Tu Web Speech API Original)
// ==========================================================================
const VoiceA11y = (() => {
    const synth = window.speechSynthesis || null;[cite: 3]
    let voices = [];[cite: 3]
    let selectedVoiceURI = null;[cite: 3]
    let rate = 0.95;[cite: 3]
    let masterEnabled = false;[cite: 3]
    let currentSpeakingEl = null;[cite: 3]
    let keepAliveTimer = null;[cite: 3]
    let voicesReadyResolvers = [];[cite: 3]

    function loadVoices() {
        if (!synth) return;[cite: 3]
        voices = synth.getVoices().filter(v => v.lang.startsWith('es') || v.lang.startsWith('en'));[cite: 3]
        if (voices.length === 0) voices = synth.getVoices();[cite: 3]

        const select = document.getElementById('voice-select');[cite: 3]
        if (!select) return;[cite: 3]
        select.innerHTML = '';[cite: 3]
        voices.forEach(v => {
            const opt = document.createElement('option');[cite: 3]
            opt.value = v.voiceURI;[cite: 3]
            opt.textContent = `${v.name} (${v.lang})`;[cite: 3]
            select.appendChild(opt);[cite: 3]
        });

        const preferred = voices.find(v => v.lang.startsWith('es'));[cite: 3]
        if (preferred && !selectedVoiceURI) {
            selectedVoiceURI = preferred.voiceURI;[cite: 3]
            select.value = preferred.voiceURI;[cite: 3]
        }

        if (voices.length > 0 && voicesReadyResolvers.length > 0) {
            voicesReadyResolvers.forEach(r => r());[cite: 3]
            voicesReadyResolvers = [];[cite: 3]
        }
    }

    function waitForVoices(timeoutMs = 2500) {
        return new Promise((resolve) => {
            if (!synth) return resolve();[cite: 3]
            if (voices.length > 0) return resolve();[cite: 3]
            voicesReadyResolvers.push(resolve);[cite: 3]
            setTimeout(resolve, timeoutMs);[cite: 3]
        });
    }

    if (synth) {
        loadVoices();[cite: 3]
        synth.onvoiceschanged = loadVoices;[cite: 3]
    }

    function getVoice() {
        return voices.find(v => v.voiceURI === selectedVoiceURI) || null;[cite: 3]
    }

    function clearSpeakingClass() {
        if (currentSpeakingEl) {
            currentSpeakingEl.classList.remove('speaking');[cite: 3]
            currentSpeakingEl = null;[cite: 3]
        }
    }

    function startKeepAlive() {
        stopKeepAlive();[cite: 3]
        keepAliveTimer = setInterval(() => {
            if (synth && synth.speaking && !synth.paused) {
                synth.pause();[cite: 3]
                synth.resume();[cite: 3]
            }
        }, 9000);[cite: 3]
    }

    function stopKeepAlive() {
        if (keepAliveTimer) {
            clearInterval(keepAliveTimer);[cite: 3]
            keepAliveTimer = null;[cite: 3]
        }
    }

    async function speak(text, el) {
        if (!synth || !text) return;[cite: 3]
        await waitForVoices();[cite: 3]
        synth.cancel();[cite: 3]
        clearSpeakingClass();[cite: 3]
        stopKeepAlive();[cite: 3]

        setTimeout(() => {
            const utter = new SpeechSynthesisUtterance(text);[cite: 3]
            utter.rate = rate;[cite: 3]
            utter.lang = 'es-ES';[cite: 3]
            const v = getVoice() || voices[0] || null;[cite: 3]
            if (v) utter.voice = v;[cite: 3]

            if (el) {
                el.classList.add('speaking');[cite: 3]
                currentSpeakingEl = el;[cite: 3]
            }
            updateMasterUI(true);[cite: 3]

            utter.onstart = () => startKeepAlive();[cite: 3]
            utter.onend = () => {
                stopKeepAlive();[cite: 3]
                clearSpeakingClass();[cite: 3]
                updateMasterUI(false);[cite: 3]
            };
            utter.onerror = (e) => {
                if (e.error === 'interrupted' || e.error === 'canceled') return;[cite: 3]
                stopKeepAlive();[cite: 3]
                clearSpeakingClass();[cite: 3]
                updateMasterUI(false);[cite: 3]
            };
            synth.speak(utter);[cite: 3]
        }, 60);
    }

    function stop() {
        stopKeepAlive();[cite: 3]
        if (synth) synth.cancel();[cite: 3]
        clearSpeakingClass();[cite: 3]
        updateMasterUI(false);[cite: 3]
    }

    function updateMasterUI(isSpeaking) {
        const masterBtn = document.getElementById('voice-master-btn');
        if (masterBtn) masterBtn.classList.toggle('speaking', isSpeaking);[cite: 3]
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;[cite: 3]

    return {
        speak, stop, 
        autoSpeak: (text, el) => { if (masterEnabled) speak(text, el); },[cite: 3]
        setMasterEnabled: (val) => { masterEnabled = val; },[cite: 3]
        isMasterEnabled: () => masterEnabled,[cite: 3]
        isSupported: () => !!synth,[cite: 3]
        recognitionSupported: () => !!SpeechRecognitionCtor,[cite: 3]
        setRate: (r) => { rate = r; },[cite: 3]
        setVoiceURI: (uri) => { selectedVoiceURI = uri; },[cite: 3]
        createRecognizer: (onResult, onEnd, onError) => {
            if (!SpeechRecognitionCtor) return null;[cite: 3]
            const rec = new SpeechRecognitionCtor();[cite: 3]
            rec.lang = 'es-ES';[cite: 3]
            rec.continuous = true;[cite: 3]
            rec.interimResults = false;[cite: 3]
            rec.onresult = (e) => {
                let finalText = '';[cite: 3]
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    if (e.results[i].isFinal) finalText += e.results[i][0].transcript;[cite: 3]
                }
                if (finalText) onResult(finalText.trim());[cite: 3]
            };
            rec.onend = () => { if (onEnd) onEnd(); };[cite: 3]
            rec.onerror = (e) => {
                let reason = 'unknown';[cite: 3]
                if (e.error === 'not-allowed' || e.error === 'permission-denied') reason = 'permission';[cite: 3]
                else if (e.error === 'no-speech') reason = 'no-speech';[cite: 3]
                else if (e.error === 'network') reason = 'network';[cite: 3]
                else if (e.error === 'audio-capture') reason = 'no-mic';[cite: 3]
                if (onError) onError(e, reason);[cite: 3]
            };
            return rec;
        }
    };
})();

// ==========================================================================
// 4. CONTROLADORES DE ENTRADAS Y PANELES DE ACCESIBILIDAD
// ==========================================================================
(() => {
    const voiceMasterBtn = document.getElementById('voice-master-btn');
    const toggleVoicePanel = document.getElementById('toggle-voice-panel');
    const voicePanel = document.getElementById('voice-panel');
    const rateInput = document.getElementById('voice-rate');
    const rateVal = document.getElementById('voice-rate-val');
    const voiceSelect = document.getElementById('voice-select');

    if (voiceMasterBtn) {
        voiceMasterBtn.addEventListener('click', () => {
            const next = !VoiceA11y.isMasterEnabled();
            VoiceA11y.setMasterEnabled(next);
            voiceMasterBtn.innerHTML = next ? '<i class="fas fa-pause"></i> Desactivar Voz' : '<i class="fas fa-play"></i> Probar Voz';
            if (!next) VoiceA11y.stop();
        });
    }

    if (toggleVoicePanel) {
        toggleVoicePanel.addEventListener('click', () => {
            voicePanel.classList.toggle('hidden');
        });
    }

    if (rateInput) {
        rateInput.addEventListener('input', () => {
            const r = parseFloat(rateInput.value);
            VoiceA11y.setRate(r);
            rateVal.textContent = `${r.toFixed(1)}x`;
        });
    }

    if (voiceSelect) {
        voiceSelect.addEventListener('change', () => {
            VoiceA11y.setVoiceURI(voiceSelect.value);
        });
    }
})();

// Dictado por voz
(() => {
    const dictateBtn = document.getElementById('dictate-btn');
    if (!dictateBtn || !dataInput) return;

    if (!VoiceA11y.recognitionSupported() || !window.isSecureContext) {
        dictateBtn.classList.add('unsupported');[cite: 3]
        return;
    }

    let recognizer = null;
    let isRecording = false;

    dictateBtn.addEventListener('click', () => {
        if (isRecording) {
            recognizer && recognizer.stop();[cite: 3]
            return;
        }

        recognizer = VoiceA11y.createRecognizer(
            (text) => {
                const current = dataInput.value;
                dataInput.value = current ? `${current} ${text}` : text;
            },
            () => {
                isRecording = false;
                dictateBtn.classList.remove('recording');[cite: 3]
            },
            () => {
                isRecording = false;
                dictateBtn.classList.remove('recording');[cite: 3]
            }
        );

        if (!recognizer) return;
        isRecording = true;
        dictateBtn.classList.add('recording');[cite: 3]
        recognizer.start();[cite: 3]
    });
})();

// ==========================================================================
// 5. FLUJO DE AUTENTICACIÓN CON FIREBASE GOOGLE AUTH
// ==========================================================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        loginScreen.classList.add('hidden');
        loginError.classList.add('hidden');
    } else {
        loginScreen.classList.remove('hidden');
        resetApp();
    }
});

googleLoginBtn.addEventListener('click', async () => {
    try {
        loginError.classList.add('hidden');
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error(error);
        errorText.textContent = "Error de conexión con Google.";
        loginError.classList.remove('hidden');
    }
});

logoutBtn.addEventListener('click', async () => {
    await signOut(auth);
});

// ==========================================================================
// 6. LOGICA DINÁMICA DE LA APLICACIÓN (Flashcards + Quiz)
// ==========================================================================
let allCards = [];
let poolPracticeCards = [];
let currentCard = null;
let quizIndex = 0;
let stats = { correct: 0, wrong: 0, skipped: 0 };
let practiceHistory = [];

loadCardsBtn.addEventListener('click', () => {
    const raw = dataInput.value.trim();
    if (!raw) return alert("Ingresa un JSON estructurado.");

    try {
        allCards = JSON.parse(raw);
        if (!Array.isArray(allCards)) throw new Error();

        renderFlashcards();
        switchView(studyView);
    } catch (e) {
        // Alerta SweetAlert personalizada con tus estilos Piloncillos
        Swal.fire({
            icon: 'error',
            title: 'Formato Incorrecto',
            text: 'Asegúrate de estructurar el JSON como un arreglo válido: [{"q": "Pregunta", "a": "Respuesta"}]',
            confirmButtonText: 'Revisar JSON',
            buttonsStyling: false,
            customClass: { confirmButton: 'btn-primary' }
        });
    }
});

function renderFlashcards() {
    cardsGrid.innerHTML = '';
    cardCounter.textContent = `Tarjetas: ${allCards.length}`;

    allCards.forEach(item => {
        const wrap = document.createElement('div');
        wrap.className = 'card-container';[cite: 2, 3]
        wrap.setAttribute('tabindex', '0');[cite: 3]

        wrap.innerHTML = `
            <div class="card">
                <div class="card-face">
                    ${escapeHtml(item.q)}
                    <button type="button" class="card-listen-btn" title="Escuchar pregunta">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
                <div class="card-back card-face">
                    ${escapeHtml(item.a)}
                    <button type="button" class="card-listen-btn" title="Escuchar respuesta">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            </div>
        `;

        // Tu lógica exacta de giro 3D en click[cite: 3]
        wrap.addEventListener('click', (e) => {
            if (e.target.closest('.card-listen-btn')) return;[cite: 3]
            wrap.querySelector('.card').classList.toggle('is-flipped');[cite: 2, 3]
        });

        // Tu lógica exacta de teclado para accesibilidad[cite: 3]
        wrap.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();[cite: 3]
                wrap.querySelector('.card').classList.toggle('is-flipped');[cite: 3]
            }
        });

        // Lectores independientes por cada cara
        wrap.querySelector('.card-face:not(.card-back) .card-listen-btn').addEventListener('click', (e) => {
            e.stopPropagation();[cite: 3]
            VoiceA11y.speak(item.q, e.currentTarget);
        });

        wrap.querySelector('.card-back .card-listen-btn').addEventListener('click', (e) => {
            e.stopPropagation();[cite: 3]
            VoiceA11y.speak(item.a, e.currentTarget);
        });

        cardsGrid.appendChild(wrap);[cite: 3]
    });
}

// ==========================================================================
// 7. SISTEMA DEL QUIZ (Múltiple Opción)
// ==========================================================================
goQuizBtn.addEventListener('click', () => {
    if (allCards.length === 0) return alert("Carga tarjetas primero.");
    poolPracticeCards = [...allCards];[cite: 3]
    practiceHistory = [];[cite: 3]
    stats = { correct: 0, wrong: 0, skipped: 0 };[cite: 3]
    quizIndex = 0;
    switchView(quizView);
    loadNextQuizCard();
});

function loadNextQuizCard() {
    if (poolPracticeCards.length === 0) {
        showResults();
        return;
    }

    mcGrid.innerHTML = '';[cite: 3]
    quizFeedback.textContent = '';[cite: 3]
    quizFeedback.className = 'feedback';[cite: 3]
    quizSkipBtn.classList.remove('hidden');[cite: 3]
    quizNextBtn.classList.add('hidden');[cite: 3]

    quizIndex++;
    quizProgress.textContent = `Pregunta ${quizIndex} de ${allCards.length}`;[cite: 3]

    const rnd = Math.floor(Math.random() * poolPracticeCards.length);[cite: 3]
    currentCard = poolPracticeCards.splice(rnd, 1)[0];[cite: 3]
    practiceQuestion.textContent = currentCard.q;[cite: 3]

    // Construcción de distractores dinámicos
    const distractors = [...new Set(allCards.map(c => c.a).filter(a => a !== currentCard.a))];[cite: 3]
    distractors.sort(() => 0.5 - Math.random());[cite: 3]
    const options = [...distractors.slice(0, 3), currentCard.a].sort(() => 0.5 - Math.random());[cite: 3]

    options.forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'mc-option';
        btn.textContent = text;
        btn.onclick = () => gradeQuizAnswer(text, btn);
        mcGrid.appendChild(btn);[cite: 3]
    });

    VoiceA11y.autoSpeak(currentCard.q, document.getElementById('quiz-listen-btn'));[cite: 3]
}

document.getElementById('quiz-listen-btn').addEventListener('click', (e) => {
    if (currentCard) VoiceA11y.speak(currentCard.q, e.currentTarget);[cite: 3]
});

function gradeQuizAnswer(selected, clickedBtn) {
    const allBtns = mcGrid.querySelectorAll('.mc-option');
    allBtns.forEach(b => b.disabled = true);[cite: 3]

    quizSkipBtn.classList.add('hidden');[cite: 3]
    quizNextBtn.classList.remove('hidden');[cite: 3]

    const isCorrect = selected === currentCard.a;[cite: 3]

    if (isCorrect) {
        stats.correct++;[cite: 3]
        clickedBtn.classList.add('correct');[cite: 3]
        quizFeedback.textContent = '¡Excelente! Respuesta correcta.';[cite: 3]
        quizFeedback.className = 'feedback correct';[cite: 3]
        VoiceA11y.autoSpeak(`Correcto. La respuesta es ${currentCard.a}.`);[cite: 3]
    } else {
        stats.wrong++;[cite: 3]
        clickedBtn.classList.add('wrong');[cite: 3]
        allBtns.forEach(b => {
            if (b.textContent === currentCard.a) b.classList.add('correct');[cite: 3]
        });
        quizFeedback.textContent = 'Incorrecto. Mira cuál era la respuesta.';[cite: 3]
        quizFeedback.className = 'feedback wrong';[cite: 3]
        VoiceA11y.autoSpeak(`Incorrecto. La respuesta correcta era ${currentCard.a}.`);[cite: 3]
    }

    practiceHistory.push({[cite: 3]
        question: currentCard.q,[cite: 3]
        userAnswer: selected,[cite: 3]
        correctAnswer: currentCard.a,[cite: 3]
        status: isCorrect ? 'correct' : 'wrong'[cite: 3]
    });
}

quizSkipBtn.addEventListener('click', () => {
    stats.skipped++;[cite: 3]
    practiceHistory.push({[cite: 3]
        question: currentCard.q,[cite: 3]
        userAnswer: '[Saltada]',
        correctAnswer: currentCard.a,[cite: 3]
        status: 'skipped'[cite: 3]
    });
    loadNextQuizCard();
});

quizNextBtn.addEventListener('click', loadNextQuizCard);[cite: 3]

// ==========================================================================
// 8. VISTA DE RESULTADOS
// ==========================================================================
function showResults() {
    switchView(resultsView);[cite: 3]

    const total = allCards.length;[cite: 3]
    const pct = total > 0 ? Math.round((stats.correct / total) * 100) : 0;[cite: 3]

    scorePercent.textContent = `${pct}%`;[cite: 3]
    statCorrect.textContent = stats.correct;[cite: 3]
    statWrong.textContent = stats.wrong;[cite: 3]
    statSkipped.textContent = stats.skipped;[cite: 3]

    const circumference = 251.2;[cite: 3]
    if (ringFill) {
        setTimeout(() => {
            ringFill.style.strokeDashoffset = circumference - (pct / 100) * circumference;[cite: 3]
        }, 120);[cite: 3]
    }

    historyList.innerHTML = '';[cite: 3]
    const labels = { correct: 'Correcto', wrong: 'Incorrecto', skipped: 'Saltada' };

    practiceHistory.forEach(item => {
        const el = document.createElement('div');
        el.className = `history-item item-${item.status}`;[cite: 3]
        el.innerHTML = `
            <span class="status-tag ${item.status}">${labels[item.status]}</span>
            <p>${escapeHtml(item.question)}</p>
            <span>Tu respuesta: <strong>${escapeHtml(item.userAnswer)}</strong></span>
            ${item.status !== 'correct' ? `<span>Correcta: <strong>${escapeHtml(item.correctAnswer)}</strong></span>` : ''}
        `;
        historyList.appendChild(el);[cite: 3]
    });

    const summaryText = `Terminaste el quiz con ${pct} por ciento de aciertos.`;[cite: 3]
    VoiceA11y.autoSpeak(summaryText);[cite: 3]
}

restartBtn.addEventListener('click', () => {
    switchView(studyView);[cite: 3]
    renderFlashcards();[cite: 3]
});

// ==========================================================================
// 9. FUNCIONES DE SOPORTE E INTERFAZ
// ==========================================================================
function switchView(next) {
    VoiceA11y.stop();[cite: 3]
    [studyView, quizView, resultsView].forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
    });
    next.classList.remove('hidden');
    next.classList.add('active');
}

function resetApp() {
    allCards = [];[cite: 3]
    cardsGrid.innerHTML = '';[cite: 3]
    dataInput.value = '';
    [studyView, quizView, resultsView].forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');[cite: 3]
    div.textContent = str;[cite: 3]
    return div.innerHTML;[cite: 3]
}

// Acordeón de la guía de uso
const accordionToggleBtn = document.getElementById('accordion-toggle-btn');
const accordionContent = document.getElementById('accordion-content');
if (accordionToggleBtn && accordionContent) {
    accordionToggleBtn.addEventListener('click', () => {
        accordionContent.classList.toggle('hidden');
        const isHidden = accordionContent.classList.contains('hidden');
        accordionToggleBtn.querySelector('.caret').style.transform = isHidden ? "rotate(0deg)" : "rotate(180deg)";
    });
}