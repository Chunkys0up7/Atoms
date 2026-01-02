#  - System Calculates Qualifying Income

**Type**: `` | **Domain**: `` | **Criticality**: ``





## Metadata
- **Owner**: 
- **Status**: ACTIVE
- **Version**: 1.0.0


## Relationships

| Type | Target |
|------|--------|

| `ENABLES` | [`atom-sys-aus-submission`](../atom-sys-aus-submission.md) |

| `USES_COMPONENT` | [`atom-sys-los-platform`](../atom-sys-los-platform.md) |

| `DATA_FLOWS_TO` | [`atom-sys-aus-submission`](../atom-sys-aus-submission.md) |

| `RELATED_TO` | [`atom-cust-pay-stub-upload`](../atom-cust-pay-stub-upload.md) |

| `RELATED_TO` | [`atom-bo-employment-verification`](../atom-bo-employment-verification.md) |

| `RELATED_TO` | [`atom-bo-alimony-child-support-verification`](../atom-bo-alimony-child-support-verification.md) |

| `RELATED_TO` | [`atom-bo-self-employment-verification`](../atom-bo-self-employment-verification.md) |



## Content

### Steps

1. Extract income data from documents

1. Apply income calculation rules

1. Calculate base income

1. Apply stability factors

1. Generate income worksheet




### Inputs

- Required data and documents as specified in the process steps




### Outputs

- Processed data and status updates as specified in the process steps



