#  - Processor Reviews W-2 Forms

**Type**: `` | **Domain**: `` | **Criticality**: ``





## Metadata
- **Owner**: 
- **Status**: ACTIVE
- **Version**: 1.0.0


## Relationships

| Type | Target |
|------|--------|

| `ENABLES` | [`atom-sys-income-calculation`](../atom-sys-income-calculation.md) |

| `PERFORMED_BY` | [`atom-role-processor`](../atom-role-processor.md) |

| `ENABLES` | [`atom-bo-income-stability-check`](../atom-bo-income-stability-check.md) |

| `RELATED_TO` | [`atom-bo-tax-return-analysis`](../atom-bo-tax-return-analysis.md) |

| `RELATED_TO` | [`atom-bo-voi-verification`](../atom-bo-voi-verification.md) |

| `RELATED_TO` | [`atom-bo-pay-stub-review`](../atom-bo-pay-stub-review.md) |



## Content

### Steps

1. Processor opens W-2 documents

1. Verify W-2 matches application income

1. Check for multiple employers

1. Verify tax year consistency

1. Flag any discrepancies




### Inputs

- Required data and documents as specified in the process steps




### Outputs

- Processed data and status updates as specified in the process steps



