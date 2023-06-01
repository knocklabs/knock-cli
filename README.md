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
@knocklabs/cli/0.1.1 darwin-arm64 node-v19.7.0
$ knock --help [COMMAND]
USAGE
  $ knock COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`knock commit`](#knock-commit)
* [`knock commit promote`](#knock-commit-promote)
* [`knock help [COMMANDS]`](#knock-help-commands)
* [`knock plugins`](#knock-plugins)
* [`knock plugins:install PLUGIN...`](#knock-pluginsinstall-plugin)
* [`knock plugins:inspect PLUGIN...`](#knock-pluginsinspect-plugin)
* [`knock plugins:install PLUGIN...`](#knock-pluginsinstall-plugin-1)
* [`knock plugins:link PLUGIN`](#knock-pluginslink-plugin)
* [`knock plugins:uninstall PLUGIN...`](#knock-pluginsuninstall-plugin)
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
  --environment=<option>        [default: development] Committing changes applies to the development environment only,
                                use `commit promote` to promote changes to a subsequent environment.
                                <options: development>
  --force                       Remove the confirmation prompt.
  --service-token=<value>       (required) The service token to authenticate with.
```

_See code: [dist/commands/commit/index.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.1/dist/commands/commit/index.ts)_

## `knock commit promote`

Promote all changes to the destination environment.

```
USAGE
  $ knock commit promote --service-token <value> --to <value> [--force]

FLAGS
  --force                  Remove the confirmation prompt.
  --service-token=<value>  (required) The service token to authenticate with.
  --to=<value>             (required) The destination environment to promote changes from the preceding environment.
```

## `knock help [COMMANDS]`

Display help for knock.

```
USAGE
  $ knock help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for knock.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.9/src/commands/help.ts)_

## `knock plugins`

List installed plugins.

```
USAGE
  $ knock plugins [--core]

FLAGS
  --core  Show core plugins.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ knock plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v3.0.1/src/commands/plugins/index.ts)_

## `knock plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ knock plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

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
  $ knock plugins:install myplugin 

  $ knock plugins:install https://github.com/someuser/someplugin

  $ knock plugins:install someuser/someplugin
```

## `knock plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ knock plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ knock plugins:inspect myplugin
```

## `knock plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ knock plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -v, --verbose

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
  $ knock plugins:install myplugin 

  $ knock plugins:install https://github.com/someuser/someplugin

  $ knock plugins:install someuser/someplugin
```

## `knock plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ knock plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ knock plugins:link myplugin
```

## `knock plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ knock plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ knock plugins unlink
  $ knock plugins remove
```

## `knock plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ knock plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ knock plugins unlink
  $ knock plugins remove
```

## `knock plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ knock plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ knock plugins unlink
  $ knock plugins remove
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

## `knock translation get TRANSLATIONREF`

Display a single translation from an environment.

```
USAGE
  $ knock translation get TRANSLATIONREF --service-token <value> [--environment <value>] [--hide-uncommitted-changes]
    [--json]

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

## `knock translation list`

Display all translations for an environment.

```
USAGE
  $ knock translation list --service-token <value> [--environment <value>] [--hide-uncommitted-changes] [--after
    <value>] [--before <value>] [--limit <value>] [--json]

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
  -m, --commit-message=<value>  Use the given value as the commit message
  --all                         Whether to push all translations from the target directory.
  --commit                      Push and commit the translation(s) at the same time
  --environment=<option>        [default: development] Pushing a translation is only allowed in the development
                                environment
                                <options: development>
  --service-token=<value>       (required) The service token to authenticate with.
  --translations-dir=<value>    The target directory path to find all translations to push.
```

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

_See code: [dist/commands/whoami.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.1/dist/commands/whoami.ts)_

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

## `knock workflow get WORKFLOWKEY`

Display a single workflow from an environment.

```
USAGE
  $ knock workflow get WORKFLOWKEY --service-token <value> [--environment <value>] [--hide-uncommitted-changes]
    [--json]

FLAGS
  --environment=<value>       [default: development] The environment to use.
  --hide-uncommitted-changes  Hide any uncommitted changes.
  --service-token=<value>     (required) The service token to authenticate with.

GLOBAL FLAGS
  --json  Format output as json.
```

## `knock workflow list`

Display all workflows for an environment.

```
USAGE
  $ knock workflow list --service-token <value> [--environment <value>] [--hide-uncommitted-changes] [--after
    <value>] [--before <value>] [--limit <value>] [--json]

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

## `knock workflow push [WORKFLOWKEY]`

Push one or more workflows from a local file system to Knock.

```
USAGE
  $ knock workflow push [WORKFLOWKEY] --service-token <value> [--environment development] [--workflows-dir <value>
    --all] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
  --all                         Whether to push all workflows from the target directory.
  --commit                      Push and commit the workflow(s) at the same time
  --environment=<option>        [default: development] Pushing a workflow is only allowed in the development environment
                                <options: development>
  --service-token=<value>       (required) The service token to authenticate with.
  --workflows-dir=<value>       The target directory path to find all workflows to push.
```

## `knock workflow run WORKFLOWKEY`

Test run a workflow using the latest version from Knock, or a local workflow directory.

```
USAGE
  $ knock workflow run WORKFLOWKEY --service-token <value> --recipients <value> [--environment <value>] [--actor
    <value>] [--tenant <value>] [--data <value>]

FLAGS
  --actor=<value>          An actor id for the workflow run.
  --data=<value>           A JSON string of the data for this workflow
  --environment=<value>    [default: development] The environment in which to run the workflow
  --recipients=<value>...  (required) One or more recipient ids for this workflow run, separated by comma.
  --service-token=<value>  (required) The service token to authenticate with.
  --tenant=<value>         A tenant id for the workflow run.
```

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
<!-- commandsstop -->
