<!-- @format -->

# react-keybind ⌨️

![npm](https://img.shields.io/npm/v/react-keybind.svg)

A lightweight library to manage global keyboard shortcuts for your [React](https://reactjs.org)
application. Just how lightweight is it?

![minified size](https://badgen.net/bundlephobia/min/react-keybind)
![minzipped size](https://badgen.net/bundlephobia/minzip/react-keybind)

### Who should use this library?

- Your application contains many components that require keyboard shortcuts
- Your application frequently changes keyboard shortcuts depending on the screen
- Your application needs a list of all active shortcuts on the screen
- Your application needs a simple way to manage keyboard shortcuts

### Why another keyboard shortcut library?

We wrote `react-keybind` with a few main goals:

- **No External Dependencies** - We wanted full control over the experience and size of the library
- **No RFC/Experimental Features** - We wanted to build on top of a stable API
- **TypeScript Support** - We wanted to support [TypeScript](https://www.typescriptlang.org/)

## Features

- Register shortcuts for single keypresses
- Register shortcuts for combination keypresses (e.g. ctrl+c, ctrl+alt+a)
- Register shortcuts for keypresses held after a duration
- Register shortcuts for sequenced keypresses (e.g. up, up, down, down, enter)
- Creates one listener for all keyboard shortcuts - _fast and lightweight!_

### Roadmap

- **Focus** - Support executing shortcuts when a particular element is focused

## Installation

```bash
$ npm i react-keybind --save
```

### Requirements

This library uses [React Context](https://reactjs.org/docs/context.html) which requires React 16.3+.

### TypeScript

This library utilizes [TypeScript](https://www.typescriptlang.org/) and exposes a full set of
TypeScript definitions.

## Usage

This library exposes a default `withShortcut`
[Higher-Order Component](https://reactjs.org/docs/higher-order-components.html) which is used to
wrap any component that wants to utilize keyboard shortcuts.

Your main application should be wrapped in the exposed `<ShortcutProvider />`.

### Example

```typescript
import { useCallback, useEffect, useState } from 'react';
import { useShortcut } from 'react-keybind';

// Component that implements a shortcut
const MyComponent = () => {
    const {registerShortcut, unregisterShortcut} = useShortcut();
    const [state, setState] = useState({
        isSaved: false,
    });

    const save = useCallback(async (e) => {
        setState(nextState => ({
            ...nextState,
            isSaved: true,
        }));
    }, [state]);

    useEffect(() => {
        registerShortcut(save, ['ctrl+s', 'cmd+s'], 'Save', 'Save the file')
        return () => {
            unregisterShortcut(['ctrl+s', 'cmd+s'])
        }
    }, [])

    return (
        <div>
            The file is saved: {state.isSaved ? 'true' : 'false'}
        </div>
    );
}

// Root application
const App = () => (
    <ShortcutProvider>
        <MyComponent />
    </ShortcutProvider>
);
```

## API

react-keybind exposes a small set of Components to use in your application.

### `<ShortcutProvider />`

Initializes the main provider for shortcuts. This component should be placed at the root of your
application where you want to start listening on keyboard shortcuts.

#### Props

| **Prop**            | **Type** | **Default** | **Description**                                                   |
| ------------------- | -------- | ----------- | ----------------------------------------------------------------- |
| **ignoreKeys**      | string[] | []          | Array of keys to ignore (e.g. ['shift', 'ctrl'])                  |
| **ignoreTagNames**  | string[] | ['input']   | Array of tagNames to ignore (e.g. ['input', 'article'])           |
| **preventDefault**  | boolean  | true        | Call `preventDefault()` automatically when a shortcut is executed |
| **sequenceTimeout** | number   | 2000        | How long to wait before checking if a sequence is complete        |

### `useShortcut()`

Hook to consume shortcuts. Provides the following interface:

```typescript
{
  registerShortcut: (
    method: (e?: React.KeyboardEvent<any>) => any,
    keys: string[],
    title: string,
    description: string,
    holdDuration?: number,
  ) => void;
  registerSequenceShortcut: (
    method: () => any,
    keys: string[],
    title: string,
    description: string,
  ) => void;
  shortcuts: Shortcut[];
  triggerShortcut: (key: string) => any;
  unregisterShortcut: (keys: string[]) => void;
  setEnabled: (enabled: boolean) => void;
}
```

## Use Cases

This library was built specifically for [dddice](https://dddice.com), an
online platform to roll dice for tabletop roleplaying games.

The dddice platform contains many different screens than handle a wide variety of purposes. Each
screen in dddice might contain several dozens of keyboard shortcuts.

Instead of managing each screen individually and keeping track of which shortcuts are used where,
we simplify the process by letting components decide which shortcuts they want to define and
tracking the list of active shortcuts globally. This is especially useful for rendering a quick
"Shortcut Menu" for our users no matter where the user might be in the application.

We open-sourced this library in hopes that other projects might find it useful 💙

## License

MIT
