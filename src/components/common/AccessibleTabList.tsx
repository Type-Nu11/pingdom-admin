import { Children, cloneElement, isValidElement, useState, type HTMLAttributes, type ReactElement } from 'react'

type TabProps = HTMLAttributes<HTMLButtonElement> & { $active?: boolean; $selected?: boolean; disabled?: boolean }
type Props = HTMLAttributes<HTMLDivElement> & { panelId: string }

// Manual activation: arrows move focus only. Native Enter/Space clicks keep each
// screen's existing request, busy-state and unsaved-input guards authoritative.
export function AccessibleTabList({ children, panelId, onKeyDown, onBlur, ...props }: Props) {
  const tabs = Children.toArray(children)
  const selectedIndex = tabs.findIndex(child => isValidElement<TabProps>(child) && child.props.role === 'tab' &&
    (child.props['aria-selected'] === true || child.props['aria-selected'] === 'true' ||
      (child.props['aria-selected'] == null && (child.props.$active || child.props.$selected))))
  const [focus, setFocus] = useState<{ selected: number; index: number } | null>(null)
  const candidate = focus?.selected === selectedIndex ? focus.index : selectedIndex
  const eligible = (index: number) => isValidElement<TabProps>(tabs[index]) && tabs[index].props.role === 'tab' && !tabs[index].props.disabled
  const focusIndex = eligible(candidate) ? candidate : tabs.findIndex((_, index) => eligible(index))

  return <div {...props} role="tablist" onBlur={event => {
    onBlur?.(event)
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocus(null)
  }} onKeyDown={event => {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
    const vertical = props['aria-orientation'] === 'vertical'
    const previous = vertical ? 'ArrowUp' : 'ArrowLeft'
    const next = vertical ? 'ArrowDown' : 'ArrowRight'
    if (![previous, next, 'Home', 'End'].includes(event.key)) return
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
      .filter(button => !button.disabled && button.closest('[role="tablist"]') === event.currentTarget)
    const current = buttons.findIndex(button => button === event.target || button.contains(event.target as Node))
    if (current < 0 || buttons.length === 0) return
    event.preventDefault()
    const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 :
      (current + (event.key === next ? 1 : -1) + buttons.length) % buttons.length
    buttons[index].focus()
  }}>
    {tabs.map((child, index) => {
      if (!isValidElement<TabProps>(child) || child.props.role !== 'tab') return child
      return cloneElement(child as ReactElement<TabProps>, {
        id: child.props.id ?? `${panelId}-tab-${index}`,
        'aria-controls': panelId,
        'aria-selected': index === selectedIndex,
        tabIndex: !child.props.disabled && index === focusIndex ? 0 : -1,
        onFocus: event => {
          setFocus({ selected: selectedIndex, index })
          child.props.onFocus?.(event)
        },
      })
    })}
  </div>
}
