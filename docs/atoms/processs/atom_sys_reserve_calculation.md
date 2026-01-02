#  - System Calculates Reserves

**Type**: `` | **Domain**: `` | **Criticality**: ``





## Metadata
- **Owner**: 
- **Status**: ACTIVE
- **Version**: 1.0.0


## Relationships

| Type | Target |
|------|--------|

| `ENABLES` | [`atom-sys-aus-submission`](../atom-sys-aus-submission.md) |

| `DATA_FLOWS_TO` | [`atom-sys-aus-submission`](../atom-sys-aus-submission.md) |

| `RELATED_TO` | [`atom-cust-asset-statement-upload`](../atom-cust-asset-statement-upload.md) |

| `RELATED_TO` | [`atom-bo-gift-letter-review`](../atom-bo-gift-letter-review.md) |

| `RELATED_TO` | [`atom-bo-reserves-verification`](../atom-bo-reserves-verification.md) |



## Content

### Steps

1. Retrieve verified asset balances

1. Apply program reserve requirements

1. Calculate months of reserves

1. Compare to requirements

1. Generate reserve worksheet




### Inputs

- Required data and documents as specified in the process steps




### Outputs

- Processed data and status updates as specified in the process steps



