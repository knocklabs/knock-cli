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
@knocklabs/cli/0.1.14 darwin-arm64 node-v18.17.0
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
* [`knock help [COMMANDS]`](#knock-help-commands)
* [`knock layout get EMAILLAYOUTKEY`](#knock-layout-get-emaillayoutkey)
* [`knock layout list`](#knock-layout-list)
* [`knock layout pull [EMAILLAYOUTKEY]`](#knock-layout-pull-emaillayoutkey)
* [`knock layout push [EMAILLAYOUTKEY]`](#knock-layout-push-emaillayoutkey)
* [`knock layout validate [EMAILLAYOUTKEY]`](#knock-layout-validate-emaillayoutkey)
* [`knock plugins`](#knock-plugins)
* [`knock plugins:install PLUGIN...`](#knock-pluginsinstall-plugin)
* [`knock plugins:inspect PLUGIN...`](#knock-pluginsinspect-plugin)
* [`knock plugins:install PLUGIN...`](#knock-pluginsinstall-plugin-1)
* [`knock plugins:link PLUGIN`](#knock-pluginslink-plugin)
* [`knock plugins:uninstall PLUGIN...`](#knock-pluginsuninstall-plugin)
* [`knock plugins reset`](#knock-plugins-reset)
* [`knock plugins:uninstall PLUGIN...`](#knock-pluginsuninstall-plugin-1)
* [`knock plugins:uninstall PLUGIN...`](#knock-pluginsuninstall-plugin-2)
* [`knock plugins update`](#knock-plugins-update)
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

_See code: [src/commands/commit/index.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/commit/index.ts)_

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

_See code: [src/commands/commit/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/commit/get.ts)_

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

_See code: [src/commands/commit/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/commit/list.ts)_

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

_See code: [src/commands/commit/promote.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/commit/promote.ts)_

## `knock help [COMMANDS]`

Display help for knock.

```
USAGE
  $ knock help [COMMANDS...] [-n]

ARGUMENTS
  COMMANDS...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for knock.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.14/src/commands/help.ts)_

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

_See code: [src/commands/layout/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/layout/get.ts)_

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

_See code: [src/commands/layout/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/layout/list.ts)_

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

_See code: [src/commands/layout/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/layout/pull.ts)_

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

_See code: [src/commands/layout/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/layout/push.ts)_

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

_See code: [src/commands/layout/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/layout/validate.ts)_

## `knock plugins`

List installed plugins.

```
USAGE
  $ knock plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ knock plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.3/src/commands/plugins/index.ts)_

## `knock plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ knock plugins add plugins:install PLUGIN...

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ knock plugins add

EXAMPLES
  $ knock plugins add myplugin 

  $ knock plugins add https://github.com/someuser/someplugin

  $ knock plugins add someuser/someplugin
```

## `knock plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ knock plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ knock plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.3/src/commands/plugins/inspect.ts)_

## `knock plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ knock plugins install PLUGIN...

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ knock plugins add

EXAMPLES
  $ knock plugins install myplugin 

  $ knock plugins install https://github.com/someuser/someplugin

  $ knock plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.3/src/commands/plugins/install.ts)_

## `knock plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ knock plugins link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ knock plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.3/src/commands/plugins/link.ts)_

## `knock plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ knock plugins remove plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ knock plugins unlink
  $ knock plugins remove

EXAMPLES
  $ knock plugins remove myplugin
```

## `knock plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ knock plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.3/src/commands/plugins/reset.ts)_

## `knock plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ knock plugins uninstall PLUGIN...

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ knock plugins unlink
  $ knock plugins remove

EXAMPLES
  $ knock plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.3/src/commands/plugins/uninstall.ts)_

## `knock plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ knock plugins unlink plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN...  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ knock plugins unlink
  $ knock plugins remove

EXAMPLES
  $ knock plugins unlink myplugin
```

## `knock plugins update`

Update installed plugins.

```
USAGE
  $ knock plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.3.3/src/commands/plugins/update.ts)_

## `knock translation get TRANSLATIONREF`

Display a single translation from an environment.

```
USAGE
  $ knock translation get TRANSLATIONREF --service-token <value> [--json] [--environment <value>]
    [--hide-uncommitted-changes]

ARGUMENTS
  TRANSLATIONREF  Translation ref is a identifier string that refers to a unique translation.
                  If a translation has no namespace, it is the same as the locale, e.g. `en`.
                  If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

_See code: [src/commands/translation/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/translation/get.ts)_

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

_See code: [src/commands/translation/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/translation/list.ts)_

## `knock translation pull [TRANSLATIONREF]`

Pull one or more translations from an environment into a local file system.

```
USAGE
  $ knock translation pull [TRANSLATIONREF] --service-token <value> [--environment <value>] [--translations-dir
    <value> --all] [--hide-uncommitted-changes] [--force]

ARGUMENTS
  TRANSLATIONREF  Translation ref is a identifier string that refers to a unique translation.
                  If a translation has no namespace, it is the same as the locale, e.g. `en`.
                  If namespaced, it is formatted as namespace.locale, e.g. `admin.en`.

FLAGS
  --all                       Whether to pull all translations from the specified environment.
  --environment=<value>       [default: development] The environment to use.
  --force                     Remove the confirmation prompt.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     (required) The service token to authenticate with.
  --translations-dir=<value>  The target directory path to pull all translations into.
```

_See code: [src/commands/translation/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/translation/pull.ts)_

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

_See code: [src/commands/translation/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/translation/push.ts)_

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

_See code: [src/commands/translation/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/translation/validate.ts)_

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

_See code: [src/commands/whoami.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/whoami.ts)_

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

_See code: [src/commands/workflow/activate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/workflow/activate.ts)_

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

_See code: [src/commands/workflow/get.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/workflow/get.ts)_

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

_See code: [src/commands/workflow/list.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/workflow/list.ts)_

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

_See code: [src/commands/workflow/pull.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/workflow/pull.ts)_

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

_See code: [src/commands/workflow/push.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/workflow/push.ts)_

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

_See code: [src/commands/workflow/run.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/workflow/run.ts)_

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

_See code: [src/commands/workflow/validate.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.14/src/commands/workflow/validate.ts)_
<!-- commandsstop -->
