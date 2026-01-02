#  - System Submits to AUS (DU/LP)

**Type**: `` | **Domain**: `` | **Criticality**: ``





## Metadata
- **Owner**: 
- **Status**: ACTIVE
- **Version**: 1.0.0


## Relationships

| Type | Target |
|------|--------|

| `ENABLES` | [`atom-bo-manual-underwrite`](../atom-bo-manual-underwrite.md) |

| `USES_COMPONENT` | [`atom-sys-los-platform`](../atom-sys-los-platform.md) |

| `ENABLES` | [`atom-bo-risk-assessment`](../atom-bo-risk-assessment.md) |

| `RELATED_TO` | [`atom-bo-underwriting-exception-request`](../atom-bo-underwriting-exception-request.md) |

| `RELATED_TO` | [`atom-bo-exception-approval`](../atom-bo-exception-approval.md) |

| `RELATED_TO` | [`atom-bo-manual-review-trigger`](../atom-bo-manual-review-trigger.md) |

| `RELATED_TO` | [`atom-bo-adverse-action-letter`](../atom-bo-adverse-action-letter.md) |



## Content

### Steps

1. Package loan data for AUS

1. Submit to Fannie Mae DU or Freddie Mac LP

1. Receive AUS findings

1. Store findings in LOS

1. Route based on findings (Approve/Eligible/Refer)




### Inputs

- Required data and documents as specified in the process steps




### Outputs

- Processed data and status updates as specified in the process steps



