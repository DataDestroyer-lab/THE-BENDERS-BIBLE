/* --- STATE MANAGEMENT --- */
let state = {
    mode: 'stub',
    takeUp: 5,
    inputs: {}
};

/* --- INPUT TEMPLATES --- */
const forms = {
    stub: `
        <label>Target Height (Inches)</label>
        <input type="number" id="inp-h" placeholder="Measure floor to top" inputmode="decimal">
        <div class="note" style="color:#666; font-size:0.8rem; margin-top:5px;">*Measures to top of conduit</div>
    `,
    offset: `
        <label>Obstacle Height (Rise)</label>
        <input type="number" id="inp-h" placeholder="e.g. 4.0">
        <label>Distance to Obstacle</label>
        <input type="number" id="inp-d" placeholder="e.g. 30.0">
        <label>Bend Angle</label>
        <select id="inp-a">
            <option value="10">10° (Precision)</option>
            <option value="22.5">22.5° (Standard)</option>
            <option value="30" selected>30° (Preferred)</option>
            <option value="45">45° (Short)</option>
        </select>
    `,
    saddle3: `
        <label>Obstacle Height</label>
        <input type="number" id="inp-h" placeholder="e.g. 2.0">
        <label>Distance to Center</label>
        <input type="number" id="inp-d" placeholder="e.g. 40.0">
    `,
    saddle4: `
        <label>Obstacle Height</label>
        <input type="number" id="inp-h" placeholder="e.g. 4.0">
        <label>Obstacle Width</label>
        <input type="number" id="inp-w" placeholder="e.g. 12.0">
        <label>Start Distance</label>
        <input type="number" id="inp-d" placeholder="e.g. 20.0">
    `,
    rolling: `
        <label>Rise (Vertical Change)</label>
        <input type="number" id="inp-h" placeholder="e.g. 6.0">
        <label>Roll (Horizontal Change)</label>
        <input type="number" id="inp-r" placeholder="e.g. 6.0">
        <label>Angle</label>
        <select id="inp-a">
            <option value="30">30°</option>
            <option value="22.5">22.5°</option>
        </select>
    `
};

/* --- PRO TIPS DATABASE --- */
const tips = {
    stub: "Keep heavy foot pressure on the pedal to prevent the pipe from kinking.",
    offset: "Mark the side farthest from the obstacle first, so you can bend on the floor.",
    saddle3: "The 'Star' or 'Notch' on the rim is for the center of the 45°. Do not use the arrow.",
    saddle4: "A 4-point saddle is just two offsets with a straight piece in the middle.",
    rolling: "Sight down the pipe to ensure your dog-leg is aligned with the corner."
};

/* --- INITIALIZATION --- */
document.addEventListener('DOMContentLoaded', () => {
    loadForm('stub');
    
    // Bender Size Listener
    document.getElementById('bender-size').addEventListener('change', (e) => {
        const val = e.target.value;
        const customBox = document.getElementById('custom-input-group');
        if (val === 'custom') {
            customBox.classList.remove('hidden');
        } else {
            customBox.classList.add('hidden');
            state.takeUp = parseFloat(val);
        }
    });
});

/* --- FUNCTIONS --- */
function toggleSettings() {
    document.getElementById('global-config').classList.toggle('hidden');
}

function switchTab(mode) {
    // UI Updates
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-tab="${mode}"]`).classList.add('active');
    
    if (mode === 'wiki') {
        document.getElementById('calculator-view').classList.add('hidden');
        document.getElementById('wiki-view').classList.remove('hidden');
    } else {
        document.getElementById('calculator-view').classList.remove('hidden');
        document.getElementById('wiki-view').classList.add('hidden');
        state.mode = mode;
        loadForm(mode);
    }
}

function loadForm(mode) {
    const container = document.getElementById('input-section');
    container.innerHTML = forms[mode];
    document.getElementById('result-section').classList.add('hidden');
}

function getTakeUp() {
    const sel = document.getElementById('bender-size').value;
    if (sel === 'custom') {
        return parseFloat(document.getElementById('custom-val').value) || 5;
    }
    return parseFloat(sel);
}

/* --- MATH CORE --- */
function calculate() {
    const h = parseFloat(document.getElementById('inp-h')?.value || 0);
    const d = parseFloat(document.getElementById('inp-d')?.value || 0);
    const w = parseFloat(document.getElementById('inp-w')?.value || 0);
    const ang = parseFloat(document.getElementById('inp-a')?.value || 30);
    const takeUp = getTakeUp();

    let outputHtml = '';
    let marks = []; // { label, pos }

    // Logic Switch
    switch (state.mode) {
        case 'stub':
            const stubMark = h - takeUp;
            outputHtml = createResultStep("Cut/Mark Point", stubMark, "Align Arrow");
            marks.push({ label: "90°", pos: stubMark });
            break;

        case 'offset':
            const offRes = calcOffset(h, ang);
            const m1 = d + offRes.shrink; // Near obstacle
            const m2 = m1 - offRes.travel; // Far from obstacle
            outputHtml = `
                ${createResultStep("Shrink Amount", offRes.shrink.toFixed(3))}
                ${createResultStep("Mark 1 (Near Obstacle)", m1.toFixed(2))}
                ${createResultStep("Mark 2 (Start Bend)", m2.toFixed(2))}
            `;
            marks.push({ label: "Start", pos: m2 }, { label: "End", pos: m1 });
            break;

        case 'saddle3':
            const s3Shrink = h * (3/16);
            const center = d + s3Shrink;
            const dist = h * 2.5;
            outputHtml = `
                ${createResultStep("Center Mark", center.toFixed(2), "Use Rim Notch")}
                ${createResultStep("Outer Marks", dist.toFixed(2), "Distance from center (both ways)")}
            `;
            marks.push(
                { label: "Side", pos: center - dist },
                { label: "Center", pos: center },
                { label: "Side", pos: center + dist }
            );
            break;
            
        case 'saddle4':
            const s4Shrink = h * 0.25; // Locked to 30 deg
            const s4Travel = h * 2.0;
            const startRise = (d + s4Shrink) - s4Travel;
            const startFlat = d + s4Shrink;
            const endFlat = startFlat + w;
            const endDrop = endFlat + s4Travel;
            
            outputHtml = `
                ${createResultStep("Mark 1 (Rise Start)", startRise.toFixed(2))}
                ${createResultStep("Mark 2 (Rise End)", startFlat.toFixed(2))}
                ${createResultStep("Mark 3 (Drop Start)", endFlat.toFixed(2))}
                ${createResultStep("Mark 4 (Drop End)", endDrop.toFixed(2))}
            `;
            marks.push(
                { label: "M1", pos: startRise }, { label: "M2", pos: startFlat },
                { label: "M3", pos: endFlat }, { label: "M4", pos: endDrop }
            );
            break;

        case 'rolling':
            const r = parseFloat(document.getElementById('inp-r').value || 0);
            const trueOff = Math.sqrt((h*h) + (r*r));
            const rollRes = calcOffset(trueOff, ang);
            outputHtml = `
                ${createResultStep("True Offset", trueOff.toFixed(2))}
                ${createResultStep("Distance Between Marks", rollRes.travel.toFixed(2))}
            `;
            marks.push({ label: "Start", pos: 10 }, { label: "End", pos: 10 + rollRes.travel });
            break;
    }

    // Render
    document.getElementById('text-output').innerHTML = outputHtml;
    document.getElementById('result-section').classList.remove('hidden');
    document.getElementById('tip-text').innerText = tips[state.mode];
    
    renderVisuals(marks);
}

function calcOffset(height, angle) {
    let m = 2.0, s = 0.25;
    if (angle === 10) { m = 6.0; s = 0.063; }
    if (angle === 22.5) { m = 2.6; s = 0.188; }
    if (angle === 45) { m = 1.41; s = 0.375; }
    return { travel: height * m, shrink: height * s };
}

function createResultStep(label, value, subtext='') {
    return `
        <div class="step-item">
            <div class="step-label">${label}</div>
            <div class="step-value">${value}"</div>
            ${subtext ? `<div style="font-size:0.8rem; color:#888">${subtext}</div>` : ''}
        </div>
    `;
}

/* --- VISUALIZER ENGINE --- */
function renderVisuals(marks) {
    const canvas = document.getElementById('pipe-canvas');
    canvas.innerHTML = '';
    
    if (marks.length === 0) return;

    // Scaling logic: Find the largest number to fit it in the box
    const maxVal = marks[marks.length - 1].pos;
    const minVal = marks[0].pos;
    // Add buffer for visual padding
    const range = maxVal + (maxVal * 0.2); 
    
    marks.forEach(m => {
        const percent = (m.pos / range) * 100;
        
        const el = document.createElement('div');
        el.className = 'mark-indicator';
        el.style.left = `${percent}%`;
        
        el.innerHTML = `
            <div class="mark-tag">${m.label}</div>
            <div class="mark-dist">${m.pos.toFixed(1)}"</div>
        `;
        
        canvas.appendChild(el);
    });
}