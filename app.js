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
    const synth = window.speechSynthesis || null;
    let voices = [];
    let selectedVoiceURI = null;
    let rate = 0.95;
    let masterEnabled = false;
    let currentSpeakingEl = null;
    let keepAliveTimer = null;
    let voicesReadyResolvers = [];

    function loadVoices() {
        if (!synth) return;
        voices = synth.getVoices().filter(v => v.lang.startsWith('es') || v.lang.startsWith('en'));
        if (voices.length === 0) voices = synth.getVoices();

        const select = document.getElementById('voice-select');
        if (!select) return;
        select.innerHTML = '';
        voices.forEach(v => {
            const opt = document.createElement('option');
            opt.value = v.voiceURI;
            opt.textContent = `${v.name} (${v.lang})`;
            select.appendChild(opt);
        });

        const preferred = voices.find(v => v.lang.startsWith('es'));
        if (preferred && !selectedVoiceURI) {
            selectedVoiceURI = preferred.voiceURI;
            select.value = preferred.voiceURI;
        }

        if (voices.length > 0 && voicesReadyResolvers.length > 0) {
            voicesReadyResolvers.forEach(r => r());
            voicesReadyResolvers = [];
        }
    }

    function waitForVoices(timeoutMs = 2500) {
        return new Promise((resolve) => {
            if (!synth) return resolve();
            if (voices.length > 0) return resolve();
            voicesReadyResolvers.push(resolve);
            setTimeout(resolve, timeoutMs);
        });
    }

    if (synth) {
        loadVoices();
        synth.onvoiceschanged = loadVoices;
    }

    function getVoice() {
        return voices.find(v => v.voiceURI === selectedVoiceURI) || null;
    }

    function clearSpeakingClass() {
        if (currentSpeakingEl) {
            currentSpeakingEl.classList.remove('speaking');
            currentSpeakingEl = null;
        }
    }

    function startKeepAlive() {
        stopKeepAlive();
        keepAliveTimer = setInterval(() => {
            if (synth && synth.speaking && !synth.paused) {
                synth.pause();
                synth.resume();
            }
        }, 9000);
    }

    function stopKeepAlive() {
        if (keepAliveTimer) {
            clearInterval(keepAliveTimer);
            keepAliveTimer = null;
        }
    }

    async function speak(text, el) {
        if (!synth || !text) return;
        await waitForVoices();
        synth.cancel();
        clearSpeakingClass();
        stopKeepAlive();

        setTimeout(() => {
            const utter = new SpeechSynthesisUtterance(text);
            utter.rate = rate;
            utter.lang = 'es-ES';
            const v = getVoice() || voices[0] || null;
            if (v) utter.voice = v;

            if (el) {
                el.classList.add('speaking');
                currentSpeakingEl = el;
            }
            updateMasterUI(true);

            utter.onstart = () => startKeepAlive();
            utter.onend = () => {
                stopKeepAlive();
                clearSpeakingClass();
                updateMasterUI(false);
            };
            utter.onerror = (e) => {
                if (e.error === 'interrupted' || e.error === 'canceled') return;
                stopKeepAlive();
                clearSpeakingClass();
                updateMasterUI(false);
            };
            synth.speak(utter);
        }, 60);
    }

    function stop() {
        stopKeepAlive();
        if (synth) synth.cancel();
        clearSpeakingClass();
        updateMasterUI(false);
    }

    function updateMasterUI(isSpeaking) {
        const masterBtn = document.getElementById('voice-master-btn');
        if (masterBtn) masterBtn.classList.toggle('speaking', isSpeaking);
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;

    return {
        speak, stop, 
        autoSpeak: (text, el) => { if (masterEnabled) speak(text, el); },
        setMasterEnabled: (val) => { masterEnabled = val; },
        isMasterEnabled: () => masterEnabled,
        isSupported: () => !!synth,
        recognitionSupported: () => !!SpeechRecognitionCtor,
        setRate: (r) => { rate = r; },
        setVoiceURI: (uri) => { selectedVoiceURI = uri; },
        createRecognizer: (onResult, onEnd, onError) => {
            if (!SpeechRecognitionCtor) return null;
            const rec = new SpeechRecognitionCtor();
            rec.lang = 'es-ES';
            rec.continuous = true;
            rec.interimResults = false;
            rec.onresult = (e) => {
                let finalText = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
                }
                if (finalText) onResult(finalText.trim());
            };
            rec.onend = () => { if (onEnd) onEnd(); };
            rec.onerror = (e) => {
                let reason = 'unknown';
                if (e.error === 'not-allowed' || e.error === 'permission-denied') reason = 'permission';
                else if (e.error === 'no-speech') reason = 'no-speech';
                else if (e.error === 'network') reason = 'network';
                else if (e.error === 'audio-capture') reason = 'no-mic';
                if (onError) onError(e, reason);
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
        dictateBtn.classList.add('unsupported');
        return;
    }

    let recognizer = null;
    let isRecording = false;

    dictateBtn.addEventListener('click', () => {
        if (isRecording) {
            if (recognizer) recognizer.stop();
            return;
        }

        recognizer = VoiceA11y.createRecognizer(
            (text) => {
                const current = dataInput.value;
                dataInput.value = current ? `${current} ${text}` : text;
            },
            () => {
                isRecording = false;
                dictateBtn.classList.remove('recording');
            },
            () => {
                isRecording = false;
                dictateBtn.classList.remove('recording');
            }
        );

        if (!recognizer) return;
        isRecording = true;
        dictateBtn.classList.add('recording');
        recognizer.start();
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
        wrap.className = 'card-container';
        wrap.setAttribute('tabindex', '0');

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

        wrap.addEventListener('click', (e) => {
            if (e.target.closest('.card-listen-btn')) return;
            wrap.querySelector('.card').classList.toggle('is-flipped');
        });

        wrap.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                wrap.querySelector('.card').classList.toggle('is-flipped');
            }
        });

        wrap.querySelector('.card-face:not(.card-back) .card-listen-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            VoiceA11y.speak(item.q, e.currentTarget);
        });

        wrap.querySelector('.card-back .card-listen-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            VoiceA11y.speak(item.a, e.currentTarget);
        });

        cardsGrid.appendChild(wrap);
    });
}

// ==========================================================================
// 7. SISTEMA DEL QUIZ (Múltiple Opción)
// ==========================================================================
goQuizBtn.addEventListener('click', () => {
    if (allCards.length === 0) return alert("Carga tarjetas primero.");
    poolPracticeCards = [...allCards];
    practiceHistory = [];
    stats = { correct: 0, wrong: 0, skipped: 0 };
    quizIndex = 0;
    switchView(quizView);
    loadNextQuizCard();
});

function loadNextQuizCard() {
    if (poolPracticeCards.length === 0) {
        showResults();
        return;
    }

    mcGrid.innerHTML = '';
    quizFeedback.textContent = '';
    quizFeedback.className = 'feedback';
    quizSkipBtn.classList.remove('hidden');
    quizNextBtn.classList.add('hidden');

    quizIndex++;
    quizProgress.textContent = `Pregunta ${quizIndex} de ${allCards.length}`;

    const rnd = Math.floor(Math.random() * poolPracticeCards.length);
    currentCard = poolPracticeCards.splice(rnd, 1)[0];
    practiceQuestion.textContent = currentCard.q;

    const distractors = [...new Set(allCards.map(c => c.a).filter(a => a !== currentCard.a))];
    distractors.sort(() => 0.5 - Math.random());
    const options = [...distractors.slice(0, 3), currentCard.a].sort(() => 0.5 - Math.random());

    options.forEach(text => {
        const btn = document.createElement('button');
        btn.className = 'mc-option';
        btn.textContent = text;
        btn.onclick = () => gradeQuizAnswer(text, btn);
        mcGrid.appendChild(btn);
    });

    VoiceA11y.autoSpeak(currentCard.q, document.getElementById('quiz-listen-btn'));
}

document.getElementById('quiz-listen-btn').addEventListener('click', (e) => {
    if (currentCard) VoiceA11y.speak(currentCard.q, e.currentTarget);
});

function gradeQuizAnswer(selected, clickedBtn) {
    const allBtns = mcGrid.querySelectorAll('.mc-option');
    allBtns.forEach(b => b.disabled = true);

    quizSkipBtn.classList.add('hidden');
    quizNextBtn.classList.remove('hidden');

    const isCorrect = selected === currentCard.a;

    if (isCorrect) {
        stats.correct++;
        clickedBtn.classList.add('correct');
        quizFeedback.textContent = '¡Excelente! Respuesta correcta.';
        quizFeedback.className = 'feedback correct';
        VoiceA11y.autoSpeak(`Correcto. La respuesta es ${currentCard.a}.`);
    } else {
        stats.wrong++;
        clickedBtn.classList.add('wrong');
        allBtns.forEach(b => {
            if (b.textContent === currentCard.a) b.classList.add('correct');
        });
        quizFeedback.textContent = 'Incorrecto. Mira cuál era la respuesta.';
        quizFeedback.className = 'feedback wrong';
        VoiceA11y.autoSpeak(`Incorrecto. La respuesta correcta era ${currentCard.a}.`);
    }

    practiceHistory.push({
        question: currentCard.q,
        userAnswer: selected,
        correctAnswer: currentCard.a,
        status: isCorrect ? 'correct' : 'wrong'
    });
}

quizSkipBtn.addEventListener('click', () => {
    stats.skipped++;
    practiceHistory.push({
        question: currentCard.q,
        userAnswer: '[Saltada]',
        correctAnswer: currentCard.a,
        status: 'skipped'
    });
    loadNextQuizCard();
});

quizNextBtn.addEventListener('click', loadNextQuizCard);

// ==========================================================================
// 8. VISTA DE RESULTADOS
// ==========================================================================
function showResults() {
    switchView(resultsView);

    const total = allCards.length;
    const pct = total > 0 ? Math.round((stats.correct / total) * 100) : 0;

    scorePercent.textContent = `${pct}%`;
    statCorrect.textContent = stats.correct;
    statWrong.textContent = stats.wrong;
    statSkipped.textContent = stats.skipped;

    const circumference = 251.2;
    if (ringFill) {
        setTimeout(() => {
            ringFill.style.strokeDashoffset = circumference - (pct / 100) * circumference;
        }, 120);
    }

    historyList.innerHTML = '';
    const labels = { correct: 'Correcto', wrong: 'Incorrecto', skipped: 'Saltada' };

    practiceHistory.forEach(item => {
        const el = document.createElement('div');
        el.className = `history-item item-${item.status}`;
        el.innerHTML = `
            <span class="status-tag ${item.status}">${labels[item.status]}</span>
            <p>${escapeHtml(item.question)}</p>
            <span>Tu respuesta: <strong>${escapeHtml(item.userAnswer)}</strong></span>
            ${item.status !== 'correct' ? `<span>Correcta: <strong>${escapeHtml(item.correctAnswer)}</strong></span>` : ''}
        `;
        historyList.appendChild(el);
    });

    const summaryText = `Terminaste el quiz con ${pct} por ciento de aciertos.`;
    VoiceA11y.autoSpeak(summaryText);
}

restartBtn.addEventListener('click', () => {
    switchView(studyView);
    renderFlashcards();
});

// ==========================================================================
// 9. FUNCIONES DE SOPORTE E INTERFAZ
// ==========================================================================
function switchView(next) {
    VoiceA11y.stop();
    [studyView, quizView, resultsView].forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
    });
    next.classList.remove('hidden');
    next.classList.add('active');
}

function resetApp() {
    allCards = [];
    cardsGrid.innerHTML = '';
    dataInput.value = '';
    [studyView, quizView, resultsView].forEach(v => {
        v.classList.remove('active');
        v.classList.add('hidden');
    });
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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