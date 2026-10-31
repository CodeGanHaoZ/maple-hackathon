import type { ObjectDirective } from 'vue'

const observers = new WeakMap<HTMLElement, IntersectionObserver>()
/** 只在进入视野时渐入一次；不支持观察器或减少动效时保持内容可见。 */
export const vReveal: ObjectDirective<HTMLElement> = {
  mounted(element) {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    element.classList.add('reveal-wait')
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        element.classList.add('is-revealed')
        observer.disconnect()
      }
    }, { threshold: 0.06 })
    observers.set(element, observer)
    observer.observe(element)
  },
  unmounted(element) { observers.get(element)?.disconnect(); observers.delete(element) }
}

const imageCleanups = new WeakMap<HTMLImageElement, () => void>()
export const vImageFade: ObjectDirective<HTMLImageElement> = {
  mounted(element) {
    const reveal = () => element.classList.add('image-ready')
    element.classList.add('image-fade')
    if (element.complete) reveal()
    element.addEventListener('load', reveal)
    element.addEventListener('error', reveal)
    imageCleanups.set(element, () => {
      element.removeEventListener('load', reveal)
      element.removeEventListener('error', reveal)
    })
  },
  unmounted(element) { imageCleanups.get(element)?.(); imageCleanups.delete(element) }
}
