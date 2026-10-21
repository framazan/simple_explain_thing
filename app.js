/* =========================================
   READING THE BOOK OF LIFE — App Logic
   All canvas animations + scroll handling
   ========================================= */

// ─── Utility Helpers ─────────────────────
function lerp(a, b, t) { return a + (b - a) * t; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function randomRange(a, b) { return a + Math.random() * (b - a); }
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const DNA_COLORS = {
  A: '#4ADE80',
  C: '#60A5FA',
  G: '#FBBF24',
  T: '#F87171'
};
const DNA_LETTERS = ['A', 'C', 'G', 'T'];
const DNA_COLORS_ARR = [DNA_COLORS.A, DNA_COLORS.C, DNA_COLORS.G, DNA_COLORS.T];

// ─── DPR-aware canvas sizing ─────────────
function setupCanvas(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  return { ctx, w: rect.width, h: rect.height, dpr };
}

// ─── Scroll Progress for an element ──────
function getScrollProgress(el) {
  const rect = el.getBoundingClientRect();
  const windowH = window.innerHeight;
  const totalScroll = el.scrollHeight - windowH;
  if (totalScroll <= 0) return clamp(-rect.top / windowH, 0, 1);
  return clamp(-rect.top / totalScroll, 0, 1);
}

function isInView(el) {
  const rect = el.getBoundingClientRect();
  return rect.top < window.innerHeight && rect.bottom > 0;
}

// =========================================
//  1. HERO — Floating cell particles
// =========================================
function initHeroCanvas() {
  const canvas = document.getElementById('cellCanvas');
  if (!canvas) return;
  const { ctx, w, h } = setupCanvas(canvas);
  const particles = [];
  for (let i = 0; i < 60; i++) {
    particles.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: randomRange(2, 8),
      vx: randomRange(-0.3, 0.3),
      vy: randomRange(-0.3, 0.3),
      opacity: randomRange(0.1, 0.35),
      hue: randomRange(200, 280),
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 60%, 70%, ${p.opacity})`;
      ctx.fill();
      // glow
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(p.x, p.y, p.r * 0.5, p.x, p.y, p.r * 3);
      grad.addColorStop(0, `hsla(${p.hue}, 60%, 70%, ${p.opacity * 0.3})`);
      grad.addColorStop(1, `hsla(${p.hue}, 60%, 70%, 0)`);
      ctx.fillStyle = grad;
      ctx.fill();
    });
    requestAnimationFrame(draw);
  }
  draw();
}

// =========================================
//  DNA HELIX SHARED RENDERER
// =========================================
let sharedDNATime = 0;

function drawDNAHelix(ctx, cx, cy, totalHeight, radius, time, options = {}) {
  const numBases = options.numBases || 38;
  const startY = cy - totalHeight / 2;
  const showLabels = options.showLabels || false;
  const labelAlpha = options.labelAlpha || 0;
  const baseScale = options.baseScale || 1.0;
  const alpha = options.alpha !== undefined ? options.alpha : 1.0;
  if (alpha <= 0.001) return;

  // Draw base pair rungs and spheres
  for (let i = 0; i < numBases; i++) {
    const frac = i / numBases;
    const y = startY + frac * totalHeight;
    const angle = frac * Math.PI * 4 + time;
    const x1 = cx + Math.cos(angle) * radius;
    const x2 = cx + Math.cos(angle + Math.PI) * radius;
    const depth1 = (Math.sin(angle) + 1) / 2;
    const depth2 = (Math.sin(angle + Math.PI) + 1) / 2;
    const colorIdx = i % 4;
    const complementIdx = (colorIdx + 2) % 4;

    // Base pair connection rung
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.strokeStyle = `rgba(180, 190, 240, ${(0.14 + depth1 * 0.22) * alpha})`;
    ctx.lineWidth = Math.max(1, 1.5 * baseScale);
    ctx.stroke();

    // Strand 1 base sphere
    const r1 = Math.max(1.8, (4.5 + depth1 * 3.5) * baseScale);
    ctx.beginPath();
    ctx.arc(x1, y, r1, 0, Math.PI * 2);
    ctx.fillStyle = DNA_COLORS_ARR[colorIdx];
    if (baseScale > 0.55) {
      ctx.shadowColor = DNA_COLORS_ARR[colorIdx];
      ctx.shadowBlur = 8 * depth1 * baseScale;
    }
    ctx.globalAlpha = (0.4 + depth1 * 0.6) * alpha;
    ctx.fill();

    // Strand 2 base sphere
    const r2 = Math.max(1.8, (4.5 + depth2 * 3.5) * baseScale);
    ctx.beginPath();
    ctx.arc(x2, y, r2, 0, Math.PI * 2);
    ctx.fillStyle = DNA_COLORS_ARR[complementIdx];
    if (baseScale > 0.55) {
      ctx.shadowColor = DNA_COLORS_ARR[complementIdx];
      ctx.shadowBlur = 8 * depth2 * baseScale;
    }
    ctx.globalAlpha = (0.4 + depth2 * 0.6) * alpha;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha;
  }

  // Strand 1 backbone line
  ctx.beginPath();
  ctx.globalAlpha = 0.55 * alpha;
  for (let i = 0; i < numBases; i++) {
    const frac = i / numBases;
    const y = startY + frac * totalHeight;
    const angle = frac * Math.PI * 4 + time;
    const x1 = cx + Math.cos(angle) * radius;
    if (i === 0) ctx.moveTo(x1, y);
    else ctx.lineTo(x1, y);
  }
  ctx.strokeStyle = '#818cf8';
  ctx.lineWidth = Math.max(1.5, 2.5 * baseScale);
  ctx.stroke();

  // Strand 2 backbone line
  ctx.beginPath();
  for (let i = 0; i < numBases; i++) {
    const frac = i / numBases;
    const y = startY + frac * totalHeight;
    const angle = frac * Math.PI * 4 + time + Math.PI;
    const x2 = cx + Math.cos(angle) * radius;
    if (i === 0) ctx.moveTo(x2, y);
    else ctx.lineTo(x2, y);
  }
  ctx.strokeStyle = '#a78bfa';
  ctx.lineWidth = Math.max(1.5, 2.5 * baseScale);
  ctx.stroke();
  ctx.globalAlpha = alpha;

  // Letter labels on the dots (A, C, G, T)
  if (showLabels && labelAlpha > 0) {
    ctx.save();
    const effAlpha = labelAlpha * alpha;
    ctx.globalAlpha = effAlpha;
    ctx.font = `bold ${Math.round(15 * baseScale)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < 4; i++) {
      const frac = 0.22 + i * 0.17;
      const y = startY + frac * totalHeight;
      const angle = frac * Math.PI * 4 + time;
      const dotX = cx + Math.cos(angle) * radius;
      const dotY = y;

      const col = DNA_COLORS_ARR[i];
      const letter = DNA_LETTERS[i];

      // Label badge position outward along the rung angle
      const labelDist = radius + 46 * baseScale;
      const labelX = cx + Math.cos(angle) * labelDist;
      const labelY = y;

      // 1. Subtle glowing dotted connection line from dot to badge
      ctx.beginPath();
      ctx.moveTo(dotX, dotY);
      ctx.lineTo(labelX, labelY);
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.55 * effAlpha;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // 2. Highlighting ring on the base dot itself
      ctx.beginPath();
      ctx.arc(dotX, dotY, (6.5 + baseScale * 2.5), 0, Math.PI * 2);
      ctx.strokeStyle = col;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.9 * effAlpha;
      ctx.shadowColor = col;
      ctx.shadowBlur = 10;
      ctx.stroke();

      // 3. Circular badge for the letter
      const badgeR = 14 * baseScale;
      ctx.beginPath();
      ctx.arc(labelX, labelY, badgeR, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(6, 10, 22, 0.92)';
      ctx.shadowColor = col;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // 4. Letter text inside the badge
      ctx.fillStyle = col;
      ctx.shadowBlur = 4;
      ctx.globalAlpha = effAlpha;
      ctx.fillText(letter, labelX, labelY);
    }
    ctx.restore();
  }
}

// =========================================
//  2. ZOOM INTO CELL & NUCLEUS CALLOUT (DNA LOUPE)
// =========================================
function initCellZoom() {
  const section = document.getElementById('section-2');
  const wrapper = document.getElementById('cellZoomWrapper');
  const canvas = document.getElementById('cellCalloutCanvas');
  if (!section || !wrapper || !canvas) return;

  // Enhance to inline SVG for vector sharpness
  fetch('Animal_cells.svg')
    .then(r => r.text())
    .then(svgText => {
      wrapper.innerHTML = svgText;
      const svg = wrapper.querySelector('svg');
      if (svg) {
        svg.classList.add('cell-svg');
        svg.id = 'cellSvg';
      }
    })
    .catch(err => {
      console.warn('Using fallback cell img', err);
    });

  function update() {
    if (!isInView(section)) {
      requestAnimationFrame(update);
      return;
    }

    sharedDNATime += 0.015;
    const { ctx, w, h } = setupCanvas(canvas);
    const t = getScrollProgress(section);
    ctx.clearRect(0, 0, w, h);

    // Natural cell breathing pulse
    const breathe = Math.sin(sharedDNATime * 1.5) * 0.005;

    // Locate the nucleus center in canvas coordinates
    const svgEl = wrapper.querySelector('svg') || wrapper.querySelector('img');
    const cRect = canvas.getBoundingClientRect();
    let nucX = w * 0.48189;
    let nucY = h * 0.53399;
    let nucRadius = Math.min(w, h) * 0.06;

    if (svgEl) {
      const sRect = svgEl.getBoundingClientRect();
      if (sRect.width > 0 && sRect.height > 0) {
        nucX = (sRect.left - cRect.left) + sRect.width * 0.48189;
        nucY = (sRect.top - cRect.top) + sRect.height * 0.53399;
        nucRadius = sRect.width * 0.097;
      }
    }

    // Default callout loupe position (placed near nucleus, upper right)
    const startX = Math.min(w - 140, nucX + Math.max(180, Math.min(w * 0.22, 280)));
    const startY = Math.max(140, Math.min(h - 140, nucY - 35));
    const initialR = clamp(Math.min(w, h) * 0.11, 85, 115);
    const targetR = Math.max(w, h) * 0.85;

    let circleX = startX;
    let circleY = startY;
    let circleR = initialR;
    let helixScale = 0.38;
    let cellScale = 1.0 + breathe;
    let cellOpacity = 1.0;
    let leaderAlpha = 0;
    let circleStrokeAlpha = 0;
    let calloutActive = false;

    const dnaPanel = document.getElementById('dnaTextPanel');
    let showLabels = false;
    let labelAlpha = 0;

    if (t < 0.10) {
      // Stage 1: Cell at full size, text box scrolls up, callout hidden
      cellScale = 1.0 + breathe;
      cellOpacity = 1.0;
      calloutActive = false;
      if (dnaPanel) dnaPanel.classList.remove('visible');
    } else if (t >= 0.10 && t < 0.24) {
      // Stage 2: Callout circle and leader lines appear pointing to nucleus
      const u = (t - 0.10) / 0.14;
      const easeU = easeOutCubic(u);
      circleX = startX;
      circleY = startY;
      circleR = initialR;
      helixScale = 0.38;
      cellScale = 1.0 + breathe;
      cellOpacity = 1.0;
      leaderAlpha = easeU;
      circleStrokeAlpha = easeU;
      calloutActive = true;
      if (dnaPanel) dnaPanel.classList.remove('visible');
    } else if (t >= 0.24 && t < 0.44) {
      // Stage 3: DNA model gets larger, circle glides to center, cell gets smaller & fades out
      const p = (t - 0.24) / 0.20;
      const ep = easeInOutCubic(clamp(p, 0, 1));

      circleX = lerp(startX, w * 0.5, ep);
      circleY = lerp(startY, h * 0.5, ep);
      circleR = lerp(initialR, targetR, ep);
      helixScale = lerp(0.38, 1.0, ep);

      // Cell shrinks and disappears
      cellScale = lerp(1.0, 0.25, ep) + breathe * (1 - p);
      cellOpacity = clamp(1 - p * 1.5, 0, 1);

      // Leader lines fade out as circle moves
      leaderAlpha = clamp(1 - p * 2.2, 0, 1);

      // Circle stroke fades out as it expands
      circleStrokeAlpha = clamp(1 - p * 1.6, 0, 1);

      calloutActive = true;
      if (dnaPanel) dnaPanel.classList.remove('visible');
    } else {
      // Stage 4: Cell and circle lines gone, centered DNA model stays in place
      cellScale = 0.25;
      cellOpacity = 0;
      circleX = w * 0.5;
      circleY = h * 0.5;
      circleR = targetR;
      helixScale = 1.0;
      leaderAlpha = 0;
      circleStrokeAlpha = 0;
      calloutActive = true;

      // The Book of Life box shows up
      if (dnaPanel) {
        if (t >= 0.44 && t <= 0.96) {
          dnaPanel.classList.add('visible');
        } else {
          dnaPanel.classList.remove('visible');
        }
      }

      // Labels on the dots appear as you scroll further with the box
      if (t >= 0.50) {
        showLabels = true;
        labelAlpha = clamp((t - 0.50) / 0.16, 0, 1);
      }
    }

    // Apply cell SVG transform & opacity
    wrapper.style.transform = `scale(${cellScale.toFixed(4)})`;
    wrapper.style.opacity = cellOpacity.toFixed(3);

    // Render Callout Graphics if active
    if (calloutActive) {
      // 1. Draw Leader Lines and projection beam pointing to the nucleus
      if (leaderAlpha > 0.01) {
        const angleToNuc = Math.atan2(nucY - circleY, nucX - circleX);
        const p1X = circleX + Math.cos(angleToNuc + 0.42) * circleR;
        const p1Y = circleY + Math.sin(angleToNuc + 0.42) * circleR;
        const p2X = circleX + Math.cos(angleToNuc - 0.42) * circleR;
        const p2Y = circleY + Math.sin(angleToNuc - 0.42) * circleR;

        // Target points on nucleus perimeter
        const perpX = Math.cos(angleToNuc + Math.PI / 2);
        const perpY = Math.sin(angleToNuc + Math.PI / 2);
        const t1X = nucX + perpX * (nucRadius * 0.35);
        const t1Y = nucY + perpY * (nucRadius * 0.35);
        const t2X = nucX - perpX * (nucRadius * 0.35);
        const t2Y = nucY - perpY * (nucRadius * 0.35);

        // Subtle glowing projection beam
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(p1X, p1Y);
        ctx.lineTo(t1X, t1Y);
        ctx.lineTo(t2X, t2Y);
        ctx.lineTo(p2X, p2Y);
        ctx.closePath();
        const beamGrad = ctx.createLinearGradient(circleX, circleY, nucX, nucY);
        beamGrad.addColorStop(0, `rgba(129, 140, 248, ${0.12 * leaderAlpha})`);
        beamGrad.addColorStop(1, `rgba(129, 140, 248, ${0.01 * leaderAlpha})`);
        ctx.fillStyle = beamGrad;
        ctx.fill();

        // Two sharp leader lines
        ctx.beginPath();
        ctx.moveTo(p1X, p1Y);
        ctx.lineTo(t1X, t1Y);
        ctx.moveTo(p2X, p2Y);
        ctx.lineTo(t2X, t2Y);
        ctx.strokeStyle = `rgba(165, 180, 252, ${0.85 * leaderAlpha})`;
        ctx.lineWidth = 1.75;
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 8;
        ctx.stroke();

        // Target reticle on nucleus
        ctx.beginPath();
        ctx.arc(nucX, nucY, Math.max(10, nucRadius * 0.38), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(129, 140, 248, ${0.75 * leaderAlpha})`;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Glowing center dot on nucleus
        ctx.beginPath();
        ctx.arc(nucX, nucY, 3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 244, 255, ${0.95 * leaderAlpha})`;
        ctx.shadowColor = '#a78bfa';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();
      }

      // 2. DNA Model rendering
      const helixH = lerp(circleR * 2.2, h * 0.8, helixScale);
      const helixR = lerp(circleR * 0.34, Math.min(w, h) * 0.08, helixScale);

      if (circleStrokeAlpha > 0.01) {
        // Clipped inside the circular loupe during zoom/glide
        ctx.save();
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
        ctx.clip();

        ctx.fillStyle = '#06060f';
        ctx.fill();

        drawDNAHelix(ctx, circleX, circleY, helixH, helixR, sharedDNATime, {
          baseScale: helixScale,
          alpha: 1.0,
          showLabels: false,
          labelAlpha: 0
        });
        ctx.restore();

        // 3. Callout Circle Border
        ctx.save();
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(129, 140, 248, ${0.9 * circleStrokeAlpha})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = '#818cf8';
        ctx.shadowBlur = 14 * circleStrokeAlpha;
        ctx.stroke();

        // Outer decorative technical ring
        ctx.beginPath();
        ctx.arc(circleX, circleY, circleR + 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${0.45 * circleStrokeAlpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      } else {
        // Circle is gone: Centered full-scale DNA double helix stays in place
        drawDNAHelix(ctx, w * 0.5, h * 0.5, helixH, helixR, sharedDNATime, {
          baseScale: 1.0,
          alpha: 1.0,
          showLabels: showLabels,
          labelAlpha: labelAlpha
        });
      }
    }

    requestAnimationFrame(update);
  }

  update();
}

// =========================================
//  5. SHOTGUN — DNA breaking into fragments
// =========================================
function initShotgunCanvas() {
  const canvas = document.getElementById('shotgunCanvas');
  if (!canvas) return;
  const section = document.getElementById('section-5');

  // Generate fragments
  const fragments = [];
  const fragCount = 80;
  for (let i = 0; i < fragCount; i++) {
    const seq = [];
    const len = Math.floor(randomRange(6, 14));
    for (let j = 0; j < len; j++) {
      seq.push(DNA_LETTERS[Math.floor(Math.random() * 4)]);
    }
    fragments.push({
      seq,
      startX: 0, startY: 0,
      endX: 0, endY: 0,
      angle: randomRange(-0.3, 0.3),
      delay: randomRange(0, 0.4),
    });
  }

  function draw() {
    if (!isInView(section)) { requestAnimationFrame(draw); return; }
    let { ctx, w, h } = setupCanvas(canvas);
    const t = getScrollProgress(section);
    ctx.clearRect(0, 0, w, h);

    // Pure black background matching page theme
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h / 2;

    const questionBlock = document.getElementById('questionBlock');
    const shotgunPanel = document.getElementById('shotgunTextPanel');

    let strandY = h * 0.68;
    let chainAlpha = 0;
    let postBreak = 0;

    if (t < 0.18) {
      // Phase 1: Question is centered, DNA chain of dots appears right underneath
      if (questionBlock) {
        questionBlock.style.opacity = '1';
        questionBlock.style.transform = 'translateY(0)';
      }
      if (shotgunPanel) shotgunPanel.classList.remove('visible');

      chainAlpha = clamp(t / 0.08, 0, 1);
      strandY = h * 0.68;
      postBreak = 0;
    } else if (t >= 0.18 && t < 0.40) {
      // Phase 2: Title fades away, DNA chain moves to center, Cut It Into Pieces scrolls up
      const u = (t - 0.18) / 0.22;
      const easeU = easeInOutCubic(clamp(u, 0, 1));

      if (questionBlock) {
        questionBlock.style.opacity = (1 - easeU).toFixed(3);
        questionBlock.style.transform = `translateY(${-easeU * 35}px)`;
      }

      strandY = lerp(h * 0.68, h * 0.50, easeU);
      chainAlpha = 1.0;

      if (shotgunPanel) {
        if (u > 0.25) shotgunPanel.classList.add('visible');
        else shotgunPanel.classList.remove('visible');
      }
      postBreak = 0;
    } else {
      // Phase 3: Title gone, Cut It Into Pieces is up, DNA breaks into pieces
      if (questionBlock) questionBlock.style.opacity = '0';
      if (shotgunPanel) shotgunPanel.classList.add('visible');

      strandY = h * 0.50;
      postBreak = clamp((t - 0.40) / 0.38, 0, 1);
      chainAlpha = clamp(1 - postBreak * 3.5, 0, 1);
    }

    // Helper: Draw intact DNA chain of dots
    function drawIntactChain(yPos, alpha) {
      if (alpha <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      const strandLen = Math.min(w * 0.78, 920);
      const startX = cx - strandLen / 2;

      // Backbone line
      ctx.beginPath();
      ctx.moveTo(startX, yPos);
      ctx.lineTo(startX + strandLen, yPos);
      ctx.strokeStyle = 'rgba(129, 140, 248, 0.45)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Chain of dots (bases)
      const numBases = 64;
      for (let i = 0; i < numBases; i++) {
        const bx = startX + (i / (numBases - 1)) * strandLen;
        const colorIdx = i % 4;
        const col = DNA_COLORS_ARR[colorIdx];

        ctx.beginPath();
        ctx.arc(bx, yPos, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = col;
        ctx.shadowColor = col;
        ctx.shadowBlur = 8;
        ctx.fill();
      }
      ctx.restore();
    }

    // Draw intact DNA chain if visible
    if (chainAlpha > 0) {
      drawIntactChain(strandY, chainAlpha);
    }

    // Breaking / Shotgun animation
    if (postBreak > 0) {
      // Distribute fragments
      fragments.forEach((frag, i) => {
        const row = Math.floor(i / 10);
        const col = i % 10;
        frag.startX = cx;
        frag.startY = cy;
        frag.endX = (col + 0.5) * (w / 10);
        frag.endY = (row + 0.5) * (h / 8) + h * 0.05;

        const fragT = clamp((postBreak - frag.delay) * 2.5, 0, 1);
        const eased = easeOutCubic(fragT);
        const fx = lerp(frag.startX, frag.endX, eased);
        const fy = lerp(frag.startY, frag.endY, eased);

        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(frag.angle * eased);
        ctx.globalAlpha = 0.4 + eased * 0.6;

        // Draw fragment as a small sequence
        const charW = 8;
        const totalW = frag.seq.length * charW;
        ctx.font = 'bold 9px Inter';
        ctx.textAlign = 'center';
        frag.seq.forEach((letter, j) => {
          const lx = -totalW / 2 + j * charW + charW / 2;
          ctx.fillStyle = DNA_COLORS[letter];
          ctx.fillText(letter, lx, 3);
        });

        // Underline
        ctx.beginPath();
        ctx.moveTo(-totalW / 2, 7);
        ctx.lineTo(totalW / 2, 7);
        ctx.strokeStyle = 'rgba(100, 100, 180, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();
      });

      // Flash effect at center when breaking
      if (postBreak < 0.25) {
        const flashAlpha = (1 - postBreak / 0.25) * 0.45;
        const flashGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 220);
        flashGrad.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
        flashGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = flashGrad;
        ctx.fillRect(0, 0, w, h);
      }
    }

    requestAnimationFrame(draw);
  }
  draw();
}

// =========================================
//  6. ILLUMINA — Firefly field (THE HERO)
// =========================================
function initIlluminaCanvas() {
  const canvas = document.getElementById('illuminaCanvas');
  if (!canvas) return;
  const section = document.getElementById('section-6');

  // Create firefly grid (flow-cell clusters)
  const gridCols = 38;
  const gridRows = 24;
  const fireflies = [];
  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      fireflies.push({
        col, row,
        letterIdx: Math.floor(Math.random() * 4),
        phase: Math.random() * Math.PI * 2,
        flickerSpeed: randomRange(2.0, 5.0),
        brightness: randomRange(0.5, 0.95),
        targetBrightness: randomRange(0.6, 1.0),
        changeTimer: randomRange(0.1, 1.2),
        baseRadius: randomRange(3.5, 5.5),
        jitterX: randomRange(-4, 4),
        jitterY: randomRange(-4, 4),
      });
    }
  }

  let time = 0;

  function draw() {
    if (!isInView(section)) { requestAnimationFrame(draw); return; }
    let { ctx, w, h } = setupCanvas(canvas);
    time += 0.02;
    ctx.clearRect(0, 0, w, h);

    // Deep black flow cell background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const t = getScrollProgress(section);
    const marginX = w * 0.04;
    const marginY = h * 0.05;
    const areaW = w - marginX * 2;
    const areaH = h - marginY * 2;
    const spacingX = areaW / gridCols;
    const spacingY = areaH / gridRows;

    fireflies.forEach(ff => {
      const fx = marginX + ff.col * spacingX + spacingX / 2 + ff.jitterX;
      const fy = marginY + ff.row * spacingY + spacingY / 2 + ff.jitterY;

      // Periodically switch colors (representing sequential base incorporation)
      ff.changeTimer -= 0.016;
      if (ff.changeTimer <= 0) {
        ff.letterIdx = (ff.letterIdx + Math.floor(Math.random() * 3) + 1) % 4;
        ff.targetBrightness = randomRange(0.6, 1.0);
        ff.changeTimer = randomRange(0.3, 1.6);
      }

      ff.brightness = lerp(ff.brightness, ff.targetBrightness, 0.1);

      const flicker = (Math.sin(time * ff.flickerSpeed + ff.phase) + 1) / 2;
      const b = ff.brightness * (0.35 + 0.65 * flicker);

      const color = DNA_COLORS_ARR[ff.letterIdx];
      const r = ff.baseRadius * (0.7 + b * 0.6);
      const glowR = r * 5.5;

      // Wide soft fluorescent halo
      const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, glowR);
      glow.addColorStop(0, hexToRgba(color, b * 0.55));
      glow.addColorStop(0.35, hexToRgba(color, b * 0.2));
      glow.addColorStop(0.7, hexToRgba(color, b * 0.04));
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(fx - glowR, fy - glowR, glowR * 2, glowR * 2);

      // Saturated glowing core
      ctx.beginPath();
      ctx.arc(fx, fy, r, 0, Math.PI * 2);
      ctx.fillStyle = hexToRgba(color, Math.min(1, 0.8 + b * 0.2));
      ctx.fill();

      // White-hot center of fluorescent emission
      ctx.beginPath();
      ctx.arc(fx, fy, r * 0.45, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.6 + b * 0.4)})`;
      ctx.fill();
    });

    // Subtle edge vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(2, 3, 10, 0.5)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);

    requestAnimationFrame(draw);
  }
  draw();
}

// =========================================
//  7. ASSEMBLY — Fragment matching animation
// =========================================
function initAssemblyCanvas() {
  const canvas = document.getElementById('assemblyCanvas');
  if (!canvas) return;
  const section = document.getElementById('section-7');

  // Create some fragment pairs that match
  const pairs = [
    { left: 'A T G C C A'.split(' '), right: 'C A G T T A'.split(' '), overlap: 2 },
    { left: 'G T A C'.split(' '), right: 'A C T G G'.split(' '), overlap: 2 },
    { left: 'T T A G C'.split(' '), right: 'G C A A T'.split(' '), overlap: 2 },
    { left: 'C G A T T'.split(' '), right: 'T T C G A'.split(' '), overlap: 2 },
    { left: 'A A G C T'.split(' '), right: 'C T A A G'.split(' '), overlap: 2 },
  ];

  function draw() {
    if (!isInView(section)) { requestAnimationFrame(draw); return; }
    let { ctx, w, h } = setupCanvas(canvas);
    const t = getScrollProgress(section);
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const charW = 22;
    const pairHeight = h / (pairs.length + 1);

    pairs.forEach((pair, i) => {
      const py = pairHeight * (i + 0.5);
      const delay = i * 0.12;
      const pairT = clamp((t - delay) * 2.5, 0, 1);
      const eased = easeInOutCubic(pairT);

      const leftLen = pair.left.length;
      const rightLen = pair.right.length;
      const totalLen = leftLen + rightLen - pair.overlap;

      // Start: fragments apart, End: fragments joined
      const separation = lerp(w * 0.2, 0, eased);

      // Left fragment
      const leftStartX = cx - (totalLen * charW) / 2 - separation;
      ctx.font = 'bold 14px Inter';
      ctx.textAlign = 'center';

      pair.left.forEach((letter, j) => {
        const lx = leftStartX + j * charW + charW / 2;
        const isOverlap = j >= leftLen - pair.overlap;

        // Highlight overlap
        if (isOverlap && pairT > 0.5) {
          const hlAlpha = (pairT - 0.5) * 2;
          ctx.fillStyle = `rgba(255, 255, 255, ${hlAlpha * 0.08})`;
          ctx.fillRect(lx - charW / 2, py - 12, charW, 24);
        }

        ctx.fillStyle = DNA_COLORS[letter];
        ctx.globalAlpha = 0.5 + eased * 0.5;
        ctx.fillText(letter, lx, py + 5);
        ctx.globalAlpha = 1;
      });

      // Right fragment
      const rightStartX = cx - (totalLen * charW) / 2 + (leftLen - pair.overlap) * charW + separation;
      pair.right.forEach((letter, j) => {
        const lx = rightStartX + j * charW + charW / 2;
        const isOverlap = j < pair.overlap;

        if (isOverlap && pairT > 0.5) {
          const hlAlpha = (pairT - 0.5) * 2;
          ctx.fillStyle = `rgba(255, 255, 255, ${hlAlpha * 0.08})`;
          ctx.fillRect(lx - charW / 2, py - 12, charW, 24);
        }

        ctx.fillStyle = DNA_COLORS[letter];
        ctx.globalAlpha = 0.5 + eased * 0.5;
        ctx.fillText(letter, lx, py + 5);
        ctx.globalAlpha = 1;
      });

      // Underlines
      ctx.beginPath();
      ctx.moveTo(leftStartX, py + 14);
      ctx.lineTo(leftStartX + leftLen * charW, py + 14);
      ctx.strokeStyle = 'rgba(100, 100, 200, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(rightStartX, py + 14);
      ctx.lineTo(rightStartX + rightLen * charW, py + 14);
      ctx.stroke();

      // Match indicator
      if (pairT > 0.7) {
        const matchAlpha = (pairT - 0.7) / 0.3;
        ctx.save();
        ctx.globalAlpha = matchAlpha * 0.7;
        ctx.font = '11px Inter';
        ctx.fillStyle = '#4ADE80';
        ctx.textAlign = 'right';
        ctx.fillText('match ✓', leftStartX - 15, py + 5);
        ctx.restore();
      }
    });

    requestAnimationFrame(draw);
  }
  draw();
}

// =========================================
//  8. REPEATS — "and and and" problem
// =========================================
function initRepeatCanvas() {
  const canvas = document.getElementById('repeatCanvas');
  if (!canvas) return;
  const section = document.getElementById('section-8');

  function draw() {
    if (!isInView(section)) { requestAnimationFrame(draw); return; }
    let { ctx, w, h } = setupCanvas(canvas);
    const t = getScrollProgress(section);
    ctx.clearRect(0, 0, w, h);

    // Pure black background matching other dark sections
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const isWide = w > 900;
    const cy = h / 2;

    // Position page in the left viewing area so it never overlaps the right text panel
    const leftAvailable = isWide ? (w * 0.95 - 460) : w;
    const pageW = isWide ? Math.min(leftAvailable * 0.9, 640) : Math.min(w * 0.88, 520);
    const pageH = Math.min(h * 0.65, 500);
    const pageX = isWide ? Math.max(30, (leftAvailable - pageW) / 2) : (w - pageW) / 2;
    const pageY = cy - pageH / 2;

    // Dark page container with subtle border and shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(13, 16, 28, 0.92)';
    ctx.fillRect(pageX, pageY, pageW, pageH);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(pageX, pageY, pageW, pageH);
    ctx.restore();

    // Fill page with repeating text
    ctx.save();
    ctx.beginPath();
    ctx.rect(pageX + 10, pageY + 10, pageW - 20, pageH - 20);
    ctx.clip();

    ctx.font = '13px Inter, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    const lineH = 22;
    const lines = Math.ceil((pageH - 20) / lineH);

    for (let line = 0; line < lines; line++) {
      const y = pageY + 25 + line * lineH;
      let x = pageX + 15;
      while (x < pageX + pageW - 15) {
        for (let li = 0; li < 4; li++) {
          const letter = DNA_LETTERS[li % 4];
          ctx.fillStyle = DNA_COLORS[letter];
          ctx.globalAlpha = 0.65;
          ctx.fillText(letter + ' ', x, y);
          x += ctx.measureText(letter + ' ').width;
          if (x > pageX + pageW - 25) break;
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // Show a fragment "window" that slides across — too short to be unique
    if (t > 0.15) {
      const fragT = clamp((t - 0.15) * 2.2, 0, 1);
      const fragW = Math.max(pageW * 0.2, 110);
      const fragH = lineH + 4;
      const fragX = pageX + 20 + fragT * (pageW - fragW - 40);
      const fragY = pageY + 25 + 2 * lineH + 4;

      // Highlight box
      ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
      ctx.fillRect(fragX, fragY, fragW, fragH);

      ctx.strokeStyle = '#F87171';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(fragX, fragY, fragW, fragH);
      ctx.setLineDash([]);

      // Label (centered over fragment, safely clamped within page boundaries)
      ctx.font = '12px Inter, -apple-system, sans-serif';
      ctx.fillStyle = '#FCA5A5';
      ctx.textAlign = 'center';
      const labelX = clamp(fragX + fragW / 2, pageX + 115, pageX + pageW - 115);
      ctx.fillText('This piece looks the same everywhere!', labelX, fragY - 10);

    }

    requestAnimationFrame(draw);
  }
  draw();
}

// =========================================
// =========================================
//  10. PACBIO — Zero-mode waveguide (SMRT Sequencing)
// =========================================
function initPacBioCanvas() {
  const canvas = document.getElementById('pacbioCanvas');
  if (!canvas) return;
  const section = document.getElementById('section-10');
  let time = 0;

  // Fixed circular DNA sequence (64 bases)
  const circularDNA = [
    'A', 'T', 'G', 'C', 'C', 'A', 'G', 'T', 'T', 'A', 'A', 'C', 'G', 'T', 'A', 'C',
    'A', 'C', 'T', 'G', 'G', 'T', 'T', 'A', 'G', 'C', 'G', 'C', 'A', 'A', 'T', 'C',
    'G', 'A', 'T', 'T', 'T', 'T', 'C', 'G', 'A', 'A', 'A', 'G', 'C', 'T', 'C', 'T',
    'A', 'A', 'G', 'T', 'G', 'C', 'A', 'T', 'C', 'G', 'T', 'A', 'A', 'T', 'C', 'C'
  ];

  // Floating free nucleotides in solution (Brownian motion)
  const freeNucleotides = [];
  for (let i = 0; i < 20; i++) {
    freeNucleotides.push({
      xRel: (Math.random() - 0.5) * 1.6,
      yRel: Math.random() * 1.3 - 0.35,
      base: DNA_LETTERS[Math.floor(Math.random() * 4)],
      speed: 0.3 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      tailAngle: Math.random() * Math.PI * 2
    });
  }

  // Spline interpolation for smooth closed circular loop
  function getClosedSplinePoint(pts, u) {
    const M = pts.length;
    let wrapped = ((u % M) + M) % M;
    const i = Math.floor(wrapped);
    const t = wrapped - i;
    const p0 = pts[(i - 1 + M) % M];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % M];
    const p3 = pts[(i + 2) % M];

    const t2 = t * t;
    const t3 = t2 * t;

    return {
      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
    };
  }

  // Pre-sample points along spline with approximate arc-length
  function sampleSplinePoints(pts, numSamples) {
    const samples = [];
    for (let s = 0; s < numSamples; s++) {
      samples.push(getClosedSplinePoint(pts, (s / numSamples) * pts.length));
    }
    return samples;
  }

  function draw() {
    if (!isInView(section)) { requestAnimationFrame(draw); return; }
    let { ctx, w, h } = setupCanvas(canvas);
    time += 0.016;
    const t = getScrollProgress(section);
    ctx.clearRect(0, 0, w, h);

    // Pure black background matching all other sections
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const isWide = w > 900;
    // Position chamber in the left viewing area so right text panel never overlaps
    const cx = isWide ? (w * 0.35) : (w / 2);
    const cy = h * 0.5;

    // Zero-mode waveguide dimensions
    const wellInnerW = Math.min(w * 0.36, 320);
    const wellH = Math.min(h * 0.48, 380);
    const wellBottom = cy + wellH * 0.44;
    const wellTop = wellBottom - wellH;
    const wallThick = Math.min(w * 0.18, 160);
    const wH = wellInnerW * 0.5;

    // Control points for the elongated circular DNA loop (SMRTbell)
    // The strand loops down from the top solution, down the left side,
    // passes through polymerase at bottom center (cx, wellBottom - 26),
    // rises up the right side, loops out into upper solution, and back down!
    // Control points for the elongated circular DNA loop (SMRTbell)
    // P0 is at the bottom center inside the polymerase active site
    const loopPts = [
      { x: cx, y: wellBottom - 24 },                     // P0: Active site inside polymerase at bottom
      { x: cx + wH * 0.45, y: wellBottom - 58 },         // P1: Exiting polymerase curving up-right
      { x: cx + wH * 0.78, y: wellTop + wellH * 0.56 },  // P2: Rising inside right well wall
      { x: cx + wH * 0.88, y: wellTop + 24 },            // P3: Near top-right opening
      { x: cx + wH * 1.15, y: wellTop - 45 },            // P4: Emerging into upper bulk solution (right)
      { x: cx + wH * 0.58, y: wellTop - 80 },            // P5: Arching across upper solution
      { x: cx - wH * 0.22, y: wellTop - 85 },            // P6: Arching across top left
      { x: cx - wH * 1.05, y: wellTop - 50 },            // P7: In solution on top left
      { x: cx - wH * 0.82, y: wellTop + 25 },            // P8: Entering well from top left
      { x: cx - wH * 0.68, y: wellTop + wellH * 0.54 },  // P9: Descending through left well wall
      { x: cx - wH * 0.4, y: wellBottom - 58 }           // P10: Approaching polymerase from left
    ];

    // Pre-sample 240 points for smooth backbone and arc parameterization
    const splineSamples = sampleSplinePoints(loopPts, 240);
    const numSamples = splineSamples.length;

    // Motion parameters
    const strandSpeed = 0.045; // loop rotations per second
    const strandProgress = (time * strandSpeed) % 1.0;
    const totalBases = circularDNA.length;
    const step = 1.0 / totalBases;

    // The base physically located at the bottom active site (u = 0.0):
    // For base i, its position u = ((i / totalBases) + strandProgress) % 1.0.
    // For u ≈ 0.0, i/totalBases ≈ 1.0 - strandProgress.
    const activeBaseExact = ((1.0 - (strandProgress % 1.0)) * totalBases);
    let activeBaseIdx = Math.floor(activeBaseExact) % totalBases;
    if (activeBaseIdx < 0) activeBaseIdx += totalBases;

    // Normalized dwell of this base as it passes through the bottom active site (0 -> 1)
    const baseDwell = activeBaseExact - Math.floor(activeBaseExact);
    const activeBaseLetter = circularDNA[activeBaseIdx];

    // Laser zap dynamics: fires strictly when the base is traversing the bottom active site
    const zapIntensity = Math.sin(baseDwell * Math.PI);

    const currentPassNum = Math.floor(time * strandSpeed) + 1;

    // ----------------------------------------------------
    // 1. DRAW ZERO-MODE WAVEGUIDE WALLS & BACKGROUND
    // ----------------------------------------------------
    ctx.save();

    // Top solution ambient gradient
    const solGrad = ctx.createLinearGradient(0, wellTop - 140, 0, wellTop);
    solGrad.addColorStop(0, 'rgba(10, 14, 28, 0.9)');
    solGrad.addColorStop(1, 'rgba(6, 8, 16, 0.95)');
    ctx.fillStyle = solGrad;
    ctx.fillRect(cx - wellInnerW * 1.5, wellTop - 140, wellInnerW * 3, 140);

    // Interior of the nanoscale well (dark chamber)
    ctx.fillStyle = '#060813';
    ctx.fillRect(cx - wH, wellTop, wellInnerW, wellH);

    // Left metallic cladding wall
    const leftWallGrad = ctx.createLinearGradient(cx - wH - wallThick, wellTop, cx - wH, wellTop);
    leftWallGrad.addColorStop(0, '#1c1f2e');
    leftWallGrad.addColorStop(0.7, '#2b2f42');
    leftWallGrad.addColorStop(0.95, '#3b4058');
    leftWallGrad.addColorStop(1, '#4a506d'); // specular edge highlight
    ctx.fillStyle = leftWallGrad;
    ctx.fillRect(cx - wH - wallThick, wellTop, wallThick, wellH);

    // Right metallic cladding wall
    const rightWallGrad = ctx.createLinearGradient(cx + wH, wellTop, cx + wH + wallThick, wellTop);
    rightWallGrad.addColorStop(0, '#4a506d'); // specular edge highlight
    rightWallGrad.addColorStop(0.05, '#3b4058');
    rightWallGrad.addColorStop(0.3, '#2b2f42');
    rightWallGrad.addColorStop(1, '#1c1f2e');
    ctx.fillStyle = rightWallGrad;
    ctx.fillRect(cx + wH, wellTop, wallThick, wellH);

    // Top horizontal beveled lip of metallic cladding
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - wH - wallThick, wellTop);
    ctx.lineTo(cx - wH, wellTop);
    ctx.moveTo(cx + wH, wellTop);
    ctx.lineTo(cx + wH + wallThick, wellTop);
    ctx.stroke();

    // Inner corner vertical highlights
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - wH, wellTop);
    ctx.lineTo(cx - wH, wellBottom);
    ctx.moveTo(cx + wH, wellTop);
    ctx.lineTo(cx + wH, wellBottom);
    ctx.stroke();

    // Glass substrate floor (below wellBottom)
    const glassH = 75;
    const glassGrad = ctx.createLinearGradient(0, wellBottom, 0, wellBottom + glassH);
    glassGrad.addColorStop(0, 'rgba(186, 230, 253, 0.22)');
    glassGrad.addColorStop(0.15, 'rgba(125, 211, 252, 0.12)');
    glassGrad.addColorStop(0.6, 'rgba(14, 165, 233, 0.05)');
    glassGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(cx - wH - wallThick, wellBottom, wellInnerW + wallThick * 2, glassH);

    // Glass interface bright surface line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx - wH - wallThick, wellBottom);
    ctx.lineTo(cx + wH + wallThick, wellBottom);
    ctx.stroke();

    ctx.restore();

    // ----------------------------------------------------
    // 2. LASER ZAP BEAMS (from beneath the glass at the bottom)
    // ----------------------------------------------------
    ctx.save();
    if (zapIntensity > 0.02) {
      const activeColor = DNA_COLORS[activeBaseLetter];

      // Laser focus beam underneath glass
      ctx.save();
      ctx.shadowColor = activeColor;
      ctx.shadowBlur = 24 * zapIntensity;

      // Central vertical zap ray hitting the bottom active site
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * zapIntensity})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, wellBottom + 34);
      ctx.lineTo(cx, wellBottom);
      ctx.stroke();

      // Angled laser converging rays
      ctx.strokeStyle = hexToRgba(activeColor, 0.75 * zapIntensity);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx - 28, wellBottom + 34);
      ctx.lineTo(cx, wellBottom);
      ctx.moveTo(cx + 28, wellBottom + 34);
      ctx.lineTo(cx, wellBottom);
      ctx.stroke();

      // High-energy focal spot at glass surface
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, wellBottom, 4.5 * zapIntensity, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();

    // ----------------------------------------------------
    // 3. EVANESCENT LIGHT FIELD GRADIENT (at bottom of well)
    // ----------------------------------------------------
    // "the zaps should create a gradient of brief light at the bottom of the well"
    ctx.save();

    // Baseline ambient evanescent glow (always faint at bottom 20nm)
    const ambH = Math.min(wellH * 0.14, 45);
    const ambGrad = ctx.createLinearGradient(cx, wellBottom, cx, wellBottom - ambH);
    ambGrad.addColorStop(0, 'rgba(147, 197, 253, 0.16)');
    ambGrad.addColorStop(0.5, 'rgba(99, 102, 241, 0.06)');
    ambGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = ambGrad;
    ctx.fillRect(cx - wH + 1, wellBottom - ambH, wellInnerW - 2, ambH);

    // Active Laser Zap evanescent gradient pulse!
    if (zapIntensity > 0.02) {
      const activeColor = DNA_COLORS[activeBaseLetter];
      const zapH = Math.min(wellH * 0.32, 95); // exponentially decaying field restricted to bottom

      const zapGrad = ctx.createRadialGradient(
        cx, wellBottom, 3,
        cx, wellBottom, zapH
      );
      zapGrad.addColorStop(0, `rgba(255, 255, 255, ${0.98 * zapIntensity})`);
      zapGrad.addColorStop(0.16, `rgba(224, 242, 254, ${0.85 * zapIntensity})`);
      zapGrad.addColorStop(0.42, hexToRgba(activeColor, 0.7 * zapIntensity));
      zapGrad.addColorStop(0.72, `rgba(99, 102, 241, ${0.25 * zapIntensity})`);
      zapGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = zapGrad;
      ctx.fillRect(cx - wH + 1, wellBottom - zapH, wellInnerW - 2, zapH);

      // Brief horizontal flash along well floor
      ctx.fillStyle = hexToRgba(activeColor, 0.3 * zapIntensity);
      ctx.fillRect(cx - wH + 1, wellBottom - 6, wellInnerW - 2, 6);
    }
    ctx.restore();

    // ----------------------------------------------------
    // 4. FREE FLOATING FLUORESCENT NUCLEOTIDES (Brownian motion)
    // ----------------------------------------------------
    ctx.save();
    freeNucleotides.forEach((nt) => {
      // Natural gentle Brownian drift
      const nx = cx + nt.xRel * (wellInnerW * 0.5) + Math.cos(time * nt.speed + nt.phase) * 8;
      const ny = wellTop + nt.yRel * wellH + Math.sin(time * nt.speed * 1.2 + nt.phase) * 8;

      // Only draw if within reasonable bounds
      if (ny < wellBottom - 18 && ny > wellTop - 80 && nx > cx - wellInnerW * 0.7 && nx < cx + wellInnerW * 0.7) {
        // Tag dot (fluorescent dye)
        ctx.fillStyle = DNA_COLORS[nt.base];
        ctx.globalAlpha = 0.55;
        ctx.beginPath();
        ctx.arc(nx, ny, 2.8, 0, Math.PI * 2);
        ctx.fill();

        // Tiny polyphosphate tail / linker
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 1;
        const tailX = nx + Math.cos(nt.tailAngle) * 5;
        const tailY = ny + Math.sin(nt.tailAngle) * 5;
        ctx.beginPath();
        ctx.moveTo(nx, ny);
        ctx.lineTo(tailX, tailY);
        ctx.stroke();
      }
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    // ----------------------------------------------------
    // 5. DNA POLYMERASE ENZYME (anchored at bottom center)
    // ----------------------------------------------------
    ctx.save();
    const polyX = cx;
    const polyY = wellBottom - 18;

    // Anchor bolt on glass
    ctx.fillStyle = '#06b6d4';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(polyX - 9, wellBottom - 5, 18, 5, 2);
    else ctx.rect(polyX - 9, wellBottom - 5, 18, 5);
    ctx.fill();

    // Multi-lobed molecular structure of DNA Polymerase
    const lobes = [
      { x: polyX - 16, y: polyY + 3, r: 13, shade: '#94a3b8' },
      { x: polyX + 16, y: polyY + 3, r: 13, shade: '#94a3b8' },
      { x: polyX - 18, y: polyY - 12, r: 11, shade: '#cbd5e1' }, // Thumb domain
      { x: polyX + 18, y: polyY - 10, r: 12, shade: '#cbd5e1' }, // Fingers domain
      { x: polyX, y: polyY - 4, r: 14, shade: '#e2e8f0' },        // Palm / catalytic cleft
    ];

    lobes.forEach((lb) => {
      const grad = ctx.createRadialGradient(lb.x - 3, lb.y - 3, 2, lb.x, lb.y, lb.r);
      if (zapIntensity > 0.05) {
        // Reflect laser light during zap!
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.5, hexToRgba(DNA_COLORS[activeBaseLetter], 0.65));
        grad.addColorStop(1, '#475569');
      } else {
        grad.addColorStop(0, '#f8fafc');
        grad.addColorStop(0.6, lb.shade);
        grad.addColorStop(1, '#475569');
      }
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lb.x, lb.y, lb.r, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();

    // ----------------------------------------------------
    // 6. CONTINUOUS CIRCULAR DNA STRAND (SMRTbell)
    // ----------------------------------------------------
    // "The DNA strand should be longer, and not colored.
    // The laser should color each base momentarily as it keeps rotating into and out of the well."
    ctx.save();

    // Double-rail backbone along the closed spline
    ctx.beginPath();
    for (let s = 0; s < numSamples; s++) {
      const pt = splineSamples[s];
      if (s === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(165, 180, 252, 0.32)';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Draw each base along the circular strand
    for (let i = 0; i < totalBases; i++) {
      // Position along the loop curve
      let u = ((i / totalBases) + strandProgress) % 1.0;
      if (u < 0) u += 1.0;
      const sampleIdx = Math.floor(u * numSamples) % numSamples;
      const bpt = splineSamples[sampleIdx];

      const letter = circularDNA[i];

      // A base is active ONLY when it is physically at the bottom active site (P0 at u ≈ 0.0)
      let distFromActive = u;
      if (distFromActive > 0.5) distFromActive -= 1.0; // wrapped distance in [-0.5, 0.5]
      const isAtBottomActiveSite = Math.abs(distFromActive) <= (step * 0.5);
      const isActive = isAtBottomActiveSite && zapIntensity > 0.05;

      if (isActive) {
        // ACTIVE BASE: Colored momentarily by laser zap strictly at the bottom of the well!
        const baseColor = DNA_COLORS[letter];

        // Pulsating fluorescent aura strictly at the bottom
        const aura = ctx.createRadialGradient(bpt.x, bpt.y, 1, bpt.x, bpt.y, 22 * zapIntensity);
        aura.addColorStop(0, '#ffffff');
        aura.addColorStop(0.35, baseColor);
        aura.addColorStop(0.7, hexToRgba(baseColor, 0.45 * zapIntensity));
        aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(bpt.x, bpt.y, 22 * zapIntensity, 0, Math.PI * 2);
        ctx.fill();

        // Glowing core bead
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bpt.x, bpt.y, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Cleaved fluorophore tag drifting upwards from active site
        const tagY = bpt.y - 8 - baseDwell * 20;
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = (1 - baseDwell) * zapIntensity;
        ctx.beginPath();
        ctx.arc(bpt.x + 4, tagY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Floating detected base badge directly above polymerase at bottom
        ctx.save();
        ctx.font = 'bold 15px Inter, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 12 * zapIntensity;
        ctx.fillText(letter, cx, wellBottom - 44);
        ctx.restore();

      } else {
        // UNCOLORED NEUTRAL BASE (everywhere else along the loop!)
        ctx.fillStyle = 'rgba(203, 213, 225, 0.85)';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.45)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(bpt.x, bpt.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Subtle specular highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(bpt.x - 1.2, bpt.y - 1.2, 1.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();

    // ----------------------------------------------------
    // 7. LABELS, PASS COUNTER & REAL-TIME SEQUENCE TICKER
    // ----------------------------------------------------
    ctx.save();

    // Dynamic Pass Counter & Live Readout Tape
    // Positioned below the well on the left
    const hudY = wellBottom + 52;
    ctx.textAlign = 'left';
    ctx.font = '13px Inter, -apple-system, sans-serif';
    ctx.fillStyle = '#4ADE80';
    ctx.fillText(`Read pass #${currentPassNum}`, cx - wH, hudY + 20);

    // Real-time tape of recent 8 read letters
    const tapeX = cx - wH;
    const tapeY = hudY + 36;
    for (let k = 0; k < 8; k++) {
      const readIdx = (activeBaseIdx - (7 - k) + totalBases * 10) % totalBases;
      const readLetter = circularDNA[readIdx];
      const isLatest = (k === 7);
      const bx = tapeX + k * 28;

      ctx.fillStyle = isLatest && zapIntensity > 0.1
        ? hexToRgba(DNA_COLORS[readLetter], 0.35)
        : 'rgba(30, 41, 59, 0.7)';
      ctx.strokeStyle = isLatest && zapIntensity > 0.1
        ? DNA_COLORS[readLetter]
        : 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, tapeY, 22, 22, 4);
      else ctx.rect(bx, tapeY, 22, 22);
      ctx.fill();
      ctx.stroke();

      ctx.font = 'bold 12px Inter, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = isLatest && zapIntensity > 0.1 ? '#ffffff' : DNA_COLORS[readLetter];
      ctx.fillText(readLetter, bx + 11, tapeY + 11);
    }
    ctx.textBaseline = 'alphabetic';

    ctx.restore();

    requestAnimationFrame(draw);
  }
  draw();
}

// =========================================
//  11. NANOPORE — DNA threading through pore
// =========================================
function initNanoporeCanvas() {
  const canvas = document.getElementById('nanoporeCanvas');
  if (!canvas) return;
  const section = document.getElementById('section-11');
  let time = 0;

  // Long DNA strand
  const strandLength = 80;
  const strand = [];
  for (let i = 0; i < strandLength; i++) {
    strand.push(DNA_LETTERS[Math.floor(Math.random() * 4)]);
  }

  // Signal history
  const signalHistory = [];
  const maxSignal = 200;

  function draw() {
    if (!isInView(section)) { requestAnimationFrame(draw); return; }
    let { ctx, w, h } = setupCanvas(canvas);
    time += 0.016;
    const t = getScrollProgress(section);
    ctx.clearRect(0, 0, w, h);

    // Dark background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.4;
    const cy = h * 0.45;

    // The membrane
    const memY = cy;
    const memThick = 20;

    ctx.fillStyle = '#1a1a35';
    ctx.fillRect(0, memY - memThick / 2, w * 0.8, memThick);

    // Gradient edges
    const memGrad = ctx.createLinearGradient(0, memY - memThick, 0, memY + memThick);
    memGrad.addColorStop(0, 'rgba(30, 30, 60, 0.3)');
    memGrad.addColorStop(0.5, 'rgba(40, 40, 80, 0.8)');
    memGrad.addColorStop(1, 'rgba(30, 30, 60, 0.3)');
    ctx.fillStyle = memGrad;
    ctx.fillRect(0, memY - memThick, w * 0.8, memThick * 2);

    // Pore (hole in membrane)
    const poreW = 18;
    const poreH = memThick + 10;
    ctx.fillStyle = '#08081a';
    ctx.beginPath();
    // Pore shape: narrow funnel
    ctx.moveTo(cx - poreW, memY - memThick / 2 - 5);
    ctx.lineTo(cx - poreW * 0.4, memY);
    ctx.lineTo(cx - poreW, memY + memThick / 2 + 5);
    ctx.lineTo(cx + poreW, memY + memThick / 2 + 5);
    ctx.lineTo(cx + poreW * 0.4, memY);
    ctx.lineTo(cx + poreW, memY - memThick / 2 - 5);
    ctx.closePath();
    ctx.fill();

    // Pore protein edges
    ctx.strokeStyle = '#4a4a8a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // DNA strand threading through
    const threadSpeed = t * strandLength;
    const baseSpacing = 12;
    const activation = clamp(t * 2, 0, 1);

    ctx.save();
    ctx.globalAlpha = activation;

    // Current base in the pore
    const currentBaseIdx = Math.floor(threadSpeed) % strandLength;

    for (let i = 0; i < strandLength; i++) {
      const offset = i - threadSpeed;
      let bx = cx;
      let by = memY + offset * baseSpacing;

      // Bases above the pore move straight down
      // Bases below the pore continue down
      // The one IN the pore gets a glow

      // Skip if too far away
      if (by < memY - h * 0.45 || by > memY + h * 0.45) continue;

      // Wiggle for bases not in pore
      if (Math.abs(offset) > 1) {
        bx += Math.sin(by * 0.05 + time * 2) * 3;
      }

      const r = 4;
      const letter = strand[i];

      // Flash when passing through pore
      const distFromPore = Math.abs(offset);
      const inPore = distFromPore < 0.8;

      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fillStyle = DNA_COLORS[letter];
      ctx.globalAlpha = activation * (inPore ? 1 : 0.5);
      ctx.fill();

      if (inPore) {
        const pGrad = ctx.createRadialGradient(bx, by, 0, bx, by, 30);
        pGrad.addColorStop(0, hexToRgba(DNA_COLORS[letter], 0.6));
        pGrad.addColorStop(0.5, hexToRgba(DNA_COLORS[letter], 0.15));
        pGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = activation;
        ctx.fillStyle = pGrad;
        ctx.fillRect(bx - 30, by - 30, 60, 60);

        // Letter label
        ctx.font = 'bold 14px Inter';
        ctx.fillStyle = DNA_COLORS[letter];
        ctx.textAlign = 'center';
        ctx.globalAlpha = activation * 0.9;
        ctx.fillText(letter, bx + 30, by + 5);
      }
      ctx.globalAlpha = activation;
    }

    // Backbone line
    ctx.beginPath();
    ctx.globalAlpha = activation * 0.2;
    for (let i = 0; i < strandLength; i++) {
      const offset = i - threadSpeed;
      let bx = cx;
      let by = memY + offset * baseSpacing;
      if (by < memY - h * 0.45 || by > memY + h * 0.45) continue;
      if (Math.abs(offset) > 1) bx += Math.sin(by * 0.05 + time * 2) * 3;
      if (i === 0 || by === memY - h * 0.45) ctx.moveTo(bx, by);
      else ctx.lineTo(bx, by);
    }
    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.restore();

    // Electrical signal readout (right side)
    const signalX = w * 0.55;
    const signalY = h * 0.15;
    const signalW = w * 0.35;
    const signalH = h * 0.7;

    if (t > 0.1) {
      const sigAlpha = clamp((t - 0.1) * 4, 0, 1);
      ctx.save();
      ctx.globalAlpha = sigAlpha;

      // Signal box background
      ctx.fillStyle = 'rgba(15, 15, 30, 0.6)';
      ctx.fillRect(signalX - 10, signalY - 10, signalW + 20, signalH + 40);
      ctx.strokeStyle = 'rgba(100, 100, 180, 0.15)';
      ctx.lineWidth = 1;
      ctx.strokeRect(signalX - 10, signalY - 10, signalW + 20, signalH + 40);

      // Label
      ctx.font = '11px Inter';
      ctx.fillStyle = '#8888bb';
      ctx.textAlign = 'left';
      ctx.fillText('Power flow through the hole', signalX, signalY - 18);

      // Add current signal point
      const currentLetter = strand[currentBaseIdx];
      const baseVoltages = { A: 0.7, C: 0.4, G: 0.85, T: 0.2 };
      const voltage = baseVoltages[currentLetter] + (Math.random() - 0.5) * 0.08;

      if (signalHistory.length >= maxSignal) signalHistory.shift();
      signalHistory.push({ v: voltage, letter: currentLetter });

      // Draw signal trace
      ctx.beginPath();
      for (let i = 0; i < signalHistory.length; i++) {
        const sx = signalX + (i / maxSignal) * signalW;
        const sy = signalY + signalH - signalHistory[i].v * signalH;
        if (i === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = '#60A5FA';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Color the current point
      if (signalHistory.length > 0) {
        const last = signalHistory[signalHistory.length - 1];
        const lx = signalX + ((signalHistory.length - 1) / maxSignal) * signalW;
        const ly = signalY + signalH - last.v * signalH;
        ctx.beginPath();
        ctx.arc(lx, ly, 4, 0, Math.PI * 2);
        ctx.fillStyle = DNA_COLORS[last.letter];
        ctx.fill();

        // Letter label for current
        ctx.font = 'bold 12px Inter';
        ctx.fillStyle = DNA_COLORS[last.letter];
        ctx.textAlign = 'left';
        ctx.fillText(last.letter, lx + 8, ly + 4);
      }

      // Voltage labels
      ctx.font = '9px Inter';
      ctx.fillStyle = '#555580';
      ctx.textAlign = 'right';
      ctx.fillText('High', signalX - 5, signalY + 10);
      ctx.fillText('Low', signalX - 5, signalY + signalH);

      ctx.restore();
    }

    requestAnimationFrame(draw);
  }
  draw();
}

// =========================================
//  SCROLL MANAGEMENT & INITIALIZATION
// =========================================
function initScrollObserver() {
  // Animate-in elements
  const animateEls = document.querySelectorAll('.animate-in');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  animateEls.forEach(el => observer.observe(el));

  // Text panels
  const textPanels = document.querySelectorAll('.text-panel');
  const panelObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -80px 0px'
  });

  textPanels.forEach(el => panelObserver.observe(el));
}

// ─── Boot ────────────────────────────────
function init() {
  initHeroCanvas();
  initCellZoom();
  initShotgunCanvas();
  initIlluminaCanvas();
  initAssemblyCanvas();
  initRepeatCanvas();
  initPacBioCanvas();
  initNanoporeCanvas();
  initScrollObserver();
}

// Handle resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Canvases re-setup on each draw call via setupCanvas()
  }, 200);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
