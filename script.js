/**
 * The Endless Atlas - Game Logic
 */

// Secure Frontend Logic - API Key is managed by Netlify
const state = {
    currentQuestion: null,
    isGenerating: false,
    score: 0,
    seenQuestions: []
};

// DOM Elements
const ui = {
    difficulty: document.getElementById('difficulty'),
    region: document.getElementById('region'),
    generateBtn: document.getElementById('generate-btn'),
    gameArea: document.getElementById('game-area'),
    questionText: document.getElementById('question-text'),
    optionsGrid: document.getElementById('options-grid'),
    badgeDifficulty: document.getElementById('badge-difficulty'),
    badgeRegion: document.getElementById('badge-region'),
    feedbackArea: document.getElementById('feedback-area'),
    feedbackText: document.getElementById('feedback-text'),
    nextBtn: document.getElementById('next-btn')
};

// Initialization
function init() {
    addEventListeners();

    // Initial Network Check
    window.addEventListener('offline', () => {
        alert("Please check internet connection");
    });
}

function addEventListeners() {
    ui.generateBtn.addEventListener('click', generateQuestion);
    ui.nextBtn.addEventListener('click', generateQuestion);
}

async function generateQuestion() {
    // 1. Check Internet Connection
    if (!navigator.onLine) {
        alert("Please check internet connection");
        return;
    }

    setLoading(true);
    resetFeedback();

    const difficulty = ui.difficulty.value;
    const region = ui.region.value;

    try {
        const questionData = await fetchTriviaFunction(difficulty, region);
        if (questionData) {
            renderQuestion(questionData);
            ui.gameArea.classList.remove('hidden');
            // Scroll to game area on mobile if needed
            if (window.innerWidth < 600) {
                ui.gameArea.scrollIntoView({ behavior: 'smooth' });
            }
        }
    } catch (error) {
        console.error(error);
        if (!navigator.onLine) {
            alert("Please check internet connection");
        } else {
            alert('Failed to generate question. If running locally, you need netlify-cli. If on Netlify, check API Key settings.');
        }
    } finally {
        setLoading(false);
    }
}

async function fetchTriviaFunction(difficulty, region) {
    // Call the Netlify Serverless Function
    const response = await fetch('/.netlify/functions/trivia', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            difficulty,
            region,
            seenQuestions: state.seenQuestions
        })
    });

    if (!response.ok) {
        // If fetch fails (non-network), throw error
        const err = await response.text();
        throw new Error(`API Error: ${response.status} ${err}`);
    }

    const parsedData = await response.json();

    // Track this question
    state.seenQuestions.push(parsedData.question);

    return parsedData;
}

function renderQuestion(data) {
    state.currentQuestion = data;
    ui.questionText.textContent = data.question;
    ui.badgeDifficulty.textContent = ui.difficulty.value;
    ui.badgeRegion.textContent = ui.region.value;

    ui.optionsGrid.innerHTML = '';

    data.options.forEach((opt, index) => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => checkAnswer(index, btn);
        ui.optionsGrid.appendChild(btn);
    });
}

function checkAnswer(selectedIndex, btnElement) {
    if (!state.currentQuestion) return;

    // Disable all buttons to prevent double guessing
    const buttons = ui.optionsGrid.querySelectorAll('.option-btn');
    buttons.forEach(b => b.disabled = true);

    const isCorrect = selectedIndex === state.currentQuestion.correctIndex;

    if (isCorrect) {
        btnElement.classList.add('correct');
        ui.feedbackText.textContent = "Correct! 🌍";
        ui.feedbackText.style.color = "var(--success-color)";
    } else {
        btnElement.classList.add('wrong');
        ui.feedbackText.textContent = "Wrong!";
        ui.feedbackText.style.color = "var(--error-color)";

        // Highlight the correct one
        buttons[state.currentQuestion.correctIndex].classList.add('correct');
    }

    ui.feedbackArea.classList.remove('hidden');
}

function resetFeedback() {
    ui.feedbackArea.classList.add('hidden');
    ui.feedbackText.textContent = '';
}

function setLoading(isLoading) {
    state.isGenerating = isLoading;
    ui.generateBtn.disabled = isLoading;
    const loader = ui.generateBtn.querySelector('.loader');
    const text = ui.generateBtn.querySelector('.btn-text');

    if (isLoading) {
        loader.classList.remove('hidden');
        text.textContent = 'Exploring...';
    } else {
        loader.classList.add('hidden');
        text.textContent = 'Generate Question';
    }
}

// Start
init();
