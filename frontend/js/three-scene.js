/**
 * Three.js Scene — Immersive particle background with dynamic lighting
 */
const ThreeScene = (() => {
  let scene, camera, renderer, particles, particleGeometry;
  let mouseX = 0, mouseY = 0;
  let animationId;
  let clock;

  // Scene configuration
  const CONFIG = {
    particleCount: 1500,
    particleSize: 2,
    cameraZ: 400,
    mouseInfluence: 0.05,
    rotationSpeed: 0.0002,
    colorCycle: true
  };

  /**
   * Initialize the Three.js scene
   */
  function init() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    clock = new THREE.Clock();

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050510, 0.0008);

    // Camera
    camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      1,
      2000
    );
    camera.position.z = CONFIG.cameraZ;

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x050510, 1);

    // Create particles
    createParticles();

    // Create ambient geometric shapes
    createGeometricShapes();

    // Event listeners
    window.addEventListener('resize', onWindowResize);
    document.addEventListener('mousemove', onMouseMove);

    // Start animation
    animate();
  }

  /**
   * Create the main particle system
   */
  function createParticles() {
    particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(CONFIG.particleCount * 3);
    const colors = new Float32Array(CONFIG.particleCount * 3);
    const sizes = new Float32Array(CONFIG.particleCount);

    // Color palette - cyan, purple, pink
    const colorPalette = [
      new THREE.Color(0x00d4ff), // cyan
      new THREE.Color(0x7b61ff), // purple
      new THREE.Color(0xff6bdf), // pink
      new THREE.Color(0x00e88f), // green
    ];

    for (let i = 0; i < CONFIG.particleCount; i++) {
      const i3 = i * 3;

      // Spread particles in a sphere
      const radius = 300 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);

      // Random color from palette
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = Math.random() * CONFIG.particleSize + 0.5;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Particle material with custom vertex colors
    const particleMaterial = new THREE.PointsMaterial({
      size: CONFIG.particleSize,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
  }

  /**
   * Create subtle geometric shapes floating in the background
   */
  function createGeometricShapes() {
    const shapeMaterial = new THREE.MeshBasicMaterial({
      color: 0x00d4ff,
      wireframe: true,
      transparent: true,
      opacity: 0.05
    });

    // Floating octahedron
    const octaGeo = new THREE.OctahedronGeometry(30, 0);
    const octa = new THREE.Mesh(octaGeo, shapeMaterial);
    octa.position.set(-200, 100, -100);
    octa.userData = { rotSpeed: 0.003, floatSpeed: 0.5, floatAmp: 20 };
    scene.add(octa);

    // Floating icosahedron
    const icoGeo = new THREE.IcosahedronGeometry(25, 0);
    const icoMat = shapeMaterial.clone();
    icoMat.color = new THREE.Color(0x7b61ff);
    const ico = new THREE.Mesh(icoGeo, icoMat);
    ico.position.set(250, -80, -150);
    ico.userData = { rotSpeed: 0.002, floatSpeed: 0.7, floatAmp: 15 };
    scene.add(ico);

    // Floating torus
    const torusGeo = new THREE.TorusGeometry(20, 5, 8, 16);
    const torusMat = shapeMaterial.clone();
    torusMat.color = new THREE.Color(0xff6bdf);
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.position.set(100, 150, -200);
    torus.userData = { rotSpeed: 0.004, floatSpeed: 0.3, floatAmp: 25 };
    scene.add(torus);
  }

  /**
   * Animation loop
   */
  function animate() {
    animationId = requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Rotate particles slowly
    if (particles) {
      particles.rotation.y += CONFIG.rotationSpeed;
      particles.rotation.x += CONFIG.rotationSpeed * 0.5;
    }

    // Mouse influence on camera
    camera.position.x += (mouseX * 30 - camera.position.x) * CONFIG.mouseInfluence;
    camera.position.y += (-mouseY * 30 - camera.position.y) * CONFIG.mouseInfluence;
    camera.lookAt(scene.position);

    // Animate geometric shapes
    scene.children.forEach(child => {
      if (child.userData && child.userData.rotSpeed) {
        child.rotation.x += child.userData.rotSpeed;
        child.rotation.y += child.userData.rotSpeed * 1.5;
        child.position.y += Math.sin(elapsed * child.userData.floatSpeed) * 0.2;
      }
    });

    renderer.render(scene, camera);
  }

  /**
   * Smooth camera transition for section changes
   */
  function transitionCamera(targetZ, duration = 1.5) {
    if (!camera) return;
    if (typeof gsap !== 'undefined') {
      gsap.to(camera.position, {
        z: targetZ,
        duration,
        ease: 'power2.inOut'
      });
    }
  }

  /**
   * Intensify particles during loading
   */
  function setIntensity(intensity) {
    if (!particles) return;
    if (typeof gsap !== 'undefined') {
      gsap.to(particles.material, {
        opacity: 0.3 + intensity * 0.5,
        duration: 0.5
      });
      gsap.to(particles.rotation, {
        y: particles.rotation.y + intensity * 0.5,
        duration: 1,
        ease: 'power2.out'
      });
    }
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function onMouseMove(event) {
    mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    mouseY = (event.clientY / window.innerHeight) * 2 - 1;
  }

  function destroy() {
    if (animationId) cancelAnimationFrame(animationId);
    window.removeEventListener('resize', onWindowResize);
    document.removeEventListener('mousemove', onMouseMove);
  }

  return {
    init,
    transitionCamera,
    setIntensity,
    destroy
  };
})();
