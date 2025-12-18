
import { GoogleGenAI } from "@google/genai";
import { Atom, Module, Phase, Journey, DocTemplateType } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const parseDocumentToGraph = async (documentText: string, existingAtoms: Atom[]) => {
  const existingContext = existingAtoms.map(a => ({ id: a.id, name: a.name, summary: a.content.summary, domain: a.ontologyDomain }));
  const prompt = `
    TASK: ATOMIC RECONSTRUCTION & ENTITY RESOLUTION
    METHODOLOGY: NASA-Inspired Atomic Design & Semantic Documentation Networks
    
    NEW DOCUMENT CONTENT: """${documentText}"""
    EXISTING CANONICAL ATOMS: ${JSON.stringify(existingContext)}
    
    ID PREFIXING RULES:
    - Customer actions: atom-cust-[name]
    - Back-office tasks: atom-bo-[name]
    - Automated system actions: atom-sys-[name]
    
    ONTOLOGY & RELATIONSHIP RULES:
    1. ENTITY CLASSIFICATION: Categorize atoms strictly as PROCESS, DECISION, GATEWAY, ROLE, SYSTEM, DOCUMENT, REGULATION, POLICY, or CONTROL.
    2. SEMANTIC EDGES: Use rich edge types (IMPLEMENTS, ENABLES, DEPENDS_ON, SUPERSEDES, DATA_FLOWS_TO, REQUIRES_KNOWLEDGE_OF).
    3. VOCABULARY CONSISTENCY: Map new concepts to the 'ontologyDomain' of existing atoms if they overlap.

    OUTPUT FORMAT: JSON ONLY
    {
      "proposedAtoms": [{ 
        "id": "atom-...", 
        "name": "...", 
        "category": "CUSTOMER_FACING | BACK_OFFICE | SYSTEM", 
        "type": "PROCESS | SYSTEM | etc.",
        "ontologyDomain": "...",
        "content": { "summary": "..." }, 
        "isNew": true,
        "edges": [{"type": "...", "targetId": "..."}]
      }],
      "proposedModule": { "id": "module-...", "name": "...", "atoms": ["atom-id-1"] },
      "proposedPhase": { "id": "phase-...", "name": "...", "modules": ["module-id-1"] }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a lead graph-native systems architect. You transform monolithic documentation into a semantic network of interconnected atoms. You prioritize concept reuse and strict edge typing to prevent ambiguity."
      }
    });
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Ingestion Error:", error);
    throw new Error("AI parser failed to resolve atomic structure.");
  }
};

export const compileDocument = async (atoms: Atom[], module: Module, templateType: DocTemplateType) => {
  const prompt = `
    TASK: COMPILE SEMANTIC DOCUMENT FROM ATOMIC UNITS
    TEMPLATE: ${templateType}
    HIERARCHY: Module '${module.name}' (Module ID: ${module.id})
    ATOMS: ${JSON.stringify(atoms)}
    
    INSTRUCTIONS:
    1. POINTER REFERENCE: Treat every node as a single source of truth. Reference by ID.
    2. GRAPH-BASED REASONING: Construct the narrative by traversing the semantic edges.
    3. Mention explicitly how a procedure 'IMPLEMENTS' a policy or 'DEPENDS_ON' a system check.
    4. Maintain vocabulary consistency as defined in the ontology domains.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert technical writer specializing in semantic documentation networks. You synthesize atomic graph data into high-fidelity, context-aware professional documents."
      }
    });
    return response.text;
  } catch (error) {
    console.error("Compilation Error:", error);
    return "Failed to compile document.";
  }
};

export const generateImpactAnalysis = async (targetId: string, context: { target?: Atom, neighbors: Atom[] }, params: any) => {
  const prompt = `
    INTERDEPENDENCY MAPPING & FORECAST: ${targetId}
    Mindset: Graph-Based Reasoning over Documentation Ontology
    Context: ${JSON.stringify(context)}
    Params: ${JSON.stringify(params)}
    
    Analysis Requirements:
    - Direct impacts (immediate neighbors)
    - Downstream cascade (transitive dependencies)
    - Potential for 'vocabulary drift' or ontology conflicts
    - Broken 'IMPLEMENTS' or 'GOVERNED_BY' chains
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a graph reasoning engine. You perform deep impact analysis by traversing semantic edges to identify hidden risks in documentation changes."
      }
    });
    return response.text;
  } catch (error) {
    return "Simulation analysis failed.";
  }
};

export const chatWithKnowledgeBase = async (query: string, atoms: Atom[]) => {
  const context = atoms.map(a => `${a.id}: ${a.name} [Domain: ${a.ontologyDomain}]`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are the GNDP Semantic Assistant.
    You answer queries by traversing the documentation graph.
    Indexed Units:
    ${context}
    
    Query: ${query}`
  });
  return response.text;
};
