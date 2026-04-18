/**
 * IntervueX Cinematic 3D Intro Animation
 * 
 * Plays a 5.5-second cinematic intro using Three.js + GSAP:
 *  Scene 1 (0–1s)    : Particle entry + "Welcome to IntervueX"
 *  Scene 2 (1–2.5s)  : AI orb pulse + "Your AI Interview Coach"
 *  Scene 3 (2.5–4s)  : Feature cards fly in
 *  Scene 4 (4–5s)    : Dashboard score bars animate
 *  Scene 5 (5–5.5s)  : Fade out + transition to app
 */
const IntroAnimation = (() => {
  // ─── State ──────────────────────────────
  let scene, camera, renderer, clock;
  let introParticles, introLines, orb, orbGlow;
  let animFrameId;
  let isPlaying = false;
  let isSkipped = false;
  let masterTimeline;

  // ─── Config ─────────────────────────────
  const PARTICLE_COUNT = 600;
  const LINE_COUNT = 40;
  const TOTAL_DURATION = 5.8; // seconds

  // ─── Public: Play intro ─────────────────
  function play(onComplete) {
    if (isPlaying) return;
    isPlaying = true;
    isSkipped = false;

    const overlay = document.getElementById('intro-overlay');
    if (!overlay) { onComplete && onComplete(); return; }

    overlay.classList.remove('hidden');
    overlay.style.display = '';

    // Hide the main three-canvas while intro plays
    const mainCanvas = document.getElementById('three-canvas');
    if (mainCanvas) mainCanvas.style.opacity = '0';

    initThreeScene();
    buildHUD();
    startAnimation(onComplete);
    animate();
  }

  // ─── Three.js Scene ─────────────────────
  function initThreeScene() {
    const canvas = document.getElementById('intro-canvas');
    clock = new THREE.Clock();

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.0006);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 3000);
    camera.position.set(0, 0, 600);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050510, 1);

    createParticles();
    createConnectionLines();
    createOrb();

    window.addEventListener('resize', onResize);
  }

  // ─── Particles ──────────────────────────
  function createParticles() {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);

    const palette = [
      new THREE.Color(0x00d4ff),
      new THREE.Color(0x7b61ff),
      new THREE.Color(0xff6bdf),
      new THREE.Color(0x00e88f),
    ];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const r = 200 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi) - 400; // push behind camera initially

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i3]     = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    introParticles = new THREE.Points(geo, mat);
    scene.add(introParticles);
  }

  // ─── Connection Lines ───────────────────
  function createConnectionLines() {
    const lineGroup = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
    });

    for (let i = 0; i < LINE_COUNT; i++) {
      const points = [];
      const startX = (Math.random() - 0.5) * 1200;
      const startY = (Math.random() - 0.5) * 600;
      const startZ = (Math.random() - 0.5) * 400 - 200;

      points.push(new THREE.Vector3(startX, startY, startZ));
      points.push(new THREE.Vector3(
        startX + (Math.random() - 0.5) * 300,
        startY + (Math.random() - 0.5) * 300,
        startZ + (Math.random() - 0.5) * 200
      ));

      const geo = new THREE.BufferGeometry().setFromPoints(points);
      const line = new THREE.Line(geo, lineMat.clone());
      lineGroup.add(line);
    }

    introLines = lineGroup;
    scene.add(introLines);
  }

  // ─── AI Orb ─────────────────────────────
  function createOrb() {
    // Core sphere
    const orbGeo = new THREE.SphereGeometry(18, 32, 32);
    const orbMat = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      transparent: true,
      opacity: 0,
    });
    orb = new THREE.Mesh(orbGeo, orbMat);
    orb.position.set(0, 0, 0);
    scene.add(orb);

    // Wireframe glow shell
    const glowGeo = new THREE.IcosahedronGeometry(28, 1);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x7b61ff,
      wireframe: true,
      transparent: true,
      opacity: 0,
    });
    orbGlow = new THREE.Mesh(glowGeo, glowMat);
    orb.add(orbGlow);
  }

  // ─── HUD Elements ──────────────────────
  function buildHUD() {
    const skipBtn = document.querySelector('.intro-skip-btn');
    if (skipBtn) {
      gsap.to(skipBtn, { opacity: 1, duration: 0.5, delay: 0.5 });
    }
  }

  // ─── Main Timeline ─────────────────────
  function startAnimation(onComplete) {
    masterTimeline = gsap.timeline({
      onComplete: () => {
        if (!isSkipped) finishIntro(onComplete);
      },
    });

    // ============ SCENE 1: Entry (0–1s) ============
    masterTimeline
      // Fade in particles
      .to(introParticles.material, {
        opacity: 0.7,
        duration: 0.8,
        ease: 'power2.out',
      }, 0)
      // Move camera forward
      .to(camera.position, {
        z: 400,
        duration: 1.2,
        ease: 'power2.inOut',
      }, 0)
      // Fade in connection lines
      .to({}, {
        duration: 0.6,
        onUpdate: function() {
          introLines.children.forEach(line => {
            line.material.opacity = this.progress() * 0.15;
          });
        },
      }, 0.2)
      // Welcome text
      .to('.intro-welcome', {
        opacity: 1,
        duration: 0.6,
        ease: 'power2.out',
      }, 0.3);

    // ============ SCENE 2: AI Identity (1–2.5s) ============
    masterTimeline
      // Fade out welcome
      .to('.intro-welcome', {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
      }, 1.0)
      // Show orb
      .to(orb.material, {
        opacity: 0.8,
        duration: 0.4,
        ease: 'power2.out',
      }, 1.1)
      .to(orbGlow.material, {
        opacity: 0.3,
        duration: 0.4,
        ease: 'power2.out',
      }, 1.1)
      // Pulse orb
      .to(orb.scale, {
        x: 1.4, y: 1.4, z: 1.4,
        duration: 0.5,
        ease: 'power2.out',
        yoyo: true,
        repeat: 1,
      }, 1.2)
      // Show AI text
      .to('.intro-ai-core', {
        opacity: 1,
        duration: 0.5,
        ease: 'power2.out',
      }, 1.2)
      // Camera pan slight
      .to(camera.position, {
        x: 20,
        y: 10,
        duration: 1.2,
        ease: 'sine.inOut',
      }, 1.0);

    // ============ SCENE 3: Features (2.5–4s) ============
    masterTimeline
      // Fade out AI core
      .to('.intro-ai-core', {
        opacity: 0,
        duration: 0.3,
        ease: 'power2.in',
      }, 2.4)
      .to(orb.material, { opacity: 0, duration: 0.3 }, 2.4)
      .to(orbGlow.material, { opacity: 0, duration: 0.3 }, 2.4)
      // Show features container
      .to('.intro-features', {
        opacity: 1,
        duration: 0.1,
      }, 2.5)
      // Card 1
      .fromTo('.intro-feature-card:nth-child(1)', {
        opacity: 0, rotateY: -25, x: -60, scale: 0.85,
      }, {
        opacity: 1, rotateY: 0, x: 0, scale: 1,
        duration: 0.45, ease: 'back.out(1.4)',
      }, 2.55)
      // Card 1 glow
      .to('.intro-feature-card:nth-child(1) .card-glow', {
        opacity: 1, duration: 0.3,
      }, 2.7)
      // Card 2
      .fromTo('.intro-feature-card:nth-child(2)', {
        opacity: 0, y: 40, scale: 0.85,
      }, {
        opacity: 1, y: 0, scale: 1,
        duration: 0.45, ease: 'back.out(1.4)',
      }, 2.75)
      .to('.intro-feature-card:nth-child(2) .card-glow', {
        opacity: 1, duration: 0.3,
      }, 2.9)
      // Card 3
      .fromTo('.intro-feature-card:nth-child(3)', {
        opacity: 0, rotateY: 25, x: 60, scale: 0.85,
      }, {
        opacity: 1, rotateY: 0, x: 0, scale: 1,
        duration: 0.45, ease: 'back.out(1.4)',
      }, 2.95)
      .to('.intro-feature-card:nth-child(3) .card-glow', {
        opacity: 1, duration: 0.3,
      }, 3.1)
      // Camera pan back
      .to(camera.position, {
        x: -15, y: -5,
        duration: 1.2,
        ease: 'sine.inOut',
      }, 2.5);

    // ============ SCENE 4: Dashboard (4–5s) ============
    masterTimeline
      // Fade out features
      .to('.intro-features', {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
      }, 3.8)
      // Show dashboard
      .to('.intro-dashboard', {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
      }, 4.0)
      // Animate score bars
      .to('.bar-clarity', { width: '80%', duration: 0.6, ease: 'power2.out' }, 4.2)
      .to('.bar-accuracy', { width: '90%', duration: 0.6, ease: 'power2.out' }, 4.3)
      .to('.bar-communication', { width: '70%', duration: 0.6, ease: 'power2.out' }, 4.4)
      // Camera center
      .to(camera.position, {
        x: 0, y: 0,
        duration: 0.8,
        ease: 'sine.inOut',
      }, 4.0);

    // ============ SCENE 5: Transition (5–5.8s) ============
    masterTimeline
      // Fade out dashboard
      .to('.intro-dashboard', {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: 'power2.in',
      }, 4.9)
      // Show final text
      .to('.intro-final', {
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
      }, 5.0)
      .fromTo('.intro-final h2', {
        y: 20, opacity: 0,
      }, {
        y: 0, opacity: 1,
        duration: 0.4, ease: 'power2.out',
      }, 5.0)
      .to('.intro-final-glow', {
        opacity: 1,
        duration: 0.3,
        ease: 'power2.out',
      }, 5.15)
      // Final zoom out
      .to(camera.position, {
        z: 800,
        duration: 0.8,
        ease: 'power2.in',
      }, 5.2)
      // Fade everything
      .to('#intro-overlay', {
        opacity: 0,
        duration: 0.5,
        ease: 'power2.in',
      }, 5.3);
  }

  // ─── Skip ───────────────────────────────
  function skip(onComplete) {
    if (isSkipped) return;
    isSkipped = true;
    if (masterTimeline) masterTimeline.kill();

    gsap.to('#intro-overlay', {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => finishIntro(onComplete),
    });
  }

  // ─── Cleanup ────────────────────────────
  function finishIntro(onComplete) {
    isPlaying = false;

    // Stop render loop
    if (animFrameId) cancelAnimationFrame(animFrameId);
    window.removeEventListener('resize', onResize);

    // Dispose Three.js resources
    if (renderer) {
      renderer.dispose();
      renderer = null;
    }
    if (scene) {
      scene.traverse(obj => {
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
          else obj.material.dispose();
        }
      });
      scene = null;
    }

    // Hide overlay
    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.style.display = 'none';
    }

    // Show main canvas
    const mainCanvas = document.getElementById('three-canvas');
    if (mainCanvas) {
      gsap.to(mainCanvas, { opacity: 1, duration: 0.5 });
    }

    if (onComplete) onComplete();
  }

  // ─── Render Loop ────────────────────────
  function animate() {
    if (!isPlaying || !renderer || !scene || !camera) return;
    animFrameId = requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Rotate particles gently
    if (introParticles) {
      introParticles.rotation.y += 0.0004;
      introParticles.rotation.x += 0.0002;
    }

    // Rotate orb
    if (orb) {
      orb.rotation.y += 0.008;
      orb.rotation.x += 0.004;
    }
    if (orbGlow) {
      orbGlow.rotation.y -= 0.006;
      orbGlow.rotation.z += 0.003;
    }

    // Pulse line opacity
    if (introLines) {
      introLines.children.forEach((line, i) => {
        const pulse = Math.sin(elapsed * 2 + i * 0.5) * 0.5 + 0.5;
        line.material.opacity = pulse * 0.12;
      });
    }

    camera.lookAt(0, 0, 0);
    renderer.render(scene, camera);
  }

  // ─── Resize ─────────────────────────────
  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ─── Public API ─────────────────────────
  return { play, skip };
})();
