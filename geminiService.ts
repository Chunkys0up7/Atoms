
import { GoogleGenAI } from "@google/genai";
import { Atom, Module, Phase, Journey, DocTemplateType, GlossaryItem } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// RAG-Enhanced Knowledge Assistant
export const chatWithKnowledgeBase = async (query: string, atoms: Atom[], glossary: GlossaryItem[]) => {
  // Step 1: Retrieval (Filter relevant context)
  const queryLower = query.toLowerCase();
  
  // Find atoms that might be relevant
  const relevantAtoms = atoms.filter(a => 
    a.name.toLowerCase().includes(queryLower) || 
    a.id.toLowerCase().includes(queryLower) ||
    a.content.summary?.toLowerCase().includes(queryLower) ||
    a.ontologyDomain.toLowerCase().includes(queryLower)
  ).slice(0, 5);

  // Find glossary terms that might be relevant
  const relevantGlossary = glossary.filter(g => 
    g.term.toLowerCase().includes(queryLower) || 
    g.definition.toLowerCase().includes(queryLower)
  ).slice(0, 3);

  const atomContext = relevantAtoms.length > 0 
    ? `RELEVANT ATOMS:\n${relevantAtoms.map(a => `- ${a.id}: ${a.name} (Domain: ${a.ontologyDomain})\n  Summary: ${a.content.summary}`).join('\n')}`
    : "No directly matching atoms found in registry.";

  const glossaryContext = relevantGlossary.length > 0
    ? `RELEVANT TERMINOLOGY:\n${relevantGlossary.map(g => `- ${g.term}: ${g.definition}`).join('\n')}`
    : "No directly matching glossary terms.";

  const prompt = `
    You are the GNDP RAG Assistant, an expert in Graph-Native Documentation and NASA-inspired Atomic Design.
    Your mission is to answer user queries using the provided documentation context and glossary definitions.
    
    CONTEXT DATA:
    ${atomContext}
    
    ${glossaryContext}
    
    INSTRUCTIONS:
    1. Be functional and precise. If the information isn't in the context, say so, but offer to search for broader concepts.
    2. Use the terminology from the glossary (e.g., refer to 'Atoms' as the smallest indivisible units).
    3. If answering about a specific atom, reference its ID.
    4. Format your output using clear Markdown.
    
    USER QUERY: "${query}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are a professional technical support agent for the Graph-Native Documentation Platform (GNDP). You specialize in RAG-based retrieval and atomic documentation methodologies."
      }
    });
    return response.text;
  } catch (error) {
    console.error("AI Assistant Error:", error);
    return "I encountered an error accessing the knowledge base. Please try a more specific query.";
  }
};

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
      "proposedModule": { "id": "module-...", "name": "...", "atoms": ["atom-id-1"], "phases": ["phase-name"] },
      "proposedPhase": { "id": "phase-...", "name": "...", "modules": ["module-id-1"] }
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        systemInstruction: "You are a lead graph-native systems architect. You transform monolithic documentation into a semantic network of interconnected atoms."
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
        systemInstruction: "You are an expert technical writer specializing in semantic documentation networks."
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
        systemInstruction: "You are a graph reasoning engine performing deep impact analysis."
      }
    });
    return response.text;
  } catch (error) {
    return "Simulation analysis failed.";
  }
};
