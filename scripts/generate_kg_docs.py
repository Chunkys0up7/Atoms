import yaml
import os
from pathlib import Path

def load_yaml(path):
    with open(path, 'r', encoding='utf-8') as f:
        return yaml.safe_load(f)

def generate_atom_markdown(atom_path, output_dir):
    data = load_yaml(atom_path)
    atom_id = data.get('id', 'Unknown')
    filename = f"{atom_id}.md"
    output_path = output_dir / filename
    
    lines = []
    lines.append("---")
    lines.append(f"title: {data.get('name', atom_id)}")
    lines.append(f"id: {atom_id}")
    lines.append(f"type: {data.get('type', 'Atom')}")
    lines.append("---")
    lines.append(f"# {data.get('name', atom_id)}\n")
    
    lines.append(f"**ID:** `{atom_id}`  \n")
    lines.append(f"**Type:** `{data.get('type')}`  \n")
    if 'category' in data:
        lines.append(f"**Category:** `{data.get('category')}`  \n")
    lines.append("\n")
    
    if 'content' in data:
        lines.append("## Content\n")
        lines.append(f"{data['content']}\n")
        
    # Relationships
    relations = []
    # Collect all ref lists (requires, depends_on, etc.)
    # Assuming flat structure or specific keys based on ontology but usually in these YAMLs they serve as edges
    known_relation_keys = ['requires', 'implements', 'validates', 'depends_on', 'mitigates', 'owns', 'affects']
    
    lines.append("## Relationships\n")
    has_relations = False
    
    for key in known_relation_keys:
        if key in data and data[key]:
             has_relations = True
             lines.append(f"### {key.replace('_', ' ').title()}\n")
             for related_id in data[key]:
                 # Link to other atoms (assuming flat namespace in documentation/knowledge_graph/atoms/)
                 # Or check if it's a module
                 path_prefix = "../atoms/" # default assumption
                 if related_id.startswith("MOD-"):
                     path_prefix = "../modules/"
                 
                 lines.append(f"- [{related_id}]({path_prefix}{related_id}.md)")
             lines.append("\n")
             
    if not has_relations:
        lines.append("*No direct relationships defined.*\n")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))

def generate_module_markdown(module_path, output_dir):
    data = load_yaml(module_path)
    mod_id = data.get('id', 'Unknown')
    filename = f"{mod_id}.md"
    output_path = output_dir / filename
    
    lines = []
    lines.append("---")
    lines.append(f"title: {data.get('name', mod_id)}")
    lines.append(f"id: {mod_id}")
    lines.append("---")
    lines.append(f"# {data.get('name', mod_id)}\n")
    
    lines.append(f"**ID:** `{mod_id}`  \n")
    lines.append(f"**Description:** {data.get('description', '')}  \n")
    lines.append("\n")
    
    if 'atoms' in data:
        lines.append("## Contains Atoms\n")
        for atom_id in data['atoms']:
             lines.append(f"- [{atom_id}](../atoms/{atom_id}.md)")
        lines.append("\n")

    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))

def main():
    ROOT_DIR = Path(__file__).parent.parent
    ATOMS_DIR = ROOT_DIR / "atoms"
    MODULES_DIR = ROOT_DIR / "modules"
    
    DOCS_KG_DIR = ROOT_DIR / "documentation" / "knowledge_graph"
    DOCS_ATOMS_DIR = DOCS_KG_DIR / "atoms"
    DOCS_MODULES_DIR = DOCS_KG_DIR / "modules"
    
    os.makedirs(DOCS_ATOMS_DIR, exist_ok=True)
    os.makedirs(DOCS_MODULES_DIR, exist_ok=True)

    print("Generating Knowledge Graph Docs...")
    
    # Process Atoms
    # Atoms can be in subdirectories like atoms/processes/PROC-001.yaml or flat
    # Walker
    count = 0
    for root, dirs, files in os.walk(ATOMS_DIR):
        for file in files:
            if file.endswith((".yaml", ".yml")):
                generate_atom_markdown(Path(root) / file, DOCS_ATOMS_DIR)
                count += 1
    print(f"Generated {count} atoms.")

    # Process Modules
    count = 0
    for root, dirs, files in os.walk(MODULES_DIR):
         for file in files:
            if file.endswith((".yaml", ".yml")):
                generate_module_markdown(Path(root) / file, DOCS_MODULES_DIR)
                count += 1
    print(f"Generated {count} modules.")

    # Process Phases
    DOCS_PHASES_DIR = DOCS_KG_DIR / "phases"
    os.makedirs(DOCS_PHASES_DIR, exist_ok=True)
    PHASES_DIR = ROOT_DIR / "phases"
    
    count = 0
    for root, dirs, files in os.walk(PHASES_DIR):
         for file in files:
            if file.endswith((".yaml", ".yml")):
                generate_generic_markdown(Path(root) / file, DOCS_PHASES_DIR, "Phase")
                count += 1
    print(f"Generated {count} phases.")

    # Process Journeys
    DOCS_JOURNEYS_DIR = DOCS_KG_DIR / "journeys"
    os.makedirs(DOCS_JOURNEYS_DIR, exist_ok=True)
    JOURNEYS_DIR = ROOT_DIR / "journeys"
    
    count = 0
    for root, dirs, files in os.walk(JOURNEYS_DIR):
         for file in files:
            if file.endswith((".yaml", ".yml")):
                generate_generic_markdown(Path(root) / file, DOCS_JOURNEYS_DIR, "Journey")
                count += 1
    print(f"Generated {count} journeys.")

def generate_generic_markdown(path, output_dir, entity_type):
    data = load_yaml(path)
    entity_id = data.get('id', 'Unknown')
    filename = f"{entity_id}.md"
    output_path = output_dir / filename
    
    lines = []
    lines.append("---")
    lines.append(f"title: {data.get('name', entity_id)}")
    lines.append(f"id: {entity_id}")
    lines.append(f"type: {entity_type}")
    lines.append("---")
    lines.append(f"# {data.get('name', entity_id)}\n")
    
    lines.append(f"**ID:** `{entity_id}`  \n")
    lines.append(f"**Description:** {data.get('description', '')}  \n")
    lines.append("\n")
    
    if 'modules' in data:
        lines.append("## Modules\n")
        for mod_id in data['modules']:
             lines.append(f"- [{mod_id}](../modules/{mod_id}.md)")
        lines.append("\n")

    if 'phases' in data:
        lines.append("## Phases\n")
        for phase_id in data['phases']:
             lines.append(f"- [{phase_id}](../phases/{phase_id}.md)")
        lines.append("\n")
        
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write("\n".join(lines))

if __name__ == "__main__":
    main()
