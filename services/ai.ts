// services/ai.ts
// -----------------------------------------------------------------------------
// Servicio de análisis nutricional con IA.
//
// Motor principal: Groq (modelos Llama), API gratuita y compatible con el
// formato de OpenAI. La clave se lee de EXPO_PUBLIC_GROQ_API_KEY (.env).
//
// Respaldo automático: si Groq falla (sin clave, error de cuota, sin internet),
// se genera la recomendación con un motor de reglas local, de modo que la
// función NUNCA falle y la app siempre entregue un resultado útil.
// -----------------------------------------------------------------------------

const GROQ_API_KEY = (process.env.EXPO_PUBLIC_GROQ_API_KEY || '').trim();

// Modelo gratuito de Groq. Si algún día deja de estar disponible se puede
// cambiar por otro (ej: 'llama-3.1-8b-instant').
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Datos que la app le entrega a la IA para que analice el día del usuario.
export interface DatosAnalisis {
  nombre: string;
  sexo: string | null;
  edad: number | null;
  objetivo: string | null;
  metas: {
    calorias_objetivo: number;
    proteinas_objetivo_g: number;
    carbohidratos_objetivo_g: number;
    grasas_objetivo_g: number;
  };
  consumo: {
    calorias_consumidas: number;
    proteinas_consumidas: number;
    carbohidratos_consumidos: number;
    grasas_consumidas: number;
  };
  alimentos: string[]; // nombres de los alimentos registrados hoy
}

// Lo que devuelve el análisis y que se guarda en la tabla recomendaciones_ia.
export interface ResultadoIA {
  sugerencia_text: string;
  alerta_detectada: string | null;
}

// Permite a la UI saber si hay clave de IA configurada.
export function hayClaveIA(): boolean {
  return GROQ_API_KEY.length > 0;
}

// Arma el mensaje con el contexto nutricional del día.
function construirPrompt(d: DatosAnalisis): string {
  const listaAlimentos =
    d.alimentos.length > 0 ? d.alimentos.join(', ') : 'ningún alimento registrado aún';

  return `Analiza el dia nutricional de este usuario y responde en español, en tono cercano y motivador, sin lenguaje medico alarmista y sin diagnosticar enfermedades.

Datos del usuario:
- Nombre: ${d.nombre}
- Sexo: ${d.sexo ?? 'no especificado'}
- Edad: ${d.edad ?? 'no especificada'}
- Objetivo: ${d.objetivo ?? 'no especificado'}

Metas diarias:
- Calorias: ${d.metas.calorias_objetivo} kcal
- Proteinas: ${d.metas.proteinas_objetivo_g} g
- Carbohidratos: ${d.metas.carbohidratos_objetivo_g} g
- Grasas: ${d.metas.grasas_objetivo_g} g

Consumo de hoy:
- Calorias: ${Math.round(d.consumo.calorias_consumidas)} kcal
- Proteinas: ${Math.round(d.consumo.proteinas_consumidas)} g
- Carbohidratos: ${Math.round(d.consumo.carbohidratos_consumidos)} g
- Grasas: ${Math.round(d.consumo.grasas_consumidas)} g
- Alimentos registrados: ${listaAlimentos}

Devuelve UNICAMENTE un objeto JSON valido con esta forma exacta:
{
  "sugerencia_text": "2 a 4 frases con una recomendacion concreta y accionable segun sus metas y su objetivo",
  "alerta_detectada": "una sola frase corta SOLO si detectas algo importante (por ejemplo: muy pocas proteinas, exceso de calorias, casi no comio). Si no hay nada relevante, devuelve null"
}`;
}

// Extrae el objeto JSON de la respuesta del modelo, tolerando ```json ``` y texto extra.
function extraerJSON(texto: string): ResultadoIA {
  let limpio = texto.trim();
  limpio = limpio.replace(/^```(json)?/i, '').replace(/```$/, '').trim();

  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (inicio !== -1 && fin !== -1) {
    limpio = limpio.slice(inicio, fin + 1);
  }

  const parsed = JSON.parse(limpio);

  const sugerencia = String(parsed.sugerencia_text ?? '').trim();
  const alertaRaw = parsed.alerta_detectada;
  const alerta =
    alertaRaw && String(alertaRaw).trim().toLowerCase() !== 'null'
      ? String(alertaRaw).trim()
      : null;

  return {
    sugerencia_text: sugerencia,
    alerta_detectada: alerta,
  };
}

// Llama al modelo de Groq (Llama). Lanza Error si algo sale mal.
async function llamarGroq(datos: DatosAnalisis): Promise<ResultadoIA> {
  const body = {
    model: GROQ_MODEL,
    temperature: 0.7,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'Eres un asistente nutricional de la app movil "Alimétrica IA". Respondes siempre en español y unicamente con un objeto JSON valido.',
      },
      { role: 'user', content: construirPrompt(datos) },
    ],
  };

  const resp = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Groq respondio ${resp.status}: ${errText}`);
  }

  const json = await resp.json();
  const texto: string | undefined = json?.choices?.[0]?.message?.content;
  if (!texto) {
    throw new Error('Groq no devolvio contenido.');
  }

  const resultado = extraerJSON(texto);
  if (!resultado.sugerencia_text) {
    throw new Error('La respuesta de la IA vino vacia.');
  }
  return resultado;
}

// -----------------------------------------------------------------------------
// Motor de análisis LOCAL (respaldo). Genera una recomendación con reglas
// nutricionales sencillas a partir de las metas y el consumo del día.
// -----------------------------------------------------------------------------
export function generarRecomendacionLocal(d: DatosAnalisis): ResultadoIA {
  const nombre = d.nombre;
  const cal = d.consumo.calorias_consumidas;
  const calObj = d.metas.calorias_objetivo || 1;
  const prot = d.consumo.proteinas_consumidas;
  const protObj = d.metas.proteinas_objetivo_g || 1;
  const objetivo = d.objetivo || 'mantener tu peso';

  const pctCal = cal / calObj;
  const pctProt = prot / protObj;
  const restantes = Math.max(Math.round(calObj - cal), 0);

  // Caso: sin comidas registradas todavía
  if (cal <= 0 && d.alimentos.length === 0) {
    return {
      sugerencia_text: `Todavía no registraste comidas hoy, ${nombre}. Anota lo que vayas comiendo en el Diario y vuelve para recibir un análisis según tu meta de ${calObj} kcal.`,
      alerta_detectada: null,
    };
  }

  // Alerta principal (una sola, por prioridad)
  let alerta: string | null = null;
  if (pctCal > 1.15) {
    alerta = `Superaste tu meta de calorías de hoy (${Math.round(cal)} de ${calObj} kcal).`;
  } else if (pctCal < 0.4) {
    alerta = `Has comido muy poco hoy (${Math.round(cal)} de ${calObj} kcal); procura no quedarte tan por debajo de tu meta.`;
  } else if (pctProt < 0.6) {
    alerta = `Vas bajo en proteínas: llevas ${Math.round(prot)} g de ${protObj} g.`;
  }

  // Sugerencia según el estado calórico y el objetivo
  let sugerencia: string;
  if (pctCal < 0.5) {
    sugerencia = `Vas en ${Math.round(cal)} kcal y aún te quedan unas ${restantes} kcal para tu meta. `;
    if (objetivo === 'Bajar de peso') {
      sugerencia += `Como tu objetivo es bajar de peso, prioriza proteína y vegetales para llegar satisfecho/a sin excederte.`;
    } else if (objetivo === 'Ganar masa muscular') {
      sugerencia += `Para ganar masa muscular suma una comida rica en proteína y carbohidratos para completar tu energía del día.`;
    } else {
      sugerencia += `Reparte lo que falta en tus próximas comidas de forma equilibrada.`;
    }
  } else if (pctCal <= 1.1) {
    sugerencia = `Buen trabajo, ${nombre}: vas muy alineado/a con tu meta (${Math.round(cal)} de ${calObj} kcal). `;
    sugerencia +=
      pctProt < 0.8
        ? `Solo cuida un poco más las proteínas para redondear el día.`
        : `Mantén este equilibrio en tus próximas comidas.`;
  } else {
    sugerencia = `Hoy te pasaste un poco de tu meta calórica (${Math.round(cal)} de ${calObj} kcal). `;
    sugerencia +=
      objetivo === 'Bajar de peso'
        ? `Por un día no pasa nada; mañana intenta porciones algo más pequeñas y prioriza proteína y vegetales.`
        : `Si mañana te mueves un poco más, ese excedente se equilibra sin problema.`;
  }

  return { sugerencia_text: sugerencia.trim(), alerta_detectada: alerta };
}

// -----------------------------------------------------------------------------
// Punto de entrada: intenta con la IA y, ante cualquier fallo, usa el motor
// local. Nunca lanza excepción por problemas de la IA.
// -----------------------------------------------------------------------------
export async function analizarDiaConIA(datos: DatosAnalisis): Promise<ResultadoIA> {
  if (!hayClaveIA()) {
    return generarRecomendacionLocal(datos);
  }

  try {
    return await llamarGroq(datos);
  } catch (e: any) {
    console.warn('IA no disponible, usando análisis local. Detalle:', e?.message);
    return generarRecomendacionLocal(datos);
  }
}
