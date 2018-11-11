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
  sequence: boolean
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
    method: (e?: React.KeyboardEvent<any>) => any,
    keys: string[],
    title: string,
    description: string,
    holdDuration?: number,
  ) => void
  registerSequenceShortcut?: (
    method: () => any,
    keys: string[],
    title: string,
    description: string,
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
  holdInterval?: number
  holdListeners: IShortcutListener = {}
  holdTimer: number = 0
  keysDown: string[] = []
  listeners: IShortcutListener = {}
  previousKeys: string[] = []
  sequenceListeners: IShortcutListener = {}
  sequenceTimer?: number

  readonly state: ShortcutProviderState = {
    shortcuts: [],
  }

  /**
   * Create an interval timer to check the duration of held keypresses
   */
  private createTimer = (callback: () => void) => {
    this.holdInterval = window.setInterval(() => {
      callback()
      this.holdTimer += 100
    }, 100)
  }

  /**
   * Handle "keydown" events and run the appropriate registered method
   */
  keyDown = (e: React.KeyboardEvent<any>) => {
    const { ignoreTagNames } = this.props
    const target = e.target as HTMLElement
    // ignore listening when certain elements are focused
    const ignore = ignoreTagNames
      ? [...ignoreTagNames.map(tag => tag.toLowerCase()), ...ignoreForTagNames]
      : ignoreForTagNames
    // The currently pressed key
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

      // check if we fulfilled a sequence
      if (this.sequenceTimer !== undefined) {
        window.clearTimeout(this.sequenceTimer)
      }

      // Track previously pressed keys
      this.previousKeys.push(...keysDown)

      const sequenceKeys = this.previousKeys.join(',')
      if (this.sequenceListeners[sequenceKeys] !== undefined) {
        this.sequenceListeners[sequenceKeys](e)
      }

      // we have 2s to keep sequencing keys otherwise we'll reset the previous array
      this.sequenceTimer = window.setTimeout(() => {
        this.previousKeys = []
        this.sequenceTimer = undefined
      }, 2000)
    }
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
      sequence: false,
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

  /**
   * Register a shortcut that listens for a sequence of keys to be pressed
   *
   * Unlike the registerShortcut method, the array of keys represents the keys that need to be
   * pressed in the configured order
   */
  registerSequenceShortcut = (
    method: () => any,
    keys: string[] = [],
    title: string,
    description: string,
  ) => {
    const { shortcuts: currentShortcuts } = this.state
    const nextShortcuts = [...currentShortcuts]

    // create new shortcut
    const shortcut: Shortcut = {
      description,
      hold: false,
      holdDuration: 0,
      keys,
      method,
      sequence: true,
      title,
    }

    // check if we already have existing keys for the new keys being passed
    let exists = false
    const keyEvent = keys.join(',').toLowerCase()
    Object.keys(this.sequenceListeners).forEach(existingKey => {
      exists = exists || keyEvent === existingKey
    })

    if (!exists) {
      nextShortcuts.push(shortcut)

      // create a listener for each key
      this.sequenceListeners[keyEvent] = method

      this.setState({
        shortcuts: nextShortcuts,
      })
    }
  }

  /**
   * Reset the keypress timer
   */
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
  unregisterShortcut = (keys: string[], sequence: boolean = false) => {
    const { shortcuts } = this.state

    if (!sequence) {
      keys.forEach(key => {
        const keyEvent = key.toLowerCase()
        delete this.listeners[keyEvent]
        delete this.holdListeners[keyEvent]
        delete this.holdDurations[keyEvent]
      })
    } else {
      const keyEvent = keys.join(',').toLowerCase()
      delete this.sequenceListeners[keyEvent]
    }

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
      registerSequenceShortcut: this.registerSequenceShortcut,
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
