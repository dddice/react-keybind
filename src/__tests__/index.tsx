/** @format */

import * as React from 'react'
import { mount, ReactWrapper } from 'enzyme'
import { ShortcutProvider } from '../index'

describe('react-keybind', () => {
  let instance: ShortcutProvider
  let wrapper: ReactWrapper

  beforeEach(() => {
    wrapper = mount(
      <ShortcutProvider />
    )
    instance = wrapper.instance() as ShortcutProvider
  })

  describe('.keyDown', () => {
    it('is a function', () => {
      expect(typeof instance.keyDown).toEqual('function')
    })

    it('executes callback method for single keypresses', () => {
      const method = jest.fn()
      instance.registerShortcut(method, ['x'], 'Test Title', 'Some description')

      wrapper.find('div').simulate('keydown', { key: 'x' })

      expect(method).toHaveBeenCalledTimes(1)
    })

    it('does not execute callback for unregistered keypresses', () => {
      const method = jest.fn()
      instance.registerShortcut(method, ['x'], 'Test Title', 'Some description')

      wrapper.find('div').simulate('keydown', { key: 'a' })

      expect(method).toHaveBeenCalledTimes(0)
    })

    it('executes callback method for ctrl+{key} keypresses', () => {
      const method = jest.fn()
      instance.registerShortcut(method, ['ctrl+x'], 'Cut', 'Test cut description')

      wrapper.find('div').simulate('keydown', { ctrlKey: true, key: 'x' })

      expect(method).toHaveBeenCalledTimes(1)
    })

    it('executes callback method for alt+{key} keypresses', () => {
      const method = jest.fn()
      instance.registerShortcut(method, ['alt+a'], 'All', 'Test select all')

      wrapper.find('div').simulate('keydown', { altKey: true, key: 'a' })

      expect(method).toHaveBeenCalledTimes(1)
    })

    it('executes callback method for ctrl+alt+{key} keypresses', () => {
      const method = jest.fn()
      instance.registerShortcut(method, ['ctrl+alt+s'], 'Shutdown all', 'Test shutdown all processes')

      wrapper.find('div').simulate('keydown', { ctrlKey: true, altKey: true, key: 's' })

      expect(method).toHaveBeenCalledTimes(1)
    })

    it('is case-insensitive', () => {
      const method = jest.fn()
      instance.registerShortcut(method, ['X'], 'Test Title', 'Some description')

      wrapper.find('div').simulate('keydown', { key: 'x' })

      expect(method).toHaveBeenCalledTimes(1)
    })
  })

  describe('.registerShortcut', () => {
    it('is a function', () => {
      expect(typeof instance.registerShortcut).toEqual('function')
    })

    it('creates a new listener', () => {
      const method = jest.fn()

      instance.registerShortcut(method, ['ctrl+c', 'k'], 'Test Title', 'Some description')

      expect(wrapper.state('shortcuts')).toHaveLength(1)
      expect(instance.listeners['ctrl+c']).toEqual(method)
      expect(instance.listeners['k']).toEqual(method)
    })

    it('does not override existing listeners', () => {
      const method = jest.fn()
      const methodX = jest.fn()

      instance.registerShortcut(method, ['shift+x'], 'Test Title', 'Some description')
      instance.registerShortcut(methodX, ['shift+x'], 'Test Title', 'Some description')

      expect(wrapper.state('shortcuts')).toHaveLength(1)
      expect(instance.listeners['shift+x']).toEqual(method)
    })

    it('lowercases key bindings', () => {
      const method = jest.fn()

      instance.registerShortcut(method, ['cTrL+C', 'K'], 'Test Title', 'Some description')

      expect(wrapper.state('shortcuts')).toHaveLength(1)
      expect(instance.listeners['ctrl+c']).toEqual(method)
      expect(instance.listeners['k']).toEqual(method)
    })
  })

  describe('.unregisterShortcut', () => {
    it('is a function', () => {
      expect(typeof instance.unregisterShortcut).toEqual('function')
    })

    it('deletes a listener by passed keys', () => {
      const method = jest.fn()

      instance.registerShortcut(method, ['ctrl+c', 'k'], 'Test Title', 'Some description')
      instance.unregisterShortcut(['ctrl+c', 'k'])

      expect(wrapper.state('shortcuts')).toHaveLength(0)
      expect(instance.listeners['ctrl+c']).toEqual(undefined)
      expect(instance.listeners['k']).toEqual(undefined)
    })

    it('lowercases key bindings', () => {
      const method = jest.fn()

      instance.registerShortcut(method, ['cTrL+C', 'K'], 'Test Title', 'Some description')
      instance.unregisterShortcut(['cTrL+C', 'K'])

      expect(wrapper.state('shortcuts')).toHaveLength(0)
      expect(instance.listeners['ctrl+c']).toEqual(undefined)
      expect(instance.listeners['k']).toEqual(undefined)
    })
  })
})
