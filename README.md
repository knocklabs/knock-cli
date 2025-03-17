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
@knocklabs/cli/0.1.20 darwin-arm64 node-v18.17.0
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
* [`knock help [COMMAND]`](#knock-help-command)
* [`knock layout get EMAILLAYOUTKEY`](#knock-layout-get-emaillayoutkey)
* [`knock layout list`](#knock-layout-list)
* [`knock layout pull [EMAILLAYOUTKEY]`](#knock-layout-pull-emaillayoutkey)
* [`knock layout push [EMAILLAYOUTKEY]`](#knock-layout-push-emaillayoutkey)
* [`knock layout validate [EMAILLAYOUTKEY]`](#knock-layout-validate-emaillayoutkey)
* [`knock message-type get MESSAGETYPEKEY`](#knock-message-type-get-messagetypekey)
* [`knock message-type list`](#knock-message-type-list)
* [`knock message-type pull [MESSAGETYPEKEY]`](#knock-message-type-pull-messagetypekey)
* [`knock message-type push [MESSAGETYPEKEY]`](#knock-message-type-push-messagetypekey)
* [`knock message-type validate [MESSAGETYPEKEY]`](#knock-message-type-validate-messagetypekey)
* [`knock partial get PARTIALKEY`](#knock-partial-get-partialkey)
* [`knock partial list`](#knock-partial-list)
* [`knock partial pull [PARTIALKEY]`](#knock-partial-pull-partialkey)
* [`knock partial push [PARTIALKEY]`](#knock-partial-push-partialkey)
* [`knock partial validate [PARTIALKEY]`](#knock-partial-validate-partialkey)
* [`knock translation get TRANSLATIONREF`](#knock-translation-get-translationref)
* [`knock translation list`](#knock-translation-list)
* [`knock translation pull [TRANSLATIONREF]`](#knock-translation-pull-translationref)
* [`knock translation push [TRANSLATIONREF]`](#knock-translation-push-translationref)
* [`knock translation validate [TRANSLATIONREF]`](#knock-translation-validate-translationref)
* [`knock whoami`](#knock-whoami)
* [`knock workflow activate WORKFLOWKEY`](#knock-workflow-activate-workflowkey)
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

_See code: [src/commands/commit/index.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/commit/index.ts)_

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

_See code: [src/commands/commit/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/commit/get.ts)_

## `knock commit list`

Display all commits in an environment

```
USAGE
  $ knock commit list --service-token <value> [--json] [--environment <value>] [--promoted] [--after <value>]
    [--before <value>] [--limit <value>]

FLAGS
  --after=<value>          The cursor after which to fetch the next page.
  --before=<value>         The cursor before which to fetch the previous page.
  --environment=<value>    [default: development] The environment to use.
  --limit=<value>          The total number of entries to fetch per page.
  --[no-]promoted          Show only promoted or unpromoted changes between the given environment and the subsequent
                           environment.
  --service-token=<value>  (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/commit/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/commit/list.ts)_

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

_See code: [src/commands/commit/promote.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/commit/promote.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.20/src/commands/help.ts)_

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

_See code: [src/commands/layout/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/layout/get.ts)_

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

_See code: [src/commands/layout/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/layout/list.ts)_

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

_See code: [src/commands/layout/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/layout/pull.ts)_

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

_See code: [src/commands/layout/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/layout/push.ts)_

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

_See code: [src/commands/layout/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/layout/validate.ts)_

## `knock message-type get MESSAGETYPEKEY`

Display a single in-app message type from an environment.

```
USAGE
  $ knock message-type get MESSAGETYPEKEY --service-token <value> [--json] [--environment <value>]
    [--hide-uncommitted-changes]

FLAGS
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/message-type/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/message-type/get.ts)_

## `knock message-type list`

Display all in-app message types for an environment.

```
USAGE
  $ knock message-type list --service-token <value> [--json] [--environment <value>] [--hide-uncommitted-changes]
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

_See code: [src/commands/message-type/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/message-type/list.ts)_

## `knock message-type pull [MESSAGETYPEKEY]`

Pull one or more in-app message types from an environment into a local file system.

```
USAGE
  $ knock message-type pull [MESSAGETYPEKEY] --service-token <value> [--environment <value>] [--message-types-dir
    <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                        Whether to pull all in-app message types from the specified environment.
  --environment=<value>        [default: development] The environment to use.
  --force                      Remove the confirmation prompt.
  --hide-uncommitted-changes   Hide any uncommitted changes.
  --message-types-dir=<value>  The target directory path to pull all in-app message types into.
  --service-token=<value>      (required) The service token to authenticate with.
```

_See code: [src/commands/message-type/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/message-type/pull.ts)_

## `knock message-type push [MESSAGETYPEKEY]`

Push one or more message types from a local file system to Knock.

```
USAGE
  $ knock message-type push [MESSAGETYPEKEY] --service-token <value> [--environment development] [--message-types-dir
    <value> --all] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>     Use the given value as the commit message
      --all                        Whether to push all message types from the target directory.
      --commit                     Push and commit the message type(s) at the same time
      --environment=<option>       [default: development] Pushing a message type is only allowed in the development
                                   environment
                                   <options: development>
      --message-types-dir=<value>  The target directory path to find all message types to push.
      --service-token=<value>      (required) The service token to authenticate with.
```

_See code: [src/commands/message-type/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/message-type/push.ts)_

## `knock message-type validate [MESSAGETYPEKEY]`

Validate one or more message types from a local file system.

```
USAGE
  $ knock message-type validate [MESSAGETYPEKEY] --service-token <value> [--environment development] [--message-types-dir
    <value> --all]

FLAGS
  --all                        Whether to validate all message types from the target directory.
  --environment=<option>       [default: development] Validating a message type is only done in the development
                               environment
                               <options: development>
  --message-types-dir=<value>  The target directory path to find all message types to validate.
  --service-token=<value>      (required) The service token to authenticate with.
```

_See code: [src/commands/message-type/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/message-type/validate.ts)_

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

_See code: [src/commands/partial/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/partial/get.ts)_

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

_See code: [src/commands/partial/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/partial/list.ts)_

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

_See code: [src/commands/partial/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/partial/pull.ts)_

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

_See code: [src/commands/partial/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/partial/push.ts)_

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

_See code: [src/commands/partial/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/partial/validate.ts)_

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

_See code: [src/commands/translation/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/translation/get.ts)_

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

_See code: [src/commands/translation/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/translation/list.ts)_

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

_See code: [src/commands/translation/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/translation/pull.ts)_

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

_See code: [src/commands/translation/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/translation/push.ts)_

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

_See code: [src/commands/translation/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/translation/validate.ts)_

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

_See code: [src/commands/whoami.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/whoami.ts)_

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

_See code: [src/commands/workflow/activate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/workflow/activate.ts)_

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

_See code: [src/commands/workflow/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/workflow/get.ts)_

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

_See code: [src/commands/workflow/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/workflow/list.ts)_

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

_See code: [src/commands/workflow/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/workflow/pull.ts)_

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

_See code: [src/commands/workflow/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/workflow/push.ts)_

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

_See code: [src/commands/workflow/run.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/workflow/run.ts)_

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

_See code: [src/commands/workflow/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.20/src/commands/workflow/validate.ts)_
<!-- commandsstop -->
