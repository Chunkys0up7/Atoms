#  - System Pulls Soft Credit

**Type**: `` | **Domain**: `` | **Criticality**: ``





## Metadata
- **Owner**: 
- **Status**: DEPRECATED
- **Version**: 1.0.0


## Relationships

| Type | Target |
|------|--------|

| `ENABLES` | [`atom-bo-dti-calculation`](../atom-bo-dti-calculation.md) |

| `USES_COMPONENT` | [`atom-sys-los-platform`](../atom-sys-los-platform.md) |

| `DATA_FLOWS_TO` | [`atom-bo-credit-analysis`](../atom-bo-credit-analysis.md) |



## Content

### Steps

1. System receives pre-qualification request with customer SSN and consent

1. System formats credit inquiry request according to bureau API specifications

1. System calls credit bureau API (typically through service provider)

1. Bureau returns credit report data including: credit score, credit history, open accounts, payment history, derogatory items

1. System parses and validates credit report response

1. System stores credit data in LOS with inquiry type marked as 'soft'

1. System flags if credit score is below minimum threshold

1. System makes credit data available for DTI calculation and pre-qualification decision




### Inputs

- Customer SSN (last 4 digits sufficient for some bureaus)

- Customer name and date of birth

- Customer address (for identity verification)

- Consent for credit inquiry




### Outputs

- Credit score (typically FICO score)

- Credit report summary

- Credit history length

- Number of open accounts

- Payment history indicators

- Derogatory items (if any)



