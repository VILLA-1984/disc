/**
 * Sons do jogo, sintetizados na hora com a Web Audio API: nao ha arquivos de audio, entao nao ha
 * licenca para cuidar nem download extra.
 *
 * Navegadores so liberam o som depois de um gesto da pessoa (clique ou toque): chame
 * iniciarAudio() de dentro de um clique. O som pode ser desligado a qualquer momento e a escolha
 * fica salva no navegador. Tudo e silencioso por padrao ate iniciarAudio() ser chamado.
 */

const CHAVE = 'rua_palavras_som';

let ctx = null;
let mestre = null;
let ruidoBuffer = null;
let mudo = false;
let musica = null;

try {
    mudo = localStorage.getItem(CHAVE) === 'off';
} catch {
    // sem localStorage (modo privado): segue com o som ligado
}

// Aba oculta ou tela bloqueada: o contexto de audio e suspenso (motor, clima e musica calam) e retomado ao voltar.
let suspensoPorNos = false;

if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
        if (!ctx) {
            return;
        }

        if (document.hidden && ctx.state === 'running') {
            suspensoPorNos = true;
            ctx.suspend();
        } else if (!document.hidden && suspensoPorNos) {
            suspensoPorNos = false;
            ctx.resume();
        }
    });
}

export function estaMudo() {
    return mudo;
}

export function alternarMudo() {
    mudo = !mudo;

    try {
        localStorage.setItem(CHAVE, mudo ? 'off' : 'on');
    } catch {
        // ignora
    }

    if (mestre) {
        mestre.gain.setTargetAtTime(mudo ? 0 : 0.85, ctx.currentTime, 0.03);
    }

    return mudo;
}

/** Cria (ou retoma) o contexto de audio. Deve ser chamado dentro de um clique ou toque. */
export function iniciarAudio() {
    if (!ctx) {
        const Contexto = window.AudioContext || window.webkitAudioContext;

        if (!Contexto) {
            return false;
        }

        ctx = new Contexto();
        mestre = ctx.createGain();
        mestre.gain.value = mudo ? 0 : 0.85;
        const compressor = ctx.createDynamicsCompressor();
        mestre.connect(compressor);
        compressor.connect(ctx.destination);

        ruidoBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const dados = ruidoBuffer.getChannelData(0);

        for (let i = 0; i < dados.length; i++) {
            dados[i] = Math.random() * 2 - 1;
        }
    }

    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    return true;
}

function envelope(ganho, inicio, ataque, duracao, volume) {
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(Math.max(volume, 0.0002), inicio + ataque);
    ganho.gain.exponentialRampToValueAtTime(0.0001, inicio + duracao);
}

/** Nota: oscilador com glissando opcional (de freq para fim) e envelope de volume. */
function tom({ freq, fim = null, dur = 0.2, tipo = 'sine', vol = 0.15, atraso = 0, ataque = 0.01, filtro = null, vibrato = null }) {
    if (!ctx) {
        return;
    }

    const t = ctx.currentTime + atraso;
    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(freq, t);

    if (fim !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(fim, 20), t + dur);
    }

    let saida = osc;

    if (filtro) {
        const f = ctx.createBiquadFilter();
        f.type = filtro.tipo;
        f.frequency.setValueAtTime(filtro.freq, t);

        if (filtro.fim) {
            f.frequency.exponentialRampToValueAtTime(filtro.fim, t + dur);
        }

        f.Q.value = filtro.q ?? 1;
        osc.connect(f);
        saida = f;
    }

    if (vibrato) {
        const lfo = ctx.createOscillator();
        const lfoGanho = ctx.createGain();
        lfo.frequency.value = vibrato.hz;
        lfoGanho.gain.value = vibrato.fundo;
        lfo.connect(lfoGanho);
        lfoGanho.connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + dur + 0.1);
    }

    saida.connect(ganho);
    ganho.connect(mestre);
    envelope(ganho, t, ataque, dur, vol);
    osc.start(t);
    osc.stop(t + dur + 0.05);
}

/** Ruido filtrado (vento, rugido, "chiado" do grito da aguia...). */
function ruido({ dur = 0.3, vol = 0.1, atraso = 0, filtro = { tipo: 'lowpass', freq: 1200, q: 1 }, ataque = 0.02 }) {
    if (!ctx) {
        return;
    }

    const t = ctx.currentTime + atraso;
    const fonte = ctx.createBufferSource();
    fonte.buffer = ruidoBuffer;
    fonte.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filtro.tipo;
    f.frequency.setValueAtTime(filtro.freq, t);

    if (filtro.fim) {
        f.frequency.exponentialRampToValueAtTime(filtro.fim, t + dur);
    }

    f.Q.value = filtro.q ?? 1;
    const ganho = ctx.createGain();
    fonte.connect(f);
    f.connect(ganho);
    ganho.connect(mestre);
    envelope(ganho, t, ataque, dur, vol);
    fonte.start(t);
    fonte.stop(t + dur + 0.05);
}

/**
 * Uivo de lobo: voz (dente-de-serra) passando por dois filtros de "oooh", que sobe devagar, segura com um vibrato que vai
 * crescendo e desce arrastado. Duas vozes levemente desafinadas dao corpo; um sopro de ar completa.
 */
function uivo() {
    if (!ctx) {
        return;
    }

    const t = ctx.currentTime;
    const dur = 3.0;
    const saida = ctx.createGain();
    saida.connect(mestre);
    saida.gain.setValueAtTime(0.0001, t);
    saida.gain.exponentialRampToValueAtTime(0.5, t + 0.45);
    saida.gain.setValueAtTime(0.5, t + 1.7);
    saida.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    const formantes = [[480, 5, 1.0], [1050, 6, 0.55]].map(([freq, q, ganho]) => {
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass';
        f.frequency.value = freq;
        f.Q.value = q;
        const g = ctx.createGain();
        g.gain.value = ganho * 0.55;
        f.connect(g);
        g.connect(saida);

        return f;
    });

    // Vibrato lento, que comeca fraco e aumenta no meio do uivo.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.2;
    const lfoGanho = ctx.createGain();
    lfoGanho.gain.setValueAtTime(0, t);
    lfoGanho.gain.linearRampToValueAtTime(0, t + 0.7);
    lfoGanho.gain.linearRampToValueAtTime(16, t + 1.5);
    lfoGanho.gain.linearRampToValueAtTime(8, t + dur);
    lfo.connect(lfoGanho);
    lfo.start(t);
    lfo.stop(t + dur + 0.1);

    for (const desafino of [-9, 9]) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.detune.value = desafino;
        osc.frequency.setValueAtTime(330, t);
        osc.frequency.linearRampToValueAtTime(560, t + 0.9);
        osc.frequency.linearRampToValueAtTime(600, t + 1.7);
        osc.frequency.linearRampToValueAtTime(400, t + dur);
        lfoGanho.connect(osc.frequency);

        for (const f of formantes) {
            osc.connect(f);
        }

        osc.start(t);
        osc.stop(t + dur + 0.1);
    }

    ruido({ dur: dur - 0.4, vol: 0.018, ataque: 0.5, filtro: { tipo: 'bandpass', freq: 1500, q: 1.2 } });
}

// ------------------------------------------------------------------ efeitos do jogo

export const sons = {
    passo() {
        tom({ freq: 95, fim: 52, dur: 0.07, tipo: 'triangle', vol: 0.1 });
        ruido({ dur: 0.04, vol: 0.025, filtro: { tipo: 'lowpass', freq: 600 } });
    },

    portao() {
        tom({ freq: 660, dur: 0.16, tipo: 'triangle', vol: 0.11 });
        tom({ freq: 880, dur: 0.22, tipo: 'triangle', vol: 0.11, atraso: 0.1 });
    },

    escolha() {
        tom({ freq: 520, fim: 1000, dur: 0.14, tipo: 'square', vol: 0.05 });
        tom({ freq: 1320, dur: 0.18, tipo: 'sine', vol: 0.09, atraso: 0.07 });
        tom({ freq: 1760, dur: 0.2, tipo: 'sine', vol: 0.06, atraso: 0.12 });
    },

    etapa() {
        [523, 659, 784, 1046].forEach((freq, i) => tom({ freq, dur: 0.3, tipo: 'triangle', vol: 0.14, atraso: i * 0.13 }));
        tom({ freq: 262, dur: 0.7, tipo: 'sine', vol: 0.1, atraso: 0.4 });
    },

    suspense() {
        for (let i = 0; i < 7; i++) {
            tom({ freq: 80 + i * 6, dur: 0.18, tipo: 'sine', vol: 0.18, atraso: i * 0.28 });
        }

        ruido({ dur: 2, vol: 0.06, ataque: 1.6, filtro: { tipo: 'bandpass', freq: 400, fim: 3200, q: 2 } });
    },

    /** Acelerada: arrancada de motor (veiculos) ou rajada de ar subindo (os demais). */
    turbo({ som = 'passos' } = {}) {
        if (som === 'motor') {
            tom({ freq: 80, fim: 280, dur: 0.7, tipo: 'sawtooth', vol: 0.07, filtro: { tipo: 'lowpass', freq: 500, fim: 2600, q: 2 } });
            tom({ freq: 160, fim: 560, dur: 0.6, tipo: 'square', vol: 0.025 });
            ruido({ dur: 0.6, vol: 0.05, filtro: { tipo: 'bandpass', freq: 500, fim: 2800, q: 1.2 } });
        } else {
            ruido({ dur: 0.75, vol: 0.07, ataque: 0.18, filtro: { tipo: 'bandpass', freq: 400, fim: 3200, q: 1.5 } });
            tom({ freq: 300, fim: 760, dur: 0.45, tipo: 'triangle', vol: 0.05 });
        }
    },

    fanfarra() {
        [523, 659, 784].forEach((freq, i) => tom({ freq, dur: 0.22, tipo: 'square', vol: 0.06, atraso: i * 0.12 }));
        [784, 988, 1175, 1568].forEach((freq, i) => tom({ freq, dur: 0.8, tipo: 'triangle', vol: 0.1, atraso: 0.4 + i * 0.02 }));
    },

    // Animais: aproximacoes sintetizadas, feitas para serem divertidas e nao realistas.
    lobo() {
        uivo();
    },

    aguia() {
        // Grito agudo, duas vezes.
        [0, 0.55].forEach((atraso) => {
            tom({ freq: 3100, fim: 1500, dur: 0.5, tipo: 'sawtooth', vol: 0.06, atraso, ataque: 0.02, filtro: { tipo: 'bandpass', freq: 2600, fim: 1700, q: 4 }, vibrato: { hz: 38, fundo: 90 } });
            ruido({ dur: 0.45, vol: 0.05, atraso, filtro: { tipo: 'highpass', freq: 2200, q: 0.7 } });
        });
    },

    tubarao() {
        // Agua passando: uma onda que cresce e some, bolhas subindo e um "bum" grave e curto do corpo grande cortando a agua.
        ruido({ dur: 1.7, vol: 0.09, ataque: 0.7, filtro: { tipo: 'bandpass', freq: 220, fim: 1100, q: 0.9 } });
        ruido({ dur: 1.2, vol: 0.04, atraso: 0.35, ataque: 0.5, filtro: { tipo: 'highpass', freq: 1800, q: 0.5 } });
        tom({ freq: 150, fim: 70, dur: 0.5, tipo: 'sine', vol: 0.16, atraso: 0.5, ataque: 0.04 });

        for (let i = 0; i < 6; i++) {
            const base = 420 + Math.random() * 500;
            tom({ freq: base, fim: base * 1.9, dur: 0.09, tipo: 'sine', vol: 0.05, atraso: 0.9 + i * 0.13 + Math.random() * 0.05 });
        }
    },

    gato() {
        // Miau: nota curta que sobe e desce, com filtro de formante varrendo.
        tom({ freq: 520, fim: 880, dur: 0.28, tipo: 'sawtooth', vol: 0.08, ataque: 0.05, filtro: { tipo: 'bandpass', freq: 900, fim: 1900, q: 5 } });
        tom({ freq: 880, fim: 560, dur: 0.5, tipo: 'sawtooth', vol: 0.08, atraso: 0.27, ataque: 0.02, filtro: { tipo: 'bandpass', freq: 1900, fim: 800, q: 5 } });
        // Ronronar: ruido grave pulsando.
        for (let i = 0; i < 24; i++) {
            ruido({ dur: 0.05, vol: 0.05, atraso: 1 + i * 0.045, ataque: 0.01, filtro: { tipo: 'lowpass', freq: 220 } });
        }
    },

    equilibrio() {
        [392, 494, 587, 740].forEach((freq, i) => tom({ freq, dur: 1.2, tipo: 'sine', vol: 0.08, atraso: i * 0.25 }));
    },
};

// ------------------------------------------------------------------------ musica

const ESCALA = [262, 294, 330, 392, 440, 523, 587];

// Cada cenario tem o seu clima: andamento (segundos entre notas), timbre, volume, oitava e o baixo que marca o compasso.
const ESTILOS_MUSICA = {
    rua: { intervalo: 0.42, tipo: 'sine', vol: 0.035, oitava: 1, baixo: 'triangle', cada: 4 },
    rio: { intervalo: 0.55, tipo: 'sine', vol: 0.035, oitava: 1, baixo: 'sine', cada: 4 },
    ar: { intervalo: 0.38, tipo: 'triangle', vol: 0.03, oitava: 2, baixo: 'sine', cada: 8 },
    neve: { intervalo: 0.7, tipo: 'sine', vol: 0.03, oitava: 2, baixo: 'sine', cada: 4 },
    trilhos: { intervalo: 0.34, tipo: 'triangle', vol: 0.032, oitava: 1, baixo: 'triangle', cada: 2 },
    espaco: { intervalo: 0.8, tipo: 'sine', vol: 0.032, oitava: 0.5, baixo: 'sine', cada: 2 },
};
let estiloDaMusica = null;

/** Fundo musical bem leve (arpejo numa escala pentatonica), em loop, ate pararMusica(). Muda o clima conforme o cenario. */
export function iniciarMusica(cenario = 'rua') {
    if (!ctx) {
        return;
    }

    const nome = ESTILOS_MUSICA[cenario] ? cenario : 'rua';

    if (musica) {
        if (estiloDaMusica === nome) {
            return;
        }

        pararMusica();
    }

    estiloDaMusica = nome;
    const estilo = ESTILOS_MUSICA[nome];
    let passo = 0;
    let indice = 2;
    let proximo = ctx.currentTime + 0.1;

    musica = setInterval(() => {
        while (proximo < ctx.currentTime + 0.5) {
            const atraso = proximo - ctx.currentTime;
            // Caminhada suave pela escala: sobe e desce em passos curtos.
            indice = Math.min(ESCALA.length - 1, Math.max(0, indice + [-1, 1, 1, -2, 2, 0][Math.floor(Math.random() * 6)]));
            tom({ freq: ESCALA[indice] * estilo.oitava, dur: estilo.intervalo + 0.1, tipo: estilo.tipo, vol: estilo.vol, atraso });

            if (passo % estilo.cada === 0) {
                tom({ freq: (ESCALA[0] * estilo.oitava) / 2, dur: 1.4, tipo: estilo.baixo, vol: 0.05, atraso });
            }

            passo++;
            proximo += estilo.intervalo;
        }
    }, 120);
}

export function pararMusica() {
    clearInterval(musica);
    musica = null;
    estiloDaMusica = null;
}

// ------------------------------------------------------------------ sons continuos
// Motor/rodas/turbo e clima rodam em laco enquanto a pessoa joga; sao ajustados a cada quadro.

let motorNos = null;
let climaNos = null;

function criarRuidoContinuo(filtro) {
    const fonte = ctx.createBufferSource();
    fonte.buffer = ruidoBuffer;
    fonte.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filtro.tipo;
    f.frequency.value = filtro.freq;
    f.Q.value = filtro.q ?? 1;
    const ganho = ctx.createGain();
    ganho.gain.value = 0;
    fonte.connect(f);
    f.connect(ganho);
    ganho.connect(mestre);
    fonte.start();

    return { fonte, filtro: f, ganho };
}

export const continuos = {
    motor: {
        /**
         * @param {{tipo: 'motor'|'rodas'|'passos', ritmo: number, turbo: boolean}} estado
         *   ritmo: velocidade relativa a normal (0 parado, 1 normal, ~1.9 no turbo)
         */
        atualizar({ tipo, ritmo, turbo }) {
            if (!ctx) {
                return;
            }

            if (!motorNos) {
                const grave = ctx.createOscillator();
                grave.type = 'sawtooth';
                const agudo = ctx.createOscillator();
                agudo.type = 'square';
                const f = ctx.createBiquadFilter();
                f.type = 'lowpass';
                f.frequency.value = 500;
                f.Q.value = 2;
                const ganho = ctx.createGain();
                ganho.gain.value = 0;
                grave.connect(f);
                agudo.connect(f);
                f.connect(ganho);
                ganho.connect(mestre);
                grave.start();
                agudo.start();
                motorNos = { grave, agudo, filtro: f, ganho, vento: criarRuidoContinuo({ tipo: 'bandpass', freq: 700, q: 0.7 }) };
            }

            const t = ctx.currentTime;
            const correndo = ritmo > 0.04;
            const { grave, agudo, filtro, ganho, vento } = motorNos;

            if (tipo === 'motor') {
                const freq = 40 + Math.min(ritmo, 2) * 54;
                grave.frequency.setTargetAtTime(freq, t, 0.08);
                agudo.frequency.setTargetAtTime(freq * 2.01, t, 0.08);
                filtro.frequency.setTargetAtTime(380 + ritmo * 520 + (turbo ? 500 : 0), t, 0.1);
                ganho.gain.setTargetAtTime(correndo ? 0.04 + Math.min(ritmo, 2) * 0.03 : 0.012, t, 0.1);
            } else {
                ganho.gain.setTargetAtTime(0, t, 0.1);
            }

            // Rodas rolando (cadeiras) ou ar passando (turbo, em qualquer avatar).
            const rolar = tipo === 'rodas' && correndo ? 0.012 + Math.min(ritmo, 2) * 0.012 : 0;
            const ar = turbo && correndo ? 0.05 + Math.min(ritmo, 2) * 0.02 : 0;
            vento.ganho.gain.setTargetAtTime(Math.max(rolar, ar), t, 0.12);
            vento.filtro.frequency.setTargetAtTime(turbo ? 1500 + ritmo * 700 : 500 + ritmo * 500, t, 0.12);
        },

        parar() {
            if (!motorNos) {
                return;
            }

            const { grave, agudo, vento } = motorNos;

            for (const no of [grave, agudo, vento.fonte]) {
                try {
                    no.stop();
                } catch {
                    // ja parado
                }
            }

            motorNos = null;
        },
    },

    clima: {
        /** chuva e vento de 0 a 1. */
        definir({ chuva = 0, vento = 0 }) {
            if (!ctx) {
                return;
            }

            if (!climaNos) {
                climaNos = {
                    chuva: criarRuidoContinuo({ tipo: 'highpass', freq: 1800, q: 0.6 }),
                    vento: criarRuidoContinuo({ tipo: 'bandpass', freq: 520, q: 0.9 }),
                };
                // Rajadas: o ganho do vento oscila devagar.
                const lfo = ctx.createOscillator();
                const profundidade = ctx.createGain();
                lfo.frequency.value = 0.23;
                profundidade.gain.value = 0.02;
                lfo.connect(profundidade);
                profundidade.connect(climaNos.vento.ganho.gain);
                lfo.start();
                climaNos.lfo = lfo;
            }

            const t = ctx.currentTime;
            climaNos.chuva.ganho.gain.setTargetAtTime(chuva * 0.07, t, 0.6);
            climaNos.vento.ganho.gain.setTargetAtTime(vento * 0.06, t, 0.6);
        },

        parar() {
            if (!climaNos) {
                return;
            }

            for (const no of [climaNos.chuva.fonte, climaNos.vento.fonte, climaNos.lfo]) {
                try {
                    no.stop();
                } catch {
                    // ja parado
                }
            }

            climaNos = null;
        },
    },
};