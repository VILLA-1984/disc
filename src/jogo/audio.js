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
        // Uivo: nota longa que sobe, segura e desce, com vibrato.
        const t0 = 0;
        tom({ freq: 330, fim: 560, dur: 0.9, tipo: 'sawtooth', vol: 0.09, atraso: t0, ataque: 0.25, filtro: { tipo: 'lowpass', freq: 1400, q: 3 }, vibrato: { hz: 5.5, fundo: 9 } });
        tom({ freq: 560, fim: 420, dur: 1.5, tipo: 'sawtooth', vol: 0.085, atraso: t0 + 0.85, ataque: 0.05, filtro: { tipo: 'lowpass', freq: 1200, q: 3 }, vibrato: { hz: 6, fundo: 12 } });
        tom({ freq: 280, fim: 210, dur: 0.9, tipo: 'sine', vol: 0.06, atraso: t0 + 2.1, ataque: 0.05 });
        ruido({ dur: 2.8, vol: 0.02, atraso: t0, filtro: { tipo: 'bandpass', freq: 900, q: 0.8 } });
    },

    aguia() {
        // Grito agudo, duas vezes.
        [0, 0.55].forEach((atraso) => {
            tom({ freq: 3100, fim: 1500, dur: 0.5, tipo: 'sawtooth', vol: 0.06, atraso, ataque: 0.02, filtro: { tipo: 'bandpass', freq: 2600, fim: 1700, q: 4 }, vibrato: { hz: 38, fundo: 90 } });
            ruido({ dur: 0.45, vol: 0.05, atraso, filtro: { tipo: 'highpass', freq: 2200, q: 0.7 } });
        });
    },

    tubarao() {
        // Tema de aproximacao: duas notas graves, uma onda de agua e bolhas.
        tom({ freq: 55, dur: 0.55, tipo: 'sine', vol: 0.3, atraso: 0 });
        tom({ freq: 58.3, dur: 0.7, tipo: 'sine', vol: 0.3, atraso: 0.6 });
        tom({ freq: 110, dur: 0.55, tipo: 'triangle', vol: 0.1, atraso: 0 });
        tom({ freq: 116.6, dur: 0.7, tipo: 'triangle', vol: 0.1, atraso: 0.6 });
        ruido({ dur: 2, vol: 0.07, ataque: 1, filtro: { tipo: 'lowpass', freq: 300, fim: 1400, q: 1 } });
        for (let i = 0; i < 5; i++) {
            tom({ freq: 500 + i * 120, fim: 900 + i * 160, dur: 0.07, tipo: 'sine', vol: 0.06, atraso: 1.2 + i * 0.11 });
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

/** Fundo musical bem leve (arpejo numa escala pentatonica), em loop, ate pararMusica(). */
export function iniciarMusica() {
    if (!ctx || musica) {
        return;
    }

    let passo = 0;
    let indice = 2;
    const intervalo = 0.42;
    let proximo = ctx.currentTime + 0.1;

    musica = setInterval(() => {
        while (proximo < ctx.currentTime + 0.5) {
            const atraso = proximo - ctx.currentTime;
            // Caminhada suave pela escala: sobe e desce em passos curtos.
            indice = Math.min(ESCALA.length - 1, Math.max(0, indice + [-1, 1, 1, -2, 2, 0][Math.floor(Math.random() * 6)]));
            tom({ freq: ESCALA[indice], dur: 0.5, tipo: 'sine', vol: 0.035, atraso });

            if (passo % 4 === 0) {
                tom({ freq: ESCALA[0] / 2, dur: 1.4, tipo: 'triangle', vol: 0.05, atraso });
            }

            passo++;
            proximo += intervalo;
        }
    }, 120);
}

export function pararMusica() {
    clearInterval(musica);
    musica = null;
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