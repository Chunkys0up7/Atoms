import yaml
import os
from pathlib import Path

def generate_mermaid_diagram(data):
    """Generates a Mermaid Class Diagram from ontology data."""
    lines = ["```mermaid", "classDiagram"]
    
    # Add classes (Entities)
    if 'entity_types' in data:
        for key, entity in data['entity_types'].items():
            lines.append(f"    class {entity.get('label', key).replace(' ', '_')} {{")
            lines.append(f"        {entity.get('description', '')}")
            lines.append(f"        ID: {entity.get('id_pattern', '')}")
            lines.append("    }")

    # Add relationships
    # Since ontology defines abstract relationships, we might represent them generally or 
    # based on competency questions if specific rules existed. 
    # For now, we'll list the relationship types as notes or a legend, 
    # but a true class diagram requires source->target constraints which abstract ontologies usually define.
    # If the ontology doesn't constrain "Requirement requires Design", we can't draw arrows easily 
    # without inferring from examples or assuming "Any -> Any".
    # 
    # However, for a high-level view, we can verify if the ontology defines domain/range.
    # The provided ontology seems to be simple (Label/Description).
    # We will skip drawing strict arrows to avoid cluttering with wrong assumptions,
    # or better, just list the entities.
    
    lines.append("```")
    return "\n".join(lines)

def generate_ontology_markdown(ontology_path, output_path):
    """Parses ontology.yaml and generates index.md."""
    with open(ontology_path, 'r') as f:
        data = yaml.safe_load(f)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    with open(output_path, 'w') as f:
        f.write(f"# {data.get('metadata', {}).get('description', 'GNDP Ontology')}\n\n")
        f.write(f"**Version:** {data.get('metadata', {}).get('version', 'N/A')}  \n")
        f.write(f"**Created:** {data.get('metadata', {}).get('created', 'N/A')}  \n\n")
        f.write(f"{data.get('metadata', {}).get('purpose', '')}\n\n")

        f.write("## Entity Types\n\n")
        f.write("Core atoms that make up the knowledge graph.\n\n")
        
        # Mermaid Diagram
        f.write(generate_mermaid_diagram(data) + "\n\n")

        # Entity Table
        f.write("| Type | Label | Description | ID Pattern | Examples |\n")
        f.write("|------|-------|-------------|------------|----------|\n")
        for key, entity in data.get('entity_types', {}).items():
            examples = ", ".join(entity.get('examples', []))
            f.write(f"| `{key}` | {entity.get('label')} | {entity.get('description')} | `{entity.get('id_pattern')}` | {examples} |\n")
        f.write("\n")

        f.write("## Relationship Types\n\n")
        f.write("Allowed edges between atoms.\n\n")
        f.write("| Name | Label | Description | Inverse |\n")
        f.write("|------|-------|-------------|---------|\n")
        for key, rel in data.get('relationship_types', {}).items():
            f.write(f"| `{key}` | {rel.get('label')} | {rel.get('description')} | `{rel.get('inverse')}` |\n")
        f.write("\n")
        
        f.write("## Traversal Patterns\n\n")
        f.write("Common graph traversal patterns used for RAG.\n\n")
        for key, pattern in data.get('traversal_patterns', {}).items():
            f.write(f"### {key.replace('_', ' ').title()}\n")
            f.write(f"{pattern.get('description')}\n\n")
            f.write(f"- **Relationships:** `{', '.join(pattern.get('relationships', []))}`\n")
            f.write(f"- **Direction:** `{pattern.get('direction', 'outgoing')}`\n")
            f.write(f"- **Max Depth:** `{pattern.get('max_depth')}`\n\n")

if __name__ == "__main__":
    ROOT_DIR = Path(__file__).parent.parent
    ONTOLOGY_FILE = ROOT_DIR / "ontology.yaml"
    OUTPUT_FILE = ROOT_DIR / "documentation" / "ontology" / "index.md"
    
    print(f"Generating Ontology Docs from {ONTOLOGY_FILE} to {OUTPUT_FILE}...")
    generate_ontology_markdown(ONTOLOGY_FILE, OUTPUT_FILE)
    print("Done.")
