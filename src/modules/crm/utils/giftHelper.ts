export type MessageTone = 'Amigo' | 'Formal' | 'Breve';

// 🚀 CONSTANTE: URL de la API para mantener el código limpio
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

export const generateGiftMessage = async (
  clientName: string, 
  giftName: string, 
  tone: MessageTone
): Promise<string> => {
  
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

  // 1. 🛡️ PLANTILLAS DE RESPALDO (Por si falla la red o no hay API Key)
  const templates: Record<MessageTone, string> = {
    Amigo: `¡Hola ${clientName}! Fabricamos este ${giftName} en nuestro lab 3D especialmente para vos. Gracias por ser parte de la comunidad Raíces y bancar el diseño local. ¡A disfrutarlo, sigamos creciendo juntos!`,
    
    Formal: `Estimado/a ${clientName}: Le enviamos este ${giftName} impreso en 3D. Valoramos profundamente que forme parte de nuestra red. En Raíces crecemos gracias a quienes confían en la fabricación local y la innovación. Un cálido saludo de todo el equipo.`,
    
    Breve: `${clientName}, este ${giftName} 3D es para vos. ¡Gracias por ser parte de la familia Raíces! Sigamos construyendo juntos.`
  };

  // Verificación de seguridad de la llave
  if (!apiKey || apiKey === "TU_LLAVE_AQUI" || apiKey.length < 10) {
    console.warn("⚠️ [GiftHelper] Usando plantillas estáticas (API Key no configurada)");
    return templates[tone] || templates.Breve;
  }

  // 2. 🧠 CONFIGURACIÓN DEL PROMPT
  const prompt = `
    Actúa como el encargado de comunidad de "RAÍCES LAB", un laboratorio de impresión 3D en Berisso, Argentina.
    
    Escribe un mensaje de agradecimiento de máximo 35 palabras para el cliente "${clientName}".
    El regalo es: "${giftName}".
    El tono debe ser: ${tone}.
    
    REGLA DE ORO: El mensaje debe transmitir PERTENENCIA e INCLUSIÓN. 
    Haz que ${clientName} se sienta parte de la familia Raíces. 
    Valoramos que apoye el diseño local.
    
    No uses comillas. Firma como: El equipo de Raíces.
  `;

  // 3. ⚡ EJECUCIÓN DE LA LLAMADA
  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) throw new Error(`API_ERROR: ${response.status}`);

    const data = await response.json();
    
    // Validación profunda del objeto de respuesta
    const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!aiText) {
      throw new Error("EMPTY_AI_RESPONSE");
    }

    return aiText.trim();

  } catch (error: unknown) {
    console.error("❌ [GiftHelper] Error llamando a la IA, usando respaldo:", error);
    // Ante cualquier fallo, devolvemos la plantilla para que el usuario no vea un error
    return templates[tone] || templates.Breve;
  }
};