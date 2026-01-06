import os
import xml.etree.ElementTree as ET
from pathlib import Path
import re
import sys

# Constants
PROCESS_DIR = Path("processes")
DOCS_DIR = Path("documentation")
NS = {'bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL'}

def parse_bpmn_ids(file_path):
    """Extract all task/event IDs from BPMN."""
    tree = ET.parse(file_path)
    root = tree.getroot()
    process = root.find('.//bpmn:process', NS)
    if process is None:
        return set()
        
    ids = set()
    # Broadly capture all flow nodes
    for child in process:
        if '}' in child.tag:
            tag = child.tag.split('}')[1]
            if tag in ['startEvent', 'userTask', 'serviceTask', 'endEvent', 'exclusiveGateway', 'parallelGateway', 'task']:
                ids.add(child.get('id'))
    return ids

def parse_md_ids(file_path):
    """Extract all IDs mentioned in Markdown."""
    ids = set()
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            # Look for pattern *ID: `Task_123`*
            matches = re.findall(r'\*ID: `([^`]+)`\*', content)
            ids.update(matches)
    except FileNotFoundError:
        pass
    return ids

def validate_pair(bpmn_path, md_path):
    """Validate a single pair of BPMN and MD files."""
    print(f"Validating {bpmn_path.name} <-> {md_path.name}...")
    
    if not md_path.exists():
        print(f"  ❌ ERROR: Documentation missing for {bpmn_path.name}")
        return False

    bpmn_ids = parse_bpmn_ids(bpmn_path)
    md_ids = parse_md_ids(md_path)
    
    errors = []
    
    # Check Completeness: BPMN -> Docs
    for bid in bpmn_ids:
        if bid not in md_ids:
            errors.append(f"  ❌ Missing logic: BPMN element '{bid}' is not documented.")

    # Check Validity: Docs -> BPMN
    for mid in md_ids:
        if mid not in bpmn_ids:
            # We allow some drift if docs lag, but stricly speaking this is a validation error
            # In "Docs as Code" strict mode, this is an error (documented element no longer exists)
            errors.append(f"  ❌ Stale documentation: Doc refers to '{mid}' which is not in BPMN.")

    if errors:
        for e in errors:
            print(e)
        return False
    else:
        print("  ✅ Validation passed.")
        return True

def main():
    success = True
    for bpmn_file in PROCESS_DIR.glob("*.bpmn"):
        md_file = DOCS_DIR / f"{bpmn_file.stem}.md"
        if not validate_pair(bpmn_file, md_file):
            success = False
            
    if not success:
        sys.exit(1)

if __name__ == "__main__":
    main()
