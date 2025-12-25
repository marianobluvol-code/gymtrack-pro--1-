
import { GoogleGenAI, Type } from "@google/genai";
import type { Routine } from '../types';

if (!process.env.API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    routineName: {
      type: Type.STRING,
      description: "Un nombre creativo y motivador para esta rutina de ejercicios. Por ejemplo: 'Proyecto Titán' o 'Fundamentos de Fuerza'."
    },
    days: {
      type: Type.ARRAY,
      description: "Un array de objetos, donde cada objeto representa un día de entrenamiento.",
      items: {
        type: Type.OBJECT,
        properties: {
          dayName: {
            type: Type.STRING,
            description: "El nombre del día de entrenamiento, indicando los grupos musculares. Por ejemplo: 'Día 1: Pecho y Tríceps' o 'Lunes: Tren Inferior'."
          },
          exercises: {
            type: Type.ARRAY,
            description: "Una lista de ejercicios para ese día.",
            items: {
              type: Type.OBJECT,
              properties: {
                name: {
                  type: Type.STRING,
                  description: "El nombre del ejercicio en español. Por ejemplo: 'Press de Banca con Barra'."
                },
                sets: {
                  type: Type.STRING,
                  description: "El número de series a realizar. Por ejemplo: '4'."
                },
                reps: {
                  type: Type.STRING,
                  description: "El rango de repeticiones recomendado. Por ejemplo: '8-12'."
                }
              },
            }
          }
        }
      }
    }
  }
};

export const generateRoutineWithAI = async (
  goal: string,
  level: string,
  daysPerWeek: number
): Promise<{ name: string; routines: Routine[] }> => {
  const prompt = `
    Genera un plan de entrenamiento de gimnasio en español.
    
    Mis detalles:
    - Objetivo Principal: ${goal}
    - Nivel de Experiencia: ${level}
    - Días por semana: ${daysPerWeek}

    Por favor, estructura la respuesta como un JSON que cumpla con el schema proporcionado. 
    Crea rutinas separadas para cada día de entrenamiento. Por ejemplo, si son 3 días, genera 3 rutinas distintas, una para cada día.
    Los nombres de los ejercicios deben ser comunes y en español.
    El nombre general de la rutina debe ser inspirador.
  `;
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const jsonText = response.text.trim();
    const parsedData = JSON.parse(jsonText);

    if (!parsedData.routineName || !parsedData.days) {
      throw new Error("Respuesta de la IA con formato inesperado.");
    }
    
    const routines: Routine[] = parsedData.days.map((day: any) => ({
      id: self.crypto.randomUUID(),
      name: day.dayName,
      exercises: day.exercises.map((ex: any) => ({ name: ex.name })),
    }));
    
    return { name: parsedData.routineName, routines };

  } catch (error) {
    console.error("Error al generar rutina con la IA:", error);
    throw new Error("No se pudo generar la rutina. Revisa la configuración de la API o inténtalo de nuevo.");
  }
};
