/** @format */

import * as React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { withShortcut, IWithShortcut, ShortcutProvider } from '../index'

// Mock the window addEventListener
const map: {
  keydown?(params: any): any
  keyup?(params: any): any
} = {}
window.addEventListener = jest.fn((event, cb) => {
  map[event] = cb
})

const simulateKey = (keyOptions: {}, tagName?: string) => ({
  preventDefault: jest.fn(),
  target: {
    tagName: tagName ? tagName : 'div',
  },
  ...keyOptions,
})

const simulateKeyDown = (keyOptions: {}, tagName?: string) => {
  const stub = simulateKey(keyOptions, tagName)
  if (map.keydown) {
    map.keydown(stub)
  }
  return stub
}

const simulateKeyUp = (keyOptions: {}, tagName?: string) => {
  const stub = simulateKey(keyOptions, tagName)
  if (map.keyup) {
    map.keyup(stub)
  }
  return stub
}

describe('react-keybind', () => {
  describe('ShortcutProvider', () => {
    let instance: ShortcutProvider
    let wrapper: ReactWrapper
    let method: jest.Mock

    beforeEach(() => {
      wrapper = mount(
        <ShortcutProvider>
          <div />
        </ShortcutProvider>,
      )
      instance = wrapper.instance() as ShortcutProvider
      method = jest.fn()

      jest.useFakeTimers()
    })

    it('takes prop "ignoreTagNames" and ignores execution when relevant tag is focused', () => {
      wrapper = mount(
        <ShortcutProvider ignoreTagNames={['article']}>
          <article />
        </ShortcutProvider>,
      )
      instance = wrapper.instance() as ShortcutProvider
      instance.registerShortcut(method, ['t'], 'Test', 'Some description')
      simulateKeyDown({ key: 't' }, 'article')

      expect(method).toHaveBeenCalledTimes(0)
    })

    it('takes prop "ignoreKeys" and executes when relevant keys are pressed', () => {
      wrapper = mount(
        <ShortcutProvider ignoreKeys={['shift']}>
          <article />
        </ShortcutProvider>,
      )
      instance = wrapper.instance() as ShortcutProvider
      instance.registerShortcut(method, ['?'], 'Test', 'Some description')
      simulateKeyDown({ key: '?', shiftKey: true })

      expect(method).toHaveBeenCalledTimes(1)
    })

    describe('.keyDown', () => {
      it('is a function', () => {
        expect(typeof instance.keyDown).toEqual('function')
      })

      it('executes callback method for single keypresses', () => {
        instance.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        simulateKeyDown({ key: 'x' })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('calls preventDefault on shortcut execution', () => {
        instance.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        const stub = simulateKeyDown({ key: 'x' })

        expect(stub.preventDefault).toHaveBeenCalledTimes(1)
      })

      it('skips calling preventDefault on shortcut execution if option passed', () => {
        wrapper = mount(
          <ShortcutProvider preventDefault={false}>
            <article />
          </ShortcutProvider>,
        )
        instance = wrapper.instance() as ShortcutProvider
        instance.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        const stub = simulateKeyDown({ key: 'x' })

        expect(stub.preventDefault).toHaveBeenCalledTimes(0)
      })

      it('does not execute callback for unregistered keypresses', () => {
        instance.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        simulateKeyDown({ key: 'a' })

        expect(method).toHaveBeenCalledTimes(0)
      })

      it('executes callback method for ctrl+{key} keypresses', () => {
        instance.registerShortcut(method, ['ctrl+x'], 'Cut', 'Test cut description')
        simulateKeyDown({ key: 'x', ctrlKey: true })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('executes callback method for alt+{key} keypresses', () => {
        instance.registerShortcut(method, ['alt+a'], 'All', 'Test select all')
        simulateKeyDown({ key: 'a', altKey: true })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('executes callback method for ctrl+alt+{key} keypresses', () => {
        instance.registerShortcut(
          method,
          ['ctrl+alt+s'],
          'Shutdown all',
          'Test shutdown all processes',
        )
        simulateKeyDown({ key: 's', ctrlKey: true, altKey: true })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('is case-insensitive', () => {
        instance.registerShortcut(method, ['X'], 'Test Title', 'Some description')
        simulateKeyDown({ key: 'x' })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('ignores callback method execution for ignored element types', () => {
        wrapper = mount(
          <ShortcutProvider>
            <input type="text" />
          </ShortcutProvider>,
        )
        instance = wrapper.instance() as ShortcutProvider
        instance.registerShortcut(method, ['a'], 'Test', 'Some description')
        simulateKeyDown({ key: 'a' }, 'input')

        expect(method).toHaveBeenCalledTimes(0)
      })

      it('tracks pressed keys in .keysDown array', () => {
        instance.registerShortcut(method, ['a'], 'Test Title', 'Some description')
        simulateKeyDown({ key: 'a' })

        expect(instance.keysDown).toHaveLength(1)
      })

      it('does not duplicate pressed keys in .keysDown array', () => {
        instance.registerShortcut(method, ['a'], 'Test Title', 'Some description')
        simulateKeyDown({ key: 'a' })
        simulateKeyDown({ key: 'a' })
        simulateKeyDown({ key: 'a' })
        simulateKeyDown({ key: 'a' })

        expect(instance.keysDown).toHaveLength(1)
      })

      it('executes callback method after a duration', () => {
        instance.registerShortcut(method, ['f'], 'Pay respects', 'Some description', 1000)
        simulateKeyDown({ key: 'f' })
        expect(method).toHaveBeenCalledTimes(0)
        jest.runTimersToTime(2000)
        expect(method).toHaveBeenCalledTimes(1) // we should not keep calling the method
      })

      it('tracks a list of past keypresses', () => {
        instance.registerSequenceShortcut(method, ['up', 'down', 'up', 'down'], 'Test', 'test')

        simulateKeyDown({ key: 'up' })
        simulateKeyUp({ key: 'up' })
        simulateKeyDown({ key: 'down' })
        simulateKeyUp({ key: 'down' })
        simulateKeyDown({ key: 'up' })
        simulateKeyUp({ key: 'up' })

        expect(instance.previousKeys).toHaveLength(3)
      })

      it('clears past keypresses on a successful sequence', () => {
        instance.registerSequenceShortcut(method, ['up', 'down', 'up', 'down'], 'Test', 'test')

        simulateKeyDown({ key: 'up' })
        simulateKeyUp({ key: 'up' })
        simulateKeyDown({ key: 'down' })
        simulateKeyUp({ key: 'down' })
        simulateKeyDown({ key: 'up' })
        simulateKeyUp({ key: 'up' })
        simulateKeyDown({ key: 'down' })
        simulateKeyUp({ key: 'down' })

        expect(instance.previousKeys).toHaveLength(0)
      })

      it('executes callback method for sequenced keypresses', () => {
        instance.registerSequenceShortcut(method, ['up', 'down', 'up', 'down'], 'Test', 'test')

        simulateKeyDown({ key: 'up' })
        simulateKeyUp({ key: 'up' })
        simulateKeyDown({ key: 'down' })
        simulateKeyUp({ key: 'down' })
        simulateKeyDown({ key: 'up' })
        simulateKeyUp({ key: 'up' })
        simulateKeyDown({ key: 'down' })
        simulateKeyUp({ key: 'down' })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('allows some duration of time to pass between sequenced keypresses', () => {
        instance.registerSequenceShortcut(method, ['up', 'down', 'up', 'down'], 'Test', 'test')

        simulateKeyDown({ key: 'up' })
        simulateKeyUp({ key: 'up' })
        simulateKeyDown({ key: 'down' })
        simulateKeyUp({ key: 'down' })

        jest.runTimersToTime(100)

        simulateKeyDown({ key: 'up' })
        simulateKeyUp({ key: 'up' })
        simulateKeyDown({ key: 'down' })
        simulateKeyUp({ key: 'down' })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('cancels callback method for sequenced keypresses after a duration', () => {
        instance.registerSequenceShortcut(method, ['up', 'down', 'up', 'down'], 'Test', 'test')

        simulateKeyDown({ key: 'up' })
        simulateKeyUp({ key: 'up' })
        simulateKeyDown({ key: 'down' })
        simulateKeyUp({ key: 'down' })

        jest.runTimersToTime(2000)

        simulateKeyDown({ key: 'up' })
        simulateKeyUp({ key: 'up' })
        simulateKeyDown({ key: 'down' })
        simulateKeyUp({ key: 'down' })

        expect(method).toHaveBeenCalledTimes(0)
      })

      it('resets sequenced keypresses timer after a successful execution', () => {
        instance.registerSequenceShortcut(method, ['a', 'b', 'c', 'd'], 'Test', 'test')

        simulateKeyDown({ key: 'a' })
        simulateKeyUp({ key: 'a' })
        simulateKeyDown({ key: 'b' })
        simulateKeyUp({ key: 'b' })
        simulateKeyDown({ key: 'c' })
        simulateKeyUp({ key: 'c' })
        simulateKeyDown({ key: 'd' })
        simulateKeyUp({ key: 'd' })

        expect(method).toHaveBeenCalledTimes(1)

        simulateKeyDown({ key: 'a' })
        simulateKeyUp({ key: 'a' })
        simulateKeyDown({ key: 'b' })
        simulateKeyUp({ key: 'b' })
        simulateKeyDown({ key: 'c' })
        simulateKeyUp({ key: 'c' })
        simulateKeyDown({ key: 'd' })
        simulateKeyUp({ key: 'd' })

        expect(method).toHaveBeenCalledTimes(2)
      })

      it('can reregister shortcuts after they have been unregistered', () => {
        instance.registerShortcut(method, ['a'], 'Test Title', 'Some description')
        instance.unregisterShortcut(['a'])
        instance.registerShortcut(method, ['a'], 'Test Title', 'Some description')

        simulateKeyDown({ key: 'a' })
        expect(method).toHaveBeenCalledTimes(1)
      })

      it('calls multiple callbacks', () => {
        const methodX = jest.fn()
        instance.registerShortcut(method, ['ctrl+a', 'a'], 'Test Title', 'Some description')
        instance.registerShortcut(methodX, ['a'], 'Test Title X', 'Some description')

        simulateKeyDown({ key: 'a' })
        expect(method).toHaveBeenCalledTimes(1)
        expect(methodX).toHaveBeenCalledTimes(1)
      })

      it('detects modifier keys', () => {
        instance.registerShortcut(method, ['ctrl+x', 'shift+Y', 'alt+z', 'cmd+a'], '', '')
        simulateKeyDown({ key: 'x', ctrlKey: true })
        simulateKeyDown({ key: 'y', shiftKey: true })
        simulateKeyDown({ key: 'z', altKey: true })
        simulateKeyDown({ key: 'a', metaKey: true })
        expect(method).toHaveBeenCalledTimes(4)
      })

      it('safely handles invalid number input', () => {
        // @ts-ignore we are testing invalid input
        instance.registerShortcut(method, [1], '', '')
        expect(instance.listeners['1']).toEqual([method])
      })

      it('safely ignores events with undefined key', () => {
        instance.registerShortcut(method, ['f'], '', '')
        expect(() => simulateKeyDown({ key: undefined })).not.toThrow()
        expect(method).not.toHaveBeenCalled()
      })

      it('ignores special keys', () => {
        wrapper = mount(
          <ShortcutProvider ignoreKeys={['shift', 'ctrl', 'alt', 'cmd']}>
            <article />
          </ShortcutProvider>,
        )
        instance = wrapper.instance() as ShortcutProvider
        instance.registerShortcut(method, ['x', 'Y', 'z', 'a'], '', '')

        simulateKeyDown({ key: 'x', ctrlKey: true })
        simulateKeyDown({ key: 'y', shiftKey: true })
        simulateKeyDown({ key: 'z', altKey: true })
        simulateKeyDown({ key: 'a', metaKey: true })

        expect(method).toHaveBeenCalledTimes(4)
      })

      it('accepts "meta" or "cmd" to ignore', () => {
        wrapper = mount(
          <ShortcutProvider ignoreKeys={['cmd']}>
            <article />
          </ShortcutProvider>,
        )
        instance = wrapper.instance() as ShortcutProvider
        instance.registerShortcut(method, ['x'], '', '')

        simulateKeyDown({ key: 'x', metaKey: true })

        expect(method).toHaveBeenCalledTimes(1)

        wrapper = mount(
          <ShortcutProvider ignoreKeys={['meta']}>
            <article />
          </ShortcutProvider>,
        )
        instance = wrapper.instance() as ShortcutProvider
        instance.registerShortcut(method, ['x'], '', '')

        simulateKeyDown({ key: 'x', metaKey: true })

        expect(method).toHaveBeenCalledTimes(2)
      })

      it('ignores keys', () => {
        wrapper = mount(
          <ShortcutProvider ignoreKeys={['t']}>
            <article />
          </ShortcutProvider>,
        )
        instance = wrapper.instance() as ShortcutProvider
        instance.registerSequenceShortcut(method, ['a', 'b'], '', '')

        simulateKeyDown({ key: 'a' })
        simulateKeyDown({ key: 't' }) // this should be ignored
        simulateKeyDown({ key: 'b' })

        expect(method).toHaveBeenCalledTimes(1)
      })
    })

    describe('.keyUp', () => {
      it('is a function', () => {
        expect(typeof instance.keyUp).toEqual('function')
      })

      it('tracks unpressed keys in .keysDown array', () => {
        instance.registerShortcut(method, ['a'], 'Test Title', 'Some description')
        simulateKeyDown({ key: 'a' })
        simulateKeyUp({ key: 'a' })

        expect(instance.keysDown).toHaveLength(0)
      })

      it('does not track events with undefined key', () => {
        instance.registerShortcut(method, ['a'], '', '')
        simulateKeyDown({ key: 'a' })
        simulateKeyUp({ key: undefined })

        expect(instance.keysDown).toContain('a')
      })
    })

    describe('.registerShortcut', () => {
      it('is a function', () => {
        expect(typeof instance.registerShortcut).toEqual('function')
      })

      it('creates a new listener', () => {
        instance.registerShortcut(method, ['ctrl+c', 'k'], 'Test Title', 'Some description')

        expect(wrapper.state('shortcuts')).toHaveLength(1)
        expect(instance.listeners['ctrl+c']).toEqual([method])
        expect(instance.listeners['k']).toEqual([method])
      })

      it('allows multiple methods to use the same listeners', () => {
        const methodX = jest.fn()
        instance.registerShortcut(method, ['shift+x'], 'Test Title', 'Some description')
        instance.registerShortcut(methodX, ['shift+x', 'x'], 'Test Title', 'Some description')

        expect(wrapper.state('shortcuts')).toHaveLength(2)
        expect(instance.listeners['shift+x']).toEqual([method, methodX])
        expect(instance.listeners['x']).toEqual([methodX])
      })

      it('lowercases key bindings', () => {
        instance.registerShortcut(method, ['cTrL+C', 'K'], 'Test Title', 'Some description')
        expect(wrapper.state('shortcuts')).toHaveLength(1)
        expect(instance.listeners['ctrl+c']).toEqual([method])
        expect(instance.listeners['k']).toEqual([method])
      })

      it('creates a shortcut with a hold duration', () => {
        instance.registerShortcut(method, ['f'], 'Pay respects', 'Some description', 2000)

        expect(wrapper.state('shortcuts')).toHaveLength(1)
        expect(instance.listeners['f']).toEqual(undefined)
        expect(instance.holdListeners['f']).toEqual(method)
        expect(instance.holdDurations['f']).toEqual(2000)
      })

      it('can unregister then reregister a shortcut', () => {
        instance.registerShortcut(method, ['a'], 'Test Title', 'Some description')
        instance.unregisterShortcut(['a'])
        instance.registerShortcut(method, ['a'], 'Test Title', 'Some description')

        expect(wrapper.state('shortcuts')).toHaveLength(1)
        expect(instance.listeners['a']).toEqual([method])
      })

      it('transform shortcut keys into the appropriately stored keys', () => {
        instance.registerShortcut(method, ['opt+s'], 'Test Title', 'Some description')
        instance.registerShortcut(method, ['option+k'], 'Test Title', 'Some description')
        instance.registerShortcut(method, ['cmd+x'], 'Test Title', 'Some description')
        instance.registerShortcut(method, ['command+y'], 'Test Title', 'Some description')
        instance.registerShortcut(method, ['control+s'], 'Test Title', 'Some description')

        expect(instance.listeners['alt+s']).toEqual([method])
        expect(instance.listeners['alt+k']).toEqual([method])
        expect(instance.listeners['meta+x']).toEqual([method])
        expect(instance.listeners['meta+y']).toEqual([method])
        expect(instance.listeners['ctrl+s']).toEqual([method])
      })
    })

    describe('.registerSequenceShortcut', () => {
      it('is a function', () => {
        expect(typeof instance.registerSequenceShortcut).toEqual('function')
      })

      it('creates a new listener', () => {
        instance.registerSequenceShortcut(
          method,
          ['up', 'up', 'down', 'down', 'enter'],
          'Test Title',
          'Some description',
        )

        expect(wrapper.state('shortcuts')).toHaveLength(1)
        expect(instance.sequenceListeners['up,up,down,down,enter']).toEqual(method)
      })
    })

    describe('.unregisterShortcut', () => {
      it('is a function', () => {
        expect(typeof instance.unregisterShortcut).toEqual('function')
      })

      it('deletes a listener by passed keys', () => {
        instance.registerShortcut(method, ['ctrl+c', 'k'], 'Test Title', 'Some description')
        instance.unregisterShortcut(['ctrl+c', 'k'])

        expect(wrapper.state('shortcuts')).toHaveLength(0)
        expect(instance.listeners['ctrl+c']).toEqual(undefined)
        expect(instance.listeners['k']).toEqual(undefined)
      })

      it('lowercases key bindings', () => {
        instance.registerShortcut(method, ['cTrL+C', 'K'], 'Test Title', 'Some description')
        instance.unregisterShortcut(['cTrL+C', 'K'])

        expect(wrapper.state('shortcuts')).toHaveLength(0)
        expect(instance.listeners['ctrl+c']).toEqual(undefined)
        expect(instance.listeners['k']).toEqual(undefined)
      })

      it('deletes a hold listener by passed keys', () => {
        instance.registerShortcut(method, ['ctrl+c', 'k'], 'Test Title', 'Some description', 5000)
        instance.unregisterShortcut(['ctrl+c', 'k'])

        expect(wrapper.state('shortcuts')).toHaveLength(0)
        expect(instance.holdDurations['ctrl+c']).toEqual(undefined)
        expect(instance.holdDurations['k']).toEqual(undefined)
        expect(instance.holdListeners['ctrl+c']).toEqual(undefined)
        expect(instance.holdListeners['k']).toEqual(undefined)
      })

      it('deletes a sequence listener by passed keys', () => {
        const keys = ['up', 'up', 'down', 'down', 'enter']
        instance.registerSequenceShortcut(method, keys, 'Test Title', 'Some description')
        instance.unregisterShortcut(keys, true)

        expect(wrapper.state('shortcuts')).toHaveLength(0)
        expect(instance.sequenceListeners['up,up,down,down,enter']).toEqual(undefined)
      })
    })

    describe('.triggerShortcut', () => {
      it('triggers a shortcuts callback method', () => {
        instance.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        instance.triggerShortcut('x')

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('does not trigger an invalid or missing shortcut', () => {
        instance.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        instance.triggerShortcut('a')

        expect(method).toHaveBeenCalledTimes(0)
      })
    })
  })

  describe('withShortcut', () => {
    interface TestComponentProps {
      foo?: string
    }

    it('returns the passed component as a child', () => {
      const Component = (props: IWithShortcut & TestComponentProps) => (
        <span>{JSON.stringify(props)}</span>
      )
      const EnhancedComponent = withShortcut(Component)
      const wrapper = mount(<EnhancedComponent />)
      expect(wrapper.find(Component)).toHaveLength(1)
    })

    it('returns the passed component with originally passed props', () => {
      const Component = (props: IWithShortcut & TestComponentProps) => (
        <span>{JSON.stringify(props)}</span>
      )
      const EnhancedComponent = withShortcut(Component)
      const wrapper = mount(<EnhancedComponent foo="bar" />)
      expect(wrapper.find(Component).prop('foo')).toEqual('bar')
    })
  })
})
