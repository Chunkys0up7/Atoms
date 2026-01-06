import os
import xml.etree.ElementTree as ET
from pathlib import Path
import re

# Constants
PROCESS_DIR = Path("processes")
DOCS_DIR = Path("documentation")
NS = {'bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL'}

def setup_dirs():
    """Ensure documentation directory exists."""
    DOCS_DIR.mkdir(exist_ok=True)

def parse_bpmn(file_path):
    """Parse a BPMN file and return structured data."""
    tree = ET.parse(file_path)
    root = tree.getroot()
    
    # Find the process element
    process = root.find('.//bpmn:process', NS)
    if process is None:
        print(f"Warning: No process definition found in {file_path}")
        return None

    process_id = process.get('id')
    process_name = process.get('name', process_id)
    
    # Get Process Documentation
    doc_elem = process.find('bpmn:documentation', NS)
    description = doc_elem.text if doc_elem is not None else "No description provided."

    # Get Lanes (Roles)
    lanes = []
    lane_set = process.find('bpmn:laneSet', NS)
    if lane_set is not None:
        for lane in lane_set.findall('bpmn:lane', NS):
            lane_name = lane.get('name')
            lanes.append(lane_name)
    
    # Get Flow Elements (Tasks, Events)
    elements = []
    # We want to traverse in some logical order, but BPMN is a graph. 
    # For linear SOPs, we can list nodes. A topological sort would be better for complex graphs,
    # but for this v1, listing by appearance or type is a start. 
    # Let's collect them first.
    
    for tag in ['startEvent', 'userTask', 'serviceTask', 'endEvent', 'exclusiveGateway', 'parallelGateway']:
        for elem in process.findall(f'bpmn:{tag}', NS):
            elem_id = elem.get('id')
            elem_name = elem.get('name', '')
            elem_doc = elem.find('bpmn:documentation', NS)
            elem_desc = elem_doc.text if elem_doc is not None else ""
            
            elements.append({
                'type': tag,
                'id': elem_id,
                'name': elem_name,
                'description': elem_desc
            })

    return {
        'id': process_id,
        'name': process_name,
        'description': description,
        'roles': lanes,
        'elements': elements
    }

def generate_markdown(data):
    """Generate Markdown content from process data."""
    lines = []
    
    # Frontmatter
    lines.append("---")
    lines.append(f"title: {data['name']}")
    lines.append(f"process_id: {data['id']}")
    lines.append("generated_by: generate_docs_from_bpmn.py")
    lines.append("---")
    lines.append("")
    
    # Header
    lines.append(f"# {data['name']}")
    lines.append("")
    lines.append(f"**Process ID:** `{data['id']}`")
    lines.append("")
    
    # Description
    lines.append("## Overview")
    lines.append(data['description'])
    lines.append("")
    
    # Roles
    if data['roles']:
        lines.append("## Roles & Responsibilities")
        for role in data['roles']:
            lines.append(f"- **{role}**")
        lines.append("")
        
    # Process Steps
    lines.append("## Process Steps")
    
    # Helper to map types to icons/labels
    type_map = {
        'startEvent': '🟢 **Start**',
        'endEvent': '🔴 **End**',
        'userTask': '👤 **User Task**',
        'serviceTask': '⚙️ **System Task**',
        'exclusiveGateway': 'decision **Decision**',
        'parallelGateway': 'parallel **Parallel**'
    }

    for elem in data['elements']:
        # Skip empty gateways if unnamed
        if 'Gateway' in elem['type'] and not elem['name']:
            continue
            
        icon = type_map.get(elem['type'], elem['type'])
        name = elem['name'] or "(Untitled Step)"
        
        lines.append(f"### {icon}: {name}")
        if elem['description']:
            lines.append(elem['description'])
        lines.append("")
        lines.append(f"*ID: `{elem['id']}`*")
        lines.append("")

    return "\n".join(lines)

def main():
    setup_dirs()
    
    if not PROCESS_DIR.exists():
        print(f"Process directory {PROCESS_DIR} does not exist.")
        return

    for file_path in PROCESS_DIR.glob("*.bpmn"):
        print(f"Processing {file_path}...")
        try:
            data = parse_bpmn(file_path)
            if data:
                md_content = generate_markdown(data)
                
                output_file = DOCS_DIR / f"{file_path.stem}.md"
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(md_content)
                print(f"Generated {output_file}")
        except Exception as e:
            print(f"Error processing {file_path}: {e}")

if __name__ == "__main__":
    main()
