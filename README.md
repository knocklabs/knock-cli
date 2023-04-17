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
@knocklabs/cli/0.1.0-rc.2 darwin-arm64 node-v16.14.0
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
* [`knock ping`](#knock-ping)
* [`knock plugins`](#knock-plugins)
* [`knock plugins:install PLUGIN...`](#knock-pluginsinstall-plugin)
* [`knock plugins:inspect PLUGIN...`](#knock-pluginsinspect-plugin)
* [`knock plugins:install PLUGIN...`](#knock-pluginsinstall-plugin-1)
* [`knock plugins:link PLUGIN`](#knock-pluginslink-plugin)
* [`knock plugins:uninstall PLUGIN...`](#knock-pluginsuninstall-plugin)
* [`knock plugins:uninstall PLUGIN...`](#knock-pluginsuninstall-plugin-1)
* [`knock plugins:uninstall PLUGIN...`](#knock-pluginsuninstall-plugin-2)
* [`knock plugins update`](#knock-plugins-update)
* [`knock workflow activate WORKFLOWKEY`](#knock-workflow-activate-workflowkey)
* [`knock workflow get WORKFLOWKEY`](#knock-workflow-get-workflowkey)
* [`knock workflow list`](#knock-workflow-list)
* [`knock workflow pull [WORKFLOWKEY]`](#knock-workflow-pull-workflowkey)
* [`knock workflow push [WORKFLOWKEY]`](#knock-workflow-push-workflowkey)
* [`knock workflow validate [WORKFLOWKEY]`](#knock-workflow-validate-workflowkey)
* [`knock translation list`](#knock-translation-list)
* [`knock translation pull`](#knock-translation-pull)
* [`knock translation push [TRANSLATION_REFERENCE]`](#knock-translation-push-translation_reference)

## `knock commit`

```
USAGE
  $ knock commit --service-token <value> [--environment development] [-m <value>] [--force]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
  --environment=<option>        [default: development] Committing changes applies to the development environment only,
                                use `commit promote` to promote changes to a later environment
                                <options: development>
  --force
  --service-token=<value>       (required) The service token to authenticate with
```

_See code: [dist/commands/commit/index.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.0-rc.2/dist/commands/commit/index.ts)_

## `knock commit promote`

```
USAGE
  $ knock commit promote --service-token <value> --to <value> [--force]

FLAGS
  --force
  --service-token=<value>  (required) The service token to authenticate with
  --to=<value>             (required) The destination environment to promote changes from the preceding environment
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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.4/src/commands/help.ts)_

## `knock ping`

Ping the Knock management API to verify access.

```
USAGE
  $ knock ping --service-token <value>

FLAGS
  --service-token=<value>  (required) The service token to authenticate with

DESCRIPTION
  Ping the Knock management API to verify access.

EXAMPLES
  $ knock ping
```

_See code: [dist/commands/ping.ts](https://github.com/knocklabs/knock-cli/blob/v0.1.0-rc.2/dist/commands/ping.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.3.0/src/commands/plugins/index.ts)_

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

## `knock workflow activate WORKFLOWKEY`

```
USAGE
  $ knock workflow activate [WORKFLOWKEY] --service-token <value> --environment <value> [--status true|false] [--force]

FLAGS
  --environment=<value>    (required)
  --force
  --service-token=<value>  (required) The service token to authenticate with
  --status=<option>        [default: true]
                           <options: true|false>
```

## `knock workflow get WORKFLOWKEY`

```
USAGE
  $ knock workflow get [WORKFLOWKEY] --service-token <value> [--environment <value>] [--hide-uncommitted-changes]
    [--json]

FLAGS
  --environment=<value>       [default: development]
  --hide-uncommitted-changes
  --service-token=<value>     (required) The service token to authenticate with

GLOBAL FLAGS
  --json  Format output as json.
```

## `knock workflow list`

```
USAGE
  $ knock workflow list --service-token <value> [--environment <value>] [--hide-uncommitted-changes] [--after
    <value>] [--before <value>] [--limit <value>] [--json]

FLAGS
  --after=<value>
  --before=<value>
  --environment=<value>       [default: development]
  --hide-uncommitted-changes
  --limit=<value>
  --service-token=<value>     (required) The service token to authenticate with

GLOBAL FLAGS
  --json  Format output as json.
```

## `knock workflow pull [WORKFLOWKEY]`

```
USAGE
  $ knock workflow pull [WORKFLOWKEY] --service-token <value> [--environment <value>] [--hide-uncommitted-changes]

FLAGS
  --environment=<value>       [default: development]
  --hide-uncommitted-changes
  --service-token=<value>     (required) The service token to authenticate with
  --all                       pull all workflows
  --workflows-dir=<value>     when pulling all workflows, the directory to house them in
```

## `knock workflow push [WORKFLOWKEY]`

```
USAGE
  $ knock workflow push [WORKFLOWKEY] --service-token <value> [--environment development] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
  --commit                      Push and commit the workflow(s) at the same time
  --environment=<option>        [default: development] Pushing a workflow is only allowed in the development environment
                                <options: development>
  --service-token=<value>       (required) The service token to authenticate with
```

## `knock workflow validate [WORKFLOWKEY]`

```
USAGE
  $ knock workflow validate [WORKFLOWKEY] --service-token <value> [--environment development]

FLAGS
  --environment=<option>   [default: development] Validating a workflow is only done in the development environment
                           <options: development>
  --service-token=<value>  (required) The service token to authenticate with
```

## `knock translation list`

```
USAGE
  $ knock translation list --service-token <value> [--environment <value>] [--hide-uncommitted-changes] [--after
    <value>] [--before <value>] [--limit <value>] [--json]

FLAGS
  --after=<value>
  --before=<value>
  --environment=<value>       [default: development]
  --hide-uncommitted-changes
  --limit=<value>
  --service-token=<value>     (required) The service token to authenticate with

GLOBAL FLAGS
  --json  Format output as json.
```

## `knock translation pull`

```
USAGE
  $ knock translation pull --service-token <value> [--environment <value>] [--hide-uncommitted-changes]

FLAGS
  --environment=<value>       [default: development]
  --hide-uncommitted-changes
  --service-token=<value>     (required) The service token to authenticate with
  --all                       pull all translations
  --translations-dir=<value>  when pulling all translations, the directory to house them in
```

## `knock translation push [TRANSLATION_REFERENCE]`
[TRANSLATION_REFERENCE] is the translation identifier. If the translation has a namespace it will be `[NAMESPACE].[LOCALECODE]`,
if it has no namespace it will just be `[LOCALECODE]`.
```
USAGE
  $ knock translation push [TRANSLATION_REFERENCE] --service-token <value> [--environment development] [-m <value> --commit]

FLAGS
  -m, --commit-message=<value>  Use the given value as the commit message
  --commit                      Push and commit the translation(s) at the same time
  --environment=<option>        [default: development] Pushing a translation is only allowed in the development environment
                                <options: development>
  --service-token=<value>       (required) The service token to authenticate with
```

<!-- commandsstop -->
