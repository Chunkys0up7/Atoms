#!/usr/bin/env python3
"""
Register documents from markdown files into the document system.
Documents are stored as JSON with metadata in data/documents/*.json
"""

import json
from pathlib import Path
from datetime import datetime
import hashlib
import sys

# Document definitions with mapping to markdown files
DOCUMENTS = [
    {
        'filename': 'SOP-001-Income-Verification.md',
        'title': 'SOP-001: Income Verification Workflow',
        'template_type': 'SOP',
        'module_id': 'module-income-verification',
        'atom_ids': [
            'atom-cust-w2-upload',
            'atom-cust-tax-return-upload',
            'atom-bo-w2-review',
            'atom-bo-paystub-review',
            'atom-sys-income-calculation',
            'atom-sys-debt-calculation',
            'atom-uw-income-decision',
            'atom-uw-doc-request'
        ]
    },
    {
        'filename': 'TECH-SPEC-Underwriting-Module.md',
        'title': 'TECH-SPEC: Underwriting Decision & Conditions Management',
        'template_type': 'TECHNICAL_DESIGN',
        'module_id': 'module-underwriting-decision',
        'atom_ids': [
            'atom-uw-auto-approve',
            'atom-uw-manual-review',
            'atom-uw-condition-generation',
            'atom-uw-compliance-check',
            'atom-uw-income-decision',
            'atom-uw-appraisal-review',
            'atom-uw-clear-to-close',
            'atom-sys-condition-tracking',
            'atom-bo-condition-fulfillment'
        ]
    },
    {
        'filename': 'PROCESS-MAP-PreApp-RateTermRefi.md',
        'title': 'PROCESS-MAP: Rate & Term Refinance Pre-Application',
        'template_type': 'PROCESS_MAP',
        'module_id': 'module-pre-qualification',
        'atom_ids': [
            'atom-cust-pre-approval-letter',
            'atom-sys-credit-score-pull',
            'atom-sys-property-valuation',
            'atom-bo-ltv-analysis',
            'atom-uw-program-routing'
        ]
    },
    {
        'filename': 'TECH-DATA-FLOW-Closing-Phase.md',
        'title': 'TECH-DATA-FLOW: Closing Integration Points & APIs',
        'template_type': 'TECHNICAL_DESIGN',
        'module_id': 'module-closing-preparation',
        'atom_ids': [
            'atom-closing-doc-generation',
            'atom-closing-esign-integration',
            'atom-closing-title-integration',
            'atom-closing-appraisal-final',
            'atom-closing-compliance-audit',
            'atom-closing-borrower-review',
            'atom-closing-final-verification',
            'atom-closing-funding-prep'
        ]
    },
    {
        'filename': 'DOCUMENT-INVENTORY-FHA-Purchase.md',
        'title': 'DOCUMENT-INVENTORY: FHA Home Purchase Journey',
        'template_type': 'DOCUMENT_INVENTORY',
        'module_id': 'module-pre-qualification',
        'atom_ids': [
            'atom-cust-pre-approval-letter',
            'atom-cust-w2-upload',
            'atom-cust-tax-return-upload',
            'atom-sys-credit-score-pull',
            'atom-sys-property-valuation',
            'atom-bo-w2-review',
            'atom-bo-appraisal-review',
            'atom-uw-auto-approve',
            'atom-closing-doc-generation',
            'atom-closing-esign-integration',
            'atom-closing-title-integration'
        ]
    }
]


def generate_doc_id(title: str, module_id: str) -> str:
    """Generate a unique document ID based on title and module."""
    content = f"{title}_{module_id}_{datetime.utcnow().isoformat()}"
    return hashlib.md5(content.encode()).hexdigest()[:12]


def register_documents():
    """Register all documents from markdown files to JSON format."""
    workspace_root = Path(__file__).parent.parent
    docs_dir = workspace_root / "data" / "documents"
    
    # Ensure documents directory exists
    docs_dir.mkdir(parents=True, exist_ok=True)
    
    registered = 0
    failed = 0
    
    for doc_info in DOCUMENTS:
        md_file = docs_dir / doc_info['filename']
        
        if not md_file.exists():
            print(f"❌ ERROR: Markdown file not found: {md_file}")
            failed += 1
            continue
        
        # Read markdown content
        try:
            with open(md_file, 'r', encoding='utf-8') as f:
                content = f.read()
        except Exception as e:
            print(f"❌ ERROR: Failed to read {md_file}: {e}")
            failed += 1
            continue
        
        # Generate document ID
        doc_id = generate_doc_id(doc_info['title'], doc_info['module_id'])
        
        # Create document structure
        now = datetime.utcnow().isoformat()
        document = {
            'id': doc_id,
            'title': doc_info['title'],
            'template_type': doc_info['template_type'],
            'module_id': doc_info['module_id'],
            'atom_ids': doc_info['atom_ids'],
            'content': content,
            'metadata': {},
            'created_at': now,
            'updated_at': now,
            'version': 1
        }
        
        # Save as JSON
        json_file = docs_dir / f"{doc_id}.json"
        try:
            with open(json_file, 'w', encoding='utf-8') as f:
                json.dump(document, f, indent=2, ensure_ascii=False)
            
            print(f"✓ Registered: {doc_info['title']}")
            print(f"  ID: {doc_id}")
            print(f"  File: {json_file.name}")
            print(f"  Atoms: {len(doc_info['atom_ids'])}")
            print()
            
            registered += 1
        except Exception as e:
            print(f"❌ ERROR: Failed to save {json_file}: {e}")
            failed += 1
    
    print("-" * 80)
    print(f"REGISTRATION COMPLETE")
    print(f"  Registered: {registered}")
    print(f"  Failed: {failed}")
    print(f"  Total: {registered + failed}")
    
    return failed == 0


if __name__ == "__main__":
    success = register_documents()
    sys.exit(0 if success else 1)
