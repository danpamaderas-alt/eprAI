export type MessageTone = 'Amigo' | 'Formal' | 'Breve';

export const generateGiftMessage = async (
  clientName: string, 
  giftName: string, 
  tone: MessageTone
): Promise<string> => {
  
  const templates: Record<MessageTone, string> = {
    Amigo: `¡Hola ${clientName}! Fabricamos este ${giftName} en nuestro lab 3D especialmente para vos. Gracias por ser parte de la comunidad Raíces y bancar el diseño local. ¡A disfrutarlo, sigamos creciendo juntos!`,
    
    Formal: `Estimado/a ${clientName}: Le enviamos este ${giftName} impreso en 3D. Valoramos profundamente que forme parte de nuestra red. En Raíces crecemos gracias a quienes confían en la fabricación local y la innovación. Un cálido saludo de todo el equipo.`,
    
    Breve: `${clientName}, este ${giftName} 3D es para vos. ¡Gracias por ser parte de la familia Raíces! Sigamos construyendo juntos.`
  };

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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
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
  } finally {
    clearTimeout(timeoutId); // Previene fugas de memoria limpiando el timeout si la petición fue exitosa
  }
};