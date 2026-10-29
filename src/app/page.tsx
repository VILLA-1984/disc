import Partida from '@/components/Partida';
import QrAbertura from '@/components/QrAbertura';

export default function Pagina() {
    return (
        <main className="pagina">
            <Partida qr={<QrAbertura />} />
        </main>
    );
}
