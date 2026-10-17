import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'

// jsdom does not implement modal dialogs; this keeps the open state observable in tests.
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
}

afterEach(() => {
  localStorage.clear()
})
