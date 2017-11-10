# project-health [![Build status](https://img.shields.io/travis/PolymerLabs/project-health.svg?style=flat-square)](https://travis-ci.org/PolymerLabs/project-health)

## Building
Use `build` or `build:watch` to build the project.

### Generating github-schema.json
Run the following command to generate the schema from GitHub's introspection API.
```
$(npm bin)/apollo-codegen introspect-schema https://api.github.com/graphql --output src/github-schema.json --header "Authorization: bearer <your token>"
```

## Running
Ensure you have your GitHub token set. Generate a new token in [GitHub's settings](https://github.com/settings/tokens). Once you the token, set the environment variable.
```bash
export GITHUB_TOKEN=<your token>
```
