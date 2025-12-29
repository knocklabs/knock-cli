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
@knocklabs/cli/1.0.0 darwin-arm64 node-v20.9.0
$ knock --help [COMMAND]
USAGE
  $ knock COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`knock branch create SLUG`](#knock-branch-create-slug)
* [`knock branch delete SLUG`](#knock-branch-delete-slug)
* [`knock branch exit`](#knock-branch-exit)
* [`knock branch list`](#knock-branch-list)
* [`knock branch merge SLUG`](#knock-branch-merge-slug)
* [`knock branch switch SLUG`](#knock-branch-switch-slug)
* [`knock channel list`](#knock-channel-list)
* [`knock commit`](#knock-commit)
* [`knock commit get ID`](#knock-commit-get-id)
* [`knock commit list`](#knock-commit-list)
* [`knock commit promote`](#knock-commit-promote)
* [`knock environment list`](#knock-environment-list)
* [`knock guide activate GUIDEKEY`](#knock-guide-activate-guidekey)
* [`knock guide generate-types`](#knock-guide-generate-types)
* [`knock guide get GUIDEKEY`](#knock-guide-get-guidekey)
* [`knock guide list`](#knock-guide-list)
* [`knock guide new`](#knock-guide-new)
* [`knock guide open GUIDEKEY`](#knock-guide-open-guidekey)
* [`knock guide pull [GUIDEKEY]`](#knock-guide-pull-guidekey)
* [`knock guide push [GUIDEKEY]`](#knock-guide-push-guidekey)
* [`knock guide validate [GUIDEKEY]`](#knock-guide-validate-guidekey)
* [`knock help [COMMAND]`](#knock-help-command)
* [`knock init`](#knock-init)
* [`knock layout get EMAILLAYOUTKEY`](#knock-layout-get-emaillayoutkey)
* [`knock layout list`](#knock-layout-list)
* [`knock layout new`](#knock-layout-new)
* [`knock layout open LAYOUTKEY`](#knock-layout-open-layoutkey)
* [`knock layout pull [EMAILLAYOUTKEY]`](#knock-layout-pull-emaillayoutkey)
* [`knock layout push [EMAILLAYOUTKEY]`](#knock-layout-push-emaillayoutkey)
* [`knock layout validate [EMAILLAYOUTKEY]`](#knock-layout-validate-emaillayoutkey)
* [`knock login`](#knock-login)
* [`knock logout`](#knock-logout)
* [`knock message-type get MESSAGETYPEKEY`](#knock-message-type-get-messagetypekey)
* [`knock message-type list`](#knock-message-type-list)
* [`knock message-type new`](#knock-message-type-new)
* [`knock message-type open MESSAGETYPEKEY`](#knock-message-type-open-messagetypekey)
* [`knock message-type pull [MESSAGETYPEKEY]`](#knock-message-type-pull-messagetypekey)
* [`knock message-type push [MESSAGETYPEKEY]`](#knock-message-type-push-messagetypekey)
* [`knock message-type validate [MESSAGETYPEKEY]`](#knock-message-type-validate-messagetypekey)
* [`knock partial get PARTIALKEY`](#knock-partial-get-partialkey)
* [`knock partial list`](#knock-partial-list)
* [`knock partial new`](#knock-partial-new)
* [`knock partial open PARTIALKEY`](#knock-partial-open-partialkey)
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
* [`knock workflow new`](#knock-workflow-new)
* [`knock workflow open WORKFLOWKEY`](#knock-workflow-open-workflowkey)
* [`knock workflow pull [WORKFLOWKEY]`](#knock-workflow-pull-workflowkey)
* [`knock workflow push [WORKFLOWKEY]`](#knock-workflow-push-workflowkey)
* [`knock workflow run WORKFLOWKEY`](#knock-workflow-run-workflowkey)
* [`knock workflow validate [WORKFLOWKEY]`](#knock-workflow-validate-workflowkey)

## `knock branch create SLUG`

Creates a new branch off of the development environment.

```
USAGE
  $ knock branch create SLUG [--json] [--service-token <value>]

ARGUMENTS
  SLUG  The slug for the new branch

FLAGS
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/branch/create.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/branch/create.ts)_

## `knock branch delete SLUG`

Deletes an existing branch with the given slug.

```
USAGE
  $ knock branch delete SLUG [--service-token <value>] [--force]

ARGUMENTS
  SLUG  The slug of the branch to delete

FLAGS
  --force                  Remove the confirmation prompt.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/branch/delete.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/branch/delete.ts)_

## `knock branch exit`

Exits the current branch.

```
USAGE
  $ knock branch exit [--service-token <value>]

FLAGS
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/branch/exit.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/branch/exit.ts)_

## `knock branch list`

Display all existing branches off of the development environment.

```
USAGE
  $ knock branch list [--json] [--service-token <value>] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>          The cursor after which to fetch the next page.
  --before=<value>         The cursor before which to fetch the previous page.
  --limit=<value>          The total number of entries to fetch per page.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/branch/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/branch/list.ts)_

## `knock branch merge SLUG`

Merges a branch into the development environment.

```
USAGE
  $ knock branch merge SLUG [--service-token <value>] [--force] [--delete]

ARGUMENTS
  SLUG  The slug of the branch to merge

FLAGS
  --[no-]delete            Delete the branch after merging.
  --force                  Remove the confirmation prompt.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/branch/merge.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/branch/merge.ts)_

## `knock branch switch SLUG`

Switches to an existing branch with the given slug.

```
USAGE
  $ knock branch switch SLUG [--service-token <value>] [--create] [--force]

ARGUMENTS
  SLUG  The slug of the branch to switch to

FLAGS
  --create                 Create the branch if it doesn't yet exist.
  --force                  Remove the confirmation prompt.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/branch/switch.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/branch/switch.ts)_

## `knock channel list`

Display all channels configured for the account.

```
USAGE
  $ knock channel list [--json] [--service-token <value>]

FLAGS
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/channel/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/channel/list.ts)_

## `knock commit`

Commit all changes in development environment.

```
USAGE
  $ knock commit [--service-token <value>] [--environment development] [--branch <value>] [-m <value>]
    [--force]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message.
      --branch=<value>          The slug of the branch to use.
      --environment=<option>    [default: development] Committing changes applies to the development environment only,
                                use `commit promote` to promote changes to a subsequent environment.
                                <options: development>
      --force                   Remove the confirmation prompt.
      --service-token=<value>   [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/commit/index.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/commit/index.ts)_

## `knock commit get ID`

Display a single commit

```
USAGE
  $ knock commit get ID [--json] [--service-token <value>]

FLAGS
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/commit/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/commit/get.ts)_

## `knock commit list`

Display all commits in an environment

```
USAGE
  $ knock commit list [--json] [--service-token <value>] [--environment <value>] [--branch <value>] [--promoted]
    [--resource-type email_layout|guide|message_type|partial|translation|workflow...] [--resource-id <value>] [--after
    <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>              The cursor after which to fetch the next page.
  --before=<value>             The cursor before which to fetch the previous page.
  --branch=<value>             The slug of the branch to use.
  --environment=<value>        [default: development] The environment to use.
  --limit=<value>              The total number of entries to fetch per page.
  --[no-]promoted              Show only promoted or unpromoted changes between the given environment and the subsequent
                               environment.
  --resource-id=<value>        Filter commits by resource identifier. Must be used together with resource-type. For most
                               resources, this will be the resource key. In the case of translations, this will be the
                               locale code and namespace, separated by a /. For example, en/courses or en.
  --resource-type=<option>...  Filter commits by resource type. Can be used alone or together with resource-id. Use
                               multiple --resource-type flags for multiple values.
                               <options: email_layout|guide|message_type|partial|translation|workflow>
  --service-token=<value>      [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/commit/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/commit/list.ts)_

## `knock commit promote`

Promote one or all commits to the subsequent environment.

```
USAGE
  $ knock commit promote [--service-token <value>] [--to <value>] [--force] [--only <value>]

FLAGS
  --force                  Remove the confirmation prompt.
  --only=<value>           The target commit id to promote to the subsequent environment
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
  --to=<value>             The destination environment to promote all changes from the preceding environment.
```

_See code: [src/commands/commit/promote.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/commit/promote.ts)_

## `knock environment list`

Display all environments configured for the account.

```
USAGE
  $ knock environment list [--json] [--service-token <value>]

FLAGS
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/environment/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/environment/list.ts)_

## `knock guide activate GUIDEKEY`

Activate or deactivate a guide in a given environment.

```
USAGE
  $ knock guide activate GUIDEKEY --environment <value> [--service-token <value>] [--branch <value>] [--status
    true|false | --from <value> | --until <value>] [--force]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    (required) The environment to use.
  --force                  Remove the confirmation prompt.
  --from=<value>           Activate the guide from this ISO8601 UTC datetime (e.g., '2024-01-15T10:30:00Z').
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
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

_See code: [src/commands/guide/activate.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/guide/activate.ts)_

## `knock guide generate-types`

Generate types for all guides in an environment and write them to a file.

```
USAGE
  $ knock guide generate-types --output-file <value> [--service-token <value>] [--environment <value>] [--branch
  <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    [default: development] Select the environment to generate types for.
  --output-file=<value>    (required) The output file to write the generated types to. We currently support .ts, .py,
                           .go, .rb files only. Your file extension will determine the target language for the generated
                           types.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

DESCRIPTION
  Generate types for all guides in an environment and write them to a file.
```

_See code: [src/commands/guide/generate-types.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/guide/generate-types.ts)_

## `knock guide get GUIDEKEY`

Display a single guide from an environment.

```
USAGE
  $ knock guide get GUIDEKEY [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/guide/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/guide/get.ts)_

## `knock guide list`

Display all guides for an environment.

```
USAGE
  $ knock guide list [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/guide/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/guide/list.ts)_

## `knock guide new`

Create a new guide with a minimal configuration.

```
USAGE
  $ knock guide new [--service-token <value>] [-n <value>] [-k <value>] [-m <value>] [--environment <value>]
    [--branch <value>] [--force] [-p] [-t <value>]

FLAGS
  -k, --key=<value>            The key of the guide
  -m, --message-type=<value>   The message type key to use for the guide. You cannot use this flag with --template.
  -n, --name=<value>           The name of the guide
  -p, --push                   Whether or not to push the guide to Knock after creation.
  -t, --template=<value>       The template to use for the guide. Should be `guides/{key}`. You cannot use this flag
                               with --message-type.
      --branch=<value>         The slug of the branch to use.
      --environment=<value>    [default: development] The environment to create the guide in. Defaults to development.
      --force                  Force the creation of the guide directory without confirmation.
      --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/guide/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/guide/new.ts)_

## `knock guide open GUIDEKEY`

Open a guide in the Knock dashboard.

```
USAGE
  $ knock guide open GUIDEKEY [--service-token <value>] [--environment <value>] [--branch <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    [default: development] The environment to use.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/guide/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/guide/open.ts)_

## `knock guide pull [GUIDEKEY]`

Pull one or more guides from an environment into a local file system.

```
USAGE
  $ knock guide pull [GUIDEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--guides-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all guides from the specified environment.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --guides-dir=<value>        The target directory path to pull all guides into.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/guide/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/guide/pull.ts)_

## `knock guide push [GUIDEKEY]`

Push one or more guides from a local file system to Knock.

```
USAGE
  $ knock guide push [GUIDEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--guides-dir <value> --all] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all guides from the target directory.
      --branch=<value>          The slug of the branch to use.
      --commit                  Push and commit the guide(s) at the same time
      --environment=<value>     [default: development] The environment to push the guide to. Defaults to development.
      --guides-dir=<value>      The target directory path to find all guides to push.
      --service-token=<value>   [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/guide/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/guide/push.ts)_

## `knock guide validate [GUIDEKEY]`

Validate one or more guides from a local file system.

```
USAGE
  $ knock guide validate [GUIDEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--guides-dir <value> --all]

FLAGS
  --all                    Whether to validate all guides from the target directory.
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    [default: development] The environment to validate the guide in. Defaults to development.
  --guides-dir=<value>     The target directory path to find all guides to validate.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/guide/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/guide/validate.ts)_

## `knock help [COMMAND]`

Display help for knock.

```
USAGE
  $ knock help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for knock.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.2.36/src/commands/help.ts)_

## `knock init`

Initialize a new Knock project with a knock.json configuration file.

```
USAGE
  $ knock init [--service-token <value>]

FLAGS
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

DESCRIPTION
  Initialize a new Knock project with a knock.json configuration file.

  Creates a knock.json configuration file in the current directory to store project-level settings like the knock
  resources directory.
```

_See code: [src/commands/init.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/init.ts)_

## `knock layout get EMAILLAYOUTKEY`

Display a single email layout from an environment.

```
USAGE
  $ knock layout get EMAILLAYOUTKEY [--json] [--service-token <value>] [--environment <value>] [--branch
    <value>] [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/layout/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/layout/get.ts)_

## `knock layout list`

Display all email layouts for an environment.

```
USAGE
  $ knock layout list [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/layout/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/layout/list.ts)_

## `knock layout new`

Create a new email layout with a minimal configuration.

```
USAGE
  $ knock layout new [--service-token <value>] [-n <value>] [-k <value>] [--environment <value>] [--branch
    <value>] [--force] [-p] [--template <value>]

FLAGS
  -k, --key=<value>            The key of the email layout
  -n, --name=<value>           The name of the email layout
  -p, --push                   Whether or not to push the email layout to Knock after creation.
      --branch=<value>         The slug of the branch to use.
      --environment=<value>    [default: development] The environment to create the email layout in. Defaults to
                               development.
      --force                  Force the creation of the email layout directory without confirmation.
      --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
      --template=<value>       The template to use for the email layout. Should be `email-layouts/{key}`.
```

_See code: [src/commands/layout/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/layout/new.ts)_

## `knock layout open LAYOUTKEY`

Open a layout in the Knock dashboard.

```
USAGE
  $ knock layout open LAYOUTKEY [--service-token <value>] [--environment <value>] [--branch <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    [default: development] The environment to use.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/layout/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/layout/open.ts)_

## `knock layout pull [EMAILLAYOUTKEY]`

Pull one or more email layouts from an environment into a local file system.

```
USAGE
  $ knock layout pull [EMAILLAYOUTKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--layouts-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all email layouts from the specified environment.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --layouts-dir=<value>       The target directory path to pull all email layouts into.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/layout/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/layout/pull.ts)_

## `knock layout push [EMAILLAYOUTKEY]`

Push one or more email layouts from a local file system to Knock.

```
USAGE
  $ knock layout push [EMAILLAYOUTKEY] [--service-token <value>] [--environment development] [--branch <value>]
    [--layouts-dir <value> --all] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all layouts from the target directory.
      --branch=<value>          The slug of the branch to use.
      --commit                  Push and commit the layout(s) at the same time
      --environment=<option>    [default: development] Pushing an email layout is only allowed in the development
                                environment
                                <options: development>
      --layouts-dir=<value>     The target directory path to find all layouts to push.
      --service-token=<value>   [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/layout/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/layout/push.ts)_

## `knock layout validate [EMAILLAYOUTKEY]`

Validate one or more layouts from a local file system.

```
USAGE
  $ knock layout validate [EMAILLAYOUTKEY] [--service-token <value>] [--environment development] [--branch <value>]
    [--layouts-dir <value> --all]

FLAGS
  --all                    Whether to validate all layouts from the target directory.
  --branch=<value>         The slug of the branch to use.
  --environment=<option>   [default: development] Validating a layout is only done in the development environment
                           <options: development>
  --layouts-dir=<value>    The target directory path to find all layouts to validate.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/layout/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/layout/validate.ts)_

## `knock login`

Log in with a Knock user account.

```
USAGE
  $ knock login [--service-token <value>]

FLAGS
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/login.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/login.ts)_

## `knock logout`

Log out of a Knock user account.

```
USAGE
  $ knock logout [--service-token <value>]

FLAGS
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/logout.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/logout.ts)_

## `knock message-type get MESSAGETYPEKEY`

Display a single in-app message type from an environment.

```
USAGE
  $ knock message-type get MESSAGETYPEKEY [--json] [--service-token <value>] [--environment <value>] [--branch
    <value>] [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/message-type/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/message-type/get.ts)_

## `knock message-type list`

Display all in-app message types for an environment.

```
USAGE
  $ knock message-type list [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/message-type/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/message-type/list.ts)_

## `knock message-type new`

Create a new message type with a minimal configuration.

```
USAGE
  $ knock message-type new [--service-token <value>] [-n <value>] [-k <value>] [--environment <value>] [--branch
    <value>] [--force] [-p] [--template <value>]

FLAGS
  -k, --key=<value>            The key of the message type
  -n, --name=<value>           The name of the message type
  -p, --push                   Whether or not to push the message type to Knock after creation.
      --branch=<value>         The slug of the branch to use.
      --environment=<value>    [default: development] The environment to create the message type in. Defaults to
                               development.
      --force                  Force the creation of the message type directory without confirmation.
      --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
      --template=<value>       The template to use for the message type. Should be `message-types/{key}`.
```

_See code: [src/commands/message-type/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/message-type/new.ts)_

## `knock message-type open MESSAGETYPEKEY`

Open a message type in the Knock dashboard.

```
USAGE
  $ knock message-type open MESSAGETYPEKEY [--service-token <value>] [--environment <value>] [--branch <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    [default: development] The environment to use.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/message-type/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/message-type/open.ts)_

## `knock message-type pull [MESSAGETYPEKEY]`

Pull one or more in-app message types from an environment into a local file system.

```
USAGE
  $ knock message-type pull [MESSAGETYPEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--message-types-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                        Whether to pull all in-app message types from the specified environment.
  --branch=<value>             The slug of the branch to use.
  --environment=<value>        [default: development] The environment to use.
  --force                      Remove the confirmation prompt.
  --hide-uncommitted-changes   Hide any uncommitted changes.
  --message-types-dir=<value>  The target directory path to pull all in-app message types into.
  --service-token=<value>      [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/message-type/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/message-type/pull.ts)_

## `knock message-type push [MESSAGETYPEKEY]`

Push one or more message types from a local file system to Knock.

```
USAGE
  $ knock message-type push [MESSAGETYPEKEY] [--service-token <value>] [--environment development] [--branch <value>]
    [--message-types-dir <value> --all] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>     Use the given value as the commit message
      --all                        Whether to push all message types from the target directory.
      --branch=<value>             The slug of the branch to use.
      --commit                     Push and commit the message type(s) at the same time
      --environment=<option>       [default: development] Pushing a message type is only allowed in the development
                                   environment
                                   <options: development>
      --message-types-dir=<value>  The target directory path to find all message types to push.
      --service-token=<value>      [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/message-type/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/message-type/push.ts)_

## `knock message-type validate [MESSAGETYPEKEY]`

Validate one or more message types from a local file system.

```
USAGE
  $ knock message-type validate [MESSAGETYPEKEY] [--service-token <value>] [--environment development] [--branch <value>]
    [--message-types-dir <value> --all]

FLAGS
  --all                        Whether to validate all message types from the target directory.
  --branch=<value>             The slug of the branch to use.
  --environment=<option>       [default: development] Validating a message type is only done in the development
                               environment
                               <options: development>
  --message-types-dir=<value>  The target directory path to find all message types to validate.
  --service-token=<value>      [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/message-type/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/message-type/validate.ts)_

## `knock partial get PARTIALKEY`

Display a single partial from an environment.

```
USAGE
  $ knock partial get PARTIALKEY [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/partial/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/partial/get.ts)_

## `knock partial list`

Display all partials for an environment.

```
USAGE
  $ knock partial list [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/partial/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/partial/list.ts)_

## `knock partial new`

Create a new partial with a minimal configuration.

```
USAGE
  $ knock partial new [--service-token <value>] [-n <value>] [-k <value>] [-t html|json|markdown|text]
    [--environment <value>] [--branch <value>] [--force] [-p] [--template <value>]

FLAGS
  -k, --key=<value>            The key of the partial
  -n, --name=<value>           The name of the partial
  -p, --push                   Whether or not to push the partial to Knock after creation.
  -t, --type=<option>          The type of the partial (html, json, markdown, text). You cannot use this flag with
                               --template.
                               <options: html|json|markdown|text>
      --branch=<value>         The slug of the branch to use.
      --environment=<value>    [default: development] The environment to create the partial in. Defaults to development.
      --force                  Force the creation of the partial directory without confirmation.
      --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
      --template=<value>       The template to use for the partial. Should be `partials/{key}`. You cannot use this flag
                               with --type.
```

_See code: [src/commands/partial/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/partial/new.ts)_

## `knock partial open PARTIALKEY`

Open a partial in the Knock dashboard.

```
USAGE
  $ knock partial open PARTIALKEY [--service-token <value>] [--environment <value>] [--branch <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    [default: development] The environment to use.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/partial/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/partial/open.ts)_

## `knock partial pull [PARTIALKEY]`

Pull one or more partial from an environment into a local file system.

```
USAGE
  $ knock partial pull [PARTIALKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--partials-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all partials from the specified environment.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --partials-dir=<value>      The target directory path to pull all partials into.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/partial/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/partial/pull.ts)_

## `knock partial push [PARTIALKEY]`

Push one or more partials from a local file system to Knock.

```
USAGE
  $ knock partial push [PARTIALKEY] [--service-token <value>] [--environment development] [--branch <value>]
    [--partials-dir <value> --all] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all partials from the target directory.
      --branch=<value>          The slug of the branch to use.
      --commit                  Push and commit the partial(s) at the same time
      --environment=<option>    [default: development] Pushing a partial is only allowed in the development environment
                                <options: development>
      --partials-dir=<value>    The target directory path to find all partials to push.
      --service-token=<value>   [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/partial/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/partial/push.ts)_

## `knock partial validate [PARTIALKEY]`

Validate one or more partials from a local file system.

```
USAGE
  $ knock partial validate [PARTIALKEY] [--service-token <value>] [--environment development] [--branch <value>]
    [--partials-dir <value> --all]

FLAGS
  --all                    Whether to validate all partials from the target directory.
  --branch=<value>         The slug of the branch to use.
  --environment=<option>   [default: development] Validating a partial is only done in the development environment
                           <options: development>
  --partials-dir=<value>   The target directory path to find all partials to validate.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/partial/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/partial/validate.ts)_

## `knock pull`

Pull all resources from an environment into a local file system.

```
USAGE
  $ knock pull [--service-token <value>] [--environment <value>] [--branch <value>] [--knock-dir <value>]
    [--hide-uncommitted-changes] [--force]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --knock-dir=<value>         The target directory path to pull all resources into.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/pull.ts)_

## `knock push`

Push all resources from a local file system to Knock.

```
USAGE
  $ knock push [--service-token <value>] [--environment development] [--branch <value>] [--knock-dir
    <value>] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --branch=<value>          The slug of the branch to use.
      --commit                  Push and commit the resource(s) at the same time
      --environment=<option>    [default: development] Pushing resources is only allowed in the development environment
                                <options: development>
      --knock-dir=<value>       The target directory path to find all resources to push.
      --service-token=<value>   [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/push.ts)_

## `knock translation get TRANSLATIONREF`

Display a single translation from an environment.

```
USAGE
  $ knock translation get TRANSLATIONREF [--json] [--service-token <value>] [--environment <value>] [--branch
    <value>] [--hide-uncommitted-changes] [--format json|po]

ARGUMENTS
  TRANSLATIONREF  Translation ref is a identifier string that refers to a unique translation.
                  If a translation has no namespace, it is the same as the locale, e.g. `en`.
                  If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --format=<option>           [default: json] Specify the output format of the returned translations.
                              <options: json|po>
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/translation/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/translation/get.ts)_

## `knock translation list`

Display all translations for an environment.

```
USAGE
  $ knock translation list [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/translation/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/translation/list.ts)_

## `knock translation pull [TRANSLATIONREF]`

Pull one or more translations from an environment into a local file system.

```
USAGE
  $ knock translation pull [TRANSLATIONREF] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--translations-dir <value> --all] [--hide-uncommitted-changes] [--force] [--format json|po]

ARGUMENTS
  [TRANSLATIONREF]  Translation ref is a identifier string that refers to a unique translation.
                    If a translation has no namespace, it is the same as the locale, e.g. `en`.
                    If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  --all                       Whether to pull all translations from the specified environment.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --format=<option>           [default: json] Specify the output format of the returned translations.
                              <options: json|po>
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
  --translations-dir=<value>  The target directory path to pull all translations into.
```

_See code: [src/commands/translation/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/translation/pull.ts)_

## `knock translation push [TRANSLATIONREF]`

Push one or more translations from a local file system to Knock.

```
USAGE
  $ knock translation push [TRANSLATIONREF] [--service-token <value>] [--environment development] [--branch <value>]
    [--translations-dir <value> --all] [-m <value> --commit]

ARGUMENTS
  [TRANSLATIONREF]  Translation ref is a identifier string that refers to a unique translation.
                    If a translation has no namespace, it is the same as the locale, e.g. `en`.
                    If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  -m, --commit-message=<value>    Use the given value as the commit message
      --all                       Whether to push all translations from the target directory.
      --branch=<value>            The slug of the branch to use.
      --commit                    Push and commit the translation(s) at the same time
      --environment=<option>      [default: development] Pushing a translation is only allowed in the development
                                  environment
                                  <options: development>
      --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
      --translations-dir=<value>  The target directory path to find all translations to push.
```

_See code: [src/commands/translation/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/translation/push.ts)_

## `knock translation validate [TRANSLATIONREF]`

Validate one or more translations from a local file system.

```
USAGE
  $ knock translation validate [TRANSLATIONREF] [--service-token <value>] [--environment development] [--branch <value>]
    [--translations-dir <value> --all]

ARGUMENTS
  [TRANSLATIONREF]  Translation ref is a identifier string that refers to a unique translation.
                    If a translation has no namespace, it is the same as the locale, e.g. `en`.
                    If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  --all                       Whether to validate all translations from the target directory.
  --branch=<value>            The slug of the branch to use.
  --environment=<option>      [default: development] Validating a translation is only done in the development
                              environment
                              <options: development>
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
  --translations-dir=<value>  The target directory path to find all translations to validate.
```

_See code: [src/commands/translation/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/translation/validate.ts)_

## `knock whoami`

Verify the provided service token.

```
USAGE
  $ knock whoami [--json] [--service-token <value>]

FLAGS
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/whoami.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/whoami.ts)_

## `knock workflow activate WORKFLOWKEY`

Activate or deactivate a workflow in a given environment.

```
USAGE
  $ knock workflow activate WORKFLOWKEY --environment <value> [--service-token <value>] [--branch <value>] [--status
    true|false] [--force]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    (required) The environment to use.
  --force                  Remove the confirmation prompt.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
  --status=<option>        [default: true] The workflow active status to set.
                           <options: true|false>

DESCRIPTION
  Activate or deactivate a workflow in a given environment.

  This immediately enables or disables a workflow in a given environment without
  needing to go through environment promotion.

  By default, this command activates a given workflow. Pass in the --status flag
  with `false` in order to deactivate it.
```

_See code: [src/commands/workflow/activate.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/workflow/activate.ts)_

## `knock workflow generate-types`

Generate types for all workflows in an environment and write them to a file.

```
USAGE
  $ knock workflow generate-types --output-file <value> [--service-token <value>] [--environment <value>] [--branch
  <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    [default: development] Select the environment to generate types for.
  --output-file=<value>    (required) The output file to write the generated types to. We currently support .ts, .rb,
                           .go, .py files only. Your file extension will determine the target language for the generated
                           types.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

DESCRIPTION
  Generate types for all workflows in an environment and write them to a file.
```

_See code: [src/commands/workflow/generate-types.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/workflow/generate-types.ts)_

## `knock workflow get WORKFLOWKEY`

Display a single workflow from an environment.

```
USAGE
  $ knock workflow get WORKFLOWKEY [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/workflow/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/workflow/get.ts)_

## `knock workflow list`

Display all workflows for an environment.

```
USAGE
  $ knock workflow list [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/workflow/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/workflow/list.ts)_

## `knock workflow new`

Create a new workflow with a minimal configuration.

```
USAGE
  $ knock workflow new [--service-token <value>] [-n <value>] [-k <value>] [-s <value>] [--environment <value>]
    [--branch <value>] [--force] [-p] [-t <value>]

FLAGS
  -k, --key=<value>            The key of the workflow
  -n, --name=<value>           The name of the workflow
  -p, --push                   Whether or not to push the workflow to Knock after creation.
  -s, --steps=<value>          Comma-separated list of step types to include in the workflow
  -t, --template=<value>       The template repository to use for the workflow. Should be `workflows/{type}`. You cannot
                               use this flag with --steps.
      --branch=<value>         The slug of the branch to use.
      --environment=<value>    [default: development] The environment to create the workflow in. Defaults to
                               development.
      --force                  Force the creation of the workflow directory without confirmation.
      --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/workflow/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/workflow/new.ts)_

## `knock workflow open WORKFLOWKEY`

Open a workflow in the Knock dashboard.

```
USAGE
  $ knock workflow open WORKFLOWKEY [--service-token <value>] [--environment <value>] [--branch <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    [default: development] The environment to use.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
```

_See code: [src/commands/workflow/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/workflow/open.ts)_

## `knock workflow pull [WORKFLOWKEY]`

Pull one or more workflows from an environment into a local file system.

```
USAGE
  $ knock workflow pull [WORKFLOWKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--workflows-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all workflows from the specified environment.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
  --workflows-dir=<value>     The target directory path to pull all workflows into.
```

_See code: [src/commands/workflow/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/workflow/pull.ts)_

## `knock workflow push [WORKFLOWKEY]`

Push one or more workflows from a local file system to Knock.

```
USAGE
  $ knock workflow push [WORKFLOWKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--workflows-dir <value> --all] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all workflows from the target directory.
      --branch=<value>          The slug of the branch to use.
      --commit                  Push and commit the workflow(s) at the same time
      --environment=<value>     [default: development] The environment to push the workflow to. Defaults to development.
      --service-token=<value>   [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
      --workflows-dir=<value>   The target directory path to find all workflows to push.
```

_See code: [src/commands/workflow/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/workflow/push.ts)_

## `knock workflow run WORKFLOWKEY`

Test run a workflow using the latest version from Knock.

```
USAGE
  $ knock workflow run WORKFLOWKEY --recipients <value> [--service-token <value>] [--environment <value>]
    [--branch <value>] [--actor <value>] [--tenant <value>] [--data <value>]

FLAGS
  --actor=<value>          An actor id, or a JSON string of an actor object reference for the workflow run.
  --branch=<value>         The slug of the branch to use.
  --data=<value>           A JSON string of the data for this workflow
  --environment=<value>    [default: development] The environment in which to run the workflow
  --recipients=<value>     (required) One or more recipient user ids separated by comma, or a JSON string containing one
                           or more recipient object references for this workflow run.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
  --tenant=<value>         A tenant id for the workflow run.
```

_See code: [src/commands/workflow/run.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/workflow/run.ts)_

## `knock workflow validate [WORKFLOWKEY]`

Validate one or more workflows from a local file system.

```
USAGE
  $ knock workflow validate [WORKFLOWKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--workflows-dir <value> --all]

FLAGS
  --all                    Whether to validate all workflows from the target directory.
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    [default: development] The environment to validate the workflow in. Defaults to development.
  --service-token=<value>  [env: KNOCK_SERVICE_TOKEN] The service token to authenticate with.
  --workflows-dir=<value>  The target directory path to find all workflows to validate.
```

_See code: [src/commands/workflow/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.0.0/src/commands/workflow/validate.ts)_
<!-- commandsstop -->
