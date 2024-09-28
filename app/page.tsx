'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';

async function generaConseguenza(scelta: string): Promise<string> {
  const response = await fetch('/api/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: scelta, type: 'conseguenza' }),
  });
  const data = await response.json();
  return data.result;
}

async function generaNarrazione(scelte: string[], conseguenze: string[]): Promise<string> {
  const response = await fetch('/api/openai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: { scelte, conseguenze }, type: 'narrazione' }),
  });
  const data = await response.json();
  return data.result;
}

interface Realta {
  id: string;
  titolo: string;
  descrizione: string;
  parentId: string | null;
  figli: string[];
}

export default function Home() {
  const [problema, setProblema] = useState('');
  const [sceltaIniziale1, setSceltaIniziale1] = useState('');
  const [sceltaIniziale2, setSceltaIniziale2] = useState('');
  const [fase, setFase] = useState<'input' | 'sceltaIniziale' | 'esplorazione'>('input');
  const [realta, setRealta] = useState<Record<string, Realta>>({});
  const [realtaAttuale, setRealtaAttuale] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [sceltaScartata, setSceltaScartata] = useState('');
  const [percorso, setPercorso] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFase('sceltaIniziale');
  };

  const handleSceltaIniziale = (scelta: string) => {
    const sceltaScartataTemp = scelta === sceltaIniziale1 ? sceltaIniziale2 : sceltaIniziale1;
    setSceltaScartata(sceltaScartataTemp);

    const nuovaRealta: Realta = {
      id: '0',
      titolo: `Realtà dopo la scelta: ${scelta}`,
      descrizione: '',
      parentId: null,
      figli: []
    };
    setRealta({ '0': nuovaRealta });
    setRealtaAttuale('0');
    setFase('esplorazione');
  };

  const BollaScelta = ({ titolo, onClick }: { titolo: string; onClick: () => void }) => (
    <div className={styles.bolla} onClick={onClick}>
      <h3>{titolo}</h3>
    </div>
  );

  async function generaRealtaAlternative(realtaId: string): Promise<Realta[]> {
    try {
      const realtaAttuale = realta[realtaId];
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'realtaAlternative',
          prompt: {
            problema,
            sceltaScartata,
            titoloRealtaAttuale: realtaAttuale.titolo,
            numero: 3
          }
        }),
      });
      const data = await response.json();
      
      if (!data.result || !Array.isArray(data.result)) {
        throw new Error('Risultato API non valido');
      }
      
      return data.result.map((titolo: string, index: number) => ({
        id: `${realtaId}-${index}`,
        titolo,
        descrizione: '',
        parentId: realtaId,
        figli: []
      }));
    } catch (error) {
      console.error('Errore nella chiamata API:', error);
      throw error;
    }
  }

  const generaNuoveSubRealta = async (id: string) => {
    setIsLoading(true);
    try {
      const nuoveRealta = await generaRealtaAlternative(id);
      setRealta(prev => {
        const nuovoStato = { ...prev };
        nuoveRealta.forEach(r => {
          nuovoStato[r.id] = r;
        });
        nuovoStato[id] = {
          ...nuovoStato[id],
          figli: nuoveRealta.map(r => r.id)
        };
        return nuovoStato;
      });
    } catch (error) {
      console.error('Errore nella generazione di nuove sub-realtà:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const BollaRealta = ({ realta, onGeneraSubRealta, onSalta, realtaGlobali }: {
    realta: Realta;
    onGeneraSubRealta: (id: string) => void;
    onSalta: (id: string) => void;
    realtaGlobali: Record<string, Realta>;
  }) => (
    <div className={styles.nodoRealta}>
      <div className={`${styles.bolla} ${realta.figli.length > 0 ? styles.esplorata : ''}`}>
        <h3>{realta.titolo}</h3>
        {realta.figli.length === 0 && (
          <button onClick={() => onGeneraSubRealta(realta.id)} disabled={isLoading}>
            Genera realtà parallele
          </button>
        )}
      </div>
      {realta.figli.length > 0 && (
        <div className={styles.subRealta}>
          {realta.figli.map(figlioId => (
            <div key={figlioId} className={styles.bolla} onClick={() => onSalta(figlioId)}>
              <h4>{realtaGlobali[figlioId].titolo}</h4>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const saltaInRealta = (id: string) => {
    setRealtaAttuale(id);
  };

  return (
    <main className={styles.main}>
      {fase === 'input' && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <textarea
            value={problema}
            onChange={(e) => setProblema(e.target.value)}
            placeholder="Inserisci il problema"
            className={styles.textarea}
          />
          <input
            type="text"
            value={sceltaIniziale1}
            onChange={(e) => setSceltaIniziale1(e.target.value)}
            placeholder="Scelta 1"
            className={styles.input}
          />
          <input
            type="text"
            value={sceltaIniziale2}
            onChange={(e) => setSceltaIniziale2(e.target.value)}
            placeholder="Scelta 2"
            className={styles.input}
          />
          <button type="submit" className={styles.button}>Avanti</button>
        </form>
      )}
      {fase === 'sceltaIniziale' && (
        <div className={styles.multiversoContainer}>
          <h2>Scegli una delle opzioni:</h2>
          <div className={styles.sceltaIniziale}>
            <BollaScelta 
              titolo={sceltaIniziale1} 
              onClick={() => handleSceltaIniziale(sceltaIniziale1)} 
            />
            <BollaScelta 
              titolo={sceltaIniziale2} 
              onClick={() => handleSceltaIniziale(sceltaIniziale2)} 
            />
          </div>
        </div>
      )}
      {fase === 'esplorazione' && realtaAttuale && (
        <div className={styles.multiversoContainer}>
          <BollaRealta
            realta={realta[realtaAttuale]}
            onGeneraSubRealta={generaNuoveSubRealta}
            onSalta={saltaInRealta}
            realtaGlobali={realta}
          />
        </div>
      )}
    </main>
  );
}