#  - System Pulls Full Credit Report

**Type**: `` | **Domain**: `` | **Criticality**: ``





## Metadata
- **Owner**: 
- **Status**: DEPRECATED
- **Version**: 1.0.0


## Relationships

| Type | Target |
|------|--------|

| `ENABLES` | [`atom-bo-credit-analysis`](../atom-bo-credit-analysis.md) |

| `ENABLES` | [`atom-bo-credit-score-analysis`](../atom-bo-credit-score-analysis.md) |

| `ENABLES` | [`atom-bo-payment-history-review`](../atom-bo-payment-history-review.md) |

| `ENABLES` | [`atom-bo-collection-account-review`](../atom-bo-collection-account-review.md) |

| `RELATED_TO` | [`atom-bo-derogatory-review`](../atom-bo-derogatory-review.md) |

| `RELATED_TO` | [`atom-bo-rental-history-verification`](../atom-bo-rental-history-verification.md) |

| `RELATED_TO` | [`atom-bo-credit-inquiry-review`](../atom-bo-credit-inquiry-review.md) |

| `RELATED_TO` | [`atom-bo-credit-dispute-review`](../atom-bo-credit-dispute-review.md) |



## Content

### Steps

1. System calls credit bureau API

1. Retrieve Experian, Equifax, and TransUnion reports

1. Merge reports into tri-merge

1. Calculate middle credit score

1. Store credit report in LOS




### Inputs

- Required data and documents as specified in the process steps




### Outputs

- Processed data and status updates as specified in the process steps



