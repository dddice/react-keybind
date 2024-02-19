/**
 * Shortcut Enhancer
 *
 * Provides a default HOC and Context
 *
 * @format
 */

import {memo, createContext, useCallback, useEffect, useRef, useState, ReactNode, useMemo, PropsWithChildren} from 'react'
import {useContext} from "react";

/**
 * Shortcut
 */
export interface IShortcut {
  description: string
  hold: boolean
  holdDuration: number
  id: string
  keys: string[]
  method: (props: any) => any
  sequence: boolean
  title: string
}

/**
 * Shortcut binding
 */
export interface IShortcutBinding {
  [key: string]: IShortcut
}

/**
 * Shortcut Props
 */
export interface IShortcutProviderProps {
  children?: ReactNode
  ignoreKeys?: string[]
  ignoreTagNames?: string[]
  preventDefault?: boolean
  sequenceTimeout?: number;
}

/**
 * Shortcut State
 */
export type IShortcutProviderState = IShortcut[];

/**
 * Shortcut Render Props
 */
export type IShortcutProviderRenderProps = {
  registerShortcut: (
    method: (e?: KeyboardEvent) => any,
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
  setEnabled: (enabled: boolean) => void;
  triggerShortcut: (key: string) => any;
  unregisterShortcut: (keys: string[]) => void;
} & { shortcuts: IShortcutProviderState };

/**
 * Listener Interface
 */
interface ISingleShortcutListener {
  [key: string]: (e?: KeyboardEvent) => any
}

/**
 * MultiListener Interface
 * Uses an array to store multiple different shortcuts. Only applies to standard shortcuts
 */
interface IShortcutListener {
  [key: string]: ((e?: KeyboardEvent) => any)[]
}

/**
 * Default tags to ignore shortcuts when focused
 */
const ignoreForTagNames = ['input']

const ShortcutContext = createContext<IShortcutProviderRenderProps | undefined>(undefined)

/**
 * Route known keys to their proper exectued counterpart
 *
 * Mappings:
 *  - opt, option = alt
 *  - control = ctrl
 *  - cmd, command = meta
 */
const transformKeys = (keys: string[]) => {
  return keys.map(rawKeys => {
    // force keys to be a string (we might have a number)
    const splitKeys = `${rawKeys}`.split('+')
    const transformedKeys = splitKeys.map(key => {
      const keyEvent = key.toLowerCase()
      switch (keyEvent) {
        case 'opt':
        case 'option':
          return 'alt'
        case 'control':
          return 'ctrl'
        case 'cmd':
        case 'command':
          return 'meta'
        default:
          return keyEvent
      }
    })
    return transformedKeys.join('+')
  })
}

export const ShortcutProvider = memo(({ children, ...props }: PropsWithChildren<IShortcutProviderProps>) => {
  const holdDurations = useRef<{
    [key: string]: number
  }>({});
  const holdInterval = useRef<number>();
  const holdListeners = useRef<ISingleShortcutListener>({});
  const holdTimer = useRef<number>(0);
  const keysDown = useRef<string[]>([]);
  const listeners = useRef<IShortcutListener>({});
  const previousKeys = useRef<string[]>([]);
  const sequenceListeners = useRef<ISingleShortcutListener>({});
  const sequenceTimer = useRef<number | undefined>();
  const shortcuts = useRef<IShortcutProviderState>([]);

  const [shortcutsState, setShortcutsState] = useState<IShortcutProviderState>([]);
  const isEnabled = useRef<boolean>(true);

  /**
   * Create an interval timer to check the duration of held keypresses
   */
  const createTimer = useCallback((callback: () => void) => {
    holdInterval.current = window.setInterval(() => {
      callback()
      holdTimer.current += 100
    }, 100)
  }, []);

  /**
   * Handle "keydown" events and run the appropriate registered method
   */
  const keyDown = useCallback((e: KeyboardEvent) => {
    if (!isEnabled.current) return;

    const { ignoreKeys = [], ignoreTagNames, preventDefault = true } = props
    const target = e.target as HTMLElement
    // ignore listening when certain elements are focused
    const ignore = ignoreTagNames
        ? [...ignoreTagNames.map(tag => tag.toLowerCase()), ...ignoreForTagNames]
        : ignoreForTagNames
    // The currently pressed key
    const key: string = e.key?.toLowerCase()

    // ensure that we're not focused on an element such as an <input />
    if (key && ignore.indexOf(target.tagName.toLowerCase()) < 0 && keysDown.current.indexOf(key) < 0) {
      const nextKeysDown: string[] = []
      const nextModKeys: string[] = []
      if ((key === 'control' || e.ctrlKey) && ignoreKeys.indexOf('ctrl') < 0) {
        if (keysDown.current.indexOf('ctrl') < 0) nextKeysDown.push('ctrl')
        if (key === 'control') nextModKeys.push(key)
      }
      if ((key === 'alt' || e.altKey) && ignoreKeys.indexOf('alt') < 0) {
        if (keysDown.current.indexOf('alt') < 0) nextKeysDown.push('alt')
        if (key === 'alt') nextModKeys.push(key)
      }
      if ((key === 'meta' || e.metaKey) && ignoreKeys.indexOf('meta') < 0 && ignoreKeys.indexOf('cmd') < 0) {
        if (keysDown.current.indexOf('meta') < 0) nextKeysDown.push('meta')
        if (key === 'meta') nextModKeys.push(key)
      }
      if ((key === 'shift' || e.shiftKey) && ignoreKeys.indexOf('shift') < 0) {
        if (keysDown.current.indexOf('shift') < 0) nextKeysDown.push('shift')
        if (key === 'shift') nextModKeys.push(key)
      }

      if ([ ...ignoreKeys, ...nextModKeys ].indexOf(key) < 0) {
        nextKeysDown.push(key)
      }

      keysDown.current = [...keysDown.current, ...nextKeysDown]

      const keyPress = keysDown.current.join('+')
      if (listeners.current[keyPress]) {
        // automatically preventDefault on the key
        if (preventDefault) {
          e.preventDefault()
        }
        listeners.current[keyPress].forEach(method => method(e))
      }

      // create an interval to check the duration every 100ms
      resetTimer()
      createTimer(() => {
        nextKeysDown.forEach(key => {
          if (holdTimer.current >= holdDurations.current[key]) {
            // we're paseed the duration - execute and reset the timer check
            holdListeners.current?.[keyPress](e)
            resetTimer()
          }
        })
      })

      // check if we fulfilled a sequence
      if (sequenceTimer.current !== undefined) {
        window.clearTimeout(sequenceTimer.current)
      }

      // Track previously pressed keys
      previousKeys.current.push(...nextKeysDown)

      const sequenceKeys = previousKeys.current.join(',')
      if (sequenceListeners.current[sequenceKeys] !== undefined) {
        sequenceListeners.current[sequenceKeys](e)
        if (sequenceTimer.current) {
          window.clearTimeout(sequenceTimer.current)
          sequenceTimer.current = undefined
          previousKeys.current = []
        }
      }

      // we have 2s to keep sequencing keys otherwise we'll reset the previous array
      sequenceTimer.current = window.setTimeout(() => {
        previousKeys.current = []
        sequenceTimer.current = undefined
      }, props.sequenceTimeout ?? 2000)
    }
  }, [props]);

  /**
   * Unset the previously pressed keys
   */
  const keyUp = useCallback((e: KeyboardEvent) => {
    const keysUp: string[] = []
    const key: string = e.key?.toLowerCase()

    if (key === 'control' || e.ctrlKey) {
      keysUp.push('ctrl')
    }
    if (key === 'alt' || e.altKey) {
      keysUp.push('alt')
    }
    if (key === 'meta' || e.metaKey) {
      keysUp.push('meta')
    }
    if (key === 'shift' || e.shiftKey) {
      keysUp.push('shift')
    }

    const specialKeys = ['control', 'alt', 'meta', 'shift']
    if (specialKeys.indexOf(key) < 0) {
      keysUp.push(key)
    }

    keysDown.current = keysDown.current.filter(key => keysUp.indexOf(key) < 0)

    resetTimer()
  }, []);


  /**
   * On blur of the window, we unset keyDown because the keyUp event happens outside of the window focus
   */
  const windowBlur = useCallback(() => {
    keysDown.current = []
    resetTimer()
  }, []);

  /**
   * Register a new shortcut for the application
   *
   * Set a holdDuration to execute the shortcut only after the set keys have been pressed for the
   * configured duration.
   */
  const registerShortcut = useCallback((
      method: (e?: KeyboardEvent) => any,
      keys: string[] = [],
      title: string,
      description: string,
      holdDuration?: number,
  ) => {
    const nextShortcuts = [...shortcuts.current]

    // do we need to hold this shortcut?
    const hold = holdDuration !== undefined
    const duration = holdDuration !== undefined ? holdDuration : 0
    const transformedKeys = transformKeys(keys)

    // create new shortcut
    const shortcut: IShortcut = {
      id: Date.now().toString(36),
      description,
      hold,
      holdDuration: duration,
      keys: transformedKeys,
      method,
      sequence: false,
      title,
    }
    // add it to the list of shortcuts
    nextShortcuts.push(shortcut)

    // create a listener for each key
    transformedKeys.forEach(key => {
      if (hold) {
        holdDurations.current[key] = duration
        holdListeners.current[key] = method
      } else {
        if (!listeners.current[key]) {
          listeners.current[key] = []
        }

        listeners.current[key] = [...listeners.current[key], method]
      }
    })

    shortcuts.current = nextShortcuts
    setShortcutsState(nextShortcuts)
  }, []);

  /**
   * Register a shortcut that listens for a sequence of keys to be pressed
   *
   * Unlike the registerShortcut method, the array of keys represents the keys that need to be
   * pressed in the configured order
   */
  const registerSequenceShortcut = useCallback((
      method: () => any,
      keys: string[] = [],
      title: string,
      description: string,
  ) => {
    const nextShortcuts = [...shortcuts.current]

    // create new shortcut
    const shortcut: IShortcut = {
      id: Date.now().toString(36),
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
    Object.keys(sequenceListeners.current).forEach(existingKey => {
      exists = exists || keyEvent === existingKey
    })

    if (!exists) {
      nextShortcuts.push(shortcut)

      // create a listener for each key
      sequenceListeners.current[keyEvent] = method

      shortcuts.current = nextShortcuts

      setShortcutsState(nextShortcuts);
    }
  }, []);

  /**
   * Reset the keypress timer
   */
const resetTimer = useCallback(() => {
    if (holdInterval.current !== undefined) {
      window.clearInterval(holdInterval.current)
      holdInterval.current = undefined
      holdTimer.current = 0
    }
  }, []);

  /**
   * Programatically trigger a shortcut using a key sequence
   *
   * Note: This ignores any ignored keys meaning this method is useful for bypassing otherwise
   * disabled shortcuts.
   */
  const triggerShortcut = useCallback((key: string) => {
    const transformedKeys = transformKeys([key])
    const transformKey = transformedKeys.pop()
    if (transformKey && listeners.current[transformKey]) {
      listeners.current[transformKey].forEach(method => method())
    }
  }, []);

  /**
   * Remove a shortcut from the application
   */
  const unregisterShortcut = useCallback((keys: string[], sequence: boolean = false) => {
    const transformedKeys = transformKeys(keys)
    if (!sequence) {
      transformedKeys.forEach(key => {
        if (listeners.current[key]) {
          listeners.current[key].pop()

          if (listeners.current[key].length === 0) {
            delete listeners.current[key]
          }
        }
        delete holdListeners.current[key]
        delete holdDurations.current[key]
      })
    } else {
      const keyEvent = transformedKeys.join(',')
      delete sequenceListeners.current[keyEvent]
    }

    // Delete the shortcut
    const nextShortcuts = shortcuts.current.filter(({ keys: shortcutKeys }) => {
      let match = true
      shortcutKeys.forEach(shortcutKey => {
        match = match && transformedKeys.indexOf(shortcutKey) >= 0
      })
      return !match
    })

    shortcuts.current = nextShortcuts
    setShortcutsState(nextShortcuts);
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    isEnabled.current = enabled;
  },[]);

  const value = useMemo(() => ({
    registerSequenceShortcut,
    registerShortcut,
    shortcuts: shortcutsState,
    triggerShortcut,
    unregisterShortcut,
    setEnabled,
  } satisfies IShortcutProviderRenderProps), [shortcutsState, registerShortcut, registerSequenceShortcut, triggerShortcut, unregisterShortcut, setEnabled])

  useEffect(() => {
    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', windowBlur)

    return () => {
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', windowBlur)
    }
  }, [keyDown, keyUp, windowBlur]);

  return <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>
});

/**
 * Default useShortcut hook
 *
 * Returns methods to register/unregister shortcuts
 */
export const useShortcut = () => useContext(ShortcutContext);