document.addEventListener('DOMContentLoaded', () => {

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
        } else {
            stats.wrong++;
            clickedBtn.classList.add('wrong');
            allBtns.forEach(b => {
                if (b.textContent === currentCard.a) b.classList.add('correct');
            });
            feedbackMessage.textContent = 'Incorrecto. Mira cuál era la respuesta.';
            feedbackMessage.className   = 'feedback wrong';
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
                <p>${item.question}</p>
                <span>Tu respuesta: <strong>${item.userAnswer}</strong></span>
                ${item.status !== 'correct'
                    ? `<span>Correcta: <strong>${item.correctAnswer}</strong></span>`
                    : ''}
            `;
            historyList.appendChild(el);
        });
    }

    // ── Renderizar tarjeta de estudio ─────────────────────────
    function renderCard(q, a) {
        const wrap      = document.createElement('div');
        wrap.className  = 'card-container';
        wrap.setAttribute('tabindex', '0'); // Enfocable con Tab
        
        wrap.innerHTML  = `
            <div class="card">
                <div class="card-face card-front">${q}</div>
                <div class="card-face card-back">${a}</div>
            </div>
        `;
        
        // Voltear con click
        wrap.addEventListener('click', () =>
            wrap.querySelector('.card').classList.toggle('is-flipped')
        );
        
        // Voltear con teclado (Enter o Espacio)
        wrap.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                wrap.querySelector('.card').classList.toggle('is-flipped');
            }
        });
        
        cardsGrid.appendChild(wrap);
    }

    // ── Cambiar vista ─────────────────────────────────────────
    function switchView(next) {
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