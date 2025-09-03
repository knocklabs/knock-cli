# @knocklabs/cli

A command-line interface for interacting with [Knock](https://knock.app).

<!-- toc -->
* [@knocklabs/cli](#knocklabscli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @knocklabs/cli
$ knock COMMAND
running command...
$ knock (--version)
@knocklabs/cli/0.1.23 darwin-arm64 node-v20.9.0
$ knock --help [COMMAND]
USAGE
  $ knock COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`knock commit`](#knock-commit)
* [`knock commit get ID`](#knock-commit-get-id)
* [`knock commit list`](#knock-commit-list)
* [`knock commit promote`](#knock-commit-promote)
* [`knock guide activate GUIDEKEY`](#knock-guide-activate-guidekey)
* [`knock guide generate-types`](#knock-guide-generate-types)
* [`knock help [COMMAND]`](#knock-help-command)
* [`knock layout get EMAILLAYOUTKEY`](#knock-layout-get-emaillayoutkey)
* [`knock layout list`](#knock-layout-list)
* [`knock layout pull [EMAILLAYOUTKEY]`](#knock-layout-pull-emaillayoutkey)
* [`knock layout push [EMAILLAYOUTKEY]`](#knock-layout-push-emaillayoutkey)
* [`knock layout validate [EMAILLAYOUTKEY]`](#knock-layout-validate-emaillayoutkey)
* [`knock partial get PARTIALKEY`](#knock-partial-get-partialkey)
* [`knock partial list`](#knock-partial-list)
* [`knock partial pull [PARTIALKEY]`](#knock-partial-pull-partialkey)
* [`knock partial push [PARTIALKEY]`](#knock-partial-push-partialkey)
* [`knock partial validate [PARTIALKEY]`](#knock-partial-validate-partialkey)
* [`knock pull`](#knock-pull)
* [`knock push`](#knock-push)
* [`knock translation get TRANSLATIONREF`](#knock-translation-get-translationref)
* [`knock translation list`](#knock-translation-list)
* [`knock translation pull [TRANSLATIONREF]`](#knock-translation-pull-translationref)
* [`knock translation push [TRANSLATIONREF]`](#knock-translation-push-translationref)
* [`knock translation validate [TRANSLATIONREF]`](#knock-translation-validate-translationref)
* [`knock whoami`](#knock-whoami)
* [`knock workflow activate WORKFLOWKEY`](#knock-workflow-activate-workflowkey)
* [`knock workflow generate-types`](#knock-workflow-generate-types)
* [`knock workflow get WORKFLOWKEY`](#knock-workflow-get-workflowkey)
* [`knock workflow list`](#knock-workflow-list)
* [`knock workflow pull [WORKFLOWKEY]`](#knock-workflow-pull-workflowkey)
* [`knock workflow push [WORKFLOWKEY]`](#knock-workflow-push-workflowkey)
* [`knock workflow run WORKFLOWKEY`](#knock-workflow-run-workflowkey)
* [`knock workflow validate [WORKFLOWKEY]`](#knock-workflow-validate-workflowkey)

## `knock commit`

Commit all changes in development environment.

```
USAGE
  $ knock commit --service-token <value> [--environment development] [-m <value>] [--force]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message.
      --environment=<option>    [default: development] Committing changes applies to the development environment only,
                                use `commit promote` to promote changes to a subsequent environment.
                                <options: development>
      --force                   Remove the confirmation prompt.
      --service-token=<value>   (required) The service token to authenticate with.
```

_See code: [src/commands/commit/index.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/commit/index.ts)_

## `knock commit get ID`

Display a single commit

```
USAGE
  $ knock commit get ID --service-token <value> [--json]

FLAGS
  --service-token=<value>  (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/commit/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/commit/get.ts)_

## `knock commit list`

Display all commits in an environment

```
USAGE
  $ knock commit list --service-token <value> [--json] [--environment <value>] [--promoted] [--resource-type
    email_layout|guide|message_type|partial|translation|workflow] [--resource-id <value>] [--after <value>] [--before
    <value>] [--limit <value>]

FLAGS
  --after=<value>           The cursor after which to fetch the next page.
  --before=<value>          The cursor before which to fetch the previous page.
  --environment=<value>     [default: development] The environment to use.
  --limit=<value>           The total number of entries to fetch per page.
  --[no-]promoted           Show only promoted or unpromoted changes between the given environment and the subsequent
                            environment.
  --resource-id=<value>     Filter commits by resource identifier. Must be used together with resource-type. For most
                            resources, this will be the resource key. In the case of translations, this will be the
                            locale code and namespace, separated by a /. For example, en/courses or en.
  --resource-type=<option>  Filter commits by resource type. Must be used together with resource-id.
                            <options: email_layout|guide|message_type|partial|translation|workflow>
  --service-token=<value>   (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/commit/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/commit/list.ts)_

## `knock commit promote`

Promote one or all commits to the subsequent environment.

```
USAGE
  $ knock commit promote --service-token <value> [--to <value>] [--force] [--only <value>]

FLAGS
  --force                  Remove the confirmation prompt.
  --only=<value>           The target commit id to promote to the subsequent environment
  --service-token=<value>  (required) The service token to authenticate with.
  --to=<value>             The destination environment to promote all changes from the preceding environment.
```

_See code: [src/commands/commit/promote.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/commit/promote.ts)_

## `knock guide activate GUIDEKEY`

Activate or deactivate a guide in a given environment.

```
USAGE
  $ knock guide activate GUIDEKEY --service-token <value> --environment <value> [--status true|false | --from
    <value> | --until <value>] [--force]

FLAGS
  --environment=<value>    (required) The environment to use.
  --force                  Remove the confirmation prompt.
  --from=<value>           Activate the guide from this ISO8601 UTC datetime (e.g., '2024-01-15T10:30:00Z').
  --service-token=<value>  (required) The service token to authenticate with.
  --status=<option>        The guide active status to set. Cannot be used with --from/--until.
                           <options: true|false>
  --until=<value>          Deactivate the guide at this ISO8601 UTC datetime (e.g., '2024-01-15T18:30:00Z').

DESCRIPTION
  Activate or deactivate a guide in a given environment.

  This enables or disables a guide in a given environment without
  needing to go through environment promotion.

  You can activate or deactivate a guide immediately or schedule it to be activated
  or deactivated at a later time using the --from and --until flags.
```

_See code: [src/commands/guide/activate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/guide/activate.ts)_

## `knock guide generate-types`

Generate types for all guides in an environment and write them to a file.

```
USAGE
  $ knock guide generate-types --service-token <value> --output-file <value> [--environment <value>]

FLAGS
  --environment=<value>    [default: development] Select the environment to generate types for.
  --output-file=<value>    (required) The output file to write the generated types to. We currently support .ts, .py,
                           .go, .rb files only. Your file extension will determine the target language for the generated
                           types.
  --service-token=<value>  (required) The service token to authenticate with.

DESCRIPTION
  Generate types for all guides in an environment and write them to a file.
```

_See code: [src/commands/guide/generate-types.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/guide/generate-types.ts)_

## `knock help [COMMAND]`

Display help for knock.

```
USAGE
  $ knock help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for knock.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.32/src/commands/help.ts)_

## `knock layout get EMAILLAYOUTKEY`

Display a single email layout from an environment.

```
USAGE
  $ knock layout get EMAILLAYOUTKEY --service-token <value> [--json] [--environment <value>]
    [--hide-uncommitted-changes]

FLAGS
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/layout/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/layout/get.ts)_

## `knock layout list`

Display all email layouts for an environment.

```
USAGE
  $ knock layout list --service-token <value> [--json] [--environment <value>] [--hide-uncommitted-changes]
    [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/layout/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/layout/list.ts)_

## `knock layout pull [EMAILLAYOUTKEY]`

Pull one or more email layouts from an environment into a local file system.

```
USAGE
  $ knock layout pull [EMAILLAYOUTKEY] --service-token <value> [--environment <value>] [--layouts-dir <value>
    --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all email layouts from the specified environment.
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --layouts-dir=<value>       The target directory path to pull all email layouts into.
  --service-token=<value>     (required) The service token to authenticate with.
```

_See code: [src/commands/layout/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/layout/pull.ts)_

## `knock layout push [EMAILLAYOUTKEY]`

Push one or more email layouts from a local file system to Knock.

```
USAGE
  $ knock layout push [EMAILLAYOUTKEY] --service-token <value> [--environment development] [--layouts-dir <value>
    --all] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all layouts from the target directory.
      --commit                  Push and commit the layout(s) at the same time
      --environment=<option>    [default: development] Pushing an email layout is only allowed in the development
                                environment
                                <options: development>
      --layouts-dir=<value>     The target directory path to find all layouts to push.
      --service-token=<value>   (required) The service token to authenticate with.
```

_See code: [src/commands/layout/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/layout/push.ts)_

## `knock layout validate [EMAILLAYOUTKEY]`

Validate one or more layouts from a local file system.

```
USAGE
  $ knock layout validate [EMAILLAYOUTKEY] --service-token <value> [--environment development] [--layouts-dir <value>
    --all]

FLAGS
  --all                    Whether to validate all layouts from the target directory.
  --environment=<option>   [default: development] Validating a layout is only done in the development environment
                           <options: development>
  --layouts-dir=<value>    The target directory path to find all layouts to validate.
  --service-token=<value>  (required) The service token to authenticate with.
```

_See code: [src/commands/layout/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/layout/validate.ts)_

## `knock partial get PARTIALKEY`

Display a single partial from an environment.

```
USAGE
  $ knock partial get PARTIALKEY --service-token <value> [--json] [--environment <value>]
    [--hide-uncommitted-changes]

FLAGS
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/partial/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/partial/get.ts)_

## `knock partial list`

Display all partials for an environment.

```
USAGE
  $ knock partial list --service-token <value> [--json] [--environment <value>] [--hide-uncommitted-changes]
    [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/partial/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/partial/list.ts)_

## `knock partial pull [PARTIALKEY]`

Pull one or more partial from an environment into a local file system.

```
USAGE
  $ knock partial pull [PARTIALKEY] --service-token <value> [--environment <value>] [--partials-dir <value> --all]
    [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all partials from the specified environment.
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --partials-dir=<value>      The target directory path to pull all partials into.
  --service-token=<value>     (required) The service token to authenticate with.
```

_See code: [src/commands/partial/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/partial/pull.ts)_

## `knock partial push [PARTIALKEY]`

Push one or more partials from a local file system to Knock.

```
USAGE
  $ knock partial push [PARTIALKEY] --service-token <value> [--environment development] [--partials-dir <value>
    --all] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all partials from the target directory.
      --commit                  Push and commit the partial(s) at the same time
      --environment=<option>    [default: development] Pushing a partial is only allowed in the development environment
                                <options: development>
      --partials-dir=<value>    The target directory path to find all partials to push.
      --service-token=<value>   (required) The service token to authenticate with.
```

_See code: [src/commands/partial/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/partial/push.ts)_

## `knock partial validate [PARTIALKEY]`

Validate one or more partials from a local file system.

```
USAGE
  $ knock partial validate [PARTIALKEY] --service-token <value> [--environment development] [--partials-dir <value>
    --all]

FLAGS
  --all                    Whether to validate all partials from the target directory.
  --environment=<option>   [default: development] Validating a partial is only done in the development environment
                           <options: development>
  --partials-dir=<value>   The target directory path to find all partials to validate.
  --service-token=<value>  (required) The service token to authenticate with.
```

_See code: [src/commands/partial/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/partial/validate.ts)_

## `knock pull`

Pull all resources from an environment into a local file system.

```
USAGE
  $ knock pull --service-token <value> --knock-dir <value> [--environment <value>]
    [--hide-uncommitted-changes] [--force]

FLAGS
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --knock-dir=<value>         (required) The target directory path to pull all resources into.
  --service-token=<value>     (required) The service token to authenticate with.
```

_See code: [src/commands/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/pull.ts)_

## `knock push`

Push all resources from a local file system to Knock.

```
USAGE
  $ knock push --service-token <value> --knock-dir <value> [--environment development] [-m <value>
    --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --commit                  Push and commit the resource(s) at the same time
      --environment=<option>    [default: development] Pushing resources is only allowed in the development environment
                                <options: development>
      --knock-dir=<value>       (required) The target directory path to find all resources to push.
      --service-token=<value>   (required) The service token to authenticate with.
```

_See code: [src/commands/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/push.ts)_

## `knock translation get TRANSLATIONREF`

Display a single translation from an environment.

```
USAGE
  $ knock translation get TRANSLATIONREF --service-token <value> [--json] [--environment <value>]
    [--hide-uncommitted-changes] [--format json|po]

ARGUMENTS
  TRANSLATIONREF  Translation ref is a identifier string that refers to a unique translation.
                  If a translation has no namespace, it is the same as the locale, e.g. `en`.
                  If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  --environment=<value>       [default: development] The environment to use.
  --format=<option>           [default: json] Specify the output format of the returned translations.
                              <options: json|po>
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/translation/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/translation/get.ts)_

## `knock translation list`

Display all translations for an environment.

```
USAGE
  $ knock translation list --service-token <value> [--json] [--environment <value>] [--hide-uncommitted-changes]
    [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/translation/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/translation/list.ts)_

## `knock translation pull [TRANSLATIONREF]`

Pull one or more translations from an environment into a local file system.

```
USAGE
  $ knock translation pull [TRANSLATIONREF] --service-token <value> [--environment <value>] [--translations-dir
    <value> --all] [--hide-uncommitted-changes] [--force] [--format json|po]

ARGUMENTS
  TRANSLATIONREF  Translation ref is a identifier string that refers to a unique translation.
                  If a translation has no namespace, it is the same as the locale, e.g. `en`.
                  If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  --all                       Whether to pull all translations from the specified environment.
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --format=<option>           [default: json] Specify the output format of the returned translations.
                              <options: json|po>
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     (required) The service token to authenticate with.
  --translations-dir=<value>  The target directory path to pull all translations into.
```

_See code: [src/commands/translation/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/translation/pull.ts)_

## `knock translation push [TRANSLATIONREF]`

Push one or more translations from a local file system to Knock.

```
USAGE
  $ knock translation push [TRANSLATIONREF] --service-token <value> [--environment development] [--translations-dir
    <value> --all] [-m <value> --commit]

ARGUMENTS
  TRANSLATIONREF  Translation ref is a identifier string that refers to a unique translation.
                  If a translation has no namespace, it is the same as the locale, e.g. `en`.
                  If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  -m, --commit-message=<value>    Use the given value as the commit message
      --all                       Whether to push all translations from the target directory.
      --commit                    Push and commit the translation(s) at the same time
      --environment=<option>      [default: development] Pushing a translation is only allowed in the development
                                  environment
                                  <options: development>
      --service-token=<value>     (required) The service token to authenticate with.
      --translations-dir=<value>  The target directory path to find all translations to push.
```

_See code: [src/commands/translation/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/translation/push.ts)_

## `knock translation validate [TRANSLATIONREF]`

Validate one or more translations from a local file system.

```
USAGE
  $ knock translation validate [TRANSLATIONREF] --service-token <value> [--environment development] [--translations-dir
    <value> --all]

ARGUMENTS
  TRANSLATIONREF  Translation ref is a identifier string that refers to a unique translation.
                  If a translation has no namespace, it is the same as the locale, e.g. `en`.
                  If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  --all                       Whether to validate all translations from the target directory.
  --environment=<option>      [default: development] Validating a translation is only done in the development
                              environment
                              <options: development>
  --service-token=<value>     (required) The service token to authenticate with.
  --translations-dir=<value>  The target directory path to find all translations to validate.
```

_See code: [src/commands/translation/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/translation/validate.ts)_

## `knock whoami`

Verify the provided service token.

```
USAGE
  $ knock whoami --service-token <value> [--json]

FLAGS
  --service-token=<value>  (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/whoami.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/whoami.ts)_

## `knock workflow activate WORKFLOWKEY`

Activate or deactivate a workflow in a given environment.

```
USAGE
  $ knock workflow activate WORKFLOWKEY --service-token <value> --environment <value> [--status true|false] [--force]

FLAGS
  --environment=<value>    (required) The environment to use.
  --force                  Remove the confirmation prompt.
  --service-token=<value>  (required) The service token to authenticate with.
  --status=<option>        [default: true] The workflow active status to set.
                           <options: true|false>

DESCRIPTION
  Activate or deactivate a workflow in a given environment.

  This immediately enables or disables a workflow in a given environment without
  needing to go through environment promotion.

  By default, this command activates a given workflow. Pass in the --status flag
  with `false` in order to deactivate it.
```

_See code: [src/commands/workflow/activate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/workflow/activate.ts)_

## `knock workflow generate-types`

Generate types for all workflows in an environment and write them to a file.

```
USAGE
  $ knock workflow generate-types --service-token <value> --output-file <value> [--environment <value>]

FLAGS
  --environment=<value>    [default: development] Select the environment to generate types for.
  --output-file=<value>    (required) The output file to write the generated types to. We currently support .ts, .rb,
                           .go, .py files only. Your file extension will determine the target language for the generated
                           types.
  --service-token=<value>  (required) The service token to authenticate with.

DESCRIPTION
  Generate types for all workflows in an environment and write them to a file.
```

_See code: [src/commands/workflow/generate-types.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/workflow/generate-types.ts)_

## `knock workflow get WORKFLOWKEY`

Display a single workflow from an environment.

```
USAGE
  $ knock workflow get WORKFLOWKEY --service-token <value> [--json] [--environment <value>]
    [--hide-uncommitted-changes]

FLAGS
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/workflow/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/workflow/get.ts)_

## `knock workflow list`

Display all workflows for an environment.

```
USAGE
  $ knock workflow list --service-token <value> [--json] [--environment <value>] [--hide-uncommitted-changes]
    [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/workflow/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/workflow/list.ts)_

## `knock workflow pull [WORKFLOWKEY]`

Pull one or more workflows from an environment into a local file system.

```
USAGE
  $ knock workflow pull [WORKFLOWKEY] --service-token <value> [--environment <value>] [--workflows-dir <value>
    --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all workflows from the specified environment.
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     (required) The service token to authenticate with.
  --workflows-dir=<value>     The target directory path to pull all workflows into.
```

_See code: [src/commands/workflow/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/workflow/pull.ts)_

## `knock workflow push [WORKFLOWKEY]`

Push one or more workflows from a local file system to Knock.

```
USAGE
  $ knock workflow push [WORKFLOWKEY] --service-token <value> [--environment development] [--workflows-dir <value>
    --all] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all workflows from the target directory.
      --commit                  Push and commit the workflow(s) at the same time
      --environment=<option>    [default: development] Pushing a workflow is only allowed in the development environment
                                <options: development>
      --service-token=<value>   (required) The service token to authenticate with.
      --workflows-dir=<value>   The target directory path to find all workflows to push.
```

_See code: [src/commands/workflow/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/workflow/push.ts)_

## `knock workflow run WORKFLOWKEY`

Test run a workflow using the latest version from Knock.

```
USAGE
  $ knock workflow run WORKFLOWKEY --service-token <value> --recipients <value> [--environment <value>] [--actor
    <value>] [--tenant <value>] [--data <value>]

FLAGS
  --actor=<value>          An actor id, or a JSON string of an actor object reference for the workflow run.
  --data=<value>           A JSON string of the data for this workflow
  --environment=<value>    [default: development] The environment in which to run the workflow
  --recipients=<value>     (required) One or more recipient user ids separated by comma, or a JSON string containing one
                           or more recipient object references for this workflow run.
  --service-token=<value>  (required) The service token to authenticate with.
  --tenant=<value>         A tenant id for the workflow run.
```

_See code: [src/commands/workflow/run.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/workflow/run.ts)_

## `knock workflow validate [WORKFLOWKEY]`

Validate one or more workflows from a local file system.

```
USAGE
  $ knock workflow validate [WORKFLOWKEY] --service-token <value> [--environment development] [--workflows-dir <value>
    --all]

FLAGS
  --all                    Whether to validate all workflows from the target directory.
  --environment=<option>   [default: development] Validating a workflow is only done in the development environment
                           <options: development>
  --service-token=<value>  (required) The service token to authenticate with.
  --workflows-dir=<value>  The target directory path to find all workflows to validate.
```

_See code: [src/commands/workflow/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.23/src/commands/workflow/validate.ts)_
<!-- commandsstop -->
