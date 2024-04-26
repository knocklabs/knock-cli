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
@knocklabs/cli/0.1.11 darwin-arm64 node-v20.10.0
$ knock --help [COMMAND]
USAGE
  $ knock COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`knock help [COMMANDS]`](#knock-help-commands)
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
<!-- commandsstop -->
