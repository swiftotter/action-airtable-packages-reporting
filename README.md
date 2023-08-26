# Package Reporting to Airtable

Get consistent information about the package versions installed on each environment.

## Installation

Add to your Github Actions workflow, preferably after successful deployment:
```yaml
  package-reporting:
    runs-on: self-hosted
    needs: build-deployment # Deployment Action
    steps:
      - uses: actions/checkout@v3
      - uses: swiftotter/action-airtable-packages-reporting@main
        with:
          project: acme-project
          environment: dev
        env:
          AIRTABLE_TOKEN: '${{ secrets.AIRTABLE_TOKEN }}'
          AIRTABLE_PACKAGES_BASE: '${{ vars.AIRTABLE_PACKAGES_BASE }}'
          AIRTABLE_PACKAGES_TABLE: '${{ vars.AIRTABLE_PACKAGES_TABLE }}'
```
