export type MessageTone = 'Amigo' | 'Formal' | 'Breve';

export const generateGiftMessage = async (clientName: string, giftName: string, tone: MessageTone): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // 1. Plantillas de respaldo con enfoque en COMUNIDAD y PERTENENCIA
  const templates: Record<MessageTone, string> = {
    Amigo: `¡Hola ${clientName}! Fabricamos este ${giftName} en nuestro lab 3D especialmente para vos. Gracias por ser parte de la comunidad Raíces y bancar el diseño local. ¡A disfrutarlo, sigamos creciendo juntos!`,
    
    Formal: `Estimado/a ${clientName}: Le enviamos este ${giftName} impreso en 3D. Valoramos profundamente que forme parte de nuestra red. En Raíces crecemos gracias a quienes confían en la fabricación local y la innovación. Un cálido saludo de todo el equipo.`,
    
    Breve: `${clientName}, este ${giftName} 3D es para vos. ¡Gracias por ser parte de la familia Raíces! Sigamos construyendo juntos.`
  };

  if (!apiKey || apiKey === "TU_LLAVE_AQUI") {
    console.log("Usando plantillas estáticas de comunidad (Falta API Key de IA)");
    return templates[tone] || templates.Breve;
  }

  // 2. 🧠 MAGIA IA: Instrucciones reescritas para enfocar en la INCLUSIÓN
  const prompt = `
    Sos el redactor creativo y community manager de "RAÍCES LAB", el laboratorio de fabricación digital e impresión 3D del holding Raíces (ubicado en Berisso, Argentina).
    
    Tu objetivo es escribir un mensaje de agradecimiento de máximo 40 palabras para nuestro cliente "${clientName}".
    El regalo que le entregamos es: "${giftName}".
    El tono del mensaje debe ser: ${tone}.
    
    REGLA VITAL: El mensaje no debe sonar transaccional. Debe transmitir una fuerte sensación de COMUNIDAD, INCLUSIÓN y PERTENENCIA. Hacé que ${clientName} sienta que ahora es "parte de la familia Raíces" y que valoramos enormemente que apoye el diseño y la manufactura local.
    
    No uses comillas al principio ni al final. Firmá siempre como el equipo de Raíces.
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await response.json();
    
    if (data.candidates && data.candidates[0].content.parts[0].text) {
      return data.candidates[0].content.parts[0].text.trim();
    }
    
    throw new Error("Respuesta inválida de la IA");
  } catch (error) {
    console.error("Error al conectar con la IA:", error);
    return templates[tone] || templates.Breve;
  }
};