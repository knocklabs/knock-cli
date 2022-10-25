oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![Downloads/week](https://img.shields.io/npm/dw/oclif-hello-world.svg)](https://npmjs.org/package/oclif-hello-world)
[![License](https://img.shields.io/npm/l/oclif-hello-world.svg)](https://github.com/oclif/hello-world/blob/main/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g knock-cli
$ knock COMMAND
running command...
$ knock (--version)
knock-cli/0.0.0 darwin-arm64 node-v16.4.0
$ knock --help [COMMAND]
USAGE
  $ knock COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`knock hello PERSON`](#knock-hello-person)
* [`knock hello world`](#knock-hello-world)
* [`knock help [COMMAND]`](#knock-help-command)
* [`knock plugins`](#knock-plugins)
* [`knock plugins:install PLUGIN...`](#knock-pluginsinstall-plugin)
* [`knock plugins:inspect PLUGIN...`](#knock-pluginsinspect-plugin)
* [`knock plugins:install PLUGIN...`](#knock-pluginsinstall-plugin-1)
* [`knock plugins:link PLUGIN`](#knock-pluginslink-plugin)
* [`knock plugins:uninstall PLUGIN...`](#knock-pluginsuninstall-plugin)
* [`knock plugins:uninstall PLUGIN...`](#knock-pluginsuninstall-plugin-1)
* [`knock plugins:uninstall PLUGIN...`](#knock-pluginsuninstall-plugin-2)
* [`knock plugins update`](#knock-plugins-update)

## `knock hello PERSON`

Say hello

```
USAGE
  $ knock hello [PERSON] -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [dist/commands/hello/index.ts](https://github.com/knocklabs/knock-cli/blob/v0.0.0/dist/commands/hello/index.ts)_

## `knock hello world`

Say hello world

```
USAGE
  $ knock hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ knock hello world
  hello world! (./src/commands/hello/world.ts)
```

## `knock help [COMMAND]`

Display help for knock.

```
USAGE
  $ knock help [COMMAND] [-n]

ARGUMENTS
  COMMAND  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for knock.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.1.15/src/commands/help.ts)_

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v2.1.2/src/commands/plugins/index.ts)_

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
<!-- commandsstop -->
