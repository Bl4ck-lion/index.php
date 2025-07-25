document.addEventListener('DOMContentLoaded', () => {

    'use strict';

    // Panggil semua fungsi inisialisasi
    initPreloader();
    initThemeToggle();
    initSmartHeader();
    initScrollAnimations();
    initCustomCursor();
    init3DScene();

    /**
     * Fungsi untuk menghilangkan preloader setelah halaman dimuat
     */
    function initPreloader() {
        const preloader = document.getElementById('preloader');
        window.addEventListener('load', () => {
            preloader.classList.add('loaded');
        });
    }

    /**
     * Fungsi untuk mengelola toggle tema terang/gelap
     */
    function initThemeToggle() {
        const themeToggle = document.getElementById('theme-toggle');
        const body = document.body;
        const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-mode' : 'light-mode');

        if (savedTheme) {
            body.classList.add(savedTheme);
        }

        themeToggle.addEventListener('click', () => {
            body.classList.toggle('dark-mode');
            const currentTheme = body.classList.contains('dark-mode') ? 'dark-mode' : 'light-mode';
            localStorage.setItem('theme', currentTheme);
            // Beri tahu adegan 3D untuk update warna
            window.dispatchEvent(new CustomEvent('themeChanged'));
        });
    }
    
    /**
     * Header cerdas yang bersembunyi saat scroll ke bawah
     */
    function initSmartHeader() {
        const header = document.getElementById('main-header');
        let lastScrollY = window.scrollY;

        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
            
            if (lastScrollY < window.scrollY && window.scrollY > 100) {
                header.classList.add('hidden');
            } else {
                header.classList.remove('hidden');
            }
            lastScrollY = window.scrollY;
        });
    }

    /**
     * Animasi elemen saat digulir ke dalam viewport
     */
    function initScrollAnimations() {
        const revealElements = document.querySelectorAll('.reveal');
        const navLinks = document.querySelectorAll('nav a');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    // Update link navigasi aktif
                    const id = entry.target.getAttribute('id');
                    if (id) {
                        navLinks.forEach(link => {
                            link.classList.remove('active');
                            if (link.getAttribute('href') === `#${id}`) {
                                link.classList.add('active');
                            }
                        });
                    }
                }
            });
        }, { threshold: 0.1 });

        revealElements.forEach(el => observer.observe(el));
        // Observasi section untuk nav link
        document.querySelectorAll('main section').forEach(section => observer.observe(section));
    }
    
    /**
     * Kursor kustom yang mengikuti mouse
     */
    function initCustomCursor() {
        const cursor = document.querySelector('.custom-cursor');
        const links = document.querySelectorAll('a, button');

        window.addEventListener('mousemove', e => {
            gsap.to(cursor, { duration: 0.2, x: e.clientX, y: e.clientY });
        });

        links.forEach(link => {
            link.addEventListener('mouseenter', () => cursor.classList.add('hover'));
            link.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
        });
    }

    /**
     * Adegan 3D Interaktif dengan THREE.js
     */
    function init3DScene() {
        // 1. Setup Dasar
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#artistic-bg'),
            alpha: true,
            antialias: true
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.position.z = 5;

        // 2. Geometri Partikel
        const particlesGeometry = new THREE.BufferGeometry();
        const particlesCount = 7000;
        const posArray = new Float32Array(particlesCount * 3);
        const originalPositions = new Float32Array(particlesCount * 3);
        
        for (let i = 0; i < particlesCount * 3; i++) {
            posArray[i] = (Math.random() - 0.5) * 20;
        }
        particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        originalPositions.set(posArray);

        // 3. Material Partikel
        const particlesMaterial = new THREE.PointsMaterial({
            size: 0.02,
            transparent: true,
            depthWrite: false
        });
        const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
        scene.add(particlesMesh);

        // 4. Update Warna Sesuai Tema
        const updateParticleColors = () => {
            const color = getComputedStyle(document.body).getPropertyValue('--particle-color').trim();
            particlesMaterial.color.set(color);
        };
        updateParticleColors();
        window.addEventListener('themeChanged', updateParticleColors);

        // 5. Interaksi Mouse
        const mouse = new THREE.Vector3(999, 999, 0); // Mulai di luar layar
        window.addEventListener('mousemove', (event) => {
            mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
            mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        });
        window.addEventListener('mouseout', () => {
            mouse.x = 999;
            mouse.y = 999;
        });

        // 6. Animasi
        const clock = new THREE.Clock();
        const repulsionRadius = 0.8;
        const repulsionStrength = 1.5;
        const returnStrength = 0.02;

        const animate = () => {
            const elapsedTime = clock.getElapsedTime();
            
            // Konversi posisi mouse 2D ke dunia 3D
            const mouseWorldPosition = new THREE.Vector3(mouse.x, mouse.y, 0);
            mouseWorldPosition.unproject(camera);
            const dir = mouseWorldPosition.sub(camera.position).normalize();
            const distance = -camera.position.z / dir.z;
            const pos = camera.position.clone().add(dir.multiplyScalar(distance));

            // Animasikan setiap partikel
            const positions = particlesGeometry.attributes.position.array;
            for (let i = 0; i < particlesCount; i++) {
                const i3 = i * 3;
                const particlePos = new THREE.Vector3(positions[i3], positions[i3 + 1], positions[i3 + 2]);
                const originalPos = new THREE.Vector3(originalPositions[i3], originalPositions[i3 + 1], originalPositions[i3 + 2]);

                // A. Efek Tolakan (Repulsion) dari Mouse
                const distToMouse = particlePos.distanceTo(pos);
                let repulsionForce = new THREE.Vector3(0, 0, 0);
                if (distToMouse < repulsionRadius) {
                    const forceDirection = particlePos.clone().sub(pos).normalize();
                    const strength = (repulsionRadius - distToMouse) / repulsionRadius * repulsionStrength;
                    repulsionForce = forceDirection.multiplyScalar(strength);
                }
                
                // B. Efek Kembali ke Posisi Asli
                const returnForce = originalPos.clone().sub(particlePos).multiplyScalar(returnStrength);

                // C. Gerakan Organik (Breathing)
                const organicMovement = new THREE.Vector3(0, Math.sin(elapsedTime * 0.5 + originalPos.x) * 0.003, 0);

                // Gabungkan semua gaya
                particlePos.add(repulsionForce).add(returnForce).add(organicMovement);
                positions[i3] = particlePos.x;
                positions[i3 + 1] = particlePos.y;
                positions[i3 + 2] = particlePos.z;
            }
            particlesGeometry.attributes.position.needsUpdate = true;
            
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        };
        animate();

        // 7. Handle Resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        });
    }
});