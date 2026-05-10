#!/usr/bin/env node
/**
 * Build script: generates a standalone index.html for a given event config.
 *
 * Usage:
 *   node build.js <event-name>
 *   node build.js julius
 *   node build.js jacob
 *
 * Output: dist/<event-name>/index.html
 */

const fs = require('fs');
const path = require('path');

const eventName = process.argv[2];
if (!eventName) {
  console.error('Usage: node build.js <event-name>');
  console.error('Available events:');
  const eventsDir = path.join(__dirname, 'events');
  fs.readdirSync(eventsDir).forEach(d => {
    if (fs.statSync(path.join(eventsDir, d)).isDirectory()) {
      console.error(`  - ${d}`);
    }
  });
  process.exit(1);
}

const configPath = path.join(__dirname, 'events', eventName, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error(`Config not found: ${configPath}`);
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const templatePath = path.join(__dirname, 'template.html');
const template = fs.readFileSync(templatePath, 'utf8');

// Simple template replacement
let html = template;

// Replace all {{expression}} placeholders
html = html.replace(/\{\{([\w.]+)\}\}/g, (match, key) => {
  const parts = key.split('.');
  let val = config;
  for (const p of parts) {
    if (val == null) return match;
    val = val[p];
  }
  return val != null ? val : match;
});

// Generate intro lines
const introHtml = config.intro
  .map((line, i) => {
    const blink = i === config.intro.length - 1 ? ' <span class="blink">▋</span>' : '';
    return `    <p class="prompt">${line}${blink}</p>`;
  })
  .join('\n');
html = html.replace('{{INTRO_LINES}}', introHtml);

// Generate puzzle steps
const puzzleHtml = config.puzzles
  .map((puzzle, i) => generatePuzzleStep(puzzle, i + 1))
  .join('\n\n');
html = html.replace('{{PUZZLE_STEPS}}', puzzleHtml);

// Generate final code inputs
const codeLength = config.finalCode.length;
const codeInputs = Array.from({ length: codeLength }, (_, i) =>
  `      <input id="c${i + 1}" maxlength="1" placeholder="?" autocomplete="off" />`
).join('\n');
html = html.replace('{{CODE_INPUTS}}', codeInputs);

// Generate JS validation
const jsBlock = generateJS(config);
html = html.replace('{{PUZZLE_JS}}', jsBlock);

// Victory content
html = html.replace('{{victory.message}}', config.victory.message.replace(/\n/g, '<br>'));

// Output
const outDir = path.join(__dirname, 'dist', eventName);
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'index.html');
fs.writeFileSync(outPath, html, 'utf8');
console.log(`✓ Built: ${outPath}`);

// ─── Helpers ───

function generatePuzzleStep(puzzle, num) {
  const fragmentLetter = puzzle.fragment || puzzle.answer;

  let bodyContent = `        <p>${puzzle.description}</p>\n`;
  bodyContent += `        <div class="clue-box" style="font-size:1.3rem;letter-spacing:0.35em">${puzzle.clue}</div>\n`;

  if (puzzle.helperTable) {
    const lines = puzzle.helperTable.split('\n').join('<br>\n          ');
    bodyContent += `        <div class="highlight-box"><strong class="g">ASCII hex-tabel (udvalg):</strong><br>\n          ${lines}\n        </div>\n`;
  }

  if (puzzle.showMorseTable) {
    bodyContent += `        <div class="morse-grid">
          <span>A · –</span><span>B – · · ·</span><span>C – · – ·</span><span>D – · ·</span>
          <span>E ·</span><span>F · · – ·</span><span>G – – ·</span><span>H · · · ·</span>
          <span>I · ·</span><span>J · – – –</span><span>K – · –</span><span>L · – · ·</span>
          <span>M – –</span><span>N – ·</span><span>O – – –</span><span>P · – – ·</span>
          <span>Q – – · –</span><span>R · – ·</span><span>S · · ·</span><span>T –</span>
          <span>U · · –</span><span>V · · · –</span><span>W · – –</span><span>X – · · –</span>
          <span>Y – · – –</span><span>Z – – · ·</span>
        </div>\n`;
  }

  if (puzzle.hint) {
    bodyContent += `        <p class="muted">${puzzle.hint}</p>\n`;
  }

  bodyContent += `        <div class="clue-box" id="clue${num}" style="display:none">F R A G M E N T &nbsp; ${num} : &nbsp; <strong id="clue${num}val">${fragmentLetter}</strong></div>\n`;

  // Input
  if (puzzle.answerType === 'select') {
    const opts = puzzle.options.map((o, i) => `<option value="${i + 1}">${o}</option>`).join('');
    bodyContent += `        <div class="answer-row">
          <select class="answer-input" id="answer${num}"><option value="">Vælg...</option>${opts}</select>
          <button class="submit-btn" onclick="checkAnswer(${num}, event)">Tjek</button>
        </div>\n`;
  } else {
    bodyContent += `        <div class="answer-row">
          <input class="answer-input" id="answer${num}" maxlength="1" placeholder="?" autocomplete="off" />
          <button class="submit-btn" onclick="checkAnswer(${num}, event)">Tjek</button>
        </div>\n`;
  }

  bodyContent += `        <p class="feedback" id="feedback${num}"></p>`;

  return `    <!-- STEP ${num} -->
    <div class="step" id="step${num}">
      <div class="step-header" onclick="toggleStep('step${num}')">
        <span class="step-num">${String(num).padStart(2, '0')}</span>
        <span class="step-title">${puzzle.title}</span>
        <span class="step-status" id="status${num}">[ LÅST ]</span>
      </div>
      <div class="step-body">
${bodyContent}
      </div>
    </div>`;
}

function generateJS(config) {
  const answers = config.puzzles.map(p => `'${p.answer}'`).join(', ');
  const successMsgs = config.puzzles.map(p => `'${p.successMessage}'`).join(',\n      ');
  const failMsgs = config.puzzles.map(p => `'${p.failMessage}'`).join(',\n      ');

  return `
  const ANSWERS = [${answers}];
  const SUCCESS_MSGS = [
      ${successMsgs}
  ];
  const FAIL_MSGS = [
      ${failMsgs}
  ];
  const CORRECT_CODE = '${config.finalCode}';
  const CODE_LENGTH = ${config.finalCode.length};

  function checkAnswer(num, e) {
    e.stopPropagation();
    const input = document.getElementById('answer' + num);
    const val = input.value.toUpperCase().trim();
    const fb = document.getElementById('feedback' + num);
    if (val === ANSWERS[num - 1]) {
      document.getElementById('clue' + num).style.display = 'block';
      fb.style.color = 'var(--green)';
      fb.textContent = '✓ ' + SUCCESS_MSGS[num - 1];
      document.getElementById('step' + num).classList.add('completed', 'open');
      const s = document.getElementById('status' + num);
      s.textContent = '[ ✓ LØST ]';
      s.classList.add('done');
    } else {
      fb.style.color = 'var(--accent)';
      fb.textContent = '✗ ' + FAIL_MSGS[num - 1];
    }
  }

  function checkCode() {
    const code = Array.from({length: CODE_LENGTH}, (_, i) =>
      document.getElementById('c' + (i+1)).value.toUpperCase().trim()
    ).join('');
    const result = document.getElementById('result');
    if (code === CORRECT_CODE) {
      result.textContent = '';
      document.getElementById('victory').classList.add('show');
    } else if (code.length < CODE_LENGTH) {
      result.className = 'fail';
      result.textContent = '⚠ Koden er ufuldstændig. ' + CODE_LENGTH + ' tegn kræves.';
    } else {
      result.className = 'fail';
      result.textContent = '✗ FORKERT KODE. ADGANG NÆGTET.';
    }
  }

  document.querySelectorAll('.code-inputs input').forEach((inp, i, all) => {
    inp.addEventListener('input', () => {
      if (inp.value && i < all.length - 1) all[i+1].focus();
    });
    inp.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !inp.value && i > 0) all[i-1].focus();
      if (e.key === 'Enter') checkCode();
    });
  });

  document.querySelectorAll('.step-body').forEach(el => {
    el.addEventListener('click', e => e.stopPropagation());
    el.addEventListener('touchend', e => e.stopPropagation());
  });`;
}
