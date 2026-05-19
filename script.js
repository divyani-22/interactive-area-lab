/* =============================================================
   INTERACTIVE VIRTUAL LAB — Double Integrals
   Script
   ============================================================= */

// =============================================================
// CONFIGURATION
// =============================================================
const CONFIG = {
    defaultFxy: '1',
    defaultInnerLow: 'x^2',
    defaultInnerHigh: 'x+2',
    defaultOuterA: -1,
    defaultOuterB: 2,
    viewMin: -5,
    viewMax: 5,
    samples: 150,
};

const COLORS = {
    f: '#2563eb',
    g: '#0d9488',
    shade: '#3b82f6',
    shadeOpacity: 0.12,
};

// =============================================================
// STATE
// =============================================================
let calculator = null;
let currentState = {};

// DOM refs (populated on init)
const $ = (id) => document.getElementById(id);
const dom = {};

// =============================================================
// MATH UTILITIES
// =============================================================

/**
 * Convert a user expression like "x^2" or "sin(x)" to a callable JS function.
 * Returns { fn, error }. fn is null on failure, error contains a message.
 */
function parseExpression(expr) {
    if (!expr || expr.trim() === '') return { fn: null, error: 'Expression cannot be empty.' };

    let sanitized = expr.trim();

    // --- Pre-processing for JavaScript compatibility ---

    // Exponentiation: ^ → **
    sanitized = sanitized.replace(/\^/g, '**');

    // Implicit multiplication: "2x" → "2*x", "3sin(x)" → "3*sin(x)"
    sanitized = sanitized.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
    // Implicit multiplication: ")(" → ")*("
    sanitized = sanitized.replace(/\)\(/g, ')*(');
    // Implicit multiplication: ")letter" → ")*letter"  e.g. (x+1)x
    sanitized = sanitized.replace(/\)([a-zA-Z])/g, ')*$1');
    // Implicit multiplication: "x(" or "x x" etc. — only if preceded by x or constant
    sanitized = sanitized.replace(/([xX])([a-zA-Z(])/g, '$1*$2');

    // Alias: pi → PI, e → E (but don't break "exp", "e" in other words)
    sanitized = sanitized.replace(/\bpi\b/gi, 'PI');
    sanitized = sanitized.replace(/(?<![a-zA-Z])e(?![a-zA-Z])/g, 'E');

    // Build the evaluable function with all supported math names as parameters
    const paramNames = [
        'x',
        'sin','cos','tan','sqrt','abs',
        'log','ln','exp','pow',
        'PI','E','pi','e',
        'asin','acos','atan','atan2',
        'log10','log2',
        'ceil','floor','round',
        'sec','csc','cot',
        'sinh','cosh','tanh',
    ];

    try {
        const compiled = new Function(
            ...paramNames,
            `return (${sanitized});`
        );

        const fn = function (x) {
            try {
                return compiled(
                    x,
                    Math.sin, Math.cos, Math.tan, Math.sqrt, Math.abs,
                    Math.log, Math.log, Math.exp, Math.pow,
                    Math.PI, Math.E, Math.PI, Math.E,
                    Math.asin, Math.acos, Math.atan, Math.atan2,
                    Math.log10, Math.log2,
                    Math.ceil, Math.floor, Math.round,
                    // sec, csc, cot (not native - compute from sin/cos/tan)
                    function sec(x) { var c = Math.cos(x); return c === 0 ? Infinity : 1 / c; },
                    function csc(x) { var s = Math.sin(x); return s === 0 ? Infinity : 1 / s; },
                    function cot(x) { var t = Math.tan(x); return t === 0 ? Infinity : 1 / t; },
                    Math.sinh, Math.cosh, Math.tanh
                );
            } catch {
                return NaN;
            }
        };

        // Quick smoke test: evaluate at x = 0 to catch syntax errors early
        const testVal = fn(0);
        if (testVal === undefined || (isNaN(testVal) && !isFinite(testVal))) {
            // NaN or Inf might be acceptable for some functions (log(0), etc.)
            // Only flag complete failure
        }

        return { fn, error: null };
    } catch (e) {
        let msg = e.message || 'Unknown parsing error';
        // Clean up the message for readability
        msg = msg.replace(/^.*:\s*/, '');
        return { fn: null, error: msg };
    }
}

/**
 * Convert a user expression like "x*y" or "x^2+y^2" to a callable JS function of (x, y).
 * Returns { fn, error }.
 */
function parseExpressionXY(expr) {
    if (!expr || expr.trim() === '') return { fn: null, error: 'Expression cannot be empty.' };

    let sanitized = expr.trim();

    sanitized = sanitized.replace(/\^/g, '**');
    sanitized = sanitized.replace(/(\d)([a-zA-Z(])/g, '$1*$2');
    sanitized = sanitized.replace(/\)\(/g, ')*(');
    sanitized = sanitized.replace(/\)([a-zA-Z])/g, ')*$1');
    sanitized = sanitized.replace(/([xXyY])([a-zA-Z(])/g, '$1*$2');
    sanitized = sanitized.replace(/\bpi\b/gi, 'PI');
    sanitized = sanitized.replace(/(?<![a-zA-Z])e(?![a-zA-Z])/g, 'E');

    const paramNames = [
        'x', 'y',
        'sin','cos','tan','sqrt','abs',
        'log','ln','exp','pow',
        'PI','E','pi','e',
        'asin','acos','atan','atan2',
        'log10','log2',
        'ceil','floor','round',
        'sec','csc','cot',
        'sinh','cosh','tanh',
    ];

    try {
        const compiled = new Function(
            ...paramNames,
            `return (${sanitized});`
        );

        const fn = function (x, y) {
            try {
                return compiled(
                    x, y,
                    Math.sin, Math.cos, Math.tan, Math.sqrt, Math.abs,
                    Math.log, Math.log, Math.exp, Math.pow,
                    Math.PI, Math.E, Math.PI, Math.E,
                    Math.asin, Math.acos, Math.atan, Math.atan2,
                    Math.log10, Math.log2,
                    Math.ceil, Math.floor, Math.round,
                    function sec(x) { var c = Math.cos(x); return c === 0 ? Infinity : 1 / c; },
                    function csc(x) { var s = Math.sin(x); return s === 0 ? Infinity : 1 / s; },
                    function cot(x) { var t = Math.tan(x); return t === 0 ? Infinity : 1 / t; },
                    Math.sinh, Math.cosh, Math.tanh
                );
            } catch {
                return NaN;
            }
        };

        const testVal = fn(0, 0);
        if (testVal === undefined || (isNaN(testVal) && !isFinite(testVal))) {
        }

        return { fn, error: null };
    } catch (e) {
        let msg = e.message || 'Unknown parsing error';
        msg = msg.replace(/^.*:\s*/, '');
        return { fn: null, error: msg };
    }
}

/**
 * Numerical integration using Simpson's rule.
 */
function simpsonsRule(fn, a, b, n) {
    n = n || 200;
    if (n % 2 !== 0) n++;
    const h = (b - a) / n;
    let sum = fn(a) + fn(b);
    for (let i = 1; i < n; i++) {
        const x = a + i * h;
        sum += fn(x) * (i % 2 === 0 ? 2 : 4);
    }
    return (h / 3) * sum;
}

function evaluateInnerIntegral(fxyFn, x, g1Fn, g2Fn) {
    const inner = function (y) { return fxyFn(x, y); };
    return simpsonsRule(inner, g1Fn(x), g2Fn(x));
}

function computeDoubleIntegral(fxyFn, g1Fn, g2Fn, a, b) {
    const outer = function (x) { return evaluateInnerIntegral(fxyFn, x, g1Fn, g2Fn); };
    return simpsonsRule(outer, a, b);
}

// =============================================================
// DESMOS MANAGEMENT
// =============================================================

function initDesmos() {
    if (typeof Desmos === 'undefined') {
        setTimeout(initDesmos, 200);
        return;
    }

    const el = dom.calculator;
    if (!el) return;

    calculator = Desmos.Calculator(el, {
        expressions: false,
        settingsMenu: true,
        zoomButtons: true,
        lockViewport: false,
        border: false,
        xAxisLabel: 'x',
        yAxisLabel: 'y',
        backgroundColor: '#f8fafc',
    });

    calculator.setMathBounds({
        left: CONFIG.viewMin,
        right: CONFIG.viewMax,
        bottom: -3,
        top: 8,
    });

    plotGraph();
}

function plotGraph() {
    if (!calculator) return;

    const fxyRaw = dom.inputFxy.value.trim();
    const g1Raw = dom.inputInnerLow.value.trim();
    const g2Raw = dom.inputInnerHigh.value.trim();
    const a = parseFloat(dom.inputOuterA.value);
    const b = parseFloat(dom.inputOuterB.value);

    if (isNaN(a) || isNaN(b) || a >= b) {
        showError('Invalid outer limits: a must be less than b.');
        return;
    }

    const fxyResult = parseExpressionXY(fxyRaw);
    const g1Result = parseExpression(g1Raw);
    const g2Result = parseExpression(g2Raw);

    if (fxyResult.error) { showError(`Invalid f(x,y): ${fxyResult.error}`); return; }
    if (g1Result.error) { showError(`Invalid g₁(x): ${g1Result.error}`); return; }
    if (g2Result.error) { showError(`Invalid g₂(x): ${g2Result.error}`); return; }

    const fxyFn = fxyResult.fn;
    const g1Fn = g1Result.fn;
    const g2Fn = g2Result.fn;

    const viewMin = parseFloat(dom.inputViewMin.value) || CONFIG.viewMin;
    const viewMax = parseFloat(dom.inputViewMax.value) || CONFIG.viewMax;

    calculator.setMathBounds({
        left: viewMin,
        right: viewMax,
        bottom: -5,
        top: 10,
    });

    currentState = { fxyFn, g1Fn, g2Fn, fxyRaw, g1Raw, g2Raw, a, b, viewMin, viewMax };

    calculator.removeExpression({ id: 'g1-curve' });
    calculator.removeExpression({ id: 'g2-curve' });
    calculator.removeExpression({ id: 'shade' });

    calculator.setExpression({
        id: 'g1-curve',
        latex: `y = ${g1Raw}`,
        color: COLORS.g,
        lineWidth: 2.5,
    });

    calculator.setExpression({
        id: 'g2-curve',
        latex: `y = ${g2Raw}`,
        color: COLORS.f,
        lineWidth: 2.5,
    });

    renderShadedRegion(g1Fn, g2Fn, a, b);

    document.getElementById('solution-placeholder').style.display = 'block';
    document.getElementById('solution-steps').style.display = 'none';
}

/**
 * Render the shaded region between two boundary curves on the Desmos graph using a polygon.
 */
function renderShadedRegion(lowerFn, upperFn, a, b) {
    if (!calculator) return;

    const samples = CONFIG.samples;
    const step = (b - a) / samples;
    const lowerPts = [];
    const upperPts = [];

    for (let i = 0; i <= samples; i++) {
        const x = a + i * step;
        const yLow = lowerFn(x);
        const yUp = upperFn(x);
        if (isNaN(yLow) || isNaN(yUp) || !isFinite(yLow) || !isFinite(yUp)) continue;
        if (yLow <= yUp) {
            lowerPts.push({ x, y: yLow });
            upperPts.push({ x, y: yUp });
        } else {
            lowerPts.push({ x, y: yUp });
            upperPts.push({ x, y: yLow });
        }
    }

    if (lowerPts.length < 3) return;

    const all = [...lowerPts, ...upperPts.reverse()];
    const coords = all.map(p => `(${p.x.toFixed(6)},${p.y.toFixed(6)})`).join(',');

    calculator.setExpression({
        id: 'shade',
        latex: `polygon(${coords})`,
        color: COLORS.shade,
        fillOpacity: COLORS.shadeOpacity,
        lineOpacity: 0,
        pointOpacity: 0,
    });
}

// =============================================================
// SOLUTION GENERATION
// =============================================================

function showSolution() {
    const { fxyFn, g1Fn, g2Fn, fxyRaw, g1Raw, g2Raw, a, b } = currentState;
    if (!fxyFn || !g1Fn || !g2Fn) {
        showError('Please plot a graph first.');
        return;
    }

    const placeholder = document.getElementById('solution-placeholder');
    const container = document.getElementById('solution-steps');
    placeholder.style.display = 'none';
    container.style.display = 'block';

    const result = computeDoubleIntegral(fxyFn, g1Fn, g2Fn, a, b);

    const steps = [];

    steps.push({
        title: 'Setting Up the Double Integral',
        content: `$$\\iint_R ${fxyRaw}\\,dA = \\int_{${a.toFixed(4)}}^{${b.toFixed(4)}} \\int_{${g1Raw}}^{${g2Raw}} ${fxyRaw}\\,dy\\,dx$$`,
    });

    steps.push({
        title: 'Inner Integration (y)',
        content: `For each $x$, integrate $f(x,y)$ with respect to $y$ from $${g1Raw}$ to $${g2Raw}$. The inner integral is evaluated numerically using Simpson's rule at each $x$-slice.`,
    });

    steps.push({
        title: 'Outer Integration (x)',
        content: `Integrate the result of the inner integral with respect to $x$ from $${a.toFixed(4)}$ to $${b.toFixed(4)}$ using Simpson's rule.`,
    });

    steps.push({
        title: 'Final Answer',
        content: `$$\\iint_R ${fxyRaw}\\,dA \\approx ${result.toFixed(6)}$$`,
        isAnswer: true,
    });

    renderSolutionSteps(container, steps);
    reflowMathJax();
}

function renderSolutionSteps(container, steps) {
    container.innerHTML = `<div class="solution-wrapper">${steps.map((step, i) => `
        <div class="solution-step${step.isAnswer ? ' solution-answer' : ''}" style="animation-delay:${i * 0.1}s">
            <div class="solution-step-header">
                <span class="step-number">${i + 1}</span>
                <span class="step-title">${step.title}</span>
            </div>
            <p>${step.content}</p>
        </div>
    `).join('')}</div>`;
}

function reflowMathJax() {
    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise();
    }
}

// =============================================================
// UI HELPERS
// =============================================================

function showError(msg) {
    const existing = document.querySelector('.toast-error');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-error';
    toast.textContent = msg;
    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(211, 47, 47, 0.9)',
        color: '#fff',
        padding: '0.8rem 1.6rem',
        borderRadius: '10px',
        fontFamily: 'var(--font-sans)',
        fontSize: '0.9rem',
        fontWeight: '500',
        zIndex: '9999',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        animation: 'fadeUp 0.3s ease-out',
        maxWidth: '90vw',
        textAlign: 'center',
    });
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// =============================================================
// EVENT HANDLERS
// =============================================================

function handlePlot() {
    plotGraph();
}

function handleReset() {
    dom.inputFxy.value = CONFIG.defaultFxy;
    dom.inputInnerLow.value = CONFIG.defaultInnerLow;
    dom.inputInnerHigh.value = CONFIG.defaultInnerHigh;
    dom.inputOuterA.value = CONFIG.defaultOuterA;
    dom.inputOuterB.value = CONFIG.defaultOuterB;
    dom.inputViewMin.value = CONFIG.viewMin;
    dom.inputViewMax.value = CONFIG.viewMax;
    currentState = {};

    if (calculator) {
        calculator.setMathBounds({
            left: CONFIG.viewMin,
            right: CONFIG.viewMax,
            bottom: -3,
            top: 8,
        });
    }

    plotGraph();
}

function handleSolution() {
    showSolution();
}

// =============================================================
// SCROLL ANIMATIONS
// =============================================================

function setupScrollAnimations() {
    const cards = document.querySelectorAll('.theory-card, .formula-highlight, .lab-controls, .lab-graph');
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        },
        { threshold: 0.1 }
    );

    cards.forEach((card) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(24px)';
        card.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
        observer.observe(card);
    });
}

// =============================================================
// INITIALIZATION
// =============================================================

function init() {
    // Cache DOM refs
    dom.calculator = document.getElementById('desmos-calculator');
    dom.inputFxy = document.getElementById('func-fxy');
    dom.inputInnerLow = document.getElementById('inner-low');
    dom.inputInnerHigh = document.getElementById('inner-high');
    dom.inputOuterA = document.getElementById('outer-a');
    dom.inputOuterB = document.getElementById('outer-b');
    dom.inputViewMin = document.getElementById('view-min');
    dom.inputViewMax = document.getElementById('view-max');
    dom.btnPlot = document.getElementById('btn-plot');
    dom.btnReset = document.getElementById('btn-reset');
    dom.btnSolution = document.getElementById('btn-solution');

    // Bind events
    dom.btnPlot.addEventListener('click', handlePlot);
    dom.btnReset.addEventListener('click', handleReset);
    dom.btnSolution.addEventListener('click', handleSolution);

    // Keyboard: Enter on inputs triggers plot
    const plotInputs = [dom.inputFxy, dom.inputInnerLow, dom.inputInnerHigh, dom.inputOuterA, dom.inputOuterB, dom.inputViewMin, dom.inputViewMax];
    plotInputs.forEach((el) => {
        el.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handlePlot();
        });
    });

    // Scroll animations
    setupScrollAnimations();

    // Init Desmos (polls until API is ready)
    initDesmos();
}

document.addEventListener('DOMContentLoaded', init);

// =============================================================
// QUIZ
// =============================================================
const quizData = [
    {
        question: 'Evaluate $\\iint xy(x+y) \\,dx\\,dy$ over the region bounded by $y=x^2$ and $y=x$.',
        options: ['$\\frac{1}{14}$', '$\\frac{3}{56}$', '$\\frac{5}{56}$', '$\\frac{1}{8}$'],
        correctAnswer: 1,
        explanation: 'Limits: $x:0\\to1$, $y:x^2\\to x$. Evaluating the double integral gives $\\frac{3}{56}$.'
    },
    {
        question: 'Evaluate $\\iint y \\,dx\\,dy$ over the region bounded by $y=x^2$ and $x+y=2$.',
        options: ['$\\frac{18}{5}$', '$\\frac{36}{5}$', '$\\frac{54}{5}$', '$\\frac{72}{5}$'],
        correctAnswer: 1,
        explanation: 'Curves intersect at $x=-2$ and $x=1$. Limits: $x:-2\\to1$, $y:x^2\\to2-x$. Evaluation gives $\\frac{36}{5}$.'
    },
    {
        question: 'Evaluate $\\iint (x^2+y^2) \\,dx\\,dy$ over the triangle with vertices $(0,1),(1,1),(1,2)$.',
        options: ['$\\frac{5}{6}$', '$\\frac{7}{6}$', '$1$', '$\\frac{4}{3}$'],
        correctAnswer: 1,
        explanation: 'Limits: $x:0\\to1$, $y:1\\to x+1$. Evaluating gives $\\frac{7}{6}$.'
    },
    {
        question: 'Evaluate $\\iint e^{y^2} \\,dx\\,dy$ over the triangle with vertices $(0,0),(2,1),(0,1)$.',
        options: ['$e$', '$e-1$', '$e+1$', '$\\frac{e}{2}$'],
        correctAnswer: 1,
        explanation: 'Limits: $y:0\\to1$, $x:0\\to2y$. $\\iint e^{y^2}\\,dx\\,dy = \\int_0^1 2y e^{y^2}\\,dy = e-1$.'
    },
    {
        question: 'Evaluate $\\iint \\sqrt{4x^2-y^2} \\,dx\\,dy$ over the region bounded by $y=0$, $y=x$, $x=1$.',
        options: [
            '$\\frac{1}{3}\\left(\\frac{\\pi}{3}+\\frac{\\sqrt{3}}{2}\\right)$',
            '$\\frac{1}{2}\\left(\\frac{\\pi}{3}+\\frac{\\sqrt{3}}{2}\\right)$',
            '$\\frac{1}{3}\\left(\\frac{\\pi}{2}+\\frac{\\sqrt{3}}{2}\\right)$',
            '$\\frac{1}{3}\\left(\\frac{\\pi}{3}+\\frac{\\sqrt{3}}{4}\\right)$'
        ],
        correctAnswer: 0,
        explanation: 'Limits: $x:0\\to1$, $y:0\\to x$. The integral evaluates to $\\frac{1}{3}\\left(\\frac{\\pi}{3}+\\frac{\\sqrt{3}}{2}\\right)$.'
    },
    {
        question: 'Evaluate $\\iint xy \\,dx\\,dy$ over the region bounded by the $x$-axis, $x=2a$, and the parabola $x^2=4ay$.',
        options: ['$\\frac{a^4}{6}$', '$\\frac{a^4}{3}$', '$\\frac{a^4}{2}$', '$\\frac{a^4}{4}$'],
        correctAnswer: 1,
        explanation: 'Limits: $x:0\\to2a$, $y:0\\to\\frac{x^2}{4a}$. Evaluation gives $\\frac{a^4}{3}$.'
    },
    {
        question: 'Evaluate $\\iint xy \\,dx\\,dy$ over the region bounded by $x^2=y$ and $y^2=-x$.',
        options: ['$-\\frac{1}{6}$', '$-\\frac{1}{8}$', '$-\\frac{1}{12}$', '$\\frac{1}{12}$'],
        correctAnswer: 2,
        explanation: 'Intersection: $(0,0)$ and $(-1,1)$. Limits: $x:-1\\to0$, $y:x^2\\to\\sqrt{-x}$. Evaluation gives $-\\frac{1}{12}$.'
    },
    {
        question: 'Evaluate $\\iint \\sqrt{xy(1-x-y)} \\,dx\\,dy$ over the region bounded by $x=0$, $y=0$, $x+y=1$.',
        options: ['$\\frac{2\\pi}{105}$', '$\\frac{\\pi}{105}$', '$\\frac{2\\pi}{315}$', '$\\frac{\\pi}{210}$'],
        correctAnswer: 0,
        explanation: 'Using Beta function substitution, the integral evaluates to $\\frac{2\\pi}{105}$.'
    },
    {
        question: 'Evaluate $\\iint \\frac{dx\\,dy}{x^4+y^2}$ over the region $y \\ge x^2$, $x \\ge 1$.',
        options: ['$\\frac{\\pi}{4}$', '$\\frac{\\pi}{2}$', '$\\frac{\\pi}{8}$', '$\\frac{\\pi}{6}$'],
        correctAnswer: 0,
        explanation: 'Using a polar-like substitution, the integral evaluates to $\\frac{\\pi}{4}$.'
    },
    {
        question: 'Evaluate $\\iint \\frac{xy}{\\sqrt{1-y^2}} \\,dx\\,dy$ over the positive quadrant of $x^2+y^2=1$.',
        options: ['$\\frac{1}{3}$', '$\\frac{1}{2}$', '$\\frac{1}{6}$', '$\\frac{1}{12}$'],
        correctAnswer: 2,
        explanation: 'Limits: $y:0\\to1$, $x:0\\to\\sqrt{1-y^2}$. Evaluation gives $\\frac{1}{6}$.'
    }
];

const quizState = {
    current: 0,
    userAnswers: new Array(10).fill(null),
    visited: new Array(10).fill(false),
    marked: new Array(10).fill(false),
    submitted: false
};

const quizLabels = ['A', 'B', 'C', 'D'];

let timerInterval = null;
let timeRemaining = 1800;

function startTimer() {
    if (timerInterval) return;
    timerInterval = setInterval(function () {
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            if (!quizState.submitted) {
                quizState.submitted = true;
                document.getElementById('quiz-panel').style.display = 'none';
                document.getElementById('quiz-palette').style.display = 'none';
                showAnalysis();
            }
        }
    }, 1000);
}

function updateTimerDisplay() {
    var el = document.getElementById('q-timer');
    if (!el) return;
    var mins = Math.floor(timeRemaining / 60);
    var secs = timeRemaining % 60;
    el.textContent = (mins < 10 ? '0' : '') + mins + ':' + (secs < 10 ? '0' : '') + secs;
    if (timeRemaining <= 300) {
        el.classList.add('warning');
    } else {
        el.classList.remove('warning');
    }
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function getStatus(i) {
    if (quizState.marked[i]) return 'marked';
    if (quizState.userAnswers[i] !== null) return 'answered';
    if (quizState.visited[i]) return 'visited';
    return 'not-visited';
}

function updatePalette() {
    var grid = document.getElementById('palette-grid');
    grid.innerHTML = '';
    for (var i = 0; i < 10; i++) {
        var btn = document.createElement('button');
        btn.className = 'palette-btn';
        btn.textContent = i + 1;
        var st = getStatus(i);
        if (st === 'marked') btn.classList.add('state-marked');
        else if (st === 'answered') btn.classList.add('state-answered');
        else if (st === 'visited') btn.classList.add('state-visited');
        if (i === quizState.current) btn.classList.add('active');
        btn.addEventListener('click', makeGoTo(i));
        grid.appendChild(btn);
    }
}

function makeGoTo(i) {
    return function () { goToQuestion(i); };
}

function renderQuestion() {
    var q = quizData[quizState.current];
    var qNum = document.getElementById('q-number');
    var qText = document.getElementById('q-text');
    var qOptions = document.getElementById('q-options');
    var badge = document.querySelector('.q-status-marked');
    var btnPrev = document.getElementById('btn-prev');
    var btnNext = document.getElementById('btn-next');

    qNum.textContent = 'Question ' + (quizState.current + 1) + ' of 10';

    if (quizState.marked[quizState.current]) {
        badge.style.display = 'inline';
    } else {
        badge.style.display = 'none';
    }

    qText.innerHTML = q.question;

    qOptions.innerHTML = '';
    for (var i = 0; i < q.options.length; i++) {
        (function (optIdx) {
            var div = document.createElement('div');
            div.className = 'q-option';
            if (quizState.userAnswers[quizState.current] === optIdx) {
                div.classList.add('selected');
            }
            div.innerHTML =
                '<span class="option-radio"></span>' +
                '<span class="option-label">' + quizLabels[optIdx] + '.</span>' +
                '<span class="option-text">' + q.options[optIdx] + '</span>';
            div.addEventListener('click', function () { selectOption(optIdx); });
            qOptions.appendChild(div);
        })(i);
    }

    btnPrev.disabled = quizState.current === 0;

    if (quizState.current === 9) {
        btnNext.textContent = 'Submit';
        btnNext.className = 'btn-primary btn-submit-final';
        btnNext.onclick = submitQuiz;
    } else {
        btnNext.textContent = 'Next';
        btnNext.className = 'btn-primary';
        btnNext.onclick = nextQuestion;
    }

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([qText, qOptions]);
    }

    updatePalette();
}

function selectOption(index) {
    if (quizState.submitted) return;
    quizState.userAnswers[quizState.current] = index;
    quizState.visited[quizState.current] = true;
    renderQuestion();
}

function clearResponse() {
    if (quizState.submitted) return;
    quizState.userAnswers[quizState.current] = null;
    renderQuestion();
}

function goToQuestion(index) {
    if (quizState.submitted) return;
    quizState.visited[index] = true;
    quizState.current = index;
    renderQuestion();
}

function prevQuestion() {
    if (quizState.current > 0) goToQuestion(quizState.current - 1);
}

function nextQuestion() {
    if (quizState.current < 9) goToQuestion(quizState.current + 1);
}

function markForReview() {
    if (quizState.submitted) return;
    quizState.marked[quizState.current] = !quizState.marked[quizState.current];
    quizState.visited[quizState.current] = true;
    renderQuestion();
}

function calculateScore() {
    var correct = 0;
    var incorrect = 0;
    var unattempted = 0;
    var marked = 0;
    for (var i = 0; i < 10; i++) {
        if (getStatus(i) === 'marked') marked++;
        if (quizState.userAnswers[i] === null) {
            unattempted++;
        } else if (quizState.userAnswers[i] === quizData[i].correctAnswer) {
            correct++;
        } else {
            incorrect++;
        }
    }
    return { correct: correct, incorrect: incorrect, unattempted: unattempted, marked: marked, total: 10 };
}

function submitQuiz() {
    if (quizState.submitted) return;
    stopTimer();
    if (!confirm('Are you sure you want to submit the quiz?')) {
        startTimer();
        return;
    }
    quizState.submitted = true;
    document.getElementById('quiz-panel').style.display = 'none';
    document.getElementById('quiz-palette').style.display = 'none';
    showAnalysis();
}

function showAnalysis() {
    var container = document.getElementById('quiz-analysis');
    container.style.display = 'block';

    var score = calculateScore();
    var percentage = Math.round((score.correct / score.total) * 100);
    var msg = percentage >= 70 ? 'Great job!' : percentage >= 40 ? 'Good effort!' : 'Keep practicing!';

    var html =
        '<div class="analysis-header">' +
            '<div class="score">' + score.correct + ' / ' + score.total + '</div>' +
            '<div class="score-label">Score</div>' +
            '<div class="analysis-percentage">' + percentage + '%</div>' +
            '<div class="analysis-score-bar">' +
                '<span class="sc-correct">Correct: ' + score.correct + '</span>' +
                '<span class="sc-incorrect">Incorrect: ' + score.incorrect + '</span>' +
                '<span class="sc-unattempted">Unattempted: ' + score.unattempted + '</span>' +
            '</div>' +
            '<div class="score-detail">' + msg + '</div>' +
        '</div>' +
        '<div class="analysis-stats">' +
            '<div class="stat-card stat-correct">' + score.correct + '<small>Correct</small></div>' +
            '<div class="stat-card stat-incorrect">' + score.incorrect + '<small>Incorrect</small></div>' +
            '<div class="stat-card stat-unattempted">' + score.unattempted + '<small>Unattempted</small></div>' +
            '<div class="stat-card stat-marked">' + score.marked + '<small>Marked</small></div>' +
        '</div>';

    for (var i = 0; i < quizData.length; i++) {
        var q = quizData[i];
        var userAns = quizState.userAnswers[i];
        var isCorrect = userAns !== null && userAns === q.correctAnswer;
        var isUnattempted = userAns === null;
        var statusText, statusClass, statusIcon;

        if (isCorrect) { statusText = 'Correct'; statusClass = 'correct'; statusIcon = '&#10003;'; }
        else if (isUnattempted) { statusText = 'Unattempted'; statusClass = 'unattempted'; statusIcon = '&mdash;'; }
        else { statusText = 'Wrong'; statusClass = 'incorrect'; statusIcon = '&#10007;'; }

        html +=
            '<div class="analysis-question ' + statusClass + '">' +
                '<div class="analysis-q-header">' +
                    '<span class="analysis-q-num">Q' + (i + 1) + '</span>' +
                    '<span class="analysis-q-badge ' + statusClass + '">' + statusIcon + ' ' + statusText + '</span>' +
                '</div>' +
                '<div class="analysis-q-text">' + q.question + '</div>' +
                '<div class="analysis-q-options">';

        for (var j = 0; j < q.options.length; j++) {
            var isCorrectOpt = j === q.correctAnswer;
            var isUserWrong = userAns === j && !isCorrect;
            var optClass = isCorrectOpt ? 'opt-correct' : isUserWrong ? 'opt-wrong' : '';
            var optIcon = isCorrectOpt ? '&#10003;' : isUserWrong ? '&#10007;' : '';
            var markerHtml = optIcon
                ? '<span class="opt-icon">' + optIcon + '</span>'
                : '<span class="opt-letter">' + quizLabels[j] + '</span>';
            html +=
                '<div class="analysis-q-option ' + optClass + '">' +
                    '<span class="option-marker">' + markerHtml + '</span>' +
                    '<span class="option-text">' + q.options[j] + '</span>' +
                '</div>';
        }

        var userAnsText = userAns !== null
            ? quizLabels[userAns] + '. ' + q.options[userAns]
            : 'Not attempted';

        html +=
                '</div>' +
                '<div class="analysis-q-answer"><strong>Your answer:</strong> ' + userAnsText + '</div>' +
                '<div class="analysis-q-answer"><strong>Correct answer:</strong> ' + quizLabels[q.correctAnswer] + '. ' + q.options[q.correctAnswer] + '</div>' +
                '<div class="analysis-q-explanation"><strong>Explanation:</strong> ' + q.explanation + '</div>' +
            '</div>';
    }

    container.innerHTML = html;

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([container]);
    }
}

function initQuiz() {
    document.getElementById('btn-prev').onclick = prevQuestion;
    document.getElementById('btn-next').onclick = nextQuestion;
    document.getElementById('btn-mark').onclick = markForReview;
    document.getElementById('btn-clear').onclick = clearResponse;
    document.getElementById('btn-start-quiz').addEventListener('click', startQuiz);
}

function startQuiz() {
    var intro = document.getElementById('quiz-intro');
    var container = document.getElementById('quiz-container');
    if (!intro || !container) return;
    intro.style.display = 'none';
    container.style.display = 'block';
    quizState.visited[0] = true;
    renderQuestion();
    startTimer();
}

document.addEventListener('DOMContentLoaded', initQuiz);
