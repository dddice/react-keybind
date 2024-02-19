/** @format */

import {act, createEvent, fireEvent, screen, renderHook, RenderHookResult } from '@testing-library/react'
import {ShortcutProvider, useShortcut, IShortcutProviderRenderProps, IShortcutProviderProps} from '../index'
import {PropsWithChildren } from "react";

const createWrapper = ({ children: wrapperChildren, ...props }: PropsWithChildren<IShortcutProviderProps> = {}) => ({ children }: PropsWithChildren<any>) => (
    <ShortcutProvider {...props}>
      <div data-testid="test">
        {wrapperChildren}
        {children}
      </div>
    </ShortcutProvider>
)

describe('react-keybind', () => {
  describe('ShortcutProvider', () => {
    let wrapper: (props: PropsWithChildren<any>) => JSX.Element
    let hook: RenderHookResult<IShortcutProviderRenderProps | undefined, {}>;
    let method: jest.Mock
    let node: HTMLElement;

    beforeEach(() => {
      wrapper = createWrapper();
      hook = renderHook(useShortcut, { wrapper });
      node = screen.getByTestId('test');
      method = jest.fn()

      jest.useFakeTimers()
    })

    describe('.registerShortcut', () => {
      it('executes callback method for single keypresses', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        })

        fireEvent.keyDown(node, { key: 'x' })
        expect(method).toHaveBeenCalledTimes(1)
      })

      it('calls preventDefault on shortcut execution', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        });

        const stub = createEvent.keyDown(node, {key: 'x'})
        fireEvent(node, stub);
        expect(stub.defaultPrevented).toBe(true)
      })

      it('skips calling preventDefault on shortcut execution if option passed', () => {
        wrapper = createWrapper({ preventDefault: false })
        hook = renderHook(useShortcut, { wrapper });
        act(() => {
          hook.result.current?.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        });

        const stub = createEvent.keyDown(node, { key: 'x' })
        fireEvent(node, stub);
        expect(stub.defaultPrevented).toBe(false)
      })

      it('does not execute callback for unregistered keypresses', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['x'], 'Test Title', 'Some description')
        })
        fireEvent.keyDown(node, { key: 'a' })
        expect(method).toHaveBeenCalledTimes(0)
      })

      it('executes callback method for ctrl+{key} keypresses', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['ctrl+x'], 'Cut', 'Test cut description')
        })
        fireEvent.keyDown(node, { key: 'x', ctrlKey: true })
        expect(method).toHaveBeenCalledTimes(1)
      })

      it('executes callback method for alt+{key} keypresses', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['alt+a'], 'All', 'Test select all')
        });
        fireEvent.keyDown(node, { key: 'a', altKey: true })
        expect(method).toHaveBeenCalledTimes(1)
      })

      it('executes callback method for ctrl+alt+{key} keypresses', () => {
        act(() => {
          hook.result.current?.registerShortcut(
              method,
              ['ctrl+alt+s'],
              'Shutdown all',
              'Test shutdown all processes',
          )
        })
        fireEvent.keyDown(node, { key: 's', altKey: true, ctrlKey: true })
        expect(method).toHaveBeenCalledTimes(1)
      })

      it('is case-insensitive', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['X'], 'Test Title', 'Some description')
        });
        fireEvent.keyDown(node, { key: 'x' })
        expect(method).toHaveBeenCalledTimes(1)
      })

      it('ignores callback method execution for ignored element types', () => {
        wrapper = createWrapper({ children: <input type="text" data-testid="input" /> })
        hook = renderHook(useShortcut, { wrapper });
        act(() => {
          hook.result.current?.registerShortcut(method, ['a'], 'Test', 'Some description')
        });

        fireEvent.keyDown(screen.getByTestId('input'), { key: 'a' })
        expect(method).toHaveBeenCalledTimes(0)
      })

      it('executes callback method after a duration', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['f'], 'Pay respects', 'Some description', 1000)
        })
        fireEvent.keyDown(node, { key: 'f' })
        expect(method).toHaveBeenCalledTimes(0)
        jest.advanceTimersByTime(2000)
        expect(method).toHaveBeenCalledTimes(1) // we should not keep calling the method
      })

      it('executes callback method for sequenced keypresses', () => {
        act(() => {
          hook.result.current?.registerSequenceShortcut(method, ['up', 'down', 'up', 'down'], 'Test', 'test')
        });

        fireEvent.keyDown(node, { key: 'up' })
        fireEvent.keyUp(node, { key: 'up' })
        fireEvent.keyDown(node, { key: 'down' })
        fireEvent.keyUp(node, { key: 'down' })
        fireEvent.keyDown(node, { key: 'up' })
        fireEvent.keyUp(node, { key: 'up' })
        fireEvent.keyDown(node, { key: 'down' })
        fireEvent.keyUp(node, { key: 'down' })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('allows some duration of time to pass between sequenced keypresses', () => {
        act(() => {
          hook.result.current?.registerSequenceShortcut(method, ['up', 'down', 'up', 'down'], 'Test', 'test')
        });

        fireEvent.keyDown(node, { key: 'up' })
        fireEvent.keyUp(node, { key: 'up' })
        fireEvent.keyDown(node, { key: 'down' })
        fireEvent.keyUp(node, { key: 'down' })

        jest.advanceTimersByTime(100)

        fireEvent.keyDown(node, { key: 'up' })
        fireEvent.keyUp(node, { key: 'up' })
        fireEvent.keyDown(node, { key: 'down' })
        fireEvent.keyUp(node, { key: 'down' })

        expect(method).toHaveBeenCalledTimes(1)
      })

      it('cancels callback method for sequenced keypresses after a duration', () => {
        act(() => {
          hook.result.current?.registerSequenceShortcut(method, ['up', 'down', 'up', 'down'], 'Test', 'test')
        });

        fireEvent.keyDown(node, { key: 'up' })
        fireEvent.keyUp(node, { key: 'up' })
        fireEvent.keyDown(node, { key: 'down' })
        fireEvent.keyUp(node, { key: 'down' })

        jest.advanceTimersByTime(2000)

        fireEvent.keyDown(node, { key: 'up' })
        fireEvent.keyUp(node, { key: 'up' })
        fireEvent.keyDown(node, { key: 'down' })
        fireEvent.keyUp(node, { key: 'down' })

        expect(method).toHaveBeenCalledTimes(0)
      })

      it('resets sequenced keypresses timer after a successful execution', () => {
        const executeSequence = () => {
          fireEvent.keyDown(node, { key: 'a' })
          fireEvent.keyUp(node, { key: 'a' })
          fireEvent.keyDown(node, { key: 'b' })
          fireEvent.keyUp(node, { key: 'b' })
          fireEvent.keyDown(node, { key: 'c' })
          fireEvent.keyUp(node, { key: 'c' })
          fireEvent.keyDown(node, { key: 'd' })
          fireEvent.keyUp(node, { key: 'd' })
        }

        act(() => {
          hook.result.current?.registerSequenceShortcut(method, ['a', 'b', 'c', 'd'], 'Test', 'test')
        })

        executeSequence();
        expect(method).toHaveBeenCalledTimes(1)

        executeSequence();
        expect(method).toHaveBeenCalledTimes(2)
      })

      it('can reregister shortcuts after they have been unregistered', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['a'], 'Test Title', 'Some description')
          hook.result.current?.unregisterShortcut(['a'])
          hook.result.current?.registerShortcut(method, ['a'], 'Test Title', 'Some description')
        })

        fireEvent.keyDown(node, { key: 'a' })
        expect(method).toHaveBeenCalledTimes(1)
      })

      it('calls multiple callbacks', () => {
        const methodX = jest.fn()
        act(() => {
          hook.result.current?.registerShortcut(method, ['ctrl+a', 'a'], 'Test Title', 'Some description')
          hook.result.current?.registerShortcut(methodX, ['a'], 'Test Title X', 'Some description')
        })

        fireEvent.keyDown(node, { key: 'a' })
        expect(method).toHaveBeenCalledTimes(1)
        expect(methodX).toHaveBeenCalledTimes(1)
      })

      it('detects modifier keys', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['ctrl+x', 'shift+Y', 'alt+z', 'cmd+a'], '', '')
        });
        fireEvent.keyDown(node, { key: 'x', ctrlKey: true })
        fireEvent.keyUp(node, { key: 'x', ctrlKey: true })

        fireEvent.keyDown(node, { key: 'y', shiftKey: true })
        fireEvent.keyUp(node, { key: 'y', shiftKey: true })

        fireEvent.keyDown(node, { key: 'z', altKey: true })
        fireEvent.keyUp(node, { key: 'z', altKey: true })

        fireEvent.keyDown(node, { key: 'a', metaKey: true })
        fireEvent.keyUp(node, { key: 'a', metaKey: true })

        expect(method).toHaveBeenCalledTimes(4)
      })

      it('detects alternative modifier keys', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['ctrl+x', 'shift+Y', 'alt+z', 'cmd+a'], '', '')
        })

        fireEvent.keyDown(node, { key: 'Control' })
        fireEvent.keyDown(node, { key: 'x' })
        fireEvent.keyUp(node, { key: 'x', ctrlKey: true })

        fireEvent.keyDown(node, { key: 'Shift' })
        fireEvent.keyDown(node, { key: 'y' })
        fireEvent.keyUp(node, { key: 'y', shiftKey: true })

        fireEvent.keyDown(node, { key: 'Alt' })
        fireEvent.keyDown(node, { key: 'z' })
        fireEvent.keyUp(node, { key: 'z', altKey: true })

        fireEvent.keyDown(node, { key: 'Meta' })
        fireEvent.keyDown(node, { key: 'a' })
        fireEvent.keyUp(node, { key: 'a', metaKey: true })

        expect(method).toHaveBeenCalledTimes(4)
      })

      it('ctrl sequences can be triggered multiple times', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['ctrl+a', 'cmd+a'], '', '')
        });
        fireEvent.keyDown(node, { key: 'a', ctrlKey: true })
        fireEvent.keyUp(node, { key: 'a', ctrlKey: true })
        fireEvent.keyDown(node, { key: 'a', ctrlKey: true })
        fireEvent.keyUp(node, { key: 'a', ctrlKey: true })
        expect(method).toHaveBeenCalledTimes(2)
      })

      it('cmd sequences can be triggered multiple times', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['ctrl+a', 'cmd+a'], '', '')
        });
        const stub = createEvent.keyDown(node, { key: 'a', metaKey: true })
        fireEvent(node, stub);
        expect(stub.defaultPrevented).toBe(true)

        fireEvent.keyUp(node, { key: 'a', metaKey: true })
        const stub2 = createEvent.keyDown(node, { key: 'a', metaKey: true })
        fireEvent(node, stub2);
        expect(stub2.defaultPrevented).toBe(true)

        fireEvent.keyUp(node, { key: 'a', metaKey: true })
        expect(method).toHaveBeenCalledTimes(2)
      })

      it('safely handles invalid number input', () => {
        act(() => {
          // @ts-ignore we are testing invalid input
          hook.result.current?.registerShortcut(method, [1], '', '')
        });
        fireEvent.keyDown(node, { key: '1' })
        expect(method).toHaveBeenCalledTimes(1)
      })

      it('safely ignores events with undefined key', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['f'], '', '')
        })
        fireEvent.keyDown(node, { key: undefined })
        expect(method).not.toHaveBeenCalled()
      })

      it('ignores special keys', () => {
        wrapper = createWrapper({ ignoreKeys: ['shift', 'ctrl', 'alt', 'cmd'] })
        hook = renderHook(useShortcut, { wrapper });
        act(() => {
          hook.result.current?.registerShortcut(method, ['x', 'Y', 'z', 'a'], '', '')
        });

        fireEvent.keyDown(node, { key: 'x', ctrlKey: true })
        fireEvent.keyUp(node, { key: 'x', ctrlKey: true })
        fireEvent.keyDown(node, { key: 'y', shiftKey: true })
        fireEvent.keyUp(node, { key: 'y', shiftKey: true })
        fireEvent.keyDown(node, { key: 'z', altKey: true })
        fireEvent.keyUp(node, { key: 'z', altKey: true })
        fireEvent.keyDown(node, { key: 'a', metaKey: true })
        fireEvent.keyUp(node, { key: 'a', metaKey: true })

        expect(method).toHaveBeenCalledTimes(4)
      })

      it('accepts "meta" or "cmd" to ignore', () => {
        wrapper = createWrapper({ ignoreKeys: ['cmd'] })
        hook = renderHook(useShortcut, { wrapper });
        act(() => {
          hook.result.current?.registerShortcut(method, ['x'], '', '')
        });

        fireEvent.keyDown(node, { key: 'x', metaKey: true })
        expect(method).toHaveBeenCalledTimes(1)

        wrapper = createWrapper({ ignoreKeys: ['meta'] })
        hook = renderHook(useShortcut, { wrapper });
        act(() => {
          hook.result.current?.registerShortcut(method, ['x'], '', '')
        });

        fireEvent.keyDown(node, { key: 'x', metaKey: true })
        expect(method).toHaveBeenCalledTimes(2)
      })

      it('ignores keys', () => {
        wrapper = createWrapper({ ignoreKeys: ['t'] })
        hook = renderHook(useShortcut, { wrapper });
        act(() => {
          hook.result.current?.registerSequenceShortcut(method, ['a', 'b'], '', '')
        });

        fireEvent.keyDown(node, { key: 'a' })
        fireEvent.keyDown(node, { key: 't' }) // this is ignored
        fireEvent.keyDown(node, { key: 'b' })
        expect(method).toHaveBeenCalledTimes(1)
      })

      it('is a function', () => {
        expect(typeof hook.result.current?.registerShortcut).toEqual('function')
      })

      it('creates a new listener', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['ctrl+c', 'k'], 'Test Title', 'Some description')
        });

        expect(hook.result.current?.shortcuts).toHaveLength(1)
        expect(hook.result.current?.shortcuts[0].method).toEqual(method)
        expect(hook.result.current?.shortcuts[0].keys).toEqual(['ctrl+c', 'k'])
      })

      it('allows multiple methods to use the same listeners', () => {
        const methodX = jest.fn()
        act(() => {
          hook.result.current?.registerShortcut(method, ['shift+x'], 'Test Title', 'Some description')
          hook.result.current?.registerShortcut(methodX, ['shift+x', 'x'], 'Test Title', 'Some description')
        });

        expect(hook.result.current?.shortcuts).toHaveLength(2)
        expect(hook.result.current?.shortcuts[0].method).toEqual(method)
        expect(hook.result.current?.shortcuts[0].keys).toEqual(['shift+x'])
        expect(hook.result.current?.shortcuts[1].method).toEqual(methodX)
        expect(hook.result.current?.shortcuts[1].keys).toEqual(['shift+x', 'x'])
      })

      it('lowercases key bindings', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['cTrL+C', 'K'], 'Test Title', 'Some description')
        });
        expect(hook.result.current?.shortcuts).toHaveLength(1)
        expect(hook.result.current?.shortcuts[0].method).toEqual(method)
        expect(hook.result.current?.shortcuts[0].keys).toEqual(['ctrl+c', 'k'])
      })

      it('creates a shortcut with a hold duration', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['f'], 'Pay respects', 'Some description', 2000)
        });

        expect(hook.result.current?.shortcuts).toHaveLength(1)
        expect(hook.result.current?.shortcuts[0].method).toEqual(method)
        expect(hook.result.current?.shortcuts[0].keys).toEqual(['f'])
      })

      it('can unregister then reregister a shortcut', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['a'], 'Test Title', 'Some description')
          hook.result.current?.unregisterShortcut(['a'])
          hook.result.current?.registerShortcut(method, ['a'], 'Test Title', 'Some description')
        });

        expect(hook.result.current?.shortcuts).toHaveLength(1)
        expect(hook.result.current?.shortcuts[0].method).toEqual(method)
        expect(hook.result.current?.shortcuts[0].keys).toEqual(['a'])
      })

      it('transform shortcut keys into the appropriately stored keys', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['opt+s'], 'Test Title', 'Some description')
          hook.result.current?.registerShortcut(method, ['option+k'], 'Test Title', 'Some description')
          hook.result.current?.registerShortcut(method, ['cmd+x'], 'Test Title', 'Some description')
          hook.result.current?.registerShortcut(method, ['command+y'], 'Test Title', 'Some description')
          hook.result.current?.registerShortcut(method, ['control+s'], 'Test Title', 'Some description')
        });

        expect(hook.result.current?.shortcuts).toHaveLength(5)
        expect(hook.result.current?.shortcuts[0].keys).toEqual(['alt+s'])
        expect(hook.result.current?.shortcuts[1].keys).toEqual(['alt+k'])
        expect(hook.result.current?.shortcuts[2].keys).toEqual(['meta+x'])
        expect(hook.result.current?.shortcuts[3].keys).toEqual(['meta+y'])
        expect(hook.result.current?.shortcuts[4].keys).toEqual(['ctrl+s'])
      })
    })

    describe('.registerSequenceShortcut', () => {
      it('is a function', () => {
        expect(typeof hook.result.current?.registerSequenceShortcut).toEqual('function')
      })

      it('creates a new listener', () => {
        act(() => {
          hook.result.current?.registerSequenceShortcut(
              method,
              ['up', 'up', 'down', 'down', 'enter'],
              'Test Title',
              'Some description',
          )
        });

        expect(hook.result.current?.shortcuts).toHaveLength(1)
      })

      it('can trigger within a custom timeout duration', () => {
        wrapper = createWrapper({ sequenceTimeout: 100 });
        hook = renderHook(useShortcut, { wrapper });

        act(() => {
          hook.result.current?.registerSequenceShortcut(
              method,
              ['x', 'y', 'z'],
              'Test Title',
              'Some description',
          )
        });

        fireEvent.keyDown(node, { key: 'x' })
        fireEvent.keyUp(node, { key: 'x' })
        fireEvent.keyDown(node, { key: 'y' })
        fireEvent.keyUp(node, { key: 'y' })
        jest.advanceTimersByTime(200)
        fireEvent.keyDown(node, { key: 'z' })
        fireEvent.keyUp(node, { key: 'z' })

        expect(method).not.toHaveBeenCalled()
      })
    })

    describe('.unregisterShortcut', () => {
      it('is a function', () => {
        expect(typeof hook.result.current?.unregisterShortcut).toEqual('function')
      })

      it('deletes a listener by passed keys', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['ctrl+c', 'k'], 'Test Title', 'Some description')
          hook.result.current?.unregisterShortcut(['ctrl+c', 'k'])
        });

        expect(hook.result.current?.shortcuts).toHaveLength(0)
      })

      it('lowercases key bindings', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['cTrL+C', 'K'], 'Test Title', 'Some description')
          hook.result.current?.unregisterShortcut(['cTrL+C', 'K'])
        });
        expect(hook.result.current?.shortcuts).toHaveLength(0)
      })

      it('deletes a hold listener by passed keys', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['ctrl+c', 'k'], 'Test Title', 'Some description', 5000)
          hook.result.current?.unregisterShortcut(['ctrl+c', 'k'])
        });

        expect(hook.result.current?.shortcuts).toHaveLength(0)
      })

      it('deletes a sequence listener by passed keys', () => {
        const keys = ['up', 'up', 'down', 'down', 'enter']
        act(() => {
          hook.result.current?.registerSequenceShortcut(method, keys, 'Test Title', 'Some description')
          hook.result.current?.unregisterShortcut(keys)
        });

        expect(hook.result.current?.shortcuts).toHaveLength(0)
      })

      it.skip('pops the last callback if multiple keys are registered', () => {
        const method2 = jest.fn()
        act(() => {
          hook.result.current?.registerShortcut(method, ['x'], 'Test', 'Some description')
          hook.result.current?.registerShortcut(method2, ['x'], 'Test', 'Some description')
        });

        expect(hook.result.current?.shortcuts).toHaveLength(2)
        expect(hook.result.current?.shortcuts[0].method).toEqual(method)
        expect(hook.result.current?.shortcuts[1].method).toEqual(method2)

        act(() => {
          hook.result.current?.unregisterShortcut(['x'])
        });

        expect(hook.result.current?.shortcuts).toHaveLength(1)
        expect(hook.result.current?.shortcuts[0].method).toEqual(method)
      })
    })

    describe('.triggerShortcut', () => {
      it('is a function', () => {
        expect(typeof hook.result.current?.triggerShortcut).toEqual('function')
      })

      it('triggers a shortcuts callback method', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['x'], 'Test Title', 'Some description')
          hook.result.current?.triggerShortcut('x')
        });
        expect(method).toHaveBeenCalledTimes(1)
      })

      it('does not trigger an invalid or missing shortcut', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['x'], 'Test Title', 'Some description')
          hook.result.current?.triggerShortcut('a')
        })

        expect(method).toHaveBeenCalledTimes(0)
      })
    })

    describe('.setEnabled', () => {
      it('prevents a shortcut from executing when set to false', () => {
        act(() => {
          hook.result.current?.registerShortcut(method, ['x'], 'Test Title', 'Some description')
          hook.result.current?.setEnabled(false);
        });

        fireEvent.keyDown(node, { key: 'x' })
        expect(method).toHaveBeenCalledTimes(0)
      })
    })
  })
})
