let allData = [], currentLevelData = [], currentSetData = [];
let selectedIndices = new Set(), practiceQueue = [];
let currentCardIndex = 0;
const SET_SIZE = 20;

function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    const btn = document.querySelector('.theme-btn');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        btn.innerText = '☀️';
    } else {
        btn.innerText = '🌙';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.querySelector('.theme-btn').innerText = isDark ? '☀️' : '🌙';
}

function loadSavedProgress() {
    const saved = localStorage.getItem('oxford_progress');
    if (saved) {
        const indices = JSON.parse(saved);
        selectedIndices = new Set(indices);
        updateCounter();
    }
}

function saveProgress() {
    localStorage.setItem('oxford_progress', JSON.stringify([...selectedIndices]));
    updateSetProgressUI();
}

function resetProgress() {
    if (confirm("هل أنت متأكد من حذف جميع بيانات الإنجاز والبدء من الصفر؟")) {
        selectedIndices.clear();
        saveProgress();
        renderGrid();
        updateCounter();
    }
}

window.onload = async function () {
    initTheme();
    loadSavedProgress();

    try {
        const response = await fetch('data.json');
        if (!response.ok) throw new Error("File not found");
        const jsonData = await response.json();
        processData(jsonData);
    } catch (error) {
        document.getElementById('loading-msg').innerHTML = `<p style="color:#e74c3c">❌ خطأ: لم يتم العثور على ملف data.json<br></p>`;
    }
};

function processData(jsonData) {
    allData = jsonData.map((item, i) => {
        let raw = item['word'] || item['Word/Phrase'] || "";
        let cefr = item['cefr'] || item['CEFR'] || "Uncategorized";
        let def = item['def'] || item['Definition'] || "...";

        return {
            id: i,
            word: raw.toString().replace(/\(.*\)/, '').trim(),
            pos: raw.toString().match(/\((.*?)\)/)?.[1] || '',
            cefr: cefr,
            def: def
        };
    }).filter(x => x.word);

    const levels = [...new Set(allData.map(d => d.cefr))].sort();
    const select = document.getElementById('cefr-filter');
    levels.forEach(lvl => {
        const opt = document.createElement('option'); opt.value = lvl; opt.innerText = `Level ${lvl}`; select.appendChild(opt);
    });

    document.getElementById('loading-msg').classList.add('hidden');
    document.getElementById('main-interface').classList.remove('hidden');
    generateSets();
}

function generateSets() {
    const level = document.getElementById('cefr-filter').value;
    currentLevelData = allData.filter(d => d.cefr === level);
    const setsCount = Math.ceil(currentLevelData.length / SET_SIZE);
    const setsBar = document.getElementById('sets-bar');
    setsBar.innerHTML = '';

    if (currentLevelData.length === 0) { setsBar.innerHTML = '<span style="color:var(--text-secondary)">لا توجد كلمات</span>'; renderGrid([]); return; }

    for (let i = 0; i < setsCount; i++) {
        const btn = document.createElement('div');
        btn.className = 'set-btn';
        btn.dataset.setIndex = i;
        btn.innerHTML = `<span>مجموعة ${i + 1}</span><span class="set-info">0%</span><div class="set-progress-bar"></div>`;
        btn.onclick = () => loadSet(i, btn);
        setsBar.appendChild(btn);
    }

    updateSetProgressUI();
    if (setsBar.firstChild) setsBar.firstChild.click();
}

function updateSetProgressUI() {
    const levelData = currentLevelData;
    const buttons = document.querySelectorAll('.set-btn');

    buttons.forEach(btn => {
        const i = parseInt(btn.dataset.setIndex);
        const start = i * SET_SIZE;
        const end = start + SET_SIZE;
        const setIds = levelData.slice(start, end).map(d => d.id);
        const completedCount = setIds.filter(id => selectedIndices.has(id)).length;
        const percentage = Math.round((completedCount / setIds.length) * 100);

        btn.querySelector('.set-info').innerText = `${percentage}%`;
        btn.querySelector('.set-progress-bar').style.width = `${percentage}%`;

        if (percentage === 100) {
            btn.style.borderColor = "var(--success)";
            btn.querySelector('.set-info').style.color = "var(--success)";
        } else {
            btn.style.borderColor = "";
            btn.querySelector('.set-info').style.color = "";
        }
    });
}

function loadSet(setIndex, btnElement) {
    document.querySelectorAll('.set-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    const start = setIndex * SET_SIZE;
    const end = start + SET_SIZE;
    currentSetData = currentLevelData.slice(start, end);
    document.getElementById('set-title').innerHTML = `عرض الكلمات من <b>${start + 1}</b> إلى <b>${Math.min(end, currentLevelData.length)}</b> (المستوى ${document.getElementById('cefr-filter').value})`;
    renderGrid();
}

function renderGrid() {
    const grid = document.getElementById('word-grid');
    grid.innerHTML = '';
    if (currentSetData.length === 0) { grid.innerHTML = '<div class="empty-state">لا توجد كلمات للعرض</div>'; return; }
    currentSetData.forEach(item => {
        const isSelected = selectedIndices.has(item.id);
        const div = document.createElement('div');
        div.className = `word-item ${isSelected ? 'selected' : ''}`;
        div.onclick = (e) => { if (e.target.type !== 'checkbox') toggleSelection(item.id); };
        div.innerHTML = `<div><div class="word-text">${item.word}</div><span style="font-size:0.8rem; color:var(--text-secondary);">${item.pos}</span></div><input type="checkbox" ${isSelected ? 'checked' : ''} onchange="toggleSelection(${item.id})">`;
        grid.appendChild(div);
    });
}

function toggleSelection(id) {
    if (selectedIndices.has(id)) selectedIndices.delete(id); else selectedIndices.add(id);
    updateCounter();
    saveProgress();
    renderGrid();
}

function selectAllInSet() {
    const allSelected = currentSetData.every(d => selectedIndices.has(d.id));
    currentSetData.forEach(d => { allSelected ? selectedIndices.delete(d.id) : selectedIndices.add(d.id); });
    updateCounter();
    saveProgress();
    renderGrid();
}

function updateCounter() { document.getElementById('selection-counter').innerText = `${selectedIndices.size} منجز`; }

function startFlashcards() {
    if (selectedIndices.size === 0) { alert("اختر كلمة واحدة على الأقل!"); return; }
    practiceQueue = allData.filter(d => selectedIndices.has(d.id)).sort(() => Math.random() - 0.5);
    currentCardIndex = 0; showCard(0);
    document.getElementById('flashcard-modal').classList.remove('hidden');
}

function showCard(idx) {
    const card = practiceQueue[idx];
    const el = document.getElementById('card-element');
    el.classList.remove('flipped');
    setTimeout(() => {
        document.getElementById('fc-word').innerText = card.word;
        document.getElementById('fc-pos').innerText = card.pos;
        document.getElementById('fc-def').innerText = card.def;
        document.getElementById('fc-level').innerText = card.cefr;
        document.getElementById('current-index').innerText = idx + 1;
        document.getElementById('total-count').innerText = practiceQueue.length;
    }, 200);
}

function flipCard() { document.getElementById('card-element').classList.toggle('flipped'); }
function nextCard() { if (currentCardIndex < practiceQueue.length - 1) showCard(++currentCardIndex); else { alert("🎉 انتهت المجموعة!"); closeFlashcards(); } }
function prevCard() { if (currentCardIndex > 0) showCard(--currentCardIndex); }
function closeFlashcards() { document.getElementById('flashcard-modal').classList.add('hidden'); }
function speakWord() { window.speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(practiceQueue[currentCardIndex].word); u.lang = 'en-GB'; window.speechSynthesis.speak(u); }