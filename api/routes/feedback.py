"""
Feedback Loop System
Analyzes metrics and suggests process improvements
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import statistics

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


# Response Models
class Suggestion(BaseModel):
    """Single optimization suggestion"""
    id: str
    type: str  # 'quality', 'performance', 'efficiency', 'compliance'
    severity: str  # 'low', 'medium', 'high', 'critical'
    target_type: str  # 'atom', 'module', 'phase', 'journey'
    target_id: str
    target_name: str
    issue: str
    recommendation: str
    impact_estimate: Optional[str] = None
    suggested_actions: List[Dict[str, Any]] = []
    metrics: Dict[str, Any] = {}


class OptimizationReport(BaseModel):
    """Complete optimization analysis"""
    total_suggestions: int
    by_severity: Dict[str, int]
    by_type: Dict[str, int]
    suggestions: List[Suggestion]
    summary: str


# Feedback Loop Engine
class FeedbackLoopEngine:
    """Analyzes metrics and generates improvement suggestions"""

    def __init__(self):
        # Thresholds for triggering suggestions
        self.thresholds = {
            'error_rate_high': 0.05,  # 5%
            'error_rate_critical': 0.10,  # 10%
            'automation_low': 0.30,  # 30%
            'automation_target': 0.70,  # 70%
            'compliance_min': 0.95,  # 95%
            'compliance_critical': 0.90,  # 90%
            'cycle_time_multiplier': 1.5  # 1.5x expected
        }

    def analyze_atom(self, atom: Dict[str, Any]) -> List[Suggestion]:
        """Analyze a single atom and generate suggestions"""
        suggestions = []
        atom_id = atom.get('id', 'unknown')
        atom_name = atom.get('name', 'Unnamed')
        metrics = atom.get('metrics', {})

        if not metrics:
            return suggestions

        # Check error rate
        error_rate = metrics.get('error_rate', 0)
        if error_rate > self.thresholds['error_rate_critical']:
            suggestions.append(Suggestion(
                id=f"{atom_id}-error-critical",
                type='quality',
                severity='critical',
                target_type='atom',
                target_id=atom_id,
                target_name=atom_name,
                issue=f"Error rate {error_rate:.1%} is critically high (threshold: {self.thresholds['error_rate_critical']:.1%})",
                recommendation="Immediate action required: Add validation steps, implement error handling, review logic for edge cases",
                impact_estimate=f"Reducing errors could save {error_rate * 100:.0f}% of rework time",
                suggested_actions=[
                    {"action": "add_validation", "description": "Add input validation atom before this step"},
                    {"action": "add_error_handling", "description": "Implement try-catch and fallback logic"},
                    {"action": "review_logic", "description": "Code review to identify error patterns"}
                ],
                metrics={'current_error_rate': error_rate, 'target': self.thresholds['error_rate_high']}
            ))
        elif error_rate > self.thresholds['error_rate_high']:
            suggestions.append(Suggestion(
                id=f"{atom_id}-error-high",
                type='quality',
                severity='high',
                target_type='atom',
                target_id=atom_id,
                target_name=atom_name,
                issue=f"Error rate {error_rate:.1%} exceeds acceptable threshold",
                recommendation="Add validation atoms or improve error handling logic",
                impact_estimate=f"Could improve success rate by {error_rate * 100:.0f}%",
                suggested_actions=[
                    {"action": "add_validation", "description": "Add validation step upstream"},
                    {"action": "improve_documentation", "description": "Clarify requirements to reduce user errors"}
                ],
                metrics={'current_error_rate': error_rate, 'target': self.thresholds['error_rate_high']}
            ))

        # Check automation level
        automation = metrics.get('automation_level', 0)
        if automation < self.thresholds['automation_low']:
            roi_estimate = self._calculate_automation_roi(metrics)
            suggestions.append(Suggestion(
                id=f"{atom_id}-automation-low",
                type='efficiency',
                severity='medium' if automation > 0 else 'high',
                target_type='atom',
                target_id=atom_id,
                target_name=atom_name,
                issue=f"Only {automation:.0%} automated - significant manual effort",
                recommendation="Identify automation opportunities: API integration, RPA, or workflow automation",
                impact_estimate=roi_estimate,
                suggested_actions=[
                    {"action": "automation_assessment", "description": "Assess automation feasibility and ROI"},
                    {"action": "api_integration", "description": "Integrate with upstream/downstream systems"},
                    {"action": "rpa_candidate", "description": "Consider RPA for repetitive tasks"}
                ],
                metrics={'current_automation': automation, 'target': self.thresholds['automation_target']}
            ))

        # Check compliance score
        compliance = metrics.get('compliance_score', 1.0)
        if compliance < self.thresholds['compliance_critical']:
            suggestions.append(Suggestion(
                id=f"{atom_id}-compliance-critical",
                type='compliance',
                severity='critical',
                target_type='atom',
                target_id=atom_id,
                target_name=atom_name,
                issue=f"Compliance score {compliance:.1%} is below minimum threshold",
                recommendation="Urgent: Add required controls, update documentation, implement audit trail",
                impact_estimate="Regulatory risk - immediate attention required",
                suggested_actions=[
                    {"action": "add_controls", "description": "Implement missing regulatory controls"},
                    {"action": "audit_trail", "description": "Add comprehensive audit logging"},
                    {"action": "compliance_review", "description": "Schedule compliance team review"}
                ],
                metrics={'current_compliance': compliance, 'target': self.thresholds['compliance_min']}
            ))
        elif compliance < self.thresholds['compliance_min']:
            suggestions.append(Suggestion(
                id=f"{atom_id}-compliance-low",
                type='compliance',
                severity='high',
                target_type='atom',
                target_id=atom_id,
                target_name=atom_name,
                issue=f"Compliance score {compliance:.1%} below target",
                recommendation="Add missing controls and improve documentation",
                impact_estimate="Risk of audit findings",
                suggested_actions=[
                    {"action": "update_documentation", "description": "Document control procedures"},
                    {"action": "add_controls", "description": "Implement compensating controls"}
                ],
                metrics={'current_compliance': compliance, 'target': self.thresholds['compliance_min']}
            ))

        # Check cycle time (if we have a target)
        cycle_time = metrics.get('avg_cycle_time_mins', 0)
        expected_time = atom.get('expected_cycle_time_mins')
        if expected_time and cycle_time > (expected_time * self.thresholds['cycle_time_multiplier']):
            suggestions.append(Suggestion(
                id=f"{atom_id}-performance-slow",
                type='performance',
                severity='medium',
                target_type='atom',
                target_id=atom_id,
                target_name=atom_name,
                issue=f"Cycle time {cycle_time:.0f}min exceeds expected {expected_time:.0f}min by {((cycle_time/expected_time) - 1)*100:.0f}%",
                recommendation="Investigate bottlenecks, consider parallelization or automation",
                impact_estimate=f"Could save {cycle_time - expected_time:.0f} minutes per transaction",
                suggested_actions=[
                    {"action": "bottleneck_analysis", "description": "Identify and eliminate bottlenecks"},
                    {"action": "parallel_processing", "description": "Enable parallel processing where possible"},
                    {"action": "automation", "description": "Automate time-consuming steps"}
                ],
                metrics={'current_cycle_time': cycle_time, 'expected': expected_time}
            ))

        return suggestions

    def analyze_module(self, module: Dict[str, Any], atoms: List[Dict[str, Any]]) -> List[Suggestion]:
        """Analyze a module and generate suggestions"""
        suggestions = []
        module_id = module.get('id', 'unknown')
        module_name = module.get('name', 'Unnamed')

        # Get atoms in this module
        module_atom_ids = module.get('atoms', [])
        module_atoms = [a for a in atoms if a.get('id') in module_atom_ids]

        if not module_atoms:
            return suggestions

        # Calculate aggregate metrics
        avg_error_rate = statistics.mean([a.get('metrics', {}).get('error_rate', 0) for a in module_atoms])
        avg_automation = statistics.mean([a.get('metrics', {}).get('automation_level', 0) for a in module_atoms])
        avg_compliance = statistics.mean([a.get('metrics', {}).get('compliance_score', 1.0) for a in module_atoms])
        total_cycle_time = sum([a.get('metrics', {}).get('avg_cycle_time_mins', 0) for a in module_atoms])

        # Module-level suggestions
        if avg_error_rate > self.thresholds['error_rate_high']:
            suggestions.append(Suggestion(
                id=f"{module_id}-module-quality",
                type='quality',
                severity='high',
                target_type='module',
                target_id=module_id,
                target_name=module_name,
                issue=f"Module average error rate {avg_error_rate:.1%} indicates systemic quality issues",
                recommendation="Review entire module workflow, add validation layer, implement quality gates",
                impact_estimate=f"Affects {len(module_atoms)} atoms - high impact fix",
                suggested_actions=[
                    {"action": "module_review", "description": "Conduct comprehensive module review"},
                    {"action": "add_validation_layer", "description": "Add module-wide validation"},
                    {"action": "quality_gates", "description": "Implement quality checkpoints"}
                ],
                metrics={'avg_error_rate': avg_error_rate, 'atoms_affected': len(module_atoms)}
            ))

        if avg_automation < self.thresholds['automation_low']:
            suggestions.append(Suggestion(
                id=f"{module_id}-module-automation",
                type='efficiency',
                severity='medium',
                target_type='module',
                target_id=module_id,
                target_name=module_name,
                issue=f"Module only {avg_automation:.0%} automated - opportunity for end-to-end automation",
                recommendation="Consider straight-through processing or workflow automation for entire module",
                impact_estimate=f"High ROI: {len(module_atoms)} atoms could benefit",
                suggested_actions=[
                    {"action": "stp_assessment", "description": "Assess straight-through processing feasibility"},
                    {"action": "workflow_automation", "description": "Implement workflow orchestration"},
                    {"action": "integration", "description": "API integrations to eliminate handoffs"}
                ],
                metrics={'avg_automation': avg_automation, 'atoms_count': len(module_atoms)}
            ))

        return suggestions

    def _calculate_automation_roi(self, metrics: Dict[str, Any]) -> str:
        """Calculate ROI estimate for automation"""
        cycle_time = metrics.get('avg_cycle_time_mins', 0)
        current_automation = metrics.get('automation_level', 0)

        if cycle_time == 0:
            return "Potential time savings"

        manual_time = cycle_time * (1 - current_automation)
        potential_savings = manual_time * 0.8  # Assume 80% of manual time can be automated

        return f"Could save ~{potential_savings:.0f} min/transaction"

    def generate_summary(self, suggestions: List[Suggestion]) -> str:
        """Generate executive summary of findings"""
        if not suggestions:
            return "No optimization opportunities identified - system performing well"

        critical = len([s for s in suggestions if s.severity == 'critical'])
        high = len([s for s in suggestions if s.severity == 'high'])

        quality = len([s for s in suggestions if s.type == 'quality'])
        efficiency = len([s for s in suggestions if s.type == 'efficiency'])
        compliance = len([s for s in suggestions if s.type == 'compliance'])

        summary = f"Found {len(suggestions)} optimization opportunities"
        if critical > 0:
            summary += f" ({critical} critical requiring immediate attention)"

        areas = []
        if quality > 0:
            areas.append(f"{quality} quality improvements")
        if efficiency > 0:
            areas.append(f"{efficiency} efficiency gains")
        if compliance > 0:
            areas.append(f"{compliance} compliance issues")

        if areas:
            summary += f": {', '.join(areas)}"

        return summary


# Initialize engine
engine = FeedbackLoopEngine()


@router.post("/analyze", response_model=OptimizationReport)
async def analyze_system(atoms: List[Dict[str, Any]], modules: Optional[List[Dict[str, Any]]] = None):
    """
    Analyze entire system and generate optimization suggestions

    Takes current atoms and modules, analyzes metrics, and returns
    actionable suggestions for improvements
    """
    all_suggestions = []

    # Analyze individual atoms
    for atom in atoms:
        atom_suggestions = engine.analyze_atom(atom)
        all_suggestions.extend(atom_suggestions)

    # Analyze modules if provided
    if modules:
        for module in modules:
            module_suggestions = engine.analyze_module(module, atoms)
            all_suggestions.extend(module_suggestions)

    # Generate summary statistics
    by_severity = {
        'critical': len([s for s in all_suggestions if s.severity == 'critical']),
        'high': len([s for s in all_suggestions if s.severity == 'high']),
        'medium': len([s for s in all_suggestions if s.severity == 'medium']),
        'low': len([s for s in all_suggestions if s.severity == 'low'])
    }

    by_type = {
        'quality': len([s for s in all_suggestions if s.type == 'quality']),
        'performance': len([s for s in all_suggestions if s.type == 'performance']),
        'efficiency': len([s for s in all_suggestions if s.type == 'efficiency']),
        'compliance': len([s for s in all_suggestions if s.type == 'compliance'])
    }

    summary = engine.generate_summary(all_suggestions)

    return OptimizationReport(
        total_suggestions=len(all_suggestions),
        by_severity=by_severity,
        by_type=by_type,
        suggestions=all_suggestions,
        summary=summary
    )


@router.get("/suggestions/{target_type}/{target_id}", response_model=List[Suggestion])
async def get_suggestions_for_target(target_type: str, target_id: str, atoms: List[Dict[str, Any]]):
    """Get suggestions for a specific atom or module"""
    if target_type == 'atom':
        atom = next((a for a in atoms if a.get('id') == target_id), None)
        if not atom:
            raise HTTPException(status_code=404, detail="Atom not found")
        return engine.analyze_atom(atom)

    raise HTTPException(status_code=400, detail="Invalid target type")
