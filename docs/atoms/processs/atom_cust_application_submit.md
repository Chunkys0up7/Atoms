#  - Customer Submits Loan Application

**Type**: `` | **Domain**: `` | **Criticality**: ``





## Metadata
- **Owner**: 
- **Status**: ACTIVE
- **Version**: 1.0.0


## Relationships

| Type | Target |
|------|--------|

| `ENABLES` | [`atom-sys-application-validation`](../atom-sys-application-validation.md) |

| `ENABLES` | [`atom-bo-completeness-review`](../atom-bo-completeness-review.md) |

| `ENABLES` | [`atom-sys-loan-estimate-generation`](../atom-sys-loan-estimate-generation.md) |

| `RELATED_TO` | [`atom-bo-fraud-review`](../atom-bo-fraud-review.md) |



## Content

### Steps

1. Customer accesses loan application portal (web or mobile)

1. Customer creates account or logs into existing account

1. Customer selects loan type (purchase, refinance, cash-out refinance)

1. Customer completes Section 1: Borrower Information (name, SSN, DOB, marital status, dependents)

1. Customer completes Section 2: Financial Information (employment, income, assets)

1. Customer completes Section 3: Property Information (address, property type, intended use)

1. Customer completes Section 4: Loan Information (loan amount, down payment, loan purpose)

1. Customer completes Section 5: Declarations (bankruptcies, foreclosures, judgments, etc.)

1. Customer reviews all information for accuracy

1. Customer provides electronic signature consenting to credit pull and authorizing information verification

1. Customer submits application

1. System validates required fields are complete

1. System creates application record in LOS

1. System generates application confirmation number

1. System triggers Loan Estimate generation (must be sent within 3 business days per TRID)

1. Customer receives confirmation email with application number and next steps




### Inputs

- Borrower personal information (name, SSN, DOB, contact info)

- Employment information (employer name, address, phone, job title, years employed)

- Income information (annual income, monthly income, overtime, bonuses)

- Asset information (bank accounts, investments, real estate)

- Liability information (credit cards, loans, alimony, child support)

- Property information (address, purchase price, property type)

- Loan information (loan amount, down payment, loan purpose)

- Customer signature and consent




### Outputs

- Completed Uniform Residential Loan Application (1003)

- Application record in LOS

- Application confirmation number

- Trigger for Loan Estimate generation

- Application submission timestamp




### Regulatory Context
The Uniform Residential Loan Application (1003) is required by Fannie Mae, Freddie Mac, and FHA/VA guidelines. Submission triggers TRID requirements including mandatory Loan Estimate delivery within 3 business days. All information must be collected in compliance with fair lending laws and cannot discriminate based on protected characteristics.
