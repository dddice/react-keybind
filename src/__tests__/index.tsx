/** @format */

import * as React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { ShortcutProvider } from '../index'

describe('react-keybind', () => {
  describe('ShortcutProvider', () => {
    let instance: ShortcutProvider
    let wrapper: ReactWrapper
    let method: jest.Mock

    beforeEach(() => {
      wrapper = mount(<ShortcutProvider />)
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
      wrapper.find('article').simulate('keydown', { key: 't' })

      expect(method).toHaveBeenCalledTimes(0)
    })

    describe('.keyDown', () => {
      it('is a function', () => {
        expect(typeof instance.keyDown).toEqual('function')
      })

      it('executes callback method for single keypresses', () => {
        instance.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        wrapper.find('div').simulate('keydown', { key: 'x' })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('does not execute callback for unregistered keypresses', () => {
        instance.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        wrapper.find('div').simulate('keydown', { key: 'a' })

        expect(method).toHaveBeenCalledTimes(0)
      })

      it('executes callback method for ctrl+{key} keypresses', () => {
        instance.registerShortcut(method, ['ctrl+x'], 'Cut', 'Test cut description')
        wrapper.find('div').simulate('keydown', { ctrlKey: true, key: 'x' })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('executes callback method for alt+{key} keypresses', () => {
        instance.registerShortcut(method, ['alt+a'], 'All', 'Test select all')
        wrapper.find('div').simulate('keydown', { altKey: true, key: 'a' })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('executes callback method for ctrl+alt+{key} keypresses', () => {
        instance.registerShortcut(
          method,
          ['ctrl+alt+s'],
          'Shutdown all',
          'Test shutdown all processes',
        )
        wrapper.find('div').simulate('keydown', { ctrlKey: true, altKey: true, key: 's' })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('is case-insensitive', () => {
        instance.registerShortcut(method, ['X'], 'Test Title', 'Some description')
        wrapper.find('div').simulate('keydown', { key: 'x' })

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
        wrapper.find('input').simulate('keydown', { key: 'a' })

        expect(method).toHaveBeenCalledTimes(0)
      })

      it('tracks pressed keys in .keysDown array', () => {
        instance.registerShortcut(method, ['a'], 'Test Title', 'Some description')
        wrapper.find('div').simulate('keydown', { key: 'a' })

        expect(instance.keysDown).toHaveLength(1)
      })

      it('does not duplicate pressed keys in .keysDown array', () => {
        instance.registerShortcut(method, ['a'], 'Test Title', 'Some description')
        wrapper.find('div').simulate('keydown', { key: 'a' })
        wrapper.find('div').simulate('keydown', { key: 'a' })
        wrapper.find('div').simulate('keydown', { key: 'a' })
        wrapper.find('div').simulate('keydown', { key: 'a' })

        expect(instance.keysDown).toHaveLength(1)
      })

      it('executes callback method after a duration', () => {
        instance.registerShortcut(method, ['f'], 'Pay respects', 'Some description', 1000)
        wrapper.find('div').simulate('keydown', { key: 'f' })
        expect(method).toHaveBeenCalledTimes(0)
        jest.runTimersToTime(2000)
        expect(method).toHaveBeenCalledTimes(1) // we should not keep calling the method
      })
    })

    describe('.keyUp', () => {
      it('is a function', () => {
        expect(typeof instance.keyUp).toEqual('function')
      })

      it('tracks unpressed keys in .keysDown array', () => {
        instance.registerShortcut(method, ['a'], 'Test Title', 'Some description')
        wrapper.find('div').simulate('keydown', { key: 'a' })
        wrapper.find('div').simulate('keyup', { key: 'a' })

        expect(instance.keysDown).toHaveLength(0)
      })
    })

    describe('.registerShortcut', () => {
      it('is a function', () => {
        expect(typeof instance.registerShortcut).toEqual('function')
      })

      it('creates a new listener', () => {
        instance.registerShortcut(method, ['ctrl+c', 'k'], 'Test Title', 'Some description')

        expect(wrapper.state('shortcuts')).toHaveLength(1)
        expect(instance.listeners['ctrl+c']).toEqual(method)
        expect(instance.listeners['k']).toEqual(method)
      })

      it('does not override existing listeners', () => {
        const methodX = jest.fn()
        instance.registerShortcut(method, ['shift+x'], 'Test Title', 'Some description')
        instance.registerShortcut(methodX, ['shift+x'], 'Test Title', 'Some description')

        expect(wrapper.state('shortcuts')).toHaveLength(1)
        expect(instance.listeners['shift+x']).toEqual(method)
      })

      it('lowercases key bindings', () => {
        instance.registerShortcut(method, ['cTrL+C', 'K'], 'Test Title', 'Some description')
        expect(wrapper.state('shortcuts')).toHaveLength(1)
        expect(instance.listeners['ctrl+c']).toEqual(method)
        expect(instance.listeners['k']).toEqual(method)
      })

      it('creates a shortcut with a hold duration', () => {
        instance.registerShortcut(method, ['f'], 'Pay respects', 'Some description', 2000)

        expect(wrapper.state('shortcuts')).toHaveLength(1)
        expect(instance.listeners['f']).toEqual(undefined)
        expect(instance.holdListeners['f']).toEqual(method)
        expect(instance.holdDurations['f']).toEqual(2000)
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
    })
  })
})
