# react-keybind ⌨️

A lightweight library to manage global keyboard shortcuts for your [React](https://reactjs.org)
application.

### Who should use this library?

 * Your application contains many components that require keyboard shortcuts
 * Your application frequently changes keyboard shortcuts depending on the screen
 * Your application needs a list of all active shortcuts on the screen
 * Your application needs a simple way to manage keyboard shortcuts

## Installation

```bash
$ yarn install react-keybind
```

### Requirements

This library uses React [Context](https://reactjs.org/docs/context.html) which requires React 16.3+.

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
    shortcut.createShortcut(this.save, ['ctrl+s', 'cmd+s'], 'Save', 'Save a file')
    shortcut.createShortcut(this.create, ['ctrl+n', 'cmd+n'], 'New', 'Create a new file')
  }

  create = () => {
    console.log('Creating file ...')

    const { totalFiles } = this.state
    this.setState({
      isSaved: false,
      totalFiles: totalFiles + 1,
    })
  }

  save = async () => {
    console.log('Saving file ...')

    await new Promise(resolve => setTimeout(resolve, 1000))
    this.setState({ isSaved: true })
  }

  render() {
    return (
      <div>
        <div>Save the file with <strong>Ctrl + S</strong></div>
        <div>File status: {isSaved ? 'Saved' : 'Not Saved'}</div>
      </div>
    )
  }
}

// Wrap all components that need shortcut capabilities with the "withShortcut" HOC
const ShortcutComponent = withShortcut(MyComponent)

/**
 * Main Application
 *
 * Our main application gets wrapped with <ShortcutProvider /> to provide shortcut functionality
 * to the entire application. We can then use the <ShortcutConsumer /> in any child component to
 * access all of the active keybindings our application has.
 */
const MyApp = () => (
  <ShortcutProvider>
    <ShortcutComponent />

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

## License

MIT
