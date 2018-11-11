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
  hold: boolean
  holdDuration: number
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
  ignoreTagNames?: string[]
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
  registerShortcut?: (
    method: (e: React.KeyboardEvent<any>) => any,
    keys: string[],
    title: string,
    description: string,
    holdDuration?: number,
  ) => void
  unregisterShortcut?: (keys: string[]) => void
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
export interface IWithShortcut {
  shortcut: ShortcutProviderRenderProps
}

/**
 * Default tags to ignore shortcuts when focused
 */
const ignoreForTagNames = ['input']

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
export const withShortcut = <T extends IWithShortcut>(Child: React.ComponentType<T>) => (
  props: object,
) => (
  <ShortcutConsumer>
    {shortcutProps => <Child shortcut={shortcutProps} {...props} />}
  </ShortcutConsumer>
)

// Default wrapper component styles
const defaultStyle = {
  height: '100%',
  width: '100%',
}

// Shortcut Provider
export class ShortcutProvider extends React.PureComponent<ShortcutProviderProps> {
  holdDurations: {
    [key: string]: number
  } = {}
  holdListeners: IShortcutListener = {}
  holdTimer: number = 0
  holdInterval?: number
  keysDown: string[] = []
  listeners: IShortcutListener = {}

  readonly state: ShortcutProviderState = {
    shortcuts: [],
  }

  /**
   * Handle "keydown" events and run the appropriate registered method
   */
  keyDown = (e: React.KeyboardEvent<any>) => {
    const { ignoreTagNames } = this.props
    const target = e.target as HTMLElement
    const ignore = ignoreTagNames
      ? [...ignoreTagNames.map(tag => tag.toLowerCase()), ...ignoreForTagNames]
      : ignoreForTagNames
    const key = e.key.toLowerCase()
    // ensure that we're not focused on an element such as an <input />
    if (ignore.indexOf(target.tagName.toLowerCase()) < 0 && this.keysDown.indexOf(key) < 0) {
      const keysDown: string[] = []
      if (e.ctrlKey === true) {
        keysDown.push('ctrl')
      }
      if (e.altKey === true) {
        keysDown.push('alt')
      }
      keysDown.push(key)
      const keyPress = keysDown.join('+')
      if (this.listeners[keyPress]) {
        // automatically preventDefault on the key
        e.preventDefault()
        this.listeners[keyPress](e)
      }

      this.keysDown = [...this.keysDown, ...keysDown]

      // create an interval to check the duration every 100ms
      this.resetTimer()
      this.createTimer(() => {
        keysDown.forEach(key => {
          if (this.holdTimer >= this.holdDurations[key]) {
            // we're paseed the duration - execute and reset the timer check
            this.holdListeners[keyPress](e)
            this.resetTimer()
          }
        })
      })
    }
  }

  private createTimer = (callback: () => void) => {
    this.holdInterval = window.setInterval(() => {
      callback()
      this.holdTimer += 100
    }, 100)
  }

  /**
   * Unset the previously pressed keys
   */
  keyUp = (e: React.KeyboardEvent<any>) => {
    const keysUp: string[] = []
    if (e.ctrlKey === true) {
      keysUp.push('ctrl')
    }
    if (e.altKey === true) {
      keysUp.push('alt')
    }
    keysUp.push(e.key.toLowerCase())
    this.keysDown = this.keysDown.filter(key => keysUp.indexOf(key) < 0)

    this.resetTimer()
  }

  /**
   * Register a new shortcut for the application
   *
   * Set a holdDuration to execute the shortcut only after the set keys have been pressed for the
   * configured duration.
   */
  registerShortcut = (
    method: (e: React.KeyboardEvent<any>) => any,
    keys: string[] = [],
    title: string,
    description: string,
    holdDuration?: number,
  ) => {
    const { shortcuts: currentShortcuts } = this.state
    const nextShortcuts = [...currentShortcuts]

    // do we need to hold this shortcut?
    const hold = holdDuration !== undefined
    const duration = holdDuration !== undefined ? holdDuration : 0

    // create new shortcut
    const shortcut: Shortcut = {
      description,
      hold,
      holdDuration: duration,
      keys,
      method,
      title,
    }

    // check if we already have existing keys for the new keys being passed
    let exists = false
    const listeners = hold ? this.holdListeners : this.listeners
    Object.keys(listeners).forEach(existingKey => {
      exists = exists || keys.some(key => key === existingKey)
    })

    if (!exists) {
      nextShortcuts.push(shortcut)

      // create a listener for each key
      keys.forEach(key => {
        const keyEvent = key.toLowerCase()
        if (hold) {
          this.holdDurations[keyEvent] = duration
          this.holdListeners[keyEvent] = method
        } else {
          this.listeners[keyEvent] = method
        }
      })

      this.setState({
        shortcuts: nextShortcuts,
      })
    }
  }

  private resetTimer = () => {
    if (this.holdInterval !== undefined) {
      window.clearInterval(this.holdInterval)
      this.holdInterval = undefined
      this.holdTimer = 0
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
      }),
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
      <div tabIndex={0} onKeyDown={this.keyDown} onKeyUp={this.keyUp} style={defaultStyle}>
        <ShortcutContext.Provider value={providerProps}>{children}</ShortcutContext.Provider>
      </div>
    )
  }
}
