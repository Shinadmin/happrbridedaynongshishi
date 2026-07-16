document.addEventListener('DOMContentLoaded', () => {
    // State
    let balloonsPopped = 0;
    let balloonsTarget = 5;
    let candlesBlown = 0;
    const totalCandles = 3;

    // Elements
    const screenWelcome = document.getElementById('screen-welcome');
    const screenBalloons = document.getElementById('screen-balloons');
    const screenCake = document.getElementById('screen-cake');
    const startBtn = document.getElementById('start-btn');
    const balloonArea = document.getElementById('balloon-area');
    const balloonCounter = document.getElementById('balloon-counter');
    const rpgDialogue = document.getElementById('rpg-dialogue');
    const dialogueName = document.querySelector('.dialogue-name');
    const dialogueText = document.getElementById('dialogue-text');

    // Dialogue sequences
    const dialogues = [
        { name: "Fairy", text: "สวัสดีจ้า! ยินดีต้อนรับสู่วันเกิดที่แสนวิเศษ!" },
        { name: "Fairy", text: "วันนี้เป็นวันพิเศษของน้องชิ คนเก่งของเรา 🎂" },
        { name: "Fairy", text: "แต่ก่อนจะไปกินเค้ก... มาเล่นเกมกันหน่อยไหม?" },
        { name: "Fairy", text: "น้องชิช่วยจิ้มลูกโป่งให้แตก 5 ใบสิ!" }
    ];

    const cakeDialogues = [
        { name: "Fairy", text: "เก่งมาก! ลูกโป่งแตกหมดแล้ว!" },
        { name: "Fairy", text: "ตอนนี้ได้เวลาของเค้กวันเกิดแล้วล่ะ!" },
        { name: "Fairy", text: "อธิษฐานแล้วจิ้มที่เปลวเทียนเพื่อเป่าเทียนทีละเล่มนะ!" }
    ];

    const finalDialogues = [
        { name: "Fairy", text: "เย้! สุขสันต์วันเกิดนะจ๊ะ น้องชิ!!!" },
        { name: "Fairy", text: "ขอให้น้องชิมีความสุขมากๆ น่ารักสดใสแบบนี้ตลอดไป" },
        { name: "Fairy", text: "เป็นเด็กดีและขอให้ทุกคำอธิษฐานเป็นจริงนะ 💖" }
    ];

    let currentDialogueIndex = 0;
    let currentDialogueSequence = [];
    let isTyping = false;
    let typeInterval;
    let resolveDialogue;

    // Utility to wait
    const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // --- Audio System ---
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    function playTone(freq, type, duration, vol=0.1) {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        
        gainNode.gain.setValueAtTime(vol, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    }
    
    let musicInterval;
    function startMusic() {
        const melody = [
            261.63, 261.63, 293.66, 261.63, 349.23, 329.63, // Happy
            261.63, 261.63, 293.66, 261.63, 392.00, 349.23, // Birth
            261.63, 261.63, 523.25, 440.00, 349.23, 329.63, 293.66, // Day
            466.16, 466.16, 440.00, 349.23, 392.00, 349.23 // To You
        ];
        let noteIndex = 0;
        
        musicInterval = setInterval(() => {
            if(noteIndex < melody.length) {
                playTone(melody[noteIndex], 'square', 0.4, 0.05);
                noteIndex++;
            } else {
                noteIndex = 0; // loop
            }
        }, 500);
    }
    
    function stopMusic() {
        clearInterval(musicInterval);
    }
    
    function playJumpscareSound() {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1; // White noise
        }
        
        const noise = audioCtx.createBufferSource();
        noise.buffer = buffer;
        
        const gainNode = audioCtx.createGain();
        gainNode.gain.setValueAtTime(5, audioCtx.currentTime); // LOUD!
    
        noise.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        noise.start();
    }

    function playYaySound() {
        if(audioCtx.state === 'suspended') audioCtx.resume();
        // Fast happy arpeggio for "Yay!" effect
        const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
        notes.forEach((freq, i) => {
            setTimeout(() => {
                playTone(freq, 'square', 0.15, 0.1);
            }, i * 100);
        });
    }

    // Show screen
    function showScreen(screen) {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        screen.classList.add('active');
    }

    // Typewriter effect
    function playDialogue(sequence) {
        return new Promise((resolve) => {
            rpgDialogue.classList.remove('hidden');
            currentDialogueSequence = sequence;
            currentDialogueIndex = 0;
            resolveDialogue = resolve;
            showNextLine();
        });
    }

    function showNextLine() {
        if (currentDialogueIndex >= currentDialogueSequence.length) {
            rpgDialogue.classList.add('hidden');
            resolveDialogue();
            return;
        }

        const line = currentDialogueSequence[currentDialogueIndex];
        dialogueName.textContent = line.name;
        dialogueText.textContent = "";
        isTyping = true;
        
        let charIndex = 0;
        clearInterval(typeInterval);
        
        typeInterval = setInterval(() => {
            dialogueText.textContent += line.text.charAt(charIndex);
            charIndex++;
            if (charIndex >= line.text.length) {
                clearInterval(typeInterval);
                isTyping = false;
            }
        }, 50); // Typing speed
    }

    // Handle dialogue clicks
    rpgDialogue.addEventListener('click', () => {
        if (isTyping) {
            // Skip typing
            clearInterval(typeInterval);
            dialogueText.textContent = currentDialogueSequence[currentDialogueIndex].text;
            isTyping = false;
        } else {
            // Next line
            currentDialogueIndex++;
            showNextLine();
        }
    });

    // Start Game
    startBtn.addEventListener('click', async () => {
        // Hide button to prevent multiple clicks
        startBtn.style.display = 'none';
        
        // Init audio context on user interaction
        if(audioCtx.state === 'suspended') audioCtx.resume();
        startMusic();
        
        // Simple confetti on start
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
        
        await wait(1000);
        await playDialogue(dialogues);
        startBalloonGame();
    });

    // Balloon Game
    function startBalloonGame() {
        showScreen(screenBalloons);
        balloonCounter.textContent = `Balloons Popped: 0 / ${balloonsTarget}`;
        
        let spawnInterval = setInterval(() => {
            spawnBalloon();
        }, 800);

        function spawnBalloon() {
            if (balloonsPopped >= balloonsTarget) {
                clearInterval(spawnInterval);
                return;
            }

            const balloon = document.createElement('div');
            balloon.classList.add('balloon');
            
            // Random color
            const colors = ['#ffb6c1', '#dda0dd', '#ffebcd', '#87cefa', '#98fb98'];
            balloon.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            
            // Random position
            const maxLeft = balloonArea.offsetWidth - 60; // balloon width + margin
            const leftPos = Math.random() * maxLeft;
            balloon.style.left = `${leftPos}px`;
            
            // Random speed
            const duration = 3 + Math.random() * 2;
            balloon.style.animation = `float ${duration}s linear`;
            
            balloonArea.appendChild(balloon);

            // Pop interaction
            balloon.addEventListener('click', async () => {
                balloon.remove();
                balloonsPopped++;
                balloonCounter.textContent = `Balloons Popped: ${balloonsPopped} / ${balloonsTarget}`;
                
                // Pop effect
                const rect = balloon.getBoundingClientRect();
                confetti({
                    particleCount: 20,
                    spread: 40,
                    origin: { 
                        x: (rect.left + 25) / window.innerWidth,
                        y: (rect.top + 30) / window.innerHeight 
                    },
                    colors: [balloon.style.backgroundColor]
                });

                if (balloonsPopped >= balloonsTarget) {
                    clearInterval(spawnInterval);
                    balloonArea.innerHTML = ''; // clear remaining
                    await wait(1000);
                    await playDialogue(cakeDialogues);
                    startCakeGame();
                }
            });

            // Remove if off screen
            setTimeout(() => {
                if (balloon.parentElement) {
                    balloon.remove();
                }
            }, duration * 1000);
        }
    }

    // Cake Game
    function startCakeGame() {
        showScreen(screenCake);
        
        const candles = document.querySelectorAll('.candle');
        candles.forEach(candle => {
            candle.addEventListener('click', () => {
                const flame = candle.querySelector('.flame');
                if (flame.classList.contains('active')) {
                    flame.classList.remove('active');
                    candlesBlown++;
                    
                    if (candlesBlown >= totalCandles) {
                        finishGame();
                    }
                }
            });
        });
    }

    async function finishGame() {
        await wait(500);
        
        // Play Yay sound!
        playYaySound();
        
        // Big confetti explosion
        var duration = 3 * 1000;
        var animationEnd = Date.now() + duration;
        var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        var interval = setInterval(function() {
            var timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            var particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            }));
            confetti(Object.assign({}, defaults, { particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            }));
        }, 250);

        await wait(1500);
        await playDialogue(finalDialogues);
        
        // --- JUMPSCARE ---
        await wait(1000); // 1 second after dialogue finishes
        stopMusic();
        await wait(1500); // eerie silence
        const jumpscare = document.getElementById('jumpscare');
        jumpscare.classList.remove('hidden');
        playJumpscareSound();
    }
});
