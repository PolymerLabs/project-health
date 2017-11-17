[![Build status](https://img.shields.io/travis/PolymerLabs/project-health.svg?style=flat-square)](https://travis-ci.org/PolymerLabs/project-health)
[![Coverage Status](https://coveralls.io/repos/github/PolymerLabs/project-health/badge.svg?branch=coverage)](https://coveralls.io/github/PolymerLabs/project-health?branch=coverage)

# `project-health`

## Building
Use `build` or `build:watch` to build the project.

### Re-generating github-schema.json
When GitHub's API changes, the corresponding schema needs to be updated. Run
the following command to generate the schema from GitHub's introspection API.

```bash
$(npm bin)/apollo-codegen introspect-schema https://api.github.com/graphql --output github-schema.json --header "Authorization: bearer <your token>"
```

## Running the CLI
Ensure you have your GitHub token set. Generate a new token in [GitHub's settings](https://github.com/settings/tokens).
Once you have the token, set the environment variable.

```bash
export GITHUB_TOKEN=<your token>
```

After building the project, run the CLI:
```bash
./bin/project-health --metric review-latency --org webcomponents
```

Options:
 * `metric` - required, name of metric
 * `org` - required, GitHub organization/owner name
 * `repo` - optional, name of the GitHub repo
 * `raw` - dump relevant raw data

## Adding a new metric
A few tips when creating a new metric:
 * Write your queries using [GitHub's API explorer](https://developer.github.com/v4/explorer/). The
   validation will make it much easier to write.
 * After any changes to queries using the `gql` template tag, run `npm run
   generate-gql-types`. This command will validate your query against the
   stored `github-schema.json` and then generate typings for your query and
   store them in `gql-types.ts`. This is part of `npm run build` already.

## Testing
To run the tests, use `npm test`. The tests use a mock server which emulates
the GitHub API by allowing you to record GitHub API responses. To add a new
test, write your test then run the following: ``` npm run test:record --
--match 'testname*'``` Check in the generated files so that tests will use
these snapshotted responses.
