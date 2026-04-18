/**
 * AI Avatar — Canvas-based animated interviewer face
 * Draws a professional stylized avatar with:
 *  - Eye blinking
 *  - Mouth movement (synced with speech)
 *  - Subtle head sway
 *  - Professional background
 */
const Avatar = (() => {
  let canvas, ctx;
  let animationId;
  let isSpeaking = false;
  let mouthOpenness = 0;
  let targetMouthOpenness = 0;
  let blinkTimer = 0;
  let blinkDuration = 0;
  let isBlinking = false;
  let headSwayAngle = 0;
  let breatheOffset = 0;
  let expressionType = 'neutral'; // 'neutral', 'happy', 'thinking'

  // Avatar configuration
  const CONFIG = {
    bgGradientTop: '#1a1a2e',
    bgGradientBottom: '#16213e',
    skinColor: '#e8b89d',
    skinShadow: '#c49a82',
    hairColor: '#2c2c3e',
    eyeColor: '#3a6ea5',
    suitColor: '#1e2a3a',
    shirtColor: '#e8e8f0',
    tieColor: '#c23b22',
    lipColor: '#c48a7a',
  };

  /**
   * Initialize the avatar canvas
   */
  function init(canvasElement) {
    canvas = canvasElement;
    ctx = canvas.getContext('2d');
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    animate();
  }

  function resizeCanvas() {
    if (!canvas) return;
    const parent = canvas.parentElement;
    canvas.width = parent.clientWidth;
    canvas.height = parent.clientHeight;
  }

  /**
   * Main draw function
   */
  function draw() {
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = Math.min(w, h) / 500;

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Background - professional office-like gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#0f1923');
    bgGrad.addColorStop(0.5, '#162033');
    bgGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Subtle background shapes (bookshelf/office vibe)
    drawOfficeBackground(w, h, scale);

    // Head sway and breathe
    const swayX = Math.sin(headSwayAngle) * 2 * scale;
    const swayY = Math.sin(breatheOffset) * 1.5 * scale;

    ctx.save();
    ctx.translate(cx + swayX, cy + swayY + 20 * scale);

    // Draw body / shoulders
    drawBody(scale);

    // Draw neck
    drawNeck(scale);

    // Draw head
    drawHead(scale);

    // Draw hair
    drawHair(scale);

    // Draw ears
    drawEars(scale);

    // Draw face features
    drawEyes(scale);
    drawNose(scale);
    drawMouth(scale);
    drawEyebrows(scale);

    ctx.restore();

    // Draw name tag
    drawNameTag(w, h, scale);
  }

  function drawOfficeBackground(w, h, scale) {
    // Subtle shelves
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 3; i++) {
      const y = h * 0.15 * i;
      ctx.beginPath();
      ctx.moveTo(w * 0.05, y);
      ctx.lineTo(w * 0.25, y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(w * 0.75, y);
      ctx.lineTo(w * 0.95, y);
      ctx.stroke();
    }

    // Subtle light glow behind head area
    const glowGrad = ctx.createRadialGradient(w/2, h*0.4, 0, w/2, h*0.4, h*0.5);
    glowGrad.addColorStop(0, 'rgba(0, 212, 255, 0.03)');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, 0, w, h);
  }

  function drawBody(scale) {
    // Shoulders and suit jacket
    ctx.save();
    ctx.translate(0, 60 * scale);

    // Suit jacket
    ctx.beginPath();
    ctx.moveTo(-100 * scale, 50 * scale);
    ctx.quadraticCurveTo(-110 * scale, 100 * scale, -120 * scale, 200 * scale);
    ctx.lineTo(120 * scale, 200 * scale);
    ctx.quadraticCurveTo(110 * scale, 100 * scale, 100 * scale, 50 * scale);
    ctx.quadraticCurveTo(0, 30 * scale, -100 * scale, 50 * scale);
    ctx.fillStyle = CONFIG.suitColor;
    ctx.fill();

    // Suit highlight
    const suitGrad = ctx.createLinearGradient(-100 * scale, 50 * scale, 100 * scale, 50 * scale);
    suitGrad.addColorStop(0, 'rgba(255,255,255,0.02)');
    suitGrad.addColorStop(0.3, 'rgba(255,255,255,0.05)');
    suitGrad.addColorStop(0.7, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = suitGrad;
    ctx.fill();

    // Shirt collar / lapels
    ctx.beginPath();
    ctx.moveTo(-25 * scale, 50 * scale);
    ctx.lineTo(-8 * scale, 100 * scale);
    ctx.lineTo(0, 60 * scale);
    ctx.lineTo(8 * scale, 100 * scale);
    ctx.lineTo(25 * scale, 50 * scale);
    ctx.fillStyle = CONFIG.shirtColor;
    ctx.fill();

    // Tie
    ctx.beginPath();
    ctx.moveTo(-6 * scale, 58 * scale);
    ctx.lineTo(0, 55 * scale);
    ctx.lineTo(6 * scale, 58 * scale);
    ctx.lineTo(3 * scale, 110 * scale);
    ctx.lineTo(0, 115 * scale);
    ctx.lineTo(-3 * scale, 110 * scale);
    ctx.closePath();
    ctx.fillStyle = CONFIG.tieColor;
    ctx.fill();

    ctx.restore();
  }

  function drawNeck(scale) {
    ctx.beginPath();
    ctx.moveTo(-20 * scale, 50 * scale);
    ctx.lineTo(-18 * scale, 80 * scale);
    ctx.lineTo(18 * scale, 80 * scale);
    ctx.lineTo(20 * scale, 50 * scale);
    ctx.fillStyle = CONFIG.skinShadow;
    ctx.fill();
  }

  function drawHead(scale) {
    // Head shape - slightly oval
    ctx.beginPath();
    ctx.ellipse(0, 0, 65 * scale, 80 * scale, 0, 0, Math.PI * 2);

    // Skin gradient for depth
    const skinGrad = ctx.createRadialGradient(
      -10 * scale, -15 * scale, 10 * scale,
      0, 0, 80 * scale
    );
    skinGrad.addColorStop(0, '#f0c5a8');
    skinGrad.addColorStop(0.6, CONFIG.skinColor);
    skinGrad.addColorStop(1, CONFIG.skinShadow);
    ctx.fillStyle = skinGrad;
    ctx.fill();

    // Subtle chin shadow
    ctx.beginPath();
    ctx.ellipse(0, 55 * scale, 40 * scale, 15 * scale, 0, 0, Math.PI);
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fill();
  }

  function drawHair(scale) {
    ctx.save();
    ctx.fillStyle = CONFIG.hairColor;

    // Main hair shape
    ctx.beginPath();
    ctx.ellipse(0, -20 * scale, 70 * scale, 65 * scale, 0, Math.PI, Math.PI * 2);
    ctx.quadraticCurveTo(70 * scale, -20 * scale, 68 * scale, 5 * scale);
    ctx.quadraticCurveTo(70 * scale, -40 * scale, 0, -85 * scale);
    ctx.quadraticCurveTo(-70 * scale, -40 * scale, -68 * scale, 5 * scale);
    ctx.quadraticCurveTo(-70 * scale, -20 * scale, -70 * scale, -20 * scale);
    ctx.fill();

    // Hair highlight
    ctx.beginPath();
    ctx.ellipse(-15 * scale, -55 * scale, 25 * scale, 12 * scale, -0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fill();

    ctx.restore();
  }

  function drawEars(scale) {
    // Left ear
    ctx.beginPath();
    ctx.ellipse(-63 * scale, 0, 10 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.skinShadow;
    ctx.fill();

    // Right ear
    ctx.beginPath();
    ctx.ellipse(63 * scale, 0, 10 * scale, 16 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.skinShadow;
    ctx.fill();
  }

  function drawEyes(scale) {
    const eyeY = -10 * scale;
    const eyeSpacing = 25 * scale;
    const blinkSqueeze = isBlinking ? 0.1 : 1;

    [-1, 1].forEach(side => {
      const eyeX = side * eyeSpacing;

      // Eye white
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY, 14 * scale, 9 * scale * blinkSqueeze, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#f5f5f5';
      ctx.fill();

      if (!isBlinking) {
        // Iris
        ctx.beginPath();
        ctx.ellipse(eyeX + 1 * scale, eyeY + 1 * scale, 7 * scale, 7 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = CONFIG.eyeColor;
        ctx.fill();

        // Pupil
        ctx.beginPath();
        ctx.ellipse(eyeX + 1 * scale, eyeY + 1 * scale, 3.5 * scale, 3.5 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e';
        ctx.fill();

        // Eye highlight
        ctx.beginPath();
        ctx.ellipse(eyeX - 2 * scale, eyeY - 2 * scale, 2 * scale, 2 * scale, 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fill();
      }

      // Eyelid line
      ctx.beginPath();
      ctx.ellipse(eyeX, eyeY - 2 * scale * blinkSqueeze, 15 * scale, 9 * scale * blinkSqueeze, 0, Math.PI, Math.PI * 2);
      ctx.strokeStyle = 'rgba(80,50,30,0.3)';
      ctx.lineWidth = 1.5 * scale;
      ctx.stroke();
    });
  }

  function drawEyebrows(scale) {
    const browY = -28 * scale;
    const isThinking = expressionType === 'thinking';

    [-1, 1].forEach(side => {
      const browX = side * 25 * scale;
      const raise = isThinking && side === 1 ? -5 * scale : 0;

      ctx.beginPath();
      ctx.moveTo(browX - 15 * scale * side, browY + 3 * scale + raise);
      ctx.quadraticCurveTo(browX, browY - 3 * scale + raise, browX + 15 * scale * side, browY + raise);
      ctx.strokeStyle = CONFIG.hairColor;
      ctx.lineWidth = 2.5 * scale;
      ctx.lineCap = 'round';
      ctx.stroke();
    });
  }

  function drawNose(scale) {
    ctx.beginPath();
    ctx.moveTo(0, -2 * scale);
    ctx.quadraticCurveTo(4 * scale, 12 * scale, 0, 18 * scale);
    ctx.quadraticCurveTo(-4 * scale, 12 * scale, 0, -2 * scale);
    ctx.fillStyle = 'rgba(180,130,100,0.2)';
    ctx.fill();

    // Nostrils
    ctx.beginPath();
    ctx.ellipse(-5 * scale, 17 * scale, 3 * scale, 2 * scale, 0, 0, Math.PI * 2);
    ctx.ellipse(5 * scale, 17 * scale, 3 * scale, 2 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,100,70,0.15)';
    ctx.fill();
  }

  function drawMouth(scale) {
    const mouthY = 35 * scale;
    const openAmount = mouthOpenness * 10 * scale;

    if (openAmount > 1) {
      // Open mouth (speaking)
      ctx.beginPath();
      ctx.ellipse(0, mouthY, 18 * scale, Math.max(3, openAmount), 0, 0, Math.PI * 2);
      ctx.fillStyle = '#8b3a3a';
      ctx.fill();

      // Teeth (upper)
      ctx.beginPath();
      ctx.ellipse(0, mouthY - openAmount * 0.3, 14 * scale, Math.min(openAmount * 0.4, 4 * scale), 0, Math.PI, Math.PI * 2);
      ctx.fillStyle = '#f0f0f0';
      ctx.fill();

      // Tongue hint
      if (openAmount > 4 * scale) {
        ctx.beginPath();
        ctx.ellipse(0, mouthY + openAmount * 0.2, 8 * scale, 4 * scale, 0, 0, Math.PI);
        ctx.fillStyle = '#c46060';
        ctx.fill();
      }
    } else {
      // Closed mouth - slight smile
      const smileAmount = expressionType === 'happy' ? 4 * scale : 2 * scale;
      ctx.beginPath();
      ctx.moveTo(-18 * scale, mouthY);
      ctx.quadraticCurveTo(0, mouthY + smileAmount, 18 * scale, mouthY);
      ctx.strokeStyle = CONFIG.lipColor;
      ctx.lineWidth = 2.5 * scale;
      ctx.lineCap = 'round';
      ctx.stroke();
    }

    // Upper lip line
    ctx.beginPath();
    ctx.moveTo(-12 * scale, mouthY - (openAmount > 1 ? openAmount * 0.5 : 1));
    ctx.quadraticCurveTo(0, mouthY - (openAmount > 1 ? openAmount * 0.7 : 3 * scale), 12 * scale, mouthY - (openAmount > 1 ? openAmount * 0.5 : 1));
    ctx.strokeStyle = 'rgba(180,120,100,0.3)';
    ctx.lineWidth = 1 * scale;
    ctx.stroke();
  }

  function drawNameTag(w, h, scale) {
    const tagW = 200 * Math.min(scale, 1.2);
    const tagH = 36 * Math.min(scale, 1.2);
    const tagX = (w - tagW) / 2;
    const tagY = h - tagH - 15;

    // Tag background
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(tagX, tagY, tagW, tagH, 8);
    ctx.fill();

    // Tag text
    ctx.fillStyle = '#ffffff';
    ctx.font = `${14 * Math.min(scale, 1.2)}px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('AI Interviewer', w / 2, tagY + tagH / 2);

    // Speaking indicator
    if (isSpeaking) {
      const indicatorX = tagX + 16;
      const indicatorY = tagY + tagH / 2;
      for (let i = 0; i < 3; i++) {
        const barH = (Math.sin(Date.now() * 0.01 + i * 1.5) + 1) * 5 + 3;
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(indicatorX + i * 5, indicatorY - barH / 2, 3, barH);
      }
    }
  }

  /**
   * Animation loop
   */
  function animate() {
    animationId = requestAnimationFrame(animate);

    const now = Date.now();

    // Smooth mouth animation
    mouthOpenness += (targetMouthOpenness - mouthOpenness) * 0.3;

    // Speaking mouth variation
    if (isSpeaking) {
      targetMouthOpenness = 0.3 + Math.sin(now * 0.015) * 0.3 + Math.sin(now * 0.023) * 0.2 + Math.random() * 0.15;
    } else {
      targetMouthOpenness = 0;
    }

    // Blinking
    blinkTimer++;
    if (!isBlinking && blinkTimer > 120 + Math.random() * 180) {
      isBlinking = true;
      blinkDuration = 0;
      blinkTimer = 0;
    }
    if (isBlinking) {
      blinkDuration++;
      if (blinkDuration > 8) {
        isBlinking = false;
      }
    }

    // Subtle head sway
    headSwayAngle += 0.008;
    breatheOffset += 0.02;

    draw();
  }

  /**
   * Set speaking state
   */
  function setSpeaking(speaking) {
    isSpeaking = speaking;
    if (!speaking) {
      targetMouthOpenness = 0;
    }
  }

  /**
   * Set expression
   */
  function setExpression(type) {
    expressionType = type; // 'neutral', 'happy', 'thinking'
  }

  function destroy() {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', resizeCanvas);
  }

  return {
    init,
    setSpeaking,
    setExpression,
    resizeCanvas,
    destroy
  };
})();
