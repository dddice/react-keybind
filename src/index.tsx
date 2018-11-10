/**
 * Shortcut Enhancer
 *
 * Provides a default HOC and Context
 *
 * @format
 */

import * as React from 'react'

/**
 * Shortcut
 */
export interface Shortcut {
  description: string
  keys: string[]
  method: (props: any) => any
  title: string
}

/**
 * Shortcut binding
 */
export interface ShortcutBinding {
  [key: string]: Shortcut
}

/**
 * Shortcut Props
 */
export interface ShortcutProviderProps {
  children?: React.ReactNode
}

/**
 * Shortcut State
 */
export interface ShortcutProviderState {
  shortcuts: Shortcut[]
}

/**
 * Shortcut Render Props
 */
export interface ShortcutProviderRenderProps extends ShortcutProviderState {
  registerShortcut?: (method: (e: React.KeyboardEvent<any>) => any, keys: string[], title: string, description: string) => void
  unregisterShortcut?: (keys: string[]) => void
}

/**
 * Shortcut Interface
 */
interface IShortcutProvider {
  listeners: IShortcutListener
}

/**
 * Listener Interface
 */
interface IShortcutListener {
  [key: string]: (e: React.KeyboardEvent<any>) => any
}

/**
 * With Shortcut Interface
 */
interface IWithShortcut {
  shortcut: ShortcutProviderRenderProps
}

/**
 * Shortcut Context to provide and consume global shortcuts
 */
const defaultState: ShortcutProviderRenderProps = {
  shortcuts: [],
}
const ShortcutContext = React.createContext(defaultState)
export const ShortcutConsumer = ShortcutContext.Consumer

/**
 * Default withShortcut HOC
 *
 * Wraps any child component with the ShortcutConsumer to pass on enhancer functionality
 */
export const withShortcut = <T extends IWithShortcut>(Child: React.ComponentType<T>) => ((props: object) => (
  <ShortcutConsumer>
    {shortcutProps => <Child shortcut={shortcutProps} {...props} />}
  </ShortcutConsumer>
))

// Default wrapper component styles
const defaultStyle = {
  height: '100%',
  width: '100%',
}

// Shortcut Provider
export class ShortcutProvider extends React.PureComponent<ShortcutProviderProps>
  implements IShortcutProvider {
  listeners: IShortcutListener = {}

  readonly state: ShortcutProviderState = {
    shortcuts: [],
  }

  /**
   * Handle "keydown" events and run the appropriate registered method
   */
  keyDown = (e: React.KeyboardEvent<any>) => {
    const keysDown = []
    if (e.ctrlKey === true) {
      keysDown.push('ctrl')
    }
    if (e.altKey === true) {
      keysDown.push('alt')
    }
    keysDown.push(e.key.toLowerCase())
    const keyPress = keysDown.join('+')
    if (this.listeners[keyPress]) {
      this.listeners[keyPress](e)
    }
  }

  /**
   * Register a new shortcut for the application
   */
  registerShortcut = (method: (e: React.KeyboardEvent<any>) => any, keys: string[] = [], title: string, description: string) => {
    const { shortcuts: currentShortcuts } = this.state
    const nextShortcuts = [...currentShortcuts]

    // create new shortcut
    const shortcut: Shortcut = {
      description,
      keys,
      method,
      title,
    }

    // check if we already have existing keys for the new keys being passed
    let exists = false
    Object.keys(this.listeners).forEach(existingKey => {
      exists = exists || keys.some(key => key === existingKey)
    })

    if (!exists) {
      nextShortcuts.push(shortcut)

      // create a listener for each key
      keys.forEach(key => {
        const keyEvent = key.toLowerCase()
        this.listeners[keyEvent] = method
      })

      this.setState({
        shortcuts: nextShortcuts,
      })
    }
  }

  /**
   * Remove a shortcut from the application
   */
  unregisterShortcut = (keys: string[]) => {
    const { shortcuts } = this.state

    keys.forEach(key => {
      const keyEvent = key.toLowerCase()
      delete this.listeners[keyEvent]
    })

    // Delete the shortcut
    this.setState({
      shortcuts: shortcuts.filter(({ keys: shortcutKeys }) => {
        let match = true
        shortcutKeys.forEach(shortcutKey => {
          match = match && keys.indexOf(shortcutKey) >= 0
        })
        return !match
      })
    })
  }

  /**
   * Render
   */
  render() {
    const { shortcuts } = this.state
    const { children } = this.props
    const providerProps: ShortcutProviderRenderProps = {
      registerShortcut: this.registerShortcut,
      shortcuts,
      unregisterShortcut: this.unregisterShortcut,
    }

    return (
      <div tabIndex={0} onKeyDown={this.keyDown} style={defaultStyle}>
        <ShortcutContext.Provider value={providerProps}>{children}</ShortcutContext.Provider>
      </div>
    )
  }
}
