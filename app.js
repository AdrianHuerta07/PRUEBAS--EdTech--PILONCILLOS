document.addEventListener('DOMContentLoaded', () => {

    // ══════════════════════════════════════════════════════════
    // MÓDULO DE LOGIN
    // Credenciales fijas de acceso. Se valida localmente y se
    // recuerda la sesión en localStorage para no pedir login
    // en cada visita (útil en modo offline / app instalada).
    // ══════════════════════════════════════════════════════════
    (function setupLogin() {
        const VALID_EMAIL    = 'TCDS@gmail.com';
        const VALID_PASSWORD = 'DGR';
        const SESSION_KEY     = 'piloncillos_flashcards_session';

        const loginScreen  = document.getElementById('login-screen');
        const appContent   = document.getElementById('app-content');
        const loginForm    = document.getElementById('login-form');
        const emailInput   = document.getElementById('login-email');
        const passwordInput = document.getElementById('login-password');
        const loginError   = document.getElementById('login-error');
        const togglePwdBtn  = document.getElementById('toggle-password');
        const logoutBtn     = document.getElementById('logout-btn');

        function showApp() {
            loginScreen.classList.add('hidden');
            appContent.classList.remove('hidden');
        }

        function showLogin() {
            appContent.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            emailInput.value = '';
            passwordInput.value = '';
            loginError.classList.add('hidden');
            emailInput.focus();
        }

        // Si ya había sesión guardada (por ejemplo, app instalada sin internet), entra directo
        if (localStorage.getItem(SESSION_KEY) === 'true') {
            showApp();
        } else {
            showLogin();
        }

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const email    = emailInput.value.trim();
                const password = passwordInput.value;

                if (email.toLowerCase() === VALID_EMAIL.toLowerCase() && password === VALID_PASSWORD) {
                    localStorage.setItem(SESSION_KEY, 'true');
                    loginError.classList.add('hidden');
                    showApp();
                } else {
                    loginError.classList.remove('hidden');
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            });
        }

        if (togglePwdBtn) {
            togglePwdBtn.addEventListener('click', () => {
                const isPwd = passwordInput.type === 'password';
                passwordInput.type = isPwd ? 'text' : 'password';
                togglePwdBtn.innerHTML = isPwd
                    ? '<i class="ph ph-eye-slash"></i>'
                    : '<i class="ph ph-eye"></i>';
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem(SESSION_KEY);
                showLogin();
            });
        }
    })();

    // ══════════════════════════════════════════════════════════
    // MÓDULO DE ACCESIBILIDAD POR VOZ (Web Speech API)
    // Texto→Voz (TTS) para leer contenido, y Voz→Texto (STT)
    // para dictar tarjetas. Pensado para personas con dificultad
    // para leer o que prefieren usar la app hablando.
    // ══════════════════════════════════════════════════════════
    const VoiceA11y = (() => {
        const synth = window.speechSynthesis || null;
        let voices = [];
        let selectedVoiceURI = null;
        let rate = 0.95;
        let masterEnabled = false; // "Leer en voz alta" global activado
        let currentSpeakingEl = null;
        let keepAliveTimer = null;  // Fix bug Chromium/Brave: evita que synth se congele
        let voicesReadyResolvers = [];

        const announcer = document.getElementById('aria-announcer');

        function announce(msg) {
            if (announcer) announcer.textContent = msg;
        }

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

        // Devuelve una promesa que resuelve cuando hay voces disponibles
        // (fix Brave/Chrome: getVoices() suele venir vacío al cargar la página)
        function waitForVoices(timeoutMs = 2500) {
            return new Promise((resolve) => {
                if (!synth) return resolve();
                if (voices.length > 0) return resolve();
                voicesReadyResolvers.push(resolve);
                // Fallback: si el evento voiceschanged nunca llega, no bloquear para siempre
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

        // ── keepAlive: fix bug de Chromium/Brave donde el synth se congela
        // en textos largos (>15s). Hace pause/resume periódico mientras habla.
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

            // Fix Brave/Chrome: espera a que existan voces antes de intentar hablar
            await waitForVoices();

            synth.cancel();
            clearSpeakingClass();
            stopKeepAlive();

            // Fix Brave/Chrome: un margen mínimo tras cancel() evita que el
            // siguiente speak() se pierda o quede en un estado roto.
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
                    // 'interrupted' y 'canceled' son normales al llamar cancel(); ignorar
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
            const masterBtn = document.getElementById('voice-master-toggle');
            const stopBtn   = document.getElementById('voice-stop-btn');
            if (stopBtn) stopBtn.classList.toggle('hidden', !isSpeaking);
            if (masterBtn) masterBtn.classList.toggle('speaking', isSpeaking);
        }

        function autoSpeak(text, el) {
            if (masterEnabled) speak(text, el);
        }

        function setMasterEnabled(val) { masterEnabled = val; }
        function isMasterEnabled() { return masterEnabled; }
        function isSupported() { return !!synth; }

        // ── Reconocimiento de voz (dictado) ──────────────────
        const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition || null;

        function createRecognizer(onResult, onEnd, onError) {
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
                // Mensajes específicos para que el usuario sepa qué pasó
                // (Brave bloquea el micrófono por Escudos con más frecuencia que Chrome)
                let reason = 'unknown';
                if (e.error === 'not-allowed' || e.error === 'permission-denied') reason = 'permission';
                else if (e.error === 'no-speech') reason = 'no-speech';
                else if (e.error === 'network') reason = 'network';
                else if (e.error === 'audio-capture') reason = 'no-mic';
                if (onError) onError(e, reason);
            };
            return rec;
        }

        function recognitionSupported() { return !!SpeechRecognitionCtor; }

        return {
            announce, speak, stop, autoSpeak,
            setMasterEnabled, isMasterEnabled, isSupported,
            recognitionSupported, createRecognizer,
            setRate: (r) => { rate = r; },
            setVoiceURI: (uri) => { selectedVoiceURI = uri; },
        };
    })();

    // ── Configurar controles del panel de accesibilidad ───────
    (function setupVoiceBar() {
        const masterToggle   = document.getElementById('voice-master-toggle');
        const stopBtn        = document.getElementById('voice-stop-btn');
        const menuToggle      = document.getElementById('menu-toggle');
        const settingsPanel  = document.getElementById('voice-settings-panel');
        const rateInput      = document.getElementById('voice-rate');
        const rateVal        = document.getElementById('voice-rate-val');
        const voiceSelect    = document.getElementById('voice-select');

        if (!VoiceA11y.isSupported() && masterToggle) {
            masterToggle.disabled = true;
            masterToggle.title = 'Tu navegador no soporta lectura en voz alta';
            masterToggle.style.opacity = '0.4';
        }

        masterToggle && masterToggle.addEventListener('click', () => {
            const next = !VoiceA11y.isMasterEnabled();
            VoiceA11y.setMasterEnabled(next);
            masterToggle.setAttribute('aria-pressed', String(next));
            const label = masterToggle.querySelector('.voice-btn-label');
            if (label) label.textContent = next ? 'Voz activada — toca para desactivar' : 'Activar lectura en voz alta';

            if (next) {
                VoiceA11y.announce('Lectura en voz alta activada.');
                const activeView = document.querySelector('.view.active');
                if (activeView && activeView.id === 'view-practice') {
                    const q = document.getElementById('practice-question');
                    if (q) VoiceA11y.speak(q.textContent, document.getElementById('listen-question-btn'));
                }
            } else {
                VoiceA11y.stop();
            }
        });

        stopBtn && stopBtn.addEventListener('click', () => VoiceA11y.stop());

        menuToggle && menuToggle.addEventListener('click', () => {
            const isOpen = !settingsPanel.classList.contains('hidden');
            settingsPanel.classList.toggle('hidden', isOpen);
            menuToggle.setAttribute('aria-expanded', String(!isOpen));
        });

        document.addEventListener('click', (e) => {
            if (!settingsPanel || settingsPanel.classList.contains('hidden')) return;
            const header = document.querySelector('.site-header');
            if (header && !header.contains(e.target) && !settingsPanel.contains(e.target)) {
                settingsPanel.classList.add('hidden');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        });

        rateInput && rateInput.addEventListener('input', () => {
            const r = parseFloat(rateInput.value);
            VoiceA11y.setRate(r);
            rateVal.textContent = `${r.toFixed(2)}×`;
        });

        voiceSelect && voiceSelect.addEventListener('change', () => {
            VoiceA11y.setVoiceURI(voiceSelect.value);
        });
    })();

    // ── Dictado por voz en el textarea de entrada ─────────────
    (function setupDictation() {
        const dictateBtn    = document.getElementById('dictate-btn');
        const dictateStatus = document.getElementById('dictate-status');
        const textInputEl   = document.getElementById('text-input');
        if (!dictateBtn || !textInputEl) return;

        if (!VoiceA11y.recognitionSupported()) {
            dictateBtn.classList.add('unsupported');
            dictateBtn.title = 'Dictado por voz no disponible en este navegador (prueba Chrome o Brave)';
            return;
        }

        // El micrófono solo funciona en contextos seguros: https:// o localhost
        const isSecure = window.isSecureContext;
        if (!isSecure) {
            dictateBtn.classList.add('unsupported');
            dictateBtn.title = 'El dictado requiere HTTPS o localhost. Sirve la página con un servidor local o publícala en HTTPS.';
            return;
        }

        let recognizer = null;
        let isRecording = false;

        function setStatus(msg) {
            if (!dictateStatus) return;
            if (msg) {
                dictateStatus.textContent = msg;
                dictateStatus.classList.remove('hidden');
            } else {
                dictateStatus.classList.add('hidden');
            }
        }

        dictateBtn.addEventListener('click', () => {
            if (isRecording) {
                recognizer && recognizer.stop();
                return;
            }

            recognizer = VoiceA11y.createRecognizer(
                (text) => {
                    // Añade el texto dictado como nueva línea, respetando el formato
                    // "Pregunta : Respuesta" si el usuario lo dice con la palabra "dos puntos"
                    let cleaned = text.replace(/\bdos puntos\b/gi, ':').trim();
                    const current = textInputEl.value;
                    textInputEl.value = current && !current.endsWith('\n')
                        ? `${current}\n${cleaned}`
                        : `${current}${cleaned}`;
                    setStatus('Escuchando… di "dos puntos" para separar pregunta y respuesta.');
                },
                () => {
                    isRecording = false;
                    dictateBtn.classList.remove('recording');
                    setStatus('');
                },
                (e, reason) => {
                    isRecording = false;
                    dictateBtn.classList.remove('recording');
                    const messages = {
                        'permission': 'Micrófono bloqueado. Revisa el icono 🦁 de Brave o los permisos del sitio y actívalo.',
                        'no-mic': 'No se detectó ningún micrófono conectado.',
                        'network': 'Problema de conexión al reconocer la voz. Intenta de nuevo.',
                        'no-speech': 'No se detectó audio. Intenta de nuevo.',
                        'unknown': 'No se pudo dictar. Intenta de nuevo.'
                    };
                    setStatus(messages[reason] || messages.unknown);
                    setTimeout(() => setStatus(''), 4000);
                }
            );

            if (!recognizer) return;
            isRecording = true;
            dictateBtn.classList.add('recording');
            setStatus('Escuchando… di "dos puntos" para separar pregunta y respuesta.');
            recognizer.start();
        });
    })();

    // ── Estado ────────────────────────────────────────────────
    let allCards          = [];
    let poolPracticeCards = [];
    let currentCard       = null;
    let practiceHistory   = [];
    let stats             = { correct: 0, wrong: 0, skipped: 0 };

    // ── DOM ───────────────────────────────────────────────────
    const viewInput    = document.getElementById('view-input');
    const viewStudy    = document.getElementById('view-study');
    const viewPractice = document.getElementById('view-practice');
    const viewResults  = document.getElementById('view-results');

    const textInput          = document.getElementById('text-input');
    const cardsGrid          = document.getElementById('flashcards-container');
    const cardCounter        = document.getElementById('card-counter');

    const generateBtn        = document.getElementById('generate-btn');
    const backBtn            = document.getElementById('back-btn');
    const startPracticeBtn   = document.getElementById('start-practice-btn');
    const exitPracticeBtn    = document.getElementById('exit-practice-btn');
    const retryBtn           = document.getElementById('retry-btn');

    const practiceProgress   = document.getElementById('practice-progress');
    const practiceQuestion   = document.getElementById('practice-question');
    const mcOptionsContainer = document.getElementById('mc-options');
    const feedbackMessage    = document.getElementById('feedback-message');
    const skipBtn            = document.getElementById('skip-btn');
    const nextBtn            = document.getElementById('next-btn');

    const scorePercentage    = document.getElementById('score-percentage');
    const statCorrect        = document.getElementById('stat-correct');
    const statWrong          = document.getElementById('stat-wrong');
    const statSkipped        = document.getElementById('stat-skipped');
    const historyList        = document.getElementById('history-list');

    const copyPromptBtn      = document.getElementById('copy-prompt-btn');
    const aiPromptText       = document.getElementById('ai-prompt-text');
    
    // Panel de instrucciones
    const instructionsToggle  = document.getElementById('instructions-toggle');
    const instructionsContent = document.getElementById('instructions-content');

    // ── Atajos de Teclado Globales e Inputs ───────────────────
    
    // Generar tarjetas con Ctrl + Enter (o Cmd + Enter en Mac)
    textInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            generateBtn.click();
        }
    });

    // ── Acordeón de Instrucciones ─────────────────────────────
    if (instructionsToggle && instructionsContent) {
        instructionsToggle.addEventListener('click', () => {
            instructionsToggle.classList.toggle('open');
            instructionsContent.classList.toggle('open');
        });
    }

    // ── Copiar prompt de IA ───────────────────────────────────
    copyPromptBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(aiPromptText.textContent.trim()).then(() => {
            copyPromptBtn.innerHTML = '<i class="ph ph-check"></i>';
            copyPromptBtn.classList.add('copied');
            setTimeout(() => {
                copyPromptBtn.innerHTML = '<i class="ph ph-copy"></i>';
                copyPromptBtn.classList.remove('copied');
            }, 2200);
        }).catch(() => {
            const range = document.createRange();
            range.selectNode(aiPromptText);
            window.getSelection().removeAllRanges();
            window.getSelection().addRange(range);
        });
    });

    // ── Generar tarjetas ──────────────────────────────────────
    generateBtn.addEventListener('click', () => {
        const raw = textInput.value.trim();
        if (!raw.includes(':')) {
            alert('Usa el formato: Pregunta : Respuesta');
            return;
        }

        allCards = [];
        cardsGrid.innerHTML = '';

        raw.split('\n').forEach(line => {
            const colonIdx = line.indexOf(':');
            if (colonIdx === -1) return;

            const q = line.slice(0, colonIdx).trim();
            const a = line.slice(colonIdx + 1).trim();

            if (q && a) {
                allCards.push({ q, a });
                renderCard(q, a);
            }
        });

        if (allCards.length === 0) {
            alert('No se encontraron tarjetas válidas. Revisa el formato: Pregunta : Respuesta');
            return;
        }

        cardCounter.textContent = `${allCards.length} Tarjeta${allCards.length !== 1 ? 's' : ''}`;
        switchView(viewStudy);
    });

    // ── Navegación ────────────────────────────────────────────
    backBtn.addEventListener('click',         () => switchView(viewInput));
    startPracticeBtn.addEventListener('click', initPracticeSession);
    exitPracticeBtn.addEventListener('click',  () => switchView(viewStudy));
    retryBtn.addEventListener('click',         () => switchView(viewStudy));

    // ── Sesión de práctica ────────────────────────────────────
    function initPracticeSession() {
        poolPracticeCards = [...allCards];
        practiceHistory   = [];
        stats             = { correct: 0, wrong: 0, skipped: 0 };
        switchView(viewPractice);
        loadNextCard();
    }

    function loadNextCard() {
        if (poolPracticeCards.length === 0) {
            showResults();
            return;
        }

        mcOptionsContainer.innerHTML = '';
        feedbackMessage.textContent  = '';
        feedbackMessage.className    = 'feedback';
        skipBtn.classList.remove('hidden');
        nextBtn.classList.add('hidden');

        const idx = allCards.length - poolPracticeCards.length + 1;
        practiceProgress.textContent = `${idx} / ${allCards.length}`;

        const rnd    = Math.floor(Math.random() * poolPracticeCards.length);
        currentCard  = poolPracticeCards.splice(rnd, 1)[0];
        practiceQuestion.textContent = currentCard.q;

        buildOptions(currentCard);

        // Si el modo "Leer en voz alta" está activo, lee la pregunta automáticamente
        VoiceA11y.autoSpeak(currentCard.q, document.getElementById('listen-question-btn'));
    }

    // Botón manual para escuchar la pregunta del quiz en cualquier momento
    const listenQuestionBtn = document.getElementById('listen-question-btn');
    if (listenQuestionBtn) {
        listenQuestionBtn.addEventListener('click', () => {
            if (currentCard) VoiceA11y.speak(currentCard.q, listenQuestionBtn);
        });
    }

    function buildOptions(card) {
        const distractors = [...new Set(allCards.map(c => c.a).filter(a => a !== card.a))];
        distractors.sort(() => 0.5 - Math.random());

        const options = [...distractors.slice(0, 3), card.a].sort(() => 0.5 - Math.random());

        options.forEach(text => {
            const btn       = document.createElement('button');
            btn.className   = 'mc-option';
            btn.textContent = text;
            btn.onclick     = () => grade(text, btn);
            mcOptionsContainer.appendChild(btn);
        });
    }

    function grade(selected, clickedBtn) {
        const allBtns = mcOptionsContainer.querySelectorAll('.mc-option');
        allBtns.forEach(b => b.disabled = true);

        skipBtn.classList.add('hidden');
        nextBtn.classList.remove('hidden');

        const isCorrect = selected === currentCard.a;

        if (isCorrect) {
            stats.correct++;
            clickedBtn.classList.add('correct');
            feedbackMessage.textContent = '¡Excelente! Respuesta correcta.';
            feedbackMessage.className   = 'feedback correct';
            VoiceA11y.autoSpeak(`Correcto. La respuesta es ${currentCard.a}.`);
        } else {
            stats.wrong++;
            clickedBtn.classList.add('wrong');
            allBtns.forEach(b => {
                if (b.textContent === currentCard.a) b.classList.add('correct');
            });
            feedbackMessage.textContent = 'Incorrecto. Mira cuál era la respuesta.';
            feedbackMessage.className   = 'feedback wrong';
            VoiceA11y.autoSpeak(`Incorrecto. La respuesta correcta era ${currentCard.a}.`);
        }

        practiceHistory.push({
            question:      currentCard.q,
            userAnswer:    selected,
            correctAnswer: currentCard.a,
            status:        isCorrect ? 'correct' : 'wrong'
        });
    }

    skipBtn.addEventListener('click', () => {
        const allBtns = mcOptionsContainer.querySelectorAll('.mc-option');
        allBtns.forEach(b => {
            b.disabled = true;
            if (b.textContent === currentCard.a) b.classList.add('correct');
            else b.style.opacity = '0.42';
        });

        stats.skipped++;
        feedbackMessage.textContent = 'Saltada. Esa era la respuesta correcta.';
        feedbackMessage.className   = 'feedback wrong';
        skipBtn.classList.add('hidden');
        nextBtn.classList.remove('hidden');

        practiceHistory.push({
            question:      currentCard.q,
            userAnswer:    'Sin respuesta',
            correctAnswer: currentCard.a,
            status:        'skipped'
        });
    });

    nextBtn.addEventListener('click', loadNextCard);

    // ── Resultados ────────────────────────────────────────────
    function showResults() {
        switchView(viewResults);

        const total = allCards.length;
        const pct   = total > 0 ? Math.round((stats.correct / total) * 100) : 0;

        scorePercentage.textContent = `${pct}%`;
        statCorrect.textContent     = stats.correct;
        statWrong.textContent       = stats.wrong;
        statSkipped.textContent     = stats.skipped;

        const ringEl       = document.getElementById('score-ring-fill');
        const circumference = 251.2;
        if (ringEl) {
            setTimeout(() => {
                ringEl.style.strokeDashoffset = circumference - (pct / 100) * circumference;
            }, 120);
        }

        historyList.innerHTML = '';
        const labels = { correct: 'Correcto', wrong: 'Incorrecto', skipped: 'Sin respuesta' };

        practiceHistory.forEach(item => {
            const el        = document.createElement('div');
            el.className    = `history-item item-${item.status}`;
            el.innerHTML    = `
                <span class="status-tag ${item.status}">${labels[item.status]}</span>
                <p>${escapeHtml(item.question)}</p>
                <span>Tu respuesta: <strong>${escapeHtml(item.userAnswer)}</strong></span>
                ${item.status !== 'correct'
                    ? `<span>Correcta: <strong>${escapeHtml(item.correctAnswer)}</strong></span>`
                    : ''}
            `;
            historyList.appendChild(el);
        });

        const summaryText = `Terminaste el quiz con ${pct} por ciento de aciertos. ${stats.correct} correctas, ${stats.wrong} incorrectas y ${stats.skipped} saltadas.`;
        const listenResultsBtn = document.getElementById('listen-results-btn');
        if (listenResultsBtn) {
            listenResultsBtn.onclick = () => VoiceA11y.speak(summaryText, listenResultsBtn);
        }
        VoiceA11y.autoSpeak(summaryText, listenResultsBtn);
    }

    // ── Renderizar tarjeta de estudio ─────────────────────────
    function renderCard(q, a) {
        const wrap      = document.createElement('div');
        wrap.className  = 'card-container';
        wrap.setAttribute('tabindex', '0'); // Enfocable con Tab

        wrap.innerHTML  = `
            <div class="card">
                <div class="card-face card-front">
                    ${escapeHtml(q)}
                    <button type="button" class="card-listen-btn" aria-label="Escuchar pregunta" title="Escuchar pregunta">
                        <i class="ph ph-speaker-high"></i>
                    </button>
                </div>
                <div class="card-face card-back">
                    ${escapeHtml(a)}
                    <button type="button" class="card-listen-btn" aria-label="Escuchar respuesta" title="Escuchar respuesta">
                        <i class="ph ph-speaker-high"></i>
                    </button>
                </div>
            </div>
        `;

        // Voltear con click (pero no si se pulsó el botón de audio)
        wrap.addEventListener('click', (e) => {
            if (e.target.closest('.card-listen-btn')) return;
            wrap.querySelector('.card').classList.toggle('is-flipped');
        });

        // Voltear con teclado (Enter o Espacio)
        wrap.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                wrap.querySelector('.card').classList.toggle('is-flipped');
            }
        });

        // Botones de audio: leen la pregunta o la respuesta sin voltear la tarjeta
        const frontBtn = wrap.querySelector('.card-front .card-listen-btn');
        const backBtn  = wrap.querySelector('.card-back .card-listen-btn');
        frontBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            VoiceA11y.speak(q, frontBtn);
        });
        backBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            VoiceA11y.speak(a, backBtn);
        });

        cardsGrid.appendChild(wrap);
    }

    // Escapa HTML para insertar texto de usuario de forma segura
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ── Cambiar vista ─────────────────────────────────────────
    function switchView(next) {
        VoiceA11y.stop(); // evita que se solape audio de la vista anterior
        [viewInput, viewStudy, viewPractice, viewResults].forEach(v => {
            v.classList.remove('active');
            v.classList.add('hidden');
        });
        next.classList.remove('hidden');
        next.classList.add('active');
    }

   // ── Magia al regresar a la pestaña (CORREGIDO) ────────────
    document.addEventListener('visibilitychange', () => {
        // Solo enfoca el texto si la pestaña acaba de volverse visible tras estar oculta
        if (document.visibilityState === 'visible' && viewInput.classList.contains('active')) {
            textInput.focus();
        }
    });

});