#  - Customer Requests Pre-Qualification

**Type**: `` | **Domain**: `` | **Criticality**: ``





## Metadata
- **Owner**: 
- **Status**: ACTIVE
- **Version**: 1.0.0


## Relationships

| Type | Target |
|------|--------|

| `ENABLES` | [`atom-sys-credit-pull`](../atom-sys-credit-pull.md) |

| `ENABLES` | [`atom-bo-dti-calculation`](../atom-bo-dti-calculation.md) |



## Content

### Steps

1. Customer accesses pre-qualification portal via bank website or mobile app

1. Customer provides basic information including: full name, contact information, employment status, estimated annual income, estimated monthly debts, desired loan amount, and property type

1. Customer consents to soft credit inquiry (does not impact credit score)

1. System validates input data format and completeness

1. System creates pre-qualification request record in LOS

1. Customer receives confirmation email with request ID




### Inputs

- Customer name and contact information

- Estimated annual income

- Estimated monthly debt payments

- Desired loan amount

- Property type (purchase/refinance)

- Customer consent for credit inquiry




### Outputs

- Pre-qualification request record

- Request ID for tracking

- Confirmation notification to customer



