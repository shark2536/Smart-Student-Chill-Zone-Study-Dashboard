(function SmartDashboardApp() {
    // State Management
    const STATE = {
        user: { name: localStorage.getItem('app_user_name') || 'Student' },
        theme: localStorage.getItem('app_theme') || 'light',
        timer: {
            mode: 'focus',
            durations: { focus: 25 * 60, shortBreak: 5 * 60, longBreak: 15 * 60 },
            colors: { focus: '#0071E3', shortBreak: '#34C759', longBreak: '#AF52DE' },
            timeLeft: 25 * 60,
            isRunning: false,
            intervalId: null
        },
        tasks: JSON.parse(localStorage.getItem('app_tasks')) || []
    };

    // DOM Elements
    const DOM = {
        greetingText: document.getElementById('greeting-text'),
        userNameDisplay: document.getElementById('user-name-display'),
        liveDateDisplay: document.getElementById('live-date-display'),
        liveClock: document.getElementById('live-clock'),
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        timerCountdown: document.getElementById('timer-countdown'),
        timerStateLabel: document.getElementById('timer-state-label'),
        timerProgressRing: document.getElementById('timer-progress-ring'),
        timerStartBtn: document.getElementById('timer-start-btn'),
        timerResetBtn: document.getElementById('timer-reset-btn'),
        timerModeBtns: document.querySelectorAll('.mode-btn'),
        timerModesContainer: document.getElementById('timer-modes-container'),
        slidingPill: document.getElementById('sliding-pill'),
        taskForm: document.getElementById('task-form'),
        taskTitleInput: document.getElementById('task-title-input'),
        taskSubjectInput: document.getElementById('task-subject-input'),
        taskDeadlineInput: document.getElementById('task-deadline-input'),
        taskListContainer: document.getElementById('task-list-container')
    };

    // Constants
    const RING_CIRCUMFERENCE = 2 * Math.PI * 90;
    let currentActiveIndex = 0;

    // --- Sliding Pill & Interaction ---
    function slidePillToIndex(index) {
        currentActiveIndex = index;
        const pill = DOM.slidingPill;
        pill.classList.remove('is-dragging', 'is-snapping');
        pill.style.borderRadius = '';
        pill.style.transform = `translateX(${index * 100}%)`;
    }

    function initSegmentDragInteraction() {
        const track = DOM.timerModesContainer;
        const pill  = DOM.slidingPill;

        let isDragging = false;
        let dragMoved  = false;
        let startX     = 0;
        let trackInner = 0;
        let segW       = 0;
        let originPx   = 0;

        track.addEventListener('pointerdown', (e) => {
            const pillRect  = pill.getBoundingClientRect();
            const trackRect = track.getBoundingClientRect();
            const hitPill   = e.clientX >= pillRect.left - 8 && e.clientX <= pillRect.right + 8;
            if (!hitPill) return; 

            isDragging  = true;
            dragMoved   = false;
            startX      = e.clientX;
            trackInner  = trackRect.width - 10;
            segW        = trackInner / 3;
            originPx    = currentActiveIndex * segW;

            pill.classList.remove('is-snapping');
            pill.classList.add('is-dragging');
            track.classList.add('pill-dragging');

            try { track.setPointerCapture(e.pointerId); } catch(err) {}
            e.preventDefault(); 
        });

        track.addEventListener('pointermove', (e) => {
            if (!isDragging) return;

            const rawDelta = e.clientX - startX;
            if (Math.abs(rawDelta) > 4) dragMoved = true;
            if (!dragMoved) return;

            let targetPx = originPx + rawDelta;
            const maxPx  = segW * 2;

            // Clamping agar slider tidak melebihi batas container
            targetPx = Math.max(0, Math.min(targetPx, maxPx));

            const speed    = Math.abs(rawDelta);
            const stretchX = 1 + Math.min(speed * 0.003, 0.25);
            const squishY  = 1 - Math.min(speed * 0.0015, 0.15);

            const pointy   = `${Math.max(999 - speed * 1.2, 10)}px`;
            const round    = `999px`;
            const bdr      = rawDelta >= 0
                ? `${pointy} ${round} ${round} ${pointy}`
                : `${round} ${pointy} ${pointy} ${round}`;

            const pct = (targetPx / segW) * 100;
            pill.style.transform    = `translateX(${pct}%) scaleX(${stretchX}) scaleY(${squishY})`;
            pill.style.borderRadius = bdr;
        });

        function handleRelease(e) {
            if (!isDragging) return;
            isDragging = false;
            track.classList.remove('pill-dragging');

            try { track.releasePointerCapture(e.pointerId); } catch(err) {}

            if (!dragMoved) {
                pill.classList.remove('is-dragging');
                pill.style.borderRadius = '';
                pill.style.transform    = `translateX(${currentActiveIndex * 100}%)`;
                return;
            }

            const rawDelta = e.clientX - startX;
            const finalPx  = originPx + rawDelta;
            let snapIndex  = Math.round(finalPx / segW);
            snapIndex      = Math.max(0, Math.min(snapIndex, 2));

            pill.classList.remove('is-dragging');
            pill.style.borderRadius = '';
            void pill.offsetWidth; 
            pill.classList.add('is-snapping');
            pill.style.transform = `translateX(${snapIndex * 100}%)`;

            setTimeout(() => pill.classList.remove('is-snapping'), 420);

            if (snapIndex !== currentActiveIndex) {
                currentActiveIndex = snapIndex;
                const btn = DOM.timerModeBtns[snapIndex];
                if (btn) applyModeSwitch(btn.dataset.mode, snapIndex);
            }
        }

        track.addEventListener('pointerup', handleRelease);
        track.addEventListener('pointercancel', handleRelease);
    }

    // --- Liquid Physics Engine ---
    const LQ_PROFILES = {
        primary: { pressScale: [0.91, 0.91], dragLag: 0.38, dragStretch: 0.006, dragSquish: 0.003, maxStretch: 0.40, maxSquish: 0.22, skewFactor: 0.06, maxSkew: 12 },
        secondary: { pressScale: [0.93, 0.93], dragLag: 0.32, dragStretch: 0.005, dragSquish: 0.0025, maxStretch: 0.32, maxSquish: 0.18, skewFactor: 0.05, maxSkew: 10 },
        round: { pressScale: [0.85, 0.85], pressRotate: -15, dragLag: 0.28, dragStretch: 0.004, dragSquish: 0.004, maxStretch: 0.28, maxSquish: 0.28, skewFactor: 0.0 },
        danger: { pressScale: [0.80, 0.80], pressRotate: -10, dragLag: 0.20, dragStretch: 0.003, dragSquish: 0.003, maxStretch: 0.20, maxSquish: 0.20, skewFactor: 0.0 },
    };

    function bindLiquidPhysics(el, profileName = 'primary') {
        let isDown = false;
        let hasDragged = false;
        let startX = 0, startY = 0;

        function getType() {
            if (el.classList.contains('lq-round'))     return 'round';
            if (el.classList.contains('lq-secondary')) return 'secondary';
            if (el.classList.contains('lq-danger'))    return 'danger';
            return 'primary';
        }

        function getProfile() { return LQ_PROFILES[getType()] || LQ_PROFILES.primary; }

        el.addEventListener('pointerdown', (e) => {
            const prof = getProfile();
            isDown = true; 
            hasDragged = false;
            startX = e.clientX; 
            startY = e.clientY;
            try { el.setPointerCapture(e.pointerId); } catch(_) {}

            el.classList.remove('springing');
            el.classList.add('pressing');
            const [sx, sy] = prof.pressScale || [0.92, 0.92];
            const rot = prof.pressRotate || 0;
            el.style.transform = `scale(${sx}, ${sy}) rotate(${rot}deg)`;
        });

        el.addEventListener('pointermove', (e) => {
            if (!isDown) return;
            const prof = getProfile();
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > 5) hasDragged = true;
            if (!hasDragged) return;

            el.classList.remove('pressing');
            el.classList.add('dragging');

            const absDx = Math.abs(dx), absDy = Math.abs(dy);
            const sx = 1 + Math.min(absDx * prof.dragStretch, prof.maxStretch);
            const sy = 1 - Math.min(absDy * prof.dragSquish, prof.maxSquish);
            const skew = prof.skewFactor ? Math.max(Math.min(dx * prof.skewFactor, prof.maxSkew), -prof.maxSkew) : 0;
            const spinAngle = getType() === 'round' ? dx * 0.5 : 0;

            el.style.transform = [
                `translate(${dx * prof.dragLag}px, ${dy * prof.dragLag}px)`,
                `scaleX(${sx})`,
                `scaleY(${sy})`,
                skew ? `skewX(${skew}deg)` : '',
                spinAngle ? `rotate(${spinAngle}deg)` : ''
            ].filter(Boolean).join(' ');
        });

        function onUp(e) {
            if (!isDown) return;
            isDown = false;
            try { el.releasePointerCapture(e.pointerId); } catch(_) {}

            el.classList.remove('pressing', 'dragging');
            el.classList.add('springing');

            if (getType() === 'round') {
                el.style.transform = 'scale(1) rotate(0deg)';
            } else if (getType() === 'danger') {
                el.style.transform = 'scale(1.15) rotate(5deg)';
                setTimeout(() => { el.style.transform = ''; }, 80);
            } else {
                el.style.transform = '';
            }

            setTimeout(() => {
                el.classList.remove('springing');
                el.style.transform = '';
            }, 580);
        }

        el.addEventListener('pointerup', onUp);
        el.addEventListener('pointercancel', onUp);
    }

    function animateCheckboxPop(checkboxEl) {
        checkboxEl.classList.add('lq-checkbox');
        checkboxEl.style.transform = 'scale(0.7)';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                checkboxEl.style.transition = 'transform 0.5s cubic-bezier(0.34, 1.9, 0.64, 1)';
                checkboxEl.style.transform  = 'scale(1)';
                setTimeout(() => { 
                    checkboxEl.style.transition = ''; 
                    checkboxEl.style.transform = ''; 
                }, 520);
            });
        });
    }

    function initLiquidTargets() {
        document.querySelectorAll('.lq-primary').forEach(el => bindLiquidPhysics(el, 'primary'));
        document.querySelectorAll('.lq-secondary').forEach(el => bindLiquidPhysics(el, 'secondary'));
        document.querySelectorAll('.lq-round').forEach(el => bindLiquidPhysics(el, 'round'));
        document.querySelectorAll('.lq-danger').forEach(el => bindLiquidPhysics(el, 'danger'));
    }

    // --- Theme & User Controls ---
    function initTheme() {
        document.documentElement.setAttribute('data-theme', STATE.theme);
        updateThemeToggleIcon();
    }

    function toggleTheme() {
        STATE.theme = STATE.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('app_theme', STATE.theme);
        document.documentElement.setAttribute('data-theme', STATE.theme);
        updateThemeToggleIcon();
    }

    function updateThemeToggleIcon() {
        const icon = DOM.themeToggleBtn.querySelector('i');
        icon.className = STATE.theme === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    }

    function updateClockAndGreeting() {
        const now = new Date();
        DOM.liveClock.textContent = now.toLocaleTimeString('en-US', { hour12: false });
        DOM.liveDateDisplay.textContent = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
        
        const hour = now.getHours();
        if (hour < 12) STATE.greeting = 'Good Morning';
        else if (hour < 18) STATE.greeting = 'Good Afternoon';
        else STATE.greeting = 'Good Evening';
        
        DOM.greetingText.textContent = STATE.greeting;
    }

    function setupUserEditing() {
        DOM.userNameDisplay.textContent = STATE.user.name;
        DOM.userNameDisplay.addEventListener('click', () => {
            const newName = prompt('Enter preferred name:', STATE.user.name);
            if (newName && newName.trim() !== '') {
                STATE.user.name = newName.trim();
                localStorage.setItem('app_user_name', STATE.user.name);
                DOM.userNameDisplay.textContent = STATE.user.name;
            }
        });
    }

    // --- Timer Controller ---
    function renderTimer() {
        const minutes = Math.floor(STATE.timer.timeLeft / 60);
        const seconds = STATE.timer.timeLeft % 60;
        DOM.timerCountdown.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const totalDuration = STATE.timer.durations[STATE.timer.mode];
        const progressFraction = STATE.timer.timeLeft / totalDuration;
        DOM.timerProgressRing.style.strokeDashoffset = RING_CIRCUMFERENCE * (1 - progressFraction);
    }

    function startTimer() {
        if (STATE.timer.isRunning) {
            clearInterval(STATE.timer.intervalId);
            STATE.timer.isRunning = false;
            DOM.timerStartBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start';
            DOM.timerStateLabel.textContent = 'Paused';
            return;
        }
        
        STATE.timer.isRunning = true;
        DOM.timerStartBtn.innerHTML = '<i class="fa-solid fa-pause"></i> Pause';
        DOM.timerStateLabel.textContent = 'Focusing';
        
        STATE.timer.intervalId = setInterval(() => {
            if (STATE.timer.timeLeft > 0) {
                STATE.timer.timeLeft--;
                renderTimer();
            } else {
                clearInterval(STATE.timer.intervalId);
                STATE.timer.isRunning = false;
                playTimerChime();
                triggerConfetti();
                alert('Session completed!');
                resetTimer();
            }
        }, 1000);
    }

    function resetTimer() {
        clearInterval(STATE.timer.intervalId);
        STATE.timer.isRunning = false;
        STATE.timer.timeLeft = STATE.timer.durations[STATE.timer.mode];
        DOM.timerStartBtn.innerHTML = '<i class="fa-solid fa-play"></i> Start';
        DOM.timerStateLabel.textContent = 'Ready';
        renderTimer();
    }

    function applyModeSwitch(newMode, targetIndex) {
        STATE.timer.mode = newMode;
        document.documentElement.style.setProperty('--accent-active', STATE.timer.colors[newMode]);
        DOM.timerModeBtns.forEach((btn, idx) => btn.classList.toggle('active', idx === targetIndex));
        DOM.timerCountdown.classList.add('mode-changing');
        
        setTimeout(() => { 
            resetTimer(); 
            DOM.timerCountdown.classList.remove('mode-changing'); 
        }, 150);
    }

    function switchTimerModeOnClick(newMode, targetIndex) {
        if (targetIndex === currentActiveIndex) return;
        slidePillToIndex(targetIndex);
        applyModeSwitch(newMode, targetIndex);
    }

    function playTimerChime() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.5);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 1.5);
        } catch (e) {}
    }

    // --- Task Management ---
    function renderTasks() {
        DOM.taskListContainer.innerHTML = '';
        if (STATE.tasks.length === 0) {
            DOM.taskListContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa-regular fa-calendar-check" style="font-size: 28px; margin-bottom: 12px; color: var(--text-tertiary);"></i>
                    <p>No assignments queued up. All caught up!</p>
                </div>`;
            return;
        }
        
        STATE.tasks.forEach((task, index) => {
            const taskEl = document.createElement('div');
            taskEl.className = `task-item ${task.completed ? 'completed' : ''}`;
            taskEl.innerHTML = `
                <div class="task-left">
                    <div class="task-checkbox" data-action="toggle" data-index="${index}">
                        ${task.completed ? '<i class="fa-solid fa-check" style="font-size: 10px;"></i>' : ''}
                    </div>
                    <div class="task-info">
                        <span class="task-title">${escapeHtml(task.title)}</span>
                        <div class="task-meta-details">
                            <span class="subject-tag">${escapeHtml(task.subject)}</span>
                            <span>${formatDeadline(task.deadline)}</span>
                        </div>
                    </div>
                </div>
                ${getDeadlineBadge(task.deadline)}
                <button class="btn-delete-task lq lq-danger" data-action="delete" data-index="${index}">
                    <i class="fa-solid fa-trash-can"></i>
                </button>`;

            const delBtn = taskEl.querySelector('.btn-delete-task');
            if (delBtn) bindLiquidPhysics(delBtn, 'danger');
            
            taskEl.classList.add('animating-in');
            taskEl.style.animationDelay = `${index * 0.045}s`;
            DOM.taskListContainer.appendChild(taskEl);
        });
    }

    function addTask(title, subject, deadline) {
        STATE.tasks.push({ title, subject, deadline, completed: false });
        saveTasks(); 
        renderTasks();
    }

    function toggleTask(index) {
        STATE.tasks[index].completed = !STATE.tasks[index].completed;
        const wasCompleted = STATE.tasks[index].completed;
        saveTasks(); 
        renderTasks();
        
        if (wasCompleted) {
            triggerConfetti();
            const checkboxEls = DOM.taskListContainer.querySelectorAll('.task-checkbox');
            if (checkboxEls[index]) animateCheckboxPop(checkboxEls[index]);
        }
    }

    function deleteTask(index) {
        STATE.tasks.splice(index, 1);
        saveTasks(); 
        renderTasks();
    }

    function saveTasks() { 
        localStorage.setItem('app_tasks', JSON.stringify(STATE.tasks)); 
    }

    function getDeadlineBadge(deadlineString) {
        const now = new Date();
        const deadline = new Date(deadlineString);
        const diffHours = (deadline - now) / (1000 * 60 * 60);
        
        if (diffHours < 0) return `<span class="deadline-badge badge-red"><i class="fa-solid fa-triangle-exclamation"></i> Overdue</span>`;
        if (diffHours <= 24) return `<span class="deadline-badge badge-red"><i class="fa-solid fa-clock"></i> Due &lt; 24h</span>`;
        if (diffHours <= 72) return `<span class="deadline-badge badge-orange"><i class="fa-solid fa-clock"></i> Due &lt; 3 Days</span>`;
        return `<span class="deadline-badge badge-green"><i class="fa-solid fa-calendar"></i> Upcoming</span>`;
    }

    function formatDeadline(deadlineString) {
        return new Date(deadlineString).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    function escapeHtml(str) {
        return str.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    }

    function triggerConfetti() {
        if (typeof confetti === 'function') confetti({ particleCount: 40, spread: 60, origin: { y: 0.8 } });
    }

    // --- Global Event Handling & Initialization ---
    function bindEvents() {
        DOM.themeToggleBtn.addEventListener('click', toggleTheme);
        DOM.timerStartBtn.addEventListener('click', startTimer);
        DOM.timerResetBtn.addEventListener('click', resetTimer);

        DOM.timerModeBtns.forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                switchTimerModeOnClick(btn.dataset.mode, idx);
            });
        });

        DOM.taskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = DOM.taskTitleInput.value.trim();
            const subject = DOM.taskSubjectInput.value;
            const deadline = DOM.taskDeadlineInput.value;
            
            if (title && subject && deadline) {
                addTask(title, subject, deadline);
                DOM.taskForm.reset();
            }
        });

        // Event Delegation untuk Task Items (Menggantikan inline onclick)
        DOM.taskListContainer.addEventListener('click', (e) => {
            const toggleTarget = e.target.closest('[data-action="toggle"]');
            const deleteTarget = e.target.closest('[data-action="delete"]');

            if (toggleTarget) {
                const index = parseInt(toggleTarget.dataset.index, 10);
                toggleTask(index);
            } else if (deleteTarget) {
                const index = parseInt(deleteTarget.dataset.index, 10);
                deleteTask(index);
            }
        });
    }

    function init() {
        initTheme();
        setupUserEditing();
        updateClockAndGreeting();
        setInterval(updateClockAndGreeting, 1000);

        renderTimer();
        renderTasks();
        bindEvents();
        initLiquidTargets();
        initSegmentDragInteraction();

        // Preset Pill Transform
        const pill = DOM.slidingPill;
        pill.style.transition = 'none';
        pill.style.transform  = 'translateX(0%)';
        pill.style.borderRadius = '';
        currentActiveIndex = 0;
        
        requestAnimationFrame(() => requestAnimationFrame(() => {
            pill.style.transition = '';
        }));
    }

    document.addEventListener('DOMContentLoaded', init);
})();