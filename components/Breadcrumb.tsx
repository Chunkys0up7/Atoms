import { ViewType, Phase, Journey, Module, Atom } from '../types';

interface BreadcrumbItem {
  label: string;
  view?: ViewType;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  canGoBack: boolean;
  onGoBack: () => void;
}

export default function Breadcrumb({ items, canGoBack, onGoBack }: BreadcrumbProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: 'var(--color-bg-secondary)',
      borderBottom: '1px solid var(--color-border)',
      fontSize: '13px'
    }}>
      {/* Back button */}
      {canGoBack && (
        <button
          onClick={onGoBack}
          className="btn btn-sm"
          title="Go back"
          style={{
            padding: '4px 8px',
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      )}

      {/* Breadcrumb trail */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
        {items.map((item, index) => (
          <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {index > 0 && (
              <span style={{ color: 'var(--color-text-tertiary)' }}>/</span>
            )}
            {item.onClick ? (
              <button
                onClick={item.onClick}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '2px 6px',
                  color: 'var(--color-primary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: index === items.length - 1 ? '600' : '400',
                  textDecoration: 'none',
                  borderRadius: '4px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                {item.label}
              </button>
            ) : (
              <span style={{
                padding: '2px 6px',
                color: index === items.length - 1 ? 'var(--color-text)' : 'var(--color-text-secondary)',
                fontWeight: index === items.length - 1 ? '600' : '400'
              }}>
                {item.label}
              </span>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

// Helper to build breadcrumb items based on current context
export function buildBreadcrumbs(
  view: ViewType,
  context: {
    selectedAtom?: Atom | null;
    selectedPhaseId?: string | null;
    selectedJourneyId?: string | null;
    selectedModuleId?: string | null;
    phases?: Phase[];
    journeys?: Journey[];
    modules?: Module[];
  },
  onNavigate: (view: ViewType, ctx?: any) => void
): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: 'GNDP System', view: 'explorer', onClick: () => onNavigate('explorer') }
  ];

  switch (view) {
    case 'workflow':
      items.push({ label: 'Workflows' });
      if (context.selectedJourneyId && context.journeys) {
        const journey = context.journeys.find(j => j.id === context.selectedJourneyId);
        if (journey) {
          items.push({ label: journey.name });
        }
      }
      break;

    case 'phases':
      items.push({
        label: 'Phases',
        view: 'phases',
        onClick: () => onNavigate('phases')
      });
      if (context.selectedPhaseId && context.phases) {
        const phase = context.phases.find(p => p.id === context.selectedPhaseId);
        if (phase) {
          items.push({ label: phase.name });
          if (phase.journeyId && context.journeys) {
            const journey = context.journeys.find(j => j.id === phase.journeyId);
            if (journey) {
              items.splice(items.length - 1, 0, {
                label: journey.name,
                view: 'workflow',
                onClick: () => onNavigate('workflow', { journeyId: phase.journeyId })
              });
            }
          }
        }
      }
      break;

    case 'modules':
      items.push({
        label: 'Modules',
        view: 'modules',
        onClick: () => onNavigate('modules')
      });
      if (context.selectedModuleId && context.modules) {
        const module = context.modules.find(m => m.id === context.selectedModuleId);
        if (module) {
          items.push({ label: module.name });
        }
      }
      break;

    case 'graph':
      items.push({ label: 'Graph View' });
      break;

    case 'explorer':
      items.push({ label: 'Atom Explorer' });
      if (context.selectedAtom) {
        items.push({ label: context.selectedAtom.name });
      }
      break;

    case 'ontology':
      items.push({ label: 'Ontology Browser' });
      break;

    case 'glossary':
      items.push({ label: 'Glossary' });
      break;

    case 'edges':
      items.push({ label: 'Edge Explorer' });
      break;

    case 'impact':
      items.push({ label: 'Impact Analysis' });
      break;

    case 'health':
      items.push({ label: 'Health Check' });
      break;

    case 'publisher':
      items.push({ label: 'Publisher' });
      break;

    case 'assistant':
      items.push({ label: 'AI Assistant' });
      break;

    case 'ingestion':
      items.push({ label: 'Ingestion Engine' });
      break;
  }

  return items;
}
