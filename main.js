const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d');
const $ = (s) => document.querySelector(s);
const ui = {
  menu: $('#menu'), gameover: $('#gameover'), paused: $('#paused'), hud: $('#hud'), touch: $('#touch'),
  speed: $('#speed'), score: $('#score'), distance: $('#distance'), nitroFill: $('#nitroFill'), nitroText: $('#nitroText'), nitroLevel: $('#nitroLevel'),
  tiers: [$('#tier1'), $('#tier2'), $('#tier3')],
  menuBest: $('#menuBest'), finalScore: $('#finalScore'), finalDistance: $('#finalDistance'), finalNear: $('#finalNear'), finalKnock: $('#finalKnock'), finalPosition: $('#finalPosition'),
  position: $('#position'), fieldSize: $('#fieldSize'), resultTitle: $('#resultTitle'), resultEyebrow: $('#resultEyebrow'), wallet: $('#wallet'), raceReward: $('#raceReward'),
  newBest: $('#newBest'), pauseBtn: $('#pauseBtn'), toast: $('#toast'),
  tuneCarName: $('#tuneCarName'), tuningGrid: $('#tuningGrid')
};

let W = innerWidth, H = innerHeight, dpr = 1;
let state = 'menu', last = performance.now(), time = 0;
let best = 0;
try { best = Number(localStorage.getItem('neonApexBest')) || 0; } catch (_) {}
const keys = { left: false, right: false, boost: false };
const palette = ['#ff5b4d', '#f0f1e8', '#4f86ff', '#ffc247', '#a97aff', '#38d6bc'];
const maps = [
  { name: 'Neon City', distance: 2000, sky: '#101713', ground: '#070a09', accent: '#d9ff43', haze: 'rgba(217,255,67,.035)', road: '#292e29', roadDark: '#202521' },
  { name: 'Canyon Run', distance: 4000, sky: '#21140e', ground: '#0d0907', accent: '#ffb547', haze: 'rgba(255,133,65,.07)', road: '#34302a', roadDark: '#25221e' },
  { name: 'Midnight GP', distance: 10000, sky: '#0c1020', ground: '#06070d', accent: '#62e6ff', haze: 'rgba(98,140,255,.07)', road: '#252b34', roadDark: '#191e26' }
];
const carTypes = [
  { name: 'Scrap 01', color: '#d9ff43', cost: 0, handling: .72, speedBonus: -45, drain: 1.35, gain: .8, recovery: 1.3, spinLoss: 45, scorePenalty: 1.2, creditBonus: 1.25, knockBonus: 1, nearBonus: 1, nitroTank: 100, bodyW: 1, spoiler: false },
  { name: 'Comet S', color: '#ff5b4d', cost: 1200, handling: .9, speedBonus: 25, drain: 1.2, gain: 1, recovery: 1, spinLoss: 35, scorePenalty: 1, creditBonus: 1, knockBonus: 1, nearBonus: 1, nitroTank: 100, bodyW: 1, spoiler: false },
  { name: 'Titan XR', color: '#a97aff', cost: 2500, handling: .86, speedBonus: -15, drain: 1.1, gain: 1, recovery: .6, spinLoss: 18, scorePenalty: .5, creditBonus: 1, knockBonus: 1, nearBonus: 1, nitroTank: 100, bodyW: 1, spoiler: false },
  { name: 'Volt RS', color: '#62e6ff', cost: 4000, handling: .85, speedBonus: -10, drain: .75, gain: 1.3, recovery: 1, spinLoss: 35, scorePenalty: 1, creditBonus: 1, knockBonus: 1, nearBonus: 1, nitroTank: 100, bodyW: 1, spoiler: false },
  { name: 'Brutus V8', color: '#ff8b3d', cost: 3200, handling: .78, speedBonus: -20, drain: 1.3, gain: .9, recovery: .75, spinLoss: 15, scorePenalty: .4, creditBonus: 1, knockBonus: 1.5, nearBonus: 1, nitroTank: 100, bodyW: 1.1, spoiler: false },
  { name: 'Vector X', color: '#ff4d8d', cost: 5000, handling: .93, speedBonus: 5, drain: 1.05, gain: 1.25, recovery: 1.1, spinLoss: 40, scorePenalty: 1, creditBonus: .85, knockBonus: 1, nearBonus: 1.6, nitroTank: 100, bodyW: .96, spoiler: true },
  { name: 'Phantom GT', color: '#38d6bc', cost: 6000, handling: .98, speedBonus: 45, drain: 1.15, gain: 1, recovery: 1.45, spinLoss: 55, scorePenalty: 1.5, creditBonus: 1, knockBonus: 1, nearBonus: 1, nitroTank: 100, bodyW: .94, spoiler: true },
  { name: 'Aegis RT', color: '#f0f1e8', cost: 7500, handling: .8, speedBonus: -30, drain: 1.25, gain: .95, recovery: .5, spinLoss: 8, scorePenalty: .2, creditBonus: 1, knockBonus: 1.2, nearBonus: 1, nitroTank: 125, bodyW: 1.06, spoiler: true }
];

// Tuning garage: 4 upgrade parts, 5 levels each, persisted per car.
const TUNING_PARTS = [
  { key: 'engine', name: 'ENGINE', hint: '+7 KM/H TOP SPEED / LV' },
  { key: 'tires', name: 'TIRES', hint: '+4% STEERING GRIP / LV' },
  { key: 'nitro', name: 'NITRO SYS', hint: '−5% DRAIN · +5% GAIN / LV' },
  { key: 'chassis', name: 'CHASSIS', hint: '−8% KNOCKDOWN LOSS / LV' }
];
const TUNE_MAX = 5;
const TUNE_COST = [250, 400, 650, 1000, 1500];
let tuning = {};
try {
  const savedTuning = JSON.parse(localStorage.getItem('neonApexTuning') || '{}');
  if (savedTuning && typeof savedTuning === 'object') {
    for (let i = 0; i < carTypes.length; i++) {
      const t = savedTuning[i];
      if (t && typeof t === 'object') {
        tuning[i] = {};
        for (const part of TUNING_PARTS) {
          const v = Number(t[part.key]);
          if (Number.isInteger(v) && v >= 0 && v <= TUNE_MAX) tuning[i][part.key] = v;
        }
      }
    }
  }
} catch (_) {}
function saveTuning() { try { localStorage.setItem('neonApexTuning', JSON.stringify(tuning)); } catch (_) {} }
function tuneLevel(carIndex, partKey) { return (tuning[carIndex] && tuning[carIndex][partKey]) || 0; }
function tuneTotal(carIndex) { return TUNING_PARTS.reduce((sum, p) => sum + tuneLevel(carIndex, p.key), 0); }
function carStats(index) {
  const base = carTypes[index];
  return {
    ...base,
    speedBonus: base.speedBonus + tuneLevel(index, 'engine') * 7,
    handling: Math.min(1.2, base.handling * (1 + tuneLevel(index, 'tires') * .04)),
    drain: base.drain * (1 - tuneLevel(index, 'nitro') * .05),
    gain: base.gain * (1 + tuneLevel(index, 'nitro') * .05),
    spinLoss: base.spinLoss * (1 - tuneLevel(index, 'chassis') * .08),
    recovery: base.recovery * (1 - tuneLevel(index, 'chassis') * .06),
    scorePenalty: base.scorePenalty * (1 - tuneLevel(index, 'chassis') * .08)
  };
}
let credits = 0, ownedCars = new Set([0]);
try {
  credits = Math.max(0, Number(localStorage.getItem('neonApexCredits')) || 0);
  const owned = JSON.parse(localStorage.getItem('neonApexOwnedCars') || '[0]');
  if (Array.isArray(owned)) ownedCars = new Set([0, ...owned.filter(i => Number.isInteger(i) && i >= 0 && i < carTypes.length)]);
} catch (_) {}
let selectedCar = 0;
let selectedMap = 0;
let game = {};
let cars = [], rivals = [], pickups = [], particles = [], roadside = [];
let audioCtx, engineOsc, engineGain, soundOn = true;

function resize() {
  W = innerWidth; H = innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (game.player) game.player.y = H * .77;
  initRoadside();
}
function roadWidth() { return Math.min(W * (W < 700 ? .88 : .64), 680); }
function roadLeft() { return (W - roadWidth()) / 2; }
function laneX(i) { return roadLeft() + roadWidth() * (i + .5) / 4; }
function initRoadside() {
  roadside = Array.from({ length: Math.ceil(H / 85) + 3 }, (_, i) => ({ y: i * 85, side: i % 2 ? 1 : -1, seed: Math.random() }));
}
addEventListener('resize', resize);

function resetGame() {
  cars = []; rivals = []; pickups = []; particles = [];
  game = {
    mapIndex: selectedMap, carIndex: selectedCar, raceLength: maps[selectedMap].distance, speed: 70, score: 0, distance: 0, nitro: 55, nitroLevel: 2, near: 0, knockdowns: 0, recovering: 0, invulnerable: 0, opponentCount: Number($('#opponents').value), position: 1, spawn: .7, pickup: 4,
    boosting: false, offroad: false, shake: 0, flash: 0,
    player: { x: W / 2, y: H * .77, w: Math.max(37, roadWidth() / 4 * .48), h: Math.max(70, roadWidth() / 4 * .91), vx: 0, tilt: 0, spinAngle: 0, spinVelocity: 0 }
  };
  game.car = carStats(game.carIndex);
  const bw = game.car.bodyW;
  game.player.w = Math.max(37, roadWidth() / 4 * .48) * bw;
  game.player.h = Math.max(70, roadWidth() / 4 * .91) * bw;
  game.nitro = .55 * game.car.nitroTank;
  spawnRivals(game.opponentCount);
  updateHUD();
}
function startGame() {
  initAudio();
  resetGame(); state = 'playing';
  ui.menu.classList.add('hidden'); ui.gameover.classList.add('hidden'); ui.paused.classList.add('hidden');
  ui.hud.classList.remove('hidden'); ui.touch.classList.add('playing'); ui.pauseBtn.style.display = 'grid';
  last = performance.now();
  beep(180, .08, 'square', .04); setTimeout(() => beep(300, .12, 'square', .035), 90);
}
function pauseGame() {
  if (state !== 'playing') return;
  state = 'paused'; ui.paused.classList.remove('hidden'); ui.touch.classList.remove('playing');
  clearKeys(); if (engineGain) engineGain.gain.setTargetAtTime(0, audioCtx.currentTime, .05);
}
function resumeGame() {
  if (state !== 'paused') return;
  state = 'playing'; ui.paused.classList.add('hidden'); ui.touch.classList.add('playing'); last = performance.now();
}
function endGame() {
  if (state !== 'playing') return;
  state = 'crashed'; game.shake = 16; game.flash = 1; clearKeys(); crashSound();
  awardRaceCredits(false);
  ui.resultTitle.textContent = 'Wrecked.'; ui.resultEyebrow.textContent = 'Run terminated';
  explode(game.player.x, game.player.y, game.car.color, 34);
  ui.touch.classList.remove('playing'); ui.pauseBtn.style.display = 'none';
  const final = Math.floor(game.score);
  const isBest = final > best;
  if (isBest) {
    best = final;
    try { localStorage.setItem('neonApexBest', String(best)); } catch (_) {}
  }
  setTimeout(() => {
    state = 'gameover'; ui.finalScore.textContent = final.toLocaleString();
    ui.finalDistance.textContent = (game.distance / 1000).toFixed(2) + ' km';
    ui.finalNear.textContent = game.near; ui.finalKnock.textContent = game.knockdowns; ui.finalPosition.textContent = `P${game.position}`; ui.newBest.style.display = isBest ? 'block' : 'none';
    ui.menuBest.textContent = pad(best); ui.gameover.classList.remove('hidden'); ui.hud.classList.add('hidden');
  }, 650);
}
function completeRace() {
  if (state !== 'playing') return;
  state = 'finished'; clearKeys();
  game.distance = game.raceLength;
  game.position = 1 + rivals.filter(r => r.progress > game.distance).length;
  game.score += (game.opponentCount - game.position + 1) * 500 + Math.round(game.nitro) * 10;
  awardRaceCredits(true);
  ui.touch.classList.remove('playing'); ui.pauseBtn.style.display = 'none';
  ui.resultTitle.textContent = game.position === 1 ? 'Victory!' : 'Finished.';
  ui.resultEyebrow.textContent = `Race complete · ${maps[game.mapIndex].name}`;
  beep(660, .16, 'square', .04); setTimeout(() => beep(880, .22, 'square', .04), 170);
  const final = Math.floor(game.score), isBest = final > best;
  if (isBest) { best = final; try { localStorage.setItem('neonApexBest', String(best)); } catch (_) {} }
  setTimeout(() => {
    state = 'gameover'; ui.finalScore.textContent = final.toLocaleString();
    ui.finalDistance.textContent = (game.raceLength / 1000).toFixed(0) + ' km';
    ui.finalNear.textContent = game.near; ui.finalKnock.textContent = game.knockdowns;
    ui.finalPosition.textContent = `P${game.position}`; ui.newBest.style.display = isBest ? 'block' : 'none';
    ui.menuBest.textContent = pad(best); ui.gameover.classList.remove('hidden'); ui.hud.classList.add('hidden');
  }, 850);
}
function showMenu() {
  resetGame(); state = 'menu'; game.speed = 0; clearKeys();
  ui.gameover.classList.add('hidden'); ui.paused.classList.add('hidden'); ui.hud.classList.add('hidden');
  ui.menu.classList.remove('hidden'); ui.touch.classList.remove('playing'); ui.pauseBtn.style.display = 'none';
  ui.menuBest.textContent = pad(best);
  if (engineGain) engineGain.gain.setTargetAtTime(0, audioCtx.currentTime, .05);
}
function clearKeys() { keys.left = keys.right = keys.boost = false; document.querySelectorAll('.touch-btn').forEach(b => b.classList.remove('active')); }
function pad(n) { return Math.floor(n).toString().padStart(6, '0'); }
function saveProgress() {
  try {
    localStorage.setItem('neonApexCredits', String(credits));
    localStorage.setItem('neonApexOwnedCars', JSON.stringify([...ownedCars]));
  } catch (_) {}
}
function updateWallet() { ui.wallet.textContent = `${credits.toLocaleString()} CR`; }
function refreshCarCards() {
  document.querySelectorAll('.car-card').forEach(card => {
    const index = Number(card.dataset.car), owned = ownedCars.has(index), active = index === selectedCar;
    card.classList.toggle('locked', !owned); card.classList.toggle('selected', active);
    card.setAttribute('aria-pressed', String(active));
    const tuned = owned ? tuneTotal(index) : 0;
    const tuneLabel = tuned ? ` · TUNE ${tuned}/20` : '';
    card.querySelector('.car-price').textContent = owned ? (active ? `SELECTED${tuneLabel}` : `OWNED${tuneLabel}`) : `${carTypes[index].cost.toLocaleString()} CR`;
  });
}
function setStatBar(key, value) {
  const el = document.querySelector(`[data-stat="${key}"]`);
  if (!el) return;
  el.style.width = (Math.max(.06, Math.min(1, value)) * 100).toFixed(0) + '%';
}
function renderTuning() {
  if (!ui.tuningGrid) return;
  const stats = carStats(selectedCar);
  ui.tuneCarName.textContent = carTypes[selectedCar].name.toUpperCase();
  document.documentElement.style.setProperty('--tune-accent', carTypes[selectedCar].color);
  setStatBar('speed', (stats.speedBonus + 60) / 140);
  setStatBar('grip', (stats.handling - .65) / .53);
  setStatBar('nitro', (stats.gain / stats.drain - .5) / 1.4);
  setStatBar('armor', (1 - stats.spinLoss / 60) * .5 + (1 - stats.scorePenalty / 1.6) * .3 + (1 - stats.recovery / 1.5) * .2);
  const owned = ownedCars.has(selectedCar);
  ui.tuningGrid.innerHTML = '';
  for (const part of TUNING_PARTS) {
    const lv = tuneLevel(selectedCar, part.key);
    const maxed = lv >= TUNE_MAX;
    const cost = maxed ? 0 : TUNE_COST[lv];
    const row = document.createElement('div');
    row.className = 'tune-row' + (maxed ? ' maxed' : '');
    row.innerHTML = `
      <div class="tune-top"><strong>${part.name}</strong><span class="tune-lv">LV ${lv}${maxed ? ' MAX' : ''}</span></div>
      <div class="tune-pips">${Array.from({ length: TUNE_MAX }, (_, i) => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</div>
      <small>${part.hint}</small>
      <button class="tune-buy" ${maxed || !owned ? 'disabled' : ''}>${!owned ? 'BUY CAR TO TUNE' : maxed ? 'FULLY TUNED' : `UPGRADE · ${cost.toLocaleString()} CR`}</button>`;
    if (!maxed && owned) row.querySelector('.tune-buy').addEventListener('click', () => buyTuning(part));
    ui.tuningGrid.appendChild(row);
  }
}
function buyTuning(part) {
  const lv = tuneLevel(selectedCar, part.key);
  if (lv >= TUNE_MAX || !ownedCars.has(selectedCar)) return;
  const cost = TUNE_COST[lv];
  if (credits < cost) {
    toast(`NEED ${(cost - credits).toLocaleString()} MORE CR FOR ${part.name}`);
    beep(120, .12, 'square', .025); return;
  }
  credits -= cost;
  tuning[selectedCar] = tuning[selectedCar] || {};
  tuning[selectedCar][part.key] = lv + 1;
  saveProgress(); saveTuning(); updateWallet(); renderTuning(); refreshCarCards();
  toast(`${part.name} TUNED TO LV ${lv + 1}!`);
  beep(700 + lv * 60, .12, 'square', .035);
}
function awardRaceCredits(finished) {
  if (game.creditsEarned != null) return game.creditsEarned;
  const distanceReward = Math.floor(game.distance / 10);
  const actionReward = game.knockdowns * 20 + game.near * 5;
  const finishReward = finished ? 150 + game.raceLength / 1000 * 50 : 0;
  const positionReward = finished ? Math.max(0, game.opponentCount - game.position + 1) * 15 : 0;
  const subtotal = distanceReward + actionReward + finishReward + positionReward;
  const earned = Math.max(5, Math.floor(subtotal * game.car.creditBonus));
  game.creditsEarned = earned; credits += earned;
  saveProgress(); updateWallet();
  ui.raceReward.innerHTML = `+${earned.toLocaleString()} CR<small>RACE EARNINGS</small>`;
  return earned;
}
function addNitro(amount) {
  const before = game.nitro;
  const tank = (game.car && game.car.nitroTank) || 100;
  game.nitro = Math.min(tank, game.nitro + amount * game.car.gain);
  return Math.round(game.nitro - before);
}

function spawnCar() {
  const lane = Math.floor(Math.random() * 4);
  if (cars.some(c => c.lane === lane && c.y < 130)) return;
  const w = Math.max(35, roadWidth() / 4 * (.44 + Math.random() * .07));
  cars.push({ lane, x: laneX(lane), y: -120, w, h: w * 1.85, speed: 75 + Math.random() * 85, color: palette[Math.floor(Math.random() * palette.length)], passed: false, near: false });
}
function spawnPickup() {
  const lane = Math.floor(Math.random() * 4);
  if (!cars.some(c => c.lane === lane && c.y < 100)) pickups.push({ x: laneX(lane), y: -60, r: 15, spin: 0 });
}
function spawnRivals(count) {
  for (let i = 0; i < count; i++) {
    const w = Math.max(36, roadWidth() / 4 * .47);
    const progress = (i - (count - 1) / 2) * 32;
    const skill = -20 + Math.random() * 42;
    rivals.push({
      number: i + 1, progress, speed: 175 + skill, skill, w, h: w * 1.9,
      lane: i % 4, targetLane: i % 4, x: laneX(i % 4), y: game.player.y - progress * 3.1,
      color: palette[i % palette.length], changeLane: 1 + Math.random() * 4, cooldown: 0,
      nitro: 50 + Math.random() * 50, nitroLevel: 1, boosting: false, boostTimer: 0,
      aggression: .7 + Math.random() * .3, attackCooldown: 2 + Math.random() * 3
    });
  }
  game.position = 1 + rivals.filter(r => r.progress > game.distance).length;
}
function explode(x, y, color, count = 12) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 220;
    particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: .35 + Math.random() * .65, max: 1, color, size: 1 + Math.random() * 4 });
  }
}
function toast(text) {
  ui.toast.textContent = text; ui.toast.classList.remove('pop'); void ui.toast.offsetWidth; ui.toast.classList.add('pop');
}
function getNitroLevel(value = game.nitro, tank = 100) { return value >= tank * .66 ? 3 : value >= tank * .33 ? 2 : 1; }
function knockdownCar(index, car) {
  const level = game.nitroLevel;
  const bonus = Math.round(level * 500 * game.car.knockBonus);
  const nitroBonus = 10 + level * 6;
  cars.splice(index, 1);
  game.knockdowns++;
  game.score += bonus;
  const nitroGained = addNitro(nitroBonus);
  game.shake = 7; game.flash = .18;
  explode(car.x, car.y, car.color, 26);
  explode(car.x, car.y, '#d9ff43', 12);
  toast(`KNOCKDOWN!  +${bonus}  /  +${nitroGained} NITRO`);
  beep(120, .13, 'sawtooth', .07);
  setTimeout(() => beep(420 + level * 130, .12, 'square', .035), 70);
}
function knockdownRival(rival) {
  const level = game.nitroLevel;
  const bonus = Math.round(level * 750 * game.car.knockBonus);
  const nitroBonus = 10 + level * 6;
  game.knockdowns++;
  game.score += bonus;
  const nitroGained = addNitro(nitroBonus);
  game.shake = 9; game.flash = .22;
  explode(rival.x, rival.y, rival.color, 30);
  explode(rival.x, rival.y, '#ff4d8d', 14);
  rival.progress = game.distance - 140;
  rival.speed = 80; rival.cooldown = 2.2; rival.boosting = false; rival.boostTimer = 0; rival.attackCooldown = 4;
  rival.nitro = Math.max(0, rival.nitro - 20);
  toast(`RIVAL KNOCKDOWN!  +${bonus}  /  +${nitroGained} NITRO`);
  beep(105, .16, 'sawtooth', .08);
  setTimeout(() => beep(520 + level * 130, .14, 'square', .04), 75);
}
function knockdownPlayer(rival) {
  if (game.invulnerable > 0 || state !== 'playing') return;
  const car = game.car;
  const lostNitro = Math.min(Math.round(car.spinLoss), Math.round(game.nitro));
  game.nitro = Math.max(0, game.nitro - car.spinLoss);
  game.score = Math.max(0, game.score - 500 * car.scorePenalty);
  game.speed = Math.max(65, game.speed * .42);
  game.recovering = 1.25 * car.recovery; game.invulnerable = 2.5;
  game.shake = 15; game.flash = .75;
  game.player.spinAngle = 0; game.player.spinVelocity = 11;
  game.player.vx += (game.player.x < rival.x ? -1 : 1) * 240;
  rival.progress += 28; rival.speed += 25;
  rival.boosting = false; rival.boostTimer = 0; rival.attackCooldown = 4;
  clearKeys(); crashSound();
  explode(game.player.x, game.player.y, '#ff4d8d', 28);
  explode(game.player.x, game.player.y, carTypes[game.carIndex].color, 16);
  toast(`R${rival.number} KNOCKED YOU DOWN!  −${lostNitro} NITRO`);
}
function rectsHit(a, b, margin = .72) {
  return Math.abs(a.x - b.x) < (a.w + b.w) * .5 * margin && Math.abs(a.y - b.y) < (a.h + b.h) * .5 * margin;
}

function update(dt) {
  time += dt;
  if (state === 'menu') { game.menuScroll = (game.menuScroll || 0) + dt * 120; return; }
  if (state === 'finished') { game.speed = Math.max(0, game.speed - 150 * dt); updateParticles(dt); updateHUD(); return; }
  if (state !== 'playing' && state !== 'crashed') { updateParticles(dt); return; }
  if (state === 'crashed') { game.speed = Math.max(0, game.speed - 200 * dt); game.shake *= .9; game.flash *= .9; updateParticles(dt); return; }

  const p = game.player;
  const difficulty = Math.min(game.distance / 5000, 1);
  game.recovering = Math.max(0, game.recovering - dt);
  game.invulnerable = Math.max(0, game.invulnerable - dt);
  if (game.recovering > 0) {
    p.spinAngle += p.spinVelocity * dt;
    p.spinVelocity *= Math.pow(.35, dt);
  } else { p.spinAngle = 0; p.spinVelocity = 0; }
  const steer = game.recovering > 0 ? 0 : (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  game.boosting = keys.boost && game.nitro > 0;
  game.nitroLevel = getNitroLevel(game.nitro, game.car.nitroTank);
  const boostSpeeds = [0, 295, 325, 355];
  const boostDrains = [0, 19, 23, 27];
  const car = game.car;
  const targetSpeed = (game.recovering > 0 ? 85 : game.boosting ? boostSpeeds[game.nitroLevel] : 195 + difficulty * 65) + (game.recovering > 0 ? 0 : car.speedBonus);
  game.speed += (targetSpeed - game.speed) * dt * (game.boosting ? 1.9 : .65);
  if (game.boosting) {
    game.nitro = Math.max(0, game.nitro - boostDrains[game.nitroLevel] * car.drain * dt);
    if (Math.random() < dt * 40) particles.push({ x: p.x + (Math.random() - .5) * 18, y: p.y + p.h * .48, vx: (Math.random() - .5) * 20, vy: 100 + Math.random() * 100, life: .25, max: .25, color: '#d9ff43', size: 2 + Math.random() * 3 });
  }

  const steerPower = (250 + game.speed * .45) * dt * car.handling;
  p.vx += steer * steerPower * 7;
  p.vx *= Math.pow(.035, dt);
  p.x += p.vx * dt;
  p.tilt += ((steer * .09 + p.vx * .00035) - p.tilt) * dt * 9;
  const margin = p.w * .56;
  p.x = Math.max(roadLeft() - roadWidth() * .08, Math.min(roadLeft() + roadWidth() + roadWidth() * .08, p.x));
  game.offroad = p.x < roadLeft() + margin || p.x > roadLeft() + roadWidth() - margin;
  if (game.offroad) {
    game.speed = Math.max(90, game.speed - 150 * dt);
    if (Math.random() < dt * 30) particles.push({ x: p.x, y: p.y + p.h / 2, vx: (Math.random() - .5) * 50, vy: 80, life: .4, max: .4, color: '#8d8266', size: 3 });
  }

  const meters = game.speed / 3.6 * dt;
  game.distance += meters;
  game.score += game.speed * dt * .16 * (game.boosting ? 1 + game.nitroLevel * .5 : 1);
  game.shake = Math.max(0, game.shake - 28 * dt);
  game.flash = Math.max(0, game.flash - 1.8 * dt);
  if (game.distance >= game.raceLength) { completeRace(); updateHUD(); return; }
  game.spawn -= dt; game.pickup -= dt;
  if (game.spawn <= 0) {
    spawnCar();
    if (difficulty > .35 && Math.random() < .17) spawnCar();
    game.spawn = Math.max(.42, 1.05 - difficulty * .45) * (.75 + Math.random() * .55);
  }
  if (game.pickup <= 0) { spawnPickup(); game.pickup = 5 + Math.random() * 5; }

  for (let i = cars.length - 1; i >= 0; i--) {
    const c = cars[i];
    c.x = laneX(c.lane);
    c.y += (game.speed - c.speed) * (1.15 + difficulty * .25) * dt;
    if (game.invulnerable <= 0 && rectsHit(p, c)) {
      if (game.boosting) { knockdownCar(i, c); continue; }
      endGame(); break;
    }
    if (!c.passed && c.y > p.y + p.h * .55) {
      c.passed = true; game.score += 100;
      const gap = Math.abs(p.x - c.x) - (p.w + c.w) / 2;
      if (gap < 24 * game.car.nearBonus && gap > -5) {
        game.near++; const pts = Math.round(250 * game.car.nearBonus); game.score += pts; addNitro(9);
        toast(`NEAR MISS  +${pts}`); beep(640, .07, 'square', .025);
      }
    }
    if (c.y > H + 160) cars.splice(i, 1);
  }
  if (state === 'playing') updateRivals(dt, difficulty);
  for (let i = pickups.length - 1; i >= 0; i--) {
    const b = pickups[i]; b.y += game.speed * 1.18 * dt; b.spin += dt * 4;
    if (Math.abs(p.x - b.x) < p.w * .65 && Math.abs(p.y - b.y) < p.h * .55) {
      addNitro(34); game.score += 150;
      toast('NITRO CHARGED'); explode(b.x, b.y, '#d9ff43', 15); beep(880, .14, 'sine', .04); pickups.splice(i, 1);
    } else if (b.y > H + 60) pickups.splice(i, 1);
  }
  updateParticles(dt); updateHUD(); updateEngine();
}
function updateRivals(dt, difficulty) {
  const p = game.player;
  const oldPosition = game.position;
  const boostSpeeds = [0, 295, 325, 355];
  const boostDrains = [0, 19, 23, 27];
  for (const r of rivals) {
    r.cooldown = Math.max(0, r.cooldown - dt);
    r.attackCooldown = Math.max(0, r.attackCooldown - dt);
    r.boostTimer = Math.max(0, r.boostTimer - dt);
    const gap = r.progress - game.distance;
    const closeToPlayer = Math.abs(gap) < 75;
    r.nitro = Math.min(100, r.nitro + dt * (gap < 0 ? 3.2 : 1.8));

    // Rivals boost to catch up, defend their position, or actively hunt the player.
    const attackChance = closeToPlayer ? 1.25 * r.aggression : .18 * r.aggression;
    if (r.cooldown <= 0 && r.attackCooldown <= 0 && r.nitro > 18 && Math.random() < dt * attackChance) {
      r.boosting = true;
      r.boostTimer = 1.4 + r.aggression * 1.5;
      r.attackCooldown = 2.5 + Math.random() * 2;
    }
    r.boosting = r.boostTimer > 0 && r.nitro > 0 && r.cooldown <= 0;
    r.nitroLevel = getNitroLevel(r.nitro);
    if (r.boosting) r.nitro = Math.max(0, r.nitro - boostDrains[r.nitroLevel] * dt);

    const rubberBand = Math.max(-28, Math.min(52, (game.distance - r.progress) * .085));
    let targetSpeed = 210 + difficulty * 65 + r.skill + rubberBand;
    if (r.boosting) targetSpeed = boostSpeeds[r.nitroLevel] + r.skill * .3 + rubberBand * .35;
    r.speed += (targetSpeed - r.speed) * dt * (r.boosting ? 1.7 : .85);
    r.progress += r.speed / 3.6 * dt;
    r.changeLane -= dt;
    if (r.changeLane <= 0) {
      r.targetLane = Math.floor(Math.random() * 4);
      r.changeLane = 1.2 + Math.random() * 2.8;
    }
    r.x += (laneX(r.targetLane) - r.x) * dt * 1.9;
    // A boosting rival deliberately steers toward the player when within striking distance.
    if (r.boosting && closeToPlayer && game.invulnerable <= 0) {
      r.x += (p.x - r.x) * dt * (1.15 + r.aggression * 1.4);
    }
    r.y = p.y - (r.progress - game.distance) * 3.1;
    if (game.invulnerable <= 0 && r.cooldown <= 0 && r.y > -100 && r.y < H + 100 && rectsHit(p, r, .68)) {
      if (game.boosting) { knockdownRival(r); continue; }
      if (r.boosting) { knockdownPlayer(r); continue; }
      endGame(); break;
    }
  }
  game.position = 1 + rivals.filter(r => r.progress > game.distance).length;
  if (state === 'playing' && game.position < oldPosition) {
    const gained = oldPosition - game.position;
    game.score += gained * 300;
    toast(`OVERTAKE!  P${game.position}  +${gained * 300}`);
    beep(520 + game.position * 12, .09, 'square', .025);
  }
}
function drawRival(r) {
  if (r.cooldown > 0 || r.y < -120 || r.y > H + 120) return;
  drawCar(r.x, r.y, r.w, r.h, r.color, false, 0, r.boosting);
  ctx.save(); ctx.translate(r.x, r.y - r.h * .64);
  ctx.fillStyle = '#ff4d8d'; ctx.shadowColor = '#ff4d8d'; ctx.shadowBlur = 8;
  ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(5, 0); ctx.lineTo(0, 5); ctx.lineTo(-5, 0); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0; ctx.font = '500 8px DM Mono, monospace'; ctx.textAlign = 'center'; ctx.fillText(`R${r.number}${r.boosting ? ' · N' + r.nitroLevel : ''}`, 0, -10);
  ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(-r.w * .35, 9, r.w * .7, 2);
  ctx.fillStyle = '#ff4d8d'; ctx.fillRect(-r.w * .35, 9, r.w * .7 * r.nitro / 100, 2); ctx.restore();
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= .97; p.vy *= .97; p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}
function updateHUD() {
  if (!game.player) return;
  ui.speed.textContent = Math.round(game.speed).toString().padStart(3, '0');
  ui.score.textContent = pad(game.score); ui.distance.textContent = (game.distance / 1000).toFixed(2) + ' / ' + (game.raceLength / 1000) + ' KM';
  ui.position.textContent = game.position; ui.fieldSize.textContent = game.opponentCount;
  const tank = (game.car && game.car.nitroTank) || 100;
  const level = getNitroLevel(game.nitro, tank); game.nitroLevel = level;
  ui.nitroFill.style.width = Math.min(100, game.nitro / tank * 100) + '%'; ui.nitroText.textContent = `${Math.round(game.nitro)}/${Math.round(tank)}`;
  ui.nitroLevel.textContent = `NITRO · LV ${level}`;
  ui.nitroFill.className = `nitro-fill level-${level}`;
  ui.tiers.forEach((tier, i) => tier.classList.toggle('active', i + 1 === level));
}

function draw() {
  ctx.save();
  if (game.shake) ctx.translate((Math.random() - .5) * game.shake, (Math.random() - .5) * game.shake);
  drawWorld();
  if (state !== 'menu' && game.player) {
    pickups.forEach(drawPickup); rivals.forEach(drawRival); cars.forEach(c => drawCar(c.x, c.y, c.w, c.h, c.color, false, 0));
    drawCar(game.player.x, game.player.y, game.player.w, game.player.h, game.car.color, true, game.player.tilt + game.player.spinAngle, game.boosting, game.car.spoiler);
  } else if (game.player) {
    drawCar(W / 2, H * .79, game.player.w, game.player.h, game.car.color, true, 0, false, game.car.spoiler);
  }
  particles.forEach(p => {
    ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size * 2);
  });
  ctx.globalAlpha = 1; ctx.restore();
  if (game.flash) { ctx.fillStyle = `rgba(255,255,255,${game.flash * .45})`; ctx.fillRect(0, 0, W, H); }
}
function drawWorld() {
  const rw = roadWidth(), left = roadLeft(), right = left + rw;
  const theme = maps[game.mapIndex] || maps[0];
  const scroll = state === 'menu' ? (game.menuScroll || 0) : game.distance * 4.5;
  const bg = ctx.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, theme.sky); bg.addColorStop(1, theme.ground);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // distant city glow and skyline
  ctx.fillStyle = theme.haze; ctx.fillRect(0, 0, W, H * .32);
  ctx.fillStyle = '#0c120f';
  for (let x = 0; x < W; x += 38) {
    const bh = 35 + ((x * 17) % 100); ctx.fillRect(x, 0, 32, bh);
    if (x % 76 === 0) { ctx.fillStyle = 'rgba(217,255,67,.16)'; ctx.fillRect(x + 8, bh - 18, 2, 2); ctx.fillStyle = '#0c120f'; }
  }

  // roadside ground lines
  ctx.strokeStyle = 'rgba(237,241,232,.045)'; ctx.lineWidth = 1;
  for (let y = (scroll * .45) % 70 - 70; y < H; y += 70) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(left - 20, y + 18); ctx.moveTo(right + 20, y + 18); ctx.lineTo(W, y); ctx.stroke();
  }

  ctx.fillStyle = '#151a17'; ctx.fillRect(left - 10, 0, rw + 20, H);
  const asphalt = ctx.createLinearGradient(left, 0, right, 0);
  asphalt.addColorStop(0, theme.roadDark); asphalt.addColorStop(.12, theme.road); asphalt.addColorStop(.5, theme.road); asphalt.addColorStop(.88, theme.road); asphalt.addColorStop(1, theme.roadDark);
  ctx.fillStyle = asphalt; ctx.fillRect(left, 0, rw, H);

  // subtle asphalt texture
  ctx.fillStyle = 'rgba(255,255,255,.025)';
  for (let i = 0; i < 65; i++) {
    const x = left + ((i * 97 + 31) % Math.max(1, rw)); const y = (i * 137 + scroll * .8) % H;
    ctx.fillRect(x, y, 1, 5);
  }

  // edge lines and lane markers
  ctx.fillStyle = '#dfe5d8'; ctx.fillRect(left + 5, 0, 3, H); ctx.fillRect(right - 8, 0, 3, H);
  ctx.fillStyle = theme.accent; ctx.fillRect(left - 5, 0, 3, H); ctx.fillRect(right + 2, 0, 3, H);
  for (let lane = 1; lane < 4; lane++) {
    const x = left + rw * lane / 4;
    for (let y = (scroll % 94) - 94; y < H; y += 94) {
      ctx.fillStyle = 'rgba(237,241,232,.62)'; ctx.fillRect(x - 1.5, y, 3, 43);
    }
  }

  if (state !== 'menu' && game.raceLength) drawFinishLine(left, rw, theme.accent);

  // moving roadside lights and barriers
  for (let y = (scroll * 1.1) % 115 - 115; y < H + 80; y += 115) {
    drawRoadLight(left - 29, y, -1, theme.accent); drawRoadLight(right + 29, y + 55, 1, theme.accent);
  }
  if (game.boosting && state === 'playing') {
    ctx.strokeStyle = 'rgba(217,255,67,.22)'; ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) {
      const x = (i * 137 + time * 31) % W, y = (i * 83 + time * 700) % H;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 55 + game.speed * .15); ctx.stroke();
    }
  }
  const vignette = ctx.createRadialGradient(W / 2, H * .5, Math.min(W, H) * .25, W / 2, H * .5, Math.max(W, H) * .7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, W, H);
}
function drawFinishLine(left, rw, accent) {
  const remaining = game.raceLength - game.distance;
  if (remaining > 260 || remaining < -50) return;
  const y = game.player.y - remaining * 3.1;
  if (y < -90 || y > H + 90) return;
  const columns = 16, cellW = rw / columns, cellH = 9;
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(left, y - 4, rw, cellH * 2 + 8);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < columns; col++) {
      ctx.fillStyle = (row + col) % 2 ? '#111511' : '#edf1e8';
      ctx.fillRect(left + col * cellW, y + row * cellH, cellW + 1, cellH);
    }
  }
  ctx.fillStyle = accent; ctx.fillRect(left, y - 4, rw, 3); ctx.fillRect(left, y + cellH * 2 + 1, rw, 3);
  // Trackside gantry and finish banner approach with the line.
  ctx.fillStyle = '#343b35'; ctx.fillRect(left - 14, y - 70, 7, 88); ctx.fillRect(left + rw + 7, y - 70, 7, 88);
  ctx.fillStyle = '#0a0d0b'; ctx.fillRect(left - 14, y - 70, rw + 28, 27);
  ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(left - 14, y - 70, rw + 28, 27);
  ctx.fillStyle = '#edf1e8'; ctx.font = '800 italic 17px Barlow Condensed, sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('FINISH', left + rw / 2, y - 50);
  ctx.restore();
}
function drawRoadLight(x, y, side, accent = '#d9ff43') {
  ctx.fillStyle = '#343b35'; ctx.fillRect(x - 2, y, 4, 27);
  ctx.fillStyle = accent; ctx.fillRect(x - 3, y, 6, 4);
  const g = ctx.createRadialGradient(x, y, 0, x, y, 28); g.addColorStop(0, accent + '29'); g.addColorStop(1, accent + '00');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 28, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#282e29'; ctx.fillRect(x + side * 5 - 7, y + 20, 14, 5);
}
function drawCar(x, y, w, h, color, player, tilt, boosting = false, spoiler = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt || 0);
  ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#060807';
  ctx.fillRect(-w * .55, -h * .29, w * .13, h * .23); ctx.fillRect(w * .42, -h * .29, w * .13, h * .23);
  ctx.fillRect(-w * .55, h * .16, w * .13, h * .23); ctx.fillRect(w * .42, h * .16, w * .13, h * .23);
  ctx.shadowColor = player ? color : 'transparent'; ctx.shadowBlur = player ? 18 : 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = color; ctx.beginPath();
  ctx.moveTo(-w * .32, -h * .5); ctx.lineTo(w * .32, -h * .5); ctx.lineTo(w * .47, -h * .28);
  ctx.lineTo(w * .5, h * .3); ctx.lineTo(w * .36, h * .49); ctx.lineTo(-w * .36, h * .49);
  ctx.lineTo(-w * .5, h * .3); ctx.lineTo(-w * .47, -h * .28); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  // hood and roof
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.moveTo(-w * .28, -h * .43); ctx.lineTo(w * .28, -h * .43); ctx.lineTo(w * .35, -h * .16); ctx.lineTo(-w * .35, -h * .16); ctx.fill();
  ctx.fillStyle = '#101917'; ctx.beginPath(); ctx.moveTo(-w * .3, -h * .12); ctx.lineTo(w * .3, -h * .12); ctx.lineTo(w * .34, h * .17); ctx.lineTo(-w * .34, h * .17); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(95,146,139,.38)'; ctx.beginPath(); ctx.moveTo(-w * .26, -h * .09); ctx.lineTo(w * .26, -h * .09); ctx.lineTo(w * .28, h * .04); ctx.lineTo(-w * .28, h * .04); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(-w * .37, h * .2, w * .74, h * .13);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(-w * .025, -h * .46, w * .05, h * .88);
  // lamps
  ctx.fillStyle = player ? '#f4ffd0' : '#fff4cf'; ctx.fillRect(-w * .32, -h * .46, w * .18, 3); ctx.fillRect(w * .14, -h * .46, w * .18, 3);
  ctx.fillStyle = '#ff352f'; ctx.shadowColor = '#ff352f'; ctx.shadowBlur = 8; ctx.fillRect(-w * .32, h * .42, w * .18, 3); ctx.fillRect(w * .14, h * .42, w * .18, 3);
  if (player) {
    ctx.shadowBlur = 0; ctx.fillStyle = '#0a0d0b'; ctx.fillRect(-w * .46, h * .32, w * .92, 4);
  }
  if (spoiler && player) {
    ctx.fillStyle = '#101917';
    ctx.fillRect(-w * .44, h * .51, w * .88, 3);
    ctx.fillRect(-w * .34, h * .44, w * .055, 8);
    ctx.fillRect(w * .29, h * .44, w * .055, 8);
    ctx.fillStyle = color; ctx.fillRect(-w * .44, h * .51, w * .1, 3); ctx.fillRect(w * .34, h * .51, w * .1, 3);
  }
  if (boosting) {
    const flame = 14 + Math.random() * 17;
    const flameColor = player ? '#d9ff43' : '#ff4d8d';
    ctx.fillStyle = flameColor; ctx.shadowColor = flameColor; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.moveTo(-w * .17, h * .48); ctx.lineTo(-w * .04, h * .48); ctx.lineTo(-w * .1, h * .48 + flame); ctx.fill();
    ctx.beginPath(); ctx.moveTo(w * .04, h * .48); ctx.lineTo(w * .17, h * .48); ctx.lineTo(w * .1, h * .48 + flame); ctx.fill();
  }
  ctx.restore();
}
function drawPickup(b) {
  ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin);
  ctx.strokeStyle = '#d9ff43'; ctx.lineWidth = 2; ctx.shadowColor = '#d9ff43'; ctx.shadowBlur = 18;
  ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; const x = Math.cos(a) * b.r, y = Math.sin(a) * b.r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.closePath(); ctx.stroke();
  ctx.rotate(-b.spin); ctx.fillStyle = '#d9ff43'; ctx.beginPath(); ctx.moveTo(3, -10); ctx.lineTo(-5, 1); ctx.lineTo(0, 1); ctx.lineTo(-3, 11); ctx.lineTo(7, -2); ctx.lineTo(2, -2); ctx.closePath(); ctx.fill(); ctx.restore();
}

function initAudio() {
  if (!soundOn) return;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    engineOsc = audioCtx.createOscillator(); engineGain = audioCtx.createGain();
    engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 65; engineGain.gain.value = .018;
    const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 240;
    engineOsc.connect(filter); filter.connect(engineGain); engineGain.connect(audioCtx.destination); engineOsc.start();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
}
function updateEngine() {
  if (!audioCtx || !engineOsc) return;
  engineOsc.frequency.setTargetAtTime(45 + game.speed * .48, audioCtx.currentTime, .06);
  engineGain.gain.setTargetAtTime(soundOn && state === 'playing' ? .018 : 0, audioCtx.currentTime, .08);
}
function beep(freq, duration, type = 'sine', volume = .03) {
  if (!soundOn) return; initAudio(); if (!audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain(); o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(volume, audioCtx.currentTime); g.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + duration);
  o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + duration);
}
function crashSound() {
  if (!soundOn || !audioCtx) return;
  const len = audioCtx.sampleRate * .5, buffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate), data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = audioCtx.createBufferSource(), g = audioCtx.createGain(); src.buffer = buffer; g.gain.value = .18;
  src.connect(g); g.connect(audioCtx.destination); src.start();
}

document.querySelectorAll('.car-card').forEach(card => {
  card.addEventListener('click', () => {
    const index = Number(card.dataset.car), car = carTypes[index];
    if (!ownedCars.has(index)) {
      if (credits < car.cost) {
        toast(`NEED ${(car.cost - credits).toLocaleString()} MORE CR FOR ${car.name.toUpperCase()}`);
        beep(120, .12, 'square', .025); return;
      }
      credits -= car.cost; ownedCars.add(index); saveProgress(); updateWallet();
      toast(`${car.name.toUpperCase()} PURCHASED!`);
      beep(760, .14, 'square', .035);
    }
    selectedCar = index;
    if (state === 'menu') {
      game.carIndex = selectedCar;
      game.car = carStats(selectedCar);
      const bw = game.car.bodyW;
      game.player.w = Math.max(37, roadWidth() / 4 * .48) * bw;
      game.player.h = Math.max(70, roadWidth() / 4 * .91) * bw;
      game.nitro = .55 * game.car.nitroTank;
    }
    renderTuning();
    refreshCarCards();
    beep(410 + selectedCar * 40, .06, 'square', .02);
  });
});
document.querySelectorAll('.map-card').forEach(card => {
  card.addEventListener('click', () => {
    selectedMap = Number(card.dataset.map);
    document.querySelectorAll('.map-card').forEach(c => c.classList.toggle('selected', c === card));
    if (state === 'menu') { game.mapIndex = selectedMap; game.raceLength = maps[selectedMap].distance; }
    beep(330 + selectedMap * 90, .06, 'square', .02);
  });
});
$('#mapSelectBtn').addEventListener('click', showMenu);
const opponentInput = $('#opponents');
function setOpponents(value) {
  opponentInput.value = Math.max(6, Math.min(20, Number(value)));
  $('#opponentCount').textContent = opponentInput.value;
}
opponentInput.addEventListener('input', () => setOpponents(opponentInput.value));
$('#oppMinus').addEventListener('click', () => setOpponents(Number(opponentInput.value) - 1));
$('#oppPlus').addEventListener('click', () => setOpponents(Number(opponentInput.value) + 1));
$('#startBtn').addEventListener('click', startGame); $('#restartBtn').addEventListener('click', startGame);
$('#resumeBtn').addEventListener('click', resumeGame); ui.pauseBtn.addEventListener('click', pauseGame);
$('#soundBtn').addEventListener('click', () => {
  soundOn = !soundOn; $('#soundOn').style.display = soundOn ? 'block' : 'none'; $('#soundOff').style.display = soundOn ? 'none' : 'block';
  if (soundOn) initAudio(); if (engineGain) engineGain.gain.setTargetAtTime(soundOn ? .018 : 0, audioCtx.currentTime, .05);
});
addEventListener('keydown', (e) => {
  if (['ArrowLeft', 'ArrowRight', 'Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
  if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.boost = true;
  if ((e.code === 'KeyP' || e.code === 'Escape') && !e.repeat) state === 'playing' ? pauseGame() : resumeGame();
  if (e.code === 'Enter' && !e.repeat && (state === 'menu' || state === 'gameover')) startGame();
  if (e.code === 'KeyR' && !e.repeat && state === 'gameover') startGame();
});
addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
  if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.boost = false;
});
document.querySelectorAll('.touch-btn').forEach(btn => {
  const key = btn.dataset.key;
  const on = (e) => { e.preventDefault(); keys[key] = true; btn.classList.add('active'); initAudio(); };
  const off = (e) => { e.preventDefault(); keys[key] = false; btn.classList.remove('active'); };
  btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off); btn.addEventListener('pointerleave', off);
});
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'playing') pauseGame(); });

function frame(now) {
  const dt = Math.min((now - last) / 1000, .034); last = now;
  update(dt); draw(); requestAnimationFrame(frame);
}
updateWallet(); refreshCarCards(); resize(); resetGame(); state = 'menu'; game.speed = 0; ui.menuBest.textContent = pad(best); renderTuning(); requestAnimationFrame(frame);
