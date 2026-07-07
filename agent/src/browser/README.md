# Browser Module

## Responsibilities

- Launch browser
- Create browser context
- Create page
- Restart browser
- Stop browser
- Provide browser/page/context to other modules

## Public API

- start()
- stop()
- restart()
- getBrowser()
- getContext()
- getPage()
- getState()
- isRunning()

## Notes

BrowserManager does not know anything about YouTube.

It only manages the browser lifecycle.