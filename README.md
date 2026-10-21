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
@knocklabs/cli/1.4.0 linux-x64 node-v22.14.0
$ knock --help [COMMAND]
USAGE
  $ knock COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`knock asset archive ASSETID`](#knock-asset-archive-assetid)
* [`knock asset upload FILE`](#knock-asset-upload-file)
* [`knock audience archive AUDIENCEKEY`](#knock-audience-archive-audiencekey)
* [`knock audience get AUDIENCEKEY`](#knock-audience-get-audiencekey)
* [`knock audience list`](#knock-audience-list)
* [`knock audience new`](#knock-audience-new)
* [`knock audience open AUDIENCEKEY`](#knock-audience-open-audiencekey)
* [`knock audience pull [AUDIENCEKEY]`](#knock-audience-pull-audiencekey)
* [`knock audience push [AUDIENCEKEY]`](#knock-audience-push-audiencekey)
* [`knock audience validate [AUDIENCEKEY]`](#knock-audience-validate-audiencekey)
* [`knock branch create [SLUG]`](#knock-branch-create-slug)
* [`knock branch delete SLUG`](#knock-branch-delete-slug)
* [`knock branch exit`](#knock-branch-exit)
* [`knock branch list`](#knock-branch-list)
* [`knock branch merge SLUG`](#knock-branch-merge-slug)
* [`knock branch rebase SLUG`](#knock-branch-rebase-slug)
* [`knock branch switch SLUG`](#knock-branch-switch-slug)
* [`knock channel list`](#knock-channel-list)
* [`knock commit`](#knock-commit)
* [`knock commit get ID`](#knock-commit-get-id)
* [`knock commit list`](#knock-commit-list)
* [`knock commit promote`](#knock-commit-promote)
* [`knock environment list`](#knock-environment-list)
* [`knock goal archive GOALKEY`](#knock-goal-archive-goalkey)
* [`knock goal clone GOALKEY NEWGOALKEY`](#knock-goal-clone-goalkey-newgoalkey)
* [`knock goal get GOALKEY`](#knock-goal-get-goalkey)
* [`knock goal list`](#knock-goal-list)
* [`knock goal new GOALKEY`](#knock-goal-new-goalkey)
* [`knock goal open GOALKEY`](#knock-goal-open-goalkey)
* [`knock goal pull [GOALKEY]`](#knock-goal-pull-goalkey)
* [`knock goal push [GOALKEY]`](#knock-goal-push-goalkey)
* [`knock goal validate [GOALKEY]`](#knock-goal-validate-goalkey)
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
* [`knock reusable-request archive REUSABLEREQUESTKEY`](#knock-reusable-request-archive-reusablerequestkey)
* [`knock reusable-request get REUSABLEREQUESTKEY`](#knock-reusable-request-get-reusablerequestkey)
* [`knock reusable-request list`](#knock-reusable-request-list)
* [`knock reusable-request new`](#knock-reusable-request-new)
* [`knock reusable-request pull [REUSABLEREQUESTKEY]`](#knock-reusable-request-pull-reusablerequestkey)
* [`knock reusable-request push [REUSABLEREQUESTKEY]`](#knock-reusable-request-push-reusablerequestkey)
* [`knock reusable-request validate [REUSABLEREQUESTKEY]`](#knock-reusable-request-validate-reusablerequestkey)
* [`knock schema pull [ITEMTYPE]`](#knock-schema-pull-itemtype)
* [`knock schema push [ITEMTYPE]`](#knock-schema-push-itemtype)
* [`knock source get SOURCEKEY`](#knock-source-get-sourcekey)
* [`knock source list`](#knock-source-list)
* [`knock translation get TRANSLATIONREF`](#knock-translation-get-translationref)
* [`knock translation list`](#knock-translation-list)
* [`knock translation pull [TRANSLATIONREF]`](#knock-translation-pull-translationref)
* [`knock translation push [TRANSLATIONREF]`](#knock-translation-push-translationref)
* [`knock translation validate [TRANSLATIONREF]`](#knock-translation-validate-translationref)
* [`knock variable delete KEY`](#knock-variable-delete-key)
* [`knock variable get KEY`](#knock-variable-get-key)
* [`knock variable list`](#knock-variable-list)
* [`knock variable new`](#knock-variable-new)
* [`knock variable pull [KEY]`](#knock-variable-pull-key)
* [`knock variable push [KEY]`](#knock-variable-push-key)
* [`knock variable set KEY`](#knock-variable-set-key)
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

## `knock asset archive ASSETID`

Archive an asset.

```
USAGE
  $ knock asset archive ASSETID [--json] [--service-token <value>] [--force]

ARGUMENTS
  ASSETID  The id of the asset to archive.

FLAGS
  --force                  Skip confirmation prompt.
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Archive an asset.


  Archives an asset for the account.

  Assets are account-wide. This command does not take an environment or branch.
```

_See code: [src/commands/asset/archive.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/asset/archive.ts)_

## `knock asset upload FILE`

Upload a file into the account as an asset.

```
USAGE
  $ knock asset upload FILE [--json] [--service-token <value>] [--filename <value>] [--mime-type
    image/jpeg|image/png|image/gif]

ARGUMENTS
  FILE  Path to the file to upload, or - to read stdin.

FLAGS
  --filename=<value>       Display name for the asset. Defaults to the file's basename. Required when reading stdin.
  --mime-type=<option>     MIME type override. One of image/jpeg, image/png, or image/gif.
                           <options: image/jpeg|image/png|image/gif>
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Upload a file into the account as an asset.


  Reads a file, uploads the bytes, and records the asset.

  Pass - to read the file from stdin. Stdin requires --filename.

  Assets are account-wide. This command does not take an environment or branch.
```

_See code: [src/commands/asset/upload.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/asset/upload.ts)_

## `knock audience archive AUDIENCEKEY`

Archive an audience (affects ALL environments).

```
USAGE
  $ knock audience archive AUDIENCEKEY --environment <value> [--service-token <value>] [--branch <value>] [--force]

ARGUMENTS
  AUDIENCEKEY  The key of the audience to archive.

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    (required) The environment to use.
  --force                  Skip confirmation prompt.
  --service-token=<value>  The service token to authenticate with.

DESCRIPTION
  Archive an audience (affects ALL environments).


  WARNING: Archiving an audience affects ALL environments and cannot be undone.
  Use this command with caution.
```

_See code: [src/commands/audience/archive.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/audience/archive.ts)_

## `knock audience get AUDIENCEKEY`

Display a single audience from an environment.

```
USAGE
  $ knock audience get AUDIENCEKEY [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/audience/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/audience/get.ts)_

## `knock audience list`

Display all audiences for an environment.

```
USAGE
  $ knock audience list [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/audience/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/audience/list.ts)_

## `knock audience new`

Create a new audience with a minimal configuration.

```
USAGE
  $ knock audience new [--service-token <value>] [-n <value>] [-k <value>] [-t static|dynamic] [-d <value>]
    [--environment <value>] [--branch <value>] [--force] [-p]

FLAGS
  -d, --description=<value>    The description of the audience
  -k, --key=<value>            The key of the audience
  -n, --name=<value>           The name of the audience
  -p, --push                   Whether or not to push the audience to Knock after creation.
  -t, --type=<option>          The type of the audience (static, dynamic).
                               <options: static|dynamic>
      --branch=<value>         The slug of the branch to use.
      --environment=<value>    The environment to use. When omitted, the account's default environment is used.
      --force                  Force the creation of the audience directory without confirmation.
      --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/audience/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/audience/new.ts)_

## `knock audience open AUDIENCEKEY`

Open an audience in the Knock dashboard.

```
USAGE
  $ knock audience open AUDIENCEKEY [--service-token <value>] [--environment <value>] [--branch <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/audience/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/audience/open.ts)_

## `knock audience pull [AUDIENCEKEY]`

Pull one or more audiences from an environment into a local file system.

```
USAGE
  $ knock audience pull [AUDIENCEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--audiences-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all audiences from the specified environment.
  --audiences-dir=<value>     The target directory path to pull all audiences into.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.
```

_See code: [src/commands/audience/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/audience/pull.ts)_

## `knock audience push [AUDIENCEKEY]`

Push one or more audiences from a local file system to Knock.

```
USAGE
  $ knock audience push [AUDIENCEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--audiences-dir <value> --all] [-m <value> --commit] [--force]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all audiences from the target directory.
      --audiences-dir=<value>   The target directory path to find all audiences to push.
      --branch=<value>          The slug of the branch to use.
      --commit                  Push and commit the audience(s) at the same time
      --environment=<value>     The environment to use. When omitted, the account's default environment is used.
      --force                   Force pushes the resource or resources to Knock, overwriting whatever is currently
                                stored. If you're using this on a non-development environment, you should also ensure
                                you `commit` the changes.
      --service-token=<value>   The service token to authenticate with.
```

_See code: [src/commands/audience/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/audience/push.ts)_

## `knock audience validate [AUDIENCEKEY]`

Validate one or more audiences from a local file system.

```
USAGE
  $ knock audience validate [AUDIENCEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--audiences-dir <value> --all]

FLAGS
  --all                    Whether to validate all audiences from the target directory.
  --audiences-dir=<value>  The target directory path to find all audiences to validate.
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/audience/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/audience/validate.ts)_

## `knock branch create [SLUG]`

Creates a new branch off of the development environment.

```
USAGE
  $ knock branch create [SLUG] [--json] [--service-token <value>]

ARGUMENTS
  SLUG  The slug for the new branch

FLAGS
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/branch/create.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/branch/create.ts)_

## `knock branch delete SLUG`

Deletes an existing branch with the given slug.

```
USAGE
  $ knock branch delete SLUG [--service-token <value>] [--force]

ARGUMENTS
  SLUG  The slug of the branch to delete

FLAGS
  --force                  Remove the confirmation prompt.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/branch/delete.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/branch/delete.ts)_

## `knock branch exit`

Exits the current branch.

```
USAGE
  $ knock branch exit [--service-token <value>]

FLAGS
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/branch/exit.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/branch/exit.ts)_

## `knock branch list`

Display all existing branches off of the development environment.

```
USAGE
  $ knock branch list [--json] [--service-token <value>] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>          The cursor after which to fetch the next page.
  --before=<value>         The cursor before which to fetch the previous page.
  --limit=<value>          The total number of entries to fetch per page.
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/branch/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/branch/list.ts)_

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
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/branch/merge.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/branch/merge.ts)_

## `knock branch rebase SLUG`

Rebases a branch onto the development environment, bringing in changes from main while preserving branch commits.

```
USAGE
  $ knock branch rebase SLUG [--json] [--service-token <value>] [--force]

ARGUMENTS
  SLUG  The slug of the branch to rebase

FLAGS
  --force                  Remove the confirmation prompt.
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/branch/rebase.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/branch/rebase.ts)_

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
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/branch/switch.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/branch/switch.ts)_

## `knock channel list`

Display all channels configured for the account.

```
USAGE
  $ knock channel list [--json] [--service-token <value>]

FLAGS
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/channel/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/channel/list.ts)_

## `knock commit`

Commit all changes in an environment, or only changes for a specific resource type.

```
USAGE
  $ knock commit [--service-token <value>] [--environment <value>] [--branch <value>] [-m <value>] [--force]
    [--allow-empty] [--resource-type
    audience|partial|email_layout|reusable_request|workflow|message_type|guide|translation] [--resource-id <value>]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message.
      --allow-empty             Create an empty commit for an already-published resource (analogous to git commit
                                --allow-empty). Requires --resource-type and --resource-id.
      --branch=<value>          The slug of the branch to use.
      --environment=<value>     The environment to use. When omitted, the account's default environment is used.
      --force                   Remove the confirmation prompt.
      --resource-id=<value>     Commit only changes for the given resource identifier. Must be used together with
                                --resource-type.
      --resource-type=<option>  Commit only changes for the given resource type. Can be used alone or together with
                                --resource-id.
                                <options:
                                audience|partial|email_layout|reusable_request|workflow|message_type|guide|translation>
      --service-token=<value>   The service token to authenticate with.
```

_See code: [src/commands/commit/index.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/commit/index.ts)_

## `knock commit get ID`

Display a single commit

```
USAGE
  $ knock commit get ID [--json] [--service-token <value>]

FLAGS
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/commit/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/commit/get.ts)_

## `knock commit list`

Display all commits in an environment

```
USAGE
  $ knock commit list [--json] [--service-token <value>] [--environment <value>] [--branch <value>] [--promoted]
    [--resource-type audience|partial|email_layout|reusable_request|workflow|message_type|guide|translation...]
    [--resource-id <value>] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>              The cursor after which to fetch the next page.
  --before=<value>             The cursor before which to fetch the previous page.
  --branch=<value>             The slug of the branch to use.
  --environment=<value>        The environment to use. When omitted, the account's default environment is used.
  --limit=<value>              The total number of entries to fetch per page.
  --[no-]promoted              Show only promoted or unpromoted changes between the given environment and the subsequent
                               environment.
  --resource-id=<value>        Filter commits by resource identifier. Must be used together with resource-type. For most
                               resources, this will be the resource key. In the case of translations, this will be the
                               locale code and namespace, separated by a /. For example, en/courses or en.
  --resource-type=<option>...  Filter commits by resource type. Can be used alone or together with resource-id. Use
                               multiple --resource-type flags for multiple values.
                               <options:
                               audience|partial|email_layout|reusable_request|workflow|message_type|guide|translation>
  --service-token=<value>      The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/commit/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/commit/list.ts)_

## `knock commit promote`

Promote one or all commits to the subsequent environment.

```
USAGE
  $ knock commit promote [--service-token <value>] [--to <value>] [--force] [--only <value>]

FLAGS
  --force                  Remove the confirmation prompt.
  --only=<value>           The target commit id to promote to the subsequent environment
  --service-token=<value>  The service token to authenticate with.
  --to=<value>             The destination environment to promote all changes from the preceding environment.
```

_See code: [src/commands/commit/promote.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/commit/promote.ts)_

## `knock environment list`

Display all environments configured for the account.

```
USAGE
  $ knock environment list [--json] [--service-token <value>]

FLAGS
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/environment/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/environment/list.ts)_

## `knock goal archive GOALKEY`

Archive a goal across all environments.

```
USAGE
  $ knock goal archive GOALKEY [--service-token <value>] [--environment <value>] [--force]

ARGUMENTS
  GOALKEY  The key of the goal to archive.

FLAGS
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --force                  Remove the confirmation prompt.
  --service-token=<value>  The service token to authenticate with.

DESCRIPTION
  Archive a goal across all environments.


  Archives a goal across all environments. The API refuses the archive if any
  workflow, guide, or broadcast is still attached to the goal.
```

_See code: [src/commands/goal/archive.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/goal/archive.ts)_

## `knock goal clone GOALKEY NEWGOALKEY`

Clone a goal to a new goal key.

```
USAGE
  $ knock goal clone GOALKEY NEWGOALKEY [--service-token <value>] [--environment <value>] [--dest-environment
    <value>] [--name <value>] [--force]

ARGUMENTS
  GOALKEY     The key of the goal to clone.
  NEWGOALKEY  The key for the new cloned goal.

FLAGS
  --dest-environment=<value>  The destination environment for the clone. Defaults to --environment.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --force                     Remove the confirmation prompt.
  --name=<value>              The name for the cloned goal. Defaults to the new goal key.
  --service-token=<value>     The service token to authenticate with.
```

_See code: [src/commands/goal/clone.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/goal/clone.ts)_

## `knock goal get GOALKEY`

Display a single goal from an environment.

```
USAGE
  $ knock goal get GOALKEY [--json] [--service-token <value>] [--environment <value>]

FLAGS
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/goal/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/goal/get.ts)_

## `knock goal list`

Display all goals for an environment.

```
USAGE
  $ knock goal list [--json] [--service-token <value>] [--environment <value>] [--after <value>] [--before
    <value>] [--limit <value>]

FLAGS
  --after=<value>          The cursor after which to fetch the next page.
  --before=<value>         The cursor before which to fetch the previous page.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --limit=<value>          The total number of entries to fetch per page.
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/goal/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/goal/list.ts)_

## `knock goal new GOALKEY`

Scaffold a new goal in the local file system.

```
USAGE
  $ knock goal new GOALKEY [--service-token <value>]

ARGUMENTS
  GOALKEY  The key for the new goal.

FLAGS
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/goal/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/goal/new.ts)_

## `knock goal open GOALKEY`

Open a goal in the Knock dashboard.

```
USAGE
  $ knock goal open GOALKEY [--service-token <value>] [--environment <value>]

FLAGS
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/goal/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/goal/open.ts)_

## `knock goal pull [GOALKEY]`

Pull one or more goals from an environment into a local file system.

```
USAGE
  $ knock goal pull [GOALKEY] [--service-token <value>] [--environment <value>] [--goals-dir <value> --all]
    [--force]

FLAGS
  --all                    Whether to pull all goals from the specified environment.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --force                  Remove the confirmation prompt.
  --goals-dir=<value>      The target directory path to pull all goals into.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/goal/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/goal/pull.ts)_

## `knock goal push [GOALKEY]`

Push one or more goals from a local file system to Knock.

```
USAGE
  $ knock goal push [GOALKEY] [--service-token <value>] [--environment <value>] [--goals-dir <value> --all]

FLAGS
  --all                    Whether to push all goals from the target directory.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --goals-dir=<value>      The target directory path to find all goals to push.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/goal/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/goal/push.ts)_

## `knock goal validate [GOALKEY]`

Validate one or more goals from a local file system.

```
USAGE
  $ knock goal validate [GOALKEY] [--service-token <value>] [--environment <value>] [--goals-dir <value> --all]

FLAGS
  --all                    Whether to validate all goals in the target directory.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --goals-dir=<value>      The target directory path to find all goals to validate.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/goal/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/goal/validate.ts)_

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
  --service-token=<value>  The service token to authenticate with.
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

_See code: [src/commands/guide/activate.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/guide/activate.ts)_

## `knock guide generate-types`

Generate types for all guides in an environment and write them to a file.

```
USAGE
  $ knock guide generate-types --output-file <value> [--service-token <value>] [--environment <value>] [--branch
  <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --output-file=<value>    (required) The output file to write the generated types to. We currently support .ts, .py,
                           .go, .rb files only. Your file extension will determine the target language for the generated
                           types.
  --service-token=<value>  The service token to authenticate with.

DESCRIPTION
  Generate types for all guides in an environment and write them to a file.
```

_See code: [src/commands/guide/generate-types.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/guide/generate-types.ts)_

## `knock guide get GUIDEKEY`

Display a single guide from an environment.

```
USAGE
  $ knock guide get GUIDEKEY [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/guide/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/guide/get.ts)_

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
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/guide/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/guide/list.ts)_

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
      --environment=<value>    The environment to use. When omitted, the account's default environment is used.
      --force                  Force the creation of the guide directory without confirmation.
      --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/guide/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/guide/new.ts)_

## `knock guide open GUIDEKEY`

Open a guide in the Knock dashboard.

```
USAGE
  $ knock guide open GUIDEKEY [--service-token <value>] [--environment <value>] [--branch <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/guide/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/guide/open.ts)_

## `knock guide pull [GUIDEKEY]`

Pull one or more guides from an environment into a local file system.

```
USAGE
  $ knock guide pull [GUIDEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--guides-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all guides from the specified environment.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --force                     Remove the confirmation prompt.
  --guides-dir=<value>        The target directory path to pull all guides into.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.
```

_See code: [src/commands/guide/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/guide/pull.ts)_

## `knock guide push [GUIDEKEY]`

Push one or more guides from a local file system to Knock.

```
USAGE
  $ knock guide push [GUIDEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--guides-dir <value> --all] [-m <value> --commit] [--allow-empty ] [--force]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all guides from the target directory.
      --allow-empty             Create an empty commit for an already-published resource (analogous to git commit
                                --allow-empty).
      --branch=<value>          The slug of the branch to use.
      --commit                  Push and commit the guide(s) at the same time
      --environment=<value>     The environment to use. When omitted, the account's default environment is used.
      --force                   Force pushes the resource or resources to Knock, overwriting whatever is currently
                                stored. If you're using this on a non-development environment, you should also ensure
                                you `commit` the changes.
      --guides-dir=<value>      The target directory path to find all guides to push.
      --service-token=<value>   The service token to authenticate with.
```

_See code: [src/commands/guide/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/guide/push.ts)_

## `knock guide validate [GUIDEKEY]`

Validate one or more guides from a local file system.

```
USAGE
  $ knock guide validate [GUIDEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--guides-dir <value> --all]

FLAGS
  --all                    Whether to validate all guides from the target directory.
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --guides-dir=<value>     The target directory path to find all guides to validate.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/guide/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/guide/validate.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/6.3.0/src/commands/help.ts)_

## `knock init`

Initialize a new Knock project with a knock.json configuration file.

```
USAGE
  $ knock init [--service-token <value>]

FLAGS
  --service-token=<value>  The service token to authenticate with.

DESCRIPTION
  Initialize a new Knock project with a knock.json configuration file.

  Creates a knock.json configuration file in the current directory to store project-level settings like the knock
  resources directory.
```

_See code: [src/commands/init.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/init.ts)_

## `knock layout get EMAILLAYOUTKEY`

Display a single email layout from an environment.

```
USAGE
  $ knock layout get EMAILLAYOUTKEY [--json] [--service-token <value>] [--environment <value>] [--branch
    <value>] [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/layout/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/layout/get.ts)_

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
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/layout/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/layout/list.ts)_

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
      --environment=<value>    The environment to use. When omitted, the account's default environment is used.
      --force                  Force the creation of the email layout directory without confirmation.
      --service-token=<value>  The service token to authenticate with.
      --template=<value>       The template to use for the email layout. Should be `email-layouts/{key}`.
```

_See code: [src/commands/layout/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/layout/new.ts)_

## `knock layout open LAYOUTKEY`

Open a layout in the Knock dashboard.

```
USAGE
  $ knock layout open LAYOUTKEY [--service-token <value>] [--environment <value>] [--branch <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/layout/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/layout/open.ts)_

## `knock layout pull [EMAILLAYOUTKEY]`

Pull one or more email layouts from an environment into a local file system.

```
USAGE
  $ knock layout pull [EMAILLAYOUTKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--layouts-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all email layouts from the specified environment.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --layouts-dir=<value>       The target directory path to pull all email layouts into.
  --service-token=<value>     The service token to authenticate with.
```

_See code: [src/commands/layout/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/layout/pull.ts)_

## `knock layout push [EMAILLAYOUTKEY]`

Push one or more email layouts from a local file system to Knock.

```
USAGE
  $ knock layout push [EMAILLAYOUTKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--layouts-dir <value> --all] [-m <value> --commit] [--allow-empty ] [--force]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all layouts from the target directory.
      --allow-empty             Create an empty commit for an already-published resource (analogous to git commit
                                --allow-empty).
      --branch=<value>          The slug of the branch to use.
      --commit                  Push and commit the layout(s) at the same time
      --environment=<value>     The environment to use. When omitted, the account's default environment is used.
      --force                   Force pushes the resource or resources to Knock, overwriting whatever is currently
                                stored. If you're using this on a non-development environment, you should also ensure
                                you `commit` the changes.
      --layouts-dir=<value>     The target directory path to find all layouts to push.
      --service-token=<value>   The service token to authenticate with.
```

_See code: [src/commands/layout/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/layout/push.ts)_

## `knock layout validate [EMAILLAYOUTKEY]`

Validate one or more layouts from a local file system.

```
USAGE
  $ knock layout validate [EMAILLAYOUTKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--layouts-dir <value> --all]

FLAGS
  --all                    Whether to validate all layouts from the target directory.
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --layouts-dir=<value>    The target directory path to find all layouts to validate.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/layout/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/layout/validate.ts)_

## `knock login`

Log in with a Knock user account.

```
USAGE
  $ knock login [--service-token <value>]

FLAGS
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/login.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/login.ts)_

## `knock logout`

Log out of a Knock user account.

```
USAGE
  $ knock logout [--service-token <value>]

FLAGS
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/logout.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/logout.ts)_

## `knock message-type get MESSAGETYPEKEY`

Display a single in-app message type.

```
USAGE
  $ knock message-type get MESSAGETYPEKEY [--json] [--service-token <value>] [--environment <value>] [--branch
    <value>] [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/message-type/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/message-type/get.ts)_

## `knock message-type list`

Display all in-app message types.

```
USAGE
  $ knock message-type list [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/message-type/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/message-type/list.ts)_

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
      --environment=<value>    The environment to use. When omitted, the account's default environment is used.
      --force                  Force the creation of the message type directory without confirmation.
      --service-token=<value>  The service token to authenticate with.
      --template=<value>       The template to use for the message type. Should be `message-types/{key}`.
```

_See code: [src/commands/message-type/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/message-type/new.ts)_

## `knock message-type open MESSAGETYPEKEY`

Open a message type in the Knock dashboard.

```
USAGE
  $ knock message-type open MESSAGETYPEKEY [--service-token <value>] [--environment <value>] [--branch <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/message-type/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/message-type/open.ts)_

## `knock message-type pull [MESSAGETYPEKEY]`

Pull one or more in-app message types into a local file system.

```
USAGE
  $ knock message-type pull [MESSAGETYPEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--message-types-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                        Whether to pull all in-app message types.
  --branch=<value>             The slug of the branch to use.
  --environment=<value>        The environment to use. When omitted, the account's default environment is used.
  --force                      Remove the confirmation prompt.
  --hide-uncommitted-changes   Hide any uncommitted changes.
  --message-types-dir=<value>  The target directory path to pull all in-app message types into.
  --service-token=<value>      The service token to authenticate with.
```

_See code: [src/commands/message-type/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/message-type/pull.ts)_

## `knock message-type push [MESSAGETYPEKEY]`

Push one or more message types from a local file system to Knock.

```
USAGE
  $ knock message-type push [MESSAGETYPEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--message-types-dir <value> --all] [-m <value> --commit] [--allow-empty ] [--force]

FLAGS
  -m, --commit-message=<value>     Use the given value as the commit message
      --all                        Whether to push all message types from the target directory.
      --allow-empty                Create an empty commit for an already-published resource (analogous to git commit
                                   --allow-empty).
      --branch=<value>             The slug of the branch to use.
      --commit                     Push and commit the message type(s) at the same time
      --environment=<value>        The environment to use. When omitted, the account's default environment is used.
      --force                      Force pushes the resource or resources to Knock, overwriting whatever is currently
                                   stored. If you're using this on a non-development environment, you should also ensure
                                   you `commit` the changes.
      --message-types-dir=<value>  The target directory path to find all message types to push.
      --service-token=<value>      The service token to authenticate with.
```

_See code: [src/commands/message-type/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/message-type/push.ts)_

## `knock message-type validate [MESSAGETYPEKEY]`

Validate one or more message types from a local file system.

```
USAGE
  $ knock message-type validate [MESSAGETYPEKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--message-types-dir <value> --all]

FLAGS
  --all                        Whether to validate all message types from the target directory.
  --branch=<value>             The slug of the branch to use.
  --environment=<value>        The environment to use. When omitted, the account's default environment is used.
  --message-types-dir=<value>  The target directory path to find all message types to validate.
  --service-token=<value>      The service token to authenticate with.
```

_See code: [src/commands/message-type/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/message-type/validate.ts)_

## `knock partial get PARTIALKEY`

Display a single partial from an environment.

```
USAGE
  $ knock partial get PARTIALKEY [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/partial/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/partial/get.ts)_

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
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/partial/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/partial/list.ts)_

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
      --environment=<value>    The environment to use. When omitted, the account's default environment is used.
      --force                  Force the creation of the partial directory without confirmation.
      --service-token=<value>  The service token to authenticate with.
      --template=<value>       The template to use for the partial. Should be `partials/{key}`. You cannot use this flag
                               with --type.
```

_See code: [src/commands/partial/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/partial/new.ts)_

## `knock partial open PARTIALKEY`

Open a partial in the Knock dashboard.

```
USAGE
  $ knock partial open PARTIALKEY [--service-token <value>] [--environment <value>] [--branch <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/partial/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/partial/open.ts)_

## `knock partial pull [PARTIALKEY]`

Pull one or more partial from an environment into a local file system.

```
USAGE
  $ knock partial pull [PARTIALKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--partials-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all partials from the specified environment.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --partials-dir=<value>      The target directory path to pull all partials into.
  --service-token=<value>     The service token to authenticate with.
```

_See code: [src/commands/partial/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/partial/pull.ts)_

## `knock partial push [PARTIALKEY]`

Push one or more partials from a local file system to Knock.

```
USAGE
  $ knock partial push [PARTIALKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--partials-dir <value> --all] [-m <value> --commit] [--allow-empty ] [--force]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all partials from the target directory.
      --allow-empty             Create an empty commit for an already-published resource (analogous to git commit
                                --allow-empty).
      --branch=<value>          The slug of the branch to use.
      --commit                  Push and commit the partial(s) at the same time
      --environment=<value>     The environment to use. When omitted, the account's default environment is used.
      --force                   Force pushes the resource or resources to Knock, overwriting whatever is currently
                                stored. If you're using this on a non-development environment, you should also ensure
                                you `commit` the changes.
      --partials-dir=<value>    The target directory path to find all partials to push.
      --service-token=<value>   The service token to authenticate with.
```

_See code: [src/commands/partial/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/partial/push.ts)_

## `knock partial validate [PARTIALKEY]`

Validate one or more partials from a local file system.

```
USAGE
  $ knock partial validate [PARTIALKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--partials-dir <value> --all]

FLAGS
  --all                    Whether to validate all partials from the target directory.
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --partials-dir=<value>   The target directory path to find all partials to validate.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/partial/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/partial/validate.ts)_

## `knock pull`

Pull all resources from an environment into a local file system.

```
USAGE
  $ knock pull [--service-token <value>] [--environment <value>] [--branch <value>] [--knock-dir <value>]
    [--hide-uncommitted-changes] [--force]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --knock-dir=<value>         The target directory path to pull all resources into.
  --service-token=<value>     The service token to authenticate with.
```

_See code: [src/commands/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/pull.ts)_

## `knock push`

Push all resources from a local file system to Knock.

```
USAGE
  $ knock push [--service-token <value>] [--environment <value>] [--branch <value>] [--knock-dir <value>]
    [-m <value> --commit] [--allow-empty ] [--force]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --allow-empty             Create an empty commit for an already-published resource (analogous to git commit
                                --allow-empty).
      --branch=<value>          The slug of the branch to use.
      --commit                  Push and commit the resource(s) at the same time
      --environment=<value>     The environment to use. When omitted, the account's default environment is used.
      --force                   Force pushes the resource or resources to Knock, overwriting whatever is currently
                                stored. If you're using this on a non-development environment, you should also ensure
                                you `commit` the changes.
      --knock-dir=<value>       The target directory path to find all resources to push.
      --service-token=<value>   The service token to authenticate with.
```

_See code: [src/commands/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/push.ts)_

## `knock reusable-request archive REUSABLEREQUESTKEY`

Archive a reusable request (affects ALL environments).

```
USAGE
  $ knock reusable-request archive REUSABLEREQUESTKEY --environment <value> [--json] [--service-token <value>] [--branch
    <value>] [--force]

ARGUMENTS
  REUSABLEREQUESTKEY  The key of the reusable request to archive.

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    (required) The environment to use.
  --force                  Skip confirmation prompt.
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Archive a reusable request (affects ALL environments).


  WARNING: Archiving a reusable request affects ALL environments and cannot be undone.
  Use this command with caution.

  If a local copy exists at <knock dir>/reusable-requests/<key>, that directory
  is removed so a later push does not create the reusable request again.
```

_See code: [src/commands/reusable-request/archive.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/reusable-request/archive.ts)_

## `knock reusable-request get REUSABLEREQUESTKEY`

Display a single reusable request from an environment.

```
USAGE
  $ knock reusable-request get REUSABLEREQUESTKEY [--json] [--service-token <value>] [--environment <value>] [--branch
    <value>] [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/reusable-request/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/reusable-request/get.ts)_

## `knock reusable-request list`

Display all reusable requests for an environment.

```
USAGE
  $ knock reusable-request list [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>             The cursor after which to fetch the next page.
  --before=<value>            The cursor before which to fetch the previous page.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/reusable-request/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/reusable-request/list.ts)_

## `knock reusable-request new`

Create a new reusable request with a minimal configuration.

```
USAGE
  $ knock reusable-request new [--service-token <value>] [-n <value>] [-k <value>] [-t http_fetch] [-d <value>] [--method
    get|post|put|delete|patch] [--url <value>] [--environment <value>] [--branch <value>] [--force] [-p]

FLAGS
  -d, --description=<value>    The description of the reusable request
  -k, --key=<value>            The key of the reusable request
  -n, --name=<value>           The name of the reusable request
  -p, --push                   Whether or not to push the reusable request to Knock after creation.
  -t, --type=<option>          [default: http_fetch] The reusable request type. Only http_fetch is supported.
                               <options: http_fetch>
      --branch=<value>         The slug of the branch to use.
      --environment=<value>    The environment to use. When omitted, the account's default environment is used.
      --force                  Force the creation of the reusable request directory without confirmation.
      --method=<option>        [default: get] The HTTP method of the request.
                               <options: get|post|put|delete|patch>
      --service-token=<value>  The service token to authenticate with.
      --url=<value>            [default: https://example.com] The URL of the request.
```

_See code: [src/commands/reusable-request/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/reusable-request/new.ts)_

## `knock reusable-request pull [REUSABLEREQUESTKEY]`

Pull one or more reusable requests from an environment into a local file system.

```
USAGE
  $ knock reusable-request pull [REUSABLEREQUESTKEY] [--json] [--service-token <value>] [--environment <value>] [--branch
    <value>] [--reusable-requests-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                            Whether to pull all reusable requests from the specified environment.
  --branch=<value>                 The slug of the branch to use.
  --environment=<value>            The environment to use. When omitted, the account's default environment is used.
  --force                          Remove the confirmation prompt.
  --hide-uncommitted-changes       Hide any uncommitted changes.
  --reusable-requests-dir=<value>  The target directory path to pull all reusable requests into.
  --service-token=<value>          The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/reusable-request/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/reusable-request/pull.ts)_

## `knock reusable-request push [REUSABLEREQUESTKEY]`

Push one or more reusable requests from a local file system to Knock.

```
USAGE
  $ knock reusable-request push [REUSABLEREQUESTKEY] [--json] [--service-token <value>] [--environment <value>] [--branch
    <value>] [--reusable-requests-dir <value> --all] [-m <value> --commit] [--allow-empty ] [--force]

FLAGS
  -m, --commit-message=<value>         Use the given value as the commit message
      --all                            Whether to push all reusable requests from the target directory.
      --allow-empty                    Create an empty commit for an already-published resource (analogous to git commit
                                       --allow-empty).
      --branch=<value>                 The slug of the branch to use.
      --commit                         Push and commit the reusable request(s) at the same time
      --environment=<value>            The environment to use. When omitted, the account's default environment is used.
      --force                          Force pushes the resource or resources to Knock, overwriting whatever is
                                       currently stored. If you're using this on a non-development environment, you
                                       should also ensure you `commit` the changes.
      --reusable-requests-dir=<value>  The target directory path to find all reusable requests to push.
      --service-token=<value>          The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/reusable-request/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/reusable-request/push.ts)_

## `knock reusable-request validate [REUSABLEREQUESTKEY]`

Validate one or more reusable requests from a local file system.

```
USAGE
  $ knock reusable-request validate [REUSABLEREQUESTKEY] [--json] [--service-token <value>] [--environment <value>] [--branch
    <value>] [--reusable-requests-dir <value> --all]

FLAGS
  --all                            Whether to validate all reusable requests from the target directory.
  --branch=<value>                 The slug of the branch to use.
  --environment=<value>            The environment to use. When omitted, the account's default environment is used.
  --reusable-requests-dir=<value>  The target directory path to find all reusable requests to validate.
  --service-token=<value>          The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/reusable-request/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/reusable-request/validate.ts)_

## `knock schema pull [ITEMTYPE]`

Pull one or more item schemas from an environment into a local file system.

```
USAGE
  $ knock schema pull [ITEMTYPE] [--service-token <value>] [--environment <value>] [--branch <value>] [--all]
    [--collection <value>] [--schemas-dir <value>] [--force]

FLAGS
  --all                    Whether to pull all item schemas from the specified environment.
  --branch=<value>         The slug of the branch to use.
  --collection=<value>     The object collection key for object schemas.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --force                  Remove the confirmation prompt.
  --schemas-dir=<value>    The target schemas directory path.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/schema/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/schema/pull.ts)_

## `knock schema push [ITEMTYPE]`

Push one or more local item schemas to a Knock environment.

```
USAGE
  $ knock schema push [ITEMTYPE] [--service-token <value>] [--environment <value>] [--branch <value>] [--all]
    [--collection <value>] [--schemas-dir <value>]

FLAGS
  --all                    Whether to push all schemas from the target schemas directory.
  --branch=<value>         The slug of the branch to use.
  --collection=<value>     The object collection key for object schemas.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --schemas-dir=<value>    The target schemas directory path.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/schema/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/schema/push.ts)_

## `knock source get SOURCEKEY`

Display a single source from an environment.

```
USAGE
  $ knock source get SOURCEKEY [--json] [--service-token <value>] [--environment <value>]

FLAGS
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/source/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/source/get.ts)_

## `knock source list`

Display all sources for an environment.

```
USAGE
  $ knock source list [--json] [--service-token <value>] [--environment <value>] [--after <value>] [--before
    <value>] [--limit <value>]

FLAGS
  --after=<value>          The cursor after which to fetch the next page.
  --before=<value>         The cursor before which to fetch the previous page.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --limit=<value>          The total number of entries to fetch per page.
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/source/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/source/list.ts)_

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
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --format=<option>           [default: json] Specify the output format of the returned translations.
                              <options: json|po>
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/translation/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/translation/get.ts)_

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
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/translation/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/translation/list.ts)_

## `knock translation pull [TRANSLATIONREF]`

Pull one or more translations from an environment into a local file system.

```
USAGE
  $ knock translation pull [TRANSLATIONREF] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--translations-dir <value> --all] [--hide-uncommitted-changes] [--force] [--format json|po]

ARGUMENTS
  TRANSLATIONREF  Translation ref is a identifier string that refers to a unique translation.
                  If a translation has no namespace, it is the same as the locale, e.g. `en`.
                  If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  --all                       Whether to pull all translations from the specified environment.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --force                     Remove the confirmation prompt.
  --format=<option>           [default: json] Specify the output format of the returned translations.
                              <options: json|po>
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.
  --translations-dir=<value>  The target directory path to pull all translations into.
```

_See code: [src/commands/translation/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/translation/pull.ts)_

## `knock translation push [TRANSLATIONREF]`

Push one or more translations from a local file system to Knock.

```
USAGE
  $ knock translation push [TRANSLATIONREF] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--translations-dir <value> --all] [-m <value> --commit] [--allow-empty ] [--force]

ARGUMENTS
  TRANSLATIONREF  Translation ref is a identifier string that refers to a unique translation.
                  If a translation has no namespace, it is the same as the locale, e.g. `en`.
                  If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  -m, --commit-message=<value>    Use the given value as the commit message
      --all                       Whether to push all translations from the target directory.
      --allow-empty               Create an empty commit for an already-published resource (analogous to git commit
                                  --allow-empty).
      --branch=<value>            The slug of the branch to use.
      --commit                    Push and commit the translation(s) at the same time
      --environment=<value>       The environment to use. When omitted, the account's default environment is used.
      --force                     Force pushes the resource or resources to Knock, overwriting whatever is currently
                                  stored. If you're using this on a non-development environment, you should also ensure
                                  you `commit` the changes.
      --service-token=<value>     The service token to authenticate with.
      --translations-dir=<value>  The target directory path to find all translations to push.
```

_See code: [src/commands/translation/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/translation/push.ts)_

## `knock translation validate [TRANSLATIONREF]`

Validate one or more translations from a local file system.

```
USAGE
  $ knock translation validate [TRANSLATIONREF] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--translations-dir <value> --all]

ARGUMENTS
  TRANSLATIONREF  Translation ref is a identifier string that refers to a unique translation.
                  If a translation has no namespace, it is the same as the locale, e.g. `en`.
                  If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  --all                       Whether to validate all translations from the target directory.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>     The service token to authenticate with.
  --translations-dir=<value>  The target directory path to find all translations to validate.
```

_See code: [src/commands/translation/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/translation/validate.ts)_

## `knock variable delete KEY`

Delete a variable, or clear one environment override.

```
USAGE
  $ knock variable delete KEY [--json] [--service-token <value>] [--environment <value>] [--branch <value>] [--force]

ARGUMENTS
  KEY  The variable key.

FLAGS
  --branch=<value>         Rejected. Variables are not branch-scoped.
  --environment=<value>    Clear only this environment's override. The variable itself is not deleted.
  --force                  Skip the confirmation prompt.
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/variable/delete.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/variable/delete.ts)_

## `knock variable get KEY`

Display a variable and its environment overrides.

```
USAGE
  $ knock variable get KEY [--json] [--service-token <value>] [--environment <value>] [--branch <value>]

ARGUMENTS
  KEY  The variable key.

FLAGS
  --branch=<value>         Rejected. Variables are not branch-scoped.
  --environment=<value>    Rejected. Get always shows the default and every environment override.
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/variable/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/variable/get.ts)_

## `knock variable list`

Display variables in the project, or the value that applies in one environment.

```
USAGE
  $ knock variable list [--json] [--service-token <value>] [--environment <value>] [--type public|secret] [--branch
    <value>] [--after <value>] [--before <value>] [--limit <value>]

FLAGS
  --after=<value>          The cursor after which to fetch the next page.
  --before=<value>         The cursor before which to fetch the previous page.
  --branch=<value>         Rejected. Variables are not branch-scoped.
  --environment=<value>    Show only the value that applies in this environment: the override when one is set, otherwise
                           the default.
  --limit=<value>          The total number of entries to fetch per page.
  --service-token=<value>  The service token to authenticate with.
  --type=<option>          Filter variables by type.
                           <options: public|secret>

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/variable/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/variable/list.ts)_

## `knock variable new`

Add a variable entry to variables.json.

```
USAGE
  $ knock variable new --key <value> --type public|secret [--service-token <value>] [--value <value>]
    [--description <value>] [--knock-dir <value>] [--force] [--push] [--branch <value>]

FLAGS
  --branch=<value>          Rejected. Variables are not branch-scoped.
  --description=<value>     Variable description.
  --force                   Skip the confirmation prompt when creating the file.
  --key=<value>             (required) Variable key.
  --knock-dir=<value>       Knock directory used to locate variables.json.
  --push                    Push the new entry after writing it.
  --service-token=<value>   The service token to authenticate with.
  --type=<option>           (required) public or secret.
                            <options: public|secret>
  --value=<value>           Default value. Public variables only.
```

_See code: [src/commands/variable/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/variable/new.ts)_

## `knock variable pull [KEY]`

Pull variables into variables.json.

```
USAGE
  $ knock variable pull [KEY] [--service-token <value>] [--environment <value>] [--branch <value>] [--knock-dir
    <value>] [--force]

ARGUMENTS
  KEY  Update only this entry. Omit to pull every variable.

FLAGS
  --branch=<value>          Rejected. Variables are not branch-scoped.
  --environment=<value>     Rejected. Pull always fetches the project catalog.
  --force                   Skip the confirmation prompt.
  --knock-dir=<value>       Knock directory used to locate variables.json.
  --service-token=<value>   The service token to authenticate with.
```

_See code: [src/commands/variable/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/variable/pull.ts)_

## `knock variable push [KEY]`

Push variables from variables.json to Knock.

```
USAGE
  $ knock variable push [KEY] [--service-token <value>] [--environment <value>] [--branch <value>] [--knock-dir
    <value>] [--force]

ARGUMENTS
  KEY  Push only this entry. Omit to push every entry.

FLAGS
  --branch=<value>          Rejected. Variables are not branch-scoped.
  --environment=<value>     Rejected. Push writes the project catalog in variables.json.
  --force                   Skip the confirmation prompt.
  --knock-dir=<value>       Knock directory used to locate variables.json.
  --service-token=<value>   The service token to authenticate with.
```

_See code: [src/commands/variable/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/variable/push.ts)_

## `knock variable set KEY`

Create or update a variable.

```
USAGE
  $ knock variable set KEY [--json] [--service-token <value>] [--type public|secret] [--value <value>]
    [--value-file <value>] [--value-stdin] [--unset-value] [--description <value>] [--unset-description]
    [--environment-value <value>...] [--environment-value-file <value>...] [--unset-environment <value>...]
    [--environment <value>] [--branch <value>]

ARGUMENTS
  KEY  The variable key.

FLAGS
  --branch=<value>                     Rejected. Variables are not branch-scoped.
  --description=<value>                Variable description.
  --environment=<value>                Rejected. Use --environment-value, --environment-value-file, or
                                       --unset-environment.
  --environment-value=<value>...       Set one environment override as <slug>=<value>. Repeatable. Public variables
                                       only.
  --environment-value-file=<value>...  Set one environment override from a file as <slug>=<path>. Repeatable.
  --service-token=<value>              The service token to authenticate with.
  --type=<option>                      public or secret. Required when creating a variable.
                                       <options: public|secret>
  --unset-description                  Clear the description.
  --unset-environment=<value>...       Clear one environment override. Repeatable.
  --unset-value                        Clear the default value.
  --value=<value>                      Default value. Public variables only.
  --value-file=<value>                 Read the default value from a file. The bytes are not trimmed.
  --value-stdin                        Read the default value from stdin until EOF. The bytes are not trimmed.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/variable/set.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/variable/set.ts)_

## `knock whoami`

Verify authentication and show the current account and user.

```
USAGE
  $ knock whoami [--json] [--service-token <value>]

FLAGS
  --service-token=<value>  The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/whoami.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/whoami.ts)_

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
  --service-token=<value>  The service token to authenticate with.
  --status=<option>        [default: true] The workflow active status to set.
                           <options: true|false>

DESCRIPTION
  Activate or deactivate a workflow in a given environment.

  This immediately enables or disables a workflow in a given environment without
  needing to go through environment promotion.

  By default, this command activates a given workflow. Pass in the --status flag
  with `false` in order to deactivate it.
```

_See code: [src/commands/workflow/activate.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/workflow/activate.ts)_

## `knock workflow generate-types`

Generate types for all workflows in an environment and write them to a file.

```
USAGE
  $ knock workflow generate-types --output-file <value> [--service-token <value>] [--environment <value>] [--branch
  <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --output-file=<value>    (required) The output file to write the generated types to. We currently support .ts, .rb,
                           .go, .py files only. Your file extension will determine the target language for the generated
                           types.
  --service-token=<value>  The service token to authenticate with.

DESCRIPTION
  Generate types for all workflows in an environment and write them to a file.
```

_See code: [src/commands/workflow/generate-types.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/workflow/generate-types.ts)_

## `knock workflow get WORKFLOWKEY`

Display a single workflow from an environment.

```
USAGE
  $ knock workflow get WORKFLOWKEY [--json] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--hide-uncommitted-changes]

FLAGS
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/workflow/get.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/workflow/get.ts)_

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
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --limit=<value>             The total number of entries to fetch per page.
  --service-token=<value>     The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/workflow/list.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/workflow/list.ts)_

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
      --environment=<value>    The environment to use. When omitted, the account's default environment is used.
      --force                  Force the creation of the workflow directory without confirmation.
      --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/workflow/new.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/workflow/new.ts)_

## `knock workflow open WORKFLOWKEY`

Open a workflow in the Knock dashboard.

```
USAGE
  $ knock workflow open WORKFLOWKEY [--service-token <value>] [--environment <value>] [--branch <value>]

FLAGS
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>  The service token to authenticate with.
```

_See code: [src/commands/workflow/open.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/workflow/open.ts)_

## `knock workflow pull [WORKFLOWKEY]`

Pull one or more workflows from an environment into a local file system.

```
USAGE
  $ knock workflow pull [WORKFLOWKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--workflows-dir <value> --all] [--hide-uncommitted-changes] [--force]

FLAGS
  --all                       Whether to pull all workflows from the specified environment.
  --branch=<value>            The slug of the branch to use.
  --environment=<value>       The environment to use. When omitted, the account's default environment is used.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     The service token to authenticate with.
  --workflows-dir=<value>     The target directory path to pull all workflows into.
```

_See code: [src/commands/workflow/pull.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/workflow/pull.ts)_

## `knock workflow push [WORKFLOWKEY]`

Push one or more workflows from a local file system to Knock.

```
USAGE
  $ knock workflow push [WORKFLOWKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--workflows-dir <value> --all] [-m <value> --commit] [--allow-empty ] [--force]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
      --all                     Whether to push all workflows from the target directory.
      --allow-empty             Create an empty commit for an already-published resource (analogous to git commit
                                --allow-empty).
      --branch=<value>          The slug of the branch to use.
      --commit                  Push and commit the workflow(s) at the same time
      --environment=<value>     The environment to use. When omitted, the account's default environment is used.
      --force                   Force pushes the resource or resources to Knock, overwriting whatever is currently
                                stored. If you're using this on a non-development environment, you should also ensure
                                you `commit` the changes.
      --service-token=<value>   The service token to authenticate with.
      --workflows-dir=<value>   The target directory path to find all workflows to push.
```

_See code: [src/commands/workflow/push.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/workflow/push.ts)_

## `knock workflow run WORKFLOWKEY`

Test run a workflow using the latest version from Knock.

```
USAGE
  $ knock workflow run WORKFLOWKEY --recipients <value> [--service-token <value>] [--environment <value>]
    [--branch <value>] [--actor <value>] [--tenant <value>] [--data <value>] [--sandbox-mode] [--skip-delay]

FLAGS
  --actor=<value>          An actor id, or a JSON string of an actor object reference for the workflow run.
  --branch=<value>         The slug of the branch to use.
  --data=<value>           A JSON string of the data for this workflow
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --recipients=<value>     (required) One or more recipient user ids separated by comma, or a JSON string containing one
                           or more recipient object references for this workflow run.
  --sandbox-mode           When enabled, channels in this workflow generate messages but don't send them to the
                           downstream provider.
  --service-token=<value>  The service token to authenticate with.
  --skip-delay             When enabled, delay steps in this workflow will be skipped
  --tenant=<value>         A tenant id for the workflow run.
```

_See code: [src/commands/workflow/run.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/workflow/run.ts)_

## `knock workflow validate [WORKFLOWKEY]`

Validate one or more workflows from a local file system.

```
USAGE
  $ knock workflow validate [WORKFLOWKEY] [--service-token <value>] [--environment <value>] [--branch <value>]
    [--workflows-dir <value> --all]

FLAGS
  --all                    Whether to validate all workflows from the target directory.
  --branch=<value>         The slug of the branch to use.
  --environment=<value>    The environment to use. When omitted, the account's default environment is used.
  --service-token=<value>  The service token to authenticate with.
  --workflows-dir=<value>  The target directory path to find all workflows to validate.
```

_See code: [src/commands/workflow/validate.ts](https://github.com/knocklabs/knock-cli/blob/v1.4.0/src/commands/workflow/validate.ts)_
<!-- commandsstop -->
