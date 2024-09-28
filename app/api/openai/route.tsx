import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  const { prompt, type } = await req.json();

  try {
    let result;
    if (type === 'realtaAlternative') {
      result = await generaTitoliRealtaAlternative(
        prompt.problema, 
        prompt.sceltaScartata, 
        prompt.titoloRealtaAttuale, 
        prompt.numero
      );
    } else {
      throw new Error('Tipo non valido');
    }

    return NextResponse.json({ result });
  } catch (error) {
    console.error('Errore nella chiamata OpenAI:', error);
    return NextResponse.json({ error: 'Errore nel processare la richiesta' }, { status: 500 });
  }
}

async function generaTitoliRealtaAlternative(problema: string, sceltaScartata: string, titoloRealtaAttuale: string, numero: number): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: `Sei un esperto in scenari alternativi e realtà parallele. Il tuo compito è generare titoli brevi e accattivanti per scenari che mostrano chiaramente le conseguenze di scelte alternative in un multiverso di possibilità.` },
      { role: "user", content: `
        Problema iniziale: ${problema}
        Scelta scartata inizialmente: ${sceltaScartata}
        Titolo della realtà attuale: ${titoloRealtaAttuale}

        Genera ${numero} titoli per scenari alternativi che mostrano chiaramente cosa sarebbe successo se l'utente avesse scelto diversamente. I titoli devono:

        1. Essere brevi (massimo 5 parole)
        2. Essere accattivanti e stimolare la curiosità
        3. Mostrare chiaramente una conseguenza diretta o indiretta della scelta scartata
        4. Evidenziare un cambiamento significativo rispetto alla realtà attuale
        5. Essere coerenti con il problema iniziale
        6. Essere significativamente diversi tra loro
        7. Focalizzarsi su un aspetto specifico della vita o della situazione che sarebbe cambiato
        8. Usare un linguaggio vivido e concreto per rendere la conseguenza immediatamente comprensibile

        Ricorda: l'obiettivo è far capire all'utente, con un colpo d'occhio, come la sua vita o la situazione sarebbe drasticamente cambiata se avesse fatto la scelta alternativa.

        Fornisci solo i titoli, senza numerazione o spiegazioni aggiuntive.`
      }
    ],
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error('Nessun contenuto generato da OpenAI');
  }

  const titoli = content.split('\n').filter(line => line.trim() !== '');
  return titoli.slice(0, numero);
}
