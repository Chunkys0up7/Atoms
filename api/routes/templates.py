from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime
import json

router = APIRouter()


class TemplateSectionDefinition(BaseModel):
    """Definition of a template section."""
    name: str
    description: Optional[str] = None
    required: bool = True
    order: int


class TemplateDefinition(BaseModel):
    """Complete template definition."""
    template_id: str
    template_name: str
    description: Optional[str] = None
    sections: List[TemplateSectionDefinition]
    style_instructions: str
    category: Optional[str] = "CUSTOM"  # SOP, TECHNICAL, BUSINESS, COMPLIANCE, CUSTOM
    metadata: Optional[Dict[str, Any]] = None


class CreateTemplateRequest(BaseModel):
    """Request to create a new custom template."""
    definition: TemplateDefinition


class UpdateTemplateRequest(BaseModel):
    """Request to update an existing template."""
    template_name: Optional[str] = None
    description: Optional[str] = None
    sections: Optional[List[TemplateSectionDefinition]] = None
    style_instructions: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


def get_templates_dir() -> Path:
    """Get the templates storage directory."""
    base = Path(__file__).parent.parent.parent / "templates"
    base.mkdir(parents=True, exist_ok=True)
    return base


def get_template_path(template_id: str) -> Path:
    """Get the file path for a template."""
    templates_dir = get_templates_dir()
    return templates_dir / f"{template_id}.json"


def load_builtin_templates() -> List[Dict[str, Any]]:
    """Load built-in system templates (SOP, TECHNICAL_DESIGN, etc.)."""
    return [
        {
            "template_id": "SOP",
            "template_name": "Standard Operating Procedure",
            "description": "Formal procedural documentation for operational processes",
            "category": "SOP",
            "sections": [
                {"name": "Purpose", "required": True, "order": 1, "description": "Why this procedure exists"},
                {"name": "Scope", "required": True, "order": 2, "description": "What is covered and not covered"},
                {"name": "Responsibilities", "required": True, "order": 3, "description": "Role assignments"},
                {"name": "Procedure", "required": True, "order": 4, "description": "Step-by-step instructions"},
                {"name": "Controls and Compliance", "required": True, "order": 5, "description": "Quality controls and regulatory compliance"},
                {"name": "Exceptions", "required": False, "order": 6, "description": "When to deviate from standard procedure"},
                {"name": "References", "required": True, "order": 7, "description": "Related documents and regulations"}
            ],
            "style_instructions": "Follow a formal, procedural tone. Use numbered steps for procedures. Include clear role assignments. Cite specific policies and regulations.",
            "builtin": True,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z"
        },
        {
            "template_id": "TECHNICAL_DESIGN",
            "template_name": "Technical Design Document",
            "description": "System architecture and technical specifications",
            "category": "TECHNICAL",
            "sections": [
                {"name": "Overview", "required": True, "order": 1, "description": "High-level system summary"},
                {"name": "Architecture", "required": True, "order": 2, "description": "System architecture and components"},
                {"name": "Data Models", "required": True, "order": 3, "description": "Data structures and schemas"},
                {"name": "APIs and Integrations", "required": True, "order": 4, "description": "External interfaces"},
                {"name": "Security Considerations", "required": True, "order": 5, "description": "Security architecture"},
                {"name": "Deployment Strategy", "required": True, "order": 6, "description": "Deployment and operations"},
                {"name": "Dependencies", "required": True, "order": 7, "description": "External dependencies and libraries"}
            ],
            "style_instructions": "Use technical language appropriate for engineering teams. Include diagrams using mermaid syntax where applicable. Be specific about technologies and versions.",
            "builtin": True,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z"
        },
        {
            "template_id": "EXECUTIVE_SUMMARY",
            "template_name": "Executive Summary",
            "description": "High-level business overview for executives",
            "category": "BUSINESS",
            "sections": [
                {"name": "Executive Overview", "required": True, "order": 1, "description": "Brief summary for C-level"},
                {"name": "Key Metrics and KPIs", "required": True, "order": 2, "description": "Measurable outcomes"},
                {"name": "Business Value and ROI", "required": True, "order": 3, "description": "Financial impact"},
                {"name": "Risks and Mitigation", "required": True, "order": 4, "description": "Risk assessment"},
                {"name": "Recommendations", "required": True, "order": 5, "description": "Strategic recommendations"},
                {"name": "Next Steps and Timeline", "required": True, "order": 6, "description": "Action plan"}
            ],
            "style_instructions": "Use business-friendly language avoiding technical jargon. Focus on outcomes, ROI, and strategic value. Keep it concise - executives have limited time.",
            "builtin": True,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z"
        },
        {
            "template_id": "COMPLIANCE_AUDIT",
            "template_name": "Compliance Audit Report",
            "description": "Regulatory compliance audit documentation",
            "category": "COMPLIANCE",
            "sections": [
                {"name": "Audit Scope", "required": True, "order": 1, "description": "What was audited"},
                {"name": "Applicable Regulations", "required": True, "order": 2, "description": "Regulatory framework"},
                {"name": "Control Framework", "required": True, "order": 3, "description": "Controls in place"},
                {"name": "Findings and Observations", "required": True, "order": 4, "description": "Audit results"},
                {"name": "Compliance Gaps", "required": True, "order": 5, "description": "Areas of non-compliance"},
                {"name": "Remediation Plan", "required": True, "order": 6, "description": "How to fix gaps"},
                {"name": "Sign-off and Approval", "required": True, "order": 7, "description": "Approval authority"}
            ],
            "style_instructions": "Use formal, audit-ready language. Cite specific regulation sections (e.g., 'TRID §1026.19'). Include evidence trails. Be objective and factual.",
            "builtin": True,
            "created_at": "2025-01-01T00:00:00Z",
            "updated_at": "2025-01-01T00:00:00Z"
        }
    ]


@router.get("/api/templates")
def list_templates(
    category: Optional[str] = None,
    include_builtin: bool = True
) -> Dict[str, Any]:
    """
    List all available templates (built-in and custom).

    Args:
        category: Filter by category (SOP, TECHNICAL, BUSINESS, COMPLIANCE, CUSTOM)
        include_builtin: Whether to include built-in system templates
    """
    templates = []

    # Load built-in templates
    if include_builtin:
        builtin_templates = load_builtin_templates()
        if category:
            builtin_templates = [t for t in builtin_templates if t.get('category') == category]
        templates.extend(builtin_templates)

    # Load custom templates
    templates_dir = get_templates_dir()
    for template_file in templates_dir.glob("*.json"):
        try:
            with open(template_file, "r", encoding="utf-8") as f:
                template = json.load(f)

            # Apply category filter
            if category and template.get('category') != category:
                continue

            template['builtin'] = False
            templates.append(template)
        except Exception as e:
            print(f"Warning: Failed to load template {template_file}: {e}")
            continue

    # Sort by category then name
    templates.sort(key=lambda x: (x.get('category', 'ZZZ'), x.get('template_name', '')))

    return {
        'templates': templates,
        'total': len(templates),
        'builtin_count': len([t for t in templates if t.get('builtin', False)]),
        'custom_count': len([t for t in templates if not t.get('builtin', False)])
    }


@router.get("/api/templates/{template_id}")
def get_template(template_id: str) -> Dict[str, Any]:
    """Get a specific template by ID."""
    # Check if it's a built-in template
    builtin_templates = load_builtin_templates()
    for template in builtin_templates:
        if template['template_id'] == template_id:
            return template

    # Check custom templates
    template_path = get_template_path(template_id)
    if not template_path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    try:
        with open(template_path, "r", encoding="utf-8") as f:
            template = json.load(f)
        template['builtin'] = False
        return template
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load template: {str(e)}")


@router.post("/api/templates")
def create_template(request: CreateTemplateRequest) -> Dict[str, Any]:
    """Create a new custom template."""
    # Validate template_id doesn't conflict with built-in templates
    builtin_ids = [t['template_id'] for t in load_builtin_templates()]
    if request.definition.template_id in builtin_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Template ID '{request.definition.template_id}' conflicts with built-in template. Choose a different ID."
        )

    # Check if template already exists
    template_path = get_template_path(request.definition.template_id)
    if template_path.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Template '{request.definition.template_id}' already exists"
        )

    # Create template document
    now = datetime.utcnow().isoformat()
    template = {
        'template_id': request.definition.template_id,
        'template_name': request.definition.template_name,
        'description': request.definition.description,
        'category': request.definition.category or 'CUSTOM',
        'sections': [s.dict() for s in request.definition.sections],
        'style_instructions': request.definition.style_instructions,
        'metadata': request.definition.metadata or {},
        'builtin': False,
        'created_at': now,
        'updated_at': now
    }

    # Save template
    try:
        with open(template_path, "w", encoding="utf-8") as f:
            json.dump(template, f, indent=2, ensure_ascii=False)

        return template
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")


@router.put("/api/templates/{template_id}")
def update_template(template_id: str, update: UpdateTemplateRequest) -> Dict[str, Any]:
    """Update an existing custom template."""
    # Built-in templates cannot be modified
    builtin_ids = [t['template_id'] for t in load_builtin_templates()]
    if template_id in builtin_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot modify built-in template '{template_id}'. Create a custom template instead."
        )

    template_path = get_template_path(template_id)
    if not template_path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    try:
        # Load existing template
        with open(template_path, "r", encoding="utf-8") as f:
            template = json.load(f)

        # Update fields
        if update.template_name is not None:
            template['template_name'] = update.template_name
        if update.description is not None:
            template['description'] = update.description
        if update.sections is not None:
            template['sections'] = [s.dict() for s in update.sections]
        if update.style_instructions is not None:
            template['style_instructions'] = update.style_instructions
        if update.metadata is not None:
            template['metadata'].update(update.metadata)

        # Update timestamp
        template['updated_at'] = datetime.utcnow().isoformat()

        # Save updated template
        with open(template_path, "w", encoding="utf-8") as f:
            json.dump(template, f, indent=2, ensure_ascii=False)

        return template
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update template: {str(e)}")


@router.delete("/api/templates/{template_id}")
def delete_template(template_id: str) -> Dict[str, str]:
    """Delete a custom template."""
    # Built-in templates cannot be deleted
    builtin_ids = [t['template_id'] for t in load_builtin_templates()]
    if template_id in builtin_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete built-in template '{template_id}'"
        )

    template_path = get_template_path(template_id)
    if not template_path.exists():
        raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found")

    try:
        # Delete the template file
        template_path.unlink()
        return {'status': 'deleted', 'template_id': template_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")


@router.post("/api/templates/{template_id}/clone")
def clone_template(template_id: str, new_template_id: str, new_template_name: str) -> Dict[str, Any]:
    """Clone an existing template (built-in or custom) to create a new custom template."""
    # Get source template
    try:
        source_template = get_template(template_id)
    except HTTPException:
        raise HTTPException(status_code=404, detail=f"Source template '{template_id}' not found")

    # Validate new template ID
    new_template_path = get_template_path(new_template_id)
    if new_template_path.exists():
        raise HTTPException(
            status_code=400,
            detail=f"Template '{new_template_id}' already exists"
        )

    builtin_ids = [t['template_id'] for t in load_builtin_templates()]
    if new_template_id in builtin_ids:
        raise HTTPException(
            status_code=400,
            detail=f"Template ID '{new_template_id}' conflicts with built-in template"
        )

    # Create cloned template
    now = datetime.utcnow().isoformat()
    cloned_template = {
        'template_id': new_template_id,
        'template_name': new_template_name,
        'description': source_template.get('description', '') + ' (Cloned)',
        'category': 'CUSTOM',
        'sections': source_template.get('sections', []),
        'style_instructions': source_template.get('style_instructions', ''),
        'metadata': {
            'cloned_from': template_id,
            'cloned_at': now
        },
        'builtin': False,
        'created_at': now,
        'updated_at': now
    }

    try:
        with open(new_template_path, "w", encoding="utf-8") as f:
            json.dump(cloned_template, f, indent=2, ensure_ascii=False)

        return cloned_template
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clone template: {str(e)}")
