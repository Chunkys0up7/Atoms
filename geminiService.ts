
import { GoogleGenAI } from "@google/genai";
import { Atom } from "./types";

// Initialize with process.env.API_KEY directly
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseDocumentToGraph = async (documentText: string, existingAtoms: Atom[]) => {
  // Provide context of existing atoms to prevent duplication (RAG/Entity Resolution)
  const existingContext = existingAtoms.map(a => ({ id: a.id, name: a.name, summary: a.content.summary }));

  const prompt = `
    TASK: ATOMIZE DOCUMENTATION & PERFORM ENTITY RESOLUTION
    
    NEW DOCUMENT CONTENT:
    """
    ${documentText}
    """
    
    EXISTING CANONICAL ATOMS (REFERENCE THESE TO PREVENT DUPLICATES):
    ${JSON.stringify(existingContext)}
    
    INSTRUCTIONS:
    1. BREAKDOWN: Identify discrete Atoms (Process, Decision, Regulation, Role).
    2. DEDUPLICATION: Compare identified concepts with EXISTING CANONICAL ATOMS. 
       - If a concept matches an existing atom semantically, REUSE its ID. 
       - Do not create a new ID for "Identity Check" if "VERIFY-ID" already exists.
    3. RELATIONSHIPS: Map how these atoms connect (TRIGGERS, REQUIRES, etc).
    4. STRUCTURE: Define Phases and a Module for this specific document.
    
    OUTPUT FORMAT: JSON ONLY
    {
      "proposedAtoms": [
        {
          "isNew": boolean, 
          "id": "string",
          "type": "PROCESS | DECISION | ROLE | REGULATION",
          "name": "string",
          "phase": "string",
          "content": { "summary": "string", "steps": [] },
          "edges": [{ "type": "string", "targetId": "string" }]
        }
      ],
      "proposedModule": {
        "id": "MOD-NEW",
        "name": "string",
        "phases": ["string array"],
        "atoms": ["id array"]
      }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a graph-native documentation architect. Your goal is to maintain a dry (Don't Repeat Yourself) knowledge base. Always prioritize linking to existing canonical atoms over creating new ones."
      }
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Ingestion Error:", error);
    throw new Error("AI parser failed to resolve document structure.");
  }
};

export const generateImpactAnalysis = async (atomId: string, graphContext: any, simulationParams: any) => {
  const prompt = `
    CONTROL ROOM SIMULATION: ${atomId}
    Current State: ${JSON.stringify(graphContext.target, null, 2)}
    Simulation Parameters: ${JSON.stringify(simulationParams, null, 2)}
    Neighbors: ${JSON.stringify(graphContext.neighbors.map((n: any) => ({ id: n.id, type: n.type, metrics: n.metrics })), null, 2)}
    
    Task: Forecast automation impact, risk cascade to regulations, and documentation overhead.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a senior enterprise architect specializing in graph-native business process optimization."
      }
    });
    return response.text;
  } catch (error) {
    return "Simulation Engine Error.";
  }
};

export const chatWithKnowledgeBase = async (query: string, atoms: any[]) => {
  const context = atoms.map(a => `${a.id}: ${a.name} (${a.type}) - ${a.content.summary}`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Context:\n${context}\n\nQuery: ${query}`
  });
  return response.text;
};
