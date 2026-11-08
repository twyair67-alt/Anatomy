export function initAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
        throw new Error('Questo browser non supporta la Web Audio API.');
    }

    const context = new AudioContextClass();
    const ambientAudioUrl = new URL('../audio/horror_ambient.mp3', import.meta.url).href;
    const ambientAudio = new Audio(ambientAudioUrl);
    ambientAudio.loop = true;
    ambientAudio.preload = 'auto';
    ambientAudio.volume = 0.12;
    ambientAudio.addEventListener('error', () => {
        console.error(`Impossibile caricare l’audio ambientale (${ambientAudioUrl}).`);
    });

    const heartbeatAudioUrl = new URL('../audio/heartbeat.mp3', import.meta.url).href;
    const heartbeatAudio = new Audio(heartbeatAudioUrl);
    heartbeatAudio.loop = true;
    heartbeatAudio.preload = 'auto';
    heartbeatAudio.volume = 0.015;
    heartbeatAudio.playbackRate = 1;
    heartbeatAudio.addEventListener('error', () => {
        console.error(`Impossibile caricare l’audio del battito cardiaco (${heartbeatAudioUrl}).`);
    });

    const hospitalAudioUrl = new URL('../audio/backround_hospital.mp3', import.meta.url).href;
    const hospitalAudio = new Audio(hospitalAudioUrl);
    hospitalAudio.loop = true;
    hospitalAudio.preload = 'auto';
    hospitalAudio.volume = 0.12;
    hospitalAudio.addEventListener('error', () => {
        console.error(`Impossibile caricare l’audio ospedaliero (${hospitalAudioUrl}).`);
    });

    const screamAudioUrl = new URL('../audio/scream.mp3', import.meta.url).href;
    const screamAudio = new Audio(screamAudioUrl);
    screamAudio.preload = 'auto';
    screamAudio.volume = 1;
    screamAudio.addEventListener('error', () => {
        console.error(`Impossibile caricare l’audio del jumpscare (${screamAudioUrl}).`);
    });
    const deathCryAudioUrl = new URL('../audio/urlo.mp3', import.meta.url).href;
    const deathCryAudio = new Audio(deathCryAudioUrl);
    deathCryAudio.preload = 'auto';
    deathCryAudio.volume = 1;
    deathCryAudio.addEventListener('error', () => {
        console.error(`Impossibile caricare l’audio di morte (${deathCryAudioUrl}).`);
    });
    const effects = new Map();
    const playerStepsUrl = new URL('../audio/steps3.mp3', import.meta.url).href;
    const playerSteps = new Audio(playerStepsUrl);
    playerSteps.preload = 'auto';
    playerSteps.loop = true;
    playerSteps.volume = 0.42;
    playerSteps.addEventListener('error', () => {
        console.error(`Impossibile caricare i passi del giocatore (${playerStepsUrl}).`);
    });
    const effectFiles = {
        shotgun: ['shotgun_fire.mp3', 0.7],
        glassBreak: ['glassbreak.mp3', 0.85],
        neonBurst: ['scoppio.mp3', 0.9],
        reload: ['reload.mp3', 0.55],
        blood: ['blood_hit.mp3', 0.6],
        axe: ['axedamage.mp3', 0.65],
        break: ['rottura.mp3', 0.7],
        patrolSteps: ['footsteps_hospital.mp3', 0.3],
        chaseSteps: ['steps4.mp3', 0.4],
        pinoSteps: ['steps2.mp3', 0.5],
        pinoScream: ['pino_scream.mp3', 1],
        woodCrash: ['crashwood.mp3', 0.8],
        bell: ['bell.mp3', 0.65],
        antibiotics: ['masticazione.mp3', 0.75],
        scream: ['scream.mp3', 1]
    };
    for (const [key, [file, volume]] of Object.entries(effectFiles)) {
        const url = new URL(`../audio/${file}`, import.meta.url).href;
        const audio = new Audio(url);
        audio.preload = 'auto';
        audio.volume = volume;
        audio.addEventListener('error', () => {
            console.error(`Impossibile caricare l’effetto audio (${url}).`);
        });
        effects.set(key, audio);
    }
    function playEffect(key) {
        const audio = effects.get(key);
        if (!audio) throw new Error(`Effetto audio non configurato: ${key}`);
        audio.pause();
        audio.currentTime = 0;
        audio.play().catch((error) => {
            console.error(`Riproduzione dell’effetto ${key} non riuscita:`, error);
        });
    }
    function playScreamPair() {
        screamAudio.pause();
        screamAudio.currentTime = 0;
        screamAudio.play().catch((error) => {
            console.error(`Riproduzione dell’audio del jumpscare non riuscita (${screamAudioUrl}):`, error);
        });
        deathCryAudio.pause();
        deathCryAudio.currentTime = 0;
        deathCryAudio.play().catch((error) => {
            console.error(`Riproduzione dell’audio di morte non riuscita (${deathCryAudioUrl}):`, error);
        });
    }
    let breathElapsed = 0;
    let footstepElapsed = 0;
    let doctorFootstepElapsed = 0;
    let doctorFootstepMode = '';
    let currentArea = 1;
    let jumpscareActive = false;
    let monsterActive = false;
    const activeNodes = new Set();
    const breathGain = context.createGain();
    const breathFilter = context.createBiquadFilter();
    const breathNoise = context.createBufferSource();
    const breathBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const breathData = breathBuffer.getChannelData(0);
    for (let i = 0; i < breathData.length; i++) {
        breathData[i] = Math.random() * 2 - 1;
    }
    breathFilter.type = 'lowpass';
    breathFilter.frequency.value = 520;
    breathGain.gain.value = 0.0001;
    breathNoise.buffer = breathBuffer;
    breathNoise.loop = true;
    breathNoise.connect(breathFilter);
    breathFilter.connect(breathGain);
    breathGain.connect(context.destination);
    breathNoise.start();

    function track(node, cleanup = () => {}) {
        activeNodes.add(node);
        node.addEventListener('ended', () => {
            activeNodes.delete(node);
            node.disconnect();
            cleanup();
        }, { once: true });
        return node;
    }

    function playTone(time, frequency, volume, duration, type = 'sine') {
        const oscillator = context.createOscillator();
        const envelope = context.createGain();
        track(oscillator, () => envelope.disconnect());
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, time);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(25, frequency * 0.58), time + duration * 0.75);
        envelope.gain.setValueAtTime(0.0001, time);
        envelope.gain.exponentialRampToValueAtTime(volume, time + 0.012);
        envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        oscillator.connect(envelope);
        envelope.connect(context.destination);
        oscillator.start(time);
        oscillator.stop(time + duration + 0.01);
    }

    function playNoise(time, duration, volume, filterFrequency) {
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const envelope = context.createGain();
        track(source, () => {
            filter.disconnect();
            envelope.disconnect();
        });
        const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * duration), context.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        source.buffer = buffer;
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(filterFrequency, time);
        envelope.gain.setValueAtTime(0.0001, time);
        envelope.gain.exponentialRampToValueAtTime(volume, time + 0.018);
        envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        source.connect(filter);
        filter.connect(envelope);
        envelope.connect(context.destination);
        source.start(time);
        source.stop(time + duration + 0.01);
    }

    return {
        async start() {
            if (context.state !== 'running') await context.resume();
            try {
                await Promise.all([
                    (currentArea === 1 ? ambientAudio : hospitalAudio).play(),
                    heartbeatAudio.play()
                ]);
            } catch (error) {
                console.error('Impossibile avviare l’audio ambientale o il battito cardiaco:', error);
                throw error;
            }
        },
        updateHeartbeat(anxiety) {
            if (jumpscareActive) return;
            const intensity = Math.min(Math.max(anxiety, 0), 100) / 100;
            heartbeatAudio.volume = 0.015 + intensity * 0.785;
            heartbeatAudio.playbackRate = 1 + intensity * 0.8;
        },
        updatePlayerSteps(moving, sprinting) {
            if (!moving) {
                if (!playerSteps.paused) {
                    playerSteps.pause();
                    playerSteps.currentTime = 0;
                }
                return;
            }
            playerSteps.playbackRate = sprinting ? 1.55 : 1;
            if (playerSteps.paused) {
                playerSteps.play().catch((error) => {
                    console.error('Riproduzione dei passi del giocatore non riuscita:', error);
                });
            }
        },
        updateMonster(distance, delta, active, visible = false) {
            monsterActive = active;
            const frameDelta = Math.min(delta, 0.05);
            breathElapsed += frameDelta;
            footstepElapsed += frameDelta;
            if (breathElapsed >= 0.08) {
                breathElapsed = 0;
                const proximity = 1 - Math.min(Math.max(distance, 0), 28) / 28;
                const volume = monsterActive ? 0.018 + proximity * 0.19 : 0.0001;
                const pulse = 0.65 + Math.max(0, Math.sin(context.currentTime * 2.1)) * 0.35;
                breathGain.gain.setTargetAtTime(volume * pulse, context.currentTime, 0.12);
                breathFilter.frequency.setTargetAtTime(380 + proximity * 240, context.currentTime, 0.2);
            }
            if (!monsterActive) {
                footstepElapsed = 0;
                return;
            }

            const proximity = 1 - Math.min(Math.max(distance, 0), 32) / 32;
            const interval = 1.05 - proximity * 0.55;
            if (footstepElapsed >= interval) {
                footstepElapsed %= interval;
                const volume = (0.018 + proximity * 0.075) * (visible ? 1 : 0.45);
                playNoise(context.currentTime, 0.16, volume, visible ? 150 : 105);
                playTone(context.currentTime, 62 + proximity * 24, volume * 0.65, 0.12);
            }
        },
        setArea(area) {
            if (area !== 1 && area !== 2 && area !== 3) {
                throw new RangeError('Macroarea audio non valida.');
            }
            currentArea = area;
            if (area === 3) {
                ambientAudio.volume = 0.12;
                hospitalAudio.volume = 0.08;
                if (!jumpscareActive && context.state === 'running') {
                    ambientAudio.play().catch((error) => {
                        console.error('Impossibile avviare l’audio ambientale:', error);
                    });
                    hospitalAudio.play().catch((error) => {
                        console.error('Impossibile avviare l’audio ospedaliero:', error);
                    });
                    heartbeatAudio.volume = 0.035;
                    heartbeatAudio.play().catch((error) => {
                        console.error('Impossibile riavviare il battito cardiaco:', error);
                    });
                }
                return;
            }
            const active = area === 1 ? ambientAudio : hospitalAudio;
            const inactive = area === 1 ? hospitalAudio : ambientAudio;
            inactive.pause();
            inactive.currentTime = 0;
            if (!jumpscareActive && context.state === 'running') {
                active.play().catch((error) => {
                    console.error('Impossibile avviare la musica della macroarea:', error);
                });
            }
        },
        playDoctorDefeatMix() {
            currentArea = 3;
            heartbeatAudio.pause();
            heartbeatAudio.currentTime = 0;
            hospitalAudio.pause();
            hospitalAudio.currentTime = 0;
            ambientAudio.pause();
            ambientAudio.currentTime = 0;
            ambientAudio.volume = 0.12;
            hospitalAudio.volume = 0.08;
            if (!jumpscareActive && context.state === 'running') {
                ambientAudio.play().catch((error) => {
                    console.error('Impossibile avviare l’audio ambientale:', error);
                });
                hospitalAudio.play().catch((error) => {
                    console.error('Impossibile avviare l’audio ospedaliero:', error);
                });
            }
        },
        updateDoctor(distance, delta, active, chasing) {
            const mode = !active ? '' : chasing ? 'chaseSteps' : 'patrolSteps';
            if (!mode) {
                doctorFootstepElapsed = 0;
                if (doctorFootstepMode) effects.get(doctorFootstepMode).pause();
                doctorFootstepMode = '';
                return;
            }
            doctorFootstepElapsed += Math.min(delta, 0.05);
            const interval = chasing ? 0.42 : 1.05;
            if (doctorFootstepElapsed >= interval) {
                doctorFootstepElapsed %= interval;
                if (mode !== doctorFootstepMode && doctorFootstepMode) effects.get(doctorFootstepMode).pause();
                const audio = effects.get(mode);
                audio.volume = (chasing ? 0.4 : 0.3) * (1 - Math.min(distance, 24) / 36);
                playEffect(mode);
                doctorFootstepMode = mode;
            }
        },
        playPickup() {
            const time = context.currentTime;
            playTone(time, 780, 0.06, 0.12);
            playTone(time + 0.09, 1040, 0.05, 0.16);
        },
        playDrawer() {
            playNoise(context.currentTime, 0.35, 0.055, 260);
        },
        playDoor() {
            playNoise(context.currentTime, 0.55, 0.075, 190);
        },
        playLockedDoor() {
            const time = context.currentTime;
            playNoise(time, 0.22, 0.11, 145);
            playNoise(time + 0.32, 0.34, 0.09, 82);
            playTone(time + 0.3, 48, 0.065, 0.28, 'triangle');
        },
        playStaticInterference() {
            const time = context.currentTime;
            playNoise(time, 0.72, 0.085, 1850);
            playNoise(time + 0.12, 0.32, 0.04, 420);
            playTone(time + 0.34, 710, 0.025, 0.22, 'square');
        },
        playPeripheralFootsteps() {
            const time = context.currentTime;
            playNoise(time, 0.2, 0.12, 115);
            playTone(time, 68, 0.075, 0.16);
            playNoise(time + 0.28, 0.2, 0.1, 130);
            playTone(time + 0.28, 58, 0.065, 0.16);
        },
        playBloodSpit() {
            const time = context.currentTime;
            playNoise(time, 0.32, 0.13, 430);
            playTone(time, 145, 0.08, 0.28, 'sawtooth');
        },
        playJumpscare() {
            if (jumpscareActive) return;
            jumpscareActive = true;
            ambientAudio.pause();
            hospitalAudio.pause();
            heartbeatAudio.pause();
            playScreamPair();
            playTone(context.currentTime, 112, 0.18, 0.19);
            playTone(context.currentTime + 0.16, 101, 0.15, 0.19);
        },
        playAmbientJumpscare() {
            playScreamPair();
        },
        playGlassBreak() {
            playEffect('glassBreak');
        },
        playNeonBurst() {
            playEffect('neonBurst');
        },
        playScream() {
            playEffect('scream');
        },
        playPinoApproach() {
            playEffect('pinoSteps');
        },
        playPinoScream() {
            playEffect('pinoScream');
        },
        playWoodCrash() {
            playEffect('woodCrash');
        },
        playBell() {
            playEffect('bell');
        },
        playAntibiotics() {
            playEffect('antibiotics');
        },
        playShotgun() {
            playEffect('shotgun');
        },
        playReload() {
            playEffect('reload');
        },
        playBloodHit() {
            playEffect('blood');
        },
        playAxeDamage() {
            playEffect('axe');
        },
        playAxeBreak() {
            playEffect('break');
        },
        playNeonBuzz() {
            const time = context.currentTime;
            playNoise(time, 0.12, 0.035, 820);
            playTone(time, 58, 0.025, 0.18, 'sawtooth');
        },
        reset() {
            jumpscareActive = false;
            monsterActive = false;
            breathElapsed = 0;
            footstepElapsed = 0;
            ambientAudio.pause();
            ambientAudio.currentTime = 0;
            hospitalAudio.pause();
            hospitalAudio.currentTime = 0;
            heartbeatAudio.pause();
            heartbeatAudio.currentTime = 0;
            heartbeatAudio.volume = 0.015;
            heartbeatAudio.playbackRate = 1;
            ambientAudio.volume = 0.12;
            hospitalAudio.volume = 0.12;
            screamAudio.pause();
            screamAudio.currentTime = 0;
            deathCryAudio.pause();
            deathCryAudio.currentTime = 0;
            playerSteps.pause();
            playerSteps.currentTime = 0;
            doctorFootstepElapsed = 0;
            doctorFootstepMode = '';
            for (const audio of effects.values()) {
                audio.pause();
                audio.currentTime = 0;
            }
            breathGain.gain.setTargetAtTime(0.0001, context.currentTime, 0.04);
            for (const node of activeNodes) {
                try {
                    node.stop();
                } catch (error) {
                    if (error.name !== 'InvalidStateError') throw error;
                }
            }
            activeNodes.clear();
        },
        async dispose() {
            ambientAudio.pause();
            hospitalAudio.pause();
            heartbeatAudio.pause();
            screamAudio.pause();
            deathCryAudio.pause();
            for (const audio of effects.values()) audio.pause();
            if (context.state !== 'closed') await context.close();
        }
    };
}
