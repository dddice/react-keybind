# react-keybind ⌨️

A lightweight library to manage global keyboard shortcuts for your [React](https://reactjs.org)
application.

### Who should use this library?

 * Your application contains many components that require keyboard shortcuts
 * Your application frequently changes keyboard shortcuts depending on the screen
 * Your application needs a list of all active shortcuts on the screen
 * Your application needs a simple way to manage keyboard shortcuts

## Features

 * Globally listen to single keypresses
 * Globally listen to combination keypresses (e.g. ctrl+c, ctrl+alt+a)
 * Creates one listener for all keyboard shortcuts - _fast and lightweight!_
 * Zero outside dependencies

### Roadmap

 * **Focus** - Support executing shortcuts when a particular element is focused
 * **Press & Hold** - Support holding down a particular set of keys and executing after a set time
 * **Sequenced Keypresses** - Support multiple keys pressed in succession

## Installation

```bash
$ yarn install react-keybind
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
import React, { PureComponent } from 'react'
import ReactDOM from 'react-dom'
import withShortcut, { ShortcutProvider, ShortcutConsumer } from 'react-keybind'

/**
 * Sample component
 *
 * We define shortcuts when the component mounts. This is useful because we can globally keep track
 * of what keyboard shortcuts _currently_ exist for our application.
 *
 * This sample component utilizes CTRL+N and CTRL+S to "create" and "save" files. It shows the usage
 * of both a regular and async method being used as a shortcut for the app.
 */
class MyComponent extends PureComponent {
  state = {
    isSaved: false,
    totalFiles: 0,
  }

  componentDidMount () {
    const { shortcut } = this.props

    shortcut.registerShortcut(this.save, ['ctrl+s', 'cmd+s'], 'Save', 'Save a file')
    shortcut.registerShortcut(this.create, ['ctrl+n', 'cmd+n'], 'New', 'Create a new file')
  }

  componentWillUnmount () {
    shortcut.unregisterShortcut(['ctrl+n', 'cmd+n'])
    shortcut.unregisterShortcut(['ctrl+s', 'cmd+s'])
  }

  create = (e) => {
    e.preventDefault()
    console.log('Creating file ...')

    const { totalFiles } = this.state
    this.setState({
      isSaved: false,
      totalFiles: totalFiles + 1,
    })
  }

  save = async () => {
    e.preventDefault()
    console.log('Saving file ...')

    await new Promise(resolve => setTimeout(resolve, 1000))
    this.setState({ isSaved: true })
  }

  render() {
    const { isSaved, totalFiles } = this.state

    return (
      <div>
        <div>Save the file with <strong>Ctrl + S</strong></div>
        <div>File status: {isSaved ? 'Saved' : 'Not Saved'}</div>
        <div>Total Files: {totalFiles}</div>
      </div>
    )
  }
}

// Wrap all components that need shortcut capabilities with the "withShortcut" HOC
const MyShortcutComponent = withShortcut(MyComponent)

/**
 * Main Application
 *
 * Our main application gets wrapped with <ShortcutProvider /> to provide shortcut functionality
 * to the entire application. We can then use the <ShortcutConsumer /> in any child component to
 * access all of the active keybindings our application has.
 */
const MyApp = () => (
  <ShortcutProvider>
    <MyShortcutComponent />

    <ShortcutConsumer>
      {(allKeys => (
        <div>
          <h1>Available Keys</h1>
          <ul>
            {allKeys.map(binding => (
              <li key={binding.id}>{binding.title} - {binding.description}</li>
            ))}
          </ul>
        </div>
      )}
    <ShortcutConsumer>
  </ShortcutProvider>
)

// That's it, render your application however you normally do
ReactDOM.render(MyApp, '#app')
```

## Use Cases

This library was built specifically for [Astral TableTop](https://www.astraltabletop.com), an
online platform to play tabletop roleplaying games with people from all around the world.

The Astral platform contains many different screens than handle a wide variety of purposes such as
a full-featured map editor and a unique online game screen for both Game Masters and players. Each
screen in Astral might contain several dozens of keyboard shortcuts.

Instead of managing each screen individually and keeping track of which shortcuts are used where,
we simplify the process by letting components decide which shortcuts they want to define and
tracking the list of active shortcuts globally. This is especially useful for rendering a quick
"Shortcut Menu" for our users no matter where the user might be in the application.

We open-sourced this library in hopes that other projects might find it useful 💙

## License

MIT
