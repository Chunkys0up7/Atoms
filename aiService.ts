
import Anthropic from "@anthropic-ai/sdk";
import { Atom, Module, Phase, Journey, DocTemplateType, GlossaryItem } from "./types";

const anthropic = new Anthropic({
  apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  dangerouslyAllowBrowser: true // Only for development - in production, use backend proxy
});

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
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: "You are a professional technical support agent for the Graph-Native Documentation Platform (GNDP). You specialize in RAG-based retrieval and atomic documentation methodologies.",
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
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
    CRITICAL PRIORITY: MAXIMIZE ATOM REUSABILITY - DO NOT CREATE NEW ATOMS IF EXISTING ATOMS CAN BE REUSED

    NEW DOCUMENT CONTENT: """${documentText}"""
    EXISTING CANONICAL ATOMS (${existingContext.length} atoms): ${JSON.stringify(existingContext)}

    ENTITY RESOLUTION RULES (STRICT - FOLLOW IN ORDER):
    1. REUSE FIRST: For EVERY concept in the new document, FIRST search the EXISTING CANONICAL ATOMS list
    2. SEMANTIC MATCHING: If a concept is semantically similar (>70% overlap) to an existing atom, REUSE that atom ID
    3. VOCABULARY ALIGNMENT: Map new terminology to existing atom's ontologyDomain vocabulary
    4. PREFER BROADER REUSE: If uncertain, reuse a slightly broader existing atom rather than creating a narrow new one
    5. CREATE ONLY IF TRULY NEW: Only create a new atom if NO existing atom covers >50% of the concept
    6. WHEN IN DOUBT, REUSE: Default to reusing an existing atom over creating a new one

    ID PREFIXING RULES (for NEW atoms only):
    - Customer actions: atom-cust-[kebab-case-name]
    - Back-office tasks: atom-bo-[kebab-case-name]
    - Automated system actions: atom-sys-[kebab-case-name]

    ONTOLOGY & RELATIONSHIP RULES:
    1. ENTITY CLASSIFICATION: Categorize atoms strictly as PROCESS, DECISION, GATEWAY, ROLE, SYSTEM, DOCUMENT, REGULATION, POLICY, or CONTROL
    2. SEMANTIC EDGES: Use rich edge types (IMPLEMENTS, ENABLES, DEPENDS_ON, SUPERSEDES, DATA_FLOWS_TO, REQUIRES_KNOWLEDGE_OF)
    3. VOCABULARY CONSISTENCY: Use EXACT terminology from existing atoms' ontologyDomain when reusing

    EDGE UPDATES FOR REUSED ATOMS:
    - If reusing an existing atom, propose NEW edges connecting it to other atoms in this context
    - Format: { "sourceId": "existing-atom-id", "type": "DEPENDS_ON", "targetId": "other-atom-id" }
    - This enriches the graph without creating duplicate atoms

    OUTPUT FORMAT: JSON ONLY (strict schema compliance required)
    {
      "proposedAtoms": [{
        "id": "atom-...",  // Existing ID if reused, new ID if created
        "name": "...",
        "category": "CUSTOMER_FACING | BACK_OFFICE | SYSTEM",
        "type": "PROCESS | DECISION | GATEWAY | ROLE | SYSTEM | DOCUMENT | REGULATION | POLICY | CONTROL",
        "ontologyDomain": "...",
        "content": { "summary": "..." },
        "isNew": false,  // false = reused from existing, true = newly created
        "reuseReason": "...",  // If isNew=false, explain WHY this atom was reused (which existing atom matched and why)
        "edges": [{"type": "IMPLEMENTS|ENABLES|DEPENDS_ON|SUPERSEDES|DATA_FLOWS_TO|REQUIRES_KNOWLEDGE_OF", "targetId": "atom-..."}]
      }],
      "reuseStats": {
        "totalConcepts": 0,  // Total concepts identified in document
        "atomsReused": 0,    // Number of existing atoms reused
        "atomsCreated": 0,   // Number of new atoms created
        "reusePercentage": 0  // (atomsReused / totalConcepts) * 100
      },
      "proposedModule": {
        "id": "module-...",
        "name": "...",
        "atoms": ["atom-id-1", "atom-id-2"],
        "phases": ["phase-name-1", "phase-name-2"]
      },
      "proposedPhase": {
        "id": "phase-...",
        "name": "...",
        "modules": ["module-id-1"]
      }
    }
  `;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: "You are a lead graph-native systems architect specializing in ATOM REUSABILITY and deduplication. Your primary goal is to map new concepts to existing atoms whenever possible. Creating duplicate atoms is considered a critical failure. Prioritize reuse over creation at all times. Always respond with valid JSON only.",
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return JSON.parse(text);
  } catch (error) {
    console.error("Ingestion Error:", error);
    throw new Error("AI parser failed to resolve atomic structure.");
  }
};

/**
 * Verify AI's atom reusability decisions using semantic similarity check
 * Returns warnings for atoms that should potentially be flagged for review
 */
export const verifyAtomDeduplication = async (
  proposedAtoms: any[],
  existingAtoms: Atom[]
): Promise<{ verified: boolean, warnings: string[] }> => {
  const warnings: string[] = [];

  // Only check atoms marked as "new" by the AI
  const newAtoms = proposedAtoms.filter(a => a.isNew === true);

  for (const proposed of newAtoms) {
    const proposedText = `${proposed.name} ${proposed.content?.summary || ''}`;

    try {
      // Call RAG entity search for semantic similarity
      const response = await fetch('http://localhost:8001/api/rag/entity-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: proposedText,
          top_k: 3,
          similarity_threshold: 0.70  // 70% similarity threshold
        })
      });

      if (response.ok) {
        const data = await response.json();

        if (data.results && data.results.length > 0) {
          const topMatch = data.results[0];

          // If similarity is high, warn about potential duplicate
          if (topMatch.similarity_score > 0.70) {
            const matchedAtom = existingAtoms.find(a => a.id === topMatch.atom_id);
            warnings.push(
              `⚠️ Proposed NEW atom "${proposed.name}" (${proposed.id}) is ${Math.round(topMatch.similarity_score * 100)}% similar to existing atom "${matchedAtom?.name || topMatch.atom_id}" (${topMatch.atom_id}). Consider reusing existing atom instead.`
            );
          }
        }
      }
    } catch (error) {
      console.warn(`Similarity check failed for atom ${proposed.id}:`, error);
      // Don't block the workflow if similarity check fails
    }
  }

  return {
    verified: warnings.length === 0,
    warnings
  };
};

// Template structure definitions for consistent document compilation
const TEMPLATE_STRUCTURES: Record<DocTemplateType, { sections: string[], instructions: string }> = {
  SOP: {
    sections: [
      "Purpose",
      "Scope",
      "Responsibilities",
      "Procedure",
      "Controls and Compliance",
      "Exceptions",
      "References"
    ],
    instructions: "Follow a formal, procedural tone. Use numbered steps for procedures. Include clear role assignments. Cite specific policies and regulations."
  },
  TECHNICAL_DESIGN: {
    sections: [
      "Overview",
      "Architecture",
      "Data Models",
      "APIs and Integrations",
      "Security Considerations",
      "Deployment Strategy",
      "Dependencies"
    ],
    instructions: "Use technical language appropriate for engineering teams. Include diagrams using mermaid syntax where applicable. Be specific about technologies and versions."
  },
  EXECUTIVE_SUMMARY: {
    sections: [
      "Executive Overview",
      "Key Metrics and KPIs",
      "Business Value and ROI",
      "Risks and Mitigation",
      "Recommendations",
      "Next Steps and Timeline"
    ],
    instructions: "Use business-friendly language avoiding technical jargon. Focus on outcomes, ROI, and strategic value. Keep it concise - executives have limited time."
  },
  COMPLIANCE_AUDIT: {
    sections: [
      "Audit Scope",
      "Applicable Regulations",
      "Control Framework",
      "Findings and Observations",
      "Compliance Gaps",
      "Remediation Plan",
      "Sign-off and Approval"
    ],
    instructions: "Use formal, audit-ready language. Cite specific regulation sections (e.g., 'TRID §1026.19'). Include evidence trails. Be objective and factual."
  }
};

export const compileDocument = async (atoms: Atom[], module: Module, templateType: DocTemplateType) => {
  const template = TEMPLATE_STRUCTURES[templateType];

  const prompt = `
    TASK: COMPILE SEMANTIC DOCUMENT FROM ATOMIC UNITS
    TEMPLATE: ${templateType}

    REQUIRED SECTIONS (must be present in this order):
    ${template.sections.map((s, i) => `${i + 1}. ${s}`).join('\n    ')}

    STYLE GUIDE:
    ${template.instructions}

    MODULE CONTEXT:
    - Name: ${module.name}
    - ID: ${module.id}
    - Type: ${module.type || 'BPM_WORKFLOW'}
    - Description: ${module.description || 'No description provided'}

    ATOMS TO INTEGRATE (${atoms.length} atoms):
    ${JSON.stringify(atoms.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      category: a.category,
      domain: a.ontologyDomain,
      summary: a.content?.summary
    })))}

    COMPILATION INSTRUCTIONS:
    1. POINTER REFERENCE: Treat every atom as a single source of truth. Always reference atoms by their ID in brackets (e.g., [atom-bo-w2-review]).
    2. GRAPH-BASED REASONING: Construct the narrative by traversing semantic edges between atoms.
       - When atom A IMPLEMENTS policy B, write: "The [atom-A] procedure implements the [atom-B] policy."
       - When atom A DEPENDS_ON system B, write: "This step depends on [atom-B] system integration."
       - When atom A ENABLES outcome B, write: "The [atom-A] process enables [atom-B]."
    3. SECTION COMPLETENESS: Ensure EVERY required section listed above is present in the output, even if brief.
    4. VOCABULARY CONSISTENCY: Use terminology from atom ontologyDomain values. Maintain consistent vocabulary throughout.
    5. FORMATTING: Use Markdown with proper hierarchy:
       - ## for main sections (e.g., ## Purpose)
       - ### for subsections (e.g., ### Loan Officer Responsibilities)
       - Numbered lists for sequential procedures
       - Bullet points for non-sequential items
    6. ATOM TRACEABILITY: For audit purposes, mention which atoms contribute to each section.

    OUTPUT: Generate a complete, well-structured document in Markdown format with all required sections.
  `;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: "You are an expert technical writer specializing in semantic documentation networks. You produce audit-ready, compliance-grade documents that maintain full traceability to source atoms. Every statement should be grounded in the provided atomic units.",
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return response.content[0].type === 'text' ? response.content[0].text : 'Failed to compile document.';
  } catch (error) {
    console.error("Compilation Error:", error);
    throw new Error(`Failed to compile document: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: "You are a graph reasoning engine performing deep impact analysis.",
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    return response.content[0].type === 'text' ? response.content[0].text : 'Simulation analysis failed.';
  } catch (error) {
    return "Simulation analysis failed.";
  }
};
