[![Build Status](https://travis-ci.org/PolymerLabs/project-health.svg?branch=master)](https://travis-ci.org/PolymerLabs/project-health)
[![Coverage Status](https://coveralls.io/repos/github/PolymerLabs/project-health/badge.svg?branch=master)](https://coveralls.io/github/PolymerLabs/project-health?branch=master)

# `project-health`

## Building
Use `npm run build` or `npm run dev` to build the project.

### Re-generating github-schema.json
When GitHub's API changes, the corresponding schema needs to be updated. Run
the following command to generate the schema from GitHub's introspection API.

```bash
$(npm bin)/apollo-codegen introspect-schema https://api.github.com/graphql --output src/types/github-schema.json --header "Authorization: bearer <your token>"
```

After executing this, build and run tests to ensure everything still functions
correctly.

## Testing
Run `npm run test` to execute the tests.

### Recording a test
Many aspects of the code base use the GitHub API. To avoid using the GitHub API
for testing, tests use a mock server which records and replays GitHub API
responses. When adding or modifying a test, you may need to record a test:
- Supply [a token](https://github.com/settings/tokens) sufficient for your tests.
  ```bash
  export GITHUB_TOKEN="<your personal access token>".
  ```
- Record a single test.
  ```bash
  npm run test:record -- --match 'Your exact testname'
  ```

### Rebaselining a pixel test
Whenever the UI changes, pixel tests will need to be rebaselined for what to expect. Pixel tests also use recorded data, so ensure you have recorded the test correctly first before rebaselining as follows:
```bash
npm run test:rebaseline -- --match 'Your exact pixel testname'
```
