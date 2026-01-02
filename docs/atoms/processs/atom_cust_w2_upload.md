#  - Customer Uploads W-2 Forms

**Type**: `` | **Domain**: `` | **Criticality**: ``





## Metadata
- **Owner**: 
- **Status**: DEPRECATED
- **Version**: 1.0.0


## Relationships

| Type | Target |
|------|--------|

| `ENABLES` | [`atom-bo-w2-review`](../atom-bo-w2-review.md) |

| `RELATED_TO` | [`atom-bo-voi-verification`](../atom-bo-voi-verification.md) |

| `RELATED_TO` | [`atom-cust-pay-stub-upload`](../atom-cust-pay-stub-upload.md) |

| `RELATED_TO` | [`atom-bo-pay-stub-review`](../atom-bo-pay-stub-review.md) |

| `RELATED_TO` | [`atom-bo-rental-income-verification`](../atom-bo-rental-income-verification.md) |



## Content

### Steps

1. Customer receives document request notification via email or loan portal

1. Customer logs into secure loan portal

1. Customer navigates to document upload section

1. Customer selects 'W-2 Form' from document type dropdown

1. Customer selects tax year (e.g., 2023, 2022)

1. Customer clicks 'Choose File' and selects W-2 PDF or image from their device

1. System validates file format (PDF, JPG, PNG accepted)

1. System performs basic image quality check (not blurry, readable)

1. System extracts basic data from W-2 using OCR (if available)

1. System stores document in secure document management system

1. System updates loan file status to show W-2 received

1. Customer receives confirmation that document was successfully uploaded

1. System notifies processor that new document is available for review




### Inputs

- W-2 form file (PDF, JPG, or PNG format)

- Tax year for the W-2

- Customer authentication (logged into portal)




### Outputs

- Stored W-2 document in document management system

- Document status update in LOS

- Confirmation notification to customer

- Notification to processor of new document




### Regulatory Context
W-2 forms contain sensitive tax information protected under IRS regulations and privacy laws. The bank must ensure secure storage, proper access controls, and retention policies compliant with IRS requirements. Documents must be retained for the required period (typically 7 years) and securely destroyed when no longer needed.
