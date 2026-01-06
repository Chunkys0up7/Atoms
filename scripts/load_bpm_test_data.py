import os
import xml.etree.ElementTree as ET
import json
from pathlib import Path

# Constants
PROCESS_DIR = Path("processes")
WORKFLOW_DIR = Path("workflows")
NS = {'bpmn': 'http://www.omg.org/spec/BPMN/20100524/MODEL'}

def setup_dirs():
    WORKFLOW_DIR.mkdir(exist_ok=True)

def parse_bpmn_to_json(file_path):
    tree = ET.parse(file_path)
    root = tree.getroot()
    process = root.find('.//bpmn:process', NS)
    
    if process is None:
        return None

    pid = process.get('id')
    name = process.get('name', pid)
    doc = process.find('bpmn:documentation', NS)
    desc = doc.text if doc is not None else ""
    
    # 1. Map ID -> Element
    elements = {}
    for tag in ['startEvent', 'userTask', 'serviceTask', 'endEvent', 'exclusiveGateway', 'parallelGateway', 'task']:
        for elem in process.findall(f'.//bpmn:{tag}', NS):
            eid = elem.get('id')
            elements[eid] = {
                'id': eid,
                'name': elem.get('name', ''),
                'type': tag,
                'outgoing': []
            }
            
            # Map lanes/roles (simplified)
            # Find which lane contains this element
            # (Skipping complex lane logic for now, using a default or extracting if easy)

    # 2. Parse Sequence Flows
    flows = {} # target -> source
    for flow in process.findall('.//bpmn:sequenceFlow', NS):
        source = flow.get('sourceRef')
        target = flow.get('targetRef')
        if source in elements:
            elements[source]['outgoing'].append(target)

    # 3. Build JSON Steps
    steps_json = []
    start_step_id = None
    
    for eid, elem in elements.items():
        # Determine internal type
        etype = 'task'
        if elem['type'] == 'serviceTask': 
            etype = 'automated' 
        elif elem['type'] == 'startEvent':
            start_step_id = eid
            # Start event usually transitions to first task
            # In our engine, start_step_id points to the FIRST TASK, not the start event itself usually?
            # Looking at document_approval.json: "start_step_id": "draft_review"
            # And "draft_review" is a task.
            # So startEvent is virtual.
            pass
        elif elem['type'] == 'endEvent':
            # End event is virtual, means no transitions
            continue
            
        if elem['type'] == 'startEvent':
            continue # specific handling for start node

        # Build Transitions
        transitions = []
        for target_id in elem['outgoing']:
            # If target is end event, no transition needed (empty list = end)
            target_elem = elements.get(target_id)
            if target_elem and target_elem['type'] == 'endEvent':
                continue
            
            transitions.append({
                "target_step_id": target_id
            })
            
        steps_json.append({
            "id": eid,
            "name": elem['name'],
            "type": etype,
            "transitions": transitions
        })

    # Find effective start step (target of StartEvent)
    real_start_id = None
    for eid, elem in elements.items():
        if elem['type'] == 'startEvent':
            if elem['outgoing']:
                real_start_id = elem['outgoing'][0]
            break
            
    workflow_data = {
        "id": pid,
        "name": name,
        "version": "1.0.0",
        "description": desc,
        "start_step_id": real_start_id,
        "roles": ["user", "system"], # Default roles
        "steps": steps_json
    }
    
    return workflow_data

def main():
    setup_dirs()
    print("--- BPMN to Workflow JSON Converter ---")
    
    if not PROCESS_DIR.exists():
        print(f"Process directory {PROCESS_DIR} not found.")
        return

    count = 0
    for bpmn_file in PROCESS_DIR.glob("*.bpmn"):
        print(f"Converting {bpmn_file}...")
        try:
            json_data = parse_bpmn_to_json(bpmn_file)
            if json_data:
                out_path = WORKFLOW_DIR / f"{json_data['id']}.json"
                with open(out_path, 'w', encoding='utf-8') as f:
                    json.dump(json_data, f, indent=4)
                print(f"  Saved to {out_path}")
                count += 1
        except Exception as e:
            print(f"  Error converting {bpmn_file}: {e}")
            
    print(f"--- Converted {count} workflows ---")

if __name__ == "__main__":
    main()
