
import { Atom, AtomType, EdgeType, Criticality } from '../types.ts';
import { GraphSchema, SemanticQueryBuilder, GraphPlanner, AuditLog, NodeType } from '../lib/graph/index.ts';

// Mock Data Setup
const atoms: Atom[] = [
    {
        id: 'news_api',
        name: 'News API',
        type: AtomType.API,
        category: 'SYSTEM' as any,
        status: 'ACTIVE',
        version: '1.0',
        owning_team: 'DataScience',
        team: 'DataScience',
        ontologyDomain: 'News',
        criticality: 'MEDIUM',
        content: { description: 'Fetches global news headlines' },
        edges: [],
        enhancedMetadata: {
            domain: 'News',
            rateLimitPerMinute: 100,
            costPerRequest: 0.01,
            typicalLatencyMs: 200,
            allowedEnvironments: ['production', 'staging']
        }
    },
    {
        id: 'alpha_vantage',
        name: 'Alpha Vantage',
        type: AtomType.API,
        category: 'SYSTEM' as any,
        status: 'ACTIVE',
        version: '1.0',
        owning_team: 'DataScience',
        team: 'DataScience',
        ontologyDomain: 'MarketData',
        criticality: 'HIGH',
        content: { description: 'Stock market data' },
        edges: [],
        enhancedMetadata: {
            domain: 'MarketData',
            rateLimitPerMinute: 5,
            costPerRequest: 0.00,
            typicalLatencyMs: 500
        }
    },
    {
        id: 'sentiment_analyzer',
        name: 'Sentiment Analyzer',
        type: AtomType.CAPABILITY,
        category: 'SYSTEM' as any,
        status: 'ACTIVE',
        version: '1.0',
        owning_team: 'AI',
        team: 'AI',
        ontologyDomain: 'NLP',
        criticality: 'MEDIUM',
        content: { description: 'Analyzes text sentiment' },
        edges: [
            { type: EdgeType.DEPENDS_ON, targetId: 'news_api' }
        ],
        enhancedMetadata: {
            costPerRequest: 0.05,
            typicalLatencyMs: 100
        }
    }
];

async function runDemo() {
    console.log("=== 1. Starting Knowledge Graph Demo ===");

    // 1. Schema Validation
    console.log("\n--- Schema Validation ---");
    const schema = new GraphSchema();
    const errors = schema.validateNode(atoms[0]);
    console.log(`Validation errors for News API: ${errors.length} (Expected 0)`);

    // 2. Semantic Query
    console.log("\n--- Semantic Query ---");
    const query = new SemanticQueryBuilder(atoms);
    const result = query
        .where('domain', 'equals', 'News')
        .where('costPerRequest', 'lt', 0.05)
        .execute();

    console.log(`Query matched: ${result.matches.map(a => a.name).join(', ')}`);
    console.log("Reasoning Path:");
    result.reasoning.semanticPath.forEach(step => console.log(`  > ${step}`));

    // 3. Planning Loop
    console.log("\n--- Planning Loop ---");
    const planner = new GraphPlanner(atoms);
    try {
        const plan = await planner.plan("Analyze Market Sentiment", 'sentiment_analyzer', { maxCost: 1.0 });
        console.log(`Plan Generated: ${plan.steps.length} steps`);
        plan.steps.forEach(s => {
            console.log(`  [${s.id}] ${s.action} -> ${s.targetId} (Deps: ${s.dependencies.join(', ')})`);
        });
        console.log(`Estimated Cost: $${plan.estimatedCost}`);
    } catch (e) {
        console.error("Planning failed:", e);
    }

    // 4. Audit Trail
    console.log("\n--- Audit Trail ---");
    const audit = new AuditLog();
    audit.record({
        timestamp: new Date(),
        actor: 'demo_script',
        action: 'query',
        result: { status: 'success', nodeCount: result.matches.length },
        reasoningPath: result.reasoning
    });

    const report = audit.generateComplianceReport(new Date('2025-01-01'), new Date('2027-01-01'));
    console.log("Compliance Report Summary:", JSON.stringify(report, null, 2));
}

runDemo().catch(console.error);
